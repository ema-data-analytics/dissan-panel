/* DISSAN · Listas de precios de proveedor                       27/10/2026
   ---------------------------------------------------------------------------
   La cadena, entera desde el navegador:

     el archivo del laboratorio
        -> si es PDF:    se lee ACA, con la pdf.js del repo (js/vendor/)
           si es Excel:  Edge Function `listas`, que lee por celda con exceljs
        -> api_listas_armar         liga el codigo del laboratorio con el articulo
                                    de DISSAN por el SINONIMO, aplica la regla de
                                    costeo y devuelve las 12 columnas de Tango
        -> js/bajar.js              arma el .xlsx desde lo que esta en la pantalla

   Dos cosas que NO se repiten de otras pantallas:

   1. La Edge Function se llama con `fetch` crudo + Authorization + apikey, nunca
      con sb.functions.invoke: con payloads grandes invoke devuelve
      "Edge Function returned a non-2xx status code" mientras el mismo fetch
      devuelve 200 y el cuerpo entero (medido el 20/10 con 12.082 filas).

   2. No se usan alert, confirm ni prompt: un dialogo del navegador bloquea la
      pestaña y la automatizacion deja de responder.

   `esc` ya esta declarada con const en core.js. Acá NO se vuelve a declarar: un
   `function esc(){}` en el ambito global rompe el archivo entero con SyntaxError.
   --------------------------------------------------------------------------- */
'use strict';

var LP_PROV = [];      /* los proveedores con su regla */
var LP_LEIDO = null;   /* lo que devolvio la lectura (navegador o Edge Function) */
var LP_ARMADO = null;  /* lo que devolvio api_listas_armar */

/* Edge Function por fetch crudo, con un reintento. */
function LP_FN(nombre, cuerpo, intento) {
  intento = intento || 1;
  return sb.auth.getSession().then(function (s) {
    var ses = s && s.data ? s.data.session : null;
    if (!ses) throw new Error('La sesion vencio. Volve a entrar.');
    return fetch(SB_URL + '/functions/v1/' + nombre, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
                 'Authorization': 'Bearer ' + ses.access_token,
                 'apikey': SB_KEY },
      body: JSON.stringify(cuerpo)
    });
  }).then(function (r) {
    return r.text().then(function (txt) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' · ' + txt.slice(0, 200));
      try { return JSON.parse(txt); }
      catch (e) { throw new Error('el servidor contesto algo que no se pudo leer'); }
    });
  }).catch(function (e) {
    if (intento < 2) return LP_FN(nombre, cuerpo, intento + 1);
    throw e;
  });
}

/* El archivo a base64 sin reventar la pila: String.fromCharCode(...bytes) con un
   PDF de 1 MB tira "Maximum call stack size exceeded". Va por tandas.
   Sigue haciendo falta para el Excel, que se lee en la Edge Function. */
function lpBase64(buf) {
  var b = new Uint8Array(buf), s = '', i;
  for (i = 0; i < b.length; i += 8192) {
    s += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
  }
  return btoa(s);
}

/* ===================================================================
   EL LECTOR DE PDF, EN EL NAVEGADOR                      27/10/2026
   -------------------------------------------------------------------
   POR QUE SE MOVIO DEL SERVIDOR AL NAVEGADOR. Esta MEDIDO en los
   registros de Supabase, no supuesto:

     event loop error: ReferenceError: DOMMatrix is not defined
        en pdfjs-dist/5.7.284/legacy/build/pdf.mjs:17006
     Warning: Cannot polyfill `DOMMatrix`, rendering may be broken.
     Warning: Cannot polyfill `Path2D` / `ImageData`
     Warning: Cannot load "@napi-rs/canvas"

   pdf.js CARGA en la Edge Function pero necesita APIs del navegador que
   ese runtime no tiene y no deja poner a mano — unpdf@1.9.1 tampoco lo
   consigue: avisa `Cannot polyfill` y falla igual. Y los import()
   dinamicos no andan ahi: Supabase arma la lista de paquetes al
   desplegar, asi que todo import va fijo arriba del archivo.
   EL NAVEGADOR SI TIENE DOMMatrix: aca pdf.js es su caso de uso normal.

   EL EXCEL SIGUE EN LA EDGE FUNCTION: exceljs no necesita nada del
   navegador y ese camino esta probado. No se toca lo que anda.

   LA LIBRERIA VIVE EN EL REPO (js/vendor/, pdfjs-dist 5.7.284, la misma
   version con la que se midieron las listas), NO EN UN CDN. Dos razones:
   el contenedor de desarrollo no llega a internet y lo que no se puede
   correr no se puede probar; y servida desde el repo se prueba igual que
   en produccion, sin que un CDN cambie la version abajo de la pantalla.

   -------------------------------------------------------------------
   POR QUE SE LEE POR COORDENADA Y NO POR TEXTO PLANO

   Con el texto plano la lista de COLOPLAST da 179 de 251 productos: el
   codigo y las unidades por caja vienen pegados en el mismo renglon de
   texto y el numero no se puede separar del codigo sin adivinar.
   Leyendo por la POSICION de cada elemento en la pagina, el codigo sale
   de su columna, las unidades por caja de la suya y el precio de la suya.

   MEDIDO con esta misma pdf.js contra las listas reales (27/10):
     COLOPLAST  249 productos leidos -> 241 entran = los 241 del archivo
                que armo DISSAN a mano, con la suma de Precio identica al
                centavo.
     SILMAG 224 · GAVAMAX 79 · CAPACCIOLI 68 · ICU 40 · BD 123 · D.MEDICA 31.

   EL MAPEO NO ESTA CABLEADO ACA. Vive en cotiza.lista_proveedor.lectura
   (jsonb), una fila por laboratorio. Agregar un proveedor nuevo es
   cargar esa fila, no tocar este archivo.

   LAS FRANJAS DE x SE SOLAPAN SI NO SE MIDEN. En COLOPLAST la franja de
   'unidades por caja' estaba en [60,155] y la descripcion arranca en
   x=135 en la pagina 11: el '1' quedaba pegado a 'Brava', se leia vacio,
   y 9 articulos que Tango compra por caja se apartaban por falta de
   unidades cuando la lista SI las trae. Va [60,132]. Antes de cargar una
   franja, mirar donde arranca la de al lado.

   LA IMAGEN SE RECHAZA. De una foto no se puede leer un precio con
   seguridad, y un digito mal leido es una cotizacion perdida o una venta
   bajo el costo.
   =================================================================== */

