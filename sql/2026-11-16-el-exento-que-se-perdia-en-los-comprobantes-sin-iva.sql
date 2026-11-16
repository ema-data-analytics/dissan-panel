/* =====================================================================
   EL EXENTO QUE SE PERDIA EN LOS COMPROBANTES SIN IVA      16/11/2026
   api_subdiario_compras_v5
   =====================================================================

   LO ENCONTRO DISSAN, NO YO, Y MI PROPIO ARCHIVO LO VENIA GRITANDO.
   El Excel que les mandamos de octubre 2026 traia su hoja de Controles
   diciendo «CONTROL NETO: 233 renglones, $ 895.536,53 en valor absoluto»,
   y la entregue igual sin abrirla. De esos $895.536,53, $895.400,64 son
   los nueve renglones de NACION SEGUROS.

   QUE PASABA
   ----------
   Las columnas de neto salen DERIVADAS del IVA — round(iva/alicuota, 2) —
   porque asi las arma el contador y asi cerro la v1 contra su planilla.
   Un comprobante SIN UNA SOLA ALICUOTA de IVA da cero en las tres, y la
   columna `exento` salia de `importe_ex`, que en estos esta en cero.
   La plata no quedaba en NINGUNA columna.

     NACION SEGUROS  FAC A0010100057005  29/10/2026
       IMP_TOTAL  297.897,84
       OTROSIMP     1.776,72   <- la unica columna con algo
       EXENTO           0,00
       NETO 21%         0,00
       el renglon pierde 296.121,12

   No era un rotulo equivocado: era plata que desaparecia del archivo que
   va al contador.

   LA PRUEBA DE QUE VAN A EXENTO — Y NO ES MI CRITERIO
   ---------------------------------------------------
   Esta en la planilla del contador que DISSAN nos paso el 14/11
   ("2026.09 COMPRAS contador asi lo envio.xlsx"). Los MISMOS proveedores
   van en EXENTO cuando Tango los trae bien cargados:

     SANCOR SALUD  C0010800024035  exento     2.178,00   neto 0  iva 0
     BIO-LAP       A0000300091799  exento 14.371.877,12  neto 0  iva 0
     LEM MEDICAL   A0000400005189  exento  2.402.999,94  neto 0  iva 0
     IMATIONTY     A0000300014662  exento  1.547.686,65  neto 0  iva 0

   y esos mismos proveedores, en otros meses, aparecen con la plata en
   `importe_ne` y cero IVA:

     SANCOR SALUD  C0011200116505 (may-24)  neto    40.283,29
     IMATIONTY     A0000300010122 (nov-24)  neto   376.812,89
     NACION SEG.   A0001000090041 (sep-26)  neto     4.882,56

   Es la misma operacion exenta, tipeada en el campo de gravado en Tango.
   Son 16 en toda la historia por $1.442.884,39, 7 proveedores: seguros de
   vida, mutual medica, asociaciones y fundaciones — operaciones exentas de
   IVA por naturaleza. En 13 de las 16, `importe_to` = `importe_ne`: no hay
   un solo peso de impuesto en el comprobante.

   POR QUE SEPTIEMBRE ME CERRO 403 DE 403 IGUAL
   --------------------------------------------
   El comprobante de NACION SEGUROS de septiembre se cargo en Tango el
   13/11/2026, DESPUES de que el contador armara su archivo. No estaba en su
   planilla. Mi comparacion no acerto: no lo vio.
   Y la huella md5 de la que me colgaba («403 de 403, huella del conjunto
   ordenado») en la v2 era la v2 CONTRA LA v1 — mi funcion contra mi propia
   funcion.

   LA CONDICION NO LLEVA LISTA DE ALICUOTAS
   ----------------------------------------
   Medido: en toda la base existen solo tres alicuotas de IVA (21, 27 y
   10,5) y una percepcion (3). Aun asi la condicion se escribe «todo el IVA
   que no es percepcion suma cero», no «i21=0 y i27=0 y i105=0»: una
   alicuota nueva queda contemplada sola. Es la regla del 14/10
   (CALIDAD_FIRME) y del 14/11 (las tres listas escritas a mano).

   control_neto PASA A SER HONESTO
   -------------------------------
   Antes: neto derivado - importe_ne. Despues del arreglo habria seguido
   gritando -296.121,12 para siempre, y una puerta que grita siempre se
   apaga. Ahora es LA BASE QUE SE MUESTRA (netos + exento) contra LA BASE DE
   TANGO (importe_ne + importe_ex). Para todo comprobante con IVA se reduce
   EXACTAMENTE a la formula vieja — medido: 0 renglones cambiados fuera de
   la columna EXENTO.
   control_total NO SE TOCA: ya restaba importe_ne + importe_ex, y por eso
   daba 0 mientras la pantalla estaba rota. Las dos juntas si cubren.

   MEDIDO, v5 CONTRA v4, RENGLON POR RENGLON
   -----------------------------------------
   Huella md5 de las 18 columnas de datos (fecha, numero, cuit, los tres
   netos, los tres IVA, las percepciones, los impuestos, el total y la
   imputacion):

     mes              renglones   huella        EXENTO        grito del control
     sep 2026         404 = 404   IDENTICA      +4.882,56     4.959,53 -> 76,97
     oct 2024         297 = 297   IDENTICA      sin cambio    19,47 -> 19,47
     oct 2026         392 = 392   IDENTICA      +895.400,65   895.536,53 -> 135,88
     todo 2026      3.312 = 3.312 IDENTICA      +900.283,21   901.163,71 -> 880,50

   Los $76,97 de septiembre son EXACTAMENTE el numero que quedo escrito el
   05/11 como deriva explicada de los comprobantes en dolares. El arreglo
   recupera la plata perdida y deja la deriva vieja intacta, ni un peso mas.
   control_total: $0,00 en los 392 renglones de octubre 2026.

   2) EL NETO SE DERIVA DE LA CIFRA QUE SE VE, NO DE UNA QUE NO SE VE
   -----------------------------------------------------------------
   Comparando renglon por renglon contra la planilla del contador de
   septiembre 2026 —la comparacion que yo decia haber hecho y nunca habia
   hecho— de 403 comprobantes, 402 daban identicos y UNO difería por $0,02:

     A0000900137635 · BECTON DICKINSON · EN DOLARES · cotizacion 1.508,50
       IVA en dolares                 1.169,75
       IVA en pesos sin redondear     1.764.567,875
       la columna IVA 21% MUESTRA     1.764.567,88   <- lo que se ve
       derivado del crudo             8.402.704,17   <- lo que hacia yo
       derivado de la columna         8.402.704,19   <- lo que hace el contador

   El contador deriva el neto DE LA CIFRA QUE ESTA EN LA COLUMNA. Tiene
   razon: un archivo que se pone al lado del suyo no puede salir de un numero
   que no figura en ninguna parte. Ahora n21/n27/n105 se derivan del IVA YA
   REDONDEADO a dos decimales. Solo cambia en comprobantes en moneda
   extranjera: en los demas, round() sobre dos decimales no hace nada.

   MEDIDO, EL ALCANCE DEL REDONDEO:
     octubre 2026      2 renglones, el total de netos no se mueve un centavo
     octubre 2024      2 renglones, idem
     todo 2026        24 renglones
     toda la historia 52 renglones, $0,18 sobre $11.231.145.953

   Y LA VALIDACION QUE IMPORTA, contra la planilla del contador de
   septiembre 2026, sacando el unico comprobante que el no podia tener
   (A0001000090041, cargado en Tango el 13/11, despues de su archivo):

     403 renglones = 403 renglones
     huella md5 de (numero, exento, neto_21, iva_21, imp_total) de CADA
     renglon, calculada de los dos lados:
       424dd1e1a091f38cb0765bb622fc13d6  <- la planilla del contador
       424dd1e1a091f38cb0765bb622fc13d6  <- api_subdiario_compras_v5
     IDENTICAS.

   VENTAS NO TIENE ESTE DEFECTO, MEDIDO
   ------------------------------------
   gva12 con importe_iv = 0 e importe_gr <> 0: 4 comprobantes en cuatro
   anios, $0,04 en total. Y el subdiario de ventas de octubre 2026: peor
   control del neto $0,05, peor control del importe $35,26 — la deriva de
   los comprobantes B con total redondo, ya explicada.

   LO QUE QUEDA DECLARADO Y NO SE TOCA HOY
   ---------------------------------------
   Midiendo donde poner el corte de la puerta nueva aparecieron 16 renglones
   (2022 a 2025) donde las partes no dan el total por mas del 1%. El peor es
   MEDIX A0000400001193 del 30/04/2023: el neto derivado da EXACTAMENTE la
   mitad del neto de Tango, $19.447.005,91 de hueco. Es la trampa de moneda
   de los proveedores en dolares, ya anotada el 05/11 como pendiente. En
   2026 el unico renglon arriba del 1% es de UN CENTAVO (COLOPLAST
   A0000300197537, $0,01 sobre $0,36). No esta en los meses que usa DISSAN
   y no se toca en este cambio: se declara.

   SE CONSTRUYE AL LADO: v2, v3 y v4 quedan vivas y sin tocar, que es lo que
   permite medir las dos caras.

   EL CUERPO DE LA FUNCION ESTA EN LA BASE. Para leerlo:
     select pg_get_functiondef(oid) from pg_proc
      where proname = 'api_subdiario_compras_v5';

   PERMISOS — LOS DOS REVOKE, Y DESPUES SE MIDE
   --------------------------------------------
   Supabase le da EXECUTE a `anon` de fabrica en toda funcion nueva, y viene
   por PUBLIC *y* directo (10/11, 12/11, 14/11, 16/11 — cuatro veces que esto
   mordio):

     revoke execute on function api_subdiario_compras_v5(date,date) from public;
     revoke execute on function api_subdiario_compras_v5(date,date) from anon;
     grant  execute on function api_subdiario_compras_v5(date,date) to authenticated;

   Medido despues de hacerlo:
     has_function_privilege('anon', ...)          -> false
     has_function_privilege('authenticated', ...) -> true

   LA PANTALLA
   -----------
   js/subdiario.js -> fn: 'api_subdiario_compras_v5', ?v=8 en los dos HTML.
   Y las dos cosas que pidio DISSAN, textual:
     "Columna de Imputaciones que iria en la A"  -> IMPUTACION primera
     "de donde que no salga en el subdiario"     -> DE DONDE fuera de la
       grilla. La funcion la sigue devolviendo (no se borra nada); no se
       muestra.

   LA PUERTA QUE FALTABA
   ---------------------
   `el archivo bajado` ahora corre, sobre cada renglon de cada Excel que
   baja, la formula que DISSAN escribio A MANO en la columna que agregaron:

     =SUM(Tabla1[[#This Row],[EXENTO]:[OTROSIMP]]) - [IMP_TOTAL]

   Las columnas de plata y la del total las DECLARA la pantalla con
   `data-plata` y `data-total`, como ya declaraba `data-no-baja`: ninguna
   lista de nombres. Corta con hueco > $1 **y** > 1% del total del renglon —
   el peso saca los centavos de redondeo, el porcentaje lo hace libre de
   escala. Las dos caras medidas sobre octubre 2026: la v4 rota corta 9
   renglones (el peor, $296.121,12, el 99,4% del comprobante); la v5 sana
   corta 0, y el peor hueco que queda es $31,00.
   ===================================================================== */
