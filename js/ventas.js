
/* =====================================================================
   VENTAS COMPARATIVO — DISSAN 28/10/2026
   =====================================================================
   Lo que se facturo, de 2024 a hoy, con resumen por cliente, por
   provincia y por proveedor, y el detalle renglon por renglon.

   ESTA PANTALLA NO MIDE MARGEN NI COSTO. Mide facturacion. Es a
   proposito: el margen vive en el Tablero general y en Margen de
   ventas reales, que costean con la orden de compra del pedido. Las
   cinco api_ventas_* viejas quedaron paradas el 21/10 porque filtran
   por "la compra mas cercana en fecha", que se midio invalido el
   07/10, y para 2026 daban $6.269.298.225 contra $3.613.837.332.
   Esta pantalla no las usa: usa api_ventas_fact_*, que no tocan costo.

   CONTROLADA CONTRA LA CONTABILIDAD DE DISSAN el 28/10, cuentas 411001
   Ventas Gravadas y 411002 Ventas Exentas: de 10.001 facturas emitidas
   desde el 01/01/2024, 9.258 estan en los dos lados y 9.024 coinciden
   AL PESO; 9.254 de 9.258 dentro del 1%. Y las dos partes cierran el
   total exacto:
     15.009.073.398,47 (lo que ellos contabilizaron)
   +  3.184.022.830,59 (743 facturas que emitieron y NO asentaron)
   = 18.193.096.229,06 = el total de esta pantalla.
   El boton "El control" de abajo lo vuelve a correr en vivo.

   LA PROVINCIA SALE DEL PREFIJO DEL CODIGO DE CLIENTE (MZ, SJ, SL),
   que es la regla de DISSAN, y esta medida: coincide con el campo zona
   en 19.872 de 19.915 renglones (99,78%). El campo provincia del
   maestro de clientes NO es la provincia de venta, es el domicilio
   fiscal — SWISS MEDICAL figura en Capital y SANCOR en Santa Fe con
   codigo MZ — y difiere en 37 clientes por $1.678.489.232. Se muestra
   aparte y rotulado, no como error.
   ===================================================================== */

var VT = { cargando:false, opciones:null, armado:false,
           elegido:{ Cliente:[], Proveedor:[] },
           mapa:{ Cliente:{}, Proveedor:{} } };

