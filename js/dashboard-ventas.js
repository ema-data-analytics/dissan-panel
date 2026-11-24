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
  /* `esDimension:false` = esta pestania NO es un segmentador que se cruce.
     Antes «general» se excluia por su NOMBRE (`id !== 'general'`), que es una
     lista escrita a mano de un solo elemento: al agregar la segunda pestania
     que no es dimension habria habido que acordarse de sumarla ahi. Se declara
     en la fila y DV_DIMS la lee sola (14/10, 14/11). */
  { id:'general',   rot:'General',          plural:'',                   nota:'la foto del período', esDimension:false },
  { id:'zona',      rot:'Provincia',        plural:'Provincias',         nota:'la zona de Tango, la de tu Excel' },
  /* PROVINCIA FISCAL SE RETIRA DE LA PANTALLA.                 24/11/2026
     MEDIDO EN LA HOJA RESUMEN DE SU EXCEL, que es lo que yo dije replicar y
     NUNCA HABIA ABIERTO: tiene DOS tablas dinamicas —una con «Razon social»
     en las filas y otra con «Provincia» en las filas por «año»— y TRES
     segmentadores: `Provincia`, `Provincia` (el de la otra tabla) y
     `PROVEEDOR (Adic. Articulo)`. Cero filtros de pagina. O sea que la unica
     provincia que el mira es la ZONA de Tango (gva05), la que en esta
     pantalla se llama «Provincia».
     «Provincia fiscal» —el domicilio del cliente ante AFIP, gva14 -> gva18—
     la agregue yo. NO ESTA EN SU EXCEL, y las dos no son lo mismo: medido,
     de 264 clientes 53 caen en una distinta. Dos tarjetas que dicen
     «provincia» y dan numeros distintos es una confusion que yo invente.
     NO SE BORRA NADA: la base la sigue devolviendo y `p_provincias` se sigue
     mandando SIEMPRE con su array vacio —una envoltura pasa todos los
     argumentos (16/11)—, asi que la firma de la funcion no cambia y volver a
     mostrarla es descomentar este renglon.
  { id:'provincia', rot:'Provincia fiscal', plural:'Provincias fiscales',nota:'el domicilio del cliente' },
  */
  { id:'proveedor', rot:'Proveedor',        plural:'Proveedores',        nota:'del artículo' },
  { id:'linea',     rot:'Línea',            plural:'Líneas',             nota:'del artículo' },
  { id:'cliente',   rot:'Cliente',          plural:'Clientes',           nota:'quién compra' },
  /* LO QUE NINGUNA TABLA DINAMICA PUEDE MOSTRAR.                24/11/2026
     El que se fue NO APARECE en el periodo: para verlo hay que comparar a
     cada cliente contra SU PROPIA historia. Por eso esto no es un corte mas
     —no se cruza con los segmentadores— y va declarado como no-dimension. */
  { id:'movimiento', rot:'Movimiento de clientes', plural:'',            nota:'quién se fue, quién cayó, quién entró', esDimension:false }
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
function dvKpi(rot, val, nota, cifra){
  return '<div class="dv-kpi"><div class="dv-kpi-t">' + dvEsc(rot) + '</div>' +
         '<div class="dv-kpi-v">' + dvEsc(val) + '</div>' +
         (nota ? '<div class="dv-kpi-n">' + dvEsc(nota) + '</div>' : '') +
         (cifra ? dvSello(cifra) : '') + '</div>';
}

/* ===========================================================================
   EL TIMON ADENTRO DE CADA NUMERO.                           24/11/2026
   ===========================================================================
   Pedido textual: «que use la innovacion que hicimos, el timon. de ver el
   numero final, y saber que lo controlamos bien».

   Todos los tableros del mercado muestran un numero. Este muestra el numero Y
   CONTRA QUE LO CONTROLAMOS. El proyecto tiene 104 identidades que comparan
   cada cifra publicada contra una fuente que NO es la que la calcula, corren
   solas todas las noches, y hasta hoy el dashboard no las mostraba.

   EL SELLO NO LO ESCRIBO YO: sale de `ema.identidad_corrida`, que escribe el
   refresco nocturno. Si una identidad se pone en rojo esta noche, maniana la
   cifra sale en rojo sola, sin que nadie toque una linea.

   Y UNA CIFRA SIN IDENTIDAD NO SE ESCONDE: sale en gris diciendo que todavia
   no tiene control independiente. Es la regla del 16/11 —una seccion que
   desaparece se lee como «falta algo»— aplicada al control mismo.          */
var DVS = { datos: null, cargando: false, error: '' };

function dvSello(cifra){
  if (DVS.error)  return '';
  if (!DVS.datos) { dvSellosPedir(); return ''; }
  var ss = (DVS.datos.cifras || {})[cifra];
  if (!ss || !ss.length)
    return '<div class="dv-sello sin"><span class="dv-sello-p"></span>' +
           'sin control independiente todavía</div>';

  /* EL PEOR MANDA: si una de las identidades que controlan esta cifra esta en
     rojo, la cifra esta en rojo. Un verde promediado taparia el unico rojo. */
  var peor = 'verde', i;
  for (i = 0; i < ss.length; i++){
    if (ss[i].semaforo === 'rojo')  { peor = 'rojo';  break; }
    if (ss[i].semaforo === 'ambar') { peor = 'ambar'; }
  }
  var s = ss[0];
  var dif = Math.abs(Number(s.diferencia) || 0);
  var frase = (s.unidad === 'pesos')
    ? (dif < 0.005 ? 'sin un centavo de diferencia' : 'difiere ' + dvCelda(dif))
    : (dif < 0.5   ? 'exacto'                        : 'difiere ' + dvNum(dif) + ' ' + dvEsc(s.unidad));

  return '<button type="button" class="dv-sello ' + peor + ' dv-mas-b" ' +
         'data-plegar="sello_' + dvEsc(cifra) + '">' +
         '<span class="dv-sello-p"></span>' +
         'controlado contra ' + dvEsc(s.contra_que || dvFuenteCorta(s.fuente_b)) + ' · ' + dvEsc(frase) +
         (ss.length > 1 ? ' · +' + (ss.length - 1) : '') +
         '</button>';
  /* EL DETALLE NO VA ADENTRO DE LA TARJETA: son 190 px y parte las palabras
     al medio -«vista_mar / gen_v2_oc»-, que es un rotulo cortado con otro
     nombre (14/11). Va a lo ancho, debajo de la fila, y lo pinta
     dvSelloAbierto() desde dvGeneral. */
}

