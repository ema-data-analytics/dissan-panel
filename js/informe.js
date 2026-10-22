
var RT = { datos:null, cargando:false, canales:[], canalElegido:[], limpiarCanal:null };

function rtNum(n, dec){
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-AR', {minimumFractionDigits:dec||0, maximumFractionDigits:dec||0});
}
/* Todo en millones a partir del millón: "$19.459 M" se lee de un vistazo y no
   se confunde, que es más de lo que puede decirse de "$19.458.727.192". */
function rtPlata(n){
  if (n === null || n === undefined) return '—';
  var a = Math.abs(n);
  if (a >= 1e9) return '$' + (n/1e6).toLocaleString('es-AR',{maximumFractionDigits:0}) + ' M';
  if (a >= 1e6) return '$' + (n/1e6).toLocaleString('es-AR',{maximumFractionDigits:1}) + ' M';
  return '$' + rtNum(n);
}

/* ---------- barras horizontales, con el número siempre escrito ---------- */
function rtBarras(filas, opts){
  opts = opts || {};
  var ALTO = 20, SEP = 7, IZQ = opts.izq || 200, DER = opts.der || 92, ARR = 4, ANCHO = 760;
  var util = ANCHO - IZQ - DER;
  var vals = filas.map(function(f){ return Number(f.v) || 0; });
  var bajo = Math.min.apply(null, [0].concat(vals));
  var alto = Math.max.apply(null, [0].concat(vals));
  var rango = (alto - bajo) || 1;
  var x = function(v){ return IZQ + ((v - bajo)/rango) * util; };
  var x0 = x(0);
  var h = ARR + filas.length*(ALTO+SEP);

  var s = '<svg viewBox="0 0 '+ANCHO+' '+h+'" role="img" aria-label="'+esc(opts.titulo||'gráfico')+'">';
  s += '<line class="eje" x1="'+x0.toFixed(1)+'" y1="'+ARR+'" x2="'+x0.toFixed(1)+'" y2="'+(h-SEP+2)+'"/>';
  filas.forEach(function(f, i){
    var y = ARR + i*(ALTO+SEP), v = Number(f.v) || 0;
    var ini = Math.min(x0, x(v)), fin = Math.max(x0, x(v));
    var w = Math.max(2, fin - ini);
    var et = String(f.k == null ? '' : f.k);
    var corto = et.length > 26 ? et.slice(0,25) + '…' : et;
    var clase = f.vacio ? 'vacio' : (v < 0 ? 'neg' : (f.clase || ''));
    s += '<g class="f" data-tip="'+esc(f.tip || (et + ' · ' + (f.txt || rtNum(v,1))))+'">';
    s += '<text class="et" x="'+(IZQ-10)+'" y="'+(y+ALTO/2+4)+'" text-anchor="end">'+esc(corto)+'</text>';
    s += '<rect class="b '+clase+'" x="'+ini.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="'+ALTO+'"/>';
    s += '<text class="val" x="'+(fin+8).toFixed(1)+'" y="'+(y+ALTO/2+4)+'">'+esc(f.txt || rtNum(v,1))+'</text>';
    s += '<rect class="z" x="0" y="'+(y-SEP/2)+'" width="'+ANCHO+'" height="'+(ALTO+SEP)+'"/>';
    s += '</g>';
  });
  return s + '</svg>';
}

function rtEngancharTips(cont){
  var tip = cont.querySelector('.rt-tip');
  if (!tip) return;
  Array.prototype.forEach.call(cont.querySelectorAll('g.f'), function(g){
    g.addEventListener('mouseenter', function(){ tip.textContent = g.getAttribute('data-tip'); tip.style.opacity='1'; });
    g.addEventListener('mousemove', function(e){
      var r = cont.getBoundingClientRect(), m = tip.offsetWidth/2 + 4;
      tip.style.left = Math.min(Math.max(e.clientX - r.left, m), r.width - m) + 'px';
      tip.style.top  = Math.max(tip.offsetHeight + 2, e.clientY - r.top - 8) + 'px';
    });
    g.addEventListener('mouseleave', function(){ tip.style.opacity='0'; });
  });
}