var VT_MESES = ['', 'ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

/* ---------- numeros ---------- */
function vtNum(n){
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString('es-AR');
}
/* El signo va ANTES del peso: "$-5.555.740,51" se lee como un importe raro y
   "-$5.555.740,51" se lee como lo que es. */
function vtSigno(v, cuerpo){ return (Number(v) < 0 ? '-$' : '$') + cuerpo; }
function vtPesos(n){
  if (n === null || n === undefined || n === '') return '—';
  return vtSigno(n, Math.abs(Math.round(Number(n))).toLocaleString('es-AR'));
}
function vtExacto(n){
  if (n === null || n === undefined || n === '') return '—';
  return vtSigno(n, Math.abs(Number(n)).toLocaleString('es-AR',
                  {minimumFractionDigits:2, maximumFractionDigits:2}));
}
function vtMillones(n){
  var v = Number(n || 0);
  if (Math.abs(v) >= 1e6)
    return vtSigno(v, (Math.abs(v)/1e6).toLocaleString('es-AR', {maximumFractionDigits:1}) + ' M');
  return vtPesos(v);
}
function vtDec(n){
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString('es-AR', {minimumFractionDigits:1, maximumFractionDigits:1});
}
/* Un importe cortado por el ancho se lee como OTRO numero: $3.549.541.334 se
   mostraba $3.549.541.33. De un millon para arriba va en millones, el exacto
   en el title, y SIEMPRE el crudo en data-v para que la descarga se lleve el
   numero y no el texto abreviado. */
function vtCelPesos(n, clase){
  if (n === null || n === undefined || n === '')
    return '<td class="db-num' + (clase ? ' ' + clase : '') + '"></td>';
  var v = Number(n);
  var corto = Math.abs(v) >= 1e6
    ? '$' + (v/1e6).toLocaleString('es-AR', {maximumFractionDigits:2}) + ' M'
    : vtExacto(v);
  return '<td class="db-num' + (clase ? ' ' + clase : '') + '" data-v="' + v +
         '" title="' + vtEsc(vtExacto(v)) + '">' + vtEsc(corto) + '</td>';
}
function vtCelNum(n, clase){
  if (n === null || n === undefined || n === '')
    return '<td class="db-num' + (clase ? ' ' + clase : '') + '"></td>';
  return '<td class="db-num' + (clase ? ' ' + clase : '') + '" data-v="' + Number(n) + '">' +
         vtNum(n) + '</td>';
}
/* La variacion entre dos anios. Sin base no hay porcentaje: celda vacia, no un
   cero, que seria una cifra inventada. */
function vtCelVar(actual, anterior){
  var a = Number(anterior || 0), b = Number(actual || 0);
  if (!a) return '<td class="db-num" title="sin facturacion el año anterior"></td>';
  var v = (b - a) / Math.abs(a) * 100;
  var cl = v < 0 ? 'mal' : '';
  return '<td class="db-num" data-v="' + v.toFixed(2) + '"><span class="' + cl + '">' +
         (v > 0 ? '+' : '') + vtDec(v) + '%</span></td>';
}
function vtEsc(s){
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
var VT_TILDES = new RegExp('[' + String.fromCharCode(768) + '-' +
                                 String.fromCharCode(879) + ']', 'g');
function vtPlano(s){
  return String(s === null || s === undefined ? '' : s)
    .toLowerCase().normalize('NFD').replace(VT_TILDES,'');
}
function vtFecha(iso){
  if (!iso) return '';
  var p = String(iso).substring(0,10).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(iso);
}
/* SIN data-v a proposito: con data-v, bajar.js se lleva el texto y la columna
   baja como TEXTO, que en Excel no se ordena ni se filtra como fecha. Sin el,
   bajar.js parsea dd/mm/yyyy y escribe una fecha de verdad. Controlado
   abriendo el archivo bajado. */
function vtCelFecha(iso){
  return '<td>' + vtEsc(vtFecha(iso)) + '</td>';
}

/* ---------- buscadores de cliente y proveedor ----------
   Mas de 20 opciones se escriben, no se scrollean. El rotulo que se ve es
   "codigo — nombre" y lo que viaja a la base es el CODIGO: un campo que
   muestra un codigo no es un campo, y un campo que manda un nombre no filtra. */
function vtArmarPicker(nombre){
  var inp   = document.getElementById('vt' + nombre + '_i');
  var lista = document.getElementById('vt' + nombre + '_l');
  var chips = document.getElementById('vt' + nombre + '_c');
  var caja  = inp.closest('.db-busca');
  var foco  = -1;

  function todas(){
    var m = VT.mapa[nombre], out = [];
    for (var k in m){ if (VT.elegido[nombre].indexOf(m[k]) < 0) out.push(k); }
    return out;
  }
  function pintar(){
    var q = vtPlano(inp.value);
    var L = todas();
    var hay = q ? L.filter(function(x){ return vtPlano(x).indexOf(q) >= 0; }) : L;
    var ver = hay.slice(0, 40);
    foco = -1;
    if (!L.length){
      lista.innerHTML = '<div class="db-op nada">Todavía no se cargaron las opciones. ' +
                        'Apretá Ver una vez.</div>';
    } else if (!ver.length){
      lista.innerHTML = '<div class="db-op nada">Nada coincide con «' + vtEsc(inp.value) + '».</div>';
    } else {
      var h = [];
      for (var i = 0; i < ver.length; i++){
        var t = vtEsc(ver[i]);
        if (q){
          var p = vtPlano(ver[i]).indexOf(q);
          if (p >= 0){
            t = vtEsc(ver[i].substring(0,p)) + '<span class="coincide">' +
                vtEsc(ver[i].substring(p, p+q.length)) + '</span>' +
                vtEsc(ver[i].substring(p+q.length));
          }
        }
        h.push('<div class="db-op" data-v="' + vtEsc(ver[i]) + '">' + t + '</div>');
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
    var el = VT.elegido[nombre], m = VT.mapa[nombre], h = [];
    for (var i = 0; i < el.length; i++){
      var rot = el[i];
      for (var k in m){ if (m[k] === el[i]){ rot = k; break; } }
      h.push('<span class="db-chip"><span title="' + vtEsc(rot) + '">' + vtEsc(rot) +
             '</span><button type="button" data-q="' + i + '" title="Sacar">&times;</button></span>');
    }
    chips.innerHTML = h.join('');
  }
  function elegir(rotulo){
    if (!rotulo) return;
    var cod = VT.mapa[nombre][rotulo];
    if (!cod) return;                       /* no se inventa un codigo que no existe */
    if (VT.elegido[nombre].indexOf(cod) < 0) VT.elegido[nombre].push(cod);
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
      else if (ops.length >= 1)   elegir(ops[0].getAttribute('data-v'));
    } else if (ev.key === 'Escape'){ lista.hidden = true; }
  });
  lista.addEventListener('mousedown', function(ev){
    var op = ev.target.closest('.db-op[data-v]');
    if (op){ ev.preventDefault(); elegir(op.getAttribute('data-v')); }
  });
  chips.addEventListener('click', function(ev){
    var b = ev.target.closest('button[data-q]');
    if (!b) return;
    VT.elegido[nombre].splice(Number(b.getAttribute('data-q')), 1);
    pintarChips();
  });
  document.addEventListener('mousedown', function(ev){
    if (caja && !caja.contains(ev.target)) lista.hidden = true;
  });

  VT['limpiar' + nombre] = function(){
    VT.elegido[nombre] = []; inp.value = ''; pintarChips(); lista.hidden = true;
  };
  VT['repintarChips' + nombre] = pintarChips;
}

/* ---------- los filtros que eligio ---------- */
function vtFiltros(){
  var d = document.getElementById('vtDesde').value || null;
  var h = document.getElementById('vtHasta').value || null;
  var p = document.getElementById('vtProv').value || '';
  return {
    p_desde: d, p_hasta: h,
    p_clientes:    VT.elegido.Cliente.length   ? VT.elegido.Cliente.slice()   : null,
    p_provincias:  p ? [p] : null,
    p_proveedores: VT.elegido.Proveedor.length ? VT.elegido.Proveedor.slice() : null
  };
}

function vtRotuloFiltros(res){
  var t = [];
  t.push('del <span class="f">' + vtFecha(res.desde) + '</span> al <span class="f">' +
         vtFecha(res.hasta) + '</span>');
  var p = document.getElementById('vtProv').value;
  if (p) t.push('provincia <span class="f">' + vtEsc(p) + '</span>');
  if (VT.elegido.Cliente.length)   t.push(VT.elegido.Cliente.length + ' cliente(s) elegido(s)');
  if (VT.elegido.Proveedor.length) t.push(VT.elegido.Proveedor.length + ' proveedor(es) elegido(s)');
  return t.join(' · ');
}

/* ---------- traer todo ---------- */
function vtCargar(){
  if (VT.cargando) return;
  VT.cargando = true;
  var estado = document.getElementById('vtEstado');
  var cuerpo = document.getElementById('vtCuerpo');
  document.getElementById('vtAplicar').disabled = true;
  estado.innerHTML = '<div class="db-vacio">Midiendo contra la base…</div>';
  cuerpo.hidden = true;

  var f = vtFiltros();
  var lim = Number(document.getElementById('vtDetalle').value || 2000);
  var det = { p_desde:f.p_desde, p_hasta:f.p_hasta, p_clientes:f.p_clientes,
              p_provincias:f.p_provincias, p_proveedores:f.p_proveedores, p_limite:lim };

  var t0 = Date.now();
  /* `api_ventas_fact_informe` trae las 27 columnas con costo, margen y MarkUp;
     `api_ventas_fact_por_mes_v2` el mes a mes con las mismas cifras. Las dos
     salen de vista_margen_v2_oc y aplican la MISMA cuarentena que
     api_margen_tablero_v3, asi que esta pantalla y el Tablero no pueden decir
     numeros distintos. */
  var pedidos = [ rpc('api_ventas_fact_resumen', f),
                  rpc('api_ventas_fact_informe', det),
                  rpc('api_ventas_fact_por_mes_v2',
                      { p_desde:f.p_desde, p_hasta:f.p_hasta, p_clientes:f.p_clientes,
                        p_provincias:f.p_provincias, p_proveedores:f.p_proveedores }) ];
  if (!VT.opciones){
    pedidos.push(rpc('api_ventas_fact_opciones', { p_desde:null, p_hasta:null }));
  }

  Promise.all(pedidos).then(function(r){
    if (r[3]){
      VT.opciones = r[3].data || {};
      var cl = VT.opciones.clientes || [];
      for (var i = 0; i < cl.length; i++){
        VT.mapa.Cliente[cl[i].cod + ' — ' + (cl[i].nombre || '')] = cl[i].cod;
      }
      var pr = VT.opciones.proveedores || [];
      for (var j = 0; j < pr.length; j++){
        VT.mapa.Proveedor[(pr[j].nombre || '') + ' (' + pr[j].cod + ')'] = pr[j].cod;
      }
    }
    /* el detalle queda guardado ENTERO: los filtros de vendedor, articulo,
       documento, estado y observacion se aplican sobre esto sin volver a la
       base, igual que en el informe que mando el usuario */
    VT.det  = r[1].data || [];
    VT.res  = r[0].data || {};
    VT.mes  = r[2].data || [];
    VT.tope = lim;
    VT.ms   = { total: Date.now() - t0,
                partes: (r[0].ms || 0) + '/' + (r[1].ms || 0) + '/' + (r[2].ms || 0) };
    vtLlenarSelectsLocales();
    vtDibujar(VT.res, vtFiltrarLocal(VT.det), VT.ms.total, VT.ms.partes);
  }).catch(function(e){
    estado.innerHTML = '<div class="db-aviso mal"><b>No se pudo medir.</b> ' +
                       vtEsc(e && e.message ? e.message : e) + '</div>';
  }).then(function(){
    VT.cargando = false;
    document.getElementById('vtAplicar').disabled = false;
  });
}

/* ---------- LOS FILTROS QUE SE APLICAN SOBRE LO TRAIDO ----------
   Vendedor, articulo, documento, estado y observacion no vuelven a la base: se
   aplican sobre `VT.det`, que es lo que ya esta en la pantalla. Es como trabaja
   el informe que mando el usuario, y tiene una ventaja: lo que se baja a Excel
   es exactamente lo que se ve, porque es el mismo arreglo.
   EL LIMITE SE DECLARA: si la base corto en el tope, filtrar aca filtra un
   recorte, y eso se dice con letras arriba de la tabla. Es el defecto del
   `limit` informado como total, que hoy aparecio dos veces. */
function vtFiltrarLocal(det){
  if (!det) return [];
  var vend = document.getElementById('vtVend').value || '';
  var art  = vtPlano(document.getElementById('vtArt').value || '');
  var doc  = vtPlano(document.getElementById('vtDoc').value || '');
  var est  = document.getElementById('vtEstadoF').value || '';
  var mot  = document.getElementById('vtMotivo').value || '';
  if (!vend && !art && !doc && !est && !mot) return det;

  return det.filter(function(d){
    if (vend && (d.vendedor || '') !== vend) return false;
    if (art){
      var enArt = vtPlano(d.cod_articu).indexOf(art) >= 0 ||
                  vtPlano(d.articulo).indexOf(art) >= 0;
      if (!enArt) return false;
    }
    if (doc){
      var enDoc = vtPlano(d.comprobante).indexOf(doc) >= 0 ||
                  vtPlano(d.nro_pedido).indexOf(doc) >= 0 ||
                  vtPlano(d.n_orden_compra).indexOf(doc) >= 0;
      if (!enDoc) return false;
    }
    if (est === 'con' && d.costo_unitario === null) return false;
    if (est === 'sin' && d.costo_unitario !== null) return false;
    if (est === 'perdida' && !(d.margen_pesos !== null && Number(d.margen_pesos) < 0)) return false;
    if (mot && (d.por_que_sin_costo || '') !== mot) return false;
    return true;
  });
}

/* los dos desplegables que se llenan con lo que de verdad vino, no con una
   lista escrita a mano que se queda corta sin avisar */
function vtLlenarSelectsLocales(){
  var det = VT.det || [];
  var vend = {}, mot = {};
  for (var i = 0; i < det.length; i++){
    if (det[i].vendedor) vend[det[i].vendedor] = 1;
    if (det[i].por_que_sin_costo) mot[det[i].por_que_sin_costo] = 1;
  }
  vtLlenarUno('vtVend', Object.keys(vend).sort(), 'todos', 0);
  vtLlenarUno('vtMotivo', Object.keys(mot).sort(), 'todas', 74);
}
function vtLlenarUno(id, valores, rotuloVacio, corte){
  var s = document.getElementById(id);
  if (!s) return;
  var antes = s.value;
  var h = ['<option value="">' + rotuloVacio + '</option>'];
  for (var i = 0; i < valores.length; i++){
    var v = valores[i];
    var rot = (corte && v.length > corte) ? v.substring(0, corte) + '…' : v;
    h.push('<option value="' + vtEsc(v) + '" title="' + vtEsc(v) + '">' + vtEsc(rot) + '</option>');
  }
  s.innerHTML = h.join('');
  if (antes && valores.indexOf(antes) >= 0) s.value = antes;
}

/* repintar SIN consultar la base */
function vtRepintarLocal(){
  if (!VT.det) return;
  vtDibujar(VT.res, vtFiltrarLocal(VT.det), VT.ms.total, VT.ms.partes);
}

/* ---------- el control contra la contabilidad, a pedido ---------- */
function vtControl(){
  var caja = document.getElementById('vtCtrl');
  if (!caja) return;
  var b = document.getElementById('vtCtrlBtn');
  if (b) b.disabled = true;
  caja.innerHTML = '<div class="db-vacio">Cruzando factura por factura contra los asientos…</div>';
  var f = vtFiltros();
  rpc('api_ventas_fact_control', { p_desde:f.p_desde, p_hasta:f.p_hasta })
    .then(function(r){
      var c = r.data || {};
      var dif = Number(c.diferencia || 0);
      var pctDif = Number(c.contable || 0) ? Math.abs(dif) / Math.abs(Number(c.contable)) * 100 : 0;
      /* TRES decimales a proposito: con uno, 0,037% se escribe "0,0%" y eso se
         lee "no hay diferencia", que no es lo mismo que "la diferencia es
         chica". Es el redondeo que convierte 99,99% en 100%. */
      var pctTx = pctDif > 0 && pctDif < 0.05
        ? pctDif.toLocaleString('es-AR', {minimumFractionDigits:3, maximumFractionDigits:3}) + '%'
        : vtDec(pctDif) + '%';
      var h = [];
      h.push('<div class="db-aviso ' + (pctDif < 0.5 ? 'ok' : 'mal') + '">');
      h.push('<b>' + vtNum(c.iguales_al_peso) + ' de ' + vtNum(c.en_los_dos) +
             '</b> facturas coinciden <b>al peso</b> con el asiento contable, y ' +
             vtNum(c.dentro_del_1_pct) + ' dentro del 1%. ');
      h.push('Contabilidad <b>' + vtExacto(c.contable) + '</b> contra sistema <b>' +
             vtExacto(c.sistema) + '</b>: diferencia ' + vtExacto(dif) + ' (' + pctTx + ').');
      h.push('<br><br><b>' + vtNum(c.facturas_sin_asiento) + ' facturas emitidas no están ' +
             'contabilizadas</b> por ' + vtExacto(c.plata_sin_asiento) + '. Esa plata está en el ' +
             'sistema y no en su contabilidad: es un hallazgo para ellos, no una diferencia de ' +
             'medición. Las dos partes cierran el total: ' + vtExacto(c.sistema) + ' + ' +
             vtExacto(c.plata_sin_asiento) + '.');
      if (Number(c.facturas_sin_renglones || 0) > 0){
        h.push('<br><br>' + vtNum(c.facturas_sin_renglones) + ' factura(s) sin renglones en el ' +
               'sistema (son las anuladas de $0).');
      }
      h.push('<div class="db-pie">' + vtEsc(c.cuentas || '') + ' · medido en ' + (r.ms || 0) +
             ' ms contra la base, ahora mismo.</div>');
      h.push('</div>');
      caja.innerHTML = h.join('');
    })
    .catch(function(e){
      caja.innerHTML = '<div class="db-aviso mal">No se pudo correr el control: ' +
                       vtEsc(e && e.message ? e.message : e) + '</div>';
    })
    .then(function(){ if (b) b.disabled = false; });
}

/* ---------- dibujar ---------- */
function vtDibujar(res, det, msTotal, msPartes){
  var estado = document.getElementById('vtEstado');
  var cuerpo = document.getElementById('vtCuerpo');
  var tot = res.total || {}, av = res.avisos || {};
  var h = [];

  if (!Number(tot.renglones || 0)){
    estado.innerHTML = '<div class="db-vacio">Ningún renglón entra en esos filtros. ' +
                       'Probá con otro período, otra provincia, o sin el cliente.</div>';
    cuerpo.hidden = true;
    return;
  }

  /* ---- la bajada del encabezado, con las cifras de verdad ---- */
  var baj = document.getElementById('vtBajada');
  if (baj){
    baj.innerHTML = 'DISSAN S.R.L. &middot; <b>' + vtNum(tot.renglones) + ' renglones</b> de <b>' +
      vtNum(tot.comprobantes) + ' facturas</b> &middot; del ' + vtFecha(res.desde) + ' al ' +
      vtFecha(res.hasta) +
      /* vtRotuloFiltros ya empieza por el periodo, y arriba ya se escribio: se
         saca esa parte y queda solo lo que el usuario eligio ademas */
      (function(){
        var r = vtRotuloFiltros(res).replace(/<[^>]*>/g, '')
                 .replace(/^del .*? al [^ ]+\s*(·\s*)?/, '');
        return r ? ' &middot; ' + r : '';
      })() +
      ' &middot; medido en ' + vtNum(msTotal) + ' ms contra la base';
  }

  /* ---- la tira de cifras, en el estilo del informe ----
     Van el costo, el margen y el MarkUp, cada uno CON SU DENOMINADOR al lado:
     un margen del 36,9% sin decir que es sobre la venta medible se lee como si
     fuera sobre todo lo facturado, y no lo es. */
  var mesS = vtSumarMeses(VT.mes || []);
  h.push('<div class="vi-kpis">');
  h.push(vtKpi('Renglones', vtNum(tot.renglones), 'cada fila es un renglón de una factura'));
  h.push(vtKpi('Facturas', vtNum(tot.comprobantes), 'facturas de venta distintas'));
  h.push(vtKpi('Venta facturada', vtMillones(tot.facturado), vtExacto(tot.facturado) + ' neto sin IVA'));
  h.push(vtKpi('Renglones con costo', vtNum(mesS.cc) +
               (Number(tot.renglones) ? ' (' + vtDec(mesS.cc / Number(tot.renglones) * 100) + '%)' : ''),
               'los que se pueden medir'));
  h.push(vtKpi('Venta con costo', vtMillones(mesS.vc),
               Number(tot.facturado) ? vtDec(mesS.vc / Number(tot.facturado) * 100) +
               '% de lo facturado' : ''));
  h.push(vtKpi('Costo', vtMillones(mesS.co), vtExacto(mesS.co)));
  h.push(vtKpi('Margen', vtMillones(mesS.mg),
               mesS.vc ? vtDec(mesS.mg / mesS.vc * 100) + '% sobre la venta con costo' : ''));
  h.push(vtKpi('MarkUp', mesS.co ? vtDec(mesS.mg / mesS.co * 100) + '%' : '—',
               'el margen sobre el COSTO'));
  h.push('</div>');

  var pa = res.por_anio || [];

  /* ---- comparativo por anio ---- */
  h.push('<div class="db-sec">Comparativo por año' +
         '<small>Cada año completo. La variación es contra el año anterior de esta misma tabla. ' +
         '2026 va hasta el ' + vtFecha(res.hasta) + ', así que contra 2025 compara un año ' +
         'entero contra un año incompleto.</small></div>');
  h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>' +
         '<th>Año</th><th class="db-num">Facturado</th><th class="db-num">Variación</th>' +
         '<th class="db-num">Facturas</th><th class="db-num">Renglones</th>' +
         '<th class="db-num">Clientes</th><th class="db-num">Promedio por factura</th>' +
         '</tr></thead><tbody>');
  for (var k = 0; k < pa.length; k++){
    var f = pa[k];
    h.push('<tr><td><b>' + f.anio + '</b></td>');
    h.push(vtCelPesos(f.facturado));
    h.push(vtCelVar(f.facturado, k > 0 ? pa[k-1].facturado : 0));
    h.push(vtCelNum(f.comprobantes));
    h.push(vtCelNum(f.renglones));
    h.push(vtCelNum(f.clientes));
    h.push(vtCelPesos(Number(f.comprobantes || 0) ? Number(f.facturado)/Number(f.comprobantes) : null));
    h.push('</tr>');
  }
  h.push('<tr class="bien"><td><b>Total</b></td>');
  h.push(vtCelPesos(tot.facturado));
  h.push('<td class="db-num"></td>');
  h.push(vtCelNum(tot.comprobantes));
  h.push(vtCelNum(tot.renglones));
  h.push(vtCelNum(tot.clientes));
  h.push(vtCelPesos(Number(tot.comprobantes || 0) ? Number(tot.facturado)/Number(tot.comprobantes) : null));
  h.push('</tr></tbody></table></div>');

  /* ---- mes a mes ---- */
  var pm = res.por_mes || [];
  if (pm.length > 1){
    h.push('<div class="db-sec">Mes a mes<small>' + pm.length +
           ' meses con facturación. Pasá el puntero por una columna para ver el mes.</small></div>');
    h.push(vtGrafColumnas(pm));
  }

  /* ---- mes a mes con costo, margen y MarkUp ----
     Es la segunda tabla del informe. La VENTA CON COSTO va al lado del margen a
     proposito: sin ese denominador, el porcentaje parece ser de todo lo
     facturado. Y la cobertura dice que parte del mes se pudo costear. */
  var mv = VT.mes || [];
  if (mv.length){
    h.push('<div class="vi-sec"><h2>Resumen mes a mes, con costo y MarkUp' +
           '<small> &middot; los mismos filtros de arriba</small></h2>' +
           '<p class="vi-nota">El <b>margen %</b> se mide sobre la <b>venta con costo</b>, no sobre ' +
           'lo facturado. El <b>MarkUp %</b> se mide sobre el <b>costo</b>. La <b>cobertura</b> es ' +
           'qué parte de lo facturado del mes se pudo costear.</p></div>');
    h.push('<div class="vi-tb-caja"><table><thead><tr>' +
           '<th>Mes</th><th class="der">Renglones</th><th class="der">Venta facturada</th>' +
           '<th class="der">Renglones con costo</th><th class="der">Venta con costo</th>' +
           '<th class="der">Costo</th><th class="der">Margen $</th>' +
           '<th class="der">Margen %</th><th class="der">MarkUp %</th>' +
           '<th class="der">Cobertura</th></tr></thead><tbody>');
    for (var mi = 0; mi < mv.length; mi++){
      var m2 = mv[mi];
      h.push('<tr><td class="cod">' + vtEsc(m2.mes) + '</td>');
      h.push(vtCelNum(m2.renglones));
      h.push(vtCelPesos(m2.facturado));
      h.push(vtCelNum(m2.renglones_con_costo));
      h.push(vtCelPesos(m2.venta_con_costo));
      h.push(vtCelPesos(m2.costo));
      h.push(vtCelPesos(m2.margen_pesos));
      h.push(vtCelPct(m2.margen_pct));
      h.push(vtCelPct(m2.markup_pct));
      h.push(vtCelPct(m2.cobertura_pct));
      h.push('</tr>');
    }
    var ms2 = vtSumarMeses(mv);
    h.push('<tr class="vi-tot"><td><b>Total</b></td>');
    h.push(vtCelNum(ms2.rg)); h.push(vtCelPesos(ms2.fa));
    h.push(vtCelNum(ms2.cc)); h.push(vtCelPesos(ms2.vc));
    h.push(vtCelPesos(ms2.co)); h.push(vtCelPesos(ms2.mg));
    h.push(vtCelPct(ms2.vc ? ms2.mg / ms2.vc * 100 : null));
    h.push(vtCelPct(ms2.co ? ms2.mg / ms2.co * 100 : null));
    h.push(vtCelPct(ms2.fa ? ms2.vc / ms2.fa * 100 : null));
    h.push('</tr></tbody></table></div>');
  }

  /* ---- por provincia ---- */
  var pp = res.por_provincia || [], ppa = res.por_provincia_anio || [];
  h.push('<div class="db-sec">Por provincia, según el prefijo del código de cliente' +
         '<small>MZ Mendoza · SJ San Juan · SL San Luis. Es la regla de DISSAN y está medida: ' +
         'coincide con el campo zona en ' + vtNum(av.renglones_prefijo_contra_zona_ok) + ' de ' +
         vtNum(tot.renglones) + ' renglones.</small></div>');
  var anios = pa.map(function(x){ return x.anio; });
  h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr><th>Provincia</th>');
  for (var a1 = 0; a1 < anios.length; a1++) h.push('<th class="db-num">' + anios[a1] + '</th>');
  h.push('<th class="db-num">Total</th><th class="db-num">Participación</th>' +
         '<th class="db-num">Clientes</th><th class="db-num">Facturas</th>' +
         '<th class="db-num">Renglones</th></tr></thead><tbody>');
  for (var pi = 0; pi < pp.length; pi++){
    var pr = pp[pi];
    h.push('<tr><td><b>' + vtEsc(pr.provincia) + '</b></td>');
    for (var a2 = 0; a2 < anios.length; a2++){
      var celda = null;
      for (var z = 0; z < ppa.length; z++){
        if (ppa[z].provincia === pr.provincia && ppa[z].anio === anios[a2]){
          celda = ppa[z].facturado; break;
        }
      }
      h.push(vtCelPesos(celda));
    }
    h.push(vtCelPesos(pr.facturado));
    var part = Number(tot.facturado || 0) ? Number(pr.facturado)/Number(tot.facturado)*100 : 0;
    h.push('<td class="db-num" data-v="' + part.toFixed(2) + '">' + vtDec(part) + '%</td>');
    h.push(vtCelNum(pr.clientes));
    h.push(vtCelNum(pr.comprobantes));
    h.push(vtCelNum(pr.renglones));
    h.push('</tr>');
  }
  h.push('</tbody></table></div>');
  h.push(vtGrafBarras(pp, 'provincia', 'facturado',
    function(f){ return f.provincia + ': ' + vtExacto(f.facturado); },
    function(f){ return vtMillones(f.facturado); }, '', 92, 22));

  /* ---- por cliente ---- */
  var pc = res.por_cliente || [];
  h.push('<div class="db-sec">Por cliente<small>Los ' + pc.length + ' que más facturaron, de ' +
         vtNum(res.clientes_distintos) + ' clientes del período. La columna <b>Provincia fiscal</b> ' +
         'es el domicilio del maestro de clientes: cuando no coincide con el prefijo, la fila va ' +
         'marcada — son ' + vtNum(av.clientes_prefijo_contra_fiscal_mal) + ' clientes.</small></div>');
  h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>' +
         '<th>Código</th><th>Cliente</th><th>Provincia</th><th>Provincia fiscal</th>');
  for (var a3 = 0; a3 < anios.length; a3++) h.push('<th class="db-num">' + anios[a3] + '</th>');
  h.push('<th class="db-num">Total</th><th class="db-num">Participación</th>' +
         '<th class="db-num">Facturas</th><th class="db-num">Primera</th>' +
         '<th class="db-num">Última</th></tr></thead><tbody>');
  for (var ci = 0; ci < pc.length; ci++){
    var c = pc[ci];
    var fiscalNorm = (c.provincia_fiscal === 'MZA' ? 'MENDOZA' : c.provincia_fiscal);
    var difiere = c.provincia_fiscal !== '(sin dato)' && fiscalNorm !== c.provincia;
    h.push('<tr' + (difiere ? ' class="aparte"' : '') + '>');
    h.push('<td class="db-cod">' + vtEsc(c.cod_client) + '</td>');
    h.push('<td class="db-desc" title="' + vtEsc(c.cliente) + '">' + vtEsc(c.cliente) + '</td>');
    h.push('<td>' + vtEsc(c.provincia) + '</td>');
    h.push('<td' + (difiere ? ' title="no coincide con el prefijo del código"' : '') + '>' +
           vtEsc(c.provincia_fiscal) + '</td>');
    for (var a4 = 0; a4 < anios.length; a4++){
      h.push(vtCelPesos(c['f' + anios[a4]]));
    }
    h.push(vtCelPesos(c.facturado));
    var partc = Number(tot.facturado || 0) ? Number(c.facturado)/Number(tot.facturado)*100 : 0;
    h.push('<td class="db-num" data-v="' + partc.toFixed(2) + '">' + vtDec(partc) + '%</td>');
    h.push(vtCelNum(c.comprobantes));
    h.push(vtCelFecha(c.primera));
    h.push(vtCelFecha(c.ultima));
    h.push('</tr>');
  }
  h.push('</tbody></table></div>');

  /* ---- por proveedor ---- */
  var pv = res.por_proveedor || [];
  h.push('<div class="db-sec">Por proveedor<small>El proveedor sale del <b>sinónimo del ' +
         'artículo</b>: es el proveedor del artículo, no el de esa venta en particular. Medido: ' +
         'en ' + vtNum(Number(tot.renglones) - Number(av.renglones_sin_proveedor || 0)) + ' de ' +
         vtNum(tot.renglones) + ' renglones hay <b>exactamente uno</b> y en ninguno hay dos. ' +
         'Los ' + vtNum(av.renglones_sin_proveedor) + ' renglones sin proveedor son ' +
         vtExacto(av.plata_sin_proveedor) + ' y van en su propia fila: casi todo es ' +
         'consignación, que nunca se compró.</small></div>');
  h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>' +
         '<th>Código</th><th>Proveedor</th>');
  for (var a5 = 0; a5 < anios.length; a5++) h.push('<th class="db-num">' + anios[a5] + '</th>');
  h.push('<th class="db-num">Total</th><th class="db-num">Participación</th>' +
         '<th class="db-num">Artículos</th><th class="db-num">Facturas</th>' +
         '<th class="db-num">Renglones</th></tr></thead><tbody>');
  for (var vi = 0; vi < pv.length; vi++){
    var p2 = pv[vi];
    var sinProv = p2.cod_proveedor === '(sin proveedor)';
    h.push('<tr' + (sinProv ? ' class="aparte"' : '') + '>');
    h.push('<td class="db-cod">' + vtEsc(p2.cod_proveedor) + '</td>');
    h.push('<td class="db-desc" title="' + vtEsc(p2.proveedor) + '">' + vtEsc(p2.proveedor) + '</td>');
    for (var a6 = 0; a6 < anios.length; a6++) h.push(vtCelPesos(p2['f' + anios[a6]]));
    h.push(vtCelPesos(p2.facturado));
    var partp = Number(tot.facturado || 0) ? Number(p2.facturado)/Number(tot.facturado)*100 : 0;
    h.push('<td class="db-num" data-v="' + partp.toFixed(2) + '">' + vtDec(partp) + '%</td>');
    h.push(vtCelNum(p2.articulos));
    h.push(vtCelNum(p2.comprobantes));
    h.push(vtCelNum(p2.renglones));
    h.push('</tr>');
  }
  h.push('</tbody></table></div>');
  h.push(vtGrafBarras(pv.slice(0, 15), 'proveedor', 'facturado',
    function(f){ return f.proveedor + ': ' + vtExacto(f.facturado); },
    function(f){ return vtMillones(f.facturado); }, 'v', 150, 20));

  /* ---- provincia fiscal, el otro corte ---- */
  var pf = res.por_provincia_fiscal || [];
  if (pf.length > 1){
    h.push('<div class="db-sec">Por provincia fiscal del cliente<small>Otro corte, y es ' +
           '<b>otra cosa</b>: el domicilio que tiene el cliente cargado en Tango. SWISS MEDICAL ' +
           'figura en Capital Federal y SANCOR en Santa Fe, con código MZ. No contradice al ' +
           'cuadro de arriba: mide algo distinto. Difiere del prefijo en ' +
           vtNum(av.clientes_prefijo_contra_fiscal_mal) + ' clientes por ' +
           vtExacto(av.plata_prefijo_contra_fiscal_mal) + '.</small></div>');
    h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>' +
           '<th>Provincia fiscal</th><th class="db-num">Facturado</th>' +
           '<th class="db-num">Participación</th><th class="db-num">Clientes</th>' +
           '<th class="db-num">Renglones</th></tr></thead><tbody>');
    for (var fi = 0; fi < pf.length; fi++){
      var pfx = pf[fi];
      h.push('<tr><td>' + vtEsc(pfx.provincia_fiscal) + '</td>');
      h.push(vtCelPesos(pfx.facturado));
      var partf = Number(tot.facturado || 0) ? Number(pfx.facturado)/Number(tot.facturado)*100 : 0;
      h.push('<td class="db-num" data-v="' + partf.toFixed(2) + '">' + vtDec(partf) + '%</td>');
      h.push(vtCelNum(pfx.clientes));
      h.push(vtCelNum(pfx.renglones));
      h.push('</tr>');
    }
    h.push('</tbody></table></div>');
  }

  /* ---- un cliente con el prefijo y la zona en desacuerdo ---- */
  if (Number(av.clientes_prefijo_contra_zona_mal || 0) > 0){
    h.push('<div class="db-aviso"><b>' + vtNum(av.clientes_prefijo_contra_zona_mal) +
           ' cliente(s) tienen el prefijo del código y el campo zona en desacuerdo</b>, en ' +
           vtNum(av.renglones_prefijo_contra_zona_mal) + ' renglones. En todo el resto, ' +
           vtNum(av.renglones_prefijo_contra_zona_ok) + ' renglones, las dos fuentes dicen lo ' +
           'mismo. Es dato a corregir en Tango, no una diferencia de medición.</div>');
  }

  /* ---- el control contra la contabilidad ---- */
  h.push('<div class="db-sec">El control contra la contabilidad de DISSAN' +
         '<small>Esta cifra no se publica porque cierre contra sí misma. Se cruza factura por ' +
         'factura contra los asientos de las cuentas 411001 Ventas Gravadas y 411002 Ventas ' +
         'Exentas, que son de ellos y no miran a esta pantalla.</small></div>');
  h.push('<div class="db-acciones"><button class="db-btn sec" id="vtCtrlBtn">Correr el control ' +
         'ahora</button></div><div id="vtCtrl"></div>');

  /* ---- el detalle, renglon por renglon ---- */
  var cortado = (VT.det || []).length >= Number(VT.tope || 2000);
  var filtrado = det.length !== (VT.det || []).length;
  h.push('<div class="vi-sec"><h2>Detalle renglón por renglón' +
         '<small> &middot; 27 columnas</small></h2></div>');
  h.push('<p class="vi-nota"><b>' + vtNum(det.length) + '</b> renglones' +
         (filtrado ? ' de los <b>' + vtNum((VT.det || []).length) +
                     '</b> que trajo la base (filtrados acá, sin volver a consultar)' : '') +
         '. ' +
         (cortado
           ? '<b>OJO: la base cortó en el tope de ' + vtNum(VT.tope) + '. Puede haber más ' +
             'renglones y esta cifra NO es el total. Subí «Renglones que se traen» para traerlos ' +
             'todos.</b>'
           : 'Son todos los que entran en los filtros de fecha, provincia, cliente y proveedor.') +
         ' El Excel y el PDF bajan <b>exactamente esto</b>, sin volver a consultar la base.</p>');
  h.push('<div class="vi-tb-caja"><table><thead><tr>' +
         '<th>Fecha</th><th>Comprobante</th><th class="der">Reng.</th>' +
         '<th class="der">Pedido</th><th>Orden de compra</th>' +
         '<th>Cód. cliente</th><th>Cliente</th><th>Provincia</th><th>Prov. fiscal</th>' +
         '<th>Localidad</th><th>Cód. vend.</th><th>Vendedor</th>' +
         '<th>Cód. artículo</th><th>Descripción</th><th>Cód. prov.</th><th>Proveedor</th>' +
         '<th class="der">Cantidad</th><th class="der">Precio unitario</th>' +
         '<th class="der">Total del renglón</th>' +
         '<th class="der">Costo unitario</th><th class="der">Costo total</th>' +
         '<th class="der">Margen $</th>' +
         '<th class="der" title="(venta − costo) / venta">Margen %</th>' +
         '<th class="der" title="(venta − costo) / costo">MarkUp %</th>' +
         '<th>Método del costo</th><th>Partida</th><th>Observación</th>' +
         '</tr></thead><tbody>');
  for (var di = 0; di < det.length; di++){
    var d = det[di];
    var sinCosto = d.costo_unitario === null || d.costo_unitario === undefined;
    var perdio   = !sinCosto && Number(d.margen_pesos) < 0;
    h.push('<tr' + (perdio ? ' class="vi-perdida"' : (sinCosto ? ' class="vi-sincosto"' : '')) + '>');
    h.push(vtCelFecha(d.fecha));
    h.push('<td class="cod">' + vtEsc(d.comprobante) + '</td>');
    h.push(vtCelCod(d.renglon));
    h.push(vtCelCod(d.nro_pedido));
    h.push('<td class="cod">' + vtEsc(d.n_orden_compra || '') + '</td>');
    h.push('<td class="cod">' + vtEsc(d.cod_client) + '</td>');
    h.push('<td title="' + vtEsc(d.cliente) + '">' + vtEsc(d.cliente) + '</td>');
    h.push('<td>' + vtEsc(d.provincia) + '</td>');
    h.push('<td>' + vtEsc(d.provincia_fiscal || '') + '</td>');
    h.push('<td>' + vtEsc(d.localidad || '') + '</td>');
    h.push('<td class="cod">' + vtEsc(d.cod_vended || '') + '</td>');
    h.push('<td>' + vtEsc(d.vendedor || '') + '</td>');
    h.push('<td class="cod">' + vtEsc(d.cod_articu) + '</td>');
    h.push('<td title="' + vtEsc(d.articulo) + '">' + vtEsc(d.articulo) + '</td>');
    h.push('<td class="cod">' + vtEsc(d.cod_proveedor || '') + '</td>');
    h.push('<td title="' + vtEsc(d.proveedor || '') + '">' + vtEsc(d.proveedor || '') + '</td>');
    h.push(vtCelNum(d.cantidad));
    h.push(vtCelPesos(d.precio_unitario));
    h.push(vtCelPesos(d.facturado));
    h.push(vtCelPesos(d.costo_unitario));
    h.push(vtCelPesos(d.costo_total));
    h.push(vtCelPesos(d.margen_pesos));
    h.push(vtCelPct(d.margen_pct));
    h.push(vtCelPct(d.markup_pct));
    h.push('<td>' + vtEsc(d.metodo_costo || '') + '</td>');
    h.push('<td class="cod">' + vtEsc(d.n_partida || '') + '</td>');
    h.push('<td class="vi-obs">' + vtEsc(d.por_que_sin_costo || '') + '</td>');
    h.push('</tr>');
  }
  h.push('</tbody></table></div>');

  h.push('<div class="db-pie">' + vtEsc(res.metodo || '') +
         '<br>Resumen y detalle medidos en ' + vtEsc(msPartes) + ' ms de base. ' +
         'Datos de la base hasta el ' + vtFecha(res.hasta) + '.</div>');

  estado.innerHTML = '';
  cuerpo.innerHTML = h.join('');
  cuerpo.hidden = false;
  vtConectarTips(cuerpo);
  var b = document.getElementById('vtCtrlBtn');
  if (b) b.addEventListener('click', vtControl);
  if (VT.repintarChipsCliente)   VT.repintarChipsCliente();
  if (VT.repintarChipsProveedor) VT.repintarChipsProveedor();
}

