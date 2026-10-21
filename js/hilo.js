/* DISSAN · Hilo conductor — sobre Supabase
   ---------------------------------------------------------------------------
   Tres funciones de la base, las mismas que sirve hoy el panel de Apps Script:
     api_hilo_mapa()                       el mapa medido
     api_hilo_vecinos(tabla)               con quién se liga esa tabla
     api_hilo_camino(origen, destino, n)   la ruta de una tabla a otra

   La lista de tablas sale de `mapa_tablas`, que se lee con el rol del panel.
   Se muestra el NOMBRE HUMANO al lado del código: un campo que muestra sólo
   un código no es un campo.
   --------------------------------------------------------------------------- */
'use strict';

let TABLAS = [];
let ULTIMO = null;

async function calcular() { await cargarMapa(); }

/* ---------- el mapa ---------- */
async function cargarMapa() {
  try {
    const { data, ms } = await rpc('api_hilo_mapa');
    const m = Array.isArray(data) ? data[0] : data;
    ULTIMO = m;
    $('reloj').hidden = false;
    $('reloj').innerHTML = 'La base contestó en <b>' + (ms / 1000).toFixed(2) + ' s</b>';
    $('mapa').innerHTML =
        tarjeta(num(m.tablas_en_el_grafo), 'tablas en el mapa', 'medidas, no estimadas', 'gris')
      + tarjeta(num(m.aristas_usables), 'relaciones usables', 'las que el hilo puede seguir')
      + tarjeta(num(m.confirmadas), 'confirmadas', 'certeza medida')
      + tarjeta(num(m.probables), 'probables', 'alta, pero no certeza')
      + tarjeta(num(m.parciales), 'parciales', 'ligan sólo una parte de las filas')
      + tarjeta(num(m.descartadas), 'descartadas', 'medidas y rechazadas', 'rojo');
  } catch (e) {
    $('aviso').hidden = false;
    $('aviso').textContent = 'No se pudo leer el mapa: ' + e.message;
    return;
  }
  await cargarTablas();
}

function tarjeta(n, rotulo, detalle, clase) {
  return '<div class="tj"><div class="n ' + (clase || '') + '">' + n + '</div>'
       + '<div class="r">' + esc(rotulo) + '</div>'
       + (detalle ? '<div class="d">' + esc(detalle) + '</div>' : '') + '</div>';
}
function sec(t, s) {
  return '<div class="tb-sec">' + esc(t) + (s ? '<small>' + esc(s) + '</small>' : '') + '</div>';
}

async function cargarTablas() {
  if (TABLAS.length) return;
  const { data, error } = await sb.from('mapa_tablas')
    .select('tabla,nombre_humano,modulo,filas').order('tabla');
  if (error || !data) {
    $('aviso').hidden = false;
    $('aviso').textContent = 'No se pudo leer la lista de tablas: '
      + ((error && error.message) || 'sin datos');
    return;
  }
  TABLAS = data;
  buscador('t1', elegirUna);
  buscador('t2', () => {});
  buscador('t3', () => {});
}

const rotulo = t => t.tabla + (t.nombre_humano ? '  ·  ' + t.nombre_humano : '')
  + (t.filas ? '  ·  ' + nf0.format(t.filas) + ' filas' : '');

/* ---------- buscador de tablas ----------
   Más de 20 opciones se escriben, no se scrollean. Enter elige la primera. */
function buscador(id, alElegir) {
  const inp = $('f-' + id), caja = $('l-' + id);
  const cerrar = () => { caja.hidden = true; caja.innerHTML = ''; };
  function elegir(t) { inp.value = t.tabla; inp.dataset.tabla = t.tabla; cerrar(); alElegir(t); }
  inp.oninput = () => {
    inp.dataset.tabla = '';
    const v = inp.value.trim().toLowerCase();
    if (!v) return cerrar();
    const hay = TABLAS.filter(t =>
      String(t.tabla).toLowerCase().includes(v)
      || String(t.nombre_humano || '').toLowerCase().includes(v)).slice(0, 12);
    if (!hay.length) return cerrar();
    caja.innerHTML = hay.map(t => '<div class="tb-op">' + esc(rotulo(t)) + '</div>').join('');
    caja.hidden = false;
    caja.querySelectorAll('.tb-op').forEach((d, i) => d.onclick = () => elegir(hay[i]));
  };
  inp.onkeydown = e => {
    if (e.key === 'Escape') return cerrar();
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const p = caja.querySelector('.tb-op');
    if (p) { const t = TABLAS.find(x => rotulo(x) === p.textContent); if (t) elegir(t); }
  };
  inp.onblur = () => setTimeout(cerrar, 180);
}
function elegirUna() { /* elegir en la lista no dispara la consulta: la dispara el botón */ }

/* ---------- vecinos ---------- */
async function verRelaciones() {
  const t = ($('f-t1').value || '').trim();
  if (!t) { $('f-t1').focus(); return; }
  const b = $('b-vec');
  if (b.disabled) return;
  b.disabled = true; b.textContent = 'Buscando...';
  $('aviso').hidden = true;
  try {
    const { data, ms } = await rpc('api_hilo_vecinos', { p_tabla: t, p_incluir_dudosas: false });
    if (!data || data.ok !== true) throw new Error((data && data.motivo)
      || 'No conozco la tabla «' + t + '».');
    pintarVecinos(data, ms);
  } catch (e) {
    $('cuerpo').innerHTML = '<div class="aviso" style="margin-top:18px">' + esc(e.message) + '</div>';
  } finally {
    b.disabled = false; b.textContent = 'Ver relaciones';
  }
}