/* ---------- pedir los datos ---------- */
function rtPedir(){
  if (RT.cargando) return;
  RT.cargando = true;
  var estado = document.getElementById('rtEstado');
  var cuerpo = document.getElementById('rtCuerpo');
  document.getElementById('rtAplicar').disabled = true;
  estado.textContent = 'Calculando contra la base...';
  cuerpo.innerHTML = '';

  var tipos = RT.canalElegido.slice();

  var args = [
    document.getElementById('rtDesde').value || null,
    document.getElementById('rtHasta').value || null,
    tipos.length ? tipos : null,
    document.getElementById('rtGanados').checked
  ];

  /* La misma funcion de la base que llamaba Apps Script, con parametros con nombre. */
  rpc('api_tablero_rentabilidad', {
    p_desde:        args[0],
    p_hasta:        args[1],
    p_tipos:        args[2],
    p_solo_ganados: args[3] === true
  }).then(function(res){
      RT.cargando = false;
      document.getElementById('rtAplicar').disabled = false;
      var d = res.data;
      if (!d){
        estado.innerHTML = '<div class="rt-aviso mal">La base no devolvio datos.</div>';
        return;
      }
      RT.datos = d;
      rtDibujar(d, estado, cuerpo);
    })
    .catch(function(err){
      RT.cargando = false;
      document.getElementById('rtAplicar').disabled = false;
      estado.innerHTML = '<div class="rt-aviso mal">No se pudo calcular: ' +
                         esc((err && err.message) ? err.message : 'error') + '</div>';
    });
}

