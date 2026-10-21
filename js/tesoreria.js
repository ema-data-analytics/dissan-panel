/* DISSAN · Tesorería
   ---------------------------------------------------------------------------
   LO QUE ESTA PANTALLA SÍ PUEDE AFIRMAR, y lo que no.

   El importe de `sba05` es ABSOLUTO: el sentido está en la columna `d_h`
   (D entra, H sale). Sumar `cant_mone` con su signo da cualquier cosa. Es el
   mismo golpe del kardex del 21/10, donde la cantidad venía siempre positiva
   y el sentido estaba en `tipo_mov`.

   Medido antes de escribir una línea de esto, el 21/10/2026:
     · Los recibos de cobranza (REC) y los anticipos caen en D; las órdenes de
       pago (O/P), los gastos de médicos (GTO) y los viáticos (FPC) caen en H.
       O sea que la convención es la normal y NO está invertida.
     · `sba01.saldo_act` = debe − haber, en 76 de las 78 cuentas.
     · De 17.028 asientos, cierran 17.025. Los tres que no suman $34.965, que
       es el descuadre de TODA la tesorería, y uno de los tres lo explica.

   POR ESO NO HAY UNA TARJETA QUE DIGA "LA PLATA QUE HAY":
     · Las cajas no tienen asiento de saldo inicial, así que su neto es
       "cuánto más salió que entró desde que arranca el dato", no la plata que
       hay en el cajón. Es el mismo límite que el stock inicial.
     · Las contracuentas (deudores, proveedores, retenciones) están usadas de
       un solo lado: sólo reciben la pata que pasa por tesorería. Su cifra es
       "cuánto se cobró" o "cuánto se pagó", nunca un saldo.
   Decir "hay $X" mezclando esas tres cosas sería una cifra equivocada
   disfrazada de respuesta.

   Las fechas se cortan en el día de hoy: hay un recibo fechado en el año
   2202 que, sin cortar, se lleva puesto cualquier "último movimiento".
   --------------------------------------------------------------------------- */
'use strict';

let ULTIMO = {};