function filaVecino(x, conMultiplica) {
  return '<tr><td class="cod">' + esc(x.tabla) + '</td>'
    + '<td class="desc">' + esc(x.modulo || '—') + '</td>'
    + '<td class="desc" title="' + esc(x.por) + '">' + esc(x.por) + '</td>'
    + '<td>' + esc(x.cardinalidad || '') + '</td>'
    + '<td class="desc">' + esc(x.nivel || '') + '</td>'
    + '<td class="num">' + pct(x.cobertura_pct) + '</td>'
    + '<td class="num">' + num(x.filas) + '</td>'
    + (conMultiplica ? '<td>' + (x.multiplica
        ? '<span class="hi-ojo">multiplica filas</span>' : 'no') + '</td>' : '')
    + '</tr>';
}

function pintarVecinos(d, ms) {
  const h = [];
  $('reloj').hidden = false;
  $('reloj').innerHTML = '<b>' + esc(d.tabla) + '</b> · módulo ' + esc(d.modulo || '—')
    + ' · clase ' + esc(d.clase || '—') + ' · <b>' + num(d.filas) + '</b> filas'
    + ' &nbsp;·&nbsp; la base contestó en <b>' + (ms / 1000).toFixed(2) + ' s</b>';

  if (d.explicacion) h.push('<div class="aviso" style="margin-top:16px">'
    + esc(d.explicacion) + '</div>');

  const mo = d.misma_operacion || [];
  h.push(sec('Misma operación (' + num(mo.length) + ')',
    'Seguir estos vínculos es seguir el mismo comprobante. Son los que usa el hilo para armar '
    + 'caminos.'));
  h.push(mo.length
    ? '<div class="tb-caja"><table><tr><th>Tabla</th><th>Módulo</th><th>Por</th>'
      + '<th>Card.</th><th>Nivel</th><th class="num">Cobertura</th><th class="num">Filas</th>'
      + '<th>Ojo</th></tr>' + mo.map(x => filaVecino(x, true)).join('') + '</table></div>'
    : '<div class="aviso">Ninguna.</div>');

  const fi = d.fichas_relacionadas || [];
  h.push(sec('Fichas relacionadas (' + num(fi.length) + ')',
    'Catálogos: cliente, artículo, cuenta. Dicen a quién o a qué corresponde la fila, no son '
    + 'otro paso del comprobante.'));
  h.push(fi.length
    ? '<div class="tb-caja"><table><tr><th>Tabla</th><th>Módulo</th><th>Por</th>'
      + '<th>Card.</th><th>Nivel</th><th class="num">Cobertura</th><th class="num">Filas</th>'
      + '</tr>' + fi.map(x => filaVecino(x, false)).join('') + '</table></div>'
    : '<div class="aviso">Ninguna.</div>');

  $('cuerpo').innerHTML = h.join('');
  ULTIMO = d;
}

/* ---------- camino ---------- */
async function buscarCamino() {
  const a = ($('f-t2').value || '').trim(), z = ($('f-t3').value || '').trim();
  if (!a || !z) { (!a ? $('f-t2') : $('f-t3')).focus(); return; }
  const b = $('b-cam');
  if (b.disabled) return;
  b.disabled = true; b.textContent = 'Buscando...';
  $('aviso').hidden = true;
  try {
    const { data, ms } = await rpc('api_hilo_camino',
      { p_origen: a, p_destino: z, p_max_saltos: 6 });
    pintarCamino(data, ms, a, z);
  } catch (e) {
    $('cuerpo').innerHTML = '<div class="aviso" style="margin-top:18px">' + esc(e.message) + '</div>';
  } finally {
    b.disabled = false; b.textContent = 'Buscar el camino';
  }
}

function pintarCamino(d, ms, a, z) {
  d = d || {};
  const h = [];
  $('reloj').hidden = false;
  $('reloj').innerHTML = 'La base contestó en <b>' + (ms / 1000).toFixed(2) + ' s</b>';

  if (d.ok !== true || d.encontrado !== true) {
    h.push('<div class="aviso" style="margin-top:18px"><b>No hay camino de ' + esc(a)
      + ' a ' + esc(z) + '</b>' + (d.motivo ? ' — ' + esc(d.motivo) : '')
      + '. El hilo sólo cruza tablas de operación: no arma caminos a través de catálogos, '
      + 'porque eso ligaría cosas que no tienen nada que ver.</div>');
    $('cuerpo').innerHTML = h.join('');
    ULTIMO = d;
    return;
  }

  h.push(sec('De ' + esc(d.origen) + ' a ' + esc(d.destino),
    num(d.saltos) + ' saltos · ' + esc(d.confianza || '')));

  h.push('<div class="hi-ruta">' + (d.ruta || []).map((t, i) =>
    '<span class="hi-nodo">' + esc(t) + '</span>'
    + (i < d.ruta.length - 1 ? '<span class="hi-flecha">→</span>' : '')).join('') + '</div>');

  if (d.multiplica_filas && d.aviso)
    h.push('<div class="aviso" style="margin-top:14px"><b>Ojo.</b> ' + esc(d.aviso) + '</div>');

  h.push(sec('Los eslabones, uno por uno',
    'La confianza del camino es la del eslabón más flojo: ' + pct(d.cobertura_minima) + '.'));
  h.push('<div class="tb-caja"><table><tr><th class="num">#</th><th>Eslabón</th></tr>'
    + (d.pasos || []).map((p, i) => '<tr><td class="num">' + (i + 1) + '</td>'
      + '<td class="hi-paso">' + esc(p) + '</td></tr>').join('')
    + '</table></div>');

  $('cuerpo').innerHTML = h.join('');
  ULTIMO = d;
}