/* ---------- dibujar ---------- */
function rtDibujar(d, estado, cuerpo){
  var r = d.resumen || {};
  if (!r.renglones){
    estado.innerHTML = '<div class="rt-aviso">Con ese filtro no queda ningún renglón. Probá ampliando el período o sacando canales.</div>';
    return;
  }

  // llenar el buscador de canales la primera vez
  if (!RT.canales.length && d.tipos){ RT.canales = d.tipos.slice(); }
  if (!document.getElementById('rtDesde').value && d.desde) document.getElementById('rtDesde').value = d.desde;
  if (!document.getElementById('rtHasta').value && d.hasta) document.getElementById('rtHasta').value = d.hasta;

  var margen = r.facturado ? (100*(r.facturado - r.costo)/r.facturado) : null;

  estado.innerHTML =
    '<div class="rt-tarjetas">' +
      tarj(rtNum(r.renglones), 'renglones cotizados', 'en el período y canal elegidos') +
      tarj(rtNum(r.ganados) + ' <span style="font-size:15px;color:#9FB3C8">(' + rtNum(r.pct_ganado,1) + '%)</span>', 'ganados', 'sobre los cotizados') +
      tarj(rtNum(r.margen_mediano,1) + '%', 'margen mediano', 'la mitad quedó por debajo', 'ok') +
      tarj(rtPlata(r.facturado), 'facturado de lo ganado', margen !== null ? 'margen real ' + rtNum(margen,1) + '% sobre la venta' : '') +
      tarj(rtNum(r.perdida_n), 'ganados a pérdida de verdad', rtPlata(r.perdida_monto) + ' que se pusieron de más', r.perdida_n ? 'mal' : 'ok') +
      tarj(rtNum(r.malcargado_n), 'con el costo mal cargado', rtPlata(r.malcargado_monto) + ' que NO se perdieron', r.malcargado_n ? 'ojo' : 'ok') +
    '</div>';

  var h = '';

  if (r.perdida_n){
    h += '<div class="rt-aviso mal"><b>' + rtNum(r.perdida_n) + ' renglones se ganaron por debajo del costo</b>, ' +
         'y suman ' + rtPlata(r.perdida_monto) + '. La planilla los cuenta como ganados igual que a los demás: ' +
         'ahí el sistema no distingue entre ganar y regalar. Están listados abajo.</div>';
  }

  if (r.malcargado_n){
    h += '<div class="rt-aviso"><b>Ojo con esta distinción, que cambia el número grande.</b><br>' +
         'Hay otros ' + rtNum(r.malcargado_n) + ' renglones que <em>parecen</em> vendidos a pérdida y suman ' +
         rtPlata(r.malcargado_monto) + '. No lo están: tienen un costo cargado al menos <b>3 veces</b> más alto ' +
         'que el costo habitual de ese mismo artículo. No es una decisión de precio, es un error de tipeo en la planilla. ' +
         'Si se contaran juntos, el agujero parecería ' + rtPlata(r.perdida_monto + r.malcargado_monto) +
         ' cuando en realidad es ' + rtPlata(r.perdida_monto) + '. Los ' + rtNum(r.malcargado_n) +
         ' están listados aparte, al final, para ir a corregirlos.</div>';
  }

  // ---- 1. por canal ----
  var pt = d.por_tipo || [];
  if (pt.length){
    h += '<div class="rt-sec">Margen mediano por canal<small>Cada canal con su margen. La barra lleva el número escrito, no hace falta medirla a ojo.</small></div>';
    h += '<div class="rt-graf" id="rtG1">' + rtBarras(pt.map(function(t){
          return { k:t.tipo, v:t.margen, txt: rtNum(t.margen,1)+'%',
                   tip: t.tipo + ' · margen ' + rtNum(t.margen,1) + '% · ' + rtNum(t.n) + ' renglones · gana el ' + rtNum(t.pct_ganado,1) + '%' };
         }), {titulo:'Margen mediano por canal'}) + '<div class="rt-tip"></div></div>';

    h += '<div class="rt-sec">Cuánto se gana en cada canal<small>Porcentaje de renglones cotizados que terminaron ganados.</small></div>';
    h += '<div class="rt-graf" id="rtG2">' + rtBarras(pt.slice().sort(function(a,b){ return b.pct_ganado - a.pct_ganado; }).map(function(t){
          return { k:t.tipo, v:t.pct_ganado, txt: rtNum(t.pct_ganado,1)+'%', clase:'ok',
                   tip: t.tipo + ' · gana ' + rtNum(t.ganados) + ' de ' + rtNum(t.n) + ' · factura ' + rtPlata(t.facturado) };
         }), {titulo:'Porcentaje ganado por canal'}) + '<div class="rt-tip"></div></div>';
  }

  // ---- 2. evolución ----
  var pm = d.por_mes || [];
  var huecos = pm.filter(function(m){ return m.vacio; });
  if (pm.length){
    h += '<div class="rt-sec">Mes a mes<small>' +
         (huecos.length ? 'Los meses en gris no tienen un solo presupuesto cargado. No es que el margen haya sido cero: no hay dato.'
                        : 'Margen mediano de cada mes.') + '</small></div>';
    h += '<div class="rt-graf" id="rtG3">' + rtBarras(pm.map(function(m){
          return { k:m.mes, v: m.vacio ? 0 : m.margen, vacio:m.vacio,
                   txt: m.vacio ? 'sin datos' : rtNum(m.margen,1)+'%',
                   tip: m.vacio ? m.mes + ' · no hay presupuestos cargados'
                                : m.mes + ' · margen ' + rtNum(m.margen,1) + '% · ' + rtNum(m.n) + ' renglones, ' + rtNum(m.ganados) + ' ganados' };
         }), {izq:86, titulo:'Margen mediano mes a mes'}) + '<div class="rt-tip"></div></div>';
    if (huecos.length){
      h += '<div class="rt-aviso"><b>Faltan ' + huecos.length + ' meses en la base</b> (' +
           huecos.map(function(m){ return m.mes; }).join(', ') + '). ' +
           'Cualquier comparación entre años tiene que tenerlo en cuenta: no es una caída, es información que no se cargó.</div>';
    }
  }

  // ---- 3. franjas ----
  var fr = d.franjas || [];
  if (fr.length){
    var tot = fr.reduce(function(a,f){ return a + f.n; }, 0);
    h += '<div class="rt-sec">Cómo se reparten los márgenes<small>' +
         rtNum(r.mult5,1) + '% de los renglones tienen un margen que es múltiplo exacto de 5% — señal de precio puesto a dedo y no calculado contra el mercado.</small></div>';
    h += '<div class="rt-graf" id="rtG4">' + rtBarras(fr.map(function(f){
          return { k:f.franja, v:f.n, clase: f.orden === 1 ? 'neg' : '',
                   txt: rtNum(f.n) + '  (' + rtNum(100*f.n/tot,1) + '%)',
                   tip: f.franja + ' · ' + rtNum(f.n) + ' renglones' };
         }), {izq:120, der:130, titulo:'Renglones por franja de margen'}) + '<div class="rt-tip"></div></div>';
  }

  // ---- 4. tabla por canal ----
  if (pt.length){
    h += '<div class="rt-sec">El detalle, canal por canal</div>';
    h += '<table class="rt-tb"><thead><tr><th>Canal</th>' +
         '<th class="rt-num">Cotizados</th><th class="rt-num">Ganados</th><th class="rt-num">% ganado</th>' +
         '<th class="rt-num">Margen</th><th class="rt-num">A pérdida</th><th class="rt-num">Facturado</th></tr></thead><tbody>';
    pt.forEach(function(t){
      h += '<tr class="' + (t.perdida ? 'alerta' : '') + '">' +
           '<td>' + esc(t.tipo) + '</td>' +
           '<td class="rt-num">' + rtNum(t.n) + '</td>' +
           '<td class="rt-num">' + rtNum(t.ganados) + '</td>' +
           '<td class="rt-num">' + rtNum(t.pct_ganado,1) + '%</td>' +
           '<td class="rt-num">' + rtNum(t.margen,1) + '%</td>' +
           '<td class="rt-num">' + (t.perdida ? '<span style="color:#FF8A8A">' + rtNum(t.perdida) + '</span>' : '0') + '</td>' +
           '<td class="rt-num">' + rtPlata(t.facturado) + '</td></tr>';
    });
    h += '</tbody></table>';
  }

  // ---- 5. los peores ----
  var pe = d.peores || [];
  if (pe.length){
    h += '<div class="rt-sec">Los renglones que de verdad costaron plata<small>Ganados por debajo del costo, con el costo coherente con el del propio artículo. Esto sí es una decisión de precio.</small></div>';
    h += '<table class="rt-tb"><thead><tr><th>Artículo</th><th>Canal</th><th>Cliente</th><th>Fecha</th>' +
         '<th class="rt-num">Margen</th><th class="rt-num">Se puso de más</th></tr></thead><tbody>';
    pe.forEach(function(p){
      h += '<tr class="alerta"><td>' + esc(p.articulo) + '</td>' +
           '<td>' + esc(p.tipo) + '</td><td>' + esc(p.cliente) + '</td><td>' + esc(p.fecha) + '</td>' +
           '<td class="rt-num" style="color:#FF8A8A">' + rtNum(p.margen,1) + '%</td>' +
           '<td class="rt-num">' + rtPlata(p.perdio) + '</td></tr>';
    });
    h += '</tbody></table>';
  }

  // ---- 6. los que hay que ir a corregir ----
  var mc = d.malcargados || [];
  if (mc.length){
    h += '<div class="rt-sec">Para corregir en la planilla<small>Acá el costo está mal escrito. La columna "veces" dice cuánto más alto quedó respecto del costo habitual de ese mismo artículo.</small></div>';
    h += '<table class="rt-tb"><thead><tr><th>Artículo</th><th>Canal</th><th>Cliente</th><th>Fecha</th>' +
         '<th class="rt-num">Costo cargado</th><th class="rt-num">Costo habitual</th>' +
         '<th class="rt-num">Veces</th><th class="rt-num">Falso agujero</th></tr></thead><tbody>';
    mc.forEach(function(p){
      h += '<tr><td>' + esc(p.articulo) + '</td><td>' + esc(p.tipo) + '</td>' +
           '<td>' + esc(p.cliente) + '</td><td>' + esc(p.fecha) + '</td>' +
           '<td class="rt-num">' + rtPlata(p.costo) + '</td>' +
           '<td class="rt-num">' + rtPlata(p.tipico) + '</td>' +
           '<td class="rt-num" style="color:#E8B93B">' + rtNum(p.veces,1) + 'x</td>' +
           '<td class="rt-num">' + rtPlata(p.perdio) + '</td></tr>';
    });
    h += '</tbody></table>';
  }

  h += '<div class="rt-aviso" style="margin-top:26px">Lo que ves acá sale de ' +
       rtNum(r.renglones) + ' renglones de presupuesto leídos de la base en este momento, no de un archivo. ' +
       'Si mañana cambia un dato, esta pantalla cambia sola.</div>';

  cuerpo.innerHTML = h;
  ['rtG1','rtG2','rtG3','rtG4'].forEach(function(id){
    var c = document.getElementById(id); if (c) rtEngancharTips(c);
  });
}

