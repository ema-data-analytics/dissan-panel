-- ##########################################################################
-- ESTE ARCHIVO NO ESTA APLICADO EN LA BASE.  13/11/2026
-- Esta escrito y con su arnes, y el usuario decidio no aplicarlo por ahora.
-- Si alguien lo encuentra y lo da por hecho, se equivoca: hoy el mapa
-- DETECTA secretos (identidad mapa_sin_secretos) pero no los BLOQUEA.
-- ##########################################################################
-- ============================================================================
-- BLOQUEAR LOS SECRETOS — no detectarlos, BLOQUEARLOS       13/11/2026
-- ============================================================================
--
-- A la mañana construí una IDENTIDAD que avisa si hay un secreto adentro del
-- mapa, y tapé 16 columnas a mano. Eso DETECTA. No BLOQUEA: si mañana alguien
-- vuelve a medir una tabla con una columna secreta, el secreto entra de nuevo
-- y la identidad lo grita DESPUÉS.
--
-- La regla del proyecto: "Esta regla sólo vale si tiene una puerta cerrada
-- atrás. Si no la tiene, construirla es parte del trabajo, no un extra."
--
-- TRES CAPAS. La del medio es la que cierra:
--   1. QUE NO ENTRE   -> un trigger en ema.diccionario que tapa al escribir.
--   2. QUE NO SALGA   -> las funciones que mandan al modelo tapan al leer.
--   3. QUE SE SEPA    -> la identidad mapa_sin_secretos (ya está).
--   4. QUE NO SE OLVIDE -> una identidad que exige el trigger en TODA tabla de
--                          `ema` que guarde muestras. Porque acordarme de
--                          ponérselo a la próxima tabla sería una promesa mía,
--                          y las promesas mías las rompí dieciséis veces.
--
-- ============================================================================
-- CAPA 0 — UNA SOLA DEFINICION DE "SECRETO", QUE USAN TODOS
-- ============================================================================
-- Si cada lugar define "secreto" a su manera, se separan con el tiempo. Pasó
-- el 30/10 con `listas`: dos formas de armar la misma respuesta.

create or replace function ema.es_muestra_secreta(p_columna text, p_muestra text)
returns boolean
language sql immutable
set search_path = ema, public
as $$
  select
    -- (a) POR LO QUE DICE LA MUESTRA. Incluye el hexadecimal, que es como
    --     viaja de verdad la clave de AFIP: 2d2d2d2d2d424547494e = "-----BEGIN".
    --     El PEM en claro exige CUERPO (40+ base64) para que la PROSA que
    --     menciona el encabezado no dispare: el 13/11 tapé por eso una
    --     advertencia útil que había escrito la IA.
    coalesce(p_muestra,'') ~* '(-----BEGIN [A-Z ]*PRIVATE KEY-----[^A-Za-z0-9+/]*[A-Za-z0-9+/]{40,}'
                            '|2d2d2d2d2d424547494e'
                            '|eyJ[A-Za-z0-9_-]{20,}'
                            '|sk-ant-[A-Za-z0-9_-]{10,}'
                            '|sb_secret_[A-Za-z0-9_-]{10,}'
                            '|ghp_[A-Za-z0-9]{20,}'
                            '|AKIA[0-9A-Z]{16})'
    -- (b) POR COMO SE LLAMA LA COLUMNA. Ojo: `secret` suelto hace sonar
    --     `secretaria`, que en castellano es una palabra común (juzgado_dgi).
    or coalesce(p_columna,'') ~* '(access_token|refresh_token|clave_privada|clave_mail'
                               '|pop3_clave|clave90|clave_is|apikey|api_key'
                               '|password|passwd|client_secret|secret_key|app_secret)'
$$;

comment on function ema.es_muestra_secreta(text,text) is
  'La UNICA definicion de "esto es un secreto" del proyecto. La usan el trigger '
  'de ema.diccionario, las funciones que mandan el mapa al modelo, y la '
  'identidad mapa_sin_secretos. Si hay que agregar una clase de secreto, se '
  'agrega ACA y queda en los tres lugares a la vez.';

-- ============================================================================
-- CAPA 1 — QUE NO ENTRE: el trigger
-- ============================================================================
-- Es lo del 12/11 con el NOT NULL de `edge_verificada`: una tabla que no deja
-- anotar un valor que no debe vale mas que mi buena intencion. Un trigger no
-- se olvida; yo si, dos veces la misma manana.

create or replace function ema.tapar_secretos()
returns trigger
language plpgsql
set search_path = ema, public
as $$
declare
  v_tapo boolean := false;
