
/* =====================================================================
   TABLERO GENERAL — DISSAN 14/10/2026
   ===================================================================== */

var DB = { datos:null, cargando:false, listasCargadas:false, listas:{},
           elegido:{ Cliente:[], Zona:[] } };

/* Las cuatro calidades firmes. 'A. orden de compra del pedido' es el
   metodo que rige: dejarla afuera borra la mitad de lo facturado. */
var DB_CALIDAD = ['A. orden de compra del pedido',
                  'A. lote exacto',
                  'A. peps',
                  'A. ultimo costo reciente'];

var DB_MESES = ['', 'enero','febrero','marzo','abril','mayo','junio','julio',
                'agosto','septiembre','octubre','noviembre','diciembre'];

function dbNum(n){
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString('es-AR');
}
function dbPesos(n){
  if (n === null || n === undefined || n === '') return '—';
  return '$' + Math.round(Number(n)).toLocaleString('es-AR');
}
function dbPrecio(n){
  if (n === null || n === undefined || n === '') return '—';
  return '$' + Number(n).toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2});
}
/* Las dos tablas de abajo entran en media pantalla y los importes grandes
   quedaban CORTADOS por el ancho: $2.638.992,00 se leia "$2.638.99" — mil
   veces menos y sin ninguna senal de que faltaban digitos. Por eso de un
   millon para arriba van en millones, con el monto exacto en el tooltip. */
function dbCelPrecio(n){
  if (n === null || n === undefined || n === '')
    return '<td class="db-num">—</td>';
  var v = Number(n), exacto = dbPrecio(v);
  var corto = Math.abs(v) >= 1e6
    ? '$' + (v/1e6).toLocaleString('es-AR', {maximumFractionDigits:2}) + ' M'
    : exacto;
  return '<td class="db-num" title="' + dbEsc(exacto) + '">' + dbEsc(corto) + '</td>';
}