function tarj(n, rot, pie, clase){
  var col = { ok:'#3DD68C', mal:'#FF8A8A', ojo:'#E8B93B' }[clase];
  return '<div class="rt-t"><div class="n"' + (col ? ' style="color:' + col + '"' : '') + '>' + n + '</div>' +
         '<div class="r">' + esc(rot) + '</div>' +
         (pie ? '<div class="p">' + esc(pie) + '</div>' : '') + '</div>';
}

function rtPlano(s){
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/* Buscador de canal: se escribe y la lista se achica sola. Reemplaza al
   desplegable con scroll que estaba hasta el 05/10/2026. */
function rtArmarCanal(){
  var inp   = document.getElementById('rtCanal_i');
  var lista = document.getElementById('rtCanal_l');
  var chips = document.getElementById('rtCanal_c');
  if (!inp || !lista || !chips) return;

  function pintar(){
    var texto   = rtPlano(inp.value.trim());
    var puestos = RT.canalElegido;
    var todas   = RT.canales.filter(function(o){ return puestos.indexOf(o) < 0; });
    var hay     = texto
      ? todas.filter(function(o){ return rtPlano(o).indexOf(texto) >= 0; })
      : todas;

    if (!hay.length){
      lista.innerHTML = '<div class="rt-op nada">' +
        (!RT.canales.length ? 'Todavía no cargaron los canales'
          : todas.length ? 'Ninguno dice \u201C' + esc(inp.value.trim()) + '\u201D'
          : 'Ya están todos elegidos') + '</div>';
      lista.hidden = false;
      return;
    }

    var muestro = hay.slice(0, 60);
    var h = muestro.map(function(o, i){
      var txt = esc(o);
      if (texto){
        var pos = rtPlano(o).indexOf(texto);
        if (pos >= 0){
          txt = esc(o.substring(0, pos)) +
                '<span class="coincide">' + esc(o.substring(pos, pos + texto.length)) + '</span>' +
                esc(o.substring(pos + texto.length));
        }
      }
      return '<div class="rt-op' + (i === 0 ? ' foco' : '') + '" data-v="' + esc(o) + '">' + txt + '</div>';
    }).join('');

    if (hay.length > muestro.length){
      h += '<div class="rt-mas-op">y ' + rtNum(hay.length - muestro.length) +
           ' más \u2014 seguí escribiendo</div>';
    }
    lista.innerHTML = h;
    lista.hidden = false;
  }

  function pintarChips(){
    chips.innerHTML = RT.canalElegido.map(function(v){
      return '<span class="rt-chip">' + esc(v) +
             '<button type="button" data-q="' + esc(v) + '" aria-label="Sacar ' + esc(v) + '">\u00D7</button></span>';
    }).join('');
  }

  function elegir(v){
    if (!v || RT.canalElegido.indexOf(v) >= 0) return;
    RT.canalElegido.push(v);
    inp.value = '';
    pintarChips();
    lista.hidden = true;
  }

  inp.addEventListener('input', pintar);
  inp.addEventListener('focus', pintar);

  inp.addEventListener('keydown', function(ev){
    var ops = lista.querySelectorAll('.rt-op:not(.nada)');
    var i = -1;
    for (var k = 0; k < ops.length; k++) if (ops[k].classList.contains('foco')) i = k;

    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp'){
      ev.preventDefault();
      if (!ops.length) return;
      if (i >= 0) ops[i].classList.remove('foco');
      var j = ev.key === 'ArrowDown' ? (i + 1) % ops.length : (i <= 0 ? ops.length - 1 : i - 1);
      ops[j].classList.add('foco');
      ops[j].scrollIntoView({ block: 'nearest' });
    } else if (ev.key === 'Enter'){
      ev.preventDefault();
      if (i >= 0) elegir(ops[i].getAttribute('data-v'));
      else if (ops.length) elegir(ops[0].getAttribute('data-v'));
    } else if (ev.key === 'Escape'){
      lista.hidden = true;
    } else if (ev.key === 'Backspace' && inp.value === '' && RT.canalElegido.length){
      RT.canalElegido.pop();
      pintarChips();
    }
  });

  lista.addEventListener('mousedown', function(ev){
    var op = ev.target.closest ? ev.target.closest('.rt-op') : null;
    if (op && !op.classList.contains('nada')){
      ev.preventDefault();
      elegir(op.getAttribute('data-v'));
    }
  });

  chips.addEventListener('click', function(ev){
    var b = ev.target.closest ? ev.target.closest('button') : null;
    if (!b) return;
    var v = b.getAttribute('data-q');
    RT.canalElegido = RT.canalElegido.filter(function(x){ return x !== v; });
    pintarChips();
  });

  inp.addEventListener('blur', function(){
    setTimeout(function(){ lista.hidden = true; }, 120);
  });

  RT.limpiarCanal = function(){
    RT.canalElegido = [];
    inp.value = '';
    pintarChips();
    lista.hidden = true;
  };
}

/* core.js llama calcular() al entrar; despues cada Ver pasa por rtPedir(). */
var RT_ARMADO = false;
function calcular(){
  if (RT_ARMADO) { rtPedir(); return; }
  RT_ARMADO = true;
  rtArmarCanal();
  document.getElementById('rtAplicar').onclick = rtPedir;
  document.getElementById('rtLimpiar').onclick = function(){
    document.getElementById('rtDesde').value = RT.datos ? RT.datos.desde : '';
    document.getElementById('rtHasta').value = RT.datos ? RT.datos.hasta : '';
    document.getElementById('rtGanados').checked = false;
    if (RT.limpiarCanal) RT.limpiarCanal();
    rtPedir();
  };
  rtPedir();
}
