/* ===================================================================
   BAJAR A EXCEL Y A PDF — para TODA grilla de TODA pantalla
   23/10/2026
   -------------------------------------------------------------------
   Pedido del usuario: "en cada ventana, lo que traen informacion en
   grilla, tablas, quiero que pongas para cada una, la opcion de
   descargar en excel y en pdf, segun los filtros que ponen arriba. Y
   eso para todas las pantallas... que ninguna este sin tener la opcion".

   POR QUE ESTO RECORRE EL DOM Y NO SE ENGANCHA TABLA POR TABLA.
   Hay doce grillas repartidas en seis pantallas y cada una arma su
   HTML a su manera. Engancharlas de a una es una lista escrita a mano:
   se queda corta sin avisar, y la pantalla nueva de mañana nace sin
   botones. Acá se recorre `#contenido`, y TODA tabla que aparezca —hoy
   o el año que viene— recibe su barra sola.

   Y "segun los filtros" sale gratis por el mismo motivo: lo que está en
   la pantalla ES el resultado filtrado. No se vuelve a consultar la
   base, así que el archivo no puede diferir de lo que el usuario mira.
   Igual el archivo lleva escrito arriba qué filtros estaban puestos.

   LA TRAMPA QUE ESTE ARCHIVO TIENE QUE ESQUIVAR, Y YA ESTÁ ANOTADA EN
   EL PROYECTO: un importe de un millón para arriba se MUESTRA cortado
   ("$2,64 M") y el monto exacto vive en `data-v` o en el `title`. Si el
   Excel se llevara el texto de la celda, bajaría 2,64 en vez de
   2.638.992 — mil veces menos, que es justo el defecto del 14/10. Por
   eso el orden para leer una celda es SIEMPRE:
        data-v  →  title (si el texto viene abreviado)  →  texto
   y el número se parsea de es-AR a número de verdad, nunca se escribe
   como texto en la hoja: un número guardado como texto no se suma.
   =================================================================== */

/* Los formatos los arma js/bajar-formatos.js, a mano y sin ninguna
   biblioteca: ver ahi por que. */

/* ---------- leer un número escrito en castellano ----------
   1.234.567,89 · $1.234,56 · 34,1% · -1.234 · 1.234,5 ×
   Devuelve null si no es un número: así una descripción nunca se
   convierte en cifra por accidente. */
function bajarNumero(txt){
  if (txt === null || txt === undefined) return null;
  var s = String(txt).trim();
  if (!s || s === '—' || s === '-') return null;
  s = s.replace(/ | /g, ' ')
       .replace(/\$/g, '').replace(/%/g, '').replace(/×/g, '')
       .replace(/\s/g, '').trim();
  /* es-AR: el punto separa miles y la coma los decimales */
  if (!/^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(s) && !/^-?\d+(,\d+)?$/.test(s)) return null;
  var n = Number(s.replace(/\./g, '').replace(',', '.'));
  return isFinite(n) ? n : null;
}

function bajarFecha(txt){
  var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(txt || '').trim());
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

/* ---------- leer UNA celda, con el orden que no miente ---------- */
function bajarCelda(td){
  var texto = (td.textContent || '').trim();

  /* 1. el valor exacto puesto a proposito por la pantalla */
  if (td.hasAttribute('data-v')){
    var crudo = td.getAttribute('data-v');
    if (crudo === '' || crudo === null) return { v: null, t: 'vacio' };
    var nd = Number(crudo);
    if (crudo !== '' && isFinite(nd)) return { v: nd, t: 'num', pct: /%/.test(texto) };
    return { v: crudo, t: 'texto' };
  }

  /* 2. el texto viene ABREVIADO ("$2,64 M"): el exacto está en el title */
  if (/\sM$/.test(texto) || /^no pierde/.test(texto)){
    var tt = bajarNumero(td.getAttribute('title') || '');
    if (tt !== null){
      /* "no pierde (gana $X)" guarda el positivo pero el valor es negativo */
      if (/^no pierde/.test(texto)) tt = -Math.abs(tt);
      return { v: tt, t: 'num' };
    }
  }

  /* UN CODIGO NO ES UN NUMERO. La OC 5245, el pedido 14834 y el codigo
     JHO0566 son identificadores: si se los parsea como numero, el PDF
     los escribe "5.245" y el Excel los alinea a la derecha como si
     fueran plata. La pantalla ya los marca con la clase ...-cod. */
  if (/\bcod\b|-cod\b|mv-cod|db-cod|rt-cod/.test(td.className || ''))
    return { v: texto, t: texto ? 'texto' : 'vacio', cod: true };

  /* 3. el texto, parseado */
  /* El guion largo es como esta pantalla escribe "no hay dato". Si se
     bajara como texto, la columna entera dejaria de ser numerica y en
     Excel no se podria sumar. Va como celda vacia. */
  if (texto === '\u2014' || texto === '-' || texto === '') return { v:null, t:'vacio' };
  var f = bajarFecha(texto);
  if (f) return { v: f, t: 'fecha' };
  var n = bajarNumero(texto);
  if (n !== null) return { v: n, t: 'num', pct: /%$/.test(texto) };
  return { v: texto, t: texto ? 'texto' : 'vacio' };
}

