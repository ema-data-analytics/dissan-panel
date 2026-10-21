/* DISSAN · Informe de base verificada — sobre Supabase
   ---------------------------------------------------------------------------
   Una sola llamada: api_tablero_rentabilidad, la MISMA que sirve hoy el panel
   de Apps Script. Parámetros CON NOMBRE.

   OJO con qué mide esto: mide LA PLANILLA DE COTIZACIONES —qué se cotizó, qué
   se ganó y con qué margen mediano—, NO la facturación. El margen de verdad
   contra el costo real está en el Tablero general y en Margen de ventas.
   --------------------------------------------------------------------------- */
'use strict';

let ULTIMO = null;
const CANALES = [];

async function calcular() {
  const b = $('b-calc');
  if (b.disabled) return;
  b.disabled = true; b.textContent = 'Calculando...';
  $('aviso').hidden = true; $('reloj').hidden = true;

  const args = {
    p_desde:        $('f-desde').value || null,
    p_hasta:        $('f-hasta').value || null,
    p_tipos:        CANALES.length ? CANALES.slice() : null,
    p_solo_ganados: $('f-ganados').checked
  };

  try {
    const { data, ms } = await rpc('api_tablero_rentabilidad', args);
    ULTIMO = data;
    pintar(data, ms);
  } catch (e) {
    $('aviso').hidden = false;
    $('aviso').textContent = 'No se pudo calcular: ' + e.message;
    $('cuerpo').innerHTML = '';
  } finally {
    b.disabled = false; b.textContent = 'Ver';
  }
}

function tarjeta(n, rotulo, detalle, clase) {
  return '<div class="tj"><div class="n ' + (clase || '') + '">' + n + '</div>'
       + '<div class="r">' + esc(rotulo) + '</div>'
       + (detalle ? '<div class="d">' + detalle + '</div>' : '') + '</div>';
}
function sec(t, s) {
  return '<div class="tb-sec">' + esc(t) + (s ? '<small>' + esc(s) + '</small>' : '') + '</div>';
}
function celda(v) {
  const n = Number(v || 0);
  const txt = Math.abs(n) >= 1e6 ? '$' + nf1.format(n / 1e6) + ' M' : '$' + nf0.format(n);
  return '<td class="num" title="' + esc(exacto(n)) + '">' + txt + '</td>';
}
function barras(filas, et, val, texto, tono) {
  if (!filas || !filas.length) return '';
  let max = 0;
  filas.forEach(f => { max = Math.max(max, Math.abs(Number(f[val] || 0))); });
  if (max <= 0) max = 1;
  return '<div class="tb-barras">' + filas.map(f =>
    '<div class="tb-fila"><div class="tb-et" title="' + esc(f[et]) + '">' + esc(f[et]) + '</div>'
    + '<div class="tb-pista"><div class="tb-barra ' + tono + '" style="width:'
    + (100 * Math.abs(Number(f[val] || 0)) / max).toFixed(1) + '%"></div></div>'
    + '<div class="tb-val">' + esc(texto(f)) + '</div></div>').join('') + '</div>';
}

