-- ============================================================================
-- PUERTA 17 — «la lectura de listas», nombrada adentro del semaforo
-- 14/11/2026
-- ============================================================================
-- Agrega el renglon a la lista de puertas que `api_estado_del_sistema()` lleva
-- adentro. Importa que este nombrada ANTES de que corra por primera vez: si
-- una puerta no esta en esa lista, cuando nunca corrio no aparece en rojo,
-- simplemente FALTA — y una puerta que falta de la lista no se extrania.
--
-- Medido al aplicarlo: aparecio sola, «la lectura de listas · rojo · NUNCA SE
-- MIDIO», y pasa a verde cuando el pre-push la corre.
--
-- POR QUE EXISTE LA PUERTA. La lectura de los PDF de los proveedores no tenia
-- ningun control. El 14/11 el usuario mando dos capturas con el codigo de ICU
-- escrito "14001-31Set" y "LAT-MC2005Extension": la primera palabra de la
-- descripcion pegada al codigo. Un codigo asi NO liga con el articulo de Tango
-- y el renglon se pierde — un precio que no entra es una cotizacion mal hecha
-- o una venta bajo el costo.
--
-- EL PARCHE SE APLICA SOBRE EL TEXTO DE LA FUNCION VIVA, NO SOBRE UNA COPIA
-- MIA. Y ABORTA SI EL ANCLA NO APARECE: la regla del proyecto es que un parche
-- que no encuentra su ancla no escribe nada, en vez de dejar la funcion a
-- medias. Tambien corta si el nombre ya estaba, asi correrlo dos veces no
-- duplica el renglon.
-- ============================================================================

do $$
declare d text;
begin
  select pg_get_functiondef(p.oid) into d
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'api_estado_del_sistema';

  if position('la lectura de listas' in d) > 0 then
    raise notice 'ya estaba nombrada, no se toca';
    return;
  end if;
  if position(E'(''el dictado'',                            15,  24),' in d) = 0 then
    raise exception 'NO ENCONTRE EL ANCLA. No se toca la funcion a ciegas.';
  end if;

  d := replace(d,
    E'(''el dictado'',                            15,  24),',
    E'(''el dictado'',                            15,  24),\n           (''la lectura de listas'',                  16,  24),');
  execute d;
  raise notice 'puerta 17 nombrada adentro de api_estado_del_sistema';
end $$;

-- comprobacion, en una llamada APARTE (una prueba que termina en RAISE en el
-- mismo lote que el CREATE se lleva puesto el CREATE — 11/11/2026):
--   select control, semaforo, veredicto from api_estado_del_sistema()
--   where control = 'la lectura de listas';
-- dio: la lectura de listas · rojo · NUNCA SE MIDIO
