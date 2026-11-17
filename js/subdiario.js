/* =====================================================================
   SUBDIARIO DE IVA — COMPRAS Y VENTAS                      05/11/2026
   =====================================================================
   UNA SOLA PANTALLA PARA LOS DOS. Lo que cambia entre compras y ventas
   son las columnas y la funcion de la base; el resto —el mes, el dibujo,
   los totales, los controles, el paginado y el bajar a Excel y PDF— es
   identico. Dos archivos casi iguales se desincronizan en cuanto se toca
   uno: es la misma razon por la que bajar.js no tiene lista de tablas.
   La pantalla sabe cual es por el data-modulo de #app.

   DE DONDE SALE CADA COLUMNA. Del archivo que manda el contador,
   "2026.09 COMPRAS/VENTAS contador asi lo envio.xlsx", que es la forma en
   que lo pide. No se invento ninguna: se copiaron. Medido el 05/11 sobre
   septiembre 2026, renglon por renglon y por huella md5 del conjunto:

     COMPRAS  403 de 403 renglones identicos   md5 9ae7cbcd...5461c
     VENTAS   250 de 250 renglones identicos   md5 77776dde...2b14

   LOS CONTROLES, MEDIDOS Y NO SUPUESTOS. Primero escribi que "los
   nuestros dan cero" sin medirlos. Medidos sobre septiembre 2026:

   · CONTROL IVA no puede fallar, ni en su planilla ni aca. Es
     iva - round(iva/0,21 , 2)*0,21: compara el IVA contra el IVA. Da
     cero por construccion. Se muestra porque es la columna de el, para
     poder poner las dos planillas lado a lado, no porque controle.
   · CONTROL TOTAL FAC, restando el neto DERIVADO, no cerraba en 222 de
     los 403 renglones de compras ($76,98 en valor absoluto, el peor
     $35,60) ni en 152 de 250 de ventas. No es un error de los datos:
     los tres peores de compras son los tres comprobantes EN DOLARES
     (cotizaciones 1.780, 1.770 y 1.508,50). El IVA viene redondeado a
     dos decimales en dolares y al dividirlo por 0,21 y multiplicar por
     la cotizacion, dos centavos de dolar se vuelven $35,60.
     Por eso compras llama a api_subdiario_compras_v2, que resta el
     NETO PROPIO DE TANGO (importe_ne) -una fuente independiente del
     calculo-: 402 de 403 cierran al centavo y uno queda en $0,01.
     Las 20 columnas de datos de la v2 son identicas a las de la v1
     (misma huella md5, d29e22e2...3b50): la v2 cambia SOLO controles.
   · Y EN VENTAS ERA PEOR: control_importe era `0::numeric`, un cero
     escrito a mano, y la tarjeta lo mostraba en verde. Medido contra
     gva12.importe, el total propio de Tango: 152 de 250 renglones NO
     CIERRAN, $75,51, el peor $14,00, y el mes difiere $55,67. SON LOS
     MISMOS 152 QUE MARCA LA COLUMNA DEL CONTADOR: su control estaba
     bien y nuestro cero lo tapaba. La causa, medida: los peores son
     todos comprobantes B con total REDONDO (604.800,00 · 5.575.500,00 ·
     3.730.000,00), donde el precio al consumidor final se fija redondo y
     Tango despeja el neto hacia atras. Ventas llama a la v3, que es la
     v2 con esos dos controles agregados y los datos sin tocar (misma
     huella en las 15 columnas).
   · CONTROL NETO es nuevo y nombra la deriva: neto derivado - neto de
     Tango. Va en gris, no en rojo, porque esta explicada. Es la columna
     que le explica al contador por que la suya no cierra.

   Un control que grita 222 veces por un motivo que no es un error se
   apaga solo; uno que no puede fallar es decoracion. Ninguno de los dos
   controla, y los dos estaban puestos como si controlaran.

   EL MES, NO UN RANGO DE FECHAS. Un subdiario es mensual. Y ademas un
   input type=date en esta automatizacion tiene la trampa del tipeo con
   barras (14/10); el type=month no la tiene.

   COMPRAS VA POR FECHA CONTABLE. Con la fecha de emision, septiembre
   daba 390 comprobantes y el contador tiene 403: adentro hay facturas
   emitidas en julio y agosto que se registraron en septiembre. La
   pantalla lo dice con letras, para que nadie lo tenga que suponer.
   ===================================================================== */