/* el nombre de la fuente, corto para que entre en la tarjeta. NO se recorta
   con puntos suspensivos: un rotulo cortado es otro rotulo (14/11). Se queda
   con la parte antes del primer parentesis o coma, que es el nombre. */
function dvFuenteCorta(f){
  var t = String(f || '').split(/\s*[(,:]/)[0].trim();
  return t.length > 46 ? String(f || '').split(/\s+/).slice(0,6).join(' ') : t;
}

/* el detalle de la cifra que este abierta, a lo ancho de la pantalla */
function dvSelloAbierto(){
  if (!DVS.datos) return '';
  var cs = DVS.datos.cifras || {}, k;
  for (k in cs){
    if (!Object.prototype.hasOwnProperty.call(cs, k)) continue;
    if (DV.abierto['sello_' + k]) return dvSelloDetalle(cs[k]);
  }
  return '';
}

function dvSelloDetalle(ss){
  var h = ['<div class="dv-sello-det">'];
  for (var i = 0; i < ss.length; i++){
    var s = ss[i];
    h.push('<div class="dv-sello-uno ' + dvEsc(s.semaforo) + '">');
    h.push('<div class="dv-sello-q">' + dvEsc(s.que_prueba) + '</div>');
    h.push('<div class="dv-sello-par"><span>' + dvEsc(s.fuente_a) + '</span>' +
           '<b>' + dvEsc(s.unidad === 'pesos' ? dvCelda(s.valor_a) : dvNum(s.valor_a)) + '</b></div>');
    h.push('<div class="dv-sello-par"><span>' + dvEsc(s.fuente_b) + '</span>' +
           '<b>' + dvEsc(s.unidad === 'pesos' ? dvCelda(s.valor_b) : dvNum(s.valor_b)) + '</b></div>');
    h.push('<div class="dv-sello-par"><span>diferencia</span><b>' +
           dvEsc(s.unidad === 'pesos' ? dvCelda(s.diferencia)
                                      : dvNum(s.diferencia) + ' ' + s.unidad) + '</b></div>');
    h.push('<div class="dv-sello-c">Medido hace ' + dvEsc(dvNum(s.horas)) + ' h · se vuelve a medir ' +
           'solo todas las noches.</div>');
    h.push('</div>');
  }
  h.push('</div>');
  return h.join('');
}

/* LA BANDA DE ARRIBA DE TODO: el estado del timon entero. */
function dvTimon(){
  if (DVS.error)  return '';
  if (!DVS.datos) { dvSellosPedir(); return ''; }
  var t = (DVS.datos.timon) || {};
  var n = Number(t.identidades) || 0;
  if (!n) return '';
  var color = Number(t.rojo) ? 'rojo' : (Number(t.ambar) ? 'ambar' : 'verde');
  return '<div class="dv-timon ' + color + '">' +
         '<span class="dv-timon-r">Ningún número viaja solo</span> ' +
         '<b>' + dvNum(n) + '</b> controles comparan las cifras de este tablero contra ' +
         'fuentes que no son las que las calculan — la contabilidad de DISSAN, las cuentas ' +
         'de IVA de Tango, el maestro de clientes, lo que el proveedor facturó. ' +
         '<b class="dv-sube">' + dvNum(t.verde) + ' en verde</b>' +
         (Number(t.ambar) ? ' · <b>' + dvNum(t.ambar) + ' en ámbar</b>' : '') +
         (Number(t.rojo)  ? ' · <b class="dv-baja">' + dvNum(t.rojo) + ' EN ROJO</b>' : ' · <b>0 en rojo</b>') +
         '. Medidos hace ' + dvEsc(dvNum(t.horas)) + ' h.' +
         '</div>';
}

function dvSellosPedir(){
  if (DVS.cargando) return;
  DVS.cargando = true;
  rpc('api_ventas_sellos_v1', {}).then(function(r){
    var d = r && r.data;                       /* `rpc` devuelve {data, ms} */
    DVS.cargando = false; DVS.datos = d || null;
    DVS.error = (!d || d.ok === false) ? ((d && d.error) || 'la base no devolvió nada') : '';
    dvRepintar();
  }).catch(function(e){
    DVS.cargando = false; DVS.error = String((e && e.message) || e);
    dvRepintar();
  });
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
           p_provincias:  (DV.elegido.provincia || []).slice(),  /* se manda SIEMPRE aunque la pestania este retirada: una envoltura pasa todos los argumentos (16/11) */
           p_proveedores: DV.elegido.proveedor.slice(),
           p_lineas:      DV.elegido.linea.slice(),
           p_clientes:    DV.elegido.cliente.slice(),
           p_tramo_igual: !!DV.tramo };
}

/* las dimensiones de los segmentadores SON las pestanias menos «General»: una
   sola lista, no dos que se separen (la lista a mano del 14/10 y del 14/11). */
var DV_DIMS = DV_PESTANIAS.filter(function(p){ return p.esDimension !== false; });

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
    /* EL RANGO PUEDE HABER CAMBIADO, ASI QUE LAS ALERTAS SE VUELVEN A MEDIR.
       Si se dejaran, la banda de arriba mostraria las cifras del rango
       anterior al lado de las tarjetas del nuevo: dos periodos en la misma
       pantalla, sin ninguna señal. */
    DVA.datos = null; DVA.error = ''; DVA.cargando = false;
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
  h.push(p2.id === 'general'    ? dvGeneral(d)
       : p2.id === 'movimiento' ? dvMovimiento()
       : dvCorte(d, p2));
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

  /* ARRIBA DE TODO VA LO QUE HAY QUE DECIDIR, NO LO QUE SE VENDIO.  24/11
     Dicho por el usuario: "MOSTRA INFORMACION QUE LES SEA IMPACTANTE A LA
     SIMPLE VISTA... INFO PARA QUE PUEDAN TOMAR DESICIONES". Cuanto se facturo
     ya lo sabe; lo que no ve nadie es donde se esta perdiendo plata. */
  /* EL TIMON ARRIBA DE TODO: antes de las cifras va contra que se controlan. */
  h.push(dvTimon());

  h.push(dvAlertas());

  /* CUATRO TARJETAS. Eran seis y la pantalla no se leia. «Con costo medido» y
     «Costo» viven en la tabla del costo, plegada: el que quiere el reparto lo
     abre, y el que mira el dashboard ve lo que vendio y lo que gano. */
  h.push('<div class="dv-kpis">');
  h.push(dvKpi('Facturado', dvMillones(s.venta_universo), dvPesos(s.venta_universo), 'facturado'));
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
               : 'no hubo notas de crédito ni de débito en el período', 'neto'));
  h.push(dvKpi('Margen', dvMillones(s.margen), dvPesos(s.margen), 'margen'));
  h.push(dvKpi('Margen %', dvPct(s.margen_pct), 'sobre lo que tiene costo', 'margen_pct'));
  h.push('</div>');
  h.push(dvSelloAbierto());

  /* EL TITULAR VA PEGADO A LAS TARJETAS, NO ADENTRO DEL MES A MES.
     Lo puse ahi primero y no se cargaba nunca: ese bloque esta PLEGADO
     detras de «Ver el mes a mes». Una cifra que cambia la lectura de todo
     el dashboard no puede estar a dos clics. */
  h.push(dvPesosConstantes());

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

