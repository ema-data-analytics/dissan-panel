/* =====================================================================
   VENTAS: EL IMPORTE ES EL TOTAL PROPIO DE TANGO           16/11/2026
   api_subdiario_ventas_v5
   =====================================================================

   DICHO POR EL USUARIO, TEXTUAL:
     "trae de lo que manda tango, como que sumando partes no da lo mismo??
      tiene que quedar todo bien, exactamente bien, sin un centavo ni de mas
      ni de menos"
     "si esto no tiene grises, es blanco o negro"

   Tiene razon y la prueba es mecanica: o la huella da igual a la del
   contador o no da.

   1) LA COLUMNA IMPORTE TRAE gva12.importe, NO UNA SUMA NUESTRA
   ------------------------------------------------------------
   Hasta la v4 el importe se COMPONIA sumando exento + netos + IVA +
   percepciones. Medido sobre septiembre 2026 contra
   "2026.09 VENTAS contador asi lo envio.xlsx", hoja `ventas base`:

     compuesto por nosotros   756.126.507,99
     gva12.importe (Tango)    756.126.563,66
     el contador              756.126.563,66   <- el de Tango, diferencia $0,00

   Son 152 renglones, $75,51, el peor $14,00, y la causa esta medida desde
   el 05/11: en el comprobante B el precio al consumidor final se fija
   REDONDO y Tango despeja el neto y el IVA hacia atras, asi que las partes
   no vuelven a dar ese redondo. No falta nada -impuestos internos, flete y
   bonificacion en cero, y el IVA y el exento coinciden al centavo-.

   El archivo que se pone al lado del del contador tiene que traer la cifra
   que EL trae. La diferencia no desaparece: se MUESTRA en control_importe,
   que ahora compara las partes contra el total de Tango dentro del mismo
   renglon, que es donde se puede ver.

   2) EL NETO SE DERIVA DE LA CIFRA QUE SE VE
   ------------------------------------------
   Mismo arreglo que compras v5 y misma causa medida: la columna IVA 21%
   muestra el IVA redondeado a dos decimales, y el contador deriva de ESE
   numero. `api_subdiario_ventas_v2` tenia `round(iva_21/0.21, 2)` sobre el
   valor sin redondear.

   LA PRUEBA, SIN GRISES
   ---------------------
   Huella md5 de (comprobante, exento, neto_21, iva_21, importe) de CADA
   renglon, calculada de los dos lados, septiembre 2026:

     250 renglones = 250 renglones
     b533413a6a35b4f9f4aaaf5d05efac8b  <- la planilla del contador
     b533413a6a35b4f9f4aaaf5d05efac8b  <- api_subdiario_ventas_v5
     IDENTICAS.

   Y LOS $0,03 DEL TOTAL DE NETO 21%, EXPLICADOS Y MEDIDOS
   -------------------------------------------------------
   Su fila de Total dice 374.946.636,19 y la pantalla 374.946.636,16.
   No es una diferencia en ningun renglon: su columna guarda los decimales
   escondidos (34847.2380952381 y asi) y su Total los suma.
     sumando SUS valores SIN redondear : 374.946.636,19
     sumando SUS valores REDONDEADOS   : 374.946.636,16  <- lo que muestra
   Tres centavos de decimales invisibles dentro de su propio archivo.

   LA PUERTA NO GRITA POR LOS COMPROBANTES B, MEDIDO
   -------------------------------------------------
   La puerta nueva (`las partes del renglon dan su total`) corta con hueco
   > $1 **y** > 1% del renglon. En ventas, sobre los 2.952 renglones de
   2026: corta 0, y el peor desvio es 0,0062% del comprobante -tres ordenes
   de magnitud por debajo del corte-.

   EL JUGUETE AHORA TIENE EL CASO. Hasta hoy componia el importe sumando las
   partes, asi que SIEMPRE cerraba y el control nunca veia el unico caso en
   que no cierra. Ahora planta el desvio del comprobante B.

   SE CONSTRUYE AL LADO: v2, v3 y v4 quedan vivas y sin tocar.

   EL CUERPO DE LA FUNCION ESTA EN LA BASE:
     select pg_get_functiondef(oid) from pg_proc
      where proname = 'api_subdiario_ventas_v5';

   PERMISOS — LOS DOS REVOKE, Y DESPUES SE MIDE:
     revoke execute on function api_subdiario_ventas_v5(date,date) from public;
     revoke execute on function api_subdiario_ventas_v5(date,date) from anon;
     grant  execute on function api_subdiario_ventas_v5(date,date) to authenticated;
   Medido: anon -> false, authenticated -> true.
   ===================================================================== */