var SD_DEF = {
  SubdiarioCompras: {
    titulo: 'Subdiario de IVA — Compras',
    /* LA v5: EL EXENTO MAL TIPEADO EN TANGO, Y LA IMPUTACION ADENTRO.
                                                                  16/11/2026
       Un comprobante SIN NADA DE IVA perdia su importe entero: las columnas
       de neto salen DERIVADAS del IVA, asi que con IVA cero dan cero, y el
       exento salia de importe_ex, que en estos esta en cero. El renglon no
       sumaba contra su propio total y la plata no aparecia en ninguna
       columna. Lo encontro DISSAN, no yo, y mi propia hoja de Controles lo
       venia gritando: 233 renglones, $895.536,53.

       LA PRUEBA DE QUE VAN A EXENTO LA DA LA PLANILLA DEL CONTADOR, no mi
       criterio: los MISMOS proveedores (SANCOR SALUD, IMATIONTY, LEM MEDICAL,
       BIO-LAP) van en EXENTO cuando Tango los trae bien cargados, y esos
       mismos aparecen en otros meses con la plata en importe_ne y cero IVA.
       Es la misma operacion exenta tipeada en el campo de gravado: 16 en toda
       la historia, $1.442.884,39.

       MEDIDO v5 CONTRA v4, renglon por renglon con huella md5 de las 18
       columnas de datos: octubre 2026 392=392 y oct 2024 297=297, huellas
       IDENTICAS, 0 filas cambiadas fuera de EXENTO. Octubre 2026 recupera
       $895.400,65 y el grito del control del neto baja de $895.536,53 a
       $135,88 -los centavos de los comprobantes en dolares, ya explicados-.
       Septiembre 2026 queda en $76,97, que es el numero exacto escrito el
       05/11. v2, v3 y v4 quedan vivas y sin tocar. */
    fn: 'api_subdiario_compras_v5',
    nota: 'Va por <b>fecha contable</b>, no por fecha de emisión: adentro hay comprobantes ' +
          'emitidos en meses anteriores que se registraron en este. Las órdenes de pago ' +
          '(O/P) no entran, y las notas de crédito <b>restan</b>. El neto se <b>deriva del ' +
          'IVA</b> (IVA ÷ alícuota), que es la forma en que lo pide el contador; en los ' +
          'comprobantes en dólares eso deja centavos de deriva contra el neto propio de ' +
          'Tango, y esa diferencia es la columna <b>CONTROL NETO</b>. ' +
          'Un comprobante <b>sin nada de IVA</b> va entero a <b>EXENTO</b>, aunque Tango lo ' +
          'tenga cargado en el campo de gravado: son operaciones exentas (seguros, mutuales, ' +
          'asociaciones) tipeadas en el campo equivocado, y así las informa el contador. ' +
          'La columna <b>IMPUTACION</b> sale del <b>tipo de gasto</b> cargado en el ' +
          'comprobante; donde Tango no lo tiene, de la <b>cuenta del asiento contable</b>. ' +
          'Si el comprobante todavía no se contabilizó, dice <b>«sin contabilizar»</b>: no es ' +
          'un hueco, es lo que falta hacer en Tango.',
    cols: [
      /* LA IMPUTACION VA PRIMERA — pedido por DISSAN el 16/11, textual:
         "Columna de Imputaciones que iría en la A". Y la columna DE DÓNDE
         sale del subdiario, tambien pedido por DISSAN: "de donde que no salga
         en el subdiario". La funcion la sigue devolviendo -no se borra nada-,
         simplemente no se muestra. */
      { k:'imputacion',   r:'IMPUTACION',        t:'txt'   },
      { k:'fecha',        r:'FECHA',             t:'fecha' },
      { k:'proveedor',    r:'PROVEEDOR',         t:'txt'   },
      { k:'cuit',         r:'CUIT',              t:'cod'   },
      { k:'tipo',         r:'TIPO',              t:'cod'   },
      { k:'numero',       r:'NUMERO',            t:'cod'   },
      { k:'exento',       r:'EXENTO',            t:'num'   },
      { k:'neto_21',      r:'NETO 21%',          t:'num'   },
      { k:'neto_27',      r:'NETO 27%',          t:'num'   },
      { k:'neto_105',     r:'NETO 10,5%',        t:'num'   },
      { k:'iva_21',       r:'IVA 21%',           t:'num'   },
      { k:'iva_27',       r:'IVA 27%',           t:'num'   },
      { k:'iva_105',      r:'IVA 10,5%',         t:'num'   },
      { k:'perc_iva_3',   r:'PERC IVA 3%',       t:'num'   },
      { k:'perc_ib_mza',  r:'PERC IB MZA',       t:'num'   },
      { k:'perc_ib_sl',   r:'PERC IB SAN LUIS',  t:'num'   },
      { k:'imp_debitos',  r:'IMP DEBITOS',       t:'num'   },
      { k:'imp_creditos', r:'IMP CREDITOS',      t:'num'   },
      { k:'sircreb',      r:'SIRCREB',           t:'num'   },
      { k:'otros_imp',    r:'OTROSIMP',          t:'num'   },
      /* `total:true` NO CAMBIA NADA DE LO QUE SE VE: es la DECLARACION de
         cual columna es el total del renglon, para que el control pueda
         exigir que las partes lo den. La escribio DISSAN primero, a mano, en
         una columna agregada en Excel:
           =SUM(Tabla1[[#This Row],[EXENTO]:[OTROSIMP]]) - [IMP_TOTAL]
         Esa formula suya fue la que encontro el exento perdido, no yo. La
         puerta `el archivo bajado` ahora la corre sola.              16/11 */
      { k:'imp_total',    r:'IMP_TOTAL',         t:'num', total:true },
      { k:'control_iva',  r:'CONTROL IVA',       t:'ctrl'  },
      { k:'control_total',r:'CONTROL TOTAL FAC', t:'ctrl',   rojo:true,
        card:'renglones donde el comprobante no cierra contra el <b>total propio de Tango</b>' },
      /* CONTROL NETO CAMBIO DE DEFINICION CON LA v5. Antes comparaba solo el
         neto derivado contra importe_ne, asi que despues del arreglo del
         exento habria seguido gritando $895.400 para siempre, y una puerta
         que grita siempre se apaga. Ahora es LA BASE QUE SE MUESTRA (netos +
         exento) contra LA BASE DE TANGO (importe_ne + importe_ex). Para todo
         comprobante con IVA se reduce EXACTAMENTE a la formula vieja: medido,
         0 renglones cambiados fuera del exento.                       16/11 */
      { k:'control_neto', r:'CONTROL NETO',      t:'deriva', rojo:false,
        card:'renglones donde la <b>base que se muestra</b> (netos + exento) no da la base ' +
             'propia de Tango · es el redondeo del IVA en los comprobantes en dólares, ' +
             'multiplicado por la cotización',
        porque:'NO es plata que falte. El neto no sale de Tango: se DERIVA del IVA ' +
               '(IVA dividido la alicuota), que es como lo arma el contador. Esa division ' +
               'nunca vuelve a dar exactamente el neto que Tango tiene guardado, asi que ' +
               'quedan centavos. Crece en los comprobantes en moneda extranjera (el ' +
               'redondeo del IVA multiplicado por la cotizacion) y en los que tienen una ' +
               'parte del neto NO gravada, como las facturas de servicios con IVA al 27%.' }
    ],
    /* EL DETALLE POR TIPO DE GASTO — pedido por DISSAN el 14/11/2026.
       Es la pestania "detalle de comp. por tipo de gastos" del archivo que
       arma el contador. Lo unico que cambia contra la suya: el tipo de gasto
       va en una columna llamada IMPUTACION y lleva la DESCRIPCION, no la
       sigla. Dicho por el usuario, textual: "VA LA DESCRIPCION, NO UNA
       SIGLA". El codigo (AGU, LIM) no viaja.
       Medido contra "COMPRAS_ARCHIVO_BASE.xlsx", hoja DETALLE COMP x TIPO,
       octubre 2024: 171 de 171 renglones identicos, huella md5 de
       (numero, sin_imp, iva, otros, total) eb7b1f73...c9ee de los dos lados.
       Y SIN_IMP es neto + EXENTO: con el neto solo daban $82.483.413,64
       contra sus $96.832.505,12. */
    extra: {
      titulo: 'Detalle de comprobantes por tipo de gasto',
      fn: 'api_subdiario_compras_gastos_v1',
      nota: 'Son los comprobantes de compra que tienen <b>tipo de gasto</b> cargado en ' +
            'Tango, con el mismo recorte del subdiario: <b>fecha contable</b>. La columna ' +
            '<b>IMPUTACION</b> es la descripción del tipo de gasto, no el código. ' +
            '<b>SIN_IMP</b> es el neto <b>más el exento</b>, y <b>OTROS_IMP</b> es lo que ' +
            'queda del total una vez sacados el neto, el exento y el IVA: percepciones e ' +
            'impuestos internos.',
      cols: [
        { k:'imputacion',   r:'IMPUTACION', t:'txt'   },
        { k:'fecha',        r:'FECHA',      t:'fecha' },
        { k:'tipo',         r:'T_COMP',     t:'cod'   },
        { k:'numero',       r:'N_COMP',     t:'cod'   },
        { k:'n_interno',    r:'N_INTERNO',  t:'cod'   },
        { k:'cod_pro',      r:'COD_PRO',    t:'cod'   },
        { k:'razon_social', r:'RAZ_SOC',    t:'txt'   },
        { k:'sin_imp',      r:'SIN_IMP',    t:'num'   },
        { k:'iva',          r:'IVA',        t:'num'   },
        { k:'otros_imp',    r:'OTROS_IMP',  t:'num'   },
        { k:'tot_gral',     r:'TOT_GRAL',   t:'num', total:true }
      ]
    }
  },
  SubdiarioVentas: {
    titulo: 'Subdiario de IVA — Ventas',
    /* LA v5: EL IMPORTE ES EL TOTAL PROPIO DE TANGO.               16/11/2026
       Hasta la v4 el importe se COMPONIA sumando exento + netos + IVA +
       percepciones. Medido sobre septiembre 2026 contra la planilla que
       DISSAN le manda al contador:
         compuesto por nosotros   756.126.507,99
         gva12.importe (Tango)    756.126.563,66
         el contador              756.126.563,66   <- el de Tango, $0,00
       Y el neto ahora se deriva del IVA YA REDONDEADO, que es la cifra que
       se ve en la columna y de la que deriva el contador.
       Resultado medido: 250 = 250 renglones y la huella md5 de CADA renglon
       (comprobante, exento, neto 21%, IVA 21%, importe) IDENTICA a la suya:
       b533413a6a35b4f9f4aaaf5d05efac8b de los dos lados.
       v2, v3 y v4 quedan vivas y sin tocar. */
    fn: 'api_subdiario_ventas_v5',
    nota: 'Va por <b>fecha de emisión</b>. Los recibos (REC) no entran: son cobranzas. ' +
          'El IVA sale del impuesto que guarda Tango por comprobante, no de multiplicar ' +
          'los renglones. La columna <b>IMPORTE</b> es el <b>total propio de Tango</b>, el ' +
          'mismo que usa el contador. <b>Mayor/Menor</b> y la jurisdicción corregida no ' +
          'vienen de Tango: se cargan por cliente y se declaran. En los comprobantes <b>B</b> ' +
          'el precio al consumidor final se fija redondo y Tango despeja el neto hacia atrás, ' +
          'así que las partes no vuelven a dar ese total redondo: esa diferencia es ' +
          '<b>CONTROL IMPORTE</b>, y el contador la marca igual en su planilla.',
    cols: [
      { k:'fecha',          r:'FECHA',           t:'fecha' },
      { k:'jurisdiccion',   r:'Jurisdicción',    t:'txt'   },
      { k:'mayor_menor',    r:'Mayor/Menor',     t:'txt'   },
      { k:'cliente',        r:'RAZON SOCIAL',    t:'txt'   },
      { k:'cuit',           r:'CUIT',            t:'cod'   },
      { k:'tipo',           r:'TIPO',            t:'cod'   },
      { k:'comprobante',    r:'COMPROBANTE',     t:'cod'   },
      { k:'exento',         r:'EXENTO',          t:'num'   },
      { k:'neto_21',        r:'NETO 21%',        t:'num'   },
      { k:'neto_105',       r:'NETO 10,5%',      t:'num'   },
      { k:'iva_21',         r:'IVA 21%',         t:'num'   },
      { k:'iva_105',        r:'IVA 10,5%',       t:'num'   },
      { k:'perc_iibb_sl',   r:'PERC IIBB SL',    t:'num'   },
      { k:'perc_iibb_mza',  r:'PERC IIBB MZA',   t:'num'   },
      { k:'importe',        r:'IMPORTE',         t:'num', total:true },
      { k:'control_iva',    r:'CONTROL IVA',     t:'ctrl'  },
      { k:'control_importe',r:'CONTROL IMPORTE', t:'deriva', rojo:false,
        card:'renglones donde el total no cierra contra el <b>total propio de Tango</b> · ' +
             'son los comprobantes <b>B</b> con total redondo, y son los mismos que marca ' +
             'la columna del contador',
        porque:'NO es plata que falte. En el comprobante B el precio al consumidor final se ' +
               'fija REDONDO y Tango despeja el neto y el IVA hacia atras, asi que las partes ' +
               'no vuelven a dar ese redondo. El contador marca exactamente los mismos ' +
               'renglones en su planilla.' },
      { k:'control_neto',   r:'CONTROL NETO',    t:'deriva', rojo:false,
        card:'renglones con deriva del neto <b>derivado del IVA</b> contra el gravado de Tango',
        porque:'NO es plata que falte. El neto se DERIVA del IVA (IVA dividido la alicuota), ' +
               'que es como lo arma el contador, y esa division deja centavos contra el ' +
               'gravado que Tango tiene guardado.' }
    ]
  }
};

