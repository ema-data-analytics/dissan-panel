/* ===========================================================================
   13/11/2026 — EL PERIODO PARCIAL, Y LOS PESOS DE ANIOS DISTINTOS
   ===========================================================================

   POR QUE ESTE ARCHIVO EXISTE, ANTES QUE NADA.
   El 30/10 arregle en la Edge Function `listas` que el formato lo declare el
   ARCHIVO y no la configuracion, lo escribi SOLO en el servidor, y el 01/11
   despliegue desde el repositorio y me lo lleve puesto. Lo mismo vale para la
   base: una funcion creada con execute_sql y no asentada aca no existe para
   nadie mas que para la base, y el dia que se restaure o se migre se pierde
   sin que nadie se entere.

   LO QUE SE APLICO EN LA BASE EL 13/11/2026 Y SE ASIENTA ACA:
     1. public.api_hasta_cuando_hay_datos()      — funcion nueva
     2. ayuda.saber id 20 — comparar un mes en curso contra otro periodo
     3. ayuda.saber id 21 — comparar pesos de anios distintos

   MEDIDO EN ESTA MISMA CORRIDA, no supuesto:
     - has_function_privilege('anon', ...)          => false
     - has_function_privilege('authenticated', ...) => true
     - api_ia_sql(p_sql := 'select * from api_hasta_cuando_hay_datos()')
       contesta ok:true en 7 ms  -> o sea que la herramienta consultar_base
       del modelo SI puede llamarla. Que la regla lo mande no alcanza: habia
       que medir que el camino existe.
     - api_ia_saber() devuelve 15.191 bytes y adentro viajan las DOS reglas
       (buscadas por texto: 'api_hasta_cuando_hay_datos' y 'nominal').
       Esto es lo que el 12/11 fallo con el mapa: la regla estaba escrita y
       el consumidor no la leia. Antes de decir que algo "usa" una regla, hay
       que mirar que recibe de verdad.
   =========================================================================== */


/* ---------------------------------------------------------------------------
   1. HASTA QUE DIA HAY DATOS DE VERDAD, POR FUENTE
   ---------------------------------------------------------------------------
   POR QUE EXISTE. Comparar "noviembre" contra "noviembre del ano pasado"
   cuando de este noviembre van 13 dias y del otro hay 30 da una caida del 60%
   QUE NO EXISTE. Es la misma clase que publicar un porcentaje sin decir su
   denominador: una cifra creible y mal.

   Y SE EXCLUYEN LAS FECHAS FUTURAS. Medido el 13/11: gva12 tiene UNA factura
   fechada 05/12/2202 -un anio tipeado mal en Tango-, asi que un max(fecha)
   pelado contesta el ano 2202. La ultima de verdad es del 12/11/2026.
   Un max() sin filtrar el futuro es un dato que miente solo.
   --------------------------------------------------------------------------- */
CREATE OR REPLACE FUNCTION public.api_hasta_cuando_hay_datos()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'ema', 'ayuda'
AS $function$
select jsonb_build_object(
  'hoy', current_date,
  'ventas', (select jsonb_build_object(
      'ultima_fecha_con_datos', max(fecha_emis)::date,
      'dias_del_mes_en_curso_con_datos',
        coalesce((select count(distinct fecha_emis::date) from gva12
                   where fecha_emis >= date_trunc('month',current_date)
                     and fecha_emis <= current_date), 0),
      'dia_del_mes_hasta_donde_hay',
        coalesce((select extract(day from max(fecha_emis))::int from gva12
                   where fecha_emis >= date_trunc('month',current_date)
                     and fecha_emis <= current_date), 0),
      'fechas_futuras_descartadas',
        (select count(*) from gva12 where fecha_emis > current_date))
    from gva12 where fecha_emis <= current_date),
  'compras', (select jsonb_build_object(
      'ultima_fecha_con_datos', max(fecha_emis)::date,
      'dia_del_mes_hasta_donde_hay',
        coalesce((select extract(day from max(fecha_emis))::int from cpa04
                   where fecha_emis >= date_trunc('month',current_date)
                     and fecha_emis <= current_date), 0),
      'fechas_futuras_descartadas',
        (select count(*) from cpa04 where fecha_emis > current_date))
    from cpa04 where fecha_emis <= current_date),
  'como_se_compara',
    'Para comparar un mes en curso contra otro periodo, hay que recortar LOS DOS '
    'al mismo tramo de dias. Si de este mes van 13 dias, se compara el 1 al 13 de '
    'este mes contra el 1 al 13 del mes anterior y el 1 al 13 del mismo mes del '
    'ano pasado. Comparar 13 dias contra 30 da una caida que no existe.'
);
$function$;

