/* LA IMPUTACION ADENTRO DEL SUBDIARIO DE COMPRAS                 16/11/2026
   =========================================================================
   Pedido por DISSAN: que la imputacion aparezca EN el subdiario y no en un
   reporte aparte.

   EL CUERPO DE LA FUNCION ESTA EN LA BASE (api_subdiario_compras_v4) y se
   puede volver a sacar con pg_get_functiondef. Este archivo guarda LO QUE SE
   MIDIO, que es lo que no se puede reconstruir despues.

   1. NO CAMBIA UN SOLO NUMERO DEL SUBDIARIO. Construida AL LADO: la v3 no se
      toco y la v4 delega en la v2 igual que ella. Medido con la huella md5 de
      CADA renglon (fecha, tipo, numero, cuit, total, neto 21, IVA 21, otros):
        octubre 2024: 297 = 297 · $398.744.128,26 = $398.744.128,26
                      huella 240bf86ae12d560d486a19ec12e98125 de los dos lados
        octubre 2026: 392 = 392 · $559.105.521,97 = $559.105.521,97
                      huella 477b7bd833c974d3dc962c39ed2b6bef de los dos lados

   2. DE DONDE SALE LA IMPUTACION (2023-01 a 2026-11, 17.101 comprobantes):
        tipo de gasto del comprobante ... 7.587 (44,4%)
        cuenta del asiento contable ..... 3.365 (19,7%)
        nada ............................ 6.149 (35,9%)
      De esos 6.149, **5.758 tienen el asiento armado pero contabilizado='N'**
      en Tango, por $14.911.401.120: no es que el campo no exista, es que esas
      compras no se contabilizaron. Es el mismo agujero del 10/11.
      En 2026 entero: 3.312 de 3.312 imputados, ninguno vacio.

   3. LA CUENTA SE ELIGE POR SU CODIGO, NO POR EL LADO DEL ASIENTO. La primera
      version filtraba d_h='D' y dejaba sin imputar TODA nota de credito:
      medido en la N/C A0000800003505 de BIOTRONIK (-$12.820.342,04), ahi
      «Mercaderia Gravada» esta en el HABER y «Proveedores» en el DEBE.
      Lo agarre porque UN solo renglon quedaba vacio y fui a ver cual era.

   4. EL TIPO DE GASTO DEL PROVEEDOR NO SIRVE: cpa01.cod_gasto resuelve 0 de
      9.514. Y EL MAPA YA LO DECIA antes de que yo lo midiera —
      ema.diccionario lo tiene como CONSTANTE, "un solo valor en toda la
      tabla". Preguntarle al mapa primero habria ahorrado la medicion.

   5. LA CLAVE DEL JOIN ES (t_comp, n_comp, CUIT) Y EL CUIT NO SOBRA: medido,
      (t_comp, n_comp) solo repite en 216 combinaciones, hasta 4 veces, y un
      join asi DUPLICARIA renglones y rompería los totales, que cierran contra
      la contabilidad.

   6. HACIA FALTA UN INDICE, Y ESO NO ESTABA EN NINGUN MAPA. asiento_cp
      (37.006 renglones) no tenia ninguno por id_asiento_comprobante_cp, asi
      que cada fila del subdiario lo recorria entero: 15.594 ms para 2026, y
      el servidor corta a los 8 — la pantalla habria quedado caida, como el
      Tablero el 10/11. Con el indice: 376 ms. 41 veces mas rapido.
        create index ix_asiento_cp_por_comprobante on asiento_cp (id_asiento_comprobante_cp);
        create index ix_cpa04_fecha_cont          on cpa04 (fecha_cont);

   7. PERMISOS, medidos desde afuera: sin sesion 401; con sesion 200, 392
      renglones, 529 ms.
      revoke all on function api_subdiario_compras_v4(date,date) from public;
      revoke all on function api_subdiario_compras_v4(date,date) from anon;
      grant execute on function api_subdiario_compras_v4(date,date) to authenticated;

   8. Y EL MAPA MIENTE EN UNA COSA GRANDE, descubierta por esto: dice que
      cpa04.cod_gasto esta LLENO AL 100%. Medido: 18.732 filas, 18.732 no
      nulas, pero 11.144 son TEXTO VACIO. Con dato de verdad hay 7.588, el
      40,5%. `ema.diccionario` cuenta '' como lleno, y Tango esta lleno de
      campos asi. Queda PENDIENTE corregir la medicion de llenado y volver a
      medir los 10.642 campos: no me enganio solo a mi, es lo que lee la IA de
      la Ayuda cuando arma una consulta.
   ========================================================================= */
