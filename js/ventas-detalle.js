/* =====================================================================
   DETALLE DE VENTAS — DISSAN 20/11/2026
   =====================================================================
   Reemplaza el Excel que hoy se exporta a mano desde Tango
   ("2026.10.08_DETALLE_DE_VENTAS_2024_A_LA_FECHA.xlsx").

   CONTROLADA CONTRA ESE ARCHIVO, RENGLON POR RENGLON. Huella md5 de
   (comprobante | tipo | articulo | cantidad | importe) agregada por
   clave, de las dos puntas:
       EXCEL : 25e5f0a3c793bf9d4f7decb7677d6161   14.613 claves
       BASE  : 25e5f0a3c793bf9d4f7decb7677d6161   14.613 claves
   No es un total que cierra: es cada renglon. Un total puede estar
   tapando diferencias que se compensan, que es la cagada del 16/11
   ("403 de 403 con huella md5" era mi funcion contra mi propia funcion).

   CUATRO COSAS QUE LA PANTALLA DECLARA, PORQUE SI NO SE LEEN MAL:

   1. RENGLONES FUSIONADOS. Tango guarda el mismo articulo DOS VECES en
      un comprobante cuando salio de dos lotes -medido: 188 combinaciones
      en 293 filas, y las repetidas son IDENTICAS entre si, mismo precio
      y misma cantidad-. El Excel las fusiona: 14.652 contra 14.906.
      No se pierde ni una unidad ni un peso. El pie lo dice siempre.

   2. EL SIGNO DE LAS NOTAS DE CREDITO. Van en negativo, y se reconocen
      por gva15.clase_operacion = 'NC', NUNCA por t_comp = 'N/C', que en
      esta empresa tiene 2 filas en toda la historia y devuelve cero
      (12/11/2026).

   3. "PROVINCIA" ES LA ZONA. El Excel rotula Provincia lo que en Tango
      es la zona del cliente (gva05). Medido renglon por renglon: las
      dos coinciden en los 14.652. Acá van las dos, codigo y nombre.

   4. "PROVEEDOR" ES DEL ARTICULO, no el vendedor. Sale de
      sta11.campos_adicionales (CA_TEXT_1710767066197). El `_metadata`
      del Excel lo mapea mal, a CA_VENDEDORES.

   Y LAS DOS COLUMNAS DE IMPORTE VAN LAS DOS: `Total` es cantidad x
   precio (lo que trae el Excel) e `Importe Tango` es gravado + exento
   (lo que Tango guarda). Difieren $524,32 en 3.773 renglones de toda la
   historia, por redondeo del propio Tango. La diferencia se muestra en
   `Control`, dentro del renglon, en vez de elegir una a escondidas
   (16/11/2026).
   ===================================================================== */

var VD = { cargando:false, datos:null };