function vtTarjeta(n, r, p, clase){
  return '<div class="db-t"><div class="n ' + (clase || '') + '">' + n + '</div>' +
         '<div class="r">' + vtEsc(r) + '</div>' +
         (p ? '<div class="p">' + vtEsc(p) + '</div>' : '') + '</div>';
}

/* la tarjeta del informe: rotulo arriba, cifra grande, y la nota que dice
   SOBRE QUE esta medida */
function vtKpi(rotulo, valor, nota){
  return '<div class="vi-kpi"><div class="vi-kpi-t">' + vtEsc(rotulo) + '</div>' +
         '<div class="vi-kpi-v">' + vtEsc(valor) + '</div>' +
         (nota ? '<div class="vi-kpi-n">' + vtEsc(nota) + '</div>' : '') + '</div>';
}

/* un porcentaje. Sin valor va VACIA, no cero: un cero ahi seria una cifra
   inventada, y es la regla del MarkUp sin costo. */
function vtCelPct(n){
  if (n === null || n === undefined || n === '') return '<td class="der"></td>';
  var v = Number(n);
  return '<td class="der" data-v="' + v + '">' + vtDec(v) + '%</td>';
}

/* UN CODIGO NO ES UN NUMERO. La OC 5245 escrita como numero sale "5.245" y el
   pedido 14709 sale "14.709". Van como texto, y con la clase que `bajar.js`
   reconoce para bajarlos como texto tambien. */
