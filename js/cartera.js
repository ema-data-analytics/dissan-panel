/* DISSAN · Cartera de riesgo
   ---------------------------------------------------------------------------
   LAS DOS FUENTES, Y POR QUÉ ESTÁN LAS DOS.

   La cartera se mide por los VENCIMIENTOS pendientes (`gva46`), que es lo que
   permite repartirla por antigüedad. El saldo de la FICHA del cliente
   (`gva14.saldo_cc`) es una fuente distinta, que no mira a la otra. Medido el
   21/10/2026: $2.364.716.380,37 contra $2.355.627.462,82 — 0,38%, y 62 de 76
   clientes cierran al peso. La diferencia son pagos a cuenta y notas de
   crédito, que la vista por vencimientos no ve.
   Las dos están a la vista y cada tabla dice de cuál sale, porque dos números
   de la misma pantalla sin rótulo son una mentira aunque los dos estén bien.

   Antes de creerle a la cifra se midieron las tres trampas de esta base, y
   ninguna dispara acá:
     · 472 vencimientos pendientes en 472 comprobantes — uno por comprobante,
       así que restar lo aplicado no se duplica.
     · Los 472 ligan a UNA sola factura por (n_comp, t_comp), que es el join
       que en esta base ya engañó una vez.
     · Los 472 son FAC: no hay notas de crédito pendientes cambiando el signo.

   LO QUE ESTA PANTALLA NO DICE: no hay proyección de caja. Los 799
   comprobantes de compra pendientes tienen fecha de vencimiento 01/01/1800
   —el centinela de fecha vacía de Tango—, así que no hay lado de pagos que
   proyectar. Un neto de cobranzas menos pagos sería la cobranza con otro
   nombre, y acá se muestra la cobranza y se la llama cobranza.
   --------------------------------------------------------------------------- */
'use strict';

let ULTIMO = {};

async function calcular() {
  const b = $('b-calc');
  if (b.disabled) return;
  b.disabled = true; b.textContent = 'Buscando…';
  $('aviso').hidden = true; $('reloj').hidden = true;

  const corte = $('f-corte').value || null;
  const dias  = Number($('f-dias').value || 90);
  try {
    const t0 = performance.now();
    const [ctl, tra, cli, rie, sem] = await Promise.all([
      rpc('api_cartera_control_v2',         { p_corte: corte }),
      rpc('api_riesgo_cartera',             { p_corte: corte }),
      rpc('api_cartera_por_cliente',        { p_corte: corte, p_limite: 40 }),
      rpc('api_cartera_riesgo_con_ventas',  { p_dias: dias, p_limite: 20 }),
      rpc('api_cobranzas_por_semana_v2',    { p_semanas: 10, p_corte: corte })
    ]);
    const ms = Math.round(performance.now() - t0);
    ULTIMO = { ctl: una(ctl.data), tra: tra.data || [], cli: cli.data || [],
               rie: rie.data || [], sem: sem.data || [] };
    pintar(ULTIMO, ms, dias);
  } catch (e) {
    $('aviso').hidden = false;
    $('aviso').innerHTML = '<b>No se pudo leer la cartera.</b> ' + esc(e.message || e);
    $('cuerpo').innerHTML = '';
  } finally {
    b.disabled = false; b.textContent = 'Ver';
  }
}

const una = d => Array.isArray(d) ? (d[0] || {}) : (d || {});
const signo = n => Number(n || 0) < 0 ? '−' : '';
const pesoMs  = n => signo(n) + pesoM(Math.abs(Number(n || 0)));
const exactoS = n => signo(n) + exacto(Math.abs(Number(n || 0)));
const sumar = (filas, col) => filas.reduce((a, x) => a + Number(x[col] || 0), 0);

