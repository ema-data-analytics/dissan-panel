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
    fn: 'api_subdiario_compras_v3',
    nota: 'Va por <b>fecha contable</b>, no por fecha de emisión: adentro hay comprobantes ' +
          'emitidos en meses anteriores que se registraron en este. Las órdenes de pago ' +
          '(O/P) no entran, y las notas de crédito <b>restan</b>. El neto se <b>deriva del ' +
          'IVA</b> (IVA ÷ alícuota), que es la forma en que lo pide el contador; en los ' +
          'comprobantes en dólares eso deja centavos de deriva contra el neto propio de ' +
          'Tango, y esa diferencia es la columna <b>CONTROL NETO</b>.',
    cols: [
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
      { k:'imp_total',    r:'IMP_TOTAL',         t:'num'   },
      { k:'control_iva',  r:'CONTROL IVA',       t:'ctrl'  },
      { k:'control_total',r:'CONTROL TOTAL FAC', t:'ctrl',   rojo:true,
        card:'renglones donde el comprobante no cierra contra el <b>total propio de Tango</b>' },
      { k:'control_neto', r:'CONTROL NETO',      t:'deriva', rojo:false,
        card:'renglones con deriva del neto <b>derivado del IVA</b> contra el neto de Tango · ' +
             'es el redondeo del IVA en los comprobantes en dólares, multiplicado por la cotización' }
    ]
  },
  SubdiarioVentas: {
    titulo: 'Subdiario de IVA — Ventas',
    fn: 'api_subdiario_ventas_v4',
    nota: 'Va por <b>fecha de emisión</b>. Los recibos (REC) no entran: son cobranzas. ' +
          'El IVA sale del impuesto que guarda Tango por comprobante, no de multiplicar ' +
          'los renglones. <b>Mayor/Menor</b> y la jurisdicción corregida no vienen de Tango: ' +
          'se cargan por cliente y se declaran. En los comprobantes <b>B</b> el precio al ' +
          'consumidor final se fija redondo y Tango despeja el neto hacia atrás, así que las ' +
          'partes no vuelven a dar ese total redondo: esa diferencia es <b>CONTROL IMPORTE</b>.',
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
      { k:'importe',        r:'IMPORTE',         t:'num'   },
      { k:'control_iva',    r:'CONTROL IVA',     t:'ctrl'  },
      { k:'control_importe',r:'CONTROL IMPORTE', t:'deriva', rojo:false,
        card:'renglones donde el total no cierra contra el <b>total propio de Tango</b> · ' +
             'son los comprobantes <b>B</b> con total redondo, y son los mismos que marca ' +
             'la columna del contador' },
      { k:'control_neto',   r:'CONTROL NETO',    t:'deriva', rojo:false,
        card:'renglones con deriva del neto <b>derivado del IVA</b> contra el gravado de Tango' }
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

function sdPintar(def, filas, ms, mes){
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
  for (var k = 0; k < def.cols.length; k++)
    h.push('<th' + ((def.cols[k].t === 'ctrl' || def.cols[k].t === 'deriva') ? ' data-no-baja' : '')
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

  /* ULTIMA LINEA: la que ESCRIBE. Una pintar() que corre y no escribe no
     da error y parece que anda (paso el 21/10 con Cartera). */
  document.getElementById('cuerpo').innerHTML = h.join('');
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
    sdPintar(def, filas, r.ms, mes);
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
