/* DISSAN · Margen de ventas reales
   ---------------------------------------------------------------------------
   Una sola llamada: api_margen_tablero_v3, la MISMA que sirve hoy el panel de
   Apps Script. No se cambió ni una función de la base.

   Los parámetros van CON NOMBRE, nunca por posición: p_solo_bajo_costo tiene
   DEFAULT false y p_solo_productos DEFAULT true, y pasarles null cambia el
   resultado entero (el 15/10 eso me dio 106 renglones y −33,2% contra los
   3.745 y 36,5% de la pantalla, y casi reporto el módulo como roto).
   --------------------------------------------------------------------------- */
'use strict';

let ULTIMO = null;   // la respuesta cruda, para poder controlarla desde la consola

async function calcular() {
  const b = $('b-calc');
  if (b.disabled) return;                    // el botón queda muerto mientras carga
  b.disabled = true; b.textContent = 'Calculando...';
  $('aviso').hidden = true;
  $('reloj').hidden = true;

  const args = {
    p_desde:           $('f-desde').value || null,
    p_hasta:           $('f-hasta').value || null,
    p_calidad:         $('f-180').checked ? CALIDAD_CON_180 : CALIDAD_FIRME,
    p_solo_productos:  $('f-productos').checked,
    p_solo_bajo_costo: $('f-bajo').checked
  };

  try {
    const { data, ms } = await rpc('api_margen_tablero_v3', args);
    ULTIMO = data;
    pintar(data, ms);
  } catch (e) {
    $('aviso').hidden = false;
    $('aviso').textContent = 'No se pudo calcular: ' + e.message;
    $('tarjetas').innerHTML = '';
  } finally {
    b.disabled = false; b.textContent = 'Calcular';
  }
}

function tarjeta(n, rotulo, detalle, clase) {
  return '<div class="tj"><div class="n ' + (clase || '') + '">' + n + '</div>'
       + '<div class="r">' + esc(rotulo) + '</div>'
       + (detalle ? '<div class="d">' + esc(detalle) + '</div>' : '') + '</div>';
}

function pintar(d, ms) {
  const r = (d && d.resumen) || {};

  $('metodo').textContent = d.metodo || '';

  $('reloj').hidden = false;
  $('reloj').innerHTML = 'La base contestó en <b>' + (ms / 1000).toFixed(2) + ' s</b>'
    + ' &nbsp;·&nbsp; ' + num(r.renglones_totales) + ' renglones del período';

  const t = [];
  t.push(tarjeta(num(r.medidos), 'renglones medidos',
                 'de ' + num(r.renglones_totales) + ' del período', 'gris'));
  t.push(tarjeta(pesoM(r.facturado), 'facturado medido', exacto(r.facturado)));
  t.push(tarjeta(pct(r.margen_pct), 'margen sobre el precio', 'ganancia ÷ facturado'));
  t.push(tarjeta(pct(r.margen_sobre_costo), 'margen sobre el costo', 'así lo calcula DISSAN'));
  t.push(tarjeta(pesoM(r.margen_bruto), 'ganancia bruta',
                 exacto(r.facturado) + ' − ' + exacto(r.costo)));
  t.push(tarjeta(pct(r.cobertura_pct), 'cobertura',
                 'lo que se puede medir; el resto no dice que esté bien, dice que no se sabe'));
  t.push(tarjeta(num(r.bajo_costo_n), 'renglones bajo costo',
                 'perdieron ' + exacto(r.perdida), 'rojo'));
  t.push(tarjeta(num(r.cuarentena_n), 'apartados en cuarentena',
                 exacto(r.cuarentena_monto) + ' — no suman', 'rojo'));
  $('tarjetas').innerHTML = t.join('');

  const a = d.actualizado || {};
  $('actualizado').textContent = a.cuando
    ? 'Datos al ' + a.cuando + ' (hace ' + a.horas + ' h). El refresco corre solo todas las mañanas.'
    : '';

  /* margen mes a mes */
  const m = (d.por_mes || []).filter(x => !x.vacio);
  if (m.length) {
    $('meses').hidden = false;
    $('meses').innerHTML = '<h2>Margen mes a mes</h2><table>'
      + '<tr><th>Mes</th><th class="num">Renglones</th><th class="num">Margen</th>'
      + '<th class="num">Pérdida</th></tr>'
      + m.map(x => '<tr><td>' + esc(x.mes) + '</td>'
          + '<td class="num">' + num(x.n) + '</td>'
          + '<td class="num">' + pct(x.margen) + '</td>'
          + '<td class="num">' + (x.perdida ? peso(x.perdida) : '—') + '</td></tr>').join('')
      + '</table>';
  } else {
    $('meses').hidden = true;
  }
}
