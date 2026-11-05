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

   LAS COLUMNAS DE CONTROL SON DE EL, Y NO LE DAN CERO. En su planilla,
   CONTROL IMPORTE no cierra en 152 de 250 renglones de ventas (suma
   55,64, el peor $14,00) y CONTROL TOTAL FAC no cierra en 222 de 403 de
   compras (suma 4,37, el peor $35,60). El IVA si le da bien en los dos.
   Las nuestras dan cero, y por eso se muestran: un control que siempre
   da cero parece decorativo hasta el dia que deja de darlo.

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
    fn: 'api_subdiario_compras',
    nota: 'Va por <b>fecha contable</b>, no por fecha de emisión: adentro hay comprobantes ' +
          'emitidos en meses anteriores que se registraron en este. Las órdenes de pago ' +
          '(O/P) no entran, y las notas de crédito <b>restan</b>.',
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
      { k:'control_total',r:'CONTROL TOTAL FAC', t:'ctrl'  }
    ]
  },
  SubdiarioVentas: {
    titulo: 'Subdiario de IVA — Ventas',
    fn: 'api_subdiario_ventas_v2',
    nota: 'Va por <b>fecha de emisión</b>. Los recibos (REC) no entran: son cobranzas. ' +
          'El IVA sale del impuesto que guarda Tango por comprobante, no de multiplicar ' +
          'los renglones. <b>Mayor/Menor</b> y la jurisdicción corregida no vienen de Tango: ' +
          'se cargan por cliente y se declaran.',
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
      { k:'control_importe',r:'CONTROL IMPORTE', t:'ctrl'  }
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
  var tot = {}, malIva = 0, malTot = 0;
  for (var i = 0; i < def.cols.length; i++){
    var c = def.cols[i];
    if (c.t === 'num' || c.t === 'ctrl') tot[c.k] = 0;
  }
  for (var f = 0; f < filas.length; f++){
    for (var j = 0; j < def.cols.length; j++){
      var cc = def.cols[j];
      if (tot.hasOwnProperty(cc.k)) tot[cc.k] += Number(filas[f][cc.k] || 0);
    }
    if (Math.abs(Number(filas[f].control_iva || 0)) >= 0.005) malIva++;
    var ct = filas[f].control_total !== undefined ? filas[f].control_total : filas[f].control_importe;
    if (Math.abs(Number(ct || 0)) >= 0.005) malTot++;
  }

  h.push('<div class="sd-sec">' + esc(def.titulo) + ' · ' + esc(mes.rotulo) + '</div>');
  h.push('<div class="sd-sec-pie">' + sdMiles(filas.length) + ' renglones · leídos en '
       + sdMiles(ms) + ' ms contra la base</div>');
  h.push('<div class="sd-nota">' + def.nota + '</div>');

  /* LOS DOS CONTROLES, ARRIBA Y CON SU NUMERO. Son los que dicen si el
     subdiario se puede presentar. Si alguno no da cero, la pantalla lo
     muestra en rojo con cuantos renglones, no en un pie que nadie lee. */
  h.push('<div class="sd-tarjetas">');
  h.push('<div class="sd-tj ' + (malIva ? 'sd-tj-mal' : 'sd-tj-ok') + '"><b>'
       + sdMiles(malIva) + '</b><span>renglones donde el IVA no cierra contra su neto</span></div>');
  h.push('<div class="sd-tj ' + (malTot ? 'sd-tj-mal' : 'sd-tj-ok') + '"><b>'
       + sdMiles(malTot) + '</b><span>renglones donde las partes no dan el total</span></div>');
  h.push('</div>');

  h.push('<div class="sd-caja"><table class="sd-tb"><thead><tr>');
  for (var k = 0; k < def.cols.length; k++)
    h.push('<th>' + esc(def.cols[k].r) + '</th>');
  h.push('</tr></thead><tbody>');
  for (var r = 0; r < filas.length; r++){
    h.push('<tr>');
    for (var q = 0; q < def.cols.length; q++) h.push(sdCel(filas[r], def.cols[q]));
    h.push('</tr>');
  }
  /* la fila de total lleva la clase `tot`: filas.js la deja visible en
     TODAS las paginas. Un total que aparece solo en la ultima no se
     encuentra. */
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
  h.push('</tbody></table></div>');

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
