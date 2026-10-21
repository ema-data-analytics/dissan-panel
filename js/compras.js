/* DISSAN · Compras — sobre Supabase
   ---------------------------------------------------------------------------
   Seis funciones de la base, todas probadas con `set role authenticated`:
     api_compras_resumen(desde,hasta)
     api_compras_por_mes(desde,hasta)
     api_compras_por_proveedor(desde,hasta,limite)
     api_cuentas_a_pagar(corte)                  antigüedad POR EMISIÓN
     api_cuentas_a_pagar_por_proveedor(limite)   saldo pendiente
     api_compras_inflacion_articulo(...)         cuánto aumentó cada artículo

   LO QUE DESAPARECE: la pantalla vieja bajaba `cpa01` y `cpa04` crudos por
   PostgREST con la clave de servicio y sumaba en JavaScript.

   DOS COSAS QUE SE PARECEN Y NO SON LO MISMO, y por eso van separadas y
   rotuladas: `api_cuentas_a_pagar` reparte 1.059 comprobantes por
   ANTIGÜEDAD DE EMISIÓN ($2.408 M) porque la base no trae vencimiento de
   compras; `api_cuentas_a_pagar_por_proveedor` da el SALDO PENDIENTE de 11
   proveedores ($10 M). Ponerlas juntas sin decirlo sería una mentira.
   --------------------------------------------------------------------------- */
'use strict';

let ULTIMO = {};