/* ---------- leer la tabla entera ---------- */
function bajarLeerTabla(tabla){
  var enc = [];
  var ths = tabla.querySelectorAll('thead th');
  for (var i = 0; i < ths.length; i++){
    var e = (ths[i].textContent || '').trim();
    enc.push(e || ('Columna ' + (i + 1)));
  }
  var filas = [], trs = tabla.querySelectorAll('tbody tr');
  for (var r = 0; r < trs.length; r++){
    var tds = trs[r].children, fila = [];
    /* una fila de "no hay datos" ocupa una sola celda con colspan: no es dato */
    if (tds.length === 1 && enc.length > 1) continue;
    for (var c = 0; c < tds.length; c++) fila.push(bajarCelda(tds[c]));
    filas.push(fila);
  }
  /* el tipo de cada columna: el que más se repite entre sus celdas con valor */
  var tipos = [];
  for (var k = 0; k < enc.length; k++){
    var cuenta = { num:0, fecha:0, texto:0 }, pct = 0, con = 0;
    for (var j = 0; j < filas.length; j++){
      var cel = filas[j][k];
      if (!cel || cel.t === 'vacio') continue;
      cuenta[cel.t] = (cuenta[cel.t] || 0) + 1;
      if (cel.pct) pct++;
      con++;
    }
    var t = 'texto';
    if (con && cuenta.num >= con * 0.8) t = 'num';
    else if (con && cuenta.fecha >= con * 0.8) t = 'fecha';
    /* una columna de codigos tampoco se recorta en el PDF: media OC
       ("5.2...") o medio pedido ("14...") no identifica nada */
    var cods = 0;
    for (var m = 0; m < filas.length; m++) if (filas[m][k] && filas[m][k].cod) cods++;
    tipos.push({ tipo: t, pct: con > 0 && pct >= con * 0.8,
                 cod: con > 0 && cods >= con * 0.8 });
  }
  return { encabezados: enc, filas: filas, tipos: tipos };
}

/* ---------- qué filtros están puestos arriba ----------
   Se leen los controles de verdad, no una lista escrita a mano: si
   mañana se agrega un filtro, aparece solo en el archivo. */
function bajarFiltros(){
  var partes = [], vistos = {};
  var campos = document.querySelectorAll('#contenido input, #contenido select');
  for (var i = 0; i < campos.length; i++){
    var el = campos[i];
    if (el.type === 'hidden' || el.disabled) continue;
    if (el.closest && el.closest('.modal-fondo')) continue;   /* los modales no son filtros */
    /* un control que solo cambia COMO se ve (filas por pagina) no cambia QUE
       datos hay: se declara con data-no-filtro y no entra al archivo */
    if (el.hasAttribute('data-no-filtro')) continue;
    if (el.closest && el.closest('[data-no-filtro]')) continue;

    var rot = bajarRotulo(el);
    var val = '';
    if (el.type === 'checkbox'){ if (!el.checked) continue; val = 'sí'; }
    else if (el.tagName === 'SELECT'){
      if (!el.value) continue;
      val = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : el.value;
    } else {
      if (!el.value) continue;
      val = el.type === 'date' ? bajarFechaCorta(el.value) : el.value;
    }
    if (!rot || vistos[rot + '=' + val]) continue;
    vistos[rot + '=' + val] = true;
    partes.push(rot + ': ' + val);
  }
  /* los chips elegidos (artículo, cliente, zona…) */
  var chips = document.querySelectorAll('#contenido .mv-chips .mv-chip > span');
  var porCampo = {};
  for (var c = 0; c < chips.length; c++){
    var caja = chips[c].closest('.mv-campo');
    var lab = caja ? caja.querySelector('label') : null;
    var nom = lab ? (lab.textContent || '').trim() : 'Filtro';
    (porCampo[nom] = porCampo[nom] || []).push((chips[c].textContent || '').trim());
  }
  for (var nk in porCampo) if (porCampo.hasOwnProperty(nk))
    partes.push(nk + ': ' + porCampo[nk].join(', '));

  return partes;
}

