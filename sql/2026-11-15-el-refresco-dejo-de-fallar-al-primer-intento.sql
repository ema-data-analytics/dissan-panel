-- ============================================================================
-- EL REFRESCO NOCTURNO DEJO DE FALLAR AL PRIMER INTENTO       15/11/2026
-- ============================================================================
-- EL 13, EL 14 Y EL 15 DE NOVIEMBRE el primer intento de
-- api_refrescar_margen_real() murio con
--   57014: canceling statement due to statement timeout
-- y las tres veces se salvo SOLO porque hubo un reintento a mano. Si el
-- reintento no estuviera, la pantalla se quedaba con la foto del dia anterior.
-- Y lo escribi tres dias seguidos en los documentos sin arreglarlo.
--
-- LO PRIMERO QUE MEDI, Y NO SIRVIO:
--   alter function ... set statement_timeout = '900s'  NO SALVA NADA.
-- Postgres arma el reloj cuando ARRANCA la sentencia del cliente; cambiar el
-- GUC adentro de la funcion NO rearma el temporizador de la sentencia que ya
-- esta corriendo. Medido: con el reloj del que llama en 8 s, la funcion con su
-- propio 900s murio a los 8 s igual. Queda escrito porque es justo la clase de
-- cosa que yo habria dado por buena sin medirla.
--
-- LAS DOS CAUSAS DE VERDAD, LAS DOS MEDIDAS:
--
-- (1) EL SUBDIARIO SE CALCULABA 26 VECES POR CORRIDA. Las 13 identidades del
--     subdiario de IVA llamaban a api_subdiario_ventas_v3 en sql_a Y en sql_b.
--     Medido: 3.410 ms una sola, con el mes de octubre. Trece por dos.
--     Ahora se calcula UNA vez en ema.mv_subdiario_ventas, adentro del mismo
--     refresco y ANTES de las identidades, y las 13 lo leen por la envoltura
--     ema.subdiario_ventas(desde, hasta), que tiene la misma forma que la
--     funcion. El reemplazo en las identidades fue cambiar SOLO el nombre de
--     la funcion, para no tocar ni un argumento.
--     CONTROLADO contra los valores de antes, guardados en
--     ema.identidad_antes_del_15_11: las 13 dieron EL MISMO valor_a y el MISMO
--     valor_b, y las 13 en verde. 13 de 13.
--     EL REFRESCO DE LA MATERIALIZADA VA ANTES DE identidad_correr y DENTRO
--     del mismo begin: si no se refrescara, las identidades compararian el
--     subdiario de ayer y podrian dar un VERDE FALSO, que es peor que un rojo.
--
-- (2) ayuda.entrenar() SE COMIA EL RESTO DEL RELOJ. Medido: 33.839 ms, y lo
--     que tarda es ayuda.juez_aprendido, que cruza por REGEX cada SQL
--     aprendido contra los 6.320 campos sospechosos de ema.diccionario.
--     TODO EL CUERPO DE api_refrescar_margen_real ES UNA TRANSACCION, asi que
--     un timeout en el ULTIMO renglon rollbackea el refresco entero: las
--     materializadas y el renglon del log incluidos. El `exception when others
--     then null` que lo envolvia no alcanza, porque la sentencia entera se
--     cancela. Salio de ahi y vive en public.api_entrenar_ayuda(), llamada
--     aparte desde el paso 3 de la tarea nocturna, con su propio reloj.
--     Es el APRENDIZAJE de la Ayuda, no el dato que muestra el panel: que no
--     corra un dia no publica ninguna cifra mal.
--
-- MEDIDO DESPUES DEL ARREGLO, con el reloj POR DEFECTO del que llama, que es
-- la condicion del primer intento de la tarea nocturna:
--   select public.api_refrescar_margen_real();
--   -> {"ok": true, "segundos": 112.4, "filas_margen_v2": 32304,
--       "cobertura_pct": 83.9, "hasta_fecha_v2": "2026-11-13"}
--   86 identidades, 85 en verde. La unica en rojo es
--   stock_entradas_menos_salidas, que viene en rojo desde el 10/11 por una
--   diferencia propia de Tango (sta20 entradas-salidas contra sta19 saldo
--   guardado, 14.248 unidades) y NO la toco este cambio.
--   public.api_entrenar_ayuda() -> ok true, 33.839 ms, NOTA 100.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. EL SUBDIARIO, MATERIALIZADO UNA VEZ
-- ---------------------------------------------------------------------------
-- Dos anios: el corriente y el anterior. Las identidades por mes son todas del
-- anio corriente y las del anio usan date_trunc('year', current_date), pero el
-- anio anterior entra para poder comparar contra el mismo mes del anio pasado
-- sin volver a llamar a la funcion. current_date se vuelve a evaluar en cada
-- refresh, asi que el 1 de enero se corre solo.
create materialized view if not exists ema.mv_subdiario_ventas as
select * from public.api_subdiario_ventas_v3(
         (date_trunc('year', current_date) - interval '1 year')::date,
         current_date);