/* ===========================================================================
   EL CRECIMIENTO EN PESOS NO ES CRECIMIENTO.                     24/11/2026
   ===========================================================================
   MEDIDO: con el mismo tramo del año en los tres años, 2026 crece +11,7%
   sobre 2025 EN PESOS y CAE -16,9% en pesos de agosto 2026; 2025 crecio
   +25,3% y cayo -15,5%. DOS AÑOS SEGUIDOS DE CAIDA REAL, y el panel mostraba
   crecimiento los dos. Es la cifra que mas cambia la lectura de todo el
   dashboard, y por eso va arriba de todo en la foto del periodo.

   NO SE MEZCLA LO AJUSTADO CON LO QUE NO SE PUEDE AJUSTAR. El IPC del INDEC
   llega a agosto 2026 y las ventas al 20/11: esos 3 meses y $3.301.943.699
   NO entran, y la pantalla lo escribe. Mezclarlos mostraria un derrumbe
   inventado, y con un join comun desapareceran en silencio (13/11).         */
var DVP = { datos: null, cargando: false, error: '' };

function dvPesosConstantes(){
  if (DVP.error)  return '<div class="dv-insight">No se pudo medir en pesos constantes: ' +
                         dvEsc(DVP.error) + '</div>';
  if (!DVP.datos) { dvPesosPedir(); return ''; }
  var d = DVP.datos;
  if (d.se_puede === false)
    return '<div class="dv-insight"><span class="dv-insight-r">Pesos constantes</span> ' +
           dvEsc(d.por_que || 'no se puede medir') + '</div>';

  var a = d.anios || [];
  if (a.length < 2)
    return '<div class="dv-insight"><span class="dv-insight-r">Pesos constantes</span> ' +
           'Hace falta más de un año con índice para comparar. ' + dvEsc(d.lo_que_queda_afuera || '') +
           '</div>';

  var h = [], base = (d.base || {});
  h.push('<div class="db-sec">En pesos de ' + dvEsc(dvMesLargo(base.mes)) +
         '<small>' + dvEsc(d.mismo_tramo || '') + ' Índice IPC Nivel General del INDEC. ' +
         dvPesosAfuera(d) + '</small></div>');
  h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>' +
         '<th>Año</th><th class="der">Meses</th>' +
         '<th class="der">Facturado en pesos de cada año</th><th class="der">Creció en pesos</th>' +
         '<th class="der">En pesos de ' + dvEsc(dvMesLargo(base.mes)) + '</th>' +
         '<th class="der">Creció de verdad</th></tr></thead><tbody>');
  for (var i = 0; i < a.length; i++){
    var x = a[i], p = i ? a[i-1] : null;
    var vn = p && Number(p.nominal)   ? 100 * (x.nominal   - p.nominal)   / Math.abs(p.nominal)   : null;
    var vc = p && Number(p.constante) ? 100 * (x.constante - p.constante) / Math.abs(p.constante) : null;
    /* EL AÑO VA COMO CODIGO, NO COMO NUMERO.                  24/11/2026
       Lo agarro la puerta del archivo bajado y CORTO EL PUSH: sin marcar,
       `bajar.js` le pone formato #,##0 y Excel lo muestra «2.024». Un año con
       separador de miles se lee como OTRO numero — la familia del
       `$3.549.541.33` del 14/10. `db-cod` es la clase que js/bajar.js ya
       reconoce para esto (20/11). */
    h.push('<tr><td class="db-cod">' + dvEsc(x.anio) + '</td>' +
           '<td class="der">' + dvEsc(x.meses) +
             (Number(x.meses_sin_indice) ? ' <span class="dv-baja">(' + dvEsc(x.meses_sin_indice) +
                                           ' sin índice)</span>' : '') + '</td>' +
           '<td class="der">' + dvEsc(dvCelda(x.nominal)) + '</td>' +
           '<td class="der' + (vn === null ? '' : (vn >= 0 ? ' dv-sube' : ' dv-baja')) + '">' +
             (vn === null ? '—' : (vn > 0 ? '+' : '') + dvEsc(dvPct(vn))) + '</td>' +
           '<td class="der">' + dvEsc(dvCelda(x.constante)) + '</td>' +
           '<td class="der' + (vc === null ? '' : (vc >= 0 ? ' dv-sube' : ' dv-baja')) + '">' +
             (vc === null ? '—' : (vc > 0 ? '+' : '') + dvEsc(dvPct(vc))) + '</td></tr>');
  }
  h.push('</tbody></table></div>');
  return h.join('');
}

/* LO QUE QUEDA AFUERA, CON EL NUMERO ESCRITO POR LA PANTALLA.
   La base manda los meses y la plata como NUMEROS; la frase la arma aca con
   el mismo formateador que todas las demas cifras del panel. La primera
   version traia la frase hecha desde la base y el monto salia
   «3301943699 pesos», sin separadores, como un codigo. */
function dvPesosAfuera(d){
  var m = Number(d.afuera_meses) || 0;
  if (!m) return 'Todos los meses del rango tienen índice.';
  return 'Quedan afuera ' + dvNum(m) + (m === 1 ? ' mes' : ' meses') + ' de venta ' +
         'posteriores a ' + dvEsc(d.afuera_desde || '') + ' por ' +
         dvEsc(dvCelda(d.afuera_plata)) + ', porque el INDEC todavía no publicó ' +
         'su índice. No se mezclan con los ajustados: eso mostraría una caída inventada.';
}