async function calcular() {
  const b = $('b-calc');
  if (b.disabled) return;
  b.disabled = true; b.textContent = 'Calculando...';
  $('aviso').hidden = true; $('reloj').hidden = true;

  const desde = $('f-desde').value || null, hasta = $('f-hasta').value || null;
  try {
    const t0 = performance.now();
    const [res, mes, prov, ant, sal, inf] = await Promise.all([
      /* Las cuatro _v2 arreglan la mezcla de monedas medida el 21/10: importe_to viene en
         pesos y el neto/exento/IVA en la moneda del comprobante. Las v1 quedaron intactas. */
      rpc('api_compras_resumen_v2',          { p_desde: desde, p_hasta: hasta }),
      rpc('api_compras_por_mes_v2',          { p_desde: desde, p_hasta: hasta }),
      rpc('api_compras_por_proveedor_v2',    { p_desde: desde, p_hasta: hasta, p_limite: 20 }),
      rpc('api_cuentas_a_pagar',             {}),
      rpc('api_cuentas_a_pagar_por_proveedor', { p_limite: 50 }),
      rpc('api_compras_inflacion_articulo_v2', { p_desde: desde, p_hasta: hasta,
                                               p_min_compras: 3, p_limite: 25,
                                               p_incluir_dudosos: false })
    ]);
    const ms = Math.round(performance.now() - t0);
    ULTIMO = { res: una(res.data), mes: mes.data, prov: prov.data,
               ant: ant.data, sal: sal.data, inf: inf.data };
    pintar(ULTIMO, ms);
  } catch (e) {
    $('aviso').hidden = false;
    $('aviso').textContent = 'No se pudo calcular: ' + e.message;
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
/* Los meses se escriben en castellano, igual que en el Tablero: una etiqueta como
   "2026-01" es un código, no un mes. */
const MESES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
               'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const mesCorto = v => {
  const f = String(v || '').match(/^(\d{4})-(\d{2})/);
  return f ? MESES[Number(f[2])] + ' ' + f[1] : esc(v);
};

function pintar(d, ms) {
  const r = d.res || {}, h = [];

  $('reloj').hidden = false;
  $('reloj').innerHTML = 'La base contestó en <b>' + (ms / 1000).toFixed(2) + ' s</b>'
    + ' &nbsp;·&nbsp; 6 consultas en paralelo &nbsp;·&nbsp; '
    + num(r.comprobantes) + ' comprobantes de ' + num(r.proveedores) + ' proveedores';

  const t = [];
  t.push(tarjeta(pesoM(r.total), 'comprado en total', esc(exacto(r.total)) + ' con IVA'));
  t.push(tarjeta(pesoM(r.neto_gravado), 'neto gravado', esc(exacto(r.neto_gravado))));
  t.push(tarjeta(pesoM(r.exento), 'exento', esc(exacto(r.exento)), 'gris'));
  t.push(tarjeta(pesoM(r.iva), 'IVA', esc(exacto(r.iva)), 'gris'));
  t.push(tarjeta(pesoM(r.otros), 'otros conceptos', esc(exacto(r.otros))
    + ' — percepciones y demás', 'gris'));
  t.push(tarjeta(num(r.comprobantes), 'comprobantes', 'en el período', 'gris'));
  t.push(tarjeta(num(r.proveedores), 'proveedores', 'distintos en el período', 'gris'));
  h.push('<section class="tarjetas">' + t.join('') + '</section>');

  /* El control que la pantalla se hace a sí misma: las cuatro partes tienen que dar el
     total. Se calcula acá con lo que se está mostrando, no se da por sentado. */
  const partes = Number(r.neto_gravado || 0) + Number(r.exento || 0)
               + Number(r.iva || 0) + Number(r.otros || 0);
  const dif = partes - Number(r.total || 0);
  h.push('<div class="aviso"><b>El total cierra contra sus partes.</b> '
    + 'Neto ' + exacto(r.neto_gravado) + ' + exento ' + exacto(r.exento) + ' + IVA '
    + exacto(r.iva) + ' + otros ' + exacto(r.otros) + ' = <b>' + exacto(partes) + '</b>, '
    + 'contra el total de ' + exacto(r.total)
    + (Math.abs(dif) < 0.05 ? ' — coinciden.'
                            : ' — <b>no coinciden, faltan ' + exacto(dif) + '</b>.')
    + ' Los importes vienen en la moneda del comprobante y el total en pesos, así que los '
    + '<b>comprobantes en dólares se pasan a pesos por su cotización</b> antes de sumar '
    + '(medido: 85 de 87 cierran así). <b>Otros conceptos</b> son percepciones y cargos que '
    + 'el comprobante trae en el total y no en el neto ni en el exento.</div>');

  /* mes a mes */
  const mes = (d.mes || []).filter(x => Number(x.comprobantes || 0) > 0);
  if (mes.length) {
    /* El control lo hace la pantalla, no el que mira: si se deja la suma al lado del neto
       para que el lector compare dos cadenas de 15 dígitos, el centavo de redondeo parece
       un descuadre. */
    const suma = mes.reduce((a, x) => a + Number(x.neto || 0), 0);
    const dm = suma - Number(r.neto_gravado || 0);
    h.push(sec('Compras mes a mes',
      mes.length + (mes.length === 1 ? ' mes. ' : ' meses. ')
      + 'La suma del neto da ' + exacto(suma) + ' contra el neto gravado '
      + 'de arriba, ' + exacto(r.neto_gravado) + ' — '
      + (Math.abs(dm) < 0.005 ? 'coinciden al centavo.'
         : Math.abs(dm) <= 0.02 * mes.length
           ? 'coinciden; la diferencia de ' + exacto(dm) + ' es de redondear cada mes aparte.'
           : 'NO coinciden, sobran ' + exacto(dm) + '.')));
    /* la etiqueta se arma ANTES, no se parchea el HTML con una expresión
       regular después: eso se rompe el día que cambie una comilla. */
    const mesEt = mes.map(x => Object.assign({}, x, { etiqueta: mesCorto(x.mes) }));
    h.push(barras(mesEt, 'etiqueta', 'neto',
      f => pesoM(f.neto) + ' · ' + num(f.comprobantes) + ' comp.', 'v'));
  }

  /* proveedores */
  const prov = d.prov || [];
  if (prov.length) {
    /* EL SIGNO DEL SALDO ES CONVENCIÓN DE TANGO, NO DATO SUCIO.
       Medido el 21/10 sobre los 20 más grandes: 14 negativos, 0 positivos,
       6 en cero. En la cuenta corriente del proveedor el saldo va NEGATIVO
       cuando se le debe. Mostrarlo pelado en una columna que dice «Saldo»
       se lee al revés —como si ellos nos debieran mil millones—, así que el
       rótulo lo dice. No se le cambia el signo: se explica. */
    const negs = prov.filter(x => Number(x.saldo_cc_ficha) < 0).length;
    h.push(sec('Los ' + prov.length + ' proveedores más grandes del período',
      'Neto y total comprado en el período elegido.'));
    h.push('<div class="aviso" style="margin-top:-2px"><b>El saldo de la ficha va en negativo '
      + 'cuando se le debe al proveedor</b> — es la convención de la cuenta corriente de Tango, '
      + 'no un error: de estos ' + num(prov.length) + ', <b>' + num(negs) + '</b> están en '
      + 'negativo y ninguno en positivo. Y es el saldo <b>de toda la cuenta</b>, no el del '
      + 'período de arriba. Para lo que está pendiente de pago, mirá el cuadro de más abajo.</div>');
    h.push('<div class="tb-caja"><table><tr><th>Código</th><th>Proveedor</th>'
      + '<th class="num">Comprob.</th><th class="num">Neto</th><th class="num">Total</th>'
      + '<th class="num">Saldo en la ficha<br>(− = se le debe)</th></tr>'
      + prov.map(x => '<tr><td class="cod">' + esc(x.cod_provee) + '</td>'
        + '<td class="desc" title="' + esc(x.proveedor) + '">' + esc(x.proveedor) + '</td>'
        + '<td class="num">' + num(x.comprobantes) + '</td>'
        + celda(x.neto) + celda(x.total) + celda(x.saldo_cc_ficha) + '</tr>').join('')
      + '</table></div>');
  }

  /* antigüedad por emisión */
  const ant = d.ant || [];
  if (ant.length) {
    const tot = ant.reduce((a, x) => a + Number(x.importe || 0), 0);
    const comp = ant.reduce((a, x) => a + Number(x.comprobantes || 0), 0);
    const base = (ant[0] && ant[0].base_del_tramo) || '';
    h.push(sec('Comprobantes de compra por antigüedad',
      num(comp) + ' comprobantes por ' + exacto(tot) + '.'));
    h.push('<div class="aviso" style="margin-top:-2px"><b>Qué mide esto, exacto.</b> Reparte los '
      + 'comprobantes por <b>' + esc(base) + '</b>. <b>No es lo que se debe</b>: es cuándo se '
      + 'emitió cada comprobante. Lo que está pendiente de pago va más abajo, y son otras '
      + 'cifras. <b>Y este cuadro no mira las fechas de arriba</b>: va contra toda la base al '
      + 'día de hoy, así que no hay que leerlo como del período elegido.</div>');
    h.push(barras(ant, 'tramo', 'importe',
      f => pesoM(f.importe) + ' · ' + num(f.comprobantes) + ' comp.', 'r'));
  }

  /* saldo pendiente */
  const sal = d.sal || [];
  if (sal.length) {
    const tot = sal.reduce((a, x) => a + Number(x.saldo_pendiente || 0), 0);
    h.push(sec('Saldo pendiente por proveedor',
      num(sal.length) + ' proveedores con saldo, ' + exacto(tot) + ' en total. Esto sí es deuda '
      + 'viva, y por eso no coincide con el cuadro de arriba. Sale de la ficha del proveedor, '
      + 'así que es el saldo de hoy y tampoco mira las fechas de arriba.'));
    h.push('<div class="tb-caja"><table><tr><th>Código</th><th>Proveedor</th>'
      + '<th class="num">Saldo</th><th>Última factura</th><th class="num">Días</th>'
      + '<th class="num">Comprob.</th></tr>'
      + sal.map(x => '<tr class="mal"><td class="cod">' + esc(x.cod_provee) + '</td>'
        + '<td class="desc" title="' + esc(x.proveedor) + '">' + esc(x.proveedor) + '</td>'
        + celda(x.saldo_pendiente)
        + '<td>' + fecha(x.fecha_ultima_factura) + '</td>'
        + '<td class="num">' + (x.dias_desde_ultima_factura === null ? '—'
            : num(x.dias_desde_ultima_factura)) + '</td>'
        + '<td class="num">' + num(x.comprobantes) + '</td></tr>').join('')
      + '</table></div>');
  }

  /* cuánto aumentó cada artículo */
  const inf = d.inf || [];
  if (inf.length) {
    const dudosos = inf.filter(x => x.confiable === false).length;
    h.push(sec('Cuánto aumentó cada artículo',
      'Del primer precio de compra del período al último, sobre artículos con al menos 3 '
      + 'compras. La columna mensual lleva el aumento a tasa por mes, que es lo comparable '
      + 'entre artículos con distinta cantidad de días.'));
    if (dudosos) h.push('<div class="aviso" style="margin-top:-2px">' + num(dudosos)
      + ' de los ' + num(inf.length) + ' vienen marcados como no confiables por la propia '
      + 'función; mirá la columna <b>Reparo</b> antes de usarlos.</div>');
    h.push('<div class="tb-caja"><table><tr><th>Artículo</th><th>Descripción</th>'
      + '<th class="num">Compras</th><th>Primera</th><th class="num">Primer precio</th>'
      + '<th>Última</th><th class="num">Último precio</th><th class="num">Variación</th>'
      + '<th class="num">Por mes</th><th>Reparo</th></tr>'
      + inf.map(x => '<tr class="' + (x.confiable === false ? 'aparte'
            : (Number(x.variacion_pct) > 0 ? 'mal' : 'bien')) + '">'
        + '<td class="cod">' + esc(x.cod_articu) + '</td>'
        + '<td class="desc" title="' + esc(x.articulo) + '">' + esc(x.articulo) + '</td>'
        + '<td class="num">' + num(x.compras) + '</td>'
        + '<td>' + fecha(x.primera_fecha) + '</td>' + celda(x.primer_precio)
        + '<td>' + fecha(x.ultima_fecha) + '</td>' + celda(x.ultimo_precio)
        + '<td class="num">' + pct(x.variacion_pct) + '</td>'
        + '<td class="num">' + pct(x.variacion_mensual_pct) + '</td>'
        + '<td class="desc">' + esc(x.reparo || '—') + '</td></tr>').join('')
      + '</table></div>');
  }

  $('cuerpo').innerHTML = h.join('');
}