function sdDef(){
  var app = document.getElementById('app');
  var m = app ? (app.getAttribute('data-modulo') || '') : '';
  return SD_DEF[m] || null;
}

/* $ 1.234,56 — siempre dos decimales, como un subdiario */
function sdPlata(n){
  var v = Number(n || 0);
  var s = Math.abs(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (v < 0 ? '-$ ' : '$ ') + s;
}
function sdFecha(iso){
  var s = String(iso || '');
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
  return s.substring(8,10) + '/' + s.substring(5,7) + '/' + s.substring(0,4);
}
function sdMiles(n){
  return String(Number(n||0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/* EL CERO NO SE PINTA. Una grilla de 22 columnas con "$ 0,00" en casi
   todas no se lee: lo que importa es donde HAY un importe. Va celda
   vacia, que ademas es lo que bajar.js necesita para que la columna siga
   siendo numerica (un "—" como texto la convierte en columna de texto). */
function sdCel(fila, c){
  var v = fila[c.k];
  if (c.t === 'fecha') return '<td class="sd-cod">' + esc(sdFecha(v)) + '</td>';
  if (c.t === 'cod')   return '<td class="sd-cod">' + esc(v == null ? '' : v) + '</td>';
  if (c.t === 'txt')   return '<td>' + esc(v == null ? '' : v) + '</td>';
  var n = Number(v || 0);
  if (c.t === 'ctrl'){
    /* el control: cero esta bien y se ve tranquilo; distinto de cero grita */
    if (Math.abs(n) < 0.005)
      return '<td class="sd-num sd-ok" data-v="0">0,00</td>';
    return '<td class="sd-num sd-mal" data-v="' + n + '">' + esc(sdPlata(n)) + '</td>';
  }
  if (c.t === 'deriva'){
    /* LA DERIVA NO VA EN ROJO. Esta explicada -el redondeo del IVA en dolares-
       y rojo en 222 de 403 renglones ensena a ignorar el color. Va en gris, se
       ve, se suma y se puede bajar. */
    if (Math.abs(n) < 0.005)
      return '<td class="sd-num sd-ok" data-v="0">0,00</td>';
    return '<td class="sd-num sd-ok" data-v="' + n + '">' + esc(sdPlata(n)) + '</td>';
  }
  if (Math.abs(n) < 0.005) return '<td class="sd-num"></td>';
  return '<td class="sd-num" data-v="' + n + '">' + esc(sdPlata(n)) + '</td>';
}

function sdMes(){
  var i = document.getElementById('sdMes');
  var s = i && i.value ? i.value : '';
  if (!/^\d{4}-\d{2}$/.test(s)) return null;
  var a = Number(s.substring(0,4)), m = Number(s.substring(5,7));
  var desde = s + '-01';
  var ult = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return { desde: desde, hasta: s + '-' + String(ult).padStart(2,'0'),
           rotulo: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
                    'septiembre','octubre','noviembre','diciembre'][m-1] + ' ' + a };
}

/* UN BLOQUE = UNA GRILLA CON SUS TARJETAS.                      14/11/2026
   Esto era el cuerpo de sdPintar. Se saco afuera para que la pantalla de
   compras pueda dibujar DOS grillas -el subdiario y el detalle por tipo de
   gasto- con el mismo codigo. Dos funciones casi iguales se desincronizan en
   cuanto se toca una: es la misma razon por la que hay una sola pantalla para
   compras y ventas, y la que dejo el arreglo de `listas` del 30/10 afuera. */
function sdBloque(def, filas, ms, mes){
  var h = [];
  /* UNA TARJETA POR COLUMNA QUE DECLARA `card`, Y NINGUNA MAS. Antes habia dos
     tarjetas fijas: una del CONTROL IVA, que no puede fallar, y otra que leia
     control_importe, que en ventas era un cero escrito a mano. Las dos daban
     verde sin medir nada. Ahora la tarjeta sale de la columna, con su cuenta,
     su suma en valor absoluto y su peor renglon, y solo se pone en rojo la que
     declara rojo:true -las demas son derivas ya explicadas con su motivo. */
  var tot = {}, ctrl = [];
  for (var i = 0; i < def.cols.length; i++){
    var c = def.cols[i];
    if (c.t === 'num' || c.t === 'ctrl' || c.t === 'deriva') tot[c.k] = 0;
    if (c.card) ctrl.push({ k:c.k, card:c.card, rojo:!!c.rojo, n:0, abs:0, peor:0 });
  }
  for (var f = 0; f < filas.length; f++){
    for (var j = 0; j < def.cols.length; j++){
      var cc = def.cols[j];
      if (tot.hasOwnProperty(cc.k)) tot[cc.k] += Number(filas[f][cc.k] || 0);
    }
    for (var g = 0; g < ctrl.length; g++){
      var a = Math.abs(Number(filas[f][ctrl[g].k] || 0));
      if (a >= 0.005){ ctrl[g].n++; ctrl[g].abs += a; if (a > ctrl[g].peor) ctrl[g].peor = a; }
    }
  }

  h.push('<div class="sd-sec">' + esc(def.titulo) + ' · ' + esc(mes.rotulo) + '</div>');
  h.push('<div class="sd-sec-pie">' + sdMiles(filas.length) + ' renglones · leídos en '
       + sdMiles(ms) + ' ms contra la base</div>');
  h.push('<div class="sd-nota">' + def.nota + '</div>');

  /* LOS CONTROLES, ARRIBA Y CON SU NUMERO, no en un pie que nadie lee. Cada
     uno dice CONTRA QUE midio y cuanto dio: la cuenta de renglones, la suma en
     valor absoluto y el peor renglon. Un control sin esos tres numeros no se
     puede discutir con el contador. */
  h.push('<div class="sd-tarjetas">');
  for (var q = 0; q < ctrl.length; q++){
    var x = ctrl[q];
    h.push('<div class="sd-tj ' + ((x.n && x.rojo) ? 'sd-tj-mal' : 'sd-tj-ok') + '"><b>'
         + sdMiles(x.n) + '</b><span>' + x.card
         + (x.n ? ' · <b>' + esc(sdPlata(x.abs)) + '</b> en total, el peor '
                  + esc(sdPlata(x.peor)) : '')
         + '</span></div>');
  }
  h.push('</div>');

  h.push('<div class="sd-caja"><table class="sd-tb"><thead><tr>');
  /* LAS COLUMNAS DE CONTROL NO VAN AL ARCHIVO.                10/11/2026
     El usuario lo pidio textual: el Excel que baja tiene que tener las
     columnas EXACTAMENTE como el del contador. Las de datos ya lo estan -la
     v1 cerro 403 de 403 contra "2026.09 COMPRAS contador asi lo envio.xlsx",
     con huella md5 del conjunto ordenado-; las tres de CONTROL las agregue yo
     y en su planilla no existen. Se ven en pantalla, que es donde sirven para
     discutir con el, y `data-no-baja` las deja afuera del Excel y del PDF. */
  /* `data-clave`: fecha, tipo y numero se REPITEN en la hoja de controles,
     para poder ir a buscar el renglon en la hoja 1. Una hoja de control con
     puros numeros y sin el comprobante al lado no sirve para nada. */
  var CLAVE = { fecha:1, tipo:1, numero:1, comprobante:1 };
  for (var k = 0; k < def.cols.length; k++)
    h.push('<th'
         + ((def.cols[k].t === 'ctrl' || def.cols[k].t === 'deriva') ? ' data-no-baja' : '')
         + (CLAVE[def.cols[k].k] ? ' data-clave' : '')
         /* `data-plata` y `data-total`: la pantalla DECLARA que columnas son
            plata y cual es el total del renglon, para que el control pueda
            sumar las partes sin una lista de nombres escrita al lado -que es
            la cagada del 14/10 y del 14/11-. Si manana se agrega una columna
            de plata, entra sola a la suma.                          16/11 */
         + (def.cols[k].t === 'num' ? ' data-plata' : '')
         + (def.cols[k].total ? ' data-total' : '')
         /* `data-deriva`: la pantalla DECLARA que ese control no mide un
            defecto sino una deriva conocida, y POR QUE. Sin esto, el Excel
            metia los tres controles bajo el rotulo «Renglones que NO
            cierran», y para 224 de 231 renglones eso era FALSO: cierran, con
            dos centavos de redondeo. Mezclar una alarma real con una deriva
            explicada es como se apaga una alarma.               17/11/2026 */
         + ((def.cols[k].t === 'ctrl' || def.cols[k].t === 'deriva') && def.cols[k].rojo === false
              ? ' data-deriva="' + esc(def.cols[k].porque || 'deriva conocida, no es plata que falte') + '"'
              : '')
         + '>' + esc(def.cols[k].r) + '</th>');
  h.push('</tr></thead><tbody>');
  for (var r = 0; r < filas.length; r++){
    h.push('<tr>');
    for (var q = 0; q < def.cols.length; q++) h.push(sdCel(filas[r], def.cols[q]));
    h.push('</tr>');
  }
  /* LA FILA DE TOTAL VA EN <tfoot>, NO EN <tbody>.           05/11/2026
     Estaba adentro del tbody y bajar.js lee `tbody tr`, asi que el Excel y el
     PDF se llevaban el TOTAL como si fuera un comprobante mas: un renglon con
     la palabra TOTAL en la columna FECHA y vacias las de CUIT y NUMERO. Medido
     apretando el boton: leia 213 renglones donde la pantalla decia 212.
     Un subdiario que el contador importa no puede traer un renglon que no es
     un comprobante. En tfoot queda visible en todas las paginas igual -que era
     el motivo de tenerlo en tbody- y el pegado al pie sigue andando. */
  h.push('</tbody><tfoot>');
  h.push('<tr class="tot">');
  for (var z = 0; z < def.cols.length; z++){
    var cz = def.cols[z];
    if (z === 0) { h.push('<td><b>TOTAL</b></td>'); continue; }
    if (!tot.hasOwnProperty(cz.k)) { h.push('<td></td>'); continue; }
    var tv = tot[cz.k];
    if (Math.abs(tv) < 0.005) h.push('<td class="sd-num"><b>0,00</b></td>');
    else h.push('<td class="sd-num" data-v="' + tv + '"><b>' + esc(sdPlata(tv)) + '</b></td>');
  }
  h.push('</tr>');
  h.push('</tfoot></table></div>');
  return h.join('');
}

function sdPintar(def, filas, ms, mes, extra){
  var h = sdBloque(def, filas, ms, mes);
  /* LA SEGUNDA GRILLA NO PUEDE ROMPER LA PRIMERA. Si el detalle por tipo de
     gasto no vino -la funcion fallo, o el mes no tiene gastos cargados- el
     subdiario se dibuja igual y se dice por que falta. Una grilla agregada
     que se lleva puesta la pantalla que ya andaba es peor que no agregarla. */
  if (def.extra){
    if (extra && extra.filas && extra.filas.length)
      h += sdBloque(def.extra, extra.filas, extra.ms, mes);
    else
      h += '<div class="sd-aviso"><b>' + esc(def.extra.titulo) + ':</b> '
         + (extra && extra.error
             ? esc(extra.error)
             : 'no hay comprobantes con tipo de gasto cargado en ' + esc(mes.rotulo) + '.')
         + '</div>';
  }

  /* ULTIMA LINEA: la que ESCRIBE. Una pintar() que corre y no escribe no
     da error y parece que anda (paso el 21/10 con Cartera). */
  document.getElementById('cuerpo').innerHTML = h;
}

function sdCargando(si){
  var b = document.getElementById('sdBtn');
  if (b){ b.disabled = !!si; b.textContent = si ? 'Buscando…' : 'Ver el subdiario'; }
}

async function calcular(){
  var def = sdDef();
  var cuerpo = document.getElementById('cuerpo');
  if (!def){ cuerpo.innerHTML = '<div class="sd-aviso">Esta pantalla no declara qué subdiario es.</div>'; return; }
  var mes = sdMes();
  if (!mes){ cuerpo.innerHTML = '<div class="sd-aviso">Elegí el mes.</div>'; return; }

  sdCargando(true);
  cuerpo.innerHTML = '<div class="sd-aviso">Buscando ' + esc(mes.rotulo) + '…</div>';
  try {
    var r = await rpcTodo(def.fn, { p_desde: mes.desde, p_hasta: mes.hasta });
    var filas = r.data || [];
    if (!filas.length){
      cuerpo.innerHTML = '<div class="sd-aviso"><b>No hay comprobantes en ' + esc(mes.rotulo)
        + '.</b> No es un error: ese mes no tiene movimientos cargados.</div>';
      return;
    }
    /* el detalle por tipo de gasto, si esta pantalla lo declara. Va DESPUES
       de tener el subdiario en la mano y con su propio try: si falla, la
       pantalla principal se dibuja igual y el aviso lo dice. */
    var extra = null;
    if (def.extra){
      try {
        var re = await rpcTodo(def.extra.fn, { p_desde: mes.desde, p_hasta: mes.hasta });
        extra = { filas: re.data || [], ms: re.ms };
      } catch (ee){
        extra = { filas: [], error: 'no se pudo armar: ' + (ee.message || ee) };
      }
    }
    sdPintar(def, filas, r.ms, mes, extra);
  } catch (e){
    cuerpo.innerHTML = '<div class="sd-aviso"><b>No se pudo armar el subdiario.</b> '
      + esc(e.message || e) + '</div>';
  } finally {
    sdCargando(false);
  }
}

(function(){
  function arrancar(){
    var def = sdDef();
    var t = document.getElementById('tituloModulo');
    if (t && def) t.textContent = def.titulo;
    var i = document.getElementById('sdMes');
    if (i && !i.value){
      /* el mes ANTERIOR completo: el corriente casi nunca esta cerrado */
      var d = new Date();
      d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1);
      i.value = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2,'0');
    }
    var b = document.getElementById('sdBtn');
    if (b) b.addEventListener('click', calcular);
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