/* el mes de la base, escrito como lo lee una persona */
function dvMesLargo(iso){
  var M = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
           'septiembre','octubre','noviembre','diciembre'];
  var t = String(iso || '').substring(0,10).split('-');
  return (t.length === 3 && M[Number(t[1]) - 1]) ? M[Number(t[1]) - 1] + ' ' + t[0] : String(iso || '');
}

function dvPesosPedir(){
  if (DVP.cargando) return;
  DVP.cargando = true;
  rpc('api_ventas_pesos_constantes_v1', { p_desde: '2024-01-01' }).then(function(r){
    var d = r && r.data;                       /* `rpc` devuelve {data, ms} (24/11) */
    DVP.cargando = false; DVP.datos = d || null;
    DVP.error = (!d || d.ok === false) ? ((d && d.por_que) || 'la base no devolvió nada') : '';
    if (DV.pestania === 'general') dvRepintar();
  }).catch(function(e){
    DVP.cargando = false; DVP.error = String((e && e.message) || e);
    if (DV.pestania === 'general') dvRepintar();
  });
}

/* ===========================================================================
   LO QUE HAY QUE MIRAR — LA BANDA DE ARRIBA DE TODO.        24/11/2026
   ===========================================================================
   Pedido textual: "MOSTRA INFORMACION QUE LES SEA IMPACTANTE A LA SIMPLE
   VISTA... INFO PARA QUE PUEDAN TOMAR DESICIONES".

   Y tenia razon en el diagnostico: hasta hoy yo le proponia MAS CORTES
   -vendedor, articulo-, que es mas rebanadas de la misma torta. Un corte
   contesta "cuanto vendimos por X". Esto contesta "donde hay plata que nadie
   esta mirando", con nombre y apellido para poder levantar el telefono.

   LAS TRES SALEN DE `api_ventas_alertas_v1` Y RESPETAN EL RANGO ELEGIDO.
   Cada tarjeta se abre y muestra SUS renglones: una cifra sin los renglones
   que la forman no es una decision, es un titular.

   LA TARJETA APARECE SIEMPRE, aunque de cero, y entonces lo dice: "Ninguno.
   Es una buena noticia y por eso esta escrita" (16/11). Una seccion que
   desaparece se lee como «falta algo».                                      */
var DVA = { datos: null, cargando: false, error: '' };

/* Cada alerta declara SU rotulo y SUS columnas. No hay una lista de nombres
   suelta: la clave la manda la base y aca esta lo que se escribe para cada
   una. Si la base agrega una cuarta y aca no esta, se pinta igual con su
   clave cruda en vez de desaparecer -declarar antes que esconder-. */
