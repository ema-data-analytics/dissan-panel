-- ============================================================================
-- api_listas_armar_v2 — EL PRECIO DE LOS ARTICULOS QUE TANGO COMPRA POR BULTO
-- 15/11/2026
-- ============================================================================
-- LA CAGADA, MEDIDA. El archivo para Tango llevaba SIEMPRE el precio por
-- UNIDAD (precio de lista x factor). Para los articulos cuyo precio Tango
-- espera POR BULTO, eso entra la lista de 10, 20, 30 o 54 veces mas chico, en
-- silencio, con una cifra creible. Y la pantalla lo afirmaba por escrito:
-- "El Precio va por unidad ... igual que en el archivo que armo DISSAN".
--
-- LA FUENTE INDEPENDIENTE ES cpa44 — el detalle de la lista de precios de
-- proveedor de Tango, cargado por DISSAN, un precio_uni por articulo y lista.
-- Medido el 15/11 sobre los 241 renglones que entran de COLOPLAST (lista 4),
-- comparando lo que viaja contra lo que Tango YA tiene:
--
--     razon = cpa44.precio_uni / precio_que_viaja
--     224 renglones -> razon 1,000 a 1,078   (Tango lo tiene POR UNIDAD: bien)
--      15 renglones -> razon 10,780 a 58,212 (Tango lo tiene POR BULTO: MAL)
--
-- La razon cae EXACTAMENTE en 1,078 x unidades_caja en los 15:
--   1,078x10 = 10,780 · x20 = 21,560 · x30 = 32,340 · x45 = 48,510 · x54 = 58,212
-- No hay un solo caso en el medio. Entre 1,078 y 10,780 hay un factor de diez.
-- Los 15: 62042 · 12080 · 12035 · 12037 · 12039 · 120115 · 120140 · 120215 ·
--         12072 · 12060 · 120700 · 120307 · 120427 · 26555 · 32105
--
-- LO QUE NO ERA EL DISCRIMINADOR. La v1 marcaba "es_caja" con
-- cpa46.unidad_medida_seleccionada = 'C' (lo que se eligio en las facturas de
-- compra). Medido: eso marca 11 articulos, y de esos 11 SEIS estan al reves —
-- 4720 figura es_caja y Tango lo tiene por UNIDAD, mientras 12080 y 12035 NO
-- figuran es_caja y Tango los tiene por BULTO. Y
-- sta_articulo_unidad_compra.equivalencia vale 1 en los once, asi que tampoco
-- sirve. La unidad de la celda (CAJ, CA1, CA2, UN3, U1, UNI) tampoco: 12035
-- dice UNI y va por bulto, 3M00020 dice CAJ y va por unidad.
-- EL UNICO DATO QUE LO DICE ES EL PRECIO QUE TANGO YA TIENE CARGADO.
--
-- LA REGLA, SIN NINGUNA LISTA ESCRITA A MANO (14/10, 14/11): se compara la
-- razon contra 1 y contra unidades_caja EN ESCALA LOGARITMICA y gana la mas
-- cercana. Es libre de escala, asi que aguanta que el precio se haya movido
-- hasta raiz(unidades_caja) veces sin equivocarse: con 30 unidades por bulto,
-- el precio puede multiplicarse por 5,4 o caer a la quinta parte y la decision
-- no cambia. No hay umbral tipeado por mi.
--
-- LO QUE NO SE PUEDE CONTROLAR SE DECLARA, NO SE ADIVINA. Si el articulo trae
-- mas de una unidad por bulto y NO tiene precio previo en cpa44, no hay con
-- que decidir: entra con el precio por unidad —que es lo que hacia la v1, asi
-- que no se rompe nada— y sale nombrado en `por_caja` con su veredicto para
-- que se mire a mano. Medido: COLOPLAST 2, JOHNSON & JOHNSON 17, POTENZA 1.
-- Hacerlos desaparecer del archivo seria perder 20 precios para tapar una duda.
--
-- SE CONSTRUYE AL LADO: api_listas_armar (v1) no se toca. El parche sale del
-- TEXTO DE LA FUNCION VIVA —no de una copia mia— y ABORTA si un ancla no
-- aparece. Correrlo dos veces vuelve a dejar la v2 igual.
-- ============================================================================