/* ---------- numeros, igual que en ventas.js ---------- */
function vdEsc(s){ return String(s === null || s === undefined ? '' : s)
  .replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function vdNum(n){
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString('es-AR');
}
/* El signo va ANTES del peso: "$-5.555,51" se lee como un importe raro. */
function vdSigno(v, cuerpo){ return (Number(v) < 0 ? '-$' : '$') + cuerpo; }
function vdPesos(n){
  if (n === null || n === undefined || n === '') return '—';
  return vdSigno(n, Math.abs(Math.round(Number(n))).toLocaleString('es-AR'));
}
function vdExacto(n){
  if (n === null || n === undefined || n === '') return '—';
  return vdSigno(n, Math.abs(Number(n)).toLocaleString('es-AR',
                  {minimumFractionDigits:2, maximumFractionDigits:2}));
}
/* Las tarjetas grandes van en millones con el monto exacto en el subtitulo:
   un numero cortado por el ancho se lee como OTRO numero (14/10/2026). */
function vdMillones(n){
  var v = Number(n || 0);
  if (Math.abs(v) >= 1e6)
    return vdSigno(v, (Math.abs(v)/1e6).toLocaleString('es-AR', {maximumFractionDigits:1}) + ' M');
  return vdPesos(v);
}
function vdCant(n){
  if (n === null || n === undefined || n === '') return '—';
  var v = Number(n);
  return v.toLocaleString('es-AR', {maximumFractionDigits:2});
}
function vdFecha(s){
  if (!s) return '—';
  var p = String(s).slice(0,10).split('-');
  return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : String(s);
}
function vdKpi(rotulo, valor, nota){
  return '<div class="vi-kpi"><div class="vi-kpi-t">' + vdEsc(rotulo) + '</div>' +
         '<div class="vi-kpi-v">' + vdEsc(valor) + '</div>' +
         (nota ? '<div class="vi-kpi-n">' + vdEsc(nota) + '</div>' : '') + '</div>';
}

/* ---------- los filtros que la pantalla tiene PUESTOS ahora ----------
   Se leen de los campos, nunca del boton que yo creo haber apretado:
   esa fue la cagada del 19/11, leer un repintado viejo.             */
function vdFiltros(){
  function v(id){ var e = document.getElementById(id); return e ? e.value : ''; }
  return {
    p_desde       : v('vdDesde') || null,
    p_hasta       : v('vdHasta') || null,
    p_zona        : v('vdZona') || null,
    p_proveedor   : v('vdProveedor') || null,
    p_entidad     : v('vdEntidad') || null,
    p_tipo_cliente: v('vdTipoCliente') || null,
    p_cliente     : v('vdCliente') || null,
    p_articulo    : v('vdArticulo') || null,
    p_tipo_comp   : v('vdTipoComp') || null,
    p_agrupar     : v('vdAgrupar') === '1',
    p_limite      : Number(v('vdLimite') || 2000)
  };
}

async function vdCargar(){
  if (VD.cargando) return;
  var estado = document.getElementById('vdEstado');
  var cuerpo = document.getElementById('vdCuerpo');
  var boton  = document.getElementById('vdAplicar');
  VD.cargando = true;
  if (boton) boton.disabled = true;
  estado.innerHTML = '<div class="db-cargando">Midiendo contra la base…</div>';
  cuerpo.hidden = true;
  try {
    var f = vdFiltros();
    var r = await rpc('api_ventas_detalle_v1', f);
    var d = r && r.data;
    if (!d || d.ok === false)
      throw new Error((d && d.error) || 'la base no devolvió nada');

    /* EL RESUMEN VA CON LOS MISMOS FILTROS QUE LA GRILLA.      20/11/2026
       Es la hoja RESUMEN del Excel de Tango, que el usuario reclamo que
       faltaba. Alla esos dos cuadros salen de tablas dinamicas con
       segmentadores que hay que acordarse de mover; aca salen con lo que
       tenga puesto la pantalla. Se pide APARTE y si falla NO se cae la
       grilla: la grilla es el dato, el resumen es la lectura del dato. */
    var fr = {}; for (var k in f) if (k !== 'p_agrupar' && k !== 'p_limite') fr[k] = f[k];
    var res = null;
    try {
      var rr = await rpc('api_ventas_detalle_resumen_v1', fr);
      if (rr && rr.data && rr.data.ok !== false) res = rr.data;
    } catch (e) { res = null; }

    VD.datos = d;
    VD.resumen = res;
    VD.filtros = f;
    estado.innerHTML = '';
    cuerpo.innerHTML = vdPintar(d, f, r.ms, res);
    cuerpo.hidden = false;
    /* los cartelitos de las barras se enganchan DESPUES de pintar: el
       grafico no existe hasta que el innerHTML esta puesto. */
    if (typeof dbConectarTips === 'function') dbConectarTips(cuerpo);
    var ly = document.getElementById('vdLeyenda');
    if (ly) ly.textContent = 'medido en ' + vdNum(r.ms) + ' ms';
  } catch (e) {
    estado.innerHTML = '<div class="db-error">No se pudo medir: ' + vdEsc(e.message) + '</div>';
  } finally {
    VD.cargando = false;
    if (boton) boton.disabled = false;
  }
}

/* ---------- LA HOJA «RESUMEN» DEL EXCEL, REPLICADA.          20/11/2026
   Dos cuadros y un grafico, los mismos que tiene el archivo de Tango, pero
   con la forma del Tablero: barras arriba y la tabla abajo, para que se
   LEA de un vistazo y despues se pueda mirar el numero exacto.
     1. Neto facturado por ZONA y por AÑO, con su % de participacion.
     2. Neto por CLIENTE, de mayor a menor.
   Controlados contra el archivo antes de publicarlos: 23 cifras, 0
   diferencias — las 9 celdas de zona x anio, el total general, los 12
   clientes mas grandes y los 114 clientes de 2026.
   Las barras salen de `dbGrafBarras`, que es el MISMO codigo que dibuja
   las del Tablero: vive en js/graf.js porque dos copias de la misma cosa
   se separan con el tiempo (el defecto del 30/10 con `listas`).
   Las secciones aparecen SIEMPRE y dicen «Ninguno» con el motivo: una
   seccion que desaparece se lee como «falta algo» (16/11/2026). */
function vdResumen(res){
  var h = [];
  var celdas = (res && res.por_zona) || [];

  /* ---------- cuadro 1: zona x anio ---------- */
  h.push('<div class="db-sec">Resumen por zona y año' +
         '<small>Es el primer cuadro de la hoja RESUMEN del Excel de Tango. ' +
         'Acá sale con los filtros que tengas puestos arriba.</small></div>');

  if (!celdas.length){
    h.push('<div class="db-pie"><b>Ninguno.</b> No hay renglones en esos filtros, ' +
           'así que no hay nada que resumir.</div>');
  } else {
    var anios = (res.anios || []).slice();
    var zonas = [];
    for (var i = 0; i < celdas.length; i++)
      if (zonas.indexOf(celdas[i].zona) < 0) zonas.push(celdas[i].zona);
    var por = {};
    for (var j = 0; j < celdas.length; j++)
      por[celdas[j].zona + '|' + celdas[j].anio] = Number(celdas[j].neto) || 0;

    var totAnio = {}, totZona = {}, total = 0;
    for (var z = 0; z < zonas.length; z++){
      totZona[zonas[z]] = 0;
      for (var a = 0; a < anios.length; a++){
        var v = por[zonas[z] + '|' + anios[a]] || 0;
        totZona[zonas[z]] += v;
        totAnio[anios[a]] = (totAnio[anios[a]] || 0) + v;
        total += v;
      }
    }
    function pct(v, t){ return t ? (100 * v / t).toFixed(2).replace('.', ',') + '%' : '—'; }

    /* las barras, antes de la tabla: primero se ve, despues se lee */
    var bZona = zonas.map(function(n){ return { et:n, val:totZona[n] }; })
                     .sort(function(x,y){ return y.val - x.val; });

    /* EL GRAFICO COMO LO TIENE EL EXCEL: una barra por AÑO adentro de cada
       zona, no dos graficos sueltos. El usuario mando la captura de su hoja
       —segmentadores de año y provincia, y el grafico agrupado— y asi lo
       mira el. Al lado va el total por zona, que es lo que su grafico deja
       leer de un vistazo.                                    20/11/2026 */
    var bZA = [];
    for (var zz = 0; zz < zonas.length; zz++)
      for (var aa = 0; aa < anios.length; aa++)
        bZA.push({ et: zonas[zz] + ' · ' + anios[aa], zona: zonas[zz], anio: anios[aa],
                   val: por[zonas[zz] + '|' + anios[aa]] || 0 });

    h.push('<div class="vi-grafs">');
    h.push('<div><div class="vi-graf-t">Neto facturado por zona y año</div>' +
      dbGrafBarras(bZA, 'et', 'val',
        function(f){ return f.zona + ' ' + f.anio + ': ' + vdExacto(f.val) +
                            ' · ' + pct(f.val, totAnio[f.anio] || 0) + ' de ese año'; },
        function(f){ return vdMillones(f.val); }, '', 128, 21) + '</div>');
    h.push('<div><div class="vi-graf-t">Total por zona</div>' +
      dbGrafBarras(bZona, 'et', 'val',
        function(f){ return f.et + ': ' + vdExacto(f.val) + ' · ' + pct(f.val, total); },
        function(f){ return vdMillones(f.val); }, 'v', 86, 24) + '</div>');
    h.push('</div>');

    h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr><th>Zona</th>');
    for (var a2 = 0; a2 < anios.length; a2++)
      h.push('<th class="der">' + vdEsc(anios[a2]) + ' · particip.</th>' +
             '<th class="der" data-plata>' + vdEsc(anios[a2]) + ' · neto facturado</th>');
    h.push('<th class="der">Total · particip.</th><th class="der" data-total>Total neto facturado</th>');
    h.push('</tr></thead><tbody>');
    for (var z2 = 0; z2 < zonas.length; z2++){
      h.push('<tr><td>' + vdEsc(zonas[z2]) + '</td>');
      for (var a3 = 0; a3 < anios.length; a3++){
        var vv = por[zonas[z2] + '|' + anios[a3]] || 0;
        h.push('<td class="der">' + pct(vv, totAnio[anios[a3]] || 0) + '</td>' +
               '<td class="der">' + vdEsc(vdExacto(vv)) + '</td>');
      }
      h.push('<td class="der">' + pct(totZona[zonas[z2]], total) + '</td>' +
             '<td class="der">' + vdEsc(vdExacto(totZona[zonas[z2]])) + '</td></tr>');
    }
    h.push('</tbody><tfoot><tr><td><b>Total general</b></td>');
    for (var a4 = 0; a4 < anios.length; a4++)
      h.push('<td class="der">100,00%</td><td class="der"><b>' +
             vdEsc(vdExacto(totAnio[anios[a4]] || 0)) + '</b></td>');
    h.push('<td class="der">100,00%</td><td class="der"><b>' +
           vdEsc(vdExacto(total)) + '</b></td></tr></tfoot></table></div>');
  }

  /* ---------- cuadro 2: por cliente ---------- */
  var cli = (res && res.por_cliente) || [];
  h.push('<div class="db-sec">Resumen por cliente' +
         '<small>' + (cli.length ? vdNum(cli.length) + ' clientes, del que más compró al que menos'
                                 : 'el segundo cuadro de la hoja RESUMEN') + '</small></div>');
  if (!cli.length){
    h.push('<div class="db-pie"><b>Ninguno.</b> No hay renglones en esos filtros.</div>');
  } else {
    var totC = 0;
    for (var c0 = 0; c0 < cli.length; c0++) totC += Number(cli[c0].neto) || 0;

    /* las barras muestran los 15 mas grandes; la tabla de abajo los trae a
       TODOS, y el pie lo dice para que nadie crea que son 15 y listo. */
    var top = cli.slice(0, 15).map(function(x){
      return { et: x.razon_social, val: Number(x.neto) || 0 };
    });
    h.push('<div class="vi-grafs uno">');
    h.push('<div><div class="vi-graf-t">Los ' + top.length + ' más grandes' +
           (cli.length > top.length ? ' de ' + vdNum(cli.length) : '') + '</div>' +
      dbGrafBarras(top, 'et', 'val',
        function(f){ return f.et + ': ' + vdExacto(f.val) + ' · ' +
                            (totC ? (100*f.val/totC).toFixed(2).replace('.',',') + '%' : '—'); },
        function(f){ return vdMillones(f.val); }, 'v', 150, 21) + '</div>');
    h.push('</div>');

    h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>' +
           '<th>#</th><th>Cliente</th><th>Código</th>' +
           /* SIN `data-total`: no hay partes que sumen a esta columna, y
              declarar un total sin partes hace que la puerta del archivo
              bajado corte con «ninguna columna de plata». En el cuadro de
              zonas SI va, porque los netos por anio SUMAN el total. */
           '<th class="der">Renglones</th><th class="der">Particip.</th>' +
           '<th class="der">Neto facturado</th>' +
           '</tr></thead><tbody>');
    for (var c = 0; c < cli.length; c++){
      var x = cli[c], n = Number(x.neto) || 0;
      h.push('<tr><td class="der">' + (c + 1) + '</td>' +
             '<td>' + vdEsc(x.razon_social) + '</td>' +
             /* la clase `db-cod` NO va en la celda vacia: esa rama de
                js/bajar.js corre antes que la del guion largo y hace viajar
                el «—» al Excel como TEXTO. Mismo defecto que en la grilla. */
             (x.cod_client ? '<td class="db-cod">' + vdEsc(x.cod_client) + '</td>'
                           : '<td>—</td>') +
             '<td class="der">' + vdEsc(vdNum(x.renglones)) + '</td>' +
             '<td class="der">' + (totC ? (100 * n / totC).toFixed(2).replace('.', ',') + '%' : '—') + '</td>' +
             '<td class="der">' + vdEsc(vdExacto(n)) + '</td></tr>');
    }
    h.push('</tbody><tfoot><tr><td></td><td><b>Total general</b></td><td></td><td></td>' +
           '<td class="der">100,00%</td><td class="der"><b>' + vdEsc(vdExacto(totC)) +
           '</b></td></tr></tfoot></table></div>');
  }
  return h.join('');
}

