
/* =====================================================================
   BITACORA — que hicimos, con fecha y hora                  28/10/2026
   =====================================================================
   Pedido del usuario: "no quiero perder mas el hilo de nada, fecha, hora,
   y lo que hacemos exacto".

   La AGENDA (ema.items) dice COMO ESTA cada punto. Esto dice QUE PASO y
   CUANDO. Lee `api_bitacora`, que pasa por el portero del panel: si el
   usuario no tiene el modulo, la funcion falla y no devuelve nada.

   El Excel y el PDF los pone `bajar.js` solo, sobre la tabla que se
   pinta: bajan EXACTAMENTE lo que esta filtrado, sin volver a consultar.
   ===================================================================== */

var BT = { cargando:false, armado:false, filas:[] };

function btEsc(s){
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function btNum(n){
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString('es-AR');
}
function btHoyISO(){
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' +
         String(d.getDate()).padStart(2,'0');
}
function btMenosDias(n){
  var d = new Date(); d.setDate(d.getDate() - n);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' +
         String(d.getDate()).padStart(2,'0');
}

/* el color del tipo: el que mas importa es `error`, y si el titulo dice
   ERROR REAL es una cagada propia, que se nombra asi y no se disimula */
function btChip(tipo, titulo){
  var cl = 'bt-chip bt-' + btEsc(tipo);
  if (tipo === 'error' && /ERROR REAL/.test(titulo || '')) cl += ' bt-mio';
  var rot = tipo === 'accion' ? 'acción' : (tipo === 'medicion' ? 'medición' :
            (tipo === 'decision' ? 'decisión' :
            (tipo === 'actualizacion' ? 'actualización' : tipo)));
  return '<span class="' + cl + '">' + btEsc(rot) + '</span>';
}

function btFiltros(){
  return {
    p_desde:  document.getElementById('btDesde').value || null,
    p_hasta:  document.getElementById('btHasta').value || null,
    p_quien:  document.getElementById('btQuien').value || null,
    p_tipo:   document.getElementById('btTipo').value  || null,
    p_texto:  document.getElementById('btTexto').value || null,
    p_limite: Number(document.getElementById('btLim').value || 2000)
  };
}

function btCargar(){
  if (BT.cargando) return;
  BT.cargando = true;
  var estado = document.getElementById('btEstado');
  var cuerpo = document.getElementById('btCuerpo');
  document.getElementById('btVer').disabled = true;
  estado.innerHTML = '<div class="db-vacio">Leyendo la bitácora…</div>';
  cuerpo.hidden = true;

  var f = btFiltros();
  var t0 = Date.now();
  Promise.all([
    rpc('api_bitacora', f),
    rpc('api_bitacora_resumen', { p_desde:f.p_desde, p_hasta:f.p_hasta })
  ]).then(function(r){
    BT.filas = r[0].data || [];
    btDibujar(BT.filas, r[1].data || {}, Date.now() - t0, f);
  }).catch(function(e){
    estado.innerHTML = '<div class="db-aviso mal"><b>No se pudo leer la bitácora.</b> ' +
                       btEsc(e && e.message ? e.message : e) + '</div>';
  }).then(function(){
    BT.cargando = false;
    document.getElementById('btVer').disabled = false;
  });
}

function btDibujar(filas, res, ms, f){
  var estado = document.getElementById('btEstado');
  var cuerpo = document.getElementById('btCuerpo');
  var h = [];

  var baj = document.getElementById('btBajada');
  if (baj){
    baj.innerHTML = '<b>' + btNum(res.anotaciones) + '</b> anotaciones en <b>' +
      btNum(res.dias) + '</b> día(s)' +
      (res.primera ? ' &middot; de la primera, ' + btEsc(res.primera) +
                     ', a la última, ' + btEsc(res.ultima) : '') +
      ' &middot; leído en ' + btNum(ms) + ' ms';
  }

  if (!filas.length){
    estado.innerHTML = '<div class="db-vacio">Ninguna anotación entra en esos filtros. ' +
                       'Probá con otro período o sin el texto.</div>';
    cuerpo.hidden = true;
    return;
  }

  /* las cifras, cada una con lo que mide */
  var porTipo = res.por_tipo || [];
  h.push('<div class="vi-kpis">');
  h.push(btKpi('Anotaciones', btNum(res.anotaciones), 'en todo el período elegido'));
  h.push(btKpi('Días con movimiento', btNum(res.dias), 'días distintos con alguna anotación'));
  /* las dos fuentes por separado, y las dos suman el total de arriba: si
     alguna vez no suman, es un defecto aunque cada una este bien */
  h.push(btKpi('De la base', btNum(res.de_la_base), 'carga de Tango, refrescos y controles'));
  h.push(btKpi('Escritas a mano', btNum(res.a_mano), 'lo que pediste, contesté o se tocó'));
  h.push(btKpi('En pantalla', btNum(filas.length),
               filas.length >= f.p_limite
                 ? 'ES EL TOPE que elegiste: puede haber más'
                 : 'son todas las que entran en los filtros'));
  var errores = 0;
  for (var e = 0; e < porTipo.length; e++) if (porTipo[e].tipo === 'error') errores = porTipo[e].cuantas;
  h.push(btKpi('Errores anotados', btNum(errores), 'los míos dicen ERROR REAL'));
  h.push('</div>');

  /* el reparto por tipo, que es la forma mas rapida de ver de que fue el dia */
  if (porTipo.length){
    h.push('<div class="vi-sec"><h2>De qué fue<small> &middot; anotaciones por tipo</small></h2></div>');
    h.push('<div class="bt-tipos">');
    for (var t = 0; t < porTipo.length; t++){
      h.push('<span class="bt-tipo-r">' + btChip(porTipo[t].tipo, '') +
             '<b>' + btNum(porTipo[t].cuantas) + '</b></span>');
    }
    h.push('</div>');
  }

  h.push('<div class="vi-sec"><h2>Renglón por renglón' +
         '<small> &middot; lo más nuevo arriba</small></h2></div>');
  h.push('<p class="vi-nota">Los botones <b>Excel</b> y <b>PDF</b> de arriba de la tabla bajan ' +
         '<b>exactamente esto</b>, con los filtros puestos y sin volver a consultar la base.</p>');
  h.push('<div class="vi-tb-caja"><table><thead><tr>' +
         '<th>Fecha</th><th>Hora</th><th>Quién</th><th>Tipo</th>' +
         '<th>Qué</th><th>Detalle</th><th>Qué se tocó</th>' +
         '</tr></thead><tbody>');
  for (var i = 0; i < filas.length; i++){
    var b = filas[i];
    var mio = b.tipo === 'error' && /ERROR REAL/.test(b.titulo || '');
    h.push('<tr' + (mio ? ' class="bt-fila-mia"' : '') + '>');
    h.push('<td class="cod">' + btEsc(b.fecha) + '</td>');
    h.push('<td class="cod">' + btEsc(b.hora) + '</td>');
    /* `cod` hace que `bajar.js` las trate como columnas que NO se recortan: en el
       PDF son cortas y no tienen por que salir como "C...". Es lo mismo que hace
       con los codigos de articulo. */
    h.push('<td class="cod">' + btEsc(b.quien === 'claude' ? 'Claude' :
                          (b.quien === 'usuario' ? 'el usuario' : 'el sistema')) + '</td>');
    h.push('<td class="cod">' + btChip(b.tipo, b.titulo) + '</td>');
    h.push('<td class="bt-que">' + btEsc(b.titulo) + '</td>');
    h.push('<td class="bt-det">' + btEsc(b.detalle || '') + '</td>');
    h.push('<td class="cod">' + btEsc(b.objeto || '') + '</td>');
    h.push('</tr>');
  }
  h.push('</tbody></table></div>');

  estado.innerHTML = '';
  cuerpo.innerHTML = h.join('');
  cuerpo.hidden = false;
}

function btKpi(rotulo, valor, nota){
  return '<div class="vi-kpi"><div class="vi-kpi-t">' + btEsc(rotulo) + '</div>' +
         '<div class="vi-kpi-v">' + btEsc(valor) + '</div>' +
         (nota ? '<div class="vi-kpi-n">' + btEsc(nota) + '</div>' : '') + '</div>';
}

/* ---------- arranque ----------
   core.js llama calcular() al entrar, y NO lo llama si el modulo esta apagado
   para el usuario: por eso la consulta no corre cuando el portero tapa. */
function calcular(){
  if (BT.armado){ btCargar(); return; }
  BT.armado = true;

  document.getElementById('btDesde').value = btMenosDias(7);
  document.getElementById('btHasta').value = btHoyISO();

  document.getElementById('btVer').addEventListener('click', btCargar);
  document.getElementById('btQuien').addEventListener('change', btCargar);
  document.getElementById('btTipo').addEventListener('change', btCargar);
  document.getElementById('btLim').addEventListener('change', btCargar);
  var espera = null;
  document.getElementById('btTexto').addEventListener('input', function(){
    clearTimeout(espera); espera = setTimeout(btCargar, 300);
  });
  document.getElementById('btHoy').addEventListener('click', function(){
    document.getElementById('btDesde').value = btHoyISO();
    document.getElementById('btHasta').value = btHoyISO();
    btCargar();
  });
  document.getElementById('btSemana').addEventListener('click', function(){
    document.getElementById('btDesde').value = btMenosDias(7);
    document.getElementById('btHasta').value = btHoyISO();
    btCargar();
  });
  document.getElementById('btTodo').addEventListener('click', function(){
    document.getElementById('btDesde').value = '';
    document.getElementById('btHasta').value = '';
    document.getElementById('btQuien').value = '';
    document.getElementById('btTipo').value = '';
    document.getElementById('btTexto').value = '';
    btCargar();
  });

  btCargar();
}
