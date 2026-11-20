/* =====================================================================
   DASHBOARD DE VENTAS — mes a mes, con el costo.           20/11/2026
   =====================================================================
   Pedido textual del usuario: "basta de excel, tenemos el sistema
   armemos un dashboard general, y luego pestañas con dashboards con
   cada kpi indicadore que piden". Hoy eso lo arma abriendo varios Excel.

   CINCO PESTAÑAS: General · Provincia (que es la ZONA: su segmentador
   tiene MENDOZA / SAN JUAN / SAN LUIS) · Proveedor · Línea · Cliente.
   Cada una con sus tarjetas, su grafico y su tabla, y todas mes a mes.

   EL COSTO NO SE REINVENTA. Sale de api_ventas_dashboard_v1, que lee
   ema.margen_medido -la vista del margen con la cuarentena del Tablero
   ya resuelta, el MISMO predicado- y filtra por las CUATRO calidades
   firmes. Medido contra lo que publica el Tablero en el mismo periodo:
   4.414 renglones = 4.414 · venta 4.509.380.029,02 = 4.509.380.029 ·
   costo 2.919.663.231,05 = 2.919.663.231.

   Y EL DENOMINADOR SE DECLARA ARRIBA DE TODO, siempre: el margen se mide
   sobre lo que DISSAN compra y stockea; la consignacion queda afuera.
   Publicar un margen sin decir sobre cuanto se midio es la falta del
   08/10, y aca seria peor porque el dashboard es para mostrarlo.
   ===================================================================== */

var DV = { datos: null, cargando: false, pestania: 'general', tope: 12 };

/* LAS DOS «PROVINCIAS» SON DOS COSAS DISTINTAS, Y LA DIFERENCIA ES PLATA.
   El segmentador «Provincia» de su Excel es la ZONA comercial de Tango
   (`gva05`: MENDOZA · SAN LUIS · SAN JUAN), medido el 20/11 contra el maestro,
   14.652 de 14.652. La provincia FISCAL del cliente tiene seis valores y NO da
   lo mismo: en 2026, zona MENDOZA $5.303.957.986,76 contra provincia Mza
   $4.718.802.792,62 — $585.155.194,14 de clientes de otra provincia atendidos
   desde Mendoza. Van las dos, cada una diciendo cual es. */
/* EL PLURAL VA ESCRITO, NO SE ARMA PEGANDO UNA «s».
   La primera version hacia `rot + 's'` y la pantalla decia «Provincia
   fiscals distintos» y «Proveedors distintos». Lo encontro la corrida de
   humo, no el usuario, y eso es lo unico bueno del asunto. */
var DV_PESTANIAS = [
  { id:'general',   rot:'General',          plural:'',                   nota:'la foto del período' },
  { id:'zona',      rot:'Provincia',        plural:'Provincias',         nota:'la zona de Tango, la de tu Excel' },
  { id:'provincia', rot:'Provincia fiscal', plural:'Provincias fiscales',nota:'el domicilio del cliente' },
  { id:'proveedor', rot:'Proveedor',        plural:'Proveedores',        nota:'del artículo' },
  { id:'linea',     rot:'Línea',            plural:'Líneas',             nota:'del artículo' },
  { id:'cliente',   rot:'Cliente',          plural:'Clientes',           nota:'quién compra' }
];