function vdPintar(d, f, ms, res){
  var s = d.resumen || {};
  var filas = d.filas || [];
  var h = [];

  /* ---------- las tarjetas ---------- */
  h.push('<div class="vi-kpis">');
  h.push(vdKpi('Renglones de Tango', vdNum(s.renglones_tango),
               'como los guarda Tango, sin fusionar'));
  h.push(vdKpi('Comprobante + artículo', vdNum(s.claves),
               'combinaciones distintas · el Excel de Tango muestra éstas'));
  h.push(vdKpi('Comprobantes', vdNum(s.comprobantes),
               vdNum(s.clientes) + ' clientes · ' + vdNum(s.articulos) + ' artículos'));
  h.push(vdKpi('Cantidad', vdCant(s.cantidad), 'unidades, con el signo de las notas de crédito'));
  h.push(vdKpi('TOTAL', vdMillones(s.total),
               vdExacto(s.total) + ' · cantidad × precio, neto sin IVA'));
  var nc = Number(s.notas_credito || 0);
  h.push(vdKpi('Notas de crédito',
               nc ? vdMillones(s.nc_importe) : 'Ninguna',
               nc ? vdNum(nc) + ' renglones · ' + vdExacto(s.nc_importe)
                  : 'no hubo notas de crédito en este filtro'));
  h.push('</div>');

  /* ---------- LO QUE SE DECLARA, SIEMPRE ----------
     Una sección que desaparece se lee como «falta algo» (16/11/2026). */
  h.push('<div class="db-sec">Lo que hay que saber de estas cifras' +
         '<small>Va siempre, haya o no diferencias: si la pantalla calla, ' +
         'el que mira no distingue «no hay» de «no se midió».</small></div>');
  h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>' +
         '<th>Qué</th><th>Qué dice la pantalla</th></tr></thead><tbody>');

  var fusion = Number(s.renglones_tango || 0) - Number(s.claves || 0);
  h.push('<tr><td>Renglones fusionados</td><td>' +
         (f.p_agrupar
           ? '<b>Agrupado por artículo</b>, como el Excel de Tango: ' +
             vdNum(s.claves) + ' renglones. ' +
             (fusion > 0
               ? '<b>' + vdNum(fusion) + '</b> renglones de Tango quedaron fusionados ' +
                 '(el mismo artículo dos veces en un comprobante, por lote o depósito). ' +
                 'No se pierde ni una unidad ni un peso.'
               : 'Ninguno se fusionó: no hay artículos repetidos en este filtro.')
           : '<b>Como los guarda Tango</b>: ' + vdNum(s.renglones_tango) + ' renglones. ' +
             (fusion > 0
               ? 'Hay <b>' + vdNum(fusion) + '</b> de más respecto de las ' +
                 vdNum(s.claves) + ' combinaciones de comprobante y artículo. ' +
                 'Son el mismo artículo cargado dos veces, por lote o depósito.'
               : 'Ningún artículo está repetido dentro de un comprobante en este filtro.')) +
         '</td></tr>');

  h.push('<tr><td>Las dos columnas de importe</td><td>' +
         '<b>Total</b> ' + vdExacto(s.total) + ' es <code>cantidad × precio</code>, ' +
         'que es lo que trae el Excel de DISSAN. <b>Importe Tango</b> ' +
         vdExacto(s.importe_tango) + ' es <code>gravado + exento</code>, lo que Tango guarda. ' +
         (Math.abs(Number(s.control_importe || 0)) < 0.005
           ? 'Acá dan <b>lo mismo</b>.'
           : 'Difieren <b>' + vdExacto(s.control_importe) + '</b>, por redondeo del propio Tango. ' +
             'La diferencia va renglón por renglón en la columna <b>Control</b>.') +
         '</td></tr>');

  h.push('<tr><td>El signo de las notas de crédito</td><td>' +
         (nc ? 'Las <b>' + vdNum(nc) + '</b> notas de crédito van en <b>negativo</b>, ' +
               'así que el TOTAL ya está neteado.'
             : 'No hay ninguna en este filtro. Cuando las hay van en negativo.') +
         ' Se reconocen por <code>gva15.clase_operacion = \'NC\'</code>, nunca por ' +
         '<code>t_comp = \'N/C\'</code>, que en esta empresa devuelve cero.</td></tr>');

  h.push('<tr><td>«Provincia» es la zona</td><td>' +
         'La columna que el Excel rotula <b>Provincia</b> es la <b>zona</b> del cliente en ' +
         'Tango (<code>gva05</code>): 1 SAN LUIS · 2 MENDOZA · 3 SAN JUAN. Medido renglón por ' +
         'renglón contra el Excel: coinciden en los 14.652.</td></tr>');

  h.push('<tr><td>«Proveedor» es del artículo</td><td>' +
         'Sale de los campos adicionales del artículo en Tango, no del vendedor. ' +
         'Acá van además <b>Vendedor</b>, <b>Línea</b> y <b>Sublínea</b>, que el Excel ' +
         '<b>no trae</b>.</td></tr>');

  h.push('<tr><td>El precio</td><td>Neto <b>sin IVA</b> ' +
         '(<code>gva53.precio_net</code>). La cabecera del comprobante en Tango incluye el ' +
         'IVA y por eso es mayor.</td></tr>');

  /* LA HUELLA NO VA ABREVIADA.                                   20/11/2026
     Decia «md5 25e5f0a3…» y la puerta del PDF lo corto como lo que es: un
     codigo con digitos terminado en puntos suspensivos. Tenia razon — el que
     lee no puede distinguir mi abreviatura de un numero cortado, que es
     exactamente el defecto del 14/10. La huella entera vive en el comentario
     de arriba y en el documento del proyecto; lo que la pantalla tiene que
     decir es la AFIRMACION y contra que se midio. */
  h.push('<tr><td>Controlado contra</td><td>El Excel exportado de Tango el 08/10/2026: ' +
         'huella md5 <b>idéntica de los dos lados</b> sobre <b>14.613 de 14.613</b> ' +
         'combinaciones de comprobante y artículo, iguales en cantidad e importe. ' +
         'No es un total que cierra: es cada renglón.</td></tr>');
  h.push('</tbody></table></div>');

  /* ---------- el resumen, antes del detalle ---------- */
  h.push(vdResumen(res));

  /* ---------- la grilla ---------- */
  h.push('<div class="db-sec">Renglón por renglón' +
         '<small>' + vdNum(filas.length) + ' de ' + vdNum(f.p_agrupar ? s.claves : s.renglones_tango) +
         ' · ' + vdFecha(s.desde) + ' a ' + vdFecha(s.hasta) +
         ' · medido en ' + vdNum(ms) + ' ms</small></div>');

  if (!filas.length){
    h.push('<div class="db-pie"><b>Ninguno.</b> Ningún renglón entra en esos filtros. ' +
           'No es un error: es que no hay. Probá ampliando las fechas o sacando un filtro.</div>');
    return h.join('');
  }

  /* `data-plata` SIGNIFICA «ESTA COLUMNA ES UNA PARTE DEL TOTAL DEL
     RENGLON», no «esta columna es plata». Lo copie de subdiario.js, donde
     SI lo es -exento + neto + IVA dan el importe- y lo puse en todas las
     columnas de tipo num. Aca es falso, y la puerta del archivo bajado lo
     corto el 20/11: sumaba «Precio unitario» + «Importe Tango» = 867.768,60
     contra un Total de 433.884,30. Precio unitario es POR UNIDAD y el Total
     es del renglon — el defecto exacto del 14/10, en mi pantalla nueva.
     ESTA GRILLA NO TIENE DESCOMPOSICION ADITIVA, y eso se declara en vez de
     inventarle una: Total = cantidad x precio (un producto, no una suma) e
     Importe Tango es OTRA MEDIDA del mismo dinero, no una parte. La unica
     identidad verdadera -Importe Tango + Control = Total- no se puede
     declarar porque Control no baja al archivo: es columna de control, con
     su `data-deriva` y su hoja de Controles.
     `cod` marca los identificadores: un codigo no es un numero, y en el PDF
     NO SE RECORTA (js/bajar.js los reconoce por la clase `db-cod`). Sin eso,
     el comprobante salia «A0000800007...» y el articulo «FAVE002...». */
  var COLS = [
    { k:'fecha',        t:'Fecha',        tipo:'fecha' },
    { k:'zona',         t:'Zona',         tipo:'txt' },
    { k:'t_comp',       t:'Tipo',         tipo:'txt' },
    { k:'n_comp',       t:'Comprobante',  tipo:'txt', cod:true },
    { k:'razon_social', t:'Cliente',      tipo:'txt' },
    { k:'entidad',      t:'Entidad',      tipo:'txt' },
    { k:'tipo_cliente', t:'Tipo cliente', tipo:'txt' },
    { k:'cod_articu',   t:'Artículo',     tipo:'txt', cod:true },
    { k:'descripcion',  t:'Descripción',  tipo:'txt' },
    { k:'sinonimo',     t:'Sinónimo',     tipo:'txt', cod:true },
    { k:'proveedor',    t:'Proveedor',    tipo:'txt' },
    { k:'linea',        t:'Línea',        tipo:'txt' },
    { k:'sublinea',     t:'Sublínea',     tipo:'txt' },
    { k:'cantidad',     t:'Cantidad',     tipo:'cant' },
    { k:'precio_unitario', t:'Precio unitario', tipo:'num' },
    { k:'total',           t:'Total',           tipo:'num' },
    { k:'importe_tango',   t:'Importe Tango',   tipo:'num' },
    { k:'control_importe', t:'Control',         tipo:'ctrl' }
  ];

  h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>');
  for (var i = 0; i < COLS.length; i++){
    var c = COLS[i];
    h.push('<th' + (c.parte ? ' data-plata' : '') +
           (c.total ? ' data-total' : '') +
           (c.tipo === 'ctrl' ? ' data-no-baja data-deriva="redondeo del propio Tango entre' +
              ' cantidad x precio y el importe que guarda: no es plata que falte"' : '') +
           (c.tipo === 'num' || c.tipo === 'cant' || c.tipo === 'ctrl' ? ' class="der"' : '') +
           '>' + vdEsc(c.t) + '</th>');
  }
  h.push('</tr></thead><tbody>');

  for (var r = 0; r < filas.length; r++){
    var fl = filas[r];
    var esNC = String(fl.clase_operacion || '') === 'NC';
    h.push('<tr' + (esNC ? ' class="aparte"' : '') + '>');
    for (var j = 0; j < COLS.length; j++){
      var col = COLS[j], v = fl[col.k];
      if (col.tipo === 'fecha')      h.push('<td>' + vdEsc(vdFecha(v)) + '</td>');
      else if (col.tipo === 'cant')  h.push('<td class="der">' + vdEsc(vdCant(v)) + '</td>');
      else if (col.tipo === 'num')   h.push('<td class="der">' + vdEsc(vdExacto(v)) + '</td>');
      else if (col.tipo === 'ctrl')  h.push('<td class="der">' +
          (Math.abs(Number(v || 0)) < 0.005 ? '' : vdEsc(vdExacto(v))) + '</td>');
      else {
        /* EL GUION LARGO NO ES UN CODIGO: es como esta pantalla escribe «no
           hay dato», y js/bajar.js lo manda al archivo como celda VACIA. Pero
           la rama del codigo corre ANTES de esa, asi que marcar la celda vacia
           con db-cod hacia que el «—» viajara como TEXTO. Lo corto la puerta
           del archivo bajado el 20/11 (J11, Sinonimo). La clase va solo cuando
           hay valor.                                              20/11/2026 */
        var vacio = (v === null || v === undefined || v === '');
        h.push('<td' + (col.cod && !vacio ? ' class="db-cod"' : '') + '>' +
               vdEsc(vacio ? '—' : v) + '</td>');
      }
    }
    h.push('</tr>');
  }
  h.push('</tbody></table></div>');

  if (filas.length >= f.p_limite){
    h.push('<div class="db-pie"><b>Se trajeron los primeros ' + vdNum(filas.length) +
           '.</b> Las tarjetas de arriba miden <b>todo</b> el filtro, no sólo esta tabla. ' +
           'Para ver todos los renglones, subí «Renglones que se traen».</div>');
  }
  return h.join('');
}