function bajarRotulo(el){
  if (el.id){
    var l = document.querySelector('#contenido label[for="' + el.id + '"]');
    if (l) return (l.textContent || '').trim().replace(/\s*[:：]\s*$/, '');
  }
  var p = el.closest('label');
  if (p){
    /* OJO: p.textContent trae el texto del propio control. Un <select>
       aporta todas sus opciones y el rotulo sale "Filas por pagina
       3060120250500". Van solo los nodos de texto DIRECTOS del label. */
    var t = '';
    for (var k = 0; k < p.childNodes.length; k++){
      var nd = p.childNodes[k];
      if (nd.nodeType === 3) t += nd.nodeValue;
      else if (nd.nodeType === 1 && !/^(SELECT|INPUT|TEXTAREA|OPTION)$/.test(nd.tagName)
               && !nd.querySelector('select, input, textarea')) t += nd.textContent;
    }
    t = t.trim().replace(/\s+/g, ' ').replace(/\s*[:：]\s*$/, '');
    if (t) return t;
  }
  var caja = el.closest('.fg, .mv-campo, .hil-campo');
  var lab = caja ? caja.querySelector('label') : null;
  if (lab) return (lab.textContent || '').trim().replace(/\s*[:：]\s*$/, '');
  return el.placeholder || '';
}

function bajarFechaCorta(iso){
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return m ? m[3] + '/' + m[2] + '/' + m[1] : iso;
}

/* ---------- el título de la grilla ----------
   El encabezado más cercano hacia arriba. Si no hay ninguno, el módulo. */
function bajarTitulo(tabla){
  /* El rotulo de la seccion que esta JUSTO ARRIBA de la grilla. Cada
     pantalla lo escribe a su manera: .mv-sec en Margen, .db-sec en el
     Tablero, .rt-sec en el Informe, un <h3> en el Hilo.
     LA BUSQUEDA NO PUEDE SALIRSE DE #contenido: la primera version
     trepaba hasta el <h1> de la caja de login y los archivos salian
     llamados "ingresar-al-panel-dissan". */
  var ROTULOS = 'h1,h2,h3,h4,h5,h6,.mv-sec,.db-sec,.rt-sec,.seg-titulo-h,.mv-titulo';
  var tope = document.getElementById('contenido');
  var n = tabla, pasos = 0;
  while (n && n !== tope && pasos++ < 10){
    var a = n.previousElementSibling;
    while (a){
      if (a.matches && a.matches(ROTULOS)){
        var t = bajarPrimeraLinea(a);
        if (t) return t;
      }
      var h = a.querySelector ? a.querySelector(ROTULOS) : null;
      if (h){
        var t2 = bajarPrimeraLinea(h);
        if (t2) return t2;
      }
      a = a.previousElementSibling;
    }
    n = n.parentElement;
  }
  var tm = document.getElementById('tituloModulo');
  return tm ? (tm.textContent || '').trim() : 'Detalle';
}

/* El rotulo suele traer colgado un contador ("De donde sale el costo
   4 calidades"): se queda con la primera linea, que es el nombre. */
function bajarPrimeraLinea(el){
  var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
  var hijo = el.firstChild;
  if (hijo && hijo.nodeType === 3 && hijo.nodeValue.trim())
    t = hijo.nodeValue.replace(/\s+/g, ' ').trim();
  return t.slice(0, 90);
}

function bajarNombreArchivo(t){
  return String(t || 'detalle').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').trim().replace(/\s+/g, '-').slice(0, 60) || 'detalle';
}