/* La ruta de la libreria se calcula UNA VEZ, al cargar este archivo, desde
   document.currentScript, y queda ABSOLUTA. Un import() con ruta relativa
   escrito adentro de un .then() no resuelve contra este archivo sino contra
   el documento, porque ahi ya no hay "active script": la ruta caeria en otro
   lugar y el error seria un 404 de un archivo que si existe. */
var LP_PDFJS = (function () {
  var s = document.currentScript;
  var base = (s && s.src) ? s.src : new URL('js/listas.js', document.baseURI).href;
  return {
    lib: new URL('vendor/pdf.min.mjs', base).href,
    worker: new URL('vendor/pdf.worker.min.mjs', base).href
  };
})();

var LP_PDFMOD = null;

/* Se carga una sola vez y recien cuando hay un PDF: son 485 KB + 1,2 MB que
   el camino del Excel no necesita bajar. */
function lpPdfjs() {
  if (LP_PDFMOD) return Promise.resolve(LP_PDFMOD);
  return import(LP_PDFJS.lib).then(function (m) {
    var mod = m && m.getDocument ? m : (m && m.default ? m.default : m);
    if (!mod || typeof mod.getDocument !== 'function') {
      throw new Error('la libreria de PDF del repo no expone getDocument');
    }
    mod.GlobalWorkerOptions.workerSrc = LP_PDFJS.worker;
    LP_PDFMOD = mod;
    return mod;
  });
}

function lpDef(v, d) { return (v === null || v === undefined || v === '') ? d : v; }

/** '8.558,91' (castellano) o '8,558.91' (ingles), segun el fmt del laboratorio */
function lpANumero(s, fmt) {
  var t = String(s).trim();
  if (!t) return null;
  t = fmt === 'us' ? t.replace(/,/g, '') : t.replace(/\./g, '').replace(/,/g, '.');
  var v = Number(t);
  return isFinite(v) ? v : null;
}

var LP_HDR = {};
['CODIGO', 'COD', 'SKU', 'ARTICULO', 'PRODUCTO', 'PRECIO', 'DESCRIPCION', 'UNITARIO',
 'LISTA', 'TOTAL', 'BONIF', 'CATEGORIA', 'SSKKUU', 'PAG', 'PAGINA', 'ITEM', 'CANT',
 'MARCA', 'MODELO', 'MEDIDAS', 'PRESENTACION', 'UNIDADES', 'CAJA', 'IVA', 'SIN', 'CON',
 'MINORISTA', 'INDICE', 'MATERIAL', 'COD_ARTIC'].forEach(function (x) { LP_HDR[x] = true; });

