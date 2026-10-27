/* DISSAN · Listas de precios de proveedor                       27/10/2026
   ---------------------------------------------------------------------------
   La cadena, entera desde el navegador:

     el archivo del laboratorio
        -> Edge Function `listas`   lee el PDF por coordenada o el Excel por celda
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
var LP_LEIDO = null;   /* lo que devolvio la Edge Function */
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
   PDF de 1 MB tira "Maximum call stack size exceeded". Va por tandas. */
function lpBase64(buf) {
  var b = new Uint8Array(buf), s = '', i;
  for (i = 0; i < b.length; i += 8192) {
    s += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
  }
  return btoa(s);
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
    h += '<br>Se espera un <b>' + esc(String(p.lectura.tipo).toUpperCase()) + '</b>.';
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

  lpCargando(true, 'Leyendo ' + f.name + '…');
  $('cuerpo').innerHTML = '';

  f.arrayBuffer().then(function (buf) {
    return LP_FN('listas', {
      proveedor_id: provId,
      nombre_archivo: f.name,
      archivo_base64: lpBase64(buf)
    });
  }).then(function (leido) {
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
