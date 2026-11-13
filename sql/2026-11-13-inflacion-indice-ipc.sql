/* ===========================================================================
   13/11/2026 — LA INFLACION: EL INDICE, Y LO QUE SE NIEGA A ESTIMAR
   ===========================================================================

   DE DONDE SALEN LOS NUMEROS. INDEC, IPC Nivel General Nacional, base
   dic-2016 = 100. Serie 148.3_INIVELNAL_DICI_M_26 del portal de datos
   abiertos del Estado (apis.datos.gob.ar). 68 meses: 2021-01 a 2026-08.

   COMO SE BAJARON, Y POR QUE NO LOS ESCRIBI DE MEMORIA. El contenedor no
   llega a apis.datos.gob.ar (no esta en la lista blanca del proxy), asi que
   la bajada se hizo desde el Chrome del usuario, igual que el conductor del
   analisis. Ver control/bajar-ipc.js.

   Y SE CONTROLO LA TRANSCRIPCION, QUE ES LO QUE SIEMPRE SE SALTEA. Escribir
   68 numeros a mano no es copiar, es transcribir, y un error de transcripcion
   da una cifra creible y mal -exactamente lo que todo este proyecto frena-.
   Medido el 13/11 desde el navegador, comparando fila por fila lo que quedo
   en la base contra la API en vivo:
       en_la_base: 68 · en_la_api: 68 · diferencias: [] · en_api_y_no_en_base: []
   68 de 68 identicos. Sin esa medicion esto no se entregaba.

   LO QUE ESTO NO HACE, Y ES LO MAS IMPORTANTE DE TODO EL ARCHIVO.
   El INDEC publica con atraso. Medido hoy 13/11/2026: el ultimo indice
   publicado es el de AGOSTO 2026 y las ventas llegan al 12/11/2026. O sea
   que septiembre, octubre y noviembre NO SE PUEDEN AJUSTAR.
   api_pesos_constantes contesta se_puede=false con el motivo escrito, en vez
   de devolver 1 -que seria decir "no hubo inflacion"- o null -que al
   multiplicar da cero-. UN FACTOR INVENTADO ES UNA CIFRA CREIBLE Y MAL.
   =========================================================================== */


/* ---------------------------------------------------------------------------
   1. LA TABLA
   --------------------------------------------------------------------------- */
create table if not exists ema.indice_precios (
  mes            date        primary key,
  indice         numeric     not null check (indice > 0),
  serie          text        not null,
  fuente         text        not null,
  bajado_cuando  timestamptz not null default now()
);

comment on table ema.indice_precios is
 'IPC Nivel General Nacional, base dic-2016=100. Se usa para llevar pesos de un mes a pesos de otro. NO se estima ningun mes que INDEC todavia no publico: si falta, api_pesos_constantes contesta se_puede=false y lo declara.';


/* ---------------------------------------------------------------------------
   2. LOS 68 MESES  (controlados 68/68 contra la API viva, ver arriba)
   --------------------------------------------------------------------------- */