create index if not exists ix_mv_subdiario_ventas_fecha on ema.mv_subdiario_ventas (fecha);
create index if not exists ix_mv_subdiario_ventas_comp  on ema.mv_subdiario_ventas (tipo, comprobante);
analyze ema.mv_subdiario_ventas;
-- medido: 6.695 renglones, de 2025-01-02 a 2026-11-13.

-- ---------------------------------------------------------------------------
-- 2. LA ENVOLTURA, CON LA MISMA FORMA QUE LA FUNCION
-- ---------------------------------------------------------------------------
-- Tiene la firma (date, date) para que en las identidades alcance con cambiar
-- el NOMBRE y no haya que tocar ni un argumento. Eso es lo que hace que el
-- reemplazo sea mecanico y no una reescritura a mano de 13 consultas.
create or replace function ema.subdiario_ventas(p_desde date, p_hasta date)
returns setof ema.mv_subdiario_ventas
language sql stable
as $$
  select * from ema.mv_subdiario_ventas
   where (p_desde is null or fecha >= p_desde)
     and (p_hasta is null or fecha <= p_hasta);
$$;

-- ---------------------------------------------------------------------------
-- 3. LOS VALORES DE ANTES, PARA PODER CONTROLAR QUE NO CAMBIEN
-- ---------------------------------------------------------------------------
-- Se guardan ANTES de tocar las identidades. Sin esto el cambio no se podria
-- controlar contra nada: "mas rapido" no sirve si da otro numero.
create table if not exists ema.identidad_antes_del_15_11 as
select distinct on (clave) clave, valor_a, valor_b, diferencia, semaforo, cuando
from ema.identidad_corrida
where clave in (select clave from ema.identidad
                where sql_a ilike '%subdiario_ventas_v3%' or sql_b ilike '%subdiario_ventas_v3%')
order by clave, cuando desc;

-- ---------------------------------------------------------------------------
-- 4. LAS 13 IDENTIDADES PASAN A LEER LA MATERIALIZADA
-- ---------------------------------------------------------------------------
update ema.identidad
   set sql_a = replace(sql_a, 'public.api_subdiario_ventas_v3', 'ema.subdiario_ventas'),
       sql_b = replace(sql_b, 'public.api_subdiario_ventas_v3', 'ema.subdiario_ventas')
 where sql_a like '%public.api_subdiario_ventas_v3%'
    or sql_b like '%public.api_subdiario_ventas_v3%';
-- medido despues: 0 siguen llamando a la funcion, 13 leen la materializada.

-- ---------------------------------------------------------------------------
-- 5. EL REFRESCO DE LA MATERIALIZADA, ADENTRO DEL REFRESCO Y ANTES DE LAS
--    IDENTIDADES. El parche aborta si no encuentra su ancla.
-- ---------------------------------------------------------------------------
do $$
declare d text; ancla text := E'    perform ema.identidad_correr();';
begin
  select pg_get_functiondef(p.oid) into d
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='api_refrescar_margen_real';

  if position('mv_subdiario_ventas' in d) > 0 then
    raise notice 'ya estaba'; return;
  end if;
  if position(ancla in d) = 0 then
    raise exception 'NO ENCONTRE EL ANCLA: no se toca la funcion a ciegas.';
  end if;

  d := replace(d, ancla,
       E'    refresh materialized view ema.mv_subdiario_ventas;\n' || ancla);
  execute d;
  raise notice 'parcheada';