function dbMillones(n){
  var v = Number(n || 0);
  if (Math.abs(v) >= 1e6) return '$' + (v/1e6).toLocaleString('es-AR', {maximumFractionDigits:1}) + ' M';
  return dbPesos(v);
}
function dbDec(n){
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString('es-AR', {minimumFractionDigits:1, maximumFractionDigits:1});
}
function dbEsc(s){
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
/* el rango de tildes se arma con codigos y no con un escape ni con los
   caracteres combinantes escritos: en el fuente son invisibles y cualquier
   copiado los rompe sin que se vea. */
var RX_TILDES = new RegExp('[' + String.fromCharCode(768) + '-' +
                                 String.fromCharCode(879) + ']', 'g');
function dbPlano(s){
  return String(s === null || s === undefined ? '' : s)
    .toLowerCase().normalize('NFD').replace(RX_TILDES,'');
}
function dbFecha(iso){
  if (!iso) return '';
  var p = String(iso).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(iso);
}

/* ---------- buscador (clientes y zonas) ---------- */
function dbArmarPicker(nombre, clave){
  var inp   = document.getElementById('db' + nombre + '_i');
  var lista = document.getElementById('db' + nombre + '_l');
  var chips = document.getElementById('db' + nombre + '_c');
  var caja  = inp.closest('.db-busca');
  var foco  = -1;

  function opciones(){
    var L = DB.listas[clave] || [];
    return L.filter(function(x){ return DB.elegido[nombre].indexOf(x) < 0; });
  }
  function pintar(){
    var q = dbPlano(inp.value);
    var todas = opciones();
    var hay = q ? todas.filter(function(x){ return dbPlano(x).indexOf(q) >= 0; }) : todas;
    var ver = hay.slice(0, 40);
    foco = -1;
    if (!todas.length){
      lista.innerHTML = '<div class="db-op nada">Todavía no se cargaron las opciones. ' +
                        'Apretá Ver una vez.</div>';
    } else if (!ver.length){
      lista.innerHTML = '<div class="db-op nada">Nada coincide con «' + dbEsc(inp.value) + '».</div>';
    } else {
      var h = [];
      for (var i = 0; i < ver.length; i++){
        var t = dbEsc(ver[i]);
        if (q){
          var p = dbPlano(ver[i]).indexOf(q);
          if (p >= 0){
            t = dbEsc(ver[i].substring(0,p)) + '<span class="coincide">' +
                dbEsc(ver[i].substring(p, p+q.length)) + '</span>' +
                dbEsc(ver[i].substring(p+q.length));
          }
        }
        h.push('<div class="db-op" data-v="' + dbEsc(ver[i]) + '">' + t + '</div>');
      }
      if (hay.length > ver.length){
        h.push('<div class="db-mas-op">y ' + (hay.length - ver.length) +
               ' más. Escribí para achicar la lista.</div>');
      }
      lista.innerHTML = h.join('');
    }
    lista.hidden = false;
  }
  function pintarChips(){
    var el = DB.elegido[nombre], h = [];
    for (var i = 0; i < el.length; i++){
      h.push('<span class="db-chip"><span title="' + dbEsc(el[i]) + '">' + dbEsc(el[i]) +
             '</span><button type="button" data-q="' + i + '" title="Sacar">&times;</button></span>');
    }
    chips.innerHTML = h.join('');
  }
  function elegir(v){
    if (!v) return;
    if (DB.elegido[nombre].indexOf(v) < 0) DB.elegido[nombre].push(v);
    inp.value = ''; pintarChips(); lista.hidden = true;
  }

  inp.addEventListener('focus', pintar);
  inp.addEventListener('input', pintar);
  inp.addEventListener('keydown', function(ev){
    var ops = lista.querySelectorAll('.db-op[data-v]');
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp'){
      ev.preventDefault();
      if (!ops.length) return;
      if (foco >= 0) ops[foco].classList.remove('foco');
      foco = ev.key === 'ArrowDown' ? (foco + 1) % ops.length
                                    : (foco <= 0 ? ops.length - 1 : foco - 1);
      ops[foco].classList.add('foco');
      ops[foco].scrollIntoView({block:'nearest'});
    } else if (ev.key === 'Enter'){
      ev.preventDefault();
      if (foco >= 0 && ops[foco]) elegir(ops[foco].getAttribute('data-v'));
      else if (ops.length === 1)  elegir(ops[0].getAttribute('data-v'));
      else if (String(inp.value).trim()) elegir(String(inp.value).trim());
    } else if (ev.key === 'Escape'){ lista.hidden = true; }
  });
  lista.addEventListener('mousedown', function(ev){
    var op = ev.target.closest('.db-op[data-v]');
    if (op){ ev.preventDefault(); elegir(op.getAttribute('data-v')); }
  });
  chips.addEventListener('click', function(ev){
    var b = ev.target.closest('button[data-q]');
    if (!b) return;
    DB.elegido[nombre].splice(Number(b.getAttribute('data-q')), 1);
    pintarChips();
  });
  document.addEventListener('mousedown', function(ev){
    if (caja && !caja.contains(ev.target)) lista.hidden = true;
  });

  DB['tomarEscrito' + nombre] = function(){
    var t = String(inp.value || '').trim();
    if (t && DB.elegido[nombre].indexOf(t) < 0) DB.elegido[nombre].push(t);
    inp.value = ''; pintarChips(); lista.hidden = true;
  };
  DB['limpiar' + nombre] = function(){
    DB.elegido[nombre] = []; inp.value = ''; pintarChips(); lista.hidden = true;
  };
}

