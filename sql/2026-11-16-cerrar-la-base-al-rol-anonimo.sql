/* CERRAR LA BASE AL ROL ANONIMO                                    16/11/2026
   =========================================================================

   LO MEDIDO, antes de tocar nada, llamando desde afuera con la clave
   publishable que vive en el codigo publico del panel y SIN sesion:

     gva12  (facturas de venta)  -> HTTP 200 con datos
     gva14  (clientes)           -> HTTP 200 con domicilios y CUIT
     sta11  (articulos)          -> HTTP 200 con datos
     cpa04  (facturas de compra) -> HTTP 200 con datos
     api_ventas_fact_total       -> $21.458.327.721,44 / 32.304 renglones
     api_cartera_control_v2      -> $1.494.940.375,68 en 529 vencimientos
     api_ventas_fact_por_cliente -> 21.907 bytes CON NOMBRES de clientes
     api_tesoreria_cuentas_v2    -> 26.085 bytes de cuentas contables
     api_margen_tablero_v3       -> el Tablero entero

   Y en el catalogo:
     667 de 678 tablas de `public` las puede LEER anon.
     653 de esas no tienen RLS prendida, asi que nada las frena.
     El ACL de gva12 dice  anon=arwdDxtm/postgres : o sea INSERT, SELECT,
     UPDATE, DELETE y TRUNCATE. Con RLS apagada y cero politicas, eso NO
     esta frenado por nada. No se probo escribir -probarlo es escribir en
     la base de la empresa- pero el permiso esta y no hay quien lo pare.
     170 funciones de `public` abiertas a anon, 143 de ellas `api_`.

   POR QUE ES SEGURO CERRARLO. El ACL de cada tabla trae el permiso del rol
   logueado POR SEPARADO del anonimo:
       {postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres,
        authenticated=arwdDxtm/postgres, service_role=arwdDxtm/postgres}
   `authenticated` NO hereda de anon ni de PUBLIC: tiene lo suyo. Sacarle
   todo a anon no le toca una coma. Y medido aparte: de las 41 funciones que
   llama el panel, NINGUNA se llama antes del login -el login va por
   /auth/v1/token, que no pasa por aca-, asi que cerrarlo no deja a nadie
   afuera de la pantalla de entrar.

   LO QUE SI SE ROMPE, Y SE DICE: control/estado.js y control/acceso.js
   llaman a api_estado_del_sistema con la clave publishable, o sea como anon.
   Despues de esto van a dar 401 y hay que pasarlos al usuario CLAUDEBASE.
   Es el precio correcto: que mis controles entren sin sesion era parte del
   mismo agujero.

   ESTO NO LO ROMPIO UN CAMBIO: es como viene Supabase de fabrica. Esta
   anotado para funciones sueltas el 10/11, el 12/11 y el 14/11, y las tres
   veces mire la funcion que acababa de crear y nunca el conjunto. Un defecto
   que se arregla de a uno donde la fabrica lo repone de a todos no es un
   arreglo: es una recaida programada. Por eso van tambien los DEFAULT
   PRIVILEGES, que es lo unico que impide que vuelva solo en la proxima
   tabla.

   NO SE EJECUTA SIN ORDEN EXPLICITA DEL USUARIO.
   ========================================================================= */

begin;

/* ---------- 1. lo que hay HOY, guardado antes de tocarlo ---------- */
create table if not exists ema.permiso_antes_del_16_11 (
  cuando      timestamptz not null default now(),
  clase       text        not null,          /* 'tabla' | 'funcion' */
  esquema     text        not null,
  objeto      text        not null,
  acl         text,
  rls         boolean,
  politicas   int
);

insert into ema.permiso_antes_del_16_11 (clase, esquema, objeto, acl, rls, politicas)
select 'tabla', n.nspname, c.relname, c.relacl::text, c.relrowsecurity,
       (select count(*) from pg_policies p
         where p.schemaname = n.nspname and p.tablename = c.relname)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r','v','m','p','f');

insert into ema.permiso_antes_del_16_11 (clase, esquema, objeto, acl)
select 'funcion', n.nspname, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
       p.proacl::text
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public';

/* ---------- 2. el cierre ---------- */
/* A anon, TODO. A PUBLIC tambien: el 12/11 quedo escrito que el permiso
   puede venir por PUBLIC, y el 14/11 que ADEMAS puede venir directo a anon.
   Van los dos, siempre, o se cierra la mitad y se cree que se cerro todo. */
revoke all privileges on all tables     in schema public from anon;
revoke all privileges on all sequences  in schema public from anon;
revoke all privileges on all functions  in schema public from anon;
revoke all privileges on all tables     in schema public from public;
revoke all privileges on all sequences  in schema public from public;
revoke all privileges on all functions  in schema public from public;

/* ---------- 3. que no vuelva solo en la proxima tabla ---------- */
/* Sin esto, el default ACL de Supabase se lo devuelve al primer
   `create table` que yo haga maniana, y todo esto se deshace sin aviso. */
alter default privileges in schema public revoke all on tables     from anon, public;
alter default privileges in schema public revoke all on sequences  from anon, public;
alter default privileges in schema public revoke all on functions  from anon, public;
alter default privileges for role postgres in schema public revoke all on tables    from anon, public;
alter default privileges for role postgres in schema public revoke all on sequences from anon, public;
alter default privileges for role postgres in schema public revoke all on functions from anon, public;

commit;

/* ---------- 4. la medicion de DESPUES, que es la que vale ----------
   Tiene que dar: anon en 0, y authenticated igual que antes.

select
  count(*) filter (where has_table_privilege('anon','public.'||c.relname,'SELECT'))           anon_lee,
  count(*) filter (where has_table_privilege('anon','public.'||c.relname,'DELETE'))           anon_borra,
  count(*) filter (where has_table_privilege('authenticated','public.'||c.relname,'SELECT'))  logueado_lee
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and c.relkind in ('r','p');

   Y la prueba de verdad, que no sale de la base sino de afuera:
   la misma llamada a gva12 con la clave publishable tiene que dar 401.
   ------------------------------------------------------------------ */
