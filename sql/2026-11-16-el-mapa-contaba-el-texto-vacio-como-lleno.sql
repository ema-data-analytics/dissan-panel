/* EL MAPA CONTABA EL TEXTO VACIO COMO LLENO                      16/11/2026
   =========================================================================
   ESTE ES EL DEFECTO MAS DE FONDO DEL PROYECTO, PORQUE TODO LO DEMAS LEE
   ESTE MAPA.

   LO QUE PASABA. ema.diccionario contaba `''` como un valor cargado. Tango
   viene de un sistema que no usa nulos, asi que esta por toda la base.
   Medido sobre las 10.642 columnas:
     - 8.792 decian "100% lleno"
     - de esas, 1.446 NO lo estaban
     - y 941 estaban COMPLETAMENTE VACIAS
     - 1.556 columnas tenian `llenos` MAYOR que `filas`: imposible, o sea que
       ni siquiera se habian medido en el mismo momento
   Ejemplos de tablas que se usan todos los dias:
     cpa04.cod_gasto            decia 100%  y es 40,51% (11.144 de 18.732 son '')
     gva12.descripcion_factura  decia 100%  y es 0% en las 23.234 filas
     gva12.origen               decia 100%  y es 0%
     cpa04.leyenda_1/2/3        decia 100%  y es 0%

   QUE ROMPIA, MEDIDO. Trece funciones leen ese numero, y las trece son del
   circuito de la Ayuda. La peor es api_ia_mapa_buscar, que ORDENA con el cual
   columna mostrarle a la IA: una columna vacia podia quedar primera y la IA
   armar la consulta con ella. Y ema.analizar* escribio los 7.293 significados
   leyendo el mapa falso.

   QUE NO ROMPIA, Y TAMBIEN SE MIDIO:
     - NINGUNA cifra publicada sale de ahi. Facturacion, margen, IVA, los dos
       subdiarios y la cartera leen las tablas de Tango directo. Las 88
       identidades siguen cerrando: facturacion $215,29 sobre $16.614 millones,
       IVA de ventas al centavo mes a mes.
     - Los significados estan bien: revisados los 10.642, NINGUNO afirma
       "siempre lleno" sobre un campo que no lo esta. El analizador miro los
       ejemplos en vez del porcentaje y escribio la verdad ("casi vacio, 0,03%
       de las filas").
   Lo que NO se puede medir hacia atras: cuantas veces la Ayuda contesto peor
   porque el mapa la mando a una columna vacia.

   COMO SE ARREGLO
     ema.llenado_remedido        la medicion nueva, columna por columna
     ema.remedir_llenado(seg)    mide por tandas con presupuesto de tiempo
     ema.remedir_llenado_todo(s) borra, vuelve a medir TODO y corrige el mapa
   `con_dato` = count(nullif(btrim(col::text),'')) : no nulo Y no vacio.
   UNA SOLA LECTURA POR TABLA, no una por columna: un solo select con un count
   por columna. 627 tablas y 10.642 columnas en MENOS DE 30 SEGUNDOS. Columna
   por columna serian 10.642 lecturas de la tabla entera.

   EL NOMBRE PROPIO NO ES CAPRICHO: remedir_llenado_todo no es un argumento
   mas de remedir_llenado. Agregarle un parametro con DEFAULT a una funcion
   que ya existe la vuelve AMBIGUA y rompe toda llamada corta — paso el 16/11
   a la maniana con cotiza.armar_v2 y dejo Listas caida.

   RESULTADO
     columnas imposibles (llenos > filas):  1.556 -> 0
     columnas que dicen 100%:               8.792 -> 7.346
     columnas declaradas vacias:            1.262 -> 2.313
     segunda pasada completa: 0 corregidas, o sea que el mapa YA coincide.
   El mapa viejo entero quedo en ema.diccionario_antes_del_16_11.

   Y DOS IDENTIDADES para que no se vuelva a pudrir en silencio:
     mapa_llenado_coincide         el mapa contra una remedicion fresca = 0
     mapa_sin_llenados_imposibles  campos con llenos > filas = 0
   Las dos en VERDE.

   LA REMEDICION CORRE ADENTRO DE api_refrescar_margen_real Y ANTES DE
   ema.identidad_correr(), por lo mismo que el subdiario el 15/11: si corriera
   despues, mapa_llenado_coincide compararia el diccionario contra una foto
   vieja de llenado_remedido y daria un VERDE FALSO, que es peor que un rojo.
   ========================================================================= */
