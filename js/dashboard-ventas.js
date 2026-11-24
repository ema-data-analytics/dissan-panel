/* =====================================================================
   DASHBOARD DE VENTAS — mes a mes, con el costo.           20/11/2026
   =====================================================================
   Pedido textual del usuario: "basta de excel, tenemos el sistema
   armemos un dashboard general, y luego pestañas con dashboards con
   cada kpi indicadore que piden". Hoy eso lo arma abriendo varios Excel.

   SEIS PESTAÑAS: General · Provincia (que es la ZONA de Tango, la de su
   Excel) · Provincia fiscal (el domicilio del cliente) · Proveedor ·
   Línea · Cliente. Cada una con sus tarjetas, su grafico, su tabla de
   totales y su matriz mes a mes.

   SE PINTA UNA SOLA, LA ACTIVA. Pintar las seis y esconder cinco hace que
   para la puerta de pantallas cada tabla oculta sea «0 de N renglones sin
   control para llegar al resto»: corto 40 veces y tenia razon. Lo que esta
   en la pagina tiene que ser lo que se puede ver.

   EL COSTO NO SE REINVENTA. Sale de api_ventas_dashboard_v1, que lee
   ema.margen_medido -la vista del margen con la cuarentena del Tablero
   ya resuelta, el MISMO predicado- y filtra por las CUATRO calidades
   firmes. Medido contra lo que publica el Tablero en el mismo periodo:
   4.414 renglones = 4.414 · venta 4.509.380.029,02 = 4.509.380.029 ·
   costo 2.919.663.231,05 = 2.919.663.231. Y por una TERCERA ruta, la
   cuarentena escrita de nuevo sobre vista_margen_v2_oc: las seis cifras
   identicas.

   Y EL DENOMINADOR SE DECLARA ARRIBA DE TODO, siempre: el margen se mide
   sobre lo que DISSAN compra y stockea; la consignacion queda afuera.
   Publicar un margen sin decir sobre cuanto se midio es la falta del
   08/10, y aca seria peor porque el dashboard es para mostrarlo.
   Mas: la tabla «De donde sale el costo» pone los SEIS grupos con su
   plata -incluido el que no tiene con que costearse- porque el usuario
   pregunto «como que no sale el costo?» y la respuesta es un reparto
   medido, no una explicacion.
   ===================================================================== */

var DV = { datos: null, cargando: false, pestania: 'general', tope: 12, abierto: {},
           /* LO QUE ESTA ELEGIDO EN CADA SEGMENTADOR. Una lista VACIA significa
              «sin filtro», igual que en la base (`ema.sin_filtro`), y queda
              escrito en los dos lados para que no se separen con el tiempo. */
           elegido: { zona: [], provincia: [], proveedor: [], linea: [], cliente: [] },
           /* el texto tipeado en los segmentadores largos. Vive en el estado y
              no en el input, asi un repintado no se lo lleva. */
           buscar: {},
           /* EL TRAMO COMPARABLE. Su hoja RESUMEN pone 2024 -CUATRO meses-
              al lado de 2025 -doce- y de ahi sale un «+266%» que en el mismo
              tramo es +21%. Prendido, cada anio se corta del 1 de enero al
              dia/mes del «hasta». */
           tramo: false };

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

/* DENTRO DE UNA TABLA, «no hay dato» SE ESCRIBE CON EL GUION LARGO, NO CON
   UNA FRASE.                                                    20/11/2026
   Lo encontro la puerta del archivo bajado, con 8 fallas: poner «sin costo»
   en la columna Costo hace que la columna tenga texto y numeros mezclados, y
   el Excel la baja en formato General —sin el $— aunque las otras celdas sean
   plata. `bajarCelda` ya sabe que el guion largo es una celda VACIA, y una
   celda vacia no le rompe el tipo a la columna.
   En las TARJETAS se sigue escribiendo «sin costo», que ahi se lee mejor y no
   baja a ningun archivo. */