var DV_AL = {
  /* --- LAS TRES BUENAS, Y VAN PRIMERO ---                    24/11/2026
     Dicho por el usuario, textual: "es solo mostrar lo que esta mal, lo que
     me pones, se necesita mostrar todo lo que esta bien". Tenia razon: tres
     tarjetas rojas se leen como una acusacion, no como un tablero. Donde
     empujar va ANTES que donde tapar. */
  crecieron: {
    rot: 'Clientes que crecieron',
    que: 'trajeron de más que el año pasado',
    mal: false,
    linea: function(a){
      return dvNum(a.cuantos) + ' clientes · contra el mismo tramo de ' + dvEsc(a.contra || '');
    },
    nada: 'Ningún cliente compró más que en el mismo tramo del año anterior.',
    cols: ['Cliente', 'El año pasado', 'Ahora', 'Trajo de más', 'Creció'],
    fila: function(f){
      return ['<td>' + dvEsc(f.codigo) + ' · ' + dvEsc(f.cliente) + '</td>',
              '<td class="der">' + dvEsc(dvCelda(f.antes)) + '</td>',
              '<td class="der">' + dvEsc(dvCelda(f.ahora)) + '</td>',
              '<td class="der dv-sube">' + dvEsc(dvCelda(f.mas)) + '</td>',
              '<td class="der dv-sube">+' + dvEsc(dvPct(f.pct)) + '</td>'];
    }
  },
  mas_deja: {
    rot: 'Los proveedores que más dejan',
    que: 'de ganancia, rindiendo arriba del promedio',
    mal: false,
    linea: function(a){
      return dvNum(a.cuantos) + ' de ' + dvNum(a.de_cuantos) + ' proveedores · ' +
             dvMillones(a.facturado) + ' facturados que hacen el ' +
             dvPct(a.pct_de_la_ganancia) + ' de toda la ganancia';
    },
    nada: 'Ningún proveedor rinde por encima del margen general del período.',
    cols: ['Proveedor', 'Facturado', 'Ganó', 'Margen', '% de toda la ganancia'],
    fila: function(f){
      return ['<td>' + dvEsc(f.proveedor) + '</td>',
              '<td class="der">' + dvEsc(dvCelda(f.facturado)) + '</td>',
              '<td class="der dv-sube">' + dvEsc(dvCelda(f.gano)) + '</td>',
              '<td class="der dv-sube">' + dvEsc(dvPct(f.margen_pct)) + '</td>',
              '<td class="der">' + dvEsc(dvPct(f.pct_de_la_ganancia)) + '</td>'];
    }
  },
  de_donde_sale: {
    rot: 'De dónde sale la mitad de la ganancia',
    que: 'de ganancia en esos artículos',
    mal: false,
    linea: function(a){
      return dvNum(a.cuantos) + ' artículos de ' + dvNum(a.de_cuantos) +
             ' hacen la mitad de todo lo que se ganó (' + dvMillones(a.ganancia_total) + ')';
    },
    nada: 'No hay artículos con ganancia en este período.',
    cols: ['Código', 'Artículo', 'Facturado', 'Ganó', 'Margen', '% de toda la ganancia'],
    fila: function(f){
      return ['<td class="db-cod">' + dvEsc(f.codigo) + '</td>',
              '<td>' + dvEsc(f.articulo) + '</td>',
              '<td class="der">' + dvEsc(dvCelda(f.facturado)) + '</td>',
              '<td class="der dv-sube">' + dvEsc(dvCelda(f.gano)) + '</td>',
              '<td class="der">' + dvEsc(dvPct(f.margen_pct)) + '</td>',
              '<td class="der">' + dvEsc(dvPct(f.pct_de_la_ganancia)) + '</td>'];
    }
  },

  /* --- LAS TRES A CORREGIR --- */
  bajo_costo: {
    rot: 'Vendido por debajo del costo',
    que: 'se perdió',
    mal: true,
    linea: function(a){
      return dvNum(a.cuantos) + ' renglones · ' + dvNum(a.clientes) + ' clientes · ' +
             dvNum(a.articulos) + ' artículos · ' + dvMillones(a.facturado) + ' facturados';
    },
    nada: 'No hubo un solo renglón vendido bajo costo en este período.',
    cols: ['Fecha', 'Comprobante', 'Cliente', 'Artículo', 'Cant.',
           'Precio (x unidad)', 'Costo (x unidad)', 'Venta (el renglón)', 'Perdió (el renglón)'],
    fila: function(f){
      return ['<td class="der">' + dvEsc(String(f.fecha || '').substring(0,10)) + '</td>',
              '<td class="db-cod">' + dvEsc(f.comprobante) + '</td>',
              '<td>' + dvEsc(f.cliente) + '</td>',
              '<td>' + dvEsc(f.articulo) + '</td>',
              '<td class="der">' + dvEsc(dvNum(f.cantidad)) + '</td>',
              '<td class="der">' + dvEsc(dvCelda(f.precio)) + '</td>',
              '<td class="der">' + dvEsc(dvCelda(f.costo)) + '</td>',
              '<td class="der">' + dvEsc(dvCelda(f.venta)) + '</td>',
              '<td class="der dv-baja">' + dvEsc(dvCelda(f.perdio)) + '</td>'];
    }
  },
  precio_disperso: {
    rot: 'El mismo artículo, el mismo mes, a precios muy distintos',
    que: 'pagó de menos el más barato',
    mal: true,
    linea: function(a){
      return dvNum(a.cuantos) + ' casos · ' + dvNum(a.articulos) + ' artículos · ' +
             dvMillones(a.facturado) + ' facturados ahí dentro';
    },
    nada: 'Ningún artículo se vendió, dentro de un mismo mes, a precios que difieran 50% o más.',
    cols: ['Mes', 'Código', 'Artículo', 'Clientes', 'Unidades',
           'Más barato (x unidad)', 'Promedio (x unidad)', 'Más caro (x unidad)', 'Veces',
           'Quién pagó menos', 'Quién pagó más', 'Pagó de menos'],
    fila: function(f){
      return ['<td class="der">' + dvEsc(dvMes(f.mes)) + '</td>',
              '<td class="db-cod">' + dvEsc(f.codigo) + '</td>',
              '<td>' + dvEsc(f.articulo) + '</td>',
              '<td class="der">' + dvEsc(dvNum(f.clientes)) + '</td>',
              '<td class="der">' + dvEsc(dvNum(f.unidades)) + '</td>',
              '<td class="der">' + dvEsc(dvCelda(f.mas_barato)) + '</td>',
              '<td class="der">' + dvEsc(dvCelda(f.promedio)) + '</td>',
              '<td class="der">' + dvEsc(dvCelda(f.mas_caro)) + '</td>',
              '<td class="der dv-baja">' + dvEsc(dvNum(f.veces)) + '×</td>',
              '<td>' + dvEsc(f.quien_barato) + '</td>',
              '<td>' + dvEsc(f.quien_caro) + '</td>',
              '<td class="der dv-baja">' + dvEsc(dvCelda(f.pago_de_menos)) + '</td>'];
    }
  },
  grandes_margen_flaco: {
    rot: 'Clientes grandes que dejan poco',
    que: 'falta para llegar al margen general',
    mal: true,
    linea: function(a){
      return dvNum(a.cuantos) + ' clientes · ' + dvMillones(a.facturado) + ' facturados · ' +
             'margen general ' + dvPct(a.margen_general_pct);
    },
    nada: 'Ningún cliente grande rinde por debajo del margen general.',
    cols: ['Cliente', 'Facturas', 'Facturado', 'Con costo medido', 'Ganó', 'Margen',
           'Falta para el promedio'],
    fila: function(f){
      return ['<td>' + dvEsc(f.cliente) + '</td>',
              '<td class="der">' + dvEsc(dvNum(f.facturas)) + '</td>',
              '<td class="der">' + dvEsc(dvCelda(f.facturado)) + '</td>',
              '<td class="der">' + dvEsc(dvCelda(f.con_costo)) + '</td>',
              '<td class="der">' + dvEsc(dvCelda(f.gano)) + '</td>',
              '<td class="der dv-baja">' + dvEsc(dvPct(f.margen_pct)) + '</td>',
              '<td class="der dv-baja">' + dvEsc(dvCelda(f.falta_para_el_promedio)) + '</td>'];
    }
  }
};

function dvAlertas(){
  if (DVA.error)  return '<div class="dv-insight"><span class="dv-insight-r">Lo que hay que mirar</span> ' +
                         'No se pudo medir: ' + dvEsc(DVA.error) + '</div>';
  if (!DVA.datos) { dvAlertasPedir();
                    return '<div class="dv-insight"><span class="dv-insight-r">Lo que hay que mirar</span> ' +
                           'Buscando dónde hay plata que nadie está mirando…</div>'; }
  var d = DVA.datos, bu = d.buenas || [], al = d.alertas || [], h = [];
  var todas = bu.concat(al);

  /* SE DECLARA QUE ESTO NO MIRA LOS SEGMENTADORES. Las tres alertas respetan
     el RANGO DE FECHAS y nada mas: si alguien elige MENDOZA y no lo dijeramos,
     leeria estas cifras como si fueran de Mendoza. Es la regla de siempre —un
     numero sin su denominador no se publica— aplicada al alcance. */
  h.push('<div class="db-sec">Lo que hay que mirar' +
         '<small>Del ' + dvEsc(String(d.desde || '').substring(0,10)) + ' al ' +
         dvEsc(String(d.hasta || '').substring(0,10)) + ', <b>sin aplicar los ' +
         'segmentadores</b>: estas tres miran todo el período elegido. ' +
         dvEsc(d.como_se_mide || '') + '</small></div>');

  /* LAS BUENAS PRIMERO. Un tablero que arranca en rojo no se usa dos veces. */
  h.push('<div class="dv-al-sub">Dónde empujar</div>');
  h.push('<div class="dv-al-grid">');
  for (var i = 0; i < bu.length; i++) h.push(dvAlertaTarjeta(bu[i]));
  h.push('</div>');

  h.push('<div class="dv-al-sub">Dónde hay plata que se está yendo</div>');
  h.push('<div class="dv-al-grid">');
  for (var i2 = 0; i2 < al.length; i2++) h.push(dvAlertaTarjeta(al[i2]));
  h.push('</div>');

  /* el detalle de la que este abierta, debajo de las tarjetas */
  for (var j = 0; j < todas.length; j++){
    var a = todas[j], k = 'al_' + a.clave;
    if (!DV.abierto[k]) continue;
    var cfg = DV_AL[a.clave];
    var fs = a.filas || [];
    if (!cfg || !fs.length){
      h.push('<div class="db-pie"><b>Ninguno.</b> ' +
             dvEsc((cfg && cfg.nada) || 'No hay renglones para mostrar.') + '</div>');
      continue;
    }
    h.push('<div class="db-pie">' + dvEsc(cfg.rot) + ' — se muestran ' + dvNum(fs.length) +
           ' de ' + dvNum(a.cuantos) + ', de peor a mejor.</div>');
    h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>');
    for (var c = 0; c < cfg.cols.length; c++)
      h.push('<th' + (c ? ' class="der"' : '') + '>' + dvEsc(cfg.cols[c]) + '</th>');
    h.push('</tr></thead><tbody>');
    for (var f = 0; f < fs.length; f++) h.push('<tr>' + cfg.fila(fs[f]).join('') + '</tr>');
    h.push('</tbody></table></div>');
  }
  return h.join('');
}