function pintar(d, ms) {
  d = d || {};
  const r = d.resumen || {};
  const h = [];

  $('reloj').hidden = false;
  $('reloj').innerHTML = 'La base contestó en <b>' + (ms / 1000).toFixed(2) + ' s</b>'
    + ' &nbsp;·&nbsp; ' + num(r.renglones) + ' renglones cotizados'
    + (CANALES.length ? ' &nbsp;·&nbsp; canal ' + esc(CANALES.join(', ')) : '')
    + ($('f-ganados').checked ? ' &nbsp;·&nbsp; sólo ganados' : '');

  if (!Number(r.renglones)) {
    $('cuerpo').innerHTML = '<div class="aviso" style="margin-top:18px">Con ese filtro no queda '
      + 'ningún renglón. Probá ampliando el período o sacando canales.</div>';
    return;
  }

  const margen = Number(r.facturado) > 0
    ? 100 * (Number(r.facturado) - Number(r.costo)) / Number(r.facturado) : null;

  const t = [];
  t.push(tarjeta(num(r.renglones), 'renglones cotizados', 'en el período y canal elegidos', 'gris'));
  t.push(tarjeta(num(r.ganados) + ' <span class="chico">(' + pct(r.pct_ganado) + ')</span>',
                 'ganados', 'sobre los cotizados'));
  t.push(tarjeta(pct(r.margen_mediano), 'margen mediano', 'la mitad quedó por debajo'));
  t.push(tarjeta(pesoM(r.facturado), 'facturado de lo ganado',
                 esc(exacto(r.facturado)) + (margen !== null
                   ? ' · margen real ' + pct(margen) + ' sobre la venta' : '')));
  t.push(tarjeta(num(r.perdida_n), 'ganados a pérdida de verdad',
                 esc(exacto(r.perdida_monto)) + ' que se pusieron de más',
                 Number(r.perdida_n) ? 'rojo' : ''));
  t.push(tarjeta(num(r.malcargado_n), 'con el costo mal cargado',
                 esc(exacto(r.malcargado_monto)) + ' que <b>NO</b> se perdieron',
                 Number(r.malcargado_n) ? 'rojo' : ''));
  h.push('<section class="tarjetas">' + t.join('') + '</section>');

  h.push('<div class="aviso" style="margin-top:16px"><b>Qué mide esta pantalla.</b> Mide '
    + '<b>la planilla de cotizaciones</b>: qué se cotizó, qué se ganó y con qué margen mediano. '
    + '<b>No mide la facturación.</b> El margen contra el costo real está en el Tablero general '
    + 'y en Margen de ventas reales.</div>');

  const pt = (d.por_tipo || []).filter(x => Number(x.n || 0) > 0);
  if (pt.length) {
    h.push(sec('Margen mediano por canal',
      'Cada canal con su margen. La barra lleva el número escrito, no hace falta medirla a ojo.'));
    h.push(barras(pt.slice().sort((a, b) => b.margen - a.margen), 'tipo', 'margen',
      f => pct(f.margen) + ' · ' + num(f.n) + ' rgl.', 'v'));

    h.push(sec('Cuánto se gana en cada canal',
      'Porcentaje de renglones cotizados que terminaron ganados.'));
    h.push(barras(pt.slice().sort((a, b) => b.pct_ganado - a.pct_ganado), 'tipo', 'pct_ganado',
      f => pct(f.pct_ganado) + ' · ' + num(f.ganados) + ' de ' + num(f.n), 'v'));
  }

  const pm = (d.por_mes || []).filter(x => !x.vacio && Number(x.n || 0) > 0);
  if (pm.length > 1) {
    h.push(sec('Mes a mes', 'Margen mediano del mes y cuántos renglones se ganaron.'));
    h.push(barras(pm, 'mes', 'margen',
      f => pct(f.margen) + ' · ' + num(f.ganados) + ' de ' + num(f.n), 'v'));
  }

  const fr = (d.franjas || []).filter(x => Number(x.n || 0) > 0);
  if (fr.length) {
    h.push(sec('Cómo se reparten los márgenes',
      'Cuántos renglones cayeron en cada franja de margen.'));
    h.push(barras(fr.slice().sort((a, b) => a.orden - b.orden), 'franja', 'n',
      f => num(f.n) + ' rgl.', f => f.franja === 'A pérdida' ? 'r' : 'v'));
  }

  if (pt.length) {
    h.push(sec('El detalle, canal por canal'));
    h.push('<div class="tb-caja"><table><tr><th>Canal</th><th class="num">Cotizados</th>'
      + '<th class="num">Ganados</th><th class="num">% ganado</th>'
      + '<th class="num">Margen mediano</th><th class="num">Facturado</th>'
      + '<th class="num">A pérdida</th></tr>'
      + pt.slice().sort((a, b) => b.facturado - a.facturado).map(x =>
        '<tr><td>' + esc(x.tipo) + '</td>'
        + '<td class="num">' + num(x.n) + '</td>'
        + '<td class="num">' + num(x.ganados) + '</td>'
        + '<td class="num">' + pct(x.pct_ganado) + '</td>'
        + '<td class="num">' + pct(x.margen) + '</td>'
        + celda(x.facturado)
        + '<td class="num">' + num(x.perdida) + '</td></tr>').join('')
      + '</table></div>');
  }

  const pe = d.peores || [];
  if (pe.length) {
    h.push(sec('Los renglones que de verdad costaron plata',
      'Ganados por debajo del costo, con el costo coherente con el del propio artículo. '
      + 'Esto sí es una decisión de precio.'));
    h.push('<div class="tb-caja"><table><tr><th>Artículo</th><th>Cliente</th><th>Canal</th>'
      + '<th>Fecha</th><th class="num">Margen</th><th class="num">Perdió</th></tr>'
      + pe.map(x => '<tr class="mal"><td class="cod">' + esc(x.articulo) + '</td>'
        + '<td class="desc" title="' + esc(x.cliente) + '">' + esc(x.cliente) + '</td>'
        + '<td class="desc">' + esc(x.tipo) + '</td><td>' + esc(x.fecha) + '</td>'
        + '<td class="num">' + pct(x.margen) + '</td>' + celda(x.perdio) + '</tr>').join('')
      + '</table></div>');
  }

  const mc = d.malcargados || [];
  if (mc.length) {
    h.push(sec('Para corregir en la planilla',
      'Acá el costo está mal escrito. La columna «veces» dice cuánto más alto quedó respecto '
      + 'del costo habitual de ese mismo artículo.'));
    h.push('<div class="tb-caja"><table><tr><th>Artículo</th><th>Cliente</th><th>Canal</th>'
      + '<th>Fecha</th><th class="num">Costo cargado</th><th class="num">Costo habitual</th>'
      + '<th class="num">Veces</th><th class="num">Dice perder</th></tr>'
      + mc.map(x => '<tr class="aparte"><td class="cod">' + esc(x.articulo) + '</td>'
        + '<td class="desc" title="' + esc(x.cliente) + '">' + esc(x.cliente) + '</td>'
        + '<td class="desc">' + esc(x.tipo) + '</td><td>' + esc(x.fecha) + '</td>'
        + celda(x.costo) + celda(x.tipico)
        + '<td class="num">' + nf1.format(Number(x.veces || 0)) + '×</td>'
        + celda(x.perdio) + '</tr>').join('')
      + '</table></div>');
  }

  $('cuerpo').innerHTML = h.join('');

  if (!armarCanal.hecho && d.tipos && d.tipos.length) {
    armarCanal(d.tipos);
    armarCanal.hecho = true;
  }
}