function dvCelda(n){
  if (n === null || n === undefined || isNaN(Number(n))) return '—';
  return dvPesos(n);
}
function dvCeldaPct(n){
  if (n === null || n === undefined || isNaN(Number(n))) return '—';
  return dvPct(n);
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

/* ---------- LO QUE NO SE MIRA, NO SE PINTA ----------        20/11/2026
   El usuario abrio la primera version y dijo, textual: «TE PARECE QUE VER UNA
   PANTALLA ASI, ESTA COHERENTE, SENCILLA???». No lo estaba: una tabla de 118
   clientes por 10 columnas arriba de todo, otra de 14 columnas abajo, seis
   tarjetas y un cartel amarillo, todo junto. Eso es un volcado, no un
   dashboard. Y no lo vi porque mido las CIFRAS y nunca miro la PANTALLA:
   veinte controles comprueban que cada numero coincida con la base y NINGUNO
   mira si se entiende.

   Un dashboard entra en una pantalla y se lee de un vistazo. Las tablas
   siguen estando —con su Excel y su PDF— pero PLEGADAS.
   Y plegar aca NO es esconder con `hidden`: el contenido NO SE PINTA hasta
   que se abre. Pintado y oculto, la puerta de pantallas lo leeria como «una
   tabla con N renglones y ningun control para llegar al resto» —el defecto
   del 28/10— y tendria razon. */
function dvPlegable(id, rotulo, cuantos, pintar){
  var abierto = !!DV.abierto[id], h = [];
  h.push('<div class="dv-mas"><button type="button" class="dv-mas-b' +
         (abierto ? ' abierta' : '') + '" data-plegar="' + dvEsc(id) + '">' +
         (abierto ? 'Ocultar ' : 'Ver ') + dvEsc(rotulo) +
         (cuantos ? ' <span class="dv-mas-n">' + dvEsc(cuantos) + '</span>' : '') +
         '</button></div>');
  if (abierto) h.push(pintar());
  return h.join('');
}

/* UNA ENVOLTURA PASA SIEMPRE TODOS LOS ARGUMENTOS, Y POR NOMBRE (11/11, 16/11).
   Con un argumento de menos, PostgREST resuelve por los nombres que quedan y
   puede dar en otra firma —o, con DEFAULT de por medio, quedar ambigua y
   romper la pantalla, como paso con Listas el 15/11 a la noche—. Los cinco
   arrays viajan siempre, vacios cuando no hay nada elegido: la base lee
   «vacio = sin filtro», declarado en `ema.sin_filtro`. */
function dvFiltros(){
  var v = function(id){ var e = document.getElementById(id); return e ? e.value : null; };
  return { p_desde: v('dvDesde') || null, p_hasta: v('dvHasta') || null,
           p_tope: Number(v('dvTope') || 12),
           p_zonas:       DV.elegido.zona.slice(),
           p_provincias:  DV.elegido.provincia.slice(),
           p_proveedores: DV.elegido.proveedor.slice(),
           p_lineas:      DV.elegido.linea.slice(),
           p_clientes:    DV.elegido.cliente.slice(),
           p_tramo_igual: !!DV.tramo };
}

/* las dimensiones de los segmentadores SON las pestanias menos «General»: una
   sola lista, no dos que se separen (la lista a mano del 14/10 y del 14/11). */
var DV_DIMS = DV_PESTANIAS.filter(function(p){ return p.id !== 'general'; });

/* LO QUE PEDI CONTRA LO QUE SE APLICO. Devuelve la lista de dimensiones que
   no coinciden, en castellano. El mapeo de nombres NO se escribe a mano: el
   argumento es `p_` + la clave, probando singular, `s` y `es`, y tiene que
   haber EXACTAMENTE UNO — si no, se DECLARA que esa no se pudo comparar en vez
   de darla por buena, que es el verde falso de siempre. */
function dvComoSeLlamaElArgumento(clave, f){
  var c = ['p_' + clave, 'p_' + clave + 's', 'p_' + clave + 'es'].filter(function(x){
    return Object.prototype.hasOwnProperty.call(f, x); });
  return c.length === 1 ? c[0] : null;
}
function dvDesacuerdo(f, elegido){
  if (!elegido) return ['la base no dijo por qué filtró'];
  var malos = [];
  for (var i = 0; i < DV_DIMS.length; i++){
    var dim = DV_DIMS[i], arg = dvComoSeLlamaElArgumento(dim.id, f);
    if (!arg){ malos.push(dim.rot + ' (no sé cómo se llama su argumento)'); continue; }
    var pedi = (f[arg] || []).slice().sort().join('\u0001');
    var hubo = ((elegido[dim.id]) || []).slice().sort().join('\u0001');
    if (pedi !== hubo) malos.push(dim.rot + ': pedí ' + (pedi ? '«' + pedi.replace(/\u0001/g,'», «') + '»' : 'nada') +
                                  ' y filtró por ' + (hubo ? '«' + hubo.replace(/\u0001/g,'», «') + '»' : 'nada'));
  }
  return malos;
}

function dvHayFiltro(){
  for (var i = 0; i < DV_DIMS.length; i++)
    if (DV.elegido[DV_DIMS[i].id].length) return true;
  return false;
}
function dvCuantosFiltros(){
  var n = 0;
  for (var i = 0; i < DV_DIMS.length; i++) n += DV.elegido[DV_DIMS[i].id].length;
  return n;
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
    var r = await rpc('api_ventas_dashboard_v2', f);
    var d = r && r.data;
    if (!d || d.ok === false) throw new Error((d && d.error) || 'la base no devolvió nada');

    /* LO QUE SE MUESTRA COMO FILTRO SALE DE LA BASE, NO DE MI MEMORIA.
       La base devuelve `elegido`: por que filtro DE VERDAD. Pintar mi propia
       variable seria decir «Filtrado por Proveedor X» mientras los numeros
       son de otra cosa — que es exactamente el defecto del 11/11, con
       `p_proveedores` y `p_provincias` cambiados de orden: PostgREST resolvia
       por nombre y el filtro de proveedor habria filtrado por provincia, en
       silencio. Y si lo que pedi NO es lo que se aplico, la pantalla lo
       GRITA en vez de taparlo. */
    DV.desacuerdo = dvDesacuerdo(f, d.elegido);
    if (d.elegido) for (var dd = 0; dd < DV_DIMS.length; dd++){
      var idd = DV_DIMS[dd].id;
      if (Object.prototype.hasOwnProperty.call(d.elegido, idd))
        DV.elegido[idd] = (d.elegido[idd] || []).slice();
    }
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

/* =====================================================================
   LOS SEGMENTADORES, QUE ES LO QUE EL VINO A PEDIR.         23/11/2026
   =====================================================================
   Su hoja RESUMEN tiene cuatro segmentadores arriba y los CRUZA. La version
   de antes tenia las mismas cuatro cabezas pero SUELTAS, una por pestania:
   se podia ver Mendoza, o ver Johnson, nunca «Johnson EN Mendoza», que es
   justo para lo que la usa. Textual: "TE PASE EL EXCEL, Y TE DIJE ARMA ALGO
   ASI".

   QUIEN CRUZA ES LA BASE, NO LA PANTALLA. Las opciones de cada segmentador
   salen medidas de `api_ventas_dashboard_v2`, sobre las filas que pasan todos
   los filtros MENOS el propio —asi se porta un segmentador de Excel: no se
   filtra a si mismo, o no se podria cambiar de eleccion—. Filtrar en el
   navegador seria filtrar sobre los 12 mas grandes que ya vinieron recortados,
   y daria otra cifra.

   MAS DE 20 OPCIONES SE ESCRIBEN, NO SE SCROLLEAN (regla de la casa). Medido
   hoy en 2026: zona 3 y provincia fiscal 6 van en botones; proveedor 45,
   linea 50 y cliente 118 van con un campo que filtra con cada letra. Y lo
   elegido queda SIEMPRE a la vista con su cruz, para sacarlo de un clic.

   LA LISTA DE RESULTADOS NO EXISTE EN LA PAGINA HASTA QUE SE TIPEA. Pintada y
   escondida, la puerta de pantallas la leeria como contenido sin control para
   llegar —el defecto del 28/10, y las 40 fallas del 20/11—. */
var DV_ESCRIBIR_DESDE = 20;
var DV_CUANTAS_MUESTRO = 12;

/* `\p{M}` con la bandera `u` en vez de la tirada de escapes: es lo que estaba
   anotado como pendiente para la Edge Function de listas, y aca se escribe
   bien de entrada. Sin tildes para que «ESPAÑOL» aparezca tipeando «espanol». */
function dvSinTildes(t){
  var x = String(t === null || t === undefined ? '' : t).toLowerCase();
  try { return x.normalize('NFD').replace(/\p{M}/gu, ''); } catch (e) { return x; }
}

/* un boton de opcion: el rotulo, su plata, y si esta elegida */
function dvSegBoton(dim, o, elegida){
  return '<button type="button" class="dv-op' + (elegida ? ' elegida' : '') +
         '" data-seg="' + dvEsc(dim) + '" data-val="' + dvEsc(o.clave) + '">' +
         '<span class="dv-op-r">' + dvEsc(o.clave) + '</span>' +
         '<span class="dv-op-v">' +
         (o.venta_universo === null || o.venta_universo === undefined
            ? 'sin ventas acá' : dvEsc(dvMillones(o.venta_universo))) +
         '</span>' + (elegida ? '<span class="dv-op-x">×</span>' : '') + '</button>';
}

/* los resultados de un segmentador largo. Se arma aparte porque al tipear se
   repinta SOLO esta caja: repintar la pantalla entera en cada letra perderia
   el foco y el texto. */
function dvSegResultados(dim, lista){
  var q = dvSinTildes(DV.buscar[dim] || '');
  if (!q) return '';
  var el = DV.elegido[dim] || [], hits = [];
  for (var i = 0; i < lista.length && hits.length < DV_CUANTAS_MUESTRO; i++){
    if (el.indexOf(lista[i].clave) >= 0) continue;        /* ya esta arriba */
    if (dvSinTildes(lista[i].clave).indexOf(q) < 0) continue;
    hits.push(lista[i]);
  }
  if (!hits.length)
    return '<div class="dv-seg-nada">Ninguno dice «' + dvEsc(DV.buscar[dim]) +
           '» entre los ' + lista.length + ' que vendieron en este período.</div>';
  var h = ['<div class="dv-ops">'];
  for (var j = 0; j < hits.length; j++) h.push(dvSegBoton(dim, hits[j], false));
  h.push('</div>');
  return h.join('');
}

function dvSegmentadores(d){
  var ops = d.opciones || {}, h = [];

  /* SI LO QUE PEDI NO ES LO QUE SE APLICO, NO SE SIGUE COMO SI NADA.
     Una pantalla que muestra un filtro y unos numeros que no son de ese filtro
     es peor que una pantalla rota: la rota se ve. */
  if (DV.desacuerdo && DV.desacuerdo.length){
    h.push('<div class="db-error">No publico estas cifras: la base no filtró por ' +
           'lo que le pedí. ' + dvEsc(DV.desacuerdo.join(' · ')) +
           '. Avisá y no uses estos números.</div>');
  }

  h.push('<div class="dv-segs">');
  for (var i = 0; i < DV_DIMS.length; i++){
    var dim = DV_DIMS[i], lista = ops[dim.id] || [], el = DV.elegido[dim.id] || [];
    var largo = lista.length > DV_ESCRIBIR_DESDE;

    h.push('<div class="dv-seg" data-caja="' + dim.id + '">');
    h.push('<div class="dv-seg-t">' + dvEsc(dim.rot) +
           '<small>' + dvEsc(dim.nota) + '</small></div>');

    /* LO ELEGIDO VA PRIMERO Y SIEMPRE, aunque se haya quedado sin ventas: si
       desapareciera, el usuario queda encerrado en un filtro que no puede
       soltar. La base lo devuelve igual, con la plata en nulo. */
    if (el.length){
      h.push('<div class="dv-ops puestos">');
      for (var k = 0; k < el.length; k++){
        var o = null;
        for (var m = 0; m < lista.length; m++) if (lista[m].clave === el[k]) o = lista[m];
        h.push(dvSegBoton(dim.id, o || { clave: el[k], venta_universo: null }, true));
      }
      h.push('</div>');
    }

    if (largo){
      h.push('<input type="text" class="dv-seg-q" data-segq="' + dim.id +
             '" value="' + dvEsc(DV.buscar[dim.id] || '') +
             '" placeholder="buscar entre ' + lista.length + '">');
      h.push('<div class="dv-seg-res" data-segres="' + dim.id + '">' +
             dvSegResultados(dim.id, lista) + '</div>');
    } else if (!lista.length){
      h.push('<div class="dv-seg-nada"><b>Ninguno.</b> No hay ventas de ' +
             dvEsc(dim.plural.toLowerCase()) + ' con lo que está elegido.</div>');
    } else {
      h.push('<div class="dv-ops">');
      for (var q2 = 0; q2 < lista.length; q2++)
        if (el.indexOf(lista[q2].clave) < 0)
          h.push(dvSegBoton(dim.id, lista[q2], false));
      h.push('</div>');
    }
    h.push('</div>');
  }
  h.push('</div>');

  /* EL RENGLON QUE DICE QUE ESTA PUESTO. Una cifra filtrada que no dice sobre
     que se filtro es la falta del 08/10 con otra ropa: el que mira la pantalla
     dos minutos despues no sabe si ese $1.228 M es todo o es un recorte. */
  var s2 = d.resumen || {};
  if (dvHayFiltro()){
    var partes = [];
    for (var z = 0; z < DV_DIMS.length; z++){
      var e2 = DV.elegido[DV_DIMS[z].id];
      if (e2.length) partes.push('<b>' + dvEsc(DV_DIMS[z].rot) + ':</b> ' +
        dvEsc(e2.length > 3 ? e2.slice(0,3).join(', ') + ' y ' + (e2.length-3) + ' más'
                            : e2.join(', ')));
    }
    h.push('<div class="dv-puesto">' +
      '<span class="dv-puesto-t">Filtrado por ' + partes.join(' · ') + '</span>' +
      '<button type="button" class="dv-limpiar" id="dvLimpiar">' +
      (dvCuantosFiltros() === 1 ? 'Quitar el filtro'
                                : 'Quitar los ' + dvCuantosFiltros() + ' filtros') +
      '</button></div>');
  }
  return h.join('');
}

/* =====================================================================
   AÑO CONTRA AÑO — su segmentador de línea de tiempo.
   Va sobre TODA la historia con los segmentadores puestos, y NO con el rango
   de fechas: si fuera con el rango, elegir «2026» dejaria un solo año y la
   comparacion no existiria. Que el rango no manda aca va escrito al lado del
   numero, no en mi cabeza. ===================================================*/
function dvAnioContraAnio(d){
  var a = d.anios || [], h = [];
  h.push('<div class="db-sec">Año contra año' +
         '<small>toda la historia, con los segmentadores puestos. ' +
         'El rango de fechas de arriba NO entra acá: si entrara, elegir un año ' +
         'dejaría un solo año y no habría con qué comparar.</small></div>');
  if (!a.length){
    h.push('<div class="db-pie"><b>Ninguno.</b> No hay ventas con lo que está ' +
           'elegido, así que no hay años que comparar.</div>');
    return h.join('');
  }
  h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>' +
         '<th>Año</th><th class="der">Renglones</th><th class="der">Facturado</th>' +
         '<th class="der">Contra el año anterior</th>' +
         '<th class="der">Con costo</th><th class="der">Margen</th>' +
         '<th class="der">Margen %</th></tr></thead><tbody>');
  var tR=0,tU=0,tV=0,tM=0;
  for (var i = 0; i < a.length; i++){
    var x = a[i], ant = i > 0 ? Number(a[i-1].venta_universo) || 0 : 0;
    var hoy = Number(x.venta_universo) || 0;
    tR += Number(x.renglones)||0; tU += hoy;
    tV += Number(x.venta)||0; tM += Number(x.margen)||0;
    h.push('<tr><td>' + dvEsc(x.anio) + '</td>' +
      '<td class="der">' + dvEsc(dvNum(x.renglones)) + '</td>' +
      '<td class="der">' + dvEsc(dvCelda(x.venta_universo)) + '</td>' +
      '<td class="der">' + (ant ? dvEsc(dvPct(100*(hoy-ant)/ant)) : '—') + '</td>' +
      '<td class="der">' + dvEsc(dvCelda(x.venta)) + '</td>' +
      '<td class="der">' + dvEsc(dvCelda(x.margen)) + '</td>' +
      '<td class="der">' + dvEsc(dvCeldaPct(x.margen_pct)) + '</td></tr>');
  }
  h.push('</tbody><tfoot><tr><td><b>Todo</b></td>' +
    '<td class="der"><b>' + dvEsc(dvNum(tR)) + '</b></td>' +
    '<td class="der"><b>' + dvEsc(dvCelda(tU)) + '</b></td>' +
    '<td class="der">—</td>' +
    '<td class="der"><b>' + dvEsc(dvCelda(tV)) + '</b></td>' +
    '<td class="der"><b>' + dvEsc(dvCelda(tM)) + '</b></td>' +
    '<td class="der"><b>' + dvEsc(tV ? dvPct(100*tM/tV) : '—') + '</b></td>' +
    '</tr></tfoot></table></div>');
  h.push('<div class="db-pie">El % compara contra el año de arriba. ' +
         '<b>2026 está en curso</b>: comparar un año a medias contra uno entero ' +
         'da una caída que no existe.</div>');
  return h.join('');
}

function dvPintar(d){
  var h = [];
  var s = d.resumen || {};

  /* EL DENOMINADOR, ARRIBA DE TODO Y SIEMPRE.
     Sin periodo no hay cobertura que publicar, y «hay costo medido en $—» no
     es una frase: ahi se dice que no se midio, que es otra cosa. */
  /* UNA LINEA, NO UN CARTEL. El denominador va SIEMPRE —un margen sin el
     miente (08/10)— pero cuatro renglones de texto amarillo arriba de todo le
     ganan la pantalla a las cifras. El detalle vive plegado, mas abajo. */
  var cob = s.cobertura_plata_pct;
  h.push('<div class="dv-nota">' +
         ((cob === null || cob === undefined)
            ? 'Sin ventas en este período: no hay cobertura de costo que medir.'
            : 'El margen se mide sobre los renglones que tienen costo: <b>$' +
              dvEsc(Number(cob).toFixed(0)) + ' de cada $100 facturados</b>. ' +
              'Lo que falta es consignación, que DISSAN no compra.') + '</div>');

  /* LOS SEGMENTADORES, ARRIBA DE LAS PESTAÑAS Y VALIENDO PARA TODAS.
     Es la forma de su RESUMEN: se elige arriba y todo lo de abajo se
     recalcula. Van antes de las pestañas a proposito —si fueran adentro de
     cada una, elegir en «Proveedor» y pasar a «Cliente» haria dudar de si el
     filtro sigue puesto—. */
  h.push(dvSegmentadores(d));

  /* las pestañas */
  h.push('<div class="dv-pestanias">');
  for (var i = 0; i < DV_PESTANIAS.length; i++){
    var p = DV_PESTANIAS[i];
    h.push('<button type="button" class="dv-pest' + (p.id === DV.pestania ? ' activa' : '') +
           '" data-pest="' + p.id + '">' + dvEsc(p.rot) +
           '<small>' + dvEsc(p.nota) + '</small></button>');
  }
  h.push('</div>');

  /* SE PINTA UNA SOLA HOJA, LA ACTIVA.                        20/11/2026
     La primera version las pintaba a las seis y escondia cinco con `hidden`.
     La puerta de pantallas corto con 40 fallas y TENIA RAZON: para ella esas
     tablas mostraban «0 de 11 renglones y ningun control para llegar al
     resto», que es exactamente el defecto del 28/10 que esa puerta existe
     para agarrar. Ella no puede saber que el control es el boton de la
     pestaña, y yo no voy a enseñarle a mirar para otro lado: lo que esta en
     la pagina tiene que ser lo que se puede ver. De paso se van las barras de
     Excel y PDF de tablas que nadie estaba mirando. */
  var p2 = null;
  for (var j = 0; j < DV_PESTANIAS.length; j++)
    if (DV_PESTANIAS[j].id === DV.pestania) p2 = DV_PESTANIAS[j];
  if (!p2) { p2 = DV_PESTANIAS[0]; DV.pestania = p2.id; }
  h.push('<div class="dv-hoja" data-hoja="' + p2.id + '">');
  h.push(p2.id === 'general' ? dvGeneral(d) : dvCorte(d, p2));
  h.push('</div>');
  return h.join('');
}

/* ---------- DE DONDE SALE EL COSTO, Y QUE QUEDA SIN COSTEAR ----------
   Dicho por el usuario el 20/11: «el costo tiene que ser para todo, cómo que
   no sale? si todo tiene precio de costo». Medido: en 2026 NO todo lo tiene,
   y esta tabla es la respuesta con la plata adelante en vez de una
   explicacion. Seis grupos, mecanicos, que SUMAN el facturado entero —la
   base lo controla: renglones y plata de los seis contra el universo—.
   Importa tanto lo que se puede costear como lo que no: los 365 renglones de
   consignacion dan 65,2% de margen con un costo de mas de 180 dias, que es
   una cifra creible y mal, y eso solo se ve si el reparto esta a la vista.
   La seccion va SIEMPRE y dice «Ninguno» con el motivo (16/11). */
function dvDeDondeSaleElCosto(d){
  var c = d.costos || [], h = [];
  h.push('<div class="db-sec">De dónde sale el costo' +
         '<small>los ' + (c.length || 'cero') + ' grupos suman el facturado entero. ' +
         'El margen que publica la pantalla sale sólo del primero, y el % del ' +
         'pie va sobre lo que tiene costo, no sobre todo lo facturado.</small></div>');
  if (!c.length){
    h.push('<div class="db-pie"><b>Ninguno.</b> No hay renglones en ese período, ' +
           'así que no hay costo que repartir.</div>');
    return h.join('');
  }
  var tV = 0, tC = 0, tM = 0, tR = 0, sinCosto = 0, conCosto = 0;
  for (var i = 0; i < c.length; i++){
    tV += Number(c[i].venta) || 0; tC += Number(c[i].costo) || 0;
    tM += Number(c[i].margen) || 0; tR += Number(c[i].renglones) || 0;
    if (c[i].costo === null || c[i].costo === undefined) sinCosto += Number(c[i].venta) || 0;
    else conCosto += Number(c[i].venta) || 0;
  }
  h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>' +
         /* SIN `data-plata` NI `data-total`: aca las FILAS suman al pie, no las
            columnas al renglon. `data-plata` significa «parte del total del
            renglon» (20/11) y marcar Facturado como parte Y como total haria
            que el control se comparara consigo mismo y pasara siempre.
            Esta grilla no tiene descomposicion aditiva por renglon: se declara. */
         '<th>De dónde sale</th><th class="der">Renglones</th>' +
         '<th class="der">Facturado</th><th class="der">% de lo facturado</th>' +
         '<th class="der">Costo</th><th class="der">Margen</th><th class="der">Margen %</th>' +
         '</tr></thead><tbody>');
  for (var j = 0; j < c.length; j++){
    var x = c[j];
    h.push('<tr><td>' + dvEsc(x.de_donde) + '</td>' +
           '<td class="der">' + dvEsc(dvNum(x.renglones)) + '</td>' +
           '<td class="der">' + dvEsc(dvCelda(x.venta)) + '</td>' +
           '<td class="der">' + dvEsc(dvCeldaPct(x.pct_facturado)) + '</td>' +
           '<td class="der">' + dvEsc(dvCelda(x.costo)) + '</td>' +
           '<td class="der">' + dvEsc(dvCelda(x.margen)) + '</td>' +
           '<td class="der">' + dvEsc(dvCeldaPct(x.margen_pct)) + '</td></tr>');
  }
  h.push('</tbody><tfoot><tr><td><b>Todo lo facturado</b></td>' +
         '<td class="der"><b>' + dvEsc(dvNum(tR)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(dvCelda(tV)) + '</b></td>' +
         '<td class="der"><b>100,00%</b></td>' +
         '<td class="der"><b>' + dvEsc(dvCelda(tC)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(dvCelda(tM)) + '</b></td>' +
         /* EL MARGEN DEL PIE VA SOBRE LA VENTA QUE TIENE COSTO, NO SOBRE TODO.
            Dividir el margen por TODO lo facturado mezcla dos denominadores y
            da un numero mas chico que el de cualquiera de sus propios
            renglones: es la falta del 08/10 adentro de la tabla que existe
            justamente para evitarla. El denominador va escrito en el rotulo. */
         '<td class="der"><b>' + dvEsc(conCosto ? dvPct(100*tM/conCosto) : '—') + '</b></td>' +
         '</tr></tfoot></table></div>');
  h.push('<div class="db-pie">Lo que <b>no tiene con qué costearse</b> en este ' +
         'período: <b>' + dvEsc(dvPesos(sinCosto)) + '</b>' +
         (tV ? ' (' + dvEsc(dvPct(100*sinCosto/tV)) + ' de lo facturado)' : '') +
         '. Casi todo es consignación: el proveedor deja el material y DISSAN no lo ' +
         'compra, así que no hay factura de compra de dónde sacar un precio. ' +
         'Un costo tomado de una compra posterior a la venta no se usa nunca.</div>');
  return h.join('');
}

/* ---------- pestaña GENERAL ---------- */
function dvGeneral(d){
  var s = d.resumen || {}, meses = d.meses || [], h = [];

  var n = d.netas || null;

  /* CUATRO TARJETAS. Eran seis y la pantalla no se leia. «Con costo medido» y
     «Costo» viven en la tabla del costo, plegada: el que quiere el reparto lo
     abre, y el que mira el dashboard ve lo que vendio y lo que gano. */
  h.push('<div class="dv-kpis">');
  h.push(dvKpi('Facturado', dvMillones(s.venta_universo), dvPesos(s.venta_universo)));
  /* LA VENTA NETA, QUE ES LA CIFRA DE SU RESUMEN.            23/11/2026
     Medido contra su tabla dinamica al corte 07/10/2026: con el facturado
     BRUTO el dashboard daba $43.835.634,21 de mas en 14 clientes; con el neto
     la peor diferencia es de DIEZ CENTAVOS y el total difiere UN CENTAVO.
     Y cada peso de esos 43 millones quedo explicado: son las notas de credito
     que su Excel descuenta, mas DOS notas de DEBITO de COOP .FARMACEUTICA por
     $447.500 que SUMAN —el unico cliente que no cerraba con las de credito—.
     Ahora el neto se arma RENGLON POR RENGLON desde ema.mv_ventas_detalle, asi
     que a diferencia de la ruta por cabeceras SI se puede segmentar. */
  var nc = Math.abs(Number(s.notas_credito) || 0);
  var nd = Number(s.notas_debito) || 0;
  h.push(dvKpi('Venta neta', dvMillones(s.neto),
    (nc || nd) ? 'facturado ' + dvMillones(s.venta_universo) +
                 (nc ? ' − N/C ' + dvMillones(nc) : '') +
                 (nd ? ' + N/D ' + dvMillones(nd) : '')
               : 'no hubo notas de crédito ni de débito en el período'));
  h.push(dvKpi('Margen', dvMillones(s.margen), dvPesos(s.margen)));
  h.push(dvKpi('Margen %', dvPct(s.margen_pct), 'sobre lo que tiene costo'));
  h.push('</div>');

  /* LAS DOS PANTALLAS DE VENTAS TIENEN QUE PODER PONERSE AL LADO.
     Este dashboard corta sobre el facturado BRUTO —asi es como estan armados
     los cortes por provincia, proveedor, linea y cliente— y ventas.html
     publica la VENTA NETA. Sin esta linea, el usuario encuentra dos cifras
     distintas para «ventas 2026» y no sabe cual creer. Y de paso queda a la
     vista un control de DOS RUTAS INDEPENDIENTES: el facturado por las
     cabeceras de gva12 contra el de los renglones de gva53. */
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

  /* UN SOLO GRAFICO, GRANDE. Dos chicos al lado se leen peor que uno bien
     hecho, y el margen mes a mes ya se ve en el tooltip de cada barra. */
  h.push('<div class="dv-grafs uno"><div><div class="dv-graf-t">Facturado mes a mes</div>' +
    dbGrafBarras(bV, 'et', 'val',
      function(f){ return dvMes(f.m.mes) + ': ' + dvPesos(f.val) + ' · ' +
                          dvNum(f.m.renglones) + ' renglones' +
                          (f.m.margen === null ? '' : ' · margen ' + dvPct(f.m.margen_pct)); },
      function(f){ return dvMillones(f.val); }, '', 70, 26) + '</div></div>');

  /* y de aca para abajo, TODO PLEGADO */
  h.push(dvPlegable('costo', 'de dónde sale el costo',
                    (d.costos || []).length + ' grupos',
                    function(){ return dvDeDondeSaleElCosto(d); }));

  /* EL CONTROL: las DOS rutas del neto. La de arriba sale de los RENGLONES; la
     de `ema.ventas_netas` sale de las CABECERAS de los comprobantes. Dos
     caminos que no se tocan: si dan lo mismo, el neto esta controlado contra
     algo que no es el mismo calculo (que es lo unico que cuenta como control).
     Con un segmentador puesto la ruta por cabeceras no existe —una cabecera no
     tiene proveedor ni linea— y entonces el bloque lo DICE en vez de faltar. */
  if (!n) h.push(dvPlegable('netas', 'por qué acá no hay segunda ruta del neto', '',
    function(){
      return '<div class="db-pie">La venta neta de arriba sale de los ' +
        '<b>renglones</b>, así que se puede segmentar. La segunda ruta —la de ' +
        'ventas.html— sale de las <b>cabeceras</b> de los comprobantes, y una ' +
        'cabecera no tiene proveedor ni línea: con un segmentador puesto no hay ' +
        'con qué contrastarla. Quitá los segmentadores y las dos rutas vuelven ' +
        'a compararse acá.</div>';
    }));

  if (n) h.push(dvPlegable('netas', 'cómo se llega a la venta neta', '',
    function(){
      return '<div class="db-pie">Acá los cortes van sobre lo facturado <b>bruto</b>: ' +
        dvEsc(dvPesos(s.venta_universo)) + ' en ' + dvEsc(dvNum(n.facturas)) +
        ' facturas. Restando ' + dvEsc(dvNum(n.notas_credito)) + ' notas de crédito (' +
        dvEsc(dvPesos(n.notas_credito_neto)) + ') y sumando ' + dvEsc(dvNum(n.notas_debito)) +
        ' notas de débito (' + dvEsc(dvPesos(n.notas_debito_neto)) + ') da <b>' +
        dvEsc(dvPesos(n.neto)) + '</b>, que es lo que muestra la pantalla de Ventas. ' +
        'Por los <b>renglones</b> —la ruta que sí se puede segmentar— el mismo neto da ' +
        dvEsc(dvPesos(s.neto)) + ': <b>' +
        dvEsc(dvPesos(Math.round(((Number(s.neto)||0) - (Number(n.neto)||0)) * 100) / 100)) +
        '</b> entre las dos rutas. ' +
        'El mismo facturado medido por las cabeceras de los comprobantes da ' +
        dvEsc(dvPesos(n.facturas_neto)) + ': <b>' + dvEsc(dvPesos(n.contra_el_universo)) +
        '</b> de diferencia entre las dos rutas.</div>';
    }));

  h.push(dvPlegable('mesames', 'el mes a mes en una tabla',
                    dvNum(meses.length) + ' meses',
                    function(){ return dvGeneralTabla(meses); }));

  h.push(dvPlegable('anios', 'el año contra año',
                    dvNum((d.anios || []).length) + ' años',
                    function(){ return dvAnioContraAnio(d); }));
  return h.join('');
}

function dvGeneralTabla(meses){
  var h = [];
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
           '<td class="der">' + dvEsc(dvCelda(m.venta_universo)) + '</td>' +
           '<td class="der">' + dvEsc(dvCelda(m.venta)) + '</td>' +
           '<td class="der">' + dvEsc(dvCelda(m.costo)) + '</td>' +
           '<td class="der">' + dvEsc(dvCelda(m.margen)) + '</td>' +
           '<td class="der">' + dvEsc(dvCeldaPct(m.margen_pct)) + '</td></tr>');
  }
  h.push('</tbody><tfoot><tr><td><b>Total</b></td>' +
         '<td class="der"><b>' + dvEsc(dvNum(tR)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(dvCelda(tU)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(dvCelda(tV)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(dvCelda(tC)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(dvCelda(tM)) + '</b></td>' +
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
  var nE = 0;
  for (var i3 = 0; i3 < tot.length; i3++) nE += Number(tot[i3].neto) || 0;
  nE = Math.round(nE * 100) / 100;

  h.push('<div class="dv-kpis">');
  /* el rotulo es el plural pelado: «Provincias distintos» no concuerda y
     «distintas» obligaria a declararle genero a cada corte. Lo que importa
     es el numero, y el «en el período» de abajo ya dice de que habla. */
  h.push(dvKpi('Facturado', dvMillones(vU), dvPesos(vU)));
  h.push(dvKpi('Venta neta', dvMillones(nE), 'descontando las notas de crédito'));
  h.push(dvKpi('Margen', dvMillones(mA), vM ? dvPct(100*mA/vM) + ' sobre lo que tiene costo' : 'sin costo'));
  /* «El más grande» se fue: es la primera barra del grafico de abajo, y una
     tarjeta que repite lo que ya se ve es una tarjeta de menos en la pantalla. */
  h.push(dvKpi(p.plural, dvNum(tot.length), 'en el período'));
  h.push('</div>');

  /* LA TABLA DE SU RESUMEN VA ABIERTA, NO PLEGADA. Es lo que viene a ver:
     hacerle apretar un botón para llegar a lo que pidió es esconderlo. */
  h.push(dvMatriz(d, p));

  /* EL GRÁFICO DE BARRAS SE FUE DE ACÁ. Decía lo mismo que la columna
     «% Particip» de la tabla, uno debajo del otro, y era la mitad de lo que
     hacía que la pantalla se leyera como un volcado. Sigue en General, que
     es «la foto del período» y ahí sí agrega. */

  h.push(dvPlegable('corte-' + id, 'con el costo y el margen de cada uno',
                    dvNum(tot.length) + ' ' + p.plural.toLowerCase(),
                    function(){ return dvCorteTabla(p, tot, vU, vM, cO, mA); }));
  h.push(dvPlegable('mes-' + id, 'el mes a mes', '',
                    function(){ return dvCorteMesAMes(d, p, serie); }));
  return h.join('');
}

/* =====================================================================
   LA MATRIZ DE SU HOJA RESUMEN — dimensión × año.          23/11/2026
   =====================================================================
   ABRÍ EL EXCEL QUE ME PASÓ, cosa que no había hecho en tres días, y su
   hoja RESUMEN son DOS tablas, no las doce columnas que yo había puesto:

     1) PROVINCIA × AÑO, cada año con «% Particip» y «Neto Facturado»,
        más «Total % Particip» y «Total Neto Facturado» al final.
     2) CLIENTE × neto, la lista ENTERA de 114 de mayor a menor.

   La segunda es la primera con un solo año, así que esta tabla cubre las
   dos. Medido contra su hoja al corte 07/10/2026: **114 de 114 presentes,
   0 que falten, 0 de más, la peor diferencia $0,10** y el total $0,19 sobre
   $5.899 millones. Y la tabla de provincias: las 12 celdas entre −$0,05 y
   +$0,29, con el total general $0,60 sobre $14.045 millones.

   POR QUÉ ESTA Y NO LA QUE YO TENÍA. Su reclamo, mirando mi captura, fue
   «TE PARECE QUE VER UNA PANTALLA ASI, ESTA COHERENTE, SENCILLA???». Tenía
   razón: 12 columnas, la tabla cortada a la derecha, los nombres partidos en
   tres renglones y una columna de notas llena de guiones. Con tres años son
   NUEVE columnas y con uno son CINCO. Entra, y es lo que él ya lee.

   EL % NO VIENE DE LA BASE: se calcula acá como el neto de la fila sobre el
   total de ESE año. Mandarlo sería mandar dos veces el mismo número y dejar
   que las dos copias se separen con el tiempo (30/10, `listas`).

   `data-plata` EN LOS NETOS DE CADA AÑO Y `data-total` EN EL TOTAL: acá sí
   son partes que suman el total de la fila —al revés de la grilla del 20/11,
   donde «Precio unitario» no lo era—, así que la puerta del archivo bajado
   controla sola que 2024 + 2025 + 2026 dé el total, renglón por renglón. */
/* CUANTO CUBRE CADA AÑO, escrito debajo del año.             23/11/2026
   Sale medido de la base (`cobertura`), no de una cuenta mía. Es el renglón
   que a su hoja RESUMEN le falta y que hace que «+266%» se lea como
   crecimiento cuando es 4 meses contra 12. */
function dvMesesDe(d, anio){
  var c = (d.cobertura || []);
  for (var i = 0; i < c.length; i++)
    if (String(c[i].anio) === String(anio)){
      var m = Number(c[i].meses) || 0;
      return m >= 11.8 ? 'el año entero' : dvNum(m) + ' meses';
    }
  return '';
}

/* ¿LOS AÑOS CUBREN LO MISMO? Mecánico: si el más corto y el más largo
   difieren en más de medio mes, compararlos de frente engaña. */
function dvTramosDisparejos(d){
  var c = (d.cobertura || []), ms = [];
  for (var i = 0; i < c.length; i++) ms.push(Number(c[i].meses) || 0);
  if (ms.length < 2) return 0;
  var mn = Math.min.apply(null, ms), mx = Math.max.apply(null, ms);
  return (mx - mn) > 0.5 ? Math.round((mx - mn) * 10) / 10 : 0;
}

function dvMatriz(d, p){
  var m = (d[p.id] || {}).matriz || [], h = [];
  if (!m.length){
    return '<div class="db-sec">' + dvEsc(p.rot) + ' × año' +
           '<small>la tabla de tu RESUMEN</small></div>' +
           '<div class="db-pie"><b>Ninguno.</b> No hay ventas con lo que está ' +
           'elegido, así que la tabla no tiene filas.</div>';
  }

  /* pivotar: una fila por clave, una columna por año */
  var anios = [], porClave = {};
  for (var i = 0; i < m.length; i++){
    var r = m[i], a = String(r.anio);
    if (anios.indexOf(a) < 0) anios.push(a);
    if (!porClave[r.clave]) porClave[r.clave] = { clave: r.clave, a: {}, total: 0 };
    porClave[r.clave].a[a] = Number(r.neto) || 0;
    porClave[r.clave].total += Number(r.neto) || 0;
  }
  anios.sort();
  var filas = [];
  for (var k in porClave) if (Object.prototype.hasOwnProperty.call(porClave, k)){
    porClave[k].total = Math.round(porClave[k].total * 100) / 100;
    filas.push(porClave[k]);
  }
  /* DE MAYOR A MENOR POR EL TOTAL, que es como él ordenó la tabla que de
     verdad usa (la de los 114 clientes). Su tabla de provincias está
     alfabética, pero son tres filas y el orden no cambia nada. */
  filas.sort(function(x, y){ return y.total - x.total; });

  var tA = {}, tG = 0;
  for (var j = 0; j < filas.length; j++){
    for (var z = 0; z < anios.length; z++){
      var an = anios[z];
      tA[an] = Math.round(((tA[an] || 0) + (filas[j].a[an] || 0)) * 100) / 100;
    }
    tG += filas[j].total;
  }
  tG = Math.round(tG * 100) / 100;
  var unAnio = anios.length === 1;

  h.push('<div class="db-sec">' + dvEsc(p.rot) + (unAnio ? '' : ' × año') +
         '<small>Neto Facturado = facturas − notas de crédito + notas de débito, ' +
         'con ' + dvNum(filas.length) + ' ' + dvEsc(p.plural.toLowerCase()) +
         ' de mayor a menor.</small></div>');

  /* EL AVISO QUE SU EXCEL NO TIENE. Aparece sólo cuando los años cubren
     tramos distintos, así no grita todos los días —una puerta que grita
     siempre se apaga— y trae el botón que lo arregla al lado. */
  if (!unAnio){
    var desp = dvTramosDisparejos(d);
    h.push('<div class="dv-tramo' + (desp ? ' avisa' : '') + '">');
    if (desp){
      h.push('<span class="dv-tramo-t"><b>Ojo:</b> estos años no cubren lo mismo — ' +
             'hay ' + dvNum(desp) + ' meses de diferencia entre el más corto y el ' +
             'más largo. Comparados de frente, el crecimiento que muestran no es real.' +
             '</span>');
    } else {
      h.push('<span class="dv-tramo-t">Los años cubren el mismo tramo, así que se ' +
             'pueden comparar de frente.</span>');
    }
    h.push('<button type="button" class="dv-tramo-b' + (DV.tramo ? ' puesto' : '') +
           '" id="dvTramo">' +
           (DV.tramo ? 'Viendo el mismo tramo en todos — volver a los años completos'
                     : 'Comparar el mismo tramo en todos') + '</button></div>');
  }

  h.push('<div class="db-tb-caja"><table class="db-tb dv-mx">');
  /* dos renglones de encabezado, como el suyo: arriba el año, abajo qué trae */
  if (!unAnio){
    h.push('<thead><tr><th rowspan="2">' + dvEsc(p.rot) + '</th>');
    for (var y = 0; y < anios.length; y++)
      h.push('<th colspan="2" class="der dv-mx-anio">' + dvEsc(anios[y]) +
             '<small>' + dvEsc(dvMesesDe(d, anios[y])) + '</small></th>');
    h.push('<th colspan="2" class="der dv-mx-anio dv-mx-tot">Total</th></tr><tr>');
    for (var y2 = 0; y2 <= anios.length; y2++)
      h.push('<th class="der">% Particip</th><th class="der">Neto Facturado</th>');
    h.push('</tr></thead>');
  } else {
    h.push('<thead><tr><th>' + dvEsc(p.rot) + '</th>' +
           '<th class="der">% Particip</th><th class="der">Neto Facturado</th>' +
           '</tr></thead>');
  }

  h.push('<tbody>');
  for (var f = 0; f < filas.length; f++){
    var x = filas[f];
    h.push('<tr><td>' + dvEsc(x.clave) + '</td>');
    if (!unAnio) for (var c = 0; c < anios.length; c++){
      var va = x.a[anios[c]], tot = tA[anios[c]];
      h.push('<td class="der dv-mx-pct">' +
             (va === undefined || !tot ? '—' : dvEsc(dvPct(100 * va / tot))) + '</td>' +
             '<td class="der" data-plata="1">' +
             (va === undefined ? '—' : dvEsc(dvCelda(Math.round(va * 100) / 100))) + '</td>');
    }
    h.push('<td class="der dv-mx-pct">' + (tG ? dvEsc(dvPct(100 * x.total / tG)) : '—') + '</td>' +
           '<td class="der" ' + (unAnio ? 'data-plata="1"' : 'data-total="1"') + '>' +
           dvEsc(dvCelda(x.total)) + '</td></tr>');
  }
  h.push('</tbody><tfoot><tr><td><b>Total general</b></td>');
  if (!unAnio) for (var t2 = 0; t2 < anios.length; t2++)
    h.push('<td class="der dv-mx-pct"><b>100,0%</b></td>' +
           '<td class="der"><b>' + dvEsc(dvCelda(tA[anios[t2]])) + '</b></td>');
  h.push('<td class="der dv-mx-pct"><b>100,0%</b></td>' +
         '<td class="der"><b>' + dvEsc(dvCelda(tG)) + '</b></td></tr></tfoot></table></div>');
  return h.join('');
}

/* la tabla completa del corte, que solo se pinta si se la pide */
function dvCorteTabla(p, tot, vU, vM, cO, mA){
  var rot = p.rot, h = [];
  h.push('<div class="db-sec">' + dvEsc(rot) + ' · total del período' +
         '<small>' + dvNum(tot.length) + ' en total, de mayor a menor. ' +
         'La <b>Venta neta</b> es facturado menos notas de crédito más notas de ' +
         'débito: es la columna que hay que poner al lado de la tabla dinámica ' +
         'del Excel.</small></div>');
  h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>' +
         '<th>#</th><th>' + dvEsc(rot) + '</th><th class="der">Renglones</th>' +
         /* SIN `data-plata`: Facturado, N/C y Neto NO son tres partes que
            sumen el total del renglon —el neto es facturado MAS las notas—.
            Marcarlas como partes haria que el control del archivo bajado
            sumara 2x el facturado contra el total. Es la cagada del 20/11 con
            «Precio unitario», y esta grilla tampoco tiene descomposicion
            aditiva: se declara en vez de inventarle una. */
         '<th class="der">Facturado</th>' +
         '<th class="der">N/C y N/D</th><th class="der">Venta neta</th>' +
         '<th class="der">Particip.</th>' +
         /* LA COBERTURA VA AL LADO DEL MARGEN, POR CORTE, NO SOLO ARRIBA.
            La consignacion no se reparte pareja: hay proveedores y clientes
            donde es casi todo lo facturado. Un 65% de margen medido sobre el
            12% de lo que ese cliente compro no es el margen de ese cliente, y
            sin esta columna se lee como si lo fuera. Es la regla del 08/10
            aplicada renglon por renglon. */
         '<th class="der">Con costo</th><th class="der">% con costo</th>' +
         '<th class="der">Costo</th>' +
         '<th class="der">Margen</th><th class="der">Margen %</th>' +
         '</tr></thead><tbody>');
  for (var j = 0; j < tot.length; j++){
    var t = tot[j];
    h.push('<tr><td class="der">' + (j+1) + '</td>' +
           '<td>' + dvEsc(t.clave) + '</td>' +
           '<td class="der">' + dvEsc(dvNum(t.renglones)) + '</td>' +
           '<td class="der">' + dvEsc(dvCelda(t.venta_universo)) + '</td>' +
           '<td class="der">' + dvEsc(Number(t.notas) ? dvCelda(t.notas) : '—') + '</td>' +
           '<td class="der">' + dvEsc(dvCelda(t.neto)) + '</td>' +
           '<td class="der">' + dvEsc(vU ? dvPct(100*(Number(t.venta_universo)||0)/vU) : '—') + '</td>' +
           '<td class="der">' + dvEsc(dvCelda(t.venta)) + '</td>' +
           '<td class="der">' + dvEsc(t.venta_universo
               ? dvPct(100*(Number(t.venta)||0)/Number(t.venta_universo)) : '—') + '</td>' +
           '<td class="der">' + dvEsc(dvCelda(t.costo)) + '</td>' +
           '<td class="der">' + dvEsc(dvCelda(t.margen)) + '</td>' +
           '<td class="der">' + dvEsc(dvCeldaPct(t.margen_pct)) + '</td></tr>');
  }
  var nT = 0, ncT = 0;
  for (var z2 = 0; z2 < tot.length; z2++){
    nT += Number(tot[z2].neto) || 0; ncT += Number(tot[z2].notas) || 0;
  }
  h.push('</tbody><tfoot><tr><td></td><td><b>Total</b></td><td></td>' +
         '<td class="der"><b>' + dvEsc(dvCelda(vU)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(ncT ? dvCelda(Math.round(ncT*100)/100) : '—') + '</b></td>' +
         '<td class="der"><b>' + dvEsc(dvCelda(Math.round(nT*100)/100)) + '</b></td>' +
         '<td class="der"><b>100,00%</b></td>' +
         '<td class="der"><b>' + dvEsc(dvCelda(vM)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(vU ? dvPct(100*vM/vU) : '—') + '</b></td>' +
         '<td class="der"><b>' + dvEsc(dvCelda(cO)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(dvCelda(mA)) + '</b></td>' +
         '<td class="der"><b>' + dvEsc(vM ? dvPct(100*mA/vM) : '—') + '</b></td>' +
         '</tr></tfoot></table></div>');

  return h.join('');
}

/* la matriz mes a mes del corte, que solo se pinta si se la pide.
   Los meses abajo, las claves al costado: es la forma en que el usuario lo
   mira hoy en su tabla dinamica. */
function dvCorteMesAMes(d, p, serie){
  var rot = p.rot, h = [];
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
      h.push('<td class="der">' + (vv ? dvEsc(dvCelda(vv)) : '—') + '</td>');
    }
    var tm = totMes[String(meses[m2]).substring(0,10)] || 0;
    granTotal += tm;
    h.push('<td class="der"><b>' + dvEsc(dvCelda(tm)) + '</b></td></tr>');
  }
  h.push('</tbody><tfoot><tr><td><b>Total</b></td>');
  for (var c3 = 0; c3 < claves.length; c3++)
    h.push('<td class="der"><b>' + dvEsc(dvCelda(totCol[claves[c3]] || 0)) + '</b></td>');
  h.push('<td class="der"><b>' + dvEsc(dvCelda(granTotal)) + '</b></td></tr></tfoot></table></div>');
  return h.join('');
}

/* ---------- las pestañas se cambian sin volver a pedir nada ----------
   Cambiar de pestaña REPINTA el cuerpo con los datos que ya estan en `DV.datos`:
   no se vuelve a llamar a la base. Repintar y no esconder es lo que hace que
   en la pagina este SOLO lo que se puede ver (la puerta de pantallas cortó 40
   veces con la version que escondia, y tenia razon).
   Y el repintado despierta a los MutationObserver de `filas.js` y `bajar.js`,
   que son los que ponen el paginado y los botones de Excel y PDF: por eso no
   hay que llamarlos a mano. */
function dvRepintar(){
  var cuerpo = document.getElementById('dvCuerpo');
  if (!cuerpo || !DV.datos) return;
  cuerpo.innerHTML = dvPintar(DV.datos);
  if (typeof dbConectarTips === 'function') dbConectarTips(cuerpo);
  dvEnganchar();
}

function dvEnganchar(){
  var cuerpo = document.getElementById('dvCuerpo');
  if (!cuerpo) return;

  /* abrir o cerrar un detalle REPINTA: el contenido plegado no existe en la
     pagina hasta que se lo pide, asi que no hay nada oculto que confunda ni a
     la persona ni a los controles. */
  var ms = cuerpo.querySelectorAll('.dv-mas-b');
  for (var q = 0; q < ms.length; q++){
    (function(b){
      b.addEventListener('click', function(){
        var k = b.getAttribute('data-plegar');
        DV.abierto[k] = !DV.abierto[k];
        dvRepintar();
      });
    })(ms[q]);
  }

  /* UN CLICK EN UNA OPCION VUELVE A PEDIRLE A LA BASE. Tiene que ser asi: las
     opciones cruzadas y los totales de los cinco cortes los mide la base, y
     recortar en el navegador seria recortar sobre los 12 mas grandes que ya
     vinieron recortados —otra cifra—. Tipear, en cambio, no llama a nadie. */
  var ops = cuerpo.querySelectorAll('.dv-op');
  for (var o = 0; o < ops.length; o++){
    (function(b){
      b.addEventListener('click', function(){
        var dim = b.getAttribute('data-seg'), val = b.getAttribute('data-val');
        var l = DV.elegido[dim]; if (!l) return;
        var i2 = l.indexOf(val);
        if (i2 >= 0) l.splice(i2, 1); else l.push(val);
        DV.buscar[dim] = '';          /* elegido uno, el campo se limpia solo */
        dvCargar();
      });
    })(ops[o]);
  }

  var btr = document.getElementById('dvTramo');
  if (btr) btr.addEventListener('click', function(){ DV.tramo = !DV.tramo; dvCargar(); });

  var lim = document.getElementById('dvLimpiar');
  if (lim) lim.addEventListener('click', function(){
    for (var z = 0; z < DV_DIMS.length; z++){
      DV.elegido[DV_DIMS[z].id] = []; DV.buscar[DV_DIMS[z].id] = '';
    }
    dvCargar();
  });

  /* TIPEAR REPINTA SOLO SU PROPIA CAJA. Repintar la pantalla entera en cada
     letra perderia el foco y el texto a mitad de una palabra. */
  var qs = cuerpo.querySelectorAll('.dv-seg-q');
  for (var w = 0; w < qs.length; w++){
    (function(inp){
      inp.addEventListener('input', function(){
        var dim = inp.getAttribute('data-segq');
        DV.buscar[dim] = inp.value;
        var caja = cuerpo.querySelector('[data-segres="' + dim + '"]');
        if (!caja || !DV.datos) return;
        caja.innerHTML = dvSegResultados(dim, (DV.datos.opciones || {})[dim] || []);
        /* los botones nuevos necesitan su enganche, y solo ellos */
        var nue = caja.querySelectorAll('.dv-op');
        for (var y = 0; y < nue.length; y++){
          (function(b){
            b.addEventListener('click', function(){
              var dd = b.getAttribute('data-seg'), vv = b.getAttribute('data-val');
              var ll = DV.elegido[dd]; if (!ll) return;
              if (ll.indexOf(vv) < 0) ll.push(vv);
              DV.buscar[dd] = '';
              dvCargar();
            });
          })(nue[y]);
        }
      });
    })(qs[w]);
  }

  var bs = cuerpo.querySelectorAll('.dv-pest');
  for (var i = 0; i < bs.length; i++){
    (function(b){
      b.addEventListener('click', function(){
        if (b.getAttribute('data-pest') === DV.pestania) return;
        DV.pestania = b.getAttribute('data-pest');
        dvRepintar();
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