/* ---------- el periodo que eligio ---------- */
function dbPeriodo(){
  var a = document.getElementById('dbAnio').value;
  var m = document.getElementById('dbMes').value;
  if (!a) return { desde:null, hasta:null, etiqueta:'todo el período' };
  a = Number(a);
  if (!m) return { desde: a + '-01-01', hasta: a + '-12-31', etiqueta: 'el año ' + a };
  m = Number(m);
  var ult = new Date(a, m, 0).getDate();
  var p = function(n){ return (n < 10 ? '0' : '') + n; };
  return { desde: a + '-' + p(m) + '-01', hasta: a + '-' + p(m) + '-' + p(ult),
           etiqueta: DB_MESES[m] + ' de ' + a };
}

function dbFiltros(){
  var per = dbPeriodo();
  return {
    desde: per.desde, hasta: per.hasta,
    clientes: DB.elegido.Cliente.slice(),
    zonas:    DB.elegido.Zona.slice(),
    calidad:  DB_CALIDAD.slice(),
    soloProductos: true,
    soloBajoCosto: false
  };
}

function dbCargar(){
  if (DB.cargando) return;
  if (DB.tomarEscritoCliente) DB.tomarEscritoCliente();
  if (DB.tomarEscritoZona)    DB.tomarEscritoZona();

  DB.cargando = true;
  var estado = document.getElementById('dbEstado');
  var cuerpo = document.getElementById('dbCuerpo');
  document.getElementById('dbAplicar').disabled = true;
  estado.innerHTML = '<div class="db-vacio">Calculando contra la base…</div>';
  cuerpo.hidden = true;

  /* La misma funcion que llamaba Apps Script, con los mismos parametros con nombre.
     Aca va directo por PostgREST con el JWT del usuario. */
  var f = dbFiltros();
  rpc('api_margen_tablero_v3', {
    p_desde:           f.desde || null,
    p_hasta:           f.hasta || null,
    p_clientes:        f.clientes.length ? f.clientes : null,
    p_solo_bajo_costo: f.soloBajoCosto === true,
    p_texto:           null,
    p_articulos:       null,
    p_vendedores:      null,
    p_zonas:           f.zonas.length ? f.zonas : null,
    p_provincias:      null,
    p_localidades:     null,
    p_talonarios:      null,
    p_calidad:         f.calidad,
    p_margen_min:      null,
    p_margen_max:      null,
    p_venta_min:       null,
    p_solo_productos:  f.soloProductos !== false,
    p_solo_con_prueba: false
  }).then(function(res){
      DB.cargando = false;
      document.getElementById('dbAplicar').disabled = false;
      var d = res.data;
      if (!d){
        estado.innerHTML = '<div class="db-aviso mal">La base no devolvio datos.</div>';
        return;
      }
      DB.datos = d;
      if (!DB.listasCargadas && d.listas){
        DB.listas = d.listas; DB.listasCargadas = true;
      }
      dbDibujar(d, estado, cuerpo);
    })
    .catch(function(err){
      DB.cargando = false;
      document.getElementById('dbAplicar').disabled = false;
      estado.innerHTML = '<div class="db-aviso mal">No se pudo calcular: ' +
                         dbEsc((err && err.message) ? err.message : 'error') + '</div>';
    });
}