/* EL PERMISO VIENE DE PUBLIC, NO DE anon. La regla del 10/11 estaba mal y se
   corrigio el 12/11: el ACL muestra =X/postgres, que es PUBLIC, y anon lo
   hereda. Un revoke ... from anon NO SACA NADA. */
revoke execute on function public.api_hasta_cuando_hay_datos() from public;
grant  execute on function public.api_hasta_cuando_hay_datos() to authenticated;

/* Y SE MIDE, EN UNA LLAMADA APARTE. Una prueba que termina en RAISE dentro del
   mismo lote que el CREATE aborta la transaccion y se lleva puesto el CREATE
   (paso el 11/11 con api_volcado_esquema). Por eso esto va suelto:

     select has_function_privilege('anon','public.api_hasta_cuando_hay_datos()','EXECUTE')          -- false
          , has_function_privilege('authenticated','public.api_hasta_cuando_hay_datos()','EXECUTE'); -- true
*/


/* ---------------------------------------------------------------------------
   2. LA REGLA DEL PERIODO PARCIAL  (ayuda.saber id 20)
   --------------------------------------------------------------------------- */
insert into ayuda.saber (id, tema, que_usar, cuidado, orden, activo)
values (20,
 'Comparar un mes en curso contra otro periodo',
 'Antes de comparar un mes que todavia no termino, llama a api_hasta_cuando_hay_datos() y mira hasta que DIA hay datos. Despues recorta LOS DOS lados al mismo tramo: si de este mes van 12 dias, compara el 1 al 12 de este mes contra el 1 al 12 del mes anterior y el 1 al 12 del mismo mes del ano pasado. Decilo en la lectura: "del 1 al 12, el mismo tramo en los tres periodos".',
 'CUIDADO: comparar 12 dias de este mes contra los 30 del mes pasado da una caida del 60% QUE NO EXISTE. Es una cifra creible y mal, de la misma clase que publicar un porcentaje sin decir su denominador. Y NUNCA uses max(fecha_emis) pelado para saber hasta cuando hay datos: gva12 tiene una factura fechada 05/12/2202 -un anio tipeado mal en Tango- y un max() sin filtrar el futuro contesta el ano 2202. La ultima de verdad es del 12/11/2026. api_hasta_cuando_hay_datos() ya descarta el futuro.',
 5, true)
on conflict (id) do update
   set tema = excluded.tema, que_usar = excluded.que_usar,
       cuidado = excluded.cuidado, orden = excluded.orden, activo = excluded.activo;


/* ---------------------------------------------------------------------------
   3. LA REGLA DE LOS PESOS NOMINALES  (ayuda.saber id 21)
   ---------------------------------------------------------------------------
   OJO: esta regla NO ajusta por inflacion. Declara que NO esta ajustado, que
   es lo unico honesto mientras no haya una tabla de indices cargada con su
   fuente. El dia que exista, esta regla se reemplaza -no se borra- y se deja
   escrito contra que indice se deflacta y de donde salio.
   --------------------------------------------------------------------------- */
insert into ayuda.saber (id, tema, que_usar, cuidado, orden, activo)
values (21,
 'Comparar pesos de anios distintos',
 'Si comparas importes de 2026 contra 2025 o contra cualquier periodo anterior, estas comparando pesos de poder adquisitivo distinto. Mientras no haya una tabla de indices cargada, DECILO en la lectura: "la comparacion esta en pesos nominales, sin ajustar por inflacion". No la escondas.',
 'CUIDADO: en Argentina una suba nominal del 80% interanual puede ser una CAIDA real. Publicar "crecimos 80%" sin aclarar que es nominal es hacer quedar mal al que lo lee. Si todavia no hay indices, el dato no es la cifra ajustada: es la ACLARACION de que no lo esta.',
 6, true)
on conflict (id) do update
   set tema = excluded.tema, que_usar = excluded.que_usar,
       cuidado = excluded.cuidado, orden = excluded.orden, activo = excluded.activo;