insert into ema.indice_precios (mes, indice, serie, fuente) values
 ('2021-01-01',  401.5071,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2021-02-01',  415.8595,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2021-03-01',  435.8657,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2021-04-01',  453.6503,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2021-05-01',  468.7250,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2021-06-01',  483.6049,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2021-07-01',  498.0987,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2021-08-01',  510.3942,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2021-09-01',  528.4968,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2021-10-01',  547.0802,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2021-11-01',  560.9184,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2021-12-01',  582.4575,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2022-01-01',  605.0317,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2022-02-01',  633.4341,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2022-03-01',  676.0566,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2022-04-01',  716.9399,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2022-05-01',  753.1470,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2022-06-01',  793.0278,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2022-07-01',  851.7610,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2022-08-01',  911.1316,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2022-09-01',  967.3076,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2022-10-01', 1028.7060,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2022-11-01', 1079.2787,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2022-12-01', 1134.5875,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2023-01-01', 1202.9790,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2023-02-01', 1282.7091,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2023-03-01', 1381.1601,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2023-04-01', 1497.2147,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2023-05-01', 1613.5895,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2023-06-01', 1709.6115,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2023-07-01', 1818.0838,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2023-08-01', 2044.2832,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2023-09-01', 2304.9242,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2023-10-01', 2496.2730,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2023-11-01', 2816.0628,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2023-12-01', 3533.1922,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2024-01-01', 4261.5324,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2024-02-01', 4825.7881,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2024-03-01', 5357.0929,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2024-04-01', 5830.2271,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2024-05-01', 6073.7000,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2024-06-01', 6351.7145,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2024-07-01', 6607.7479,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2024-08-01', 6883.4412,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2024-09-01', 7122.2421,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2024-10-01', 7313.9542,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2024-11-01', 7491.4314,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2024-12-01', 7694.0075,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2025-01-01', 7864.1257,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2025-02-01', 8052.9927,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2025-03-01', 8353.3158,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2025-04-01', 8585.6078,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2025-05-01', 8714.4871,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2025-06-01', 8855.5681,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2025-07-01', 9023.9730,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2025-08-01', 9193.2441,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2025-09-01', 9384.0922,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2025-10-01', 9603.8623,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2025-11-01', 9841.3581,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2025-12-01',10121.3715,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2026-01-01',10413.0309,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2026-02-01',10714.6255,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2026-03-01',11077.0608,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2026-04-01',11363.0904,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2026-05-01',11607.3937,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2026-06-01',11826.4103,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2026-07-01',12076.3937,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar'),
 ('2026-08-01',12276.7660,'148.3_INIVELNAL_DICI_M_26','INDEC via apis.datos.gob.ar')
on conflict (mes) do update set indice = excluded.indice, bajado_cuando = now();


/* ---------------------------------------------------------------------------
   3. LA VISTA, PARA JOINEAR UNA SERIE
   ---------------------------------------------------------------------------
   OJO AL JOIN: los meses sin indice NO estan en esta vista. Con un join comun
   desaparecen de la suma EN SILENCIO y el total ajustado queda mas chico que
   el nominal sin que se note. Va left join, y se contesta aparte cuantos
   meses quedaron sin ajustar. Esta advertencia esta escrita tambien en la
   regla de ayuda.saber para que la lea el modelo.
   --------------------------------------------------------------------------- */
create or replace view public.vista_indice_precios as
select i.mes,
       i.indice,
       (select max(indice) from ema.indice_precios) / i.indice as factor_a_pesos_del_ultimo_mes,
       (select max(mes)    from ema.indice_precios)            as ultimo_mes_publicado,
       i.serie, i.fuente
from ema.indice_precios i;

revoke all    on public.vista_indice_precios from public;
grant  select on public.vista_indice_precios to authenticated;


/* ---------------------------------------------------------------------------
   4. EL FACTOR, Y LA NEGATIVA A INVENTARLO
   --------------------------------------------------------------------------- */
create or replace function public.api_pesos_constantes(p_mes date, p_mes_destino date default null)
returns jsonb
language sql stable security definer
set search_path to 'public','ema'
as $$
with b as (
  select date_trunc('month', p_mes)::date as m_o,
         coalesce(date_trunc('month', p_mes_destino)::date,
                  (select max(mes) from ema.indice_precios)) as m_d,
         (select max(mes) from ema.indice_precios) as ultimo
),
v as (
  select b.*,
         (select indice from ema.indice_precios where mes = b.m_o) as i_o,
         (select indice from ema.indice_precios where mes = b.m_d) as i_d
  from b
)
select case
  when i_o is null or i_d is null then jsonb_build_object(
    'se_puede', false,
    'mes_pedido', to_char(m_o,'YYYY-MM'),
    'mes_destino', to_char(m_d,'YYYY-MM'),
    'ultimo_mes_publicado', to_char(ultimo,'YYYY-MM'),
    'por_que', 'El IPC publicado por el INDEC llega hasta ' || to_char(ultimo,'YYYY-MM') ||
               '. Para ' || to_char(coalesce(case when i_o is null then m_o else m_d end, m_o),'YYYY-MM') ||
               ' no hay indice y NO se estima.',
    'como_decirlo', 'Deci esto, sin rodeos: "' ||
               to_char(coalesce(case when i_o is null then m_o else m_d end, m_o),'YYYY-MM') ||
               ' no se puede ajustar por inflacion: el ultimo IPC publicado es el de ' ||
               to_char(ultimo,'YYYY-MM') || '. La cifra queda en pesos nominales."')
  else jsonb_build_object(
    'se_puede', true,
    'mes_pedido', to_char(m_o,'YYYY-MM'),
    'mes_destino', to_char(m_d,'YYYY-MM'),
    'indice_origen', i_o,
    'indice_destino', i_d,
    'factor', round(i_d / i_o, 6),
    'fuente', 'IPC Nivel General Nacional, base dic-2016=100. INDEC, serie 148.3_INIVELNAL_DICI_M_26 (apis.datos.gob.ar)',
    'como_decirlo', 'Aclaralo asi: "ajustado por inflacion a pesos de ' || to_char(m_d,'YYYY-MM') ||
                    ', IPC Nivel General del INDEC".')
end
from v;
$$;

create or replace function public.api_indice_precios_estado()
returns jsonb
language sql stable security definer
set search_path to 'public','ema'
as $$
select jsonb_build_object(
  'desde', to_char(min(mes),'YYYY-MM'),
  'hasta', to_char(max(mes),'YYYY-MM'),
  'meses_cargados', count(*),
  'serie', min(serie),
  'fuente', 'INDEC, IPC Nivel General Nacional, base dic-2016=100, via apis.datos.gob.ar',
  'bajado_cuando', max(bajado_cuando),
  'ojo', 'El INDEC publica con atraso. Todo mes POSTERIOR a ' || to_char(max(mes),'YYYY-MM') ||
         ' no tiene indice y NO se estima: api_pesos_constantes contesta se_puede=false y hay que decirlo en la lectura.')
from ema.indice_precios;
$$;

/* EL PERMISO VIENE DE PUBLIC, NO DE anon (regla corregida el 12/11). */
revoke execute on function public.api_pesos_constantes(date,date)  from public;
revoke execute on function public.api_indice_precios_estado()      from public;
grant  execute on function public.api_pesos_constantes(date,date)  to authenticated;
grant  execute on function public.api_indice_precios_estado()      to authenticated;


/* ---------------------------------------------------------------------------
   5. LA REGLA QUE LEE EL MODELO  (ayuda.saber id 21)
   ---------------------------------------------------------------------------
   MEDIDO que llega de verdad, no supuesto: api_ia_saber() devuelve 15.785
   bytes y adentro viajan 'api_pesos_constantes', 'vista_indice_precios' y
   'left join'. El 12/11 el mapa estaba lleno y el consumidor no lo leia:
   antes de decir que algo "usa" una regla, hay que medir que la recibe.
   --------------------------------------------------------------------------- */
update ayuda.saber set
  tema = 'Comparar pesos de anios o meses distintos (inflacion)',
  que_usar = 'Si comparas importes de periodos distintos estas comparando pesos de poder adquisitivo distinto. YA HAY INDICE CARGADO: llama a api_indice_precios_estado() para ver hasta que mes hay, y a api_pesos_constantes(p_mes => ''AAAA-MM-01'') para el factor. Para una serie, joineas contra la vista vista_indice_precios por el mes y multiplicas por factor_a_pesos_del_ultimo_mes. Mostra SIEMPRE las dos: la nominal y la ajustada, y deci a pesos de que mes esta ajustada y que el indice es el IPC Nivel General del INDEC.',
  cuidado = 'CUIDADO 1: en Argentina una suba NOMINAL del 80% interanual puede ser una CAIDA real. Publicar "crecimos 80%" sin aclarar que es nominal es hacer quedar mal al que lo lee. CUIDADO 2, el mas importante: el INDEC publica con atraso y el indice NO llega hasta hoy. Si api_pesos_constantes contesta se_puede=false, NO inventes el factor, NO uses el del mes anterior y NO pongas 1: deci textualmente que ese mes no se puede ajustar y hasta que mes llega el IPC publicado. CUIDADO 3: si joineas contra vista_indice_precios con un join comun, los meses sin indice DESAPARECEN de la suma en silencio y el total ajustado queda mas chico que el nominal sin que se note. Usa left join y contesta aparte cuantos meses quedaron sin ajustar.',
  orden = 6, activo = true
where id = 21;


/* ---------------------------------------------------------------------------
   6. LAS DOS IDENTIDADES QUE CUIDAN EL INDICE
   ---------------------------------------------------------------------------
   Y SU ARNES, corrido el 13/11 ANTES de darlas por buenas. Una identidad que
   da cero sin que se haya probado que puede dar distinto de cero no es un
   control: es un cero que parece una respuesta.

     sin_huecos, de verdad .............................. 0   (verde)
     al_dia, de verdad .................................. 0   (verde)
     ARNES: el mismo calculo con 2024-05 sacado ......... 1   (lo detecta)
     ARNES: como si el ultimo mes fuera 2026-02 ......... 5   (lo detecta)
   --------------------------------------------------------------------------- */
insert into ema.identidad (clave, nombre, pregunta, fuente_a, fuente_b, sql_a, sql_b, tolerancia, unidad, activa, periodo) values
('indice_precios_sin_huecos',
 'El indice de precios no tiene meses faltantes',
 'Entre el primer mes y el ultimo del IPC cargado, ¿falta algun mes?',
 'los meses que deberian existir entre el primero y el ultimo',
 'cero: no puede faltar ninguno',
 $$select (
     (select count(*) from generate_series(
        (select min(mes) from ema.indice_precios),
        (select max(mes) from ema.indice_precios),
        interval '1 month'))
   - (select count(*) from ema.indice_precios))::numeric$$,
 'select 0::numeric', 0, 'meses', true, 'ninguno'),

('indice_precios_al_dia',
 'El indice de precios no quedo viejo',
 'El IPC cargado, ¿sigue razonablemente al dia con lo que publica el INDEC?',
 'meses de atraso por encima de los 4 que el INDEC tarda en publicar',
 'cero: hasta 4 meses de atraso es lo normal',
 $$select greatest(0,
     ( (extract(year from current_date)*12 + extract(month from current_date))
     - (select extract(year from max(mes))*12 + extract(month from max(mes)) from ema.indice_precios)
     ) - 4)::numeric$$,
 'select 0::numeric', 0, 'meses', true, 'ninguno')
on conflict (clave) do nothing;

/* La comprobacion va en una llamada APARTE: una prueba que termina en RAISE
   dentro del mismo lote que el insert se lleva puesto el insert. Paso tres
   veces en dos dias.

     select ema.identidad_correr('indice_precios_sin_huecos');
     select ema.identidad_correr('indice_precios_al_dia');
*/