function vtCelCod(v){
  if (v === null || v === undefined || v === '') return '<td class="cod der"></td>';
  return '<td class="cod der vt-cod">' + vtEsc(v) + '</td>';
}

/* los totales del mes a mes, sumados UNA sola vez */
function vtSumarMeses(mv){
  var s = { rg:0, fa:0, cc:0, vc:0, co:0, mg:0 };
  for (var i = 0; i < (mv || []).length; i++){
    s.rg += Number(mv[i].renglones || 0);
    s.fa += Number(mv[i].facturado || 0);
    s.cc += Number(mv[i].renglones_con_costo || 0);
    s.vc += Number(mv[i].venta_con_costo || 0);
    s.co += Number(mv[i].costo || 0);
    s.mg += Number(mv[i].margen_pesos || 0);
  }
  return s;
}

/* barras horizontales, con el numero escrito al lado */
function vtGrafBarras(filas, campoEt, campoVal, fnTip, fnTexto, tono, anchoEt, altoFila){
  if (!filas || !filas.length) return '';
  var max = 0;
  for (var i = 0; i < filas.length; i++) max = Math.max(max, Math.abs(Number(filas[i][campoVal] || 0)));
  if (max <= 0) max = 1;
  var aEt = anchoEt || 90, aBarra = 340, alto = altoFila || 19, pad = 7, aNum = 80;
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
    if (et.length > 26) et = et.substring(0, 25) + '…';
    s.push('<g class="f" data-tip="' + vtEsc(fnTip(f)) + '">');
    s.push('<text class="et" x="0" y="' + (y + alto/2 + 3) + '">' + vtEsc(et) + '</text>');
    s.push('<rect class="b ' + (tono || '') + '" x="' + aEt + '" y="' + (y + 3) +
           '" width="' + w + '" height="' + (alto - 8) + '"></rect>');
    s.push('<text class="val" x="' + (aEt + w + 6) + '" y="' + (y + alto/2 + 3) + '">' +
           vtEsc(fnTexto(f)) + '</text>');
    s.push('<rect class="z" x="0" y="' + y + '" width="' + total + '" height="' + alto + '"></rect>');
    s.push('</g>');
  }
  s.push('<line class="eje" x1="' + (aEt - 1) + '" y1="' + (pad - 3) +
         '" x2="' + (aEt - 1) + '" y2="' + (h - pad + 3) + '"></line>');
  s.push('</svg></div>');
  return s.join('');
}