function tarjeta(n, rotulo, detalle, clase) {
  return '<div class="tj"><div class="n ' + (clase || '') + '">' + n + '</div>'
       + '<div class="r">' + esc(rotulo) + '</div>'
       + (detalle ? '<div class="d">' + detalle + '</div>' : '') + '</div>';
}
function sec(t, s) {
  return '<div class="tb-sec">' + esc(t) + (s ? '<small>' + esc(s) + '</small>' : '') + '</div>';
}
function celda(v) {
  const n = Number(v || 0), a = Math.abs(n);
  const txt = signo(n) + (a >= 1e6 ? '$' + nf1.format(a / 1e6) + ' M' : '$' + nf0.format(a));
  return '<td class="num" title="' + esc(exactoS(n)) + '">' + txt + '</td>';
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
/* El rótulo del tramo viene como "2 vencido 1-30": el número es para ordenar. */
const tramoEt = t => String(t || '').replace(/^\d+\s*/, '');

function pintar(d, ms, dias) {
  const c = d.ctl || {}, h = [];
  const aVencer = d.tra.filter(x => /a vencer/.test(x.tramo));
  const vencido = d.tra.filter(x => /vencido/.test(x.tramo));
  const total   = sumar(d.tra, 'importe');
  const impVenc = sumar(vencido, 'importe');

  $('reloj').hidden = false;
  $('reloj').innerHTML = 'La base contestó en <b>' + (ms / 1000).toFixed(2) + ' s</b>'
    + ' &nbsp;·&nbsp; 5 consultas en paralelo &nbsp;·&nbsp; '
    + num(c.vencimientos_pendientes) + ' vencimientos pendientes de '
    + num(c.clientes) + ' clientes';

  /* ---------- tarjetas ---------- */
  const t = [];
  t.push(tarjeta(pesoMs(total), 'cartera total', esc(exactoS(total)) + ' por vencimientos'));
  t.push(tarjeta(pesoMs(impVenc), 'ya vencido',
    nf1.format(100 * impVenc / (total || 1)) + '% de la cartera · '
    + esc(exactoS(impVenc)), impVenc > 0 ? 'mal' : 'gris'));
  t.push(tarjeta(pesoMs(sumar(aVencer, 'importe')), 'todavía a vencer',
    esc(exactoS(sumar(aVencer, 'importe'))), 'gris'));
  t.push(tarjeta(num(c.clientes), 'clientes con saldo',
    'de ' + num(c.clientes_comparados) + ' que aparecen en alguna de las dos fuentes', 'gris'));
  /* La concentración sale de la tabla que se está mostrando, no de una consulta aparte. */
  if (d.rie.length) {
    const mayor = d.rie[0];
    const sumaFichas = Number(c.por_las_fichas || 0);
    t.push(tarjeta(nf1.format(100 * Number(mayor.saldo_deuda || 0) / (sumaFichas || 1)) + '%',
      'lo debe un solo cliente',
      esc(String(mayor.cliente || '').trim()) + ' · ' + esc(exactoS(mayor.saldo_deuda)),
      'mal'));
  }
  t.push(tarjeta(num(c.comprobantes), 'comprobantes', 'con algo pendiente', 'gris'));
  h.push('<section class="tarjetas">' + t.join('') + '</section>');

  /* ---------- el control de dos fuentes ---------- */
  h.push(sec('El control: dos fuentes que no se miran entre sí',
    'Los vencimientos pendientes por un lado y el saldo de la ficha del cliente por el otro.'));
  h.push('<div class="aviso"><b>Por vencimientos ' + exactoS(c.por_vencimientos)
    + ' contra ' + exactoS(c.por_las_fichas) + ' según las fichas</b> — difieren '
    + exactoS(c.diferencia) + ', el <b>' + nf2.format(Number(c.diferencia_pct || 0))
    + '%</b>, y <b>' + num(c.cierran_al_peso) + ' de ' + num(c.clientes_comparados)
    + ' clientes cierran al peso</b>'
    + (Number(c.no_cierran) ? ' (' + num(c.no_cierran) + ' no). ' : '. ')
    + (Number(c.clientes_con_saldo_a_favor)
        ? 'La diferencia son pagos a cuenta y notas de crédito que la vista por vencimientos '
          + 'no ve: hay <b>' + num(c.clientes_con_saldo_a_favor) + ' clientes con saldo a su '
          + 'favor</b> por ' + exactoS(c.plata_a_favor) + '. ' : '')
    + 'Ninguna de las dos se calcula con la otra, así que esto es un control de verdad y no '
    + 'un total que cierra contra sí mismo.</div>');

  /* ---------- antigüedad ---------- */
  if (d.tra.length) {
    h.push(sec('La cartera por antigüedad',
      'Desde la fecha de vencimiento de cada comprobante hasta la fecha de corte.'));
    h.push(barras(d.tra.map(x => Object.assign({}, x, { et: tramoEt(x.tramo) })),
      'et', 'importe',
      f => pesoMs(f.importe) + ' · ' + num(f.comprobantes) + ' comp. · '
           + num(f.clientes) + ' clientes', 'v'));
    h.push('<div class="tb-caja"><table><tr><th>Tramo</th><th class="num">Clientes</th>'
      + '<th class="num">Comprob.</th><th class="num">Importe</th>'
      + '<th class="num">% de la cartera</th></tr>'
      + d.tra.map(x => '<tr class="' + (/a vencer/.test(x.tramo) ? 'bien' : 'mal') + '">'
        + '<td>' + esc(tramoEt(x.tramo)) + '</td>'
        + '<td class="num">' + num(x.clientes) + '</td>'
        + '<td class="num">' + num(x.comprobantes) + '</td>'
        + celda(x.importe)
        + '<td class="num">' + nf1.format(100 * Number(x.importe || 0) / (total || 1))
        + '%</td></tr>').join('')
      /* La columna de clientes NO se suma: un cliente puede estar en varios tramos.
         Sumarla daría más clientes que los que hay, como pasó con los depósitos. */
      + '<tr class="hi-total"><td><b>Total</b></td>'
      + '<td class="num" title="No se suma: un mismo cliente puede tener comprobantes en '
      + 'varios tramos, así que la suma de esta columna ('
      + num(sumar(d.tra, 'clientes')) + ') daría más clientes que los '
      + num(c.clientes) + ' que hay">—</td>'
      + '<td class="num">' + num(sumar(d.tra, 'comprobantes')) + '</td>'
      + celda(total) + '<td class="num">100,0%</td></tr></table></div>');
    h.push('<div class="aviso">La columna de clientes <b>no se suma</b>: un mismo cliente '
      + 'puede tener comprobantes en varios tramos. Sumada daría '
      + num(sumar(d.tra, 'clientes')) + ' cuando los clientes con saldo son '
      + num(c.clientes) + '.</div>');
  }

  /* ---------- cliente por cliente, por vencimientos ---------- */
  if (d.cli.length) {
    h.push(sec('Cliente por cliente, por vencimientos',
      'Los ' + num(d.cli.length) + ' de mayor saldo. La última columna es la MISMA deuda '
      + 'según la ficha del cliente, que es la otra fuente: donde las dos coinciden, el '
      + 'saldo está confirmado por duplicado.'));
    h.push('<div class="tb-caja"><table><tr><th>Código</th><th>Cliente</th>'
      + '<th class="num">Comprob.</th><th class="num">Saldo</th><th class="num">Vencido</th>'
      + '<th class="num">Días del más viejo</th><th class="num">Según la ficha</th>'
      + '<th>¿Coinciden?</th></tr>'
      + d.cli.map(x => {
          const dif = Number(x.saldo || 0) - Number(x.saldo_ficha || 0);
          const ok = Math.abs(dif) < 1;
          return '<tr class="' + (Number(x.vencido || 0) > 0 ? 'mal' : '') + '">'
            + '<td class="cod">' + esc(x.cod_client) + '</td>'
            + '<td class="desc" title="' + esc(x.cliente || '') + '">'
            + esc(String(x.cliente || '—').trim()) + '</td>'
            + '<td class="num">' + num(x.comprobantes) + '</td>'
            + celda(x.saldo) + celda(x.vencido)
            + '<td class="num">' + (x.dias_max_vencido === null ? '—'
                : num(x.dias_max_vencido)) + '</td>'
            + celda(x.saldo_ficha)
            + '<td title="' + (ok ? 'las dos fuentes dan lo mismo'
                : 'difieren en ' + esc(exactoS(dif))) + '">'
            + (ok ? 'sí' : 'no, ' + pesoMs(dif)) + '</td></tr>';
        }).join('')
      + '<tr class="hi-total"><td colspan="2"><b>Total de estos ' + num(d.cli.length)
      + '</b></td><td class="num">' + num(sumar(d.cli, 'comprobantes')) + '</td>'
      + celda(sumar(d.cli, 'saldo')) + celda(sumar(d.cli, 'vencido'))
      + '<td class="num">—</td>' + celda(sumar(d.cli, 'saldo_ficha'))
      + '<td>—</td></tr></table></div>');
  }

  /* ---------- quién debe y sigue comprando ---------- */
  if (d.rie.length) {
    const siguen = d.rie.filter(x => x.sigue_comprando === true);
    h.push(sec('Quién debe más, y si le seguimos vendiendo',
      'La deuda sale de la <b>ficha del cliente</b>, no de los vencimientos. Las ventas son '
      + 'de los últimos ' + num(dias) + ' días.'));
    h.push('<div class="tb-caja"><table><tr><th>Código</th><th>Cliente</th>'
      + '<th class="num">Debe (ficha)</th><th class="num">Le vendimos</th>'
      + '<th class="num">Comprob.</th><th>¿Sigue comprando?</th>'
      + '<th class="num">Debe / vendido</th></tr>'
      + d.rie.map(x => {
          const deuda = Number(x.saldo_deuda || 0), vta = Number(x.ventas_ultimos_dias || 0);
          return '<tr class="' + (x.sigue_comprando && deuda > vta ? 'mal' : '') + '">'
            + '<td class="cod">' + esc(x.cod_client) + '</td>'
            + '<td class="desc" title="' + esc(x.cliente || '') + '">'
            + esc(String(x.cliente || '—').trim()) + '</td>'
            + celda(deuda) + celda(vta)
            + '<td class="num">' + num(x.comprobantes_periodo) + '</td>'
            + '<td>' + (x.sigue_comprando ? 'sí' : 'no') + '</td>'
            + '<td class="num" title="Cuántas veces la deuda es más grande que lo que se le '
            + 'vendió en el período">' + (vta > 0 ? nf1.format(deuda / vta) + '×' : '—')
            + '</td></tr>';
        }).join('')
      + '<tr class="hi-total"><td colspan="2"><b>Total de estos ' + num(d.rie.length)
      + '</b></td>' + celda(sumar(d.rie, 'saldo_deuda'))
      + celda(sumar(d.rie, 'ventas_ultimos_dias'))
      + '<td class="num">' + num(sumar(d.rie, 'comprobantes_periodo')) + '</td>'
      + '<td>' + num(siguen.length) + ' de ' + num(d.rie.length) + '</td>'
      + '<td class="num">—</td></tr></table></div>');
    h.push('<div class="aviso"><b>Cómo se lee la última columna.</b> Es cuántas veces la '
      + 'deuda es más grande que lo que se le vendió en los últimos ' + num(dias)
      + ' días. Un número alto con «sigue comprando» en sí quiere decir que la deuda viene '
      + 'de antes y se le sigue despachando. <b>No es un juicio</b>: hay clientes públicos '
      + 'que pagan tarde por cómo pagan, y eso lo sabe DISSAN, no la base.</div>');
  }

  /* ---------- la cobranza por semana ---------- */
  if (d.sem.length) {
    const fut = d.sem.filter(x => !x.vencido);
    h.push(sec('Lo que se espera cobrar, semana por semana',
      'Por fecha de vencimiento. Las semanas marcadas ya pasaron: eso no se espera, se '
      + 'reclama.'));
    h.push(barras(d.sem.map(x => Object.assign({}, x,
        { et: fecha(x.semana) + (x.vencido ? ' (ya pasó)' : '') })), 'et', 'a_cobrar',
      f => pesoMs(f.a_cobrar) + ' · ' + num(f.comprobantes) + ' comp.', 'v'));
    h.push('<div class="aviso"><b>Esto no es una proyección de caja, y no se la llama así.</b> '
      + 'Para proyectar la caja haría falta el otro lado, lo que hay que pagar, y <b>las '
      + 'compras no tienen fecha de vencimiento en esta base</b>: los '
      + num(c.compras_pendientes_sin_vencimiento) + ' comprobantes de compra pendientes, por '
      + exactoS(c.importe_sin_vencimiento) + ', vienen todos con <b>01/01/1800</b>, que es '
      + 'como Tango escribe «vacío». Un neto de cobranzas menos pagos daría exactamente la '
      + 'cobranza con otro nombre. Acá se muestra la cobranza y se la llama cobranza: '
      + exactoS(sumar(fut, 'a_cobrar')) + ' en las próximas ' + num(fut.length)
      + ' semanas.</div>');
  }
}