function bajarHoy(){
  var d = new Date();
  return d.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' }) +
         ' ' + d.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' });
}

function bajarArchivo(bytes, tipo, nombre){
  var url = URL.createObjectURL(new Blob([bytes], { type: tipo }));
  var a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 20000);
}

/* =====================================================================
   EXCEL
   El archivo lleva arriba de todo QUÉ es, CON QUÉ FILTROS y CUÁNDO se
   bajó. Sin eso, una planilla suelta en un mail no se puede volver a
   atar a la pantalla que la produjo.
   Los números van como números y las fechas como fechas: una cifra
   guardada como texto no se suma, y eso ya pasó una vez en este
   proyecto con `ultima_venta`.
   ===================================================================== */
function bajarAExcel(tabla, boton){
  var rotulo = boton.textContent;
  boton.disabled = true; boton.textContent = 'Armando\u2026';
  Promise.resolve().then(function(){
    var d = bajarLeerTabla(tabla);
    if (!d.filas.length) throw new Error('No hay renglones para bajar.');
    var titulo = bajarTitulo(tabla), filtros = bajarFiltros();
    var modulo = ((document.getElementById('tituloModulo') || {}).textContent || 'DISSAN').trim();

    var filas = d.filas.map(function(f){
      return d.encabezados.map(function(_, c){
        var cel = f[c];
        return (cel && cel.t !== 'vacio') ? cel : { v:null, t:'vacio' };
      });
    });

    /* el formato de cada columna sale de lo que de verdad tiene adentro */
    var formatos = d.tipos.map(function(t, k){
      if (t.tipo !== 'num') return '';
      if (t.pct) return 'pct';
      var entero = true;
      for (var r = 0; r < filas.length; r++){
        var v = filas[r][k];
        if (v && v.t === 'num' && !Number.isInteger(v.v)) { entero = false; break; }
      }
      return entero ? 'ent' : 'num';
    });

    var anchos = d.encabezados.map(function(e, k){
      var a = Math.max(10, e.length + 3);
      for (var r = 0; r < Math.min(filas.length, 300); r++){
        var cel = filas[r][k];
        if (!cel || cel.t === 'vacio') continue;
        var L = (cel.t === 'num') ? String(Math.round(cel.v)).length + 5
              : (cel.t === 'fecha' ? 11 : String(cel.v).length);
        if (L + 2 > a) a = L + 2;
      }
      return Math.min(44, a);
    });

    return bajarXlsx({
      nombre: 'Detalle',
      titulo: ['DISSAN \u00b7 ' + modulo, titulo,
               filtros.length ? 'Filtros: ' + filtros.join('  \u00b7  ') : 'Sin filtros',
               d.filas.length + (d.filas.length === 1 ? ' rengl\u00f3n' : ' renglones') +
               ' \u00b7 bajado el ' + bajarHoy()],
      encabezados: d.encabezados, filas: filas, formatos: formatos, anchos: anchos
    }).then(function(bytes){
      bajarArchivo(bytes,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        bajarNombreArchivo(titulo) + '.xlsx');
      boton.textContent = 'Bajado \u00b7 ' + d.filas.length;
      setTimeout(function(){ boton.textContent = rotulo; }, 5000);
    });
  }).catch(function(e){
    boton.textContent = 'No se pudo: ' + (e.message || e);
    setTimeout(function(){ boton.textContent = rotulo; }, 7000);
  }).then(function(){ boton.disabled = false; });
}

/* =====================================================================
   PDF
   Apaisado siempre: estas tablas tienen hasta 24 columnas y en vertical
   no entra ninguna. El encabezado repite en cada hoja y el pie numera,
   para que un informe impreso de 30 páginas siga siendo legible.
   ===================================================================== */