async function calcular() {
  const b = $('b-calc');
  if (b.disabled) return;
  b.disabled = true; b.textContent = 'Buscando…';
  $('aviso').hidden = true; $('reloj').hidden = true;

  const desde = $('f-desde').value || null, hasta = $('f-hasta').value || null;
  try {
    const t0 = performance.now();
    const [ctl, ctas, sin, comp, mov, imp] = await Promise.all([
      rpc('api_tesoreria_partida_doble_v2',      {}),
      rpc('api_tesoreria_cuentas_v2',            { p_limite: 500 }),
      rpc('api_tesoreria_asientos_sin_cerrar_v2',{}),
      rpc('api_tesoreria_por_comprobante_v2',    { p_desde: desde, p_hasta: hasta }),
      rpc('api_tesoreria_movimientos_v2',        { p_desde: desde, p_hasta: hasta,
                                                   p_limite: 300 }),
      rpc('api_tesoreria_fechas_imposibles_v2',  {})
    ]);
    const ms = Math.round(performance.now() - t0);
    ULTIMO = { ctl: una(ctl.data), ctas: ctas.data || [], sin: sin.data || [],
               comp: comp.data || [], mov: mov.data || [], imp: imp.data || [] };
    pintar(ULTIMO, ms, desde, hasta);
  } catch (e) {
    $('aviso').hidden = false;
    $('aviso').innerHTML = '<b>No se pudo leer la tesorería.</b> ' + esc(e.message || e);
    $('cuerpo').innerHTML = '';
  } finally {
    b.disabled = false; b.textContent = 'Ver';
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

/* El neto de una clase sale SUMANDO lo que se está mostrando, no de una
   consulta aparte: así la tarjeta y la tabla no pueden decir cosas distintas. */
const porClase = (ctas, clase) => ctas.filter(x => x.clase === clase);
const sumar = (filas, col) => filas.reduce((a, x) => a + Number(x[col] || 0), 0);

function pintar(d, ms, desde, hasta) {
  const c = d.ctl || {}, ctas = d.ctas, h = [];

  const bancos = porClase(ctas, 'banco');
  const carte  = porClase(ctas, 'cheques en cartera');
  const cajas  = porClase(ctas, 'caja o efectivo');
  const contra = porClase(ctas, 'contracuenta de un solo lado');
  const otras  = porClase(ctas, 'otra, con los dos lados');

  $('reloj').hidden = false;
  $('reloj').innerHTML = 'La base contestó en <b>' + (ms / 1000).toFixed(2) + ' s</b>'
    + ' &nbsp;·&nbsp; 6 consultas en paralelo &nbsp;·&nbsp; '
    + num(c.movimientos) + ' movimientos en ' + num(c.cuentas) + ' cuentas, del '
    + fecha(c.primer_movimiento) + ' al ' + fecha(c.ultimo_movimiento);

  /* ---------- tarjetas ---------- */
  const t = [];
  t.push(tarjeta(pesoM(sumar(bancos, 'neto')), 'bancos',
    num(bancos.length) + ' cuentas · ' + esc(exacto(sumar(bancos, 'neto')))));
  t.push(tarjeta(pesoM(sumar(carte, 'neto')), 'cheques en cartera',
    num(carte.length) + ' cuentas · ' + esc(exacto(sumar(carte, 'neto')))));
  t.push(tarjeta(pesoM(sumar(cajas, 'neto')), 'cajas y efectivo',
    num(cajas.length) + ' cuentas · ' + esc(exacto(sumar(cajas, 'neto'))), 'gris'));
  t.push(tarjeta(pesoM(sumar(contra, 'neto')), 'contracuentas',
    num(contra.length) + ' cuentas de un solo lado', 'gris'));
  t.push(tarjeta(num(c.movimientos), 'movimientos', 'en toda la tesorería', 'gris'));
  t.push(tarjeta(num(c.asientos_sin_cerrar), 'asientos que no cierran',
    'de ' + num(c.asientos) + ' — ver abajo',
    Number(c.asientos_sin_cerrar) ? 'mal' : 'gris'));
  h.push('<section class="tarjetas">' + t.join('') + '</section>');

  /* ---------- lo que esta pantalla NO dice, y por qué ---------- */
  const cajasSinInicial = cajas.filter(x => Number(x.asientos_iniciales || 0) === 0).length;
  const contraUnLado    = contra.length;
  h.push('<div class="aviso"><b>Acá no hay una cifra que diga «la plata que hay», y es a '
    + 'propósito.</b> De las ' + num(cajas.length) + ' cuentas de caja y efectivo, <b>'
    + num(cajasSinInicial) + ' no tienen asiento de saldo inicial</b>: su neto es cuánto más '
    + 'salió que entró desde que arranca el dato, no lo que hay en el cajón — por eso dan '
    + 'negativo. Y las ' + num(contraUnLado) + ' contracuentas (deudores, proveedores, '
    + 'retenciones) están usadas <b>de un solo lado</b>, porque sólo reciben la pata que pasa '
    + 'por tesorería: su cifra es cuánto se cobró o cuánto se pagó, <b>nunca un saldo</b>. '
    + 'Sumar las tres cosas daría un número con pinta de respuesta.</div>');

  /* ---------- el control de la partida doble ---------- */
  const neto = sumar(ctas, 'neto');
  h.push(sec('El control: la partida doble',
    'Cierran ' + num(Number(c.asientos || 0) - Number(c.asientos_sin_cerrar || 0))
    + ' de ' + num(c.asientos) + ' asientos. Si el debe no da igual al haber, hay un asiento '
    + 'con una pata sola.'));
  h.push('<div class="aviso"><b>Debe ' + exacto(c.debe) + ' contra haber '
    + exacto(c.haber) + '</b> — difieren <b>' + exacto(c.diferencia) + '</b> sobre '
    + pesoM(c.debe) + ', y la suma de los netos de las ' + num(ctas.length) + ' cuentas da '
    + exacto(neto) + ', que es la misma diferencia. '
    + '<b>' + num(c.cuentas_saldo_coincide) + ' de ' + num(c.cuentas) + ' cuentas</b> tienen el '
    + 'saldo guardado por Tango igual a su debe menos haber'
    + (Number(c.cuentas_saldo_no_coincide) ? ', y ' + num(c.cuentas_saldo_no_coincide)
        + ' no — están marcadas en la tabla.' : '.')
    + ' El importe de cada movimiento viene <b>sin signo</b>: el sentido está en una columna '
    + 'aparte, así que el saldo es debe menos haber y nunca la suma de los importes.</div>');

  if (d.sin.length) {
    h.push(sec('Los asientos que no cierran', 'Son ' + num(d.sin.length)
      + ' y entre ellos está todo el descuadre: suman '
      + exacto(sumar(d.sin, 'descuadre')) + ', contra los ' + exacto(c.diferencia)
      + ' de la tesorería entera.'));
    h.push('<div class="tb-caja"><table><tr><th>Comprobante</th><th>Número</th><th>Fecha</th>'
      + '<th class="num">Patas</th><th class="num">Entra</th><th class="num">Sale</th>'
      + '<th class="num">Descuadre</th><th>Cómo está armado</th></tr>'
      + d.sin.map(x => '<tr class="mal"><td class="cod">' + esc(x.cod_comp) + '</td>'
        + '<td class="cod">' + esc(String(x.n_comp || '').trim()) + '</td>'
        + '<td>' + fecha(x.fecha) + '</td>'
        + '<td class="num">' + num(x.patas) + '</td>'
        + celda(x.debe) + celda(x.haber) + celda(x.descuadre)
        + '<td class="desc" title="' + esc(x.detalle) + '">' + esc(x.detalle) + '</td></tr>')
        .join('') + '</table></div>');
    /* Cuáles se cancelan entre sí no se escribe a mano: se mide. Un recibo mal cargado y su
       reversión aparecen con el mismo descuadre al revés, y ésos no mueven plata. */
    const dd = d.sin.map(x => Number(x.descuadre || 0));
    const seCancela = dd.map((v, i) => dd.some((w, j) => j !== i && Math.abs(v + w) < 0.02));
    const pares = seCancela.filter(Boolean).length;
    const reales = d.sin.filter((x, i) => !seCancela[i]);
    h.push('<div class="aviso"><b>Hallazgo para DISSAN.</b> '
      + (pares ? 'De los ' + num(d.sin.length) + ', <b>' + num(pares) + ' se cancelan entre '
          + 'ellos</b> (un comprobante mal cargado y su propia reversión, con el mismo '
          + 'descuadre al revés), así que no mueven plata. ' : '')
      + (reales.length
          ? 'Queda' + (reales.length > 1 ? 'n ' : ' ') + '<b>' + num(reales.length)
            + '</b> de verdad, por <b>' + exacto(sumar(reales, 'descuadre')) + '</b>: '
            + reales.map(x => esc(x.cod_comp) + ' ' + esc(String(x.n_comp || '').trim())
              + ' del ' + fecha(x.fecha)).join(', ')
            + '. Mirá la última columna: ahí se ve que una cuenta recibe un importe y la otra '
            + 'descarga otro.'
          : 'Ninguno queda sin explicación.')
      + '</div>');
  }

  /* ---------- las cuentas, por clase ---------- */
  const tabla = (titulo, sub, filas, tono) => {
    if (!filas.length) return;
    h.push(sec(titulo, sub));
    h.push('<div class="tb-caja"><table><tr><th>Código</th><th>Cuenta</th>'
      + '<th class="num">Movim.</th><th>Último</th><th class="num">Días</th>'
      + '<th>Saldo inicial</th><th class="num">Entró</th><th class="num">Salió</th>'
      + '<th class="num">Neto</th></tr>'
      + filas.map(x => {
          const n = Number(x.neto || 0);
          const viva = Number(x.dias_sin_mover || 9999) <= 60;
          return '<tr class="' + (x.coincide === false ? 'mal' : (n >= 0 ? 'bien' : '')) + '">'
            + '<td class="cod">' + esc(x.cod_cta) + '</td>'
            + '<td class="desc" title="' + esc(x.cuenta || '') + '">' + esc(x.cuenta || '—')
            + (x.coincide === false ? ' <b title="El saldo que guarda Tango no coincide con el '
                + 'debe menos haber de sus movimientos">⚠</b>' : '') + '</td>'
            + '<td class="num">' + num(x.movimientos) + '</td>'
            + '<td>' + fecha(x.ultimo_mov) + '</td>'
            + '<td class="num" title="' + (viva ? 'se movió en los últimos 60 días'
                : 'quieta') + '">' + num(x.dias_sin_mover) + (viva ? ' ●' : '') + '</td>'
            + '<td>' + (Number(x.asientos_iniciales || 0)
                ? '<span title="' + esc(exacto(x.importe_inicial)) + '">sí, '
                  + pesoM(x.importe_inicial) + '</span>'
                : '<span title="esta cuenta arranca sin saldo inicial">no</span>') + '</td>'
            + celda(x.debe) + celda(x.haber) + celda(x.neto) + '</tr>';
        }).join('')
      + '<tr class="hi-total"><td colspan="6"><b>Total</b></td>'
      + celda(sumar(filas, 'debe')) + celda(sumar(filas, 'haber'))
      + celda(sumar(filas, 'neto')) + '</tr></table></div>');
  };

  tabla('Bancos', 'El neto es debe menos haber de todos sus movimientos. La columna «Días» '
      + 'dice hace cuánto no se mueve: con ● se movió en los últimos 60 días.', bancos);
  tabla('Cheques en cartera', 'Cheques recibidos y todavía no depositados ni rechazados.',
      carte);
  tabla('Cajas y efectivo', 'Sin saldo inicial no se puede decir cuánta plata hay: lo que se '
      + 'puede decir es cuánto entró y cuánto salió.', cajas);
  if (otras.length) tabla('Otras cuentas con los dos lados', 'No son banco, ni cartera, ni '
      + 'caja por el nombre, y tienen movimientos en los dos sentidos.', otras);
  tabla('Contracuentas, de un solo lado', 'Deudores, proveedores y retenciones: sólo reciben '
      + 'la pata que pasa por tesorería, así que esto es cuánto pasó, no un saldo.', contra);

  /* ---------- por tipo de comprobante ---------- */
  if (d.comp.length) {
    const ini = d.comp.filter(x => x.que_es === 'SALDO INICIAL');
    const sinRotulo = d.comp.filter(x => String(x.que_es).startsWith('no está rotulado')
                                      || String(x.que_es).startsWith('no esta rotulado'));
    h.push(sec('Qué clase de movimientos hay',
      d.comp.length + ' tipos de comprobante en el período elegido.'));
    h.push(barras(d.comp.map(x => Object.assign({}, x,
        { etiqueta: x.cod_comp + ' · ' + x.que_es })), 'etiqueta', 'movimientos',
      f => num(f.movimientos) + ' mov. · entra ' + pesoM(f.entra) + ' · sale '
           + pesoM(f.sale), 'v'));
    h.push('<div class="aviso">Los rótulos de los tipos están escritos a mano acá, no vienen '
      + 'de la base: si alguno está mal, se corrige en un renglón. '
      + (ini.length ? '<b>Los asientos de saldo inicial están a la vista</b> ('
          + ini.map(x => esc(x.cod_comp)).join(', ') + ') y son los que hacen que un banco '
          + 'tenga un punto de partida.' : 'En este período no hay asientos de saldo inicial.')
      + (sinRotulo.length ? ' Quedan <b>' + num(sinRotulo.length) + ' sin rótulo</b>: '
          + sinRotulo.map(x => esc(x.cod_comp)).join(', ') + '.' : '')
      + '</div>');
  }

  /* ---------- fechas imposibles ---------- */
  if (d.imp.length) {
    h.push(sec('Movimientos con fecha imposible', num(d.imp.length)
      + ' movimientos con fecha a más de 90 días en el futuro.'));
    h.push('<div class="tb-caja"><table><tr><th>Fecha</th><th>Comprobante</th><th>Número</th>'
      + '<th>Cuenta</th><th>Sentido</th><th class="num">Importe</th></tr>'
      + d.imp.map(x => '<tr class="mal"><td>' + fecha(x.fecha) + '</td>'
        + '<td class="cod">' + esc(x.cod_comp) + '</td>'
        + '<td class="cod">' + esc(String(x.n_comp || '').trim()) + '</td>'
        + '<td class="desc">' + esc(x.cuenta || x.cod_cta) + '</td>'
        + '<td>' + esc(x.sentido) + '</td>' + celda(x.importe) + '</tr>').join('')
      + '</table></div>');
    const anios = [...new Set(d.imp.map(x => String(x.fecha || '').slice(0, 4)))].sort();
    h.push('<div class="aviso"><b>Hallazgo para DISSAN.</b> Están fechados en '
      + (anios.length === 1 ? 'el año <b>' + esc(anios[0]) + '</b>'
         : 'los años <b>' + anios.map(esc).join(', ') + '</b>')
      + ', o sea un año tipeado con un dígito de más. No mueven plata si cada uno tiene su '
      + 'reversión, pero sin cortar las fechas se llevan puesto cualquier «último '
      + 'movimiento» de la cuenta. <b>Esta pantalla corta en el día de hoy</b>, y los gastos '
      + 'fechados en los próximos 90 días no entran acá porque son normales.</div>');
  }

  /* ---------- los movimientos ---------- */
  if (d.mov.length) {
    const ent = d.mov.filter(x => x.sentido === 'entra');
    const sal = d.mov.filter(x => x.sentido === 'sale');
    h.push(sec('Los movimientos, uno por uno',
      'Los ' + num(d.mov.length) + ' más nuevos del período: ' + num(ent.length)
      + ' que entran por ' + exacto(sumar(ent, 'importe')) + ' y ' + num(sal.length)
      + ' que salen por ' + exacto(sumar(sal, 'importe'))
      + '. El sentido sale de la columna de la base, no del signo del importe.'));
    h.push('<div class="tb-caja"><table><tr><th>Fecha</th><th>Comprobante</th><th>Número</th>'
      + '<th>Cuenta</th><th>Sentido</th><th class="num">Importe</th><th>Leyenda</th></tr>'
      + d.mov.map(x => {
          const entra = x.sentido === 'entra';
          const n = Number(x.importe || 0);
          return '<tr class="' + (entra ? 'bien' : '') + '">'
            + '<td>' + fecha(x.fecha) + '</td>'
            + '<td class="cod">' + esc(x.cod_comp) + '</td>'
            + '<td class="cod">' + esc(String(x.n_comp || '').trim()) + '</td>'
            + '<td class="desc" title="' + esc(x.cuenta || '') + '">'
            + esc(x.cuenta || x.cod_cta) + '</td>'
            + '<td>' + (entra ? 'entra' : 'sale') + '</td>'
            + '<td class="num" title="' + esc(exacto(n)) + '">'
            + (entra ? '+' : '−') + '$' + nf2.format(Math.abs(n)) + '</td>'
            + '<td class="desc" title="' + esc(x.leyenda || '') + '">'
            + esc(x.leyenda || '—') + '</td></tr>';
        }).join('') + '</table></div>');
  }

  /* ---------- qué mira el filtro y qué no ---------- */
  h.push('<div class="aviso"><b>Qué mueven las fechas de arriba.</b> Mueven «qué clase de '
    + 'movimientos hay» y la lista de movimientos. <b>No mueven la tabla de cuentas ni el '
    + 'control de la partida doble</b>: un saldo se arma con todos los movimientos de la '
    + 'cuenta desde el principio, así que recortarlo por fecha daría un saldo que no existe.'
    + (desde || hasta ? ' Ahora está puesto del <b>' + fecha(desde || c.primer_movimiento)
        + '</b> al <b>' + fecha(hasta || c.ultimo_movimiento) + '</b>.' : '')
    + '</div>');

  $('cuerpo').innerHTML = h.join('');
}