/* columnas: una por mes. El rotulo se escribe cada 3 meses para que se lea,
   y el mes exacto va en el tooltip de cada columna. */
function vtGrafColumnas(filas){
  if (!filas || !filas.length) return '';
  var max = 0;
  for (var i = 0; i < filas.length; i++) max = Math.max(max, Number(filas[i].facturado || 0));
  if (max <= 0) max = 1;
  var aCol = 18, pad = 8, alto = 130, base = alto + 16, ancho = aCol * filas.length + pad * 2;
  var s = ['<div class="db-graf"><div class="db-tip"></div>',
           '<svg viewBox="0 0 ' + ancho + ' ' + (base + 14) +
           '" role="img" aria-label="facturación mes a mes">'];
  for (var j = 0; j < filas.length; j++){
    var f = filas[j];
    var v = Number(f.facturado || 0);
    var hCol = Math.max(1, Math.round((alto - 10) * v / max));
    var x = pad + j * aCol;
    var tono = (Number(f.anio) % 2 === 0) ? '' : 'v';
    s.push('<g class="f" data-tip="' + vtEsc(VT_MESES[Number(f.mes_nro)] + ' ' + f.anio + ': ' +
           vtExacto(v) + ' en ' + vtNum(f.comprobantes) + ' facturas') + '">');
    s.push('<rect class="b ' + tono + '" x="' + (x + 2) + '" y="' + (alto - hCol) +
           '" width="' + (aCol - 4) + '" height="' + hCol + '"></rect>');
    if (j % 3 === 0 || j === filas.length - 1){
      s.push('<text class="et" x="' + (x + aCol/2) + '" y="' + (alto + 11) +
             '" text-anchor="middle">' + vtEsc(VT_MESES[Number(f.mes_nro)]) + '</text>');
      s.push('<text class="et" x="' + (x + aCol/2) + '" y="' + (alto + 21) +
             '" text-anchor="middle">' + vtEsc(String(f.anio).substring(2)) + '</text>');
    }
    s.push('<rect class="z" x="' + x + '" y="0" width="' + aCol + '" height="' + base + '"></rect>');
    s.push('</g>');
  }
  s.push('<line class="eje" x1="' + pad + '" y1="' + alto + '" x2="' + (ancho - pad) +
         '" y2="' + alto + '"></line>');
  s.push('</svg></div>');
  return s.join('');
}

