/* DISSAN · Stock — sobre Supabase
   ---------------------------------------------------------------------------
   Seis funciones de la base, todas probadas con `set role authenticated`:
     api_stock_valorizado()                  las cifras de arriba
     api_stock_por_deposito()                por depósito
     api_stock_historico_vs_reposicion()     histórico contra reposición
     api_stock_brecha_por_articulo(lim)      los de mayor brecha
     api_stock_a_liquidar(dias,lim,nunca)    capital inmovilizado
     api_kardex(art,desde,hasta,lim)         el movimiento de un artículo

   LO QUE NO SE HACE ACA, A PROPOSITO: la pantalla vieja bajaba `sta19` y
   `sta11` crudos por PostgREST CON LA CLAVE DE SERVICIO, de a 1.000 filas, y
   sumaba en JavaScript. Acá suma la base y viaja el resultado. Ni paginado,
   ni clave de servicio.
   --------------------------------------------------------------------------- */
'use strict';

let ULTIMO = {};

async function calcular() {
  const b = $('b-calc');
  if (b && b.disabled) return;
  if (b) { b.disabled = true; b.textContent = 'Calculando...'; }
  $('aviso').hidden = true; $('reloj').hidden = true;
  try {
    const t0 = performance.now();
    const [val, dep, hvr, bre, liq] = await Promise.all([
      rpc('api_stock_valorizado'),
      rpc('api_stock_por_deposito'),
      rpc('api_stock_historico_vs_reposicion'),
      rpc('api_stock_brecha_por_articulo', { p_limite: 20 }),
      rpc('api_stock_a_liquidar', { p_dias_sin_venta: 180, p_limite: 20,
                                    p_incluir_nunca_vendidos: true })
    ]);
    const ms = Math.round(performance.now() - t0);
    ULTIMO = { val: una(val.data), dep: dep.data, hvr: una(hvr.data),
               bre: bre.data, liq: liq.data };
    pintar(ULTIMO, ms);
  } catch (e) {
    $('aviso').hidden = false;
    $('aviso').textContent = 'No se pudo calcular: ' + e.message;
    $('cuerpo').innerHTML = '';
  } finally {
    if (b) { b.disabled = false; b.textContent = 'Actualizar'; }
  }
}