/* ---------- dibujar ---------- */
function dbDibujar(d, estado, cuerpo){
  d = d || {};
  var r = d.resumen || {};
  var h = [];
  var per = dbPeriodo();

  /* encabezado con los valores literales */
  var p = ['<span class="f">' + dbEsc(per.etiqueta) + '</span>'];
  if (DB.elegido.Cliente.length){
    p.push('cliente' + (DB.elegido.Cliente.length > 1 ? 's' : '') + ' <span class="f">' +
           dbEsc(DB.elegido.Cliente.slice(0,3).join(', ')) +
           (DB.elegido.Cliente.length > 3 ? ' y ' + (DB.elegido.Cliente.length-3) + ' más' : '') +
           '</span>');
  }
  if (DB.elegido.Zona.length){
    p.push('zona' + (DB.elegido.Zona.length > 1 ? 's' : '') + ' <span class="f">' +
           dbEsc(DB.elegido.Zona.join(', ')) + '</span>');
  }
  h.push('<div class="db-titulo"><span class="q">Tablero general — ' + dbNum(r.medidos) +
         ' renglones medidos</span>' + p.join(' · ') + '</div>');

  var act = d.actualizado || {};
  if (act.cuando){
    var viejo = Number(act.horas) >= 30;
    h.push('<div class="db-aviso' + (viejo ? '' : ' ok') + '">Datos al <b>' +
           dbEsc(act.cuando) + '</b>' +
           (viejo ? ' — <b>hace ' + dbNum(act.horas) + ' horas</b>. El refresco de la madrugada ' +
                    'no corrió: puede faltar lo de hoy.'
                  : '. Se refresca solo todas las mañanas.') + '</div>');
  }

  /* tarjetas */
  h.push('<div class="db-tarjetas">');
  h.push(dbTarjeta(dbDec(r.margen_pct) + '%', 'margen sobre el precio',
                   'ganancia ÷ facturado', 'ok'));
  if (r.margen_sobre_costo !== null && r.margen_sobre_costo !== undefined){
    h.push(dbTarjeta(dbDec(r.margen_sobre_costo) + '%', 'margen sobre el costo',
                     'así lo calcula DISSAN', 'ok'));
  }
  h.push(dbTarjeta(dbMillones(r.facturado), 'facturado medido',
                   dbPesos(r.facturado) + ' · ' + dbNum(r.medidos) + ' de ' +
                   dbNum(r.renglones_totales) + ' renglones', ''));
  h.push(dbTarjeta(dbMillones(r.margen_bruto), 'ganancia bruta',
                   dbPesos(r.margen_bruto) + ' · costo ' + dbPesos(r.costo), 'ok'));
  h.push(dbTarjeta(dbDec(r.cobertura_pct) + '%', 'cobertura',
                   'lo que se puede medir', Number(r.cobertura_pct) < 60 ? 'ojo' : 'ok'));
  h.push(dbTarjeta(dbNum(r.bajo_costo_n), 'renglones bajo el costo',
                   dbPesos(r.perdida) + ' perdidos ahí',
                   Number(r.bajo_costo_n) > 0 ? 'mal' : 'ok'));
  if (Number(r.cuarentena_n || 0) > 0){
    h.push(dbTarjeta(dbNum(r.cuarentena_n), 'apartados en cuarentena',
                     dbPesos(r.cuarentena_monto) + ' — no sumados', 'ojo'));
  }
  h.push('</div>');

  h.push('<div class="db-aviso ok"><b>Cobertura ' + dbDec(r.cobertura_pct) + '%.</b> ' +
         'De los ' + dbNum(r.renglones_totales) + ' renglones del período se miden ' +
         dbNum(r.medidos) + '; el resto no tiene costo confiable y queda afuera. ' +
         '<b>No dice que el resto esté bien: dice que no se puede saber.</b> ' +
         'La base no tiene stock inicial —se vendió más de lo que se compró según lo migrado— ' +
         'y la consignación no tiene orden de compra, así que nunca va a llegar al 100%.</div>');

  /* margen mes a mes */
  var pm = (d.por_mes || []).filter(function(m){ return Number(m.n || 0) > 0; });
  if (pm.length > 1){
    h.push('<div class="db-sec">Margen mes a mes' +
           '<small>Porcentaje sobre lo facturado de cada mes, medido contra el costo real.' +
           '</small></div>');
    h.push(dbGrafBarras(pm, 'mes', 'margen', function(f){
      return f.mes + ' — margen ' + dbDec(f.margen) + '% en ' + dbNum(f.n) + ' renglones';
    }, function(f){ return dbDec(f.margen) + '%'; }, 'v', 58));
  }

  /* los diez que mas ganaron y los diez que mas perdieron */
  var me = (d.mejores || []).slice(0, 10);
  var pe = (d.peores  || []).slice(0, 10);

  if (me.length || pe.length){
    h.push('<div class="db-aviso"><b>Cómo leer estas dos tablas.</b> ' +
           '«Precio venta» y «Costo» son <b>por unidad</b>; «Ganó» y «Perdió» son el total ' +
           '<b>del renglón</b> — cantidad × (precio − costo). Por eso un renglón puede ganar ' +
           '$70 millones con un precio unitario de $4,9 millones: son 30 unidades.</div>');
  }

  h.push('<div class="db-dos">');

  if (me.length){
    h.push('<div><div class="db-sec">Los diez que más ganaron' +
           '<small>Con qué se gana de verdad, y con quién.</small></div>');
    h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>' +
           '<th>Artículo</th><th>Descripción</th><th>Cliente</th><th>Fecha</th>' +
           '<th class="db-num">Cant.</th><th class="db-num">Precio venta<br>(x unidad)</th>' +
           '<th class="db-num">Costo<br>(x unidad)</th><th class="db-num">Margen</th>' +
           '<th class="db-num">Ganó<br>(el renglón)</th></tr></thead><tbody>');
    for (var k = 0; k < me.length; k++){
      h.push('<tr class="bien"><td class="db-cod">' + dbEsc(me[k].articulo) + '</td>' +
             '<td class="db-desc" title="' + dbEsc(me[k].detalle) + '">' +
                dbEsc(me[k].detalle) + '</td>' +
             '<td class="db-desc" title="' + dbEsc(me[k].cliente) + '">' +
                dbEsc(me[k].cliente) + '</td>' +
             '<td>' + dbEsc(me[k].fecha) + '</td>' +
             '<td class="db-num">' + dbNum(me[k].cantidad) + '</td>' +
             dbCelPrecio(me[k].vendio) +
             dbCelPrecio(me[k].costo) +
             '<td class="db-num">' + dbDec(me[k].margen) + '%</td>' +
             dbCelPrecio(me[k].gano) + '</tr>');
    }
    h.push('</tbody></table></div></div>');
  }

  if (pe.length){
    h.push('<div><div class="db-sec">Los diez que más perdieron' +
           '<small>Renglones vendidos por debajo del costo real.</small></div>');
    h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>' +
           '<th>Artículo</th><th>Descripción</th><th>Cliente</th><th>Fecha</th>' +
           '<th class="db-num">Cant.</th><th class="db-num">Precio venta<br>(x unidad)</th>' +
           '<th class="db-num">Costo<br>(x unidad)</th>' +
           '<th class="db-num">Perdió<br>(el renglón)</th></tr></thead><tbody>');
    for (var j = 0; j < pe.length; j++){
      h.push('<tr class="alerta"><td class="db-cod">' + dbEsc(pe[j].articulo) + '</td>' +
             '<td class="db-desc" title="' + dbEsc(pe[j].detalle) + '">' +
                dbEsc(pe[j].detalle) + '</td>' +
             '<td class="db-desc" title="' + dbEsc(pe[j].cliente) + '">' +
                dbEsc(pe[j].cliente) + '</td>' +
             '<td>' + dbEsc(pe[j].fecha) + '</td>' +
             '<td class="db-num">' + dbNum(pe[j].cantidad) + '</td>' +
             dbCelPrecio(pe[j].vendio) +
             dbCelPrecio(pe[j].costo) +
             dbCelPrecio(pe[j].perdio) + '</tr>');
    }
    h.push('</tbody></table></div></div>');
  }
  h.push('</div>');

  /* quien compra por debajo del costo */
  var pc = d.por_cliente || [];
  if (pc.length){
    h.push('<div class="db-sec">Quién compra por debajo del costo' +
           '<small>Los ' + pc.length + ' primeros. El porcentaje es sobre el total de la ' +
           'pérdida medida en este período.</small></div>');
    h.push(dbGrafBarras(pc.slice(0,10), 'cliente', 'perdida', function(f){
      return f.cliente + ' — ' + dbPesos(f.perdida) + ' en ' + dbNum(f.ventas) + ' ventas';
    }, function(f){ return dbMillones(f.perdida); }, 'r', 155, 24));
    h.push('<div class="db-tb-caja" style="margin-top:9px"><table class="db-tb"><thead><tr>' +
           '<th>Cliente</th><th class="db-num">Ventas bajo costo</th>' +
           '<th class="db-num">Pérdida</th><th class="db-num">%</th>' +
           '<th class="db-num">Acumulado</th></tr></thead><tbody>');
    var acum = 0;
    for (var i = 0; i < pc.length; i++){
      acum += Number(pc[i].pct || 0);
      h.push('<tr><td>' + dbEsc(pc[i].cliente) + '</td>' +
             '<td class="db-num">' + dbNum(pc[i].ventas) + '</td>' +
             '<td class="db-num">' + dbPesos(pc[i].perdida) + '</td>' +
             '<td class="db-num">' + dbDec(pc[i].pct) + '%</td>' +
             '<td class="db-num">' + dbDec(acum) + '%</td></tr>');
    }
    h.push('</tbody></table></div>');
  }

  /* de donde sale el costo */
  var cal = d.calidad || [];
  if (cal.length){
    h.push('<div class="db-sec">De dónde sale el costo' +
           '<small>Sólo se suman las filas que empiezan con A. Las B usan un costo de más de ' +
           '180 días y en pesos nominales eso infla el margen. Las C no tienen ninguna compra ' +
           'con la que medirse.</small></div>');
    h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>' +
           '<th>Calidad del costo</th><th class="db-num">Renglones</th>' +
           '<th class="db-num">Venta</th><th class="db-num">% de la venta</th>' +
           '<th class="db-num">Margen</th></tr></thead><tbody>');
    for (var ci = 0; ci < cal.length; ci++){
      var c = cal[ci];
      var fuera = String(c.calidad || '').charAt(0) !== 'A';
      h.push('<tr' + (fuera ? ' class="aparte"' : '') + '><td>' + dbEsc(c.calidad) + '</td>' +
             '<td class="db-num">' + dbNum(c.renglones) + '</td>' +
             '<td class="db-num">' + dbPesos(c.venta) + '</td>' +
             '<td class="db-num">' + dbDec(c.pct_venta) + '%</td>' +
             '<td class="db-num">' + (c.margen_pct === null ? '—' : dbDec(c.margen_pct) + '%') +
             '</td></tr>');
    }
    h.push('</tbody></table></div>');
  }

  if (!me.length && !pe.length){
    h.push('<div class="db-vacio">Ningún renglón entra en esos filtros. Probá con otro ' +
           'período o sin el cliente.</div>');
  }

  estado.innerHTML = '';
  cuerpo.innerHTML = h.join('');
  cuerpo.hidden = false;
  dbConectarTips(cuerpo);
}