begin
  if ema.es_muestra_secreta(new.columna, coalesce(new.minimo,'')
                                      || coalesce(new.maximo,'')
                                      || coalesce(new.ejemplos,'')) then
    if new.minimo   is not null and new.minimo   <> '(tapado: columna secreta)' then
      new.minimo := '(tapado: columna secreta)'; v_tapo := true; end if;
    if new.maximo   is not null and new.maximo   <> '(tapado: columna secreta)' then
      new.maximo := '(tapado: columna secreta)'; v_tapo := true; end if;
    if new.ejemplos is not null and new.ejemplos <> '(tapado: columna secreta)' then
      new.ejemplos := '(tapado: columna secreta)'; v_tapo := true; end if;
  end if;

  -- que_es y significado los escribe el modelo y puede CITAR el valor adentro.
  -- Se tapa solo si hay material de clave de verdad, no si lo menciona.
  if ema.es_muestra_secreta(null, new.que_es) then
    new.que_es := '(tapado: la descripcion traia un secreto de verdad adentro)';
    v_tapo := true;
  end if;
  if ema.es_muestra_secreta(null, new.significado) then
    new.significado := '(tapado: la descripcion traia un secreto de verdad adentro)';
    v_tapo := true;
  end if;

  if v_tapo then
    new.fundamento := coalesce(new.fundamento,'')
      || ' | TAPADO AUTOMATICAMENTE por ema.tapar_secretos el '
      || to_char(now(),'DD/MM/YYYY HH24:MI')
      || ': la muestra parecia un secreto de verdad, y api_ia_mapa_buscar manda'
         ' estas columnas al modelo.';
  end if;
  return new;
end;
$$;

drop trigger if exists tapar_secretos on ema.diccionario;
create trigger tapar_secretos
  before insert or update on ema.diccionario
  for each row execute function ema.tapar_secretos();

-- ============================================================================
-- CAPA 4 — QUE NO SE OLVIDE EN LA PROXIMA TABLA
-- ============================================================================
-- Toda tabla del esquema `ema` que guarde muestras (tiene columnas llamadas
-- minimo/maximo/ejemplos/muestra) TIENE que llevar el trigger. Esta identidad
-- lo exige sola: si manana hacemos otra tabla de muestras y nos olvidamos,
-- se pone en rojo.

insert into ema.identidad (clave, nombre, pregunta, fuente_a, fuente_b,
                           sql_a, sql_b, tolerancia, unidad, periodo, activa)
values (
  'tablas_de_muestras_con_trigger',
  'Toda tabla de ema que guarda muestras tiene el trigger que las tapa',
  '¿Hay alguna tabla del esquema ema que guarde muestras de la base (columnas '
  'minimo/maximo/ejemplos/muestra) y NO tenga el trigger ema.tapar_secretos? '
  'Si la hay, un secreto puede entrar por ahi sin que nadie lo frene. Acordarse '
  'de ponerselo a la proxima tabla seria una promesa mia, y las promesas mias '
  'las rompi dieciseis veces.',
  'tablas de ema con columnas de muestra y sin el trigger',
  'cero',
  $a$select count(*)::numeric from (
       select c.relname
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
        where n.nspname = 'ema' and c.relkind = 'r'
          and a.attname ~* '^(minimo|maximo|ejemplos|muestra|muestras)$'
        group by c.oid, c.relname
       having not exists (
         select 1 from pg_trigger t
          where t.tgrelid = c.oid and not t.tgisinternal
            and t.tgfoid = 'ema.tapar_secretos()'::regprocedure)
     ) q$a$,
  $b$select 0::numeric$b$,
  0, 'tablas', 'ninguno', true)
on conflict (clave) do update
   set sql_a = excluded.sql_a, sql_b = excluded.sql_b,
       pregunta = excluded.pregunta, activa = true;

-- ============================================================================
-- EL ARNES — CORRERLO. Un cero sin probar que puede dar distinto de cero no es
-- una respuesta: es el cero del 10/11.
-- ============================================================================
--
-- (va en una llamada APARTE del create: una prueba que termina en RAISE en el
--  mismo lote se lleva puesto el create. Pasó el 11/11 con api_volcado_esquema.)
--
-- PRUEBA 1 — el trigger tapa lo que tiene que tapar, y NO tapa lo que no:
--
--   insert into ema.diccionario (esquema, tabla, columna, tipo, minimo, maximo, ejemplos, que_es)
--   values ('public','ARNES_BORRAR','clave_privada','text',
--           '2D2D2D2D2D424547494E2052534120505249564154450A4D494945','x','x','CONSTANTE'),
--          ('public','ARNES_BORRAR','token_cualquiera','text',
--           'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoieCJ9.zz','x','x','CONSTANTE'),
--          ('public','ARNES_BORRAR','cod_articu','text','1','87247019','1 · 2 · 3','NUMERO');
--
--   select columna, minimo,
--          case when columna = 'cod_articu'
--               then (minimo = '1')                                  -- NO se tapa
--               else (minimo = '(tapado: columna secreta)') end as bien
--     from ema.diccionario where tabla = 'ARNES_BORRAR' order by columna;
--   -- las tres tienen que dar bien = true
--
--   update ema.diccionario set tabla = 'ARNES_RETIRADO_'||clock_timestamp()
--    where tabla = 'ARNES_BORRAR';     -- los DELETE los bloquea el clasificador
--
-- PRUEBA 2 — la identidad del trigger detecta una tabla de muestras sin trigger:
--   crear una tabla ema.arnes_muestras(minimo text) SIN trigger -> la identidad
--   tiene que dar 1. Ponerle el trigger -> tiene que dar 0.
--
-- PRUEBA 3 — las dos identidades en verde al final:
--   select (ema.identidad_correr('mapa_sin_secretos')).*;
--   select (ema.identidad_correr('tablas_de_muestras_con_trigger')).*;