do $$
declare
  d text;
  a text;
  b text;
  paso text;
begin
  select pg_get_functiondef(p.oid) into d
  from pg_proc p join pg_namespace nn on nn.oid = p.pronamespace
  where nn.nspname = 'public' and p.proname = 'api_listas_armar'
    and pg_get_function_identity_arguments(p.oid) = 'p_lista_id bigint, p_filas jsonb';
  if d is null then
    raise exception 'no existe public.api_listas_armar(bigint, jsonb): no hay de donde partir';
  end if;

  ---------------------------------------------------------------- 1. el nombre
  paso := 'el nombre';
  a := 'CREATE OR REPLACE FUNCTION public.api_listas_armar(p_lista_id bigint, p_filas jsonb)';
  b := 'CREATE OR REPLACE FUNCTION public.api_listas_armar_v2(p_lista_id bigint, p_filas jsonb)';
  if position(a in d) = 0 then raise exception 'NO ENCONTRE EL ANCLA (%)', paso; end if;
  d := replace(d, a, b);

  ----------------------------------------------------------- 2. dos contadores
  paso := 'los contadores';
  a := E'  v_por_caja    jsonb := \'[]\'::jsonb;';
  b := a || E'\n'
    || E'  v_x_bulto     int := 0;   -- renglones a los que se les paso el precio a bulto\n'
    || E'  v_sin_control int := 0;   -- renglones por bulto que Tango no puede controlar';
  if position(a in d) = 0 then raise exception 'NO ENCONTRE EL ANCLA (%)', paso; end if;
  d := replace(d, a, b);

  ------------------------------------- 3. el precio que Tango YA tiene cargado
  paso := 'el lugar donde entra prev';
  a := E'  ), caja as materialized (';
  b := E'  ), prev as materialized (\n'
    || E'    -- LA FUENTE INDEPENDIENTE: el precio que Tango ya tiene cargado para\n'
    || E'    -- ESTA lista de proveedor. Es lo unico que dice en que unidad lo espera.\n'
    || E'    select btrim(x.cod_articu) cod_articu, max(x.precio_uni) precio_prev\n'
    || E'      from public.cpa44 x\n'
    || E'     where v_cod_lista is not null and x.cod_lista = v_cod_lista\n'
    || E'       and x.precio_uni is not null and x.precio_uni > 0\n'
    || E'     group by 1\n'
    || a;
  if position(a in d) = 0 then raise exception 'NO ENCONTRE EL ANCLA (%)', paso; end if;
  d := replace(d, a, b);

  ------------------------------------- 4. la decision y el precio que sale
  paso := 'la decision por bulto';
  a := E'  ), clas as (\n'
    || E'    select l.*,\n'
    || E'           (c.cod_articu is not null) es_caja,\n'
    || E'           round(l.precio_lista * v_factor, 4) costo_unit,\n'
    || E'           row_number() over (partition by l.cod_articu order by l.orden) rk\n'
    || E'      from lig l\n'
    || E'      left join caja c on c.cod_articu = l.cod_articu\n'
    || E'  ), motivo as (';
  b := E'  ), clas as (\n'
    || E'    select l.*,\n'
    || E'           (c.cod_articu is not null) es_caja,\n'
    || E'           round(l.precio_lista * v_factor, 4) costo_unit,\n'
    || E'           pv.precio_prev,\n'
    || E'           row_number() over (partition by l.cod_articu order by l.orden) rk\n'
    || E'      from lig l\n'
    || E'      left join caja c on c.cod_articu = l.cod_articu\n'
    || E'      left join prev pv on pv.cod_articu = l.cod_articu\n'
    || E'  ), decide as (\n'
    || E'    -- EN QUE UNIDAD ESPERA TANGO EL PRECIO. Se compara la razon contra 1 y\n'
    || E'    -- contra unidades_caja en escala logaritmica: gana la mas cercana. Sin\n'
    || E'    -- umbral tipeado y sin lista de articulos escrita a mano.\n'
    || E'    select s.*,\n'
    || E'           ( coalesce(s.unidades_caja, 0) > 1\n'
    || E'             and coalesce(s.costo_unit, 0) > 0\n'
    || E'             and coalesce(s.precio_prev, 0) > 0\n'
    || E'             and abs(ln(s.precio_prev / s.costo_unit / s.unidades_caja))\n'
    || E'               < abs(ln(s.precio_prev / s.costo_unit)) ) va_por_bulto,\n'
    || E'           ( coalesce(s.unidades_caja, 0) > 1\n'
    || E'             and coalesce(s.precio_prev, 0) <= 0 )          sin_control\n'
    || E'      from clas s\n'
    || E'  ), sal as (\n'
    || E'    select s.*,\n'
    || E'           case when s.va_por_bulto\n'
    || E'                then round(s.costo_unit * s.unidades_caja, 4)\n'
    || E'                else s.costo_unit end costo_salida\n'
    || E'      from decide s\n'
    || E'  ), motivo as (';
  if position(a in d) = 0 then raise exception 'NO ENCONTRE EL ANCLA (%)', paso; end if;
  d := replace(d, a, b);

  -- OJO: `replace` cambia TODAS las apariciones, y despues del paso anterior
  -- hay DOS `from clas s` —el de `decide`, que tiene que quedar, y el de
  -- `motivo`, que es el que hay que mover—. Con el ancla corta los cambio los
  -- dos y `decide` queda leyendo de `sal`, que todavia no existe: la funcion se
  -- crea sin una queja y revienta en la primera llamada con
  -- "relation sal does not exist". Por eso el ancla incluye el renglon de
  -- abajo, que solo esta en el de `motivo`.
  paso := 'de donde lee motivo';
  a := E'      from clas s\n  )\n  select coalesce(jsonb_agg(jsonb_build_array(';
  b := E'      from sal s\n  )\n  select coalesce(jsonb_agg(jsonb_build_array(';
  if position(a in d) = 0 then raise exception 'NO ENCONTRE EL ANCLA (%)', paso; end if;
  d := replace(d, a, b);

  ------------------------------------- 5. el precio que viaja en el archivo
  paso := 'el precio de la celda';
  a := E'             coalesce(unidad, \'UNI\'), costo_unit, 0, v_vig, v_vig_hasta';
  b := E'             coalesce(unidad, \'UNI\'), costo_salida, 0, v_vig, v_vig_hasta';
  if position(a in d) = 0 then raise exception 'NO ENCONTRE EL ANCLA (%)', paso; end if;
  d := replace(d, a, b);

  ------------------------------------- 6. el detalle y los dos contadores
  paso := 'el detalle del bulto';
  a := E'         coalesce(jsonb_agg(jsonb_build_object(\n'
    || E'             \'cod_articulo\', cod_articu, \'sinonimo\', sinonimo, \'unidad\', unidad,\n'
    || E'             \'unidades_caja\', unidades_caja, \'precio_unidad\', costo_unit,\n'
    || E'             \'precio_caja\', round(costo_unit * unidades_caja, 4)\n'
    || E'           ) order by cod_articu) filter (where porque is null and es_caja), \'[]\'::jsonb)';
  b := E'         coalesce(jsonb_agg(jsonb_build_object(\n'
    || E'             \'cod_articulo\', cod_articu, \'sinonimo\', sinonimo, \'unidad\', unidad,\n'
    || E'             \'unidades_caja\', unidades_caja, \'precio_unidad\', costo_unit,\n'
    || E'             \'precio_caja\', round(costo_unit * unidades_caja, 4),\n'
    || E'             \'precio_prev\', precio_prev, \'va_por_bulto\', va_por_bulto,\n'
    || E'             \'precio_que_viaja\', costo_salida,\n'
    || E'             \'veredicto\', case\n'
    || E'                when va_por_bulto then \'Tango lo tiene POR BULTO: viaja el precio del bulto\'\n'
    || E'                when sin_control  then \'sin precio previo en Tango: viaja por unidad, SIN CONTROLAR\'\n'
    || E'                else \'Tango lo tiene por unidad: viaja el precio por unidad\' end\n'
    || E'           ) order by cod_articu) filter (where porque is null\n'
    || E'             and (va_por_bulto or sin_control)), \'[]\'::jsonb),\n'
    || E'         (count(*) filter (where porque is null and va_por_bulto))::int,\n'
    || E'         (count(*) filter (where porque is null and sin_control))::int';
  if position(a in d) = 0 then raise exception 'NO ENCONTRE EL ANCLA (%)', paso; end if;
  d := replace(d, a, b);

  paso := 'la lista de variables';
  a := '    into v_filas, v_avisos, v_dif_costo, v_entran, v_leidas, v_por_caja';
  b := a || ', v_x_bulto, v_sin_control';
  if position(a in d) = 0 then raise exception 'NO ENCONTRE EL ANCLA (%)', paso; end if;
  d := replace(d, a, b);

  ------------------------------------------------------------- 7. lo que sale
  paso := 'el resumen';
  a := E'        \'por_caja_que_entran\', jsonb_array_length(v_por_caja),';
  b := E'        \'por_caja_que_entran\', jsonb_array_length(v_por_caja),\n'
    || E'        \'corregidos_por_bulto\', v_x_bulto,\n'
    || E'        \'por_bulto_sin_control\', v_sin_control,';
  if position(a in d) = 0 then raise exception 'NO ENCONTRE EL ANCLA (%)', paso; end if;
  d := replace(d, a, b);

  execute d;
  raise notice 'api_listas_armar_v2 creada a partir del texto de la v1';
