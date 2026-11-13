-- ===========================================================================
-- LAS IDENTIDADES MES POR MES, Y EL CONTROL QUE LEE EL PERIODO   12/11/2026
-- ===========================================================================
-- Lo aplicado a la base, para que el repositorio diga lo mismo que esta vivo.
-- El 05/11 un arreglo desplegado que no entro al repositorio se perdio en el
-- despliegue siguiente.
--
-- EL PROBLEMA. Las 28 identidades median el ANIO o la HISTORIA, y la gente
-- pregunta por MESES. Medido en el panel publicado: "cuantas notas de credito
-- de venta emitimos en octubre 2026" contestaba 6 -correcto- y el control
-- comparaba esas 6 contra las 63 del anio y gritaba
--   "NO COINCIDE. Diferencia 57. No publiques esta cifra sin mirarla."
-- sobre una respuesta buena. Una puerta que grita en falso se termina apagando.
--
-- LO QUE SE HIZO:
--   1. ema.identidad.periodo: 'historico' | 'anio' | 'mes:MM' | 'ninguno'.
--      El periodo se DECLARA. v5 y v6 lo adivinaban del texto de la etiqueta
--      y v6 se rompia con "octubre 2026", que contiene 2026 y pasaba por anual.
--   2. 55 identidades mensuales generadas: 5 por cada mes con facturas
--      (ventas vs contabilidad, facturas, clientes, notas de credito, IVA).
--      Medido al darlas de alta: 55 de 55 en verde.
--      Octubre, por ejemplo: facturacion $523.918.517,26 contra
--      $523.918.510,73 de la contabilidad -> $6,53 · facturas 282 = 282 ·
--      clientes 62 = 62 · notas de credito 6 = 6.
--   3. api_ia_control_cifra v7: el periodo es condicion dura. Una identidad
--      'mes:10' solo controla una cifra cuya etiqueta nombre octubre.
--      Arnes 9/9: las 6 N/C de octubre dan `coincide`; falseadas en 0 o en 20
--      dan `no_coincide`; un conteo sin segunda fuente dice "nadie lo controla".
--
-- UNA TRAMPA DE RENDIMIENTO, MEDIDA. La primera version de ventas_MM usaba
-- `exists (select 1 from vista_margen_v2_oc ...)` correlacionado por fila:
-- statement timeout. Se reescribio con la lista de comprobantes del mes
-- materializada en un CTE primero. La vista es cara: hay que entrar por gva12
-- filtrado por fecha, no al reves.
--
-- EL CUERPO EXACTO DE LA FUNCION SE LEE CON:
--   select pg_get_functiondef(oid) from pg_proc where proname='api_ia_control_cifra';
-- Y LAS IDENTIDADES CON:
--   select clave, periodo, fuente_a, fuente_b, tolerancia from ema.identidad
--    where activa order by periodo, clave;
--
-- PERMISOS: con CADA api_ nueva va
--   revoke execute on function ... from public;   -- de PUBLIC, NO de anon:
--   revoke execute on function ... from anon;     -- anon lo hereda de PUBLIC
--   grant  execute on function ... to authenticated;
-- y despues se MIDE con has_function_privilege, no se supone.
-- ===========================================================================

alter table ema.identidad add column if not exists periodo text;

-- ayuda.lectura_guardada tambien se puede retirar ahora: la memoria del
-- ARMADO ya tenia `activa` y la de la LECTURA no, y servia gratis y para
-- siempre una respuesta que contestaba otra pregunta.
alter table ayuda.lectura_guardada
  add column if not exists activa boolean not null default true,
  add column if not exists retirada_por_que text,
  add column if not exists retirada_en timestamptz;

revoke execute on function public.api_ia_control_cifra(text, numeric, integer) from public;
revoke execute on function public.api_ia_control_cifra(text, numeric, integer) from anon;
grant  execute on function public.api_ia_control_cifra(text, numeric, integer) to authenticated;