function dbTarjeta(n, r, p, clase){
  return '<div class="db-t"><div class="n ' + (clase||'') + '">' + n + '</div>' +
         '<div class="r">' + dbEsc(r) + '</div>' +
         (p ? '<div class="p">' + dbEsc(p) + '</div>' : '') + '</div>';
}

/* barras finas, pasteles, con el numero escrito al lado */
function dbGrafBarras(filas, campoEt, campoVal, fnTip, fnTexto, tono, anchoEt, altoFila){
  if (!filas || !filas.length) return '';
  var max = 0;
  for (var i = 0; i < filas.length; i++) max = Math.max(max, Math.abs(Number(filas[i][campoVal] || 0)));
  if (max <= 0) max = 1;

  var aEt = anchoEt || 90, aBarra = 370, alto = altoFila || 19, pad = 7, aNum = 76;
  var total = aEt + aBarra + aNum;
  var h = alto * filas.length + pad * 2;
  var s = ['<div class="db-graf"><div class="db-tip"></div>',
           '<svg viewBox="0 0 ' + total + ' ' + h + '" role="img" aria-label="gráfico de barras">'];

  for (var j = 0; j < filas.length; j++){
    var f = filas[j];
    var v = Number(f[campoVal] || 0);
    var y = pad + j * alto;
    var w = Math.max(1, Math.round(aBarra * Math.abs(v) / max));
    var et = String(f[campoEt] || '');
    if (et.length > 24) et = et.substring(0, 23) + '…';
    s.push('<g class="f" data-tip="' + dbEsc(fnTip(f)) + '">');
    s.push('<text class="et" x="0" y="' + (y + alto/2 + 3) + '">' + dbEsc(et) + '</text>');
    s.push('<rect class="b ' + (tono || '') + '" x="' + aEt + '" y="' + (y + 3) +
           '" width="' + w + '" height="' + (alto - 8) + '"></rect>');
    s.push('<text class="val" x="' + (aEt + w + 6) + '" y="' + (y + alto/2 + 3) + '">' +
           dbEsc(fnTexto(f)) + '</text>');
    s.push('<rect class="z" x="0" y="' + y + '" width="' + total + '" height="' + alto + '"></rect>');
    s.push('</g>');
  }
  s.push('<line class="eje" x1="' + (aEt - 1) + '" y1="' + (pad - 3) +
         '" x2="' + (aEt - 1) + '" y2="' + (h - pad + 3) + '"></line>');
  s.push('</svg></div>');
  return s.join('');
}

