/* DISSAN · Tablero general — sobre Supabase
   ---------------------------------------------------------------------------
   Define calcular(), que es lo que core.js llama al entrar. Por eso esta
   pantalla NO necesita tocar core.js ni index.html: la de Margen sigue
   exactamente como está, con su propio js/margen.js.

   Una sola llamada: api_margen_tablero_v3, la MISMA que sirve hoy el panel de
   Apps Script. Parámetros CON NOMBRE, nunca por posición.
   --------------------------------------------------------------------------- */
'use strict';

let ULTIMO = null;                 // la respuesta cruda, para controlarla desde la consola
const ELEGIDO = { clientes: [], zonas: [] };
const MESES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
               'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/* ---------- período ---------- */
function periodo() {
  const a = $('f-anio').value, m = $('f-mes').value;
  if (!a) return { desde: null, hasta: null, etiqueta: 'todo el período' };
  const an = Number(a);
  if (!m) return { desde: an + '-01-01', hasta: an + '-12-31', etiqueta: 'el año ' + an };
  const mn = Number(m);
  const ult = new Date(an, mn, 0).getDate();
  const p = n => (n < 10 ? '0' : '') + n;
  return { desde: an + '-' + p(mn) + '-01', hasta: an + '-' + p(mn) + '-' + p(ult),
           etiqueta: MESES[mn] + ' de ' + an };
}

/* ---------- celda de plata: de un millón para arriba, en millones ----------
   Un importe cortado por el ancho de la celda se lee como otro número.
   El monto exacto va siempre en el title. */
function celda(v) {
  const n = Number(v || 0);
  const ex = exacto(n);
  const txt = Math.abs(n) >= 1e6 ? '$' + nf1.format(n / 1e6) + ' M' : '$' + nf0.format(n);
  return '<td class="num" title="' + esc(ex) + '">' + txt + '</td>';
}

/* ---------- barras ---------- */
function barras(filas, campoEt, campoVal, texto, tono) {
  if (!filas || !filas.length) return '';
  let max = 0;
  filas.forEach(f => { max = Math.max(max, Math.abs(Number(f[campoVal] || 0))); });
  if (max <= 0) max = 1;
  return '<div class="tb-barras">' + filas.map(f => {
    const v = Math.abs(Number(f[campoVal] || 0));
    return '<div class="tb-fila">'
         + '<div class="tb-et" title="' + esc(f[campoEt]) + '">' + esc(f[campoEt]) + '</div>'
         + '<div class="tb-pista"><div class="tb-barra ' + tono + '" style="width:'
         + (100 * v / max).toFixed(1) + '%"></div></div>'
         + '<div class="tb-val">' + esc(texto(f)) + '</div></div>';
  }).join('') + '</div>';
}

/* ---------- buscadores de cliente y zona ----------
   Más de 20 opciones se escriben, no se scrollean: campo de texto que filtra
   con cada letra, y lo elegido a la vista para sacarlo de un clic.
   Enter elige la primera opción. */
function armarBuscador(clave, lista) {
  const inp = $('f-' + clave), caja = $('l-' + clave), chips = $('c-' + clave);
  function pintarChips() {
    chips.innerHTML = ELEGIDO[clave].map((v, i) =>
      '<span class="tb-chip">' + esc(v) +
      '<button type="button" data-i="' + i + '" aria-label="Sacar">×</button></span>').join('');
    chips.querySelectorAll('button').forEach(b => b.onclick = () => {
      ELEGIDO[clave].splice(Number(b.dataset.i), 1); pintarChips();
    });
  }
  function cerrar() { caja.hidden = true; caja.innerHTML = ''; }
  function elegir(v) {
    if (!ELEGIDO[clave].includes(v)) ELEGIDO[clave].push(v);
    inp.value = ''; cerrar(); pintarChips();
  }
  inp.oninput = () => {
    const v = inp.value.trim().toLowerCase();
    if (!v) return cerrar();
    const hay = lista.filter(x => String(x).toLowerCase().includes(v)).slice(0, 12);
    if (!hay.length) return cerrar();
    caja.innerHTML = hay.map(x => '<div class="tb-op">' + esc(x) + '</div>').join('');
    caja.hidden = false;
    caja.querySelectorAll('.tb-op').forEach((d, i) => d.onclick = () => elegir(hay[i]));
  };
  inp.onkeydown = e => {
    if (e.key !== 'Enter') { if (e.key === 'Escape') cerrar(); return; }
    e.preventDefault();
    const p = caja.querySelector('.tb-op');
    if (p) elegir(p.textContent);
  };
  inp.onblur = () => setTimeout(cerrar, 180);
  pintarChips();
}