function dvAlertaTarjeta(a){
  var cfg = DV_AL[a.clave] || { rot: a.clave, que: '', mal: true,
                                linea: function(){ return ''; }, nada: 'Sin renglones.' };
  var k = 'al_' + a.clave, abierta = !!DV.abierto[k];
  var n = Number(a.cuantos) || 0, plata = Math.abs(Number(a.plata) || 0);
  return '<button type="button" class="dv-mas-b dv-al' + (cfg.mal ? '' : ' buena') +
         (abierta ? ' abierta' : '') + '" data-plegar="' + dvEsc(k) + '">' +
         '<span class="dv-al-rot">' + dvEsc(cfg.rot) + '</span>' +
         (n ? '<span class="dv-al-plata ' + (cfg.mal ? 'dv-baja' : 'dv-sube') + '">' +
                dvEsc(dvMillones(plata)) + '</span>' +
              '<span class="dv-al-que">' + dvEsc(cfg.que) + '</span>' +
              '<span class="dv-al-det">' + dvEsc(cfg.linea(a)) + '</span>' +
              '<span class="dv-al-ver">' + (abierta ? 'Cerrar' : 'Ver quiénes son') + '</span>'
            : '<span class="dv-al-plata">Ninguno</span>' +
              '<span class="dv-al-det">' + dvEsc(cfg.nada) + '</span>' +
              '<span class="dv-al-ver">Es una buena noticia</span>') +
         '</button>';
}

function dvAlertasPedir(){
  if (DVA.cargando) return;
  DVA.cargando = true;
  /* LAS FECHAS SALEN DE `dvFiltros()`, que es de donde las saca el dashboard:
     una sola fuente, o las dos se separan con el tiempo (30/10). */
  var f = (typeof dvFiltros === 'function') ? dvFiltros() : {};
  /* `rpc()` SIEMPRE devuelve {data, ms} (24/11). */
  rpc('api_ventas_alertas_v1',
      { p_desde: f.p_desde || null, p_hasta: f.p_hasta || null, p_tope: 15 }).then(function(r){
    var d = r && r.data;
    DVA.cargando = false; DVA.datos = d || null;
    DVA.error = (!d || d.ok === false) ? ((d && d.error) || 'la base no devolvió nada') : '';
    if (DV.pestania === 'general') dvRepintar();
  }).catch(function(e){
    DVA.cargando = false; DVA.error = String((e && e.message) || e);
    if (DV.pestania === 'general') dvRepintar();
  });
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

  /* DOS COSAS QUE SU EXCEL NO PUEDE CONTESTAR, Y SALEN DE ESTOS MISMOS DATOS.
     No se pide nada nuevo a la base: se calculan sobre las filas que ya estan
     en pantalla, asi que no cuestan una llamada ni pueden dar otro numero que
     el de la tabla de abajo. Las dos aparecen SIEMPRE, y si no hay datos
     dicen por que (16/11): una seccion que desaparece se lee como «falta
     algo». */
  h.push(dvLoQueElExcelNoDice(filas, anios, tG, unAnio, p));

  h.push('<div class="db-tb-caja"><table class="db-tb dv-mx">');
  /* dos renglones de encabezado, como el suyo: arriba el año, abajo qué trae */
  if (!unAnio){
    /* LA VARIACION VA SEGUNDA, PEGADA AL NOMBRE, Y NO AL FINAL.  24/11/2026
       Primero la puse ultima y en la foto se veia el defecto: con tres años la
       tabla se desliza de costado y la columna nueva —la que mas importa—
       quedaba fuera de la pantalla. Una cifra que hay que ir a buscar
       deslizando no existe. */
    h.push('<thead><tr><th rowspan="2">' + dvEsc(p.rot) + '</th>' +
           '<th rowspan="2" class="der dv-mx-var">' + dvEsc(anios[anios.length-1]) +
           ' vs ' + dvEsc(anios[anios.length-2]) + '<small>cuánto cambió</small></th>');
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
    h.push('<tr><td>' + dvEsc(x.clave) + '</td>' +
           (unAnio ? '' : dvCeldaVariacion(x.a[anios[anios.length-2]], x.a[anios[anios.length-1]])));
    if (!unAnio) for (var c = 0; c < anios.length; c++){
      var va = x.a[anios[c]], tot = tA[anios[c]];
      h.push('<td class="der dv-mx-pct">' +
             (va === undefined || !tot ? '—' : dvEsc(dvPct(100 * va / tot))) + '</td>' +
             '<td class="der" data-plata="1">' +
             (va === undefined ? '—' : dvEsc(dvCelda(Math.round(va * 100) / 100))) + '</td>');
    }
    h.push('<td class="der dv-mx-pct">' + (tG ? dvEsc(dvPct(100 * x.total / tG)) : '—') + '</td>' +
           '<td class="der" ' + (unAnio ? 'data-plata="1"' : 'data-total="1"') + '>' +
           dvEsc(dvCelda(x.total)) + '</td>');
    h.push('</tr>');
  }
  h.push('</tbody><tfoot><tr><td><b>Total general</b></td>' +
         (unAnio ? '' : dvCeldaVariacion(tA[anios[anios.length-2]], tA[anios[anios.length-1]], true)));
  if (!unAnio) for (var t2 = 0; t2 < anios.length; t2++)
    h.push('<td class="der dv-mx-pct"><b>100,0%</b></td>' +
           '<td class="der"><b>' + dvEsc(dvCelda(tA[anios[t2]])) + '</b></td>');
  h.push('<td class="der dv-mx-pct"><b>100,0%</b></td>' +
         '<td class="der"><b>' + dvEsc(dvCelda(tG)) + '</b></td>');
  h.push('</tr></tfoot></table></div>');
  return h.join('');
}