const una = d => Array.isArray(d) ? (d[0] || {}) : (d || {});

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
/* la cobertura no se redondea para arriba: 99,99 no es 100 */
function cobertura(v) {
  const n = Number(v || 0);
  return (n >= 100 ? '100' : nf2.format(n)) + '%';
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
const fecha = v => {
  const f = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return f ? f[3] + '/' + f[2] + '/' + f[1] : (v ? esc(v) : '—');
};

function pintar(d, ms) {
  const v = d.val || {}, h = [];
  const r = d.hvr || {};

  $('reloj').hidden = false;
  $('reloj').innerHTML = 'La base contestó en <b>' + (ms / 1000).toFixed(2) + ' s</b>'
    + ' &nbsp;·&nbsp; 5 consultas en paralelo';

  const t = [];
  t.push(tarjeta(pesoM(v.valorizado), 'stock valorizado', esc(exacto(v.valorizado))));
  t.push(tarjeta(num(v.articulos_con_stock), 'artículos con existencia',
    'de ' + num(v.articulos) + ' con ficha de stock', 'gris'));
  t.push(tarjeta(num(v.unidades), 'unidades en stock', 'en los depósitos', 'gris'));
  t.push(tarjeta(cobertura(v.cobertura_valor_pct), 'cobertura del valor',
    'sobre el valor; el resto no tiene costo con el que valorizarse',
    Number(v.cobertura_valor_pct) < 60 ? 'rojo' : ''));
  t.push(tarjeta(num(v.articulos_sin_costo), 'artículos sin costo',
    num(v.unidades_sin_costo) + ' unidades que <b>no</b> entran en el valorizado',
    Number(v.articulos_sin_costo) ? 'rojo' : ''));
  h.push('<section class="tarjetas">' + t.join('') + '</section>');

  h.push('<div class="aviso" style="margin-top:16px"><b>El denominador.</b> El valorizado es '
    + esc(exacto(v.valorizado)) + ' sobre <b>' + num(v.articulos_con_stock - v.articulos_sin_costo)
    + ' de ' + num(v.articulos_con_stock) + '</b> artículos con existencia. Los otros '
    + num(v.articulos_sin_costo) + ' tienen ' + num(v.unidades_sin_costo)
    + ' unidades y ningún costo con el que valorizarlas: <b>no dice que valgan cero, dice que no '
    + 'se sabe.</b></div>');

  /* de dónde sale el costo */
  const origen = [
    { q: 'De una compra real', v: v.de_compra_real },
    { q: 'De la ficha — último costo', v: v.de_ficha_ultimo_costo },
    { q: 'De la ficha — reposición', v: v.de_ficha_reposicion }
  ].filter(x => Number(x.v || 0) > 0);
  if (origen.length) {
    h.push(sec('De dónde sale el costo del stock',
      'Lo que sale de una compra real es lo firme. Lo que sale de la ficha de Tango es el dato '
      + 'que el 07/10 se midió como poco confiable: sirve para tener una idea, no para decidir.'));
    h.push(barras(origen, 'q', 'v', f => pesoM(f.v), 'v'));
  }

  /* por depósito */
  const dep = d.dep || [];
  if (dep.length) {
    h.push(sec('Por depósito', dep.length + ' depósitos. La suma tiene que dar el valorizado '
      + 'de arriba — es el control de que la cifra cierra consigo misma.'));
    h.push('<div class="tb-caja"><table><tr><th>Depósito</th><th class="num">Artículos</th>'
      + '<th class="num">Unidades</th><th class="num">Valorizado</th></tr>'
      + dep.map(x => '<tr><td class="cod">' + esc(x.cod_deposi) + '</td>'
        + '<td class="num">' + num(x.articulos) + '</td>'
        + '<td class="num">' + num(x.unidades) + '</td>'
        + celda(x.valorizado) + '</tr>').join('')
      + '<tr class="hi-total"><td><b>Total</b></td>'
      + '<td class="num"><b>' + num(dep.reduce((a, x) => a + Number(x.articulos || 0), 0)) + '</b></td>'
      + '<td class="num"><b>' + num(dep.reduce((a, x) => a + Number(x.unidades || 0), 0)) + '</b></td>'
      + celda(dep.reduce((a, x) => a + Number(x.valorizado || 0), 0)) + '</tr>'
      + '</table></div>');
  }

  /* histórico vs reposición */
  if (r.valor_historico_total) {
    h.push(sec('Lo que costó contra lo que costaría hoy',
      'Medido sólo sobre los ' + num(r.articulos_comparables) + ' artículos que tienen las dos '
      + 'cifras — ' + cobertura(r.cobertura_comparable_pct) + ' del valor. Sobre el resto no se '
      + 'puede comparar.'));
    h.push('<section class="tarjetas">'
      + tarjeta(pesoM(r.comparable_historico), 'lo que costó', esc(exacto(r.comparable_historico)), 'gris')
      + tarjeta(pesoM(r.comparable_reposicion), 'lo que costaría hoy', esc(exacto(r.comparable_reposicion)))
      + tarjeta(pesoM(r.brecha), 'diferencia', cobertura(r.brecha_pct) + ' más caro hoy',
                Number(r.brecha) > 0 ? 'rojo' : '')
      + '</section>');

    const bre = d.bre || [];
    if (bre.length) {
      h.push('<div class="tb-caja" style="margin-top:12px"><table><tr><th>Artículo</th>'
        + '<th>Descripción</th><th class="num">Cantidad</th><th class="num">Costó</th>'
        + '<th class="num">Costaría</th><th class="num">Diferencia</th>'
        + '<th>De dónde sale</th></tr>'
        + bre.map(x => '<tr><td class="cod">' + esc(x.cod_articu) + '</td>'
          + '<td class="desc" title="' + esc(x.articulo) + '">' + esc(x.articulo) + '</td>'
          + '<td class="num">' + num(x.cantidad) + '</td>'
          + celda(x.valor_historico) + celda(x.valor_reposicion) + celda(x.brecha)
          + '<td class="desc">' + esc(x.origen_costo || '—') + '</td></tr>').join('')
        + '</table></div>');
    }
  }

  /* a liquidar */
  const liq = d.liq || [];
  if (liq.length) {
    const cap = liq.reduce((a, x) => a + Number(x.capital_inmovilizado || 0), 0);
    h.push(sec('Capital inmovilizado — los 20 que más pesan',
      'Artículos con existencia y sin venta hace más de 180 días, incluidos los que nunca '
      + 'vendieron. Estos 20 solos son ' + exacto(cap) + '.'));
    h.push('<div class="tb-caja"><table><tr><th>Artículo</th><th>Descripción</th>'
      + '<th class="num">Unidades</th><th class="num">Costo unit.</th>'
      + '<th class="num">Capital</th><th>Última venta</th><th class="num">Días</th>'
      + '<th>Situación</th></tr>'
      + liq.map(x => '<tr class="mal"><td class="cod">' + esc(x.cod_articu) + '</td>'
        + '<td class="desc" title="' + esc(x.articulo) + '">' + esc(x.articulo) + '</td>'
        + '<td class="num">' + num(x.unidades) + '</td>'
        + celda(x.costo_unitario) + celda(x.capital_inmovilizado)
        + '<td>' + fecha(x.ultima_venta) + '</td>'
        + '<td class="num">' + (x.dias_sin_venta === null ? '—' : num(x.dias_sin_venta)) + '</td>'
        + '<td class="desc">' + esc(x.situacion || '') + '</td></tr>').join('')
      + '</table></div>');
  }

  $('cuerpo').innerHTML = h.join('');
}

/* ---------- kardex ---------- */
async function verKardex() {
  const a = ($('k-art').value || '').trim().toUpperCase();
  if (!a) { $('k-art').focus(); return; }
  const b = $('b-kardex');
  if (b.disabled) return;
  b.disabled = true; b.textContent = 'Buscando...';
  try {
    const { data, ms } = await rpc('api_kardex', {
      p_cod_articu: a,
      p_desde: $('k-desde').value || null,
      p_hasta: $('k-hasta').value || null,
      p_limite: 500
    });
    const f = data || [];
    if (!f.length) {
      $('kardex').innerHTML = '<div class="aviso" style="margin-top:14px">'
        + 'No hay movimientos de <b>' + esc(a) + '</b> en ese período.</div>';
      return;
    }
    const ent = f.filter(x => Number(x.cantidad) > 0).reduce((s, x) => s + Number(x.cantidad), 0);
    const sal = f.filter(x => Number(x.cantidad) < 0).reduce((s, x) => s + Number(x.cantidad), 0);
    $('kardex').innerHTML = sec('Movimientos de ' + esc(a),
        num(f.length) + ' movimientos · entraron ' + num(ent) + ' · salieron ' + num(Math.abs(sal))
        + ' · neto ' + num(ent + sal) + ' · la base tardó ' + (ms / 1000).toFixed(2) + ' s')
      + '<div class="tb-caja"><table><tr><th>Fecha</th><th>Comprobante</th><th>Movimiento</th>'
      + '<th>Depósito</th><th class="num">Cantidad</th><th class="num">Precio</th>'
      + '<th>Estado</th></tr>'
      + f.map(x => '<tr class="' + (Number(x.cantidad) < 0 ? 'mal' : 'bien') + '">'
        + '<td>' + fecha(x.fecha) + '</td>'
        + '<td class="cod">' + esc((x.t_comp || '') + ' ' + (x.n_comp || '')) + '</td>'
        + '<td class="desc">' + esc(x.tipo_mov || '') + '</td>'
        + '<td class="cod">' + esc(x.cod_deposi || '') + '</td>'
        + '<td class="num">' + num(x.cantidad) + '</td>'
        + celda(x.precio)
        + '<td class="desc">' + esc(x.estado_mov || '') + '</td></tr>').join('')
      + '</table></div>';
  } catch (e) {
    $('kardex').innerHTML = '<div class="aviso" style="margin-top:14px">No se pudo: '
      + esc(e.message) + '</div>';
  } finally {
    b.disabled = false; b.textContent = 'Ver movimientos';
  }
}