function lpSinTildes(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

var LP_FRAG = /^[0-9.,]+$/;
var LP_NUMTOK = /^[0-9][0-9.,]*$/;
var LP_CUR = /^(\$|USD|U\$S|US\$)$/;
var LP_CURNUM = /^(?:\$|USD|U\$S|US\$)\s*([0-9][0-9.,]*)$/;

/**
 * Un elemento de texto de pdf.js puede traer varias palabras juntas. Se parte
 * por espacios y se reparte el ancho del elemento entre los caracteres: las
 * franjas de columna son anchas, asi que la aproximacion alcanza. Tomando los
 * elementos enteros, una linea que viene en un solo elemento rompe todas las
 * franjas.
 */
function lpPalabrasDeItems(items) {
  var out = [], k, it, s, x, y, w, n, porChar, i, j;
  for (k = 0; k < items.length; k++) {
    it = items[k];
    s = (it && typeof it.str === 'string') ? it.str : '';
    if (!s.trim()) continue;
    x = Number((it.transform && it.transform[4]) || 0);
    y = Number((it.transform && it.transform[5]) || 0);
    w = Number(it.width || 0);
    n = s.length;
    porChar = (n > 0 && w > 0) ? w / n : 0;
    i = 0;
    while (i < n) {
      if (s[i] === ' ') { i++; continue; }
      j = i;
      while (j < n && s[j] !== ' ') j++;
      out.push({ text: s.slice(i, j), x0: x + i * porChar, x1: x + j * porChar, y: y });
      i = j;
    }
  }
  return out;
}

/** agrupa por renglon: la misma linea de base, con tolerancia */
function lpRenglones(pal, tol) {
  var ord = pal.slice().sort(function (a, b) { return (b.y - a.y) || (a.x0 - b.x0); });
  var lineas = [], actual = [], yRef = Number.NaN, i, p;
  for (i = 0; i < ord.length; i++) {
    p = ord[i];
    if (isNaN(yRef) || Math.abs(p.y - yRef) <= tol) {
      if (isNaN(yRef)) yRef = p.y;
      actual.push(p);
    } else { lineas.push(actual); actual = [p]; yRef = p.y; }
  }
  if (actual.length) lineas.push(actual);
  return lineas.map(function (l) {
    return l.sort(function (a, b) { return a.x0 - b.x0; });
  });
}

function lpEnFranja(ln, r) {
  if (!r) return '';
  return ln.filter(function (w) { return w.x0 >= r[0] && w.x0 < r[1]; })
           .map(function (w) { return w.text; }).join('');
}
function lpTextoFranja(ln, r) {
  if (!r) return '';
  return ln.filter(function (w) { return w.x0 >= r[0] && w.x0 < r[1]; })
           .map(function (w) { return w.text; }).join(' ').trim();
}

/** el precio: anclado al signo de moneda, o por franja de x */
function lpPrecioDeLinea(ln, pcfg) {
  var modo = (pcfg && pcfg.modo) ? pcfg.modo : 'moneda';
  if (modo === 'rango') {
    var t0 = lpEnFranja(ln, pcfg.x).trim();
    return (t0 && LP_NUMTOK.test(t0)) ? t0 : null;
  }
  var quiero = Number(lpDef(pcfg && pcfg.ocurrencia, 1));
  var vistos = 0, i, k, t, t2, m, piezas, prev;
  for (i = 0; i < ln.length; i++) {
    t = ln[i].text;
    m = LP_CURNUM.exec(t);
    if (m) { vistos++; if (vistos === quiero) return m[1]; continue; }
    if (LP_CUR.test(t)) {
      vistos++;
      piezas = [];
      prev = 0;
      for (k = i + 1; k < ln.length; k++) {
        t2 = ln[k].text;
        if (!LP_FRAG.test(t2)) break;
        if (piezas.length && (ln[k].x0 - prev) > 6) break;   /* salto de columna */
        if (!piezas.length && !/[0-9]/.test(t2[0])) break;
        piezas.push(t2); prev = ln[k].x1;
      }
      if (vistos === quiero) return piezas.length ? piezas.join('') : null;
    }
  }
  return null;
}

/* La lectura del PDF, pagina por pagina. Identica a la que corria en la Edge
   Function: mismas franjas, misma tolerancia de y, mismos descartes. */
function lpLeerPdf(buf, cfg, diag) {
  return lpPdfjs().then(function (pdfjs) {
    var tarea = pdfjs.getDocument({
      data: new Uint8Array(buf),
      useSystemFonts: false,
      isEvalSupported: false,
      disableFontFace: true,
      useWorkerFetch: false
    });
    return tarea.promise.then(function (doc) {
      var tol = Number(lpDef(cfg.y_tol, 2));
      var maxcod = Number(lpDef(cfg.max_cod, 22));
      var fmt = String(lpDef(cfg.fmt, 'ar'));
      var codRe = cfg.cod_re ? new RegExp(cfg.cod_re) : null;
      var filas = [], descartes = [], muestra = [];
      var paginas = doc.numPages || 0;
      var p = 0;

      function unaPagina() {
        p++;
        if (p > paginas) {
          return { filas: filas, descartes: descartes, muestra: muestra,
                   paginas: paginas,
                   motor: 'pdf.js ' + (pdfjs.version || '?') + ' · en el navegador' };
        }
        return doc.getPage(p).then(function (page) {
          return page.getTextContent();
        }).then(function (tc) {
          var lns = lpRenglones(lpPalabrasDeItems((tc && tc.items) || []), tol);
          var i, ln, cod, pretxt, precio, caja, ct, c;
          if (diag && p <= 4) {
            lns.slice(0, 14).forEach(function (ln2) {
              muestra.push({ pag: p, linea: ln2.map(function (w) {
                return w.text + '@' + Math.round(w.x0);
              }).join(' | ').substring(0, 220) });
            });
          }
          for (i = 0; i < lns.length; i++) {
            ln = lns[i];
            cod = lpEnFranja(ln, cfg.cod).trim().replace(/\s+/g, '').replace(/\*+$/, '');
            if (!cod) continue;
            if (LP_HDR[lpSinTildes(cod).toUpperCase().replace(/^[.:]+|[.:]+$/g, '')]) continue;
            if (cod.length > maxcod) continue;
            if (codRe && !codRe.test(cod)) continue;

            pretxt = lpPrecioDeLinea(ln, cfg.precio);
            if (pretxt === null) {
              descartes.push({ cod: cod, pag: p, porque: 'no hay precio en el renglon' });
              continue;
            }
            precio = lpANumero(pretxt, fmt);
            if (precio === null || precio <= 0) {
              descartes.push({ cod: cod, pag: p, porque: 'precio ilegible: ' + pretxt });
              continue;
            }
            caja = null;
            if (cfg.caja) {
              ct = lpEnFranja(ln, cfg.caja).trim();
              if (LP_NUMTOK.test(ct)) {
                c = lpANumero(ct, fmt);
                caja = (c !== null && c > 0) ? c : null;
              }
            }
            filas.push({ cod: cod,
                         descripcion: lpTextoFranja(ln, cfg.desc || [cfg.cod[1], 320]) || null,
                         precio: precio, caja: caja, pag: p });
          }
          return unaPagina();
        });
      }
      return unaPagina();
    });
  });
}

/* ---- la regla de costeo del laboratorio, y la respuesta ----
   Es la MISMA que arma la Edge Function, con los mismos textos, para que la
   pantalla diga lo mismo venga la lista en PDF o en Excel. El Excel la sigue
   armando el servidor; esta copia es la del camino del PDF. */
function lpArmarLectura(prov, nombre, leido, ms, cfg, diag) {
  var factor = (prov.factor === null || prov.factor === undefined) ? 1 : Number(prov.factor);
  var moneda = String(prov.moneda || 'ARS').toUpperCase();
  var avisos = [];

  if (prov.tipo_regla === 'pendiente') {
    avisos.push('La regla de costeo de ' + prov.proveedor + ' esta PENDIENTE de definir: ' +
                'el costo va igual al precio de lista, sin descuento.');
  }
  if (prov.tipo_regla === 'descuento_variable') {
    avisos.push(prov.proveedor + ': el descuento es por pago anticipado, no por renglon. ' +
                'El costo va al precio de la columna, sin descuento.');
  }
  if (prov.tipo_regla === 'dolar') {
    avisos.push('La lista esta en dolares y NO se convierte: el precio viaja en US$ y la ' +
                'columna Moneda dice DOLAR. No se inventa una cotizacion.');
  }
  if (prov.tipo_regla === 'columna') {
    avisos.push('El costo sale de la columna "' + lpDef(cfg.titulo_precio, '(sin titulo)') +
                '" de la lista.');
  }
  if (!prov.codigo_lista) {
    avisos.push(prov.proveedor + ' no tiene lista de precios de compra en Tango (cpa43): ' +
                'la columna Cod. Lista va vacia.');
  }

  var filas = leido.filas.map(function (f) {
    return {
      cod_proveedor: f.cod,
      descripcion: f.descripcion,
      precio_lista: f.precio,
      moneda: moneda === 'USD' ? 'USD' : 'ARS',
      unidades_caja: f.caja,
      costo_calculado: (f.precio === null || f.precio === undefined)
        ? null : Math.round(f.precio * factor * 10000) / 10000
    };
  });

  var conPrecio = filas.filter(function (f) {
    return f.precio_lista !== null && f.precio_lista > 0;
  }).length;
  var conCaja = filas.filter(function (f) { return f.unidades_caja !== null; }).length;
  if (conPrecio < filas.length) {
    avisos.push((filas.length - conPrecio) +
                ' renglones de la lista no traen precio y no van a entrar.');
  }
  if (!filas.length) {
    avisos.push('No se leyo ningun renglon. Si el laboratorio cambio el formato de la lista, ' +
                'hay que medir de nuevo las franjas de lectura antes de cargarla.');
  }

  var resp = {
    ok: filas.length > 0,
    proveedor: prov.proveedor,
    proveedor_id: Number(prov.id),
    archivo: nombre,
    regla: { tipo: prov.tipo_regla, factor: factor, texto: prov.regla, moneda: moneda },
    lectura: {
      motor: leido.motor, tipo: 'pdf',
      paginas: leido.paginas || null, hojas: null,
      filas_leidas: filas.length, con_precio: conPrecio,
      con_unidades_caja: conCaja, descartes: leido.descartes.length
    },
    avisos: avisos,
    filas: filas,
    ms: ms
  };
  if (diag) resp.diag = { muestra: leido.muestra, descartes: leido.descartes.slice(0, 20) };
  return resp;
}

var LP_IMAGEN = /\.(jpe?g|png|gif|bmp|webp|tiff?|heic)$/i;

/* Decide el camino: PDF en el navegador, todo lo demas en la Edge Function.
   Los rechazos del camino del PDF dicen lo mismo que decia el servidor. */
function lpLeer(prov, f, diag) {
  var nombre = f.name;
  var esPdf = /\.pdf$/i.test(nombre) && !LP_IMAGEN.test(nombre);
  if (!esPdf) {
    return f.arrayBuffer().then(function (buf) {
      return LP_FN('listas', {
        proveedor_id: Number(prov.id),
        nombre_archivo: nombre,
        archivo_base64: lpBase64(buf),
        diag: diag === true
      });
    });
  }

  var cfg = prov.lectura || {};
  var fuera = function (texto) {
    return Promise.resolve({ ok: false, filas: [], proveedor: prov.proveedor,
                             archivo: nombre, avisos: [texto] });
  };
  if (cfg.tipo === 'imagen') {
    return fuera('La lista viene como imagen. Pedirla en Excel o PDF.');
  }
  if (!cfg.tipo) {
    return fuera(prov.proveedor + ' no tiene cargada la configuracion de lectura ' +
                 '(cotiza.lista_proveedor.lectura).');
  }
  if (cfg.tipo !== 'pdf') {
    return fuera(prov.proveedor + ' manda la lista en ' + String(cfg.tipo).toUpperCase() +
                 ' y este archivo es PDF. Si el laboratorio cambio el formato hay que ' +
                 'actualizar la configuracion de lectura antes de cargarla.');
  }

  var t0 = Date.now();
  return f.arrayBuffer().then(function (buf) {
    return lpLeerPdf(buf, cfg, diag === true);
  }).then(function (leido) {
    return lpArmarLectura(prov, nombre, leido, Date.now() - t0, cfg, diag === true);
  });
}

function lpCargando(si, texto) {
  var c = $('lpCargando');
  if (!c) return;
  c.hidden = !si;
  if (texto) $('lpCargandoTxt').textContent = texto;
  $('lpProcesar').disabled = !!si;
  $('lpProcesar').textContent = si ? 'Procesando…' : 'Procesar la lista';
}

/* ---------- el selector de proveedor ---------- */

function lpPintarRegla() {
  var caja = $('lpRegla');
  var p = LP_PROV.filter(function (x) { return String(x.id) === $('lpProv').value; })[0];
  if (!p) { caja.hidden = true; caja.innerHTML = ''; return; }
  var partes = [];
  partes.push('<b>' + esc(p.proveedor) + '</b>');
  partes.push('CUIT ' + (p.cuit ? esc(p.cuit) : '<b>sin CUIT en cpa01</b>'));
  partes.push('Cód. Lista ' + (p.codigo_lista
    ? esc(p.codigo_lista) + (p.desc_lista ? ' · ' + esc(p.desc_lista) : '')
    : '<b>no tiene lista en Tango</b>'));
  partes.push('Moneda ' + (String(p.moneda).toUpperCase() === 'USD' ? 'DOLAR' : 'PESOS'));
  partes.push('Vigencia ' + (p.vigencia ? esc(lpFechaCorta(p.vigencia)) : '<b>sin fecha</b>'));
  var h = partes.join(' &nbsp;·&nbsp; ');
  h += '<br>Regla: ' + esc(p.regla || '(sin regla cargada)');
  if (p.factor !== null && p.factor !== undefined && Number(p.factor) !== 1) {
    h += ' &nbsp;→&nbsp; precio de lista × <b>' + esc(String(p.factor)) + '</b>';
  }
  if (!p.se_puede_leer) {
    h += '<br><b>Esta lista no se puede leer todavía</b>: '
      + esc((p.lectura && p.lectura.nota) || 'falta la configuración de lectura del laboratorio')
      + '.';
  } else {
    h += '<br>Se espera un <b>' + esc(String(p.lectura.tipo).toUpperCase()) + '</b>'
      + (p.lectura.tipo === 'pdf' ? ', que se lee en esta misma pantalla.' : '.');
  }
  caja.innerHTML = h;
  caja.hidden = false;
}

function lpFechaCorta(iso) {
  var s = String(iso || '');
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(8, 10) + '/' + s.substring(5, 7) + '/' + s.substring(0, 4);
  }
  return s;
}