function dbConectarTips(raiz){
  var graficos = raiz.querySelectorAll('.db-graf');
  for (var g = 0; g < graficos.length; g++){
    (function(grafico){
      var tip = grafico.querySelector('.db-tip');
      if (!tip) return;
      var grupos = grafico.querySelectorAll('g.f');
      for (var i = 0; i < grupos.length; i++){
        (function(gr){
          gr.addEventListener('mousemove', function(ev){
            var caja = grafico.getBoundingClientRect();
            tip.textContent = gr.getAttribute('data-tip') || '';
            tip.style.left = (ev.clientX - caja.left) + 'px';
            tip.style.top  = (ev.clientY - caja.top - 8) + 'px';
            tip.style.opacity = 1;
          });
          gr.addEventListener('mouseleave', function(){ tip.style.opacity = 0; });
        })(grupos[i]);
      }
    })(graficos[g]);
  }
}

/* ---------- arranque ----------
   core.js llama calcular() al entrar: la primera vez arma los buscadores y engancha los
   controles; despues cada Ver pasa por dbCargar(), igual que en el panel de siempre. */
var DB_ARMADO = false;
function calcular(){
  if (DB_ARMADO) { dbCargar(); return; }
  DB_ARMADO = true;
  /* los años que hay en la base: 2022 es el primero migrado */
  var sel = document.getElementById('dbAnio');
  var hoy = new Date();
  var h = ['<option value="">todos los años</option>'];
  for (var a = hoy.getFullYear(); a >= 2022; a--){
    h.push('<option value="' + a + '">' + a + '</option>');
  }
  sel.innerHTML = h.join('');
  sel.value = String(hoy.getFullYear());

  dbArmarPicker('Cliente', 'clientes');
  dbArmarPicker('Zona', 'zonas');

  document.getElementById('dbAplicar').addEventListener('click', dbCargar);
  document.getElementById('dbAnio').addEventListener('change', dbCargar);
  document.getElementById('dbMes').addEventListener('change', dbCargar);
  document.getElementById('dbLimpiar').addEventListener('click', function(){
    document.getElementById('dbAnio').value = '';
    document.getElementById('dbMes').value  = '';
    if (DB.limpiarCliente) DB.limpiarCliente();
    if (DB.limpiarZona)    DB.limpiarZona();
    dbCargar();
  });

  dbCargar();
}