end $$;

-- ---------------------------------------------------------------------------
-- 6. ayuda.entrenar() SALE DEL REFRESCO Y PASA A SU PROPIA FUNCION
-- ---------------------------------------------------------------------------
do $$
declare d text;
  ancla text := E'  begin perform ayuda.entrenar(); exception when others then null; end;\n';
begin
  select pg_get_functiondef(p.oid) into d
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='api_refrescar_margen_real';

  if position('ayuda.entrenar' in d) = 0 then raise notice 'ya salio'; return; end if;
  if position(ancla in d) = 0 then
    raise exception 'NO ENCONTRE EL ANCLA DE entrenar(): no se toca la funcion a ciegas.';
  end if;
  d := replace(d, ancla, '');
  execute d;
  raise notice 'entrenar() salio del refresco';
end $$;

create or replace function public.api_entrenar_ayuda()
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $f$
declare r jsonb; t0 timestamptz := clock_timestamp();
begin
  select ayuda.entrenar() into r;
  insert into ema.control_corrida(control, ok, que_midio, detalle, rama)
  values ('el entrenamiento de la ayuda', true,
          'ayuda.entrenar() corrido aparte del refresco de datos',
          'nota ' || coalesce(r->>'NOTA','?')
          || ' · aprobadas ' || coalesce(r->>'aprobadas','?')
          || ' · retiradas ' || coalesce(r->>'retiradas','?')
          || ' · ' || round(extract(epoch from (clock_timestamp()-t0))*1000)::text || ' ms',
          'automatico');
  return jsonb_build_object('ok', true, 'entrenar', r,
    'ms', round(extract(epoch from (clock_timestamp()-t0))*1000));
exception when others then
  insert into ema.control_corrida(control, ok, que_midio, detalle, rama)
  values ('el entrenamiento de la ayuda', false,
          'ayuda.entrenar() corrido aparte del refresco de datos',
          'FALLO: '||sqlerrm, 'automatico');
  return jsonb_build_object('ok', false, 'error', sqlerrm);
end
$f$;

-- el permiso: los dos revoke, porque el default ACL de Supabase se lo da a
-- anon DIRECTO y revocarle a public no se lo saca (medido el 14/11).
revoke execute on function public.api_entrenar_ayuda() from public;
revoke execute on function public.api_entrenar_ayuda() from anon;
grant  execute on function public.api_entrenar_ayuda() to authenticated;

-- ---------------------------------------------------------------------------
-- 7. LA TAREA NOCTURNA pasa a tener TRES pasos. No se edita desde aca: se
--    cambio el texto de la tarea programada "Refresco nocturno + respaldo en
--    Drive — DISSAN" (trig_01RCAMdp8CApAxsmbLJ7xnRX) el 15/11, agregando el
--    paso 3 con api_entrenar_ayuda() y corrigiendo las dos cifras de
--    referencia que habian quedado viejas desde el 06/11 y hacian sonar una
--    alarma falsa todas las noches: la cobertura 93,4 % -> 83,9 % y los
--    renglones 31.434 -> 32.304.
-- ---------------------------------------------------------------------------

-- COMPROBACIONES, en llamadas APARTE (una prueba que termina en RAISE en el
-- mismo lote que el CREATE se lleva puesto el CREATE — 11/11/2026):
--   select public.api_refrescar_margen_real();   -> ok true, 112,4 s
--   select public.api_entrenar_ayuda();          -> ok true, 33.839 ms, NOTA 100
--   with ahora as (select distinct on (clave) clave, valor_a, valor_b, semaforo
--                    from ema.identidad_corrida
--                   where clave in (select clave from ema.identidad_antes_del_15_11)
--                   order by clave, cuando desc)
--   select count(*) , count(*) filter (where a.valor_a=n.valor_a and a.valor_b=n.valor_b)
--     from ema.identidad_antes_del_15_11 a join ahora n using (clave);
--   -> 13 y 13