function vtConectarTips(raiz){
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
   core.js llama calcular() al entrar, y NO lo llama si el modulo esta apagado
   para el usuario: por eso la consulta no corre cuando el portero tapa. */
function calcular(){
  if (VT.armado){ vtCargar(); return; }
  VT.armado = true;

  vtArmarPicker('Cliente');
  vtArmarPicker('Proveedor');

  function anio(a){
    document.getElementById('vtDesde').value = a + '-01-01';
    document.getElementById('vtHasta').value = a + '-12-31';
    vtCargar();
  }
  document.getElementById('vtAplicar').addEventListener('click', vtCargar);
  document.getElementById('vtProv').addEventListener('change', vtCargar);
  document.getElementById('vtDetalle').addEventListener('change', vtCargar);

  /* LOS CINCO FILTROS QUE NO VUELVEN A LA BASE. Repintan sobre lo que ya esta
     traido, asi que contestan al instante y el Excel sigue bajando lo que se
     ve. El de texto espera a que pare de escribir. */
  var espera = null;
  function alTipear(){ clearTimeout(espera); espera = setTimeout(vtRepintarLocal, 250); }
  document.getElementById('vtVend').addEventListener('change', vtRepintarLocal);
  document.getElementById('vtEstadoF').addEventListener('change', vtRepintarLocal);
  document.getElementById('vtMotivo').addEventListener('change', vtRepintarLocal);
  document.getElementById('vtArt').addEventListener('input', alTipear);
  document.getElementById('vtDoc').addEventListener('input', alTipear);
  document.getElementById('vt2024').addEventListener('click', function(){ anio(2024); });
  document.getElementById('vt2025').addEventListener('click', function(){ anio(2025); });
  document.getElementById('vt2026').addEventListener('click', function(){ anio(2026); });
  document.getElementById('vtLimpiar').addEventListener('click', function(){
    document.getElementById('vtDesde').value = '2024-01-01';
    document.getElementById('vtHasta').value = '';
    document.getElementById('vtProv').value = '';
    document.getElementById('vtVend').value = '';
    document.getElementById('vtArt').value = '';
    document.getElementById('vtDoc').value = '';
    document.getElementById('vtEstadoF').value = '';
    document.getElementById('vtMotivo').value = '';
    if (VT.limpiarCliente)   VT.limpiarCliente();
    if (VT.limpiarProveedor) VT.limpiarProveedor();
    vtCargar();
  });

  vtCargar();
}