/* LA VARIACION CONTRA EL AÑO ANTERIOR — lo que su Excel no tiene. 24/11/2026
   Su hoja RESUMEN pone los años uno al lado del otro y hay que restarlos a
   ojo; aca sale la cuenta hecha. UNA SOLA FUNCION para el cuerpo Y para el
   pie: dos copias de la misma cuenta se separan con el tiempo (30/10).
   SIN `data-plata` ni `data-total`: es un PORCENTAJE, no una parte del total
   del renglon — la cagada del 20/11 en la grilla de al lado.
   Y si el año anterior no tiene nada NO se divide por cero: se declara
   «nuevo», en vez de inventar un infinito. */
function dvCeldaVariacion(antes, ahora, negrita){
  var a = Number(antes) || 0, b = Number(ahora) || 0, txt, cls = '';
  if (!antes && !ahora)      txt = '—';
  else if (!antes)           { txt = 'nuevo';   cls = ' dv-sube'; }
  else if (!ahora)           { txt = 'sin venta'; cls = ' dv-baja'; }
  else {
    var v = 100 * (b - a) / Math.abs(a);
    txt = (v > 0 ? '+' : '') + dvPct(v);
    cls = v > 0 ? ' dv-sube' : (v < 0 ? ' dv-baja' : '');
  }
  return '<td class="der dv-mx-var' + cls + '" data-no-baja-plata="1">' +
         (negrita ? '<b>' + dvEsc(txt) + '</b>' : dvEsc(txt)) + '</td>';
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


/* LO QUE EL EXCEL NO DICE: la concentracion y los que se cayeron.  24/11/2026
   ===========================================================================
   Su hoja RESUMEN contesta «cuanto vendimos y a quien». Estas dos contestan
   «cuanto dependemos de pocos» y «por donde se nos fue la plata», que son las
   dos preguntas que un Excel con dos tablas dinamicas no puede responder sin
   que alguien se siente a restar a mano.

   LAS DOS SE CALCULAN SOBRE `filas`, que es lo que la tabla de abajo pinta:
   no pueden dar un numero distinto del que se ve. */
function dvLoQueElExcelNoDice(filas, anios, tG, unAnio, p){
  if (!filas || !filas.length)
    return '<div class="dv-insight">Sin renglones en este corte, así que no hay ' +
           'concentración ni caídas para medir.</div>';

  /* 1) CONCENTRACION: cuantos hacen el 80%. `filas` ya viene de mayor a menor. */
  var acum = 0, cuantos = 0;
  for (var i = 0; i < filas.length && tG > 0; i++){
    acum += Number(filas[i].total) || 0; cuantos++;
    if (acum >= tG * 0.8) break;
  }
  var conc = tG > 0
    ? '<b>' + dvNum(cuantos) + ' de ' + dvNum(filas.length) + '</b> hacen el <b>80%</b>' +
      ' (' + dvPct(100 * cuantos / filas.length) + ' de los ' + dvEsc(p.plural.toLowerCase()) + ')'
    : 'sin ventas en el período, no se puede medir la concentración';

  /* 2) LOS QUE MAS CAYERON, en PESOS y no en porcentaje: una caida del 90%
        sobre $1.000 no es noticia y una del 12% sobre $800 M si. Se declara
        cuando no se puede medir, en vez de no mostrar nada. */
  var caida = '';
  if (unAnio || anios.length < 2){
    caida = 'Con un solo año a la vista no hay contra qué comparar: ampliá el ' +
            'rango o apretá «Comparar el mismo tramo».';
  } else {
    var ant = anios[anios.length-2], ult = anios[anios.length-1], bajas = [];
    for (var f = 0; f < filas.length; f++){
      var a0 = Number(filas[f].a[ant]) || 0, a1 = Number(filas[f].a[ult]) || 0;
      if (a0 > 0 && a1 < a0) bajas.push({ k: filas[f].clave, dif: a1 - a0,
                                          pct: 100 * (a1 - a0) / a0 });
    }
    bajas.sort(function(x, y){ return x.dif - y.dif; });
    if (!bajas.length){
      caida = '<b>Ninguno</b> vendió menos en ' + dvEsc(ult) + ' que en ' +
              dvEsc(ant) + '. Es una buena noticia y por eso está escrita.';
    } else {
      var tot = 0; for (var b2 = 0; b2 < bajas.length; b2++) tot += bajas[b2].dif;
      var top = bajas.slice(0, 3).map(function(z){
        return '<span class="dv-chip-baja">' + dvEsc(z.k) + ' ' +
               dvEsc(dvCelda(Math.round(z.dif))) + ' (' + dvEsc(dvPct(z.pct)) + ')</span>';
      }).join(' ');
      caida = '<b>' + dvNum(bajas.length) + '</b> vendieron menos que en ' + dvEsc(ant) +
              ', por <b>' + dvEsc(dvCelda(Math.round(tot))) + '</b> entre todos. ' +
              'Los tres más grandes: ' + top;
    }
  }

  return '<div class="dv-insight">' +
         '<div><span class="dv-insight-r">Concentración</span> ' + conc + '</div>' +
         '<div><span class="dv-insight-r">Los que cayeron</span> ' + caida + '</div>' +
         '</div>';
}


/* ===========================================================================
   MOVIMIENTO DE CLIENTES — QUIEN SE FUE, QUIEN CAYO, QUIEN ENTRO. 24/11/2026
   ===========================================================================
   POR QUE NO ES UN CORTE MAS. Los otros cinco cortan el periodo elegido. Este
   compara a cada cliente contra SU PROPIA historia, asi que no depende del
   rango ni de los segmentadores: por eso tiene su propia llamada y su propia
   pestania, y por eso esta declarado `esDimension:false`.

   LO QUE MIDE, con los umbrales A LA VISTA y no escondidos en el codigo: un
   cliente «habitual» compro en 3 o mas meses distintos de los ultimos 24;
   «se fue» si hace mas de 6 meses que no compra; «cayo» si los ultimos 12
   meses dan 30% o menos que los 12 anteriores. Las tres son decisiones de
   negocio, no mediciones, y por eso viajan como argumentos y se escriben en
   la pantalla.

   Y EL CODIGO DE CLIENTE VA AL LADO DEL NOMBRE. Medido el 24/11: LEM MEDICAL
   SRL aparece en «cayeron» Y en «nuevos», y NO es un defecto: tiene dos
   cuentas en Tango, SL0017 (San Luis, desde 2023) y SJ0017 (San Juan, desde
   junio 2026). Sin el codigo eso se lee como un error del sistema.          */
var DVM = { datos: null, cargando: false, error: '' };

function dvMovimiento(){
  if (DVM.error)    return '<div class="dv-insight">No se pudo traer el movimiento de clientes: ' +
                           dvEsc(DVM.error) + '</div>';
  if (!DVM.datos)   { dvMovimientoPedir(); return '<div class="dv-insight">Midiendo a cada cliente contra su propia historia…</div>'; }
  var d = DVM.datos, u = d.umbrales || {}, h = [];

  h.push('<div class="db-sec">Movimiento de clientes' +
         '<small>Al ' + dvEsc(String(d.corte || '').substring(0,10)) + '. ' +
         'Habitual = compró en <b>' + dvEsc(u.habitual_meses_de_los_ultimos_24) +
         ' o más meses</b> de los últimos 24 · Se fue = hace más de <b>' +
         dvEsc(u.meses_sin_comprar) + ' meses</b> que no compra · Cayó = los últimos ' +
         '12 meses dan <b>' + dvEsc(u.caida_pct) + '% o menos</b> que los 12 anteriores. ' +
         dvEsc(d.denominador || '') + '</small></div>');

  h.push(dvMovBloque('Se fueron', d.se_fueron, 'cuantos', 'compraban',
     'clientes habituales que dejaron de comprar', 'compraban por año',
     ['Cliente', 'Última compra', 'Sin comprar', 'Compraba por año'],
     function(f){ return ['<td>' + dvEsc(f.codigo) + ' · ' + dvEsc(f.cliente) + '</td>',
                          '<td class="der">' + dvEsc(String(f.ultima || '').substring(0,10)) + '</td>',
                          '<td class="der">' + dvEsc(dvNum(f.dias_sin_comprar)) + ' días</td>',
                          '<td class="der" data-plata="1">' + dvEsc(dvCelda(f.compraba)) + '</td>']; }));

  h.push(dvMovBloque('Cayeron', d.cayeron, 'cuantos', 'perdido',
     'clientes que compran bastante menos', 'menos que el año anterior',
     ['Cliente', 'Hace un año', 'Último año', 'Diferencia', 'Variación'],
     function(f){ return ['<td>' + dvEsc(f.codigo) + ' · ' + dvEsc(f.cliente) + '</td>',
                          '<td class="der" data-plata="1">' + dvEsc(dvCelda(f.antes)) + '</td>',
                          '<td class="der" data-plata="1">' + dvEsc(dvCelda(f.ahora)) + '</td>',
                          '<td class="der dv-baja">' + dvEsc(dvCelda(f.diferencia)) + '</td>',
                          '<td class="der dv-baja">' + dvEsc(dvPct(f.pct)) + '</td>']; }));

  h.push(dvMovBloque('Nuevos', d.nuevos, 'cuantos', 'trajeron',
     'clientes que antes no compraban', 'trajeron en el último año',
     ['Cliente', 'Primera compra', 'Compró en el último año'],
     function(f){ return ['<td>' + dvEsc(f.codigo) + ' · ' + dvEsc(f.cliente) + '</td>',
                          '<td class="der">' + dvEsc(String(f.primera || '').substring(0,10)) + '</td>',
                          '<td class="der" data-plata="1">' + dvEsc(dvCelda(f.compro)) + '</td>']; }));
  return h.join('');
}

/* UN BLOQUE. Aparece SIEMPRE, y si no hay nadie lo dice con el motivo: una
   seccion que desaparece se lee como «falta algo» (16/11). */
function dvMovBloque(rot, b, kCuantos, kPlata, queSon, quePlata, cols, fila){
  b = b || {};
  var n = Number(b[kCuantos]) || 0, plata = Number(b[kPlata]) || 0, h = [];
  h.push('<div class="db-sec">' + dvEsc(rot) +
         '<small>' + (n ? '<b>' + dvNum(n) + '</b> ' + dvEsc(queSon) + ', ' +
                           '<b>' + dvEsc(dvCelda(Math.abs(plata))) + '</b> ' + dvEsc(quePlata) +
                           (b.filas && b.filas.length < n
                              ? '. Se muestran los ' + dvNum(b.filas.length) + ' más grandes.' : '.')
                         : 'Ninguno. Es una buena noticia y por eso está escrita.') +
         '</small></div>');
  if (!n || !b.filas || !b.filas.length) return h.join('');
  h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>');
  for (var c = 0; c < cols.length; c++)
    h.push('<th' + (c ? ' class="der"' : '') + '>' + dvEsc(cols[c]) + '</th>');
  h.push('</tr></thead><tbody>');
  for (var f = 0; f < b.filas.length; f++)
    h.push('<tr>' + fila(b.filas[f]).join('') + '</tr>');
  h.push('</tbody></table></div>');
  return h.join('');
}

function dvMovimientoPedir(){
  if (DVM.cargando) return;
  DVM.cargando = true;
  /* `rpc()` SIEMPRE devuelve `{data, ms}`, NUNCA la respuesta pelada.
     La primera version guardaba el envoltorio y la pantalla pintaba los tres
     bloques diciendo «Ninguno» con los umbrales en blanco: todo bien dibujado
     y sin un solo dato. 0 errores de consola, porque leer una clave que no
     existe en JavaScript no es un error. Lo agarre MIRANDO la pantalla, no
     una medicion. La convencion se copia de la llamada de al lado, que ya la
     tenia bien (`var d = r && r.data`). */
  rpc('api_ventas_clientes_movimiento_v1', {}).then(function(r){
    var d = r && r.data;
    DVM.cargando = false; DVM.datos = d || null; DVM.error = '';
    if (!d || d.ok === false) DVM.error = (d && d.error) || 'la base no devolvió nada';
    if (DV.pestania === 'movimiento') dvRepintar();
  }).catch(function(e){
    DVM.cargando = false; DVM.error = String((e && e.message) || e);
    if (DV.pestania === 'movimiento') dvRepintar();
  });
}
