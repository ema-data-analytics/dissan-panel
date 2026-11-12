-- ===========================================================================
-- EL CONTROL DE CIFRAS v3, Y LAS IDENTIDADES QUE FALTABAN     12/11/2026
-- ===========================================================================
-- Se guarda aca lo que se aplico a la base, para que el repositorio tenga lo
-- mismo que esta vivo. El 05/11 un arreglo desplegado que no entro al
-- repositorio se perdio en el despliegue siguiente.
--
-- 1. api_ia_control_cifra pasa a v3. Las dos anteriores se cayeron asi:
--    v1 comparaba contra la corrida de anoche y marcaba en rojo cifras que
--       estaban bien, porque los numeros se mueven durante el dia.
--    v2 elegia la identidad por PALABRAS EN COMUN y nada mas. Medido en vivo
--       con "cuanto facturamos en 2026": comparo un conteo de 2.845
--       comprobantes contra $16.447.435.366, y la facturacion contra el costo
--       del tablero, que dio 0. Las tres cifras estaban BIEN y las tres
--       dieron no_coincide. Por ese grito falso la respuesta correcta NO SE
--       MEMORIZO.
--    v3 agrega dos filtros antes de animarse a decir "no coincide":
--       - DOS palabras en comun, no una;
--       - el ORDEN DE MAGNITUD tiene que dar: si la fuente da cero o se
--         llevan mas de 20 veces, no estan midiendo lo mismo. Eso es
--         `no_cubierta` ("nadie la controla"), nunca `no_coincide`.
--    Arnes medido: deja de gritar en falso Y sigue agarrando una facturacion
--    falseada en $1.136 millones.
--
-- 2. TRES IDENTIDADES NUEVAS, POR ANIO Y POR DOS RUTAS. Ese era el agujero de
--    fondo: las 22 que habia miden totales de TODA LA HISTORIA, y la gente
--    pregunta por periodos. Por eso "facturamos en 2026" no encontraba quien
--    lo controlara.
--    Medido al darlas de alta:
--      ventas_2026_vs_contabilidad  $5.136.904.078,43 vs $5.136.904.060,04
--                                   -> $18,39 de diferencia
--      facturas_2026_dos_rutas      2.846 vs 2.845
--      clientes_2026_dos_rutas      118 vs 118, exacto
--    OJO con la facturacion del anio: sin restringir a `contabilizado = 'S'`
--    da $2.005 millones de diferencia, y NO es un error: son las facturas sin
--    contabilizar que se midieron el 10/11. Las dos puntas tienen que mirar
--    los mismos comprobantes.
--
-- 3. Y SE RETIRA LA FIRMA DUPLICADA. api_ia_control_cifra estaba creada dos
--    veces (2 y 3 argumentos). PostgREST resuelve por nombre y las dos
--    calificaban: PGRST203, ambigua, no la podia llamar nadie.
--
-- 4. EL PERMISO VENIA DE `PUBLIC`, NO DE `anon`. La regla escrita en
--    CLAUDE.md desde el 10/11 decia revocarle a anon, y eso NO SACA NADA: el
--    ACL mostraba `=X/postgres`, que es PUBLIC, y anon lo hereda. Medido:
--    despues de `revoke ... from public`, anon = false, authenticated = true.
-- ===========================================================================

-- (1) la firma vieja se retira renombrandola; en este proyecto no se borra nada
alter function public.api_ia_control_cifra(text, numeric)
  rename to api_ia_control_cifra_antes_del_12_11_ultima_corrida;

-- (2) el cuerpo de v3 y las tres identidades estan aplicados en la base; este
--     archivo deja el registro de QUE se hizo y POR QUE. El cuerpo exacto se
--     lee con:  select pg_get_functiondef(oid) from pg_proc
--               where proname = 'api_ia_control_cifra';

-- (4) el permiso, que es lo que hay que repetir con CADA api_ nueva
revoke execute on function public.api_ia_control_cifra(text, numeric, integer) from public;
revoke execute on function public.api_ia_control_cifra(text, numeric, integer) from anon;
grant  execute on function public.api_ia_control_cifra(text, numeric, integer) to authenticated;