/* ---------- el buscador de canal ----------
   Más de 20 opciones se escriben, no se scrollean. Enter elige la primera. */
function armarCanal(lista) {
  const inp = $('f-canal'), caja = $('l-canal'), chips = $('c-canal');
  function pintarChips() {
    chips.innerHTML = CANALES.map((v, i) => '<span class="tb-chip">' + esc(v)
      + '<button type="button" data-i="' + i + '" aria-label="Sacar">×</button></span>').join('');
    chips.querySelectorAll('button').forEach(b => b.onclick = () => {
      CANALES.splice(Number(b.dataset.i), 1); pintarChips();
    });
  }
  const cerrar = () => { caja.hidden = true; caja.innerHTML = ''; };
  function elegir(v) {
    if (!CANALES.includes(v)) CANALES.push(v);
    inp.value = ''; cerrar(); pintarChips();
  }
  inp.oninput = () => {
    const v = inp.value.trim().toLowerCase();
    if (!v) return cerrar();
    const hay = lista.filter(x => String(x).toLowerCase().includes(v)).slice(0, 12);
    if (!hay.length) return cerrar();
    caja.innerHTML = hay.map(x => '<div class="tb-op">' + esc(x) + '</div>').join('');
    caja.hidden = false;
    caja.querySelectorAll('.tb-op').forEach((dd, i) => dd.onclick = () => elegir(hay[i]));
  };
  inp.onkeydown = e => {
    if (e.key === 'Escape') return cerrar();
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const p = caja.querySelector('.tb-op');
    if (p) elegir(p.textContent);
  };
  inp.onblur = () => setTimeout(cerrar, 180);
  pintarChips();
}

function limpiar() {
  CANALES.length = 0;
  $('c-canal').innerHTML = '';
  $('f-ganados').checked = false;
  $('f-desde').value = '2025-01-02';
  $('f-hasta').value = '2026-10-01';
  calcular();
}