function bajarAPDF(tabla, boton){
  var rotulo = boton.textContent;
  boton.disabled = true; boton.textContent = 'Armando\u2026';
  Promise.resolve().then(function(){
    var d = bajarLeerTabla(tabla);
    if (!d.filas.length) throw new Error('No hay renglones para bajar.');
    var titulo = bajarTitulo(tabla), filtros = bajarFiltros();
    var modulo = ((document.getElementById('tituloModulo') || {}).textContent || 'DISSAN').trim();

    /* el texto que va al PDF es EL QUE SE VE EN PANTALLA, para que el
       papel y la pantalla digan lo mismo; el Excel se lleva el exacto. */
    var filas = d.filas.map(function(f){
      return f.map(function(cel, k){
        if (!cel || cel.t === 'vacio') return '';
        if (cel.t === 'fecha' && cel.v instanceof Date)
          return cel.v.toLocaleDateString('es-AR', {day:'2-digit',month:'2-digit',year:'numeric'});
        if (cel.t === 'num')
          return cel.v.toLocaleString('es-AR', { maximumFractionDigits:2 }) +
                 (d.tipos[k] && d.tipos[k].pct ? '%' : '');
        return String(cel.v);
      });
    });

    var bytes = bajarPdf({
      titulo: 'DISSAN \u00b7 ' + modulo,
      subtitulo: titulo,
      pie: [ filtros.length ? 'Filtros: ' + filtros.join('  \u00b7  ') : 'Sin filtros',
             d.filas.length + ' renglones \u00b7 ' + bajarHoy() ],
      encabezados: d.encabezados,
      filas: filas,
      alinear: d.tipos.map(function(t){ return t.tipo === 'num' ? 'der' : 'izq'; }),
      /* las fechas tampoco se recortan: ver la nota en bajar-formatos.js */
      fijas:   d.tipos.map(function(t){ return t.tipo === 'fecha' || t.cod; })
    });
    bajarArchivo(bytes, 'application/pdf', bajarNombreArchivo(titulo) + '.pdf');
    boton.textContent = 'Bajado \u00b7 ' + d.filas.length;
    setTimeout(function(){ boton.textContent = rotulo; }, 5000);
  }).catch(function(e){
    boton.textContent = 'No se pudo: ' + (e.message || e);
    setTimeout(function(){ boton.textContent = rotulo; }, 7000);
  }).then(function(){ boton.disabled = false; });
}

/* =====================================================================
   LA BARRA, PUESTA SOLA EN TODA TABLA
   Un MutationObserver sobre #contenido: cada vez que una pantalla
   repinta (apretar Calcular, cambiar de vista, abrir un detalle) las
   tablas nuevas reciben su barra. Ninguna queda sin la opción, que es
   exactamente lo que se pidió.
   ===================================================================== */
function bajarPonerBotones(){
  var cont = document.getElementById('contenido');
  if (!cont) return;
  var tablas = cont.querySelectorAll('table');
  for (var i = 0; i < tablas.length; i++){
    var t = tablas[i];
    if (t.dataset.bajar === '1') continue;
    if (t.closest('.modal-fondo')) continue;        /* los modales no son grillas */
    if (!t.querySelector('tbody tr')) continue;     /* todavía no tiene datos */
    t.dataset.bajar = '1';

    var barra = document.createElement('div');
    barra.className = 'bajar-barra';
    barra.innerHTML =
      '<button type="button" class="bajar-btn" data-que="excel">' + BAJAR_ICONO_XLS +
      'Excel</button>' +
      '<button type="button" class="bajar-btn" data-que="pdf">' + BAJAR_ICONO_PDF +
      'PDF</button>';

    (function(tabla, barra){
      barra.addEventListener('click', function(ev){
        var b = ev.target.closest('.bajar-btn');
        if (!b) return;
        if (b.getAttribute('data-que') === 'excel') bajarAExcel(tabla, b);
        else bajarAPDF(tabla, b);
      });
    })(t, barra);

    /* la barra va arriba de la caja que envuelve la tabla, no adentro:
       adentro queda atrapada por el scroll horizontal y no se encuentra */
    var caja = t.parentElement;
    var envoltorio = (caja && caja !== cont && /caja|wrap|tb/.test(caja.className || ''))
                     ? caja : t;
    envoltorio.parentNode.insertBefore(barra, envoltorio);
  }
}

var BAJAR_ICONO_XLS =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/>' +
  '<path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M4 18v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/></svg>';
var BAJAR_ICONO_PDF = BAJAR_ICONO_XLS;

(function(){
  function arrancar(){
    var cont = document.getElementById('contenido');
    if (!cont) return;
    bajarPonerBotones();
    var pendiente = null;
    new MutationObserver(function(){
      clearTimeout(pendiente);
      pendiente = setTimeout(bajarPonerBotones, 120);
    }).observe(cont, { childList:true, subtree:true });
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