/* El PROVEEDOR es un campo de texto y no un desplegable a proposito: son 51
   valores, y «mas de 20 opciones se escriben, no se scrollean». Filtra por
   parte del nombre, asi que "colo" encuentra COLOPLAST.                      */

/* core.js llama a calcular() despues de armar el menu, y si la pantalla no la
   define tira «calcular is not defined» en la consola. No rompe nada visible,
   y por eso es justo la clase de cosa que se entrega sin ver: lo agarro el
   control pintando la pantalla con el juguete.                  20/11/2026 */
function calcular(){ return vdCargar(); }

function vdAnio(a){
  document.getElementById('vdDesde').value = a + '-01-01';
  document.getElementById('vdHasta').value = a + '-12-31';
  vdCargar();
}

window.addEventListener('load', function(){
  var b = document.getElementById('vdAplicar');
  if (b) b.addEventListener('click', vdCargar);
  ['vdZona','vdEntidad','vdTipoCliente','vdTipoComp','vdAgrupar','vdLimite']
    .forEach(function(id){
      var e = document.getElementById(id);
      if (e) e.addEventListener('change', vdCargar);
    });
  ['vdCliente','vdArticulo','vdProveedor'].forEach(function(id){
    var e = document.getElementById(id);
    if (e) e.addEventListener('keydown', function(ev){ if (ev.key === 'Enter') vdCargar(); });
  });
  var b24 = document.getElementById('vd2024'); if (b24) b24.addEventListener('click', function(){ vdAnio(2024); });
  var b25 = document.getElementById('vd2025'); if (b25) b25.addEventListener('click', function(){ vdAnio(2025); });
  var b26 = document.getElementById('vd2026'); if (b26) b26.addEventListener('click', function(){ vdAnio(2026); });
  var bx  = document.getElementById('vdExcel');
  if (bx) bx.addEventListener('click', function(){
    /* La ventana exacta del Excel del 08/10/2026, para poder comparar
       contra el archivo sin tener que acordarse de las fechas. */
    document.getElementById('vdDesde').value = '2024-09-02';
    document.getElementById('vdHasta').value = '2026-10-07';
    document.getElementById('vdAgrupar').value = '1';
    vdCargar();
  });
});