end $$;

-- ============================================================================
-- LA PUERTA DE ATRAS: la identidad `listas_precio_contra_cpa44`
-- ============================================================================
-- "Esta regla solo vale si tiene una puerta cerrada atras." El arreglo sin
-- control vuelve en el proximo despliegue, como el de `listas` del 30/10.
-- Corre adentro de `identidad_correr()`, o sea en el refresco nocturno, y sale
-- en `api_estado_del_sistema()`. Medida sola: 5.751 ms.
--
-- EL PRIMER INTENTO GRITO EN FALSO Y LO FRENE. Marcaba toda diferencia de 4
-- veces o mas contra cpa44 y dio 5: cinco renglones de JOHNSON & JOHNSON donde
-- el precio nuevo es 4,16 a 7,65 veces el viejo. No es el defecto: JJEN0083 se
-- compro el 31/12/2022 a $31.349,32 (cpa46) y la inflacion del INDEC de
-- dic-2022 a ago-2026 es 10,82 veces -> $339.214 a pesos de hoy, contra los
-- $381.114 de la lista de julio 2026. cpa44 tiene el precio de 2022. Publicar
-- eso como alarma habria sido acusar de agujero a algo que no lo es, por cuarta
-- vez en tres dias, y encima todas las noches: una puerta que grita siempre se
-- apaga. Se mide LA FIRMA del defecto —la razon igual a las unidades por
-- bulto— y en UNA sola direccion, la del archivo mas barato que Tango, que es
-- la que carga un costo falso.
--
-- LAS DOS CARAS, MEDIDAS (12/11: probar solo que dejo de gritar es apagar la
-- alarma y entregarla rota):
--     la misma consulta contra la v1 (la rota) -> 15 renglones
--     la misma consulta contra la v2 (la nueva) ->  0 renglones
--
-- El texto exacto de sql_a quedo asentado en la base; se lee con
--   select pregunta, sql_a from ema.identidad where clave='listas_precio_contra_cpa44';
-- ============================================================================