function lpCargarProveedores() {
  return rpc('api_listas_proveedores', {}).then(function (r) {
    LP_PROV = r.data || [];
    var s = $('lpProv');
    s.innerHTML = '<option value="">Elegí el proveedor…</option>'
      + LP_PROV.map(function (p) {
          return '<option value="' + p.id + '">' + esc(p.proveedor)
            + (p.codigo_lista ? ' · ' + esc(p.codigo_lista) : '')
            + (p.se_puede_leer ? '' : ' (no se puede leer)')
            + '</option>';
        }).join('');
    s.addEventListener('change', lpPintarRegla);
  });
}

/* ---------- procesar ---------- */

function lpProcesar() {
  var provId = Number($('lpProv').value || 0);
  var f = $('lpArch').files && $('lpArch').files[0];
  LP_LEIDO = null; LP_ARMADO = null;
  if (!provId) return lpError('Elegí el proveedor antes de procesar.');
  if (!f) return lpError('Elegí el archivo de la lista.');
  var prov = LP_PROV.filter(function (x) { return Number(x.id) === provId; })[0];
  if (!prov) return lpError('No existe el proveedor ' + provId + '.');

  lpCargando(true, 'Leyendo ' + f.name + '…');
  $('cuerpo').innerHTML = '';

  lpLeer(prov, f).then(function (leido) {
    LP_LEIDO = leido;
    if (!leido.ok) { lpCargando(false); return lpError(null, leido); }
    lpCargando(true, 'Ligando ' + leido.lectura.filas_leidas + ' renglones con los artículos de Tango…');
    return rpc('api_listas_armar', { p_lista_id: provId, p_filas: leido.filas })
      .then(function (r) {
        LP_ARMADO = r.data;
        LP_ARMADO._ms = r.ms;
        lpCargando(false);
        lpPintar();
      });
  }).catch(function (e) {
    lpCargando(false);
    lpError('No se pudo procesar la lista: ' + (e.message || e));
  });
}