function dvEsc(s){
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function dvNum(n){
  if (n === null || n === undefined || n === '' || isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('es-AR', { maximumFractionDigits:0 });
}
function dvPesos(n){
  if (n === null || n === undefined || isNaN(Number(n))) return 'sin costo';
  var v = Number(n);
  return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('es-AR',
    { minimumFractionDigits:2, maximumFractionDigits:2 });
}
function dvMillones(n){
  if (n === null || n === undefined || isNaN(Number(n))) return 'sin costo';
  var v = Number(n);
  return (v < 0 ? '-$' : '$') + (Math.abs(v)/1e6).toLocaleString('es-AR',
    { minimumFractionDigits:1, maximumFractionDigits:1 }) + ' M';
}
function dvPct(n){
  if (n === null || n === undefined || isNaN(Number(n))) return 'sin costo';
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits:2, maximumFractionDigits:2 }) + '%';
}
function dvMes(s){
  if (!s) return '—';
  var p = String(s).substring(0,10).split('-');
  var M = ['','ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return M[Number(p[1])] + ' ' + p[0];
}
function dvKpi(rot, val, nota){
  return '<div class="dv-kpi"><div class="dv-kpi-t">' + dvEsc(rot) + '</div>' +
         '<div class="dv-kpi-v">' + dvEsc(val) + '</div>' +
         (nota ? '<div class="dv-kpi-n">' + dvEsc(nota) + '</div>' : '') + '</div>';
}

function dvFiltros(){
  var v = function(id){ var e = document.getElementById(id); return e ? e.value : null; };
  return { p_desde: v('dvDesde') || null, p_hasta: v('dvHasta') || null,
           p_tope: Number(v('dvTope') || 12) };
}

async function dvCargar(){
  if (DV.cargando) return;
  var estado = document.getElementById('dvEstado');
  var cuerpo = document.getElementById('dvCuerpo');
  var boton  = document.getElementById('dvVer');
  DV.cargando = true;
  if (boton) boton.disabled = true;
  estado.innerHTML = '<div class="db-cargando">Midiendo contra la base…</div>';
  cuerpo.hidden = true;
  try {
    var f = dvFiltros();
    var r = await rpc('api_ventas_dashboard_v1', f);
    var d = r && r.data;
    if (!d || d.ok === false) throw new Error((d && d.error) || 'la base no devolvió nada');
    DV.datos = d; DV.tope = f.p_tope;
    estado.innerHTML = '';
    cuerpo.innerHTML = dvPintar(d);
    cuerpo.hidden = false;
    if (typeof dbConectarTips === 'function') dbConectarTips(cuerpo);
    dvEnganchar();
    var ly = document.getElementById('dvLeyenda');
    if (ly) ly.textContent = 'medido en ' + dvNum(d.ms) + ' ms';
  } catch (e) {
    estado.innerHTML = '<div class="db-error">No se pudo medir: ' + dvEsc(e.message) + '</div>';
  } finally {
    DV.cargando = false;
    if (boton) boton.disabled = false;
  }
}

function dvPintar(d){
  var h = [];
  var s = d.resumen || {};

  /* EL DENOMINADOR, ARRIBA DE TODO Y SIEMPRE.
     Sin periodo no hay cobertura que publicar, y «hay costo medido en $—» no
     es una frase: ahi se dice que no se midio, que es otra cosa. */
  var cob = s.cobertura_plata_pct;
  h.push('<div class="dv-denominador"><b>' +
         ((cob === null || cob === undefined)
            ? 'No hay ventas en este período, así que no hay cobertura de costo que medir.'
            : 'De cada $100 facturados, hay costo medido en $' +
              dvEsc(Number(cob).toFixed(0)) + '.') +
         '</b> ' + dvEsc(d.denominador || '') +
         ' Las cifras de margen de esta pantalla salen de esos renglones, no de todo lo facturado.</div>');

  /* las pestañas */
  h.push('<div class="dv-pestanias">');
  for (var i = 0; i < DV_PESTANIAS.length; i++){
    var p = DV_PESTANIAS[i];
    h.push('<button type="button" class="dv-pest' + (p.id === DV.pestania ? ' activa' : '') +
           '" data-pest="' + p.id + '">' + dvEsc(p.rot) +
           '<small>' + dvEsc(p.nota) + '</small></button>');
  }
  h.push('</div>');

  for (var j = 0; j < DV_PESTANIAS.length; j++){
    var id = DV_PESTANIAS[j].id;
    h.push('<div class="dv-hoja" data-hoja="' + id + '"' +
           (id === DV.pestania ? '' : ' hidden') + '>');
    h.push(id === 'general' ? dvGeneral(d) : dvCorte(d, DV_PESTANIAS[j]));
    h.push('</div>');
  }
  return h.join('');
}

/* ---------- pestaña GENERAL ---------- */
function dvGeneral(d){
  var s = d.resumen || {}, meses = d.meses || [], h = [];

  h.push('<div class="dv-kpis">');
  h.push(dvKpi('Facturado', dvMillones(s.venta_universo),
               dvPesos(s.venta_universo) + ' · todo, con y sin costo'));
  h.push(dvKpi('Con costo medido', dvMillones(s.venta_medida),
               dvPct(s.cobertura_plata_pct) + ' de lo facturado · ' +
               dvNum(s.renglones_medidos) + ' de ' + dvNum(s.renglones_universo) + ' renglones'));
  h.push(dvKpi('Costo', dvMillones(s.costo), dvPesos(s.costo)));
  h.push(dvKpi('Margen', dvMillones(s.margen), dvPesos(s.margen)));
  h.push(dvKpi('Margen %', dvPct(s.margen_pct), 'sobre la venta con costo'));
  h.push('</div>');

  /* EL ROTULO VA IGUAL AUNQUE NO HAYA NADA (16/11): una seccion que
     desaparece se lee como «falta algo», y el que mira no puede distinguir
     «no hay» de «se rompio». */
  if (!meses.length){
    h.push('<div class="db-sec">Mes a mes<small>sin datos en ese período</small></div>');
    h.push('<div class="db-pie"><b>Ninguno.</b> No hay ventas en ese período.</div>');
    return h.join('');
  }

  var bV = meses.map(function(m){ return { et:dvMes(m.mes), val:Number(m.venta_universo)||0, m:m }; });
  var bM = meses.filter(function(m){ return m.margen !== null; })
                .map(function(m){ return { et:dvMes(m.mes), val:Number(m.margen)||0, m:m }; });

  h.push('<div class="dv-grafs">');
  h.push('<div><div class="dv-graf-t">Facturado mes a mes</div>' +
    dbGrafBarras(bV, 'et', 'val',
      function(f){ return dvMes(f.m.mes) + ': ' + dvPesos(f.val) + ' · ' +
                          dvNum(f.m.renglones) + ' renglones'; },
      function(f){ return dvMillones(f.val); }, '', 62, 20) + '</div>');
  h.push('<div><div class="dv-graf-t">Margen mes a mes</div>' +
    (bM.length ? dbGrafBarras(bM, 'et', 'val',
      function(f){ return dvMes(f.m.mes) + ': ' + dvPesos(f.val) + ' · ' + dvPct(f.m.margen_pct); },
      function(f){ return dvMillones(f.val); }, 'v', 62, 20)
      : '<div class="db-pie"><b>Ninguno.</b> No hay renglones con costo medido en ese período.</div>')
    + '</div>');
  h.push('</div>');

  h.push('<div class="db-sec">Mes a mes<small>' + dvNum(meses.length) +
         ' meses · «con costo» es la parte que se puede medir</small></div>');
  h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>' +
         '<th>Mes</th><th class="der">Renglones</th>' +
         '<th class="der">Facturado</th><th class="der">Con costo</th>' +
         '<th class="der">Costo</th><th class="der">Margen</th><th class="der">Margen %</th>' +
         '</tr></thead><tbody>');
  var tU=0,tV=0,tC=0,tM=0,tR=0;
  for (var i = 0; i < meses.length; i++){
    var m = meses[i];
    tU += Number(m.venta_universo)||0; tV += Number(m.venta)||0;
    tC += Number(m.costo)||0; tM += Number(m.margen)||0; tR += Number(m.renglones)||0;
    h.push('<tr><td>' + dvEsc(dvMes(m.mes)) + '</td>' +
           '<td class="der">' + dvEsc(dvNum(m.renglones)) + '</td>' +
           '<td class="der">' + dvEsc(dvPesos(m.venta_universo)) + '</td>' +
           '<td class="der">' + dvEsc(dvPesos(m.venta)) + '</td>' +
           '<td class="der">' + dvEsc(dvPesos(m.costo)) + '</td>' +
           '<td class="der">' + dvEsc(dvPesos(m.margen)) + '</td>' +
           '<td class="der">' + dvEsc(dvPct(m.margen_pct)) + '</td></tr>');
  }
  h.push('</tbody><tfoot><tr><td><b>Total</b></td>' +
         '<td class="der"><b>' + dvEsc(dvNum(tR)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(dvPesos(tU)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(dvPesos(tV)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(dvPesos(tC)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(dvPesos(tM)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(tV ? dvPct(100*tM/tV) : '—') + '</b></td>' +
         '</tr></tfoot></table></div>');
  return h.join('');
}

/* ---------- pestañas por corte ---------- */
function dvCorte(d, p){
  var id = p.id, rot = p.rot;
  var x = d[id] || {}, tot = x.totales || [], serie = x.serie || [], h = [];

  if (!tot.length){
    h.push('<div class="db-sec">' + dvEsc(rot) +
           '<small>sin datos en ese período</small></div>');
    h.push('<div class="db-pie"><b>Ninguno.</b> No hay ventas en ese período, ' +
           'así que no hay nada que cortar por ' + dvEsc(rot.toLowerCase()) + '.</div>');
    return h.join('');
  }

  var vU=0, vM=0, cO=0, mA=0;
  for (var i = 0; i < tot.length; i++){
    vU += Number(tot[i].venta_universo)||0; vM += Number(tot[i].venta)||0;
    cO += Number(tot[i].costo)||0; mA += Number(tot[i].margen)||0;
  }
  h.push('<div class="dv-kpis">');
  /* el rotulo es el plural pelado: «Provincias distintos» no concuerda y
     «distintas» obligaria a declararle genero a cada corte. Lo que importa
     es el numero, y el «en el período» de abajo ya dice de que habla. */
  h.push(dvKpi(p.plural, dvNum(tot.length), 'distintos en el período'));
  h.push(dvKpi('Facturado', dvMillones(vU), dvPesos(vU)));
  h.push(dvKpi('Margen', dvMillones(mA), vM ? dvPct(100*mA/vM) + ' sobre la venta con costo' : 'sin costo'));
  h.push(dvKpi('El más grande', dvEsc(tot[0].clave),
               dvMillones(tot[0].venta_universo) + ' · ' +
               (vU ? dvPct(100*(Number(tot[0].venta_universo)||0)/vU) : '—') + ' del total'));
  h.push('</div>');

  var top = tot.slice(0, DV.tope);
  h.push('<div class="dv-grafs uno"><div><div class="dv-graf-t">Facturado · los ' +
         top.length + (tot.length > top.length ? ' más grandes de ' + dvNum(tot.length) : '') +
         '</div>' +
    dbGrafBarras(top, 'clave', 'venta_universo',
      function(f){ return f.clave + ': ' + dvPesos(f.venta_universo) +
                          (f.margen_pct === null || f.margen_pct === undefined
                            ? ' · sin costo medido' : ' · margen ' + dvPct(f.margen_pct)); },
      function(f){ return dvMillones(f.venta_universo); }, '', 150, 21) + '</div></div>');

  /* el cuadro de totales */
  h.push('<div class="db-sec">' + dvEsc(rot) + ' · total del período' +
         '<small>' + dvNum(tot.length) + ' en total, de mayor a menor</small></div>');
  h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>' +
         '<th>#</th><th>' + dvEsc(rot) + '</th><th class="der">Renglones</th>' +
         '<th class="der">Facturado</th><th class="der">Particip.</th>' +
         '<th class="der">Con costo</th><th class="der">Costo</th>' +
         '<th class="der">Margen</th><th class="der">Margen %</th>' +
         '</tr></thead><tbody>');
  for (var j = 0; j < tot.length; j++){
    var t = tot[j];
    h.push('<tr><td class="der">' + (j+1) + '</td>' +
           '<td>' + dvEsc(t.clave) + '</td>' +
           '<td class="der">' + dvEsc(dvNum(t.renglones)) + '</td>' +
           '<td class="der">' + dvEsc(dvPesos(t.venta_universo)) + '</td>' +
           '<td class="der">' + dvEsc(vU ? dvPct(100*(Number(t.venta_universo)||0)/vU) : '—') + '</td>' +
           '<td class="der">' + dvEsc(dvPesos(t.venta)) + '</td>' +
           '<td class="der">' + dvEsc(dvPesos(t.costo)) + '</td>' +
           '<td class="der">' + dvEsc(dvPesos(t.margen)) + '</td>' +
           '<td class="der">' + dvEsc(dvPct(t.margen_pct)) + '</td></tr>');
  }
  h.push('</tbody><tfoot><tr><td></td><td><b>Total</b></td><td></td>' +
         '<td class="der"><b>' + dvEsc(dvPesos(vU)) + '</b></td>' +
         '<td class="der"><b>100,00%</b></td>' +
         '<td class="der"><b>' + dvEsc(dvPesos(vM)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(dvPesos(cO)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(dvPesos(mA)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(vM ? dvPct(100*mA/vM) : '—') + '</b></td>' +
         '</tr></tfoot></table></div>');

  /* MES A MES: los meses abajo, las claves al costado. Es la forma en que
     el usuario lo mira hoy en su tabla dinamica. */
  var meses = [], claves = [], por = {};
  for (var k = 0; k < serie.length; k++){
    var r = serie[k];
    if (meses.indexOf(r.mes) < 0) meses.push(r.mes);
    if (claves.indexOf(r.clave) < 0) claves.push(r.clave);
    por[r.mes + '|' + r.clave] = Number(r.venta_universo) || 0;
  }
  meses.sort();
  /* «Otros» siempre al final, aunque sea grande: no es una clave, es el resto */
  claves.sort(function(a,b){
    if (a === 'Otros') return 1; if (b === 'Otros') return -1;
    var sa=0, sb=0;
    for (var q=0;q<meses.length;q++){ sa += por[meses[q]+'|'+a]||0; sb += por[meses[q]+'|'+b]||0; }
    return sb - sa;
  });

  h.push('<div class="db-sec">' + dvEsc(rot) + ' · mes a mes' +
         '<small>facturado, en pesos. ' +
         (claves.indexOf('Otros') >= 0
            ? 'Los ' + (claves.length-1) + ' más grandes; el resto va junto en «Otros».'
            : 'Los ' + claves.length + ' que hay.') + '</small></div>');
  /* `data-plata` = ESTA COLUMNA ES UNA PARTE DEL TOTAL DEL RENGLON, no «es
     plata» (la cagada del 20/11 a la mañana, en la grilla de al lado). Acá sí
     lo es, y de verdad: los N cortes mas «Otros» SUMAN el total del mes. Por
     eso la puerta del archivo bajado puede ejercitar la formula que DISSAN
     escribio a mano en su Excel —la suma de las partes menos el total— y
     agarrar, por ejemplo, un «Otros» que no junte todo el resto. Una celda sin
     plata sale «—», que el Excel escribe vacia y el control cuenta como 0. */
  h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr><th>Mes</th>');
  for (var c = 0; c < claves.length; c++)
    h.push('<th class="der" data-plata>' + dvEsc(claves[c]) + '</th>');
  h.push('<th class="der" data-total>Total del mes</th></tr></thead><tbody>');

  /* EL TOTAL DEL MES NO SE SUMA DE LAS CELDAS QUE ESTOY MOSTRANDO.
     Sale de `d.meses`, que la base calcula en OTRA consulta, sin pasar por
     este corte. Sumando la propia fila, la columna cerraria siempre y la
     puerta del archivo bajado estaria midiendo mi funcion contra mi funcion
     —la cagada del 16/11 con el «403 de 403»—. Asi, en cambio, la formula de
     DISSAN (partes menos total) compara DOS fuentes y se da cuenta si el
     «Otros» deja algo afuera. Medido hoy antes de escribirlo: 5 cortes x 11
     meses, 0 que no dan, peor diferencia $0,00. */
  var totMes = {};
  for (var q = 0; q < (d.meses || []).length; q++)
    totMes[String(d.meses[q].mes).substring(0,10)] = Number(d.meses[q].venta_universo) || 0;

  var totCol = {}, granTotal = 0;
  for (var m2 = 0; m2 < meses.length; m2++){
    h.push('<tr><td>' + dvEsc(dvMes(meses[m2])) + '</td>');
    for (var c2 = 0; c2 < claves.length; c2++){
      var vv = por[meses[m2] + '|' + claves[c2]] || 0;
      totCol[claves[c2]] = (totCol[claves[c2]] || 0) + vv;
      h.push('<td class="der">' + (vv ? dvEsc(dvPesos(vv)) : '—') + '</td>');
    }
    var tm = totMes[String(meses[m2]).substring(0,10)] || 0;
    granTotal += tm;
    h.push('<td class="der"><b>' + dvEsc(dvPesos(tm)) + '</b></td></tr>');
  }
  h.push('</tbody><tfoot><tr><td><b>Total</b></td>');
  for (var c3 = 0; c3 < claves.length; c3++)
    h.push('<td class="der"><b>' + dvEsc(dvPesos(totCol[claves[c3]] || 0)) + '</b></td>');
  h.push('<td class="der"><b>' + dvEsc(dvPesos(granTotal)) + '</b></td></tr></tfoot></table></div>');
  return h.join('');
}

/* ---------- las pestañas se cambian sin volver a pedir nada ---------- */
function dvEnganchar(){
  var cuerpo = document.getElementById('dvCuerpo');
  if (!cuerpo) return;
  var bs = cuerpo.querySelectorAll('.dv-pest');
  for (var i = 0; i < bs.length; i++){
    (function(b){
      b.addEventListener('click', function(){
        DV.pestania = b.getAttribute('data-pest');
        var todas = cuerpo.querySelectorAll('.dv-pest');
        for (var j = 0; j < todas.length; j++)
          todas[j].classList.toggle('activa', todas[j] === b);
        var hojas = cuerpo.querySelectorAll('.dv-hoja');
        for (var k = 0; k < hojas.length; k++)
          hojas[k].hidden = (hojas[k].getAttribute('data-hoja') !== DV.pestania);
        /* NO hace falta volver a equipar nada, y esto se midio antes de
           escribirlo: las CINCO hojas se pintan de una sola vez (cuatro con
           `hidden`), asi que el unico cambio de `#contenido` es ese innerHTML,
           y ahi `filasPonerControl` y `bajarPonerBotones` ya recorren
           `cont.querySelectorAll('table')`, que devuelve tambien las tablas
           ocultas. Ninguno de los dos lee el layout —medido: la unica llamada
           a `getBoundingClientRect` del panel esta en el `mouseenter` de
           graf.js, que sobre algo oculto no se dispara—, asi que paginan y
           ponen los botones igual. Cambiar `hidden` es un cambio de ATRIBUTO
           y esos observadores miran `childList`: no los despertaria. */
      });
    })(bs[i]);
  }
}

function dvAnio(a){
  var de = document.getElementById('dvDesde'), ha = document.getElementById('dvHasta');
  if (de) de.value = a + '-01-01';
  if (ha) ha.value = a + '-12-31';
  dvCargar();
}

/* core.js llama a calcular() despues de armar el menu: si la pantalla no
   la define, tira «calcular is not defined» en la consola. */
function calcular(){ return dvCargar(); }

document.addEventListener('DOMContentLoaded', function(){
  var b = document.getElementById('dvVer');
  if (b) b.addEventListener('click', dvCargar);
  ['2024','2025','2026'].forEach(function(a){
    var x = document.getElementById('dv' + a);
    if (x) x.addEventListener('click', function(){ dvAnio(a); });
  });
  var t = document.getElementById('dvTodo');
  if (t) t.addEventListener('click', function(){
    var de = document.getElementById('dvDesde'), ha = document.getElementById('dvHasta');
    if (de) de.value = ''; if (ha) ha.value = '';
    dvCargar();
  });
});