/* ---------- la llamada ---------- */
async function calcular() {
  const b = $('b-calc');
  if (b.disabled) return;                        // muerto mientras carga
  b.disabled = true; b.textContent = 'Calculando...';
  $('aviso').hidden = true; $('reloj').hidden = true;

  const per = periodo();
  const args = {
    p_desde:           per.desde,
    p_hasta:           per.hasta,
    p_clientes:        ELEGIDO.clientes.length ? ELEGIDO.clientes.slice() : null,
    p_zonas:           ELEGIDO.zonas.length    ? ELEGIDO.zonas.slice()    : null,
    p_calidad:         CALIDAD_FIRME,
    p_solo_productos:  true,
    p_solo_bajo_costo: false
  };

  try {
    const { data, ms } = await rpc('api_margen_tablero_v3', args);
    ULTIMO = data;
    pintar(data, ms, per);
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
       + (detalle ? '<div class="d">' + esc(detalle) + '</div>' : '') + '</div>';
}

function pintar(d, ms, per) {
  d = d || {};
  const r = d.resumen || {};
  const h = [];

  /* los filtros, escritos con sus valores literales */
  const p = ['<b>' + esc(per.etiqueta) + '</b>'];
  if (ELEGIDO.clientes.length)
    p.push('cliente' + (ELEGIDO.clientes.length > 1 ? 's' : '') + ' <b>'
         + esc(ELEGIDO.clientes.slice(0, 3).join(', '))
         + (ELEGIDO.clientes.length > 3 ? ' y ' + (ELEGIDO.clientes.length - 3) + ' más' : '')
         + '</b>');
  if (ELEGIDO.zonas.length)
    p.push('zona' + (ELEGIDO.zonas.length > 1 ? 's' : '') + ' <b>'
         + esc(ELEGIDO.zonas.join(', ')) + '</b>');

  $('metodo').textContent = d.metodo || '';
  $('reloj').hidden = false;
  $('reloj').innerHTML = 'La base contestó en <b>' + (ms / 1000).toFixed(2) + ' s</b>'
    + ' &nbsp;·&nbsp; ' + num(r.medidos) + ' renglones medidos de ' + num(r.renglones_totales)
    + ' &nbsp;·&nbsp; ' + p.join(' · ');

  /* aviso del refresco */
  const a = d.actualizado || {};
  if (a.cuando) {
    const viejo = Number(a.horas) >= 30;
    h.push('<div class="' + (viejo ? 'aviso' : 'reloj') + '" style="margin:16px 0 0">'
      + 'Datos al <b>' + esc(a.cuando) + '</b>'
      + (viejo ? ' — <b>hace ' + num(a.horas) + ' horas</b>. El refresco de la madrugada no '
               + 'corrió: puede faltar lo de hoy.'
               : '. Se refresca solo todas las mañanas.') + '</div>');
  }

  /* tarjetas */
  const t = [];
  t.push(tarjeta(pct(r.margen_pct), 'margen sobre el precio', 'ganancia ÷ facturado'));
  if (r.margen_sobre_costo !== null && r.margen_sobre_costo !== undefined)
    t.push(tarjeta(pct(r.margen_sobre_costo), 'margen sobre el costo', 'así lo calcula DISSAN'));
  t.push(tarjeta(pesoM(r.facturado), 'facturado medido',
    exacto(r.facturado) + ' · ' + num(r.medidos) + ' de ' + num(r.renglones_totales)
    + ' renglones', 'gris'));
  t.push(tarjeta(pesoM(r.margen_bruto), 'ganancia bruta',
    exacto(r.margen_bruto) + ' · costo ' + exacto(r.costo)));
  t.push(tarjeta(pct(r.cobertura_pct), 'cobertura', 'lo que se puede medir',
    Number(r.cobertura_pct) < 60 ? 'rojo' : ''));
  t.push(tarjeta(num(r.bajo_costo_n), 'renglones bajo el costo',
    exacto(r.perdida) + ' perdidos ahí', Number(r.bajo_costo_n) > 0 ? 'rojo' : ''));
  if (Number(r.cuarentena_n || 0) > 0)
    t.push(tarjeta(num(r.cuarentena_n), 'apartados en cuarentena',
      exacto(r.cuarentena_monto) + ' — no sumados', 'rojo'));
  h.push('<section class="tarjetas">' + t.join('') + '</section>');

  h.push('<div class="aviso" style="margin-top:16px"><b>Cobertura ' + pct(r.cobertura_pct)
    + '.</b> De los ' + num(r.renglones_totales) + ' renglones del período se miden '
    + num(r.medidos) + '; el resto no tiene costo confiable y queda afuera. '
    + '<b>No dice que el resto esté bien: dice que no se puede saber.</b> '
    + 'La base no tiene stock inicial y la consignación no tiene orden de compra, '
    + 'así que nunca va a llegar al 100%.</div>');

  /* margen mes a mes */
  const pm = (d.por_mes || []).filter(m => Number(m.n || 0) > 0);
  if (pm.length > 1) {
    h.push(sec('Margen mes a mes',
      'Porcentaje sobre lo facturado de cada mes, medido contra el costo real.'));
    h.push(barras(pm, 'mes', 'margen', f => pct(f.margen) + ' · ' + num(f.n) + ' rgl.', 'v'));
  }

  /* los diez que ganaron y los diez que perdieron */
  const me = (d.mejores || []).slice(0, 10);
  const pe = (d.peores || []).slice(0, 10);

  if (me.length || pe.length) {
    h.push('<div class="aviso" style="margin-top:22px"><b>Cómo leer estas dos tablas.</b> '
      + '«Precio venta» y «Costo» son <b>por unidad</b>; «Ganó» y «Perdió» son el total '
      + '<b>del renglón</b> — cantidad × (precio − costo). Por eso un renglón puede ganar '
      + '$70 millones con un precio unitario de $4,9 millones: son 30 unidades.</div>');
  }

  if (me.length) {
    h.push(sec('Los diez que más ganaron', 'Con qué se gana de verdad, y con quién.'));
    h.push('<div class="tb-caja"><table><tr>'
      + '<th>Artículo</th><th>Descripción</th><th>Cliente</th><th>Fecha</th>'
      + '<th class="num">Cant.</th><th class="num">Precio venta<br>(x unidad)</th>'
      + '<th class="num">Costo<br>(x unidad)</th><th class="num">Margen</th>'
      + '<th class="num">Ganó<br>(el renglón)</th></tr>'
      + me.map(x => '<tr class="bien"><td class="cod">' + esc(x.articulo) + '</td>'
          + '<td class="desc" title="' + esc(x.detalle) + '">' + esc(x.detalle) + '</td>'
          + '<td class="desc" title="' + esc(x.cliente) + '">' + esc(x.cliente) + '</td>'
          + '<td>' + esc(x.fecha) + '</td>'
          + '<td class="num">' + num(x.cantidad) + '</td>'
          + celda(x.vendio) + celda(x.costo)
          + '<td class="num">' + pct(x.margen) + '</td>'
          + celda(x.gano) + '</tr>').join('')
      + '</table></div>');
  }

  if (pe.length) {
    h.push(sec('Los diez que más perdieron', 'Renglones vendidos por debajo del costo real.'));
    h.push('<div class="tb-caja"><table><tr>'
      + '<th>Artículo</th><th>Descripción</th><th>Cliente</th><th>Fecha</th>'
      + '<th class="num">Cant.</th><th class="num">Precio venta<br>(x unidad)</th>'
      + '<th class="num">Costo<br>(x unidad)</th>'
      + '<th class="num">Perdió<br>(el renglón)</th></tr>'
      + pe.map(x => '<tr class="mal"><td class="cod">' + esc(x.articulo) + '</td>'
          + '<td class="desc" title="' + esc(x.detalle) + '">' + esc(x.detalle) + '</td>'
          + '<td class="desc" title="' + esc(x.cliente) + '">' + esc(x.cliente) + '</td>'
          + '<td>' + esc(x.fecha) + '</td>'
          + '<td class="num">' + num(x.cantidad) + '</td>'
          + celda(x.vendio) + celda(x.costo) + celda(x.perdio) + '</tr>').join('')
      + '</table></div>');
  }

  /* quién compra por debajo del costo */
  const pc = d.por_cliente || [];
  if (pc.length) {
    h.push(sec('Quién compra por debajo del costo',
      'Los ' + pc.length + ' primeros. El porcentaje es sobre el total de la pérdida medida '
      + 'en este período.'));
    h.push(barras(pc.slice(0, 10), 'cliente', 'perdida', f => pesoM(f.perdida), 'r'));
    let acum = 0;
    h.push('<div class="tb-caja" style="margin-top:10px"><table><tr><th>Cliente</th>'
      + '<th class="num">Ventas bajo costo</th><th class="num">Pérdida</th>'
      + '<th class="num">%</th><th class="num">Acumulado</th></tr>'
      + pc.map(x => { acum += Number(x.pct || 0);
          return '<tr><td>' + esc(x.cliente) + '</td>'
            + '<td class="num">' + num(x.ventas) + '</td>'
            + celda(x.perdida)
            + '<td class="num">' + pct(x.pct) + '</td>'
            + '<td class="num">' + pct(acum) + '</td></tr>'; }).join('')
      + '</table></div>');
  }

  /* de dónde sale el costo */
  const cal = d.calidad || [];
  if (cal.length) {
    h.push(sec('De dónde sale el costo',
      'Sólo se suman las filas que empiezan con A. Las B usan un costo de más de 180 días y '
      + 'en pesos nominales eso infla el margen. Las C no tienen ninguna compra con la que '
      + 'medirse.'));
    h.push('<div class="tb-caja"><table><tr><th>Calidad del costo</th>'
      + '<th class="num">Renglones</th><th class="num">Venta</th>'
      + '<th class="num">% de la venta</th><th class="num">Margen</th></tr>'
      + cal.map(c => '<tr' + (String(c.calidad || '').charAt(0) !== 'A' ? ' class="aparte"' : '')
          + '><td>' + esc(c.calidad) + '</td>'
          + '<td class="num">' + num(c.renglones) + '</td>'
          + celda(c.venta)
          + '<td class="num">' + pct(c.pct_venta) + '</td>'
          + '<td class="num">' + (c.margen_pct === null ? '—' : pct(c.margen_pct)) + '</td>'
          + '</tr>').join('')
      + '</table></div>');
  }

  if (!me.length && !pe.length)
    h.push('<div class="aviso" style="margin-top:20px">Ningún renglón entra en esos filtros. '
      + 'Probá con otro período o sin el cliente.</div>');

  $('cuerpo').innerHTML = h.join('');

  /* los buscadores se arman una sola vez, con las listas que trajo la base */
  if (!armarBuscador.hecho && d.listas) {
    armarBuscador('clientes', d.listas.clientes || []);
    armarBuscador('zonas',    d.listas.zonas    || []);
    armarBuscador.hecho = true;
  }
}

function sec(t, s) {
  return '<div class="tb-sec">' + esc(t) + '<small>' + esc(s) + '</small></div>';
}

function limpiar() {
  ELEGIDO.clientes.length = 0; ELEGIDO.zonas.length = 0;
  $('c-clientes').innerHTML = ''; $('c-zonas').innerHTML = '';
  $('f-anio').value = '2026'; $('f-mes').value = '';
  calcular();
}