function lpError(texto, leido) {
  var h = '<div class="lp-aviso"><b>No se pudo seguir.</b>';
  if (texto) h += ' ' + esc(texto);
  if (leido && leido.avisos && leido.avisos.length) {
    h += '<ul>' + leido.avisos.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>';
  }
  h += '</div>';
  $('cuerpo').innerHTML = h;
}

/* ---------- la pantalla del resultado ----------
   El ultimo renglon de esta funcion es el que ESCRIBE. Una pintar() que corre y
   no escribe no da error en la consola y parece que anda: paso el 21/10 con la
   pantalla de Cartera. */
function lpPintar() {
  var a = LP_ARMADO, l = LP_LEIDO;
  if (!a || !a.ok) return lpError((a && a.error) || 'la base no devolvió el armado');

  var res = a.resumen || {}, lista = a.lista || {}, lec = l.lectura || {};
  var h = [];

  h.push('<div class="lp-sec">Lo que se leyó de la lista</div>');
  h.push('<div class="lp-sec-pie">' + esc(l.archivo) + ' · ' + esc(lista.proveedor)
    + ' · leída con ' + esc(lec.motor)
    + (lec.paginas ? ' · ' + lec.paginas + ' páginas' : '')
    + (lec.hojas ? ' · hoja ' + esc([].concat(lec.hojas).join(', ')) : '')
    + ' · ' + num(l.ms) + ' ms de lectura y ' + num(a._ms) + ' ms de la base</div>');

  h.push('<div class="lp-tarjetas">');
  h.push(lpT(num(res.leidas), 'renglones leídos'));
  h.push(lpT(num(res.entran), 'entran al archivo', 'lp-bien'));
  h.push(lpT(num(res.afuera), 'quedan afuera', Number(res.afuera) ? 'lp-mal' : ''));
  h.push(lpT(num(lec.con_unidades_caja), 'con unidades por caja'));
  h.push(lpT(esc(lista.codigo_lista || '—'), 'cód. lista de Tango'));
  h.push(lpT(esc(lista.vigencia), 'vigencia desde'));
  h.push('</div>');

  /* avisos: primero los de la lectura, despues el por que de cada apartado */
  var avisos = [].concat(l.avisos || []);
  if (res.regla_pendiente) {
    avisos.push('La regla de costeo de este laboratorio todavía no está definida: '
      + 'el costo va igual al precio de lista.');
  }
  if (Number(res.dif_costo_contra_la_lectura) > 0.0001) {
    avisos.push('El costo que calculó la lectura y el que calculó la base no coinciden '
      + '(máxima diferencia ' + exacto(res.dif_costo_contra_la_lectura) + '). '
      + 'Vale el de la base. Hay que revisar el factor antes de importar.');
  }
  var porque = a.por_que_queda_afuera || {};
  var claves = Object.keys(porque);
  if (claves.length) {
    avisos.push('De los ' + num(res.leidas) + ' renglones leídos quedan afuera '
      + num(res.afuera) + ': ' + claves.map(function (k) {
          return num(porque[k]) + ' ' + k;
        }).join(' · ') + '.');
  }
  if (avisos.length) {
    h.push('<div class="lp-aviso"><b>Lo que hay que mirar antes de importar</b><ul>'
      + avisos.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('')
      + '</ul></div>');
  }

  /* los que Tango compra por caja y SI entran: el dato con el que se controla */
  if (a.por_caja && a.por_caja.length) {
    h.push('<div class="lp-sec">Artículos que Tango compra por caja</div>');
    h.push('<div class="lp-sec-pie">Entran porque la lista dice cuántas unidades trae la caja. '
      + 'El Precio va por unidad y la Unidad es la que tiene el artículo en Tango, igual que en el '
      + 'archivo que armó DISSAN. El precio de la caja se muestra al lado para poder controlarlo.</div>');
    h.push('<div class="lp-wrap"><table class="lp-tb"><thead><tr>'
      + '<th>Cód. Artículo</th><th>Sinónimo</th><th>Unidad</th>'
      + '<th>Unidades por caja</th><th>Precio por unidad</th><th>Precio de la caja</th>'
      + '</tr></thead><tbody>');
    a.por_caja.forEach(function (c) {
      h.push('<tr><td>' + esc(c.cod_articulo) + '</td><td>' + esc(c.sinonimo) + '</td>'
        + '<td><span class="lp-chip lp-chip-caja">' + esc(c.unidad) + '</span></td>'
        + '<td class="num" data-v="' + esc(c.unidades_caja) + '">' + num(c.unidades_caja) + '</td>'
        + '<td class="num" data-v="' + esc(c.precio_unidad) + '">' + exacto(c.precio_unidad) + '</td>'
        + '<td class="num" data-v="' + esc(c.precio_caja) + '">' + exacto(c.precio_caja) + '</td></tr>');
    });
    h.push('</tbody></table></div>');
  }

  /* las 12 columnas, tal como van al archivo.
     La grilla lleva data-bajar="1" para que bajar.js NO le ponga su barra: el
     bajador generico antepone titulo, filtros y un renglon en blanco, asi que
     los titulos caerian en la fila 6 y Tango no lo lee. Ademas infiere el tipo
     por columna y el Sinonimo (todo digitos) saldria como NUMERO y la vigencia
     como FECHA, cuando la planilla los quiere como TEXTO. Esta pantalla arma su
     propio archivo, abajo, con el formato exacto. */
  h.push('<div class="lp-sec">El archivo para Tango</div>');
  h.push('<div class="lp-sec-pie">' + num(res.entran) + ' renglones × 12 columnas. '
    + 'CUIT del proveedor en A1: <b>' + esc(lista.cuit || 'sin CUIT') + '</b>, '
    + 'los títulos en la fila 2 y los datos desde la fila 3. '
    + 'El archivo se arma con <b>lo que está en esta pantalla</b>, sin volver a consultar la base.</div>');
  h.push('<div class="lp-barra"><button type="button" class="lp-btn lp-btn-bajar" '
    + 'id="lpBajar">Bajar el archivo para Tango</button>'
    + '<span id="lpBajado" class="lp-bajado"></span></div>');
  h.push('<div class="lp-wrap"><table class="lp-tb" data-bajar="1"><thead><tr>');
  (a.encabezado || []).forEach(function (t) { h.push('<th>' + esc(t) + '</th>'); });
  h.push('</tr></thead><tbody>');
  (a.filas || []).forEach(function (f) {
    h.push('<tr>');
    f.forEach(function (v, i) {
      var esNum = (i === 8 || i === 9);
      h.push('<td' + (esNum ? ' class="num" data-v="' + esc(v) + '"' : '') + '>'
        + (v === null || v === undefined ? '' : (i === 8 ? exacto(v) : esc(v))) + '</td>');
    });
    h.push('</tr>');
  });
  h.push('</tbody></table></div>');

  /* lo que queda afuera, con el motivo renglon por renglon */
  if (a.avisos && a.avisos.length) {
    h.push('<div class="lp-sec">Lo que queda afuera, y por qué</div>');
    h.push('<div class="lp-sec-pie">Estos renglones NO van al archivo. Los que dicen '
      + '«sin alta en Tango» hay que darlos de alta primero; los que se compran por caja '
      + 'necesitan que la lista diga cuántas unidades trae.</div>');
    h.push('<div class="lp-wrap"><table class="lp-tb"><thead><tr>'
      + '<th>Código del laboratorio</th><th>Descripción de la lista</th>'
      + '<th>Precio de lista</th><th>Cód. Artículo</th><th>Por qué</th>'
      + '</tr></thead><tbody>');
    a.avisos.forEach(function (x) {
      h.push('<tr><td>' + esc(x.cod_proveedor) + '</td>'
        + '<td>' + esc(x.descripcion || '') + '</td>'
        + '<td class="num" data-v="' + esc(x.precio_lista) + '">'
        + (x.precio_lista === null ? '' : exacto(x.precio_lista)) + '</td>'
        + '<td>' + esc(x.cod_articulo || '') + '</td>'
        + '<td>' + esc(x.porque) + '</td></tr>');
    });
    h.push('</tbody></table></div>');
  }

  $('cuerpo').innerHTML = h.join('');
  var b = $('lpBajar');
  if (b) b.addEventListener('click', lpBajarTango);
}

/* ---------- el archivo para Tango ----------
   Formato FIJO de la planilla de importacion de precios de compra:
     A1            el CUIT del proveedor
     fila 2        los 12 titulos
     fila 3 en adelante  los datos

   Tres cosas que el bajador generico hace mal acá, y por eso esta pantalla
   arma el suyo (las tres medidas abriendo el archivo bajado, 27/10):
     1. antepone titulo, filtros y un renglon en blanco: los titulos quedan
        en la fila 6 y Tango no encuentra nada;
     2. el Sinonimo es todo digitos y lo infiere NUMERO: '10891' saldria 10891
        y deja de ser un codigo (el golpe de la OC 5245 que salia 5.245);
     3. la vigencia sale como FECHA de Excel y la planilla la quiere como
        TEXTO dd/mm/aaaa.
   Acá el tipo de cada columna se declara, no se adivina. */
var LP_TIPOS = ['texto', 'texto', 'texto', 'texto', 'texto', 'texto', 'texto', 'texto',
                'num',   'num',   'texto', 'texto'];
var LP_FORMATOS = [null, null, null, null, null, null, null, null, 'num4', 'ent', null, null];
var LP_ANCHOS = [14, 34, 30, 14, 10, 22, 10, 10, 14, 8, 18, 18];

function lpBajarTango() {
  var a = LP_ARMADO;
  var aviso = $('lpBajado');
  if (!a || !a.filas || !a.filas.length) { aviso.textContent = 'No hay renglones que bajar.'; return; }
  var lista = a.lista || {};

  var filas = a.filas.map(function (f) {
    return f.map(function (v, i) {
      if (v === null || v === undefined || v === '') return { t: 'vacio' };
      if (LP_TIPOS[i] === 'num') return { t: 'num', v: Number(v) };
      return { t: 'texto', v: String(v) };
    });
  });

  var hoja = {
    nombre: 'Sheet1',
    titulo: [lista.cuit || ''],      /* A1 */
    sinBlanco: true,                 /* los titulos van en la fila 2, no en la 3 */
    encabezados: a.encabezado,
    formatos: LP_FORMATOS,
    anchos: LP_ANCHOS,
    filas: filas
  };

  aviso.textContent = 'Armando…';
  bajarXlsx(hoja).then(function (bytes) {
    /* bajarHoy() devuelve "27/10/2026 13:15": con barras y un espacio no sirve
       como nombre de archivo. La fecha sale de la vigencia, que es lo que el
       nombre tiene que decir. */
    var vig = String(lista.vigencia || '').split('/');
    var fecha = vig.length === 3 ? vig[2] + '-' + vig[1] + '-' + vig[0]
                                 : new Date().toISOString().slice(0, 10);
    var nombre = 'precios-compras-' + (lista.codigo_lista || 'SIN-LISTA') + '-'
      + String(lista.proveedor || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')
      + '-' + fecha + '.xlsx';
    bajarArchivo(bytes,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', nombre);
    aviso.textContent = 'Bajado · ' + a.filas.length + ' renglones × 12 columnas · ' + nombre;
  }).catch(function (e) {
    aviso.textContent = 'No se pudo armar el archivo: ' + (e.message || e);
  });
}

function lpT(n, r, clase) {
  return '<div class="lp-t' + (clase ? ' ' + clase : '') + '">'
    + '<div class="n">' + n + '</div><div class="r">' + r + '</div></div>';
}

/* core.js llama a calcular() al entrar, despues del portero. */
function calcular() {
  $('cuerpo').innerHTML = '';
  $('lpProcesar').addEventListener('click', lpProcesar);
  $('lpArch').addEventListener('change', function () {
    if (LP_LEIDO || LP_ARMADO) { LP_LEIDO = null; LP_ARMADO = null; $('cuerpo').innerHTML = ''; }
  });
  return lpCargarProveedores().catch(function (e) {
    $('lpProv').innerHTML = '<option value="">—</option>';
    $('cuerpo').innerHTML = '<div class="lp-aviso">No se pudieron leer los proveedores: '
      + esc(e.message || e) + '</div>';
  });
}
