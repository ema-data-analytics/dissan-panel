
/* =====================================================================
   Margen de ventas reales — rev5, 14/10/2026
   El costo sale de la ORDEN DE COMPRA asociada al pedido de venta.
   Lee api_margen_tablero_v3 (resumen) y api_oc_pedido_reporte_v2 (detalle).
   ===================================================================== */

var MV = { datos:null, detalle:null, cargando:false, listasCargadas:false, elegido:{} };

var PICKERS = ['Clientes','Articulos','Vendedores','Zonas','Provincias','Localidades','Talonarios'];

/* Las cuatro calidades viven en core.js (CALIDAD_FIRME y CALIDAD_CON_180): son las
   mismas y se usan desde alla, no se redeclaran. */

/* Un importe cortado por el ancho se lee como otro numero. De un millon para
   arriba va en millones, con el monto exacto en el tooltip. */
function mvCelPrecio(n){
  if (n === null || n === undefined || n === '') return '<td class="mv-num">—</td>';
  var v = Number(n), exacto = mvPrecio(v);
  var corto = Math.abs(v) >= 1e6
    ? '$' + (v/1e6).toLocaleString('es-AR', {maximumFractionDigits:2}) + ' M'
    : exacto;
  return '<td class="mv-num" data-v="' + v + '" title="' + mvEsc(exacto) + '">' +
         mvEsc(corto) + '</td>';
}

/* "Dice perder" con numero NEGATIVO se leia como perdida cuando era ganancia.
   Si el renglon apartado en realidad gana, se dice que gana. */
function mvCelPerder(n){
  if (n === null || n === undefined || n === '') return '<td class="mv-num">—</td>';
  var v = Number(n);
  if (v <= 0) return '<td class="mv-num" data-v="' + v + '" title="' + mvEsc(mvPesos(-v)) +
                     '">no pierde (gana ' + mvEsc(mvMillones(-v)) + ')</td>';
  return '<td class="mv-num" data-v="' + v + '" title="' + mvEsc(mvPesos(v)) + '">' +
         mvEsc(mvMillones(v)) + '</td>';
}

/* El valor exacto, para que la descarga nunca se lleve el texto de la celda.
   Un importe abreviado ("$2,64 M") bajado como texto es mil veces menos. */
function mvDatoV(v){
  return (v === null || v === undefined || v === '') ? ''
         : ' data-v="' + mvEsc(v) + '"';
}

/* =====================================================================
   MARKUP — la columna que pidió DISSAN el 23/10/2026
   =====================================================================
   Su archivo Precio_de_Costo.xlsx lo define así:

        F = Px Venta      H = Px Costo
        L = PxV/PxC  = F/H
        M = MarkUp   = L - 1  =  (F - H) / H

   O sea: el margen medido sobre el COSTO, no sobre el precio. Es la
   misma cifra que el renglón de arriba llama «sobre el costo».
   Control con los números del propio Excel (fila 14, que son los de
   esta pantalla): 201.549.972 / 132.832.842 - 1 = 0,51733 -> 51,7%.

   Sin costo no hay MarkUp: dividir por cero no da «cero margen», no da
   nada, y escribir un 0 ahí sería una cifra inventada.
   ===================================================================== */
function mvMarkup(venta, costo){
  var v = Number(venta), c = Number(costo);
  if (!isFinite(v) || !isFinite(c) || c === 0) return null;
  return 100 * (v - c) / c;
}
function mvCelMarkup(venta, costo){
  var m = mvMarkup(venta, costo);
  if (m === null) return '<td class="mv-num">—</td>';
  return '<td class="mv-num"' + mvDatoV(m) + '>' + mvDec(m) + '%</td>';
}

/* "0×" no decia nada: con costo $1 y precio $1.145 el cociente redondea a 0.
   Se muestra con decimales cuando es chico, y "menos de 0,01×" si no entra. */
function mvVeces(vendio, costo){
  var p = Number(vendio || 0), c = Number(costo || 0);
  if (!p) return '—';
  var r = c / p;
  if (r > 0 && r < 0.01) return 'menos de 0,01×';
  return r.toLocaleString('es-AR', {maximumFractionDigits:2}) + '×';
}

function mvNum(n){
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString('es-AR');
}
function mvPesos(n){
  if (n === null || n === undefined || n === '') return '—';
  return '$' + Math.round(Number(n)).toLocaleString('es-AR');
}
function mvPrecio(n){
  if (n === null || n === undefined || n === '') return '—';
  return '$' + Number(n).toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2});
}
function mvMillones(n){
  var v = Number(n || 0);
  if (Math.abs(v) >= 1e6) return '$' + (v/1e6).toLocaleString('es-AR', {maximumFractionDigits:1}) + ' M';
  return mvPesos(v);
}
function mvDec(n){
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString('es-AR', {minimumFractionDigits:1, maximumFractionDigits:1});
}
function mvEsc(s){
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
/* el rango de tildes se arma con codigos y no con un escape ni con los
   caracteres combinantes escritos: en el fuente son invisibles y cualquier
   copiado los rompe sin que se vea. */
var RX_TILDES = new RegExp('[' + String.fromCharCode(768) + '-' +
                                 String.fromCharCode(879) + ']', 'g');
function mvPlano(s){
  return String(s === null || s === undefined ? '' : s)
    .toLowerCase().normalize('NFD').replace(RX_TILDES,'');
}
/* Vacio es NULL, no cero: Number(null) da 0 y un 0 en margen_max filtra todo. */
function mvNumONada(v){
  if (v === null || v === undefined || v === '') return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}

function mvValor(id){
  var el = document.getElementById(id);
  if (!el) return null;
  var v = String(el.value || '').trim();
  if (!v) return null;
  if (el.type === 'number'){
    var n = Number(v);
    return isNaN(n) ? null : n;
  }
  return v;
}

/* ---------- el buscador que reemplaza a las listas con scroll ----------
   Mas de 20 opciones se escriben, no se scrollean. Lo elegido queda como
   etiqueta y se saca de un clic. */
function mvArmarPicker(nombre){
  var caja  = document.querySelector('.mv-busca[data-pick="' + nombre + '"]');
  if (!caja) return;
  var inp   = document.getElementById('mv' + nombre + '_i');
  var lista = document.getElementById('mv' + nombre + '_l');
  var chips = document.getElementById('mv' + nombre + '_c');
  MV.elegido[nombre] = MV.elegido[nombre] || [];
  var foco = -1;

  function opciones(){
    var L = (MV.listas || {})[nombre.toLowerCase()] || [];
    return L.filter(function(x){ return MV.elegido[nombre].indexOf(x) < 0; });
  }

  function pintar(){
    var q = mvPlano(inp.value);
    var todas = opciones();
    var hay = q ? todas.filter(function(x){ return mvPlano(x).indexOf(q) >= 0; }) : todas;
    var ver = hay.slice(0, 40);
    foco = -1;

    if (!todas.length){
      lista.innerHTML = '<div class="mv-op nada">Todavía no se cargaron las opciones. ' +
                        'Apretá Calcular una vez.</div>';
    } else if (!ver.length){
      lista.innerHTML = '<div class="mv-op nada">Nada coincide con «' + mvEsc(inp.value) + '». ' +
                        'Igual se usa como texto.</div>';
    } else {
      var h = [];
      for (var i = 0; i < ver.length; i++){
        var t = mvEsc(ver[i]);
        if (q){
          var p = mvPlano(ver[i]).indexOf(q);
          if (p >= 0){
            t = mvEsc(ver[i].substring(0,p)) + '<span class="coincide">' +
                mvEsc(ver[i].substring(p, p+q.length)) + '</span>' +
                mvEsc(ver[i].substring(p+q.length));
          }
        }
        h.push('<div class="mv-op" data-v="' + mvEsc(ver[i]) + '">' + t + '</div>');
      }
      if (hay.length > ver.length){
        h.push('<div class="mv-mas-op">y ' + (hay.length - ver.length) +
               ' más. Escribí para achicar la lista.</div>');
      }
      lista.innerHTML = h.join('');
    }
    lista.hidden = false;
  }

  function pintarChips(){
    var el = MV.elegido[nombre];
    var h = [];
    for (var i = 0; i < el.length; i++){
      h.push('<span class="mv-chip"><span title="' + mvEsc(el[i]) + '">' + mvEsc(el[i]) +
             '</span><button type="button" data-q="' + i + '" title="Sacar">&times;</button></span>');
    }
    chips.innerHTML = h.join('');
  }

  function elegir(v){
    if (!v) return;
    if (MV.elegido[nombre].indexOf(v) < 0) MV.elegido[nombre].push(v);
    inp.value = '';
    pintarChips();
    lista.hidden = true;
    mvContarActivos();
  }

  inp.addEventListener('focus', pintar);
  inp.addEventListener('input', pintar);

  inp.addEventListener('keydown', function(ev){
    var ops = lista.querySelectorAll('.mv-op[data-v]');
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp'){
      ev.preventDefault();
      if (!ops.length) return;
      if (foco >= 0) ops[foco].classList.remove('foco');
      foco = ev.key === 'ArrowDown'
        ? (foco + 1) % ops.length
        : (foco <= 0 ? ops.length - 1 : foco - 1);
      ops[foco].classList.add('foco');
      ops[foco].scrollIntoView({block:'nearest'});
    } else if (ev.key === 'Enter'){
      ev.preventDefault();
      if (foco >= 0 && ops[foco]) elegir(ops[foco].getAttribute('data-v'));
      else if (ops.length === 1)  elegir(ops[0].getAttribute('data-v'));
      else if (String(inp.value).trim()) elegir(String(inp.value).trim());
    } else if (ev.key === 'Escape'){
      lista.hidden = true;
    }
  });

  lista.addEventListener('mousedown', function(ev){
    var op = ev.target.closest('.mv-op[data-v]');
    if (op){ ev.preventDefault(); elegir(op.getAttribute('data-v')); }
  });

  chips.addEventListener('click', function(ev){
    var b = ev.target.closest('button[data-q]');
    if (!b) return;
    MV.elegido[nombre].splice(Number(b.getAttribute('data-q')), 1);
    pintarChips();
    mvContarActivos();
  });

  document.addEventListener('mousedown', function(ev){
    if (!caja.contains(ev.target)) lista.hidden = true;
  });

  /* lo escrito y no elegido se toma igual, para que el filtro no se pierda en silencio */
  MV['tomarEscrito' + nombre] = function(){
    var t = String(inp.value || '').trim();
    if (t && MV.elegido[nombre].indexOf(t) < 0) MV.elegido[nombre].push(t);
    inp.value = '';
    pintarChips();
    lista.hidden = true;
  };

  MV['limpiar' + nombre] = function(){
    MV.elegido[nombre] = [];
    inp.value = '';
    pintarChips();
    lista.hidden = true;
  };
}

/* el articulo se elige como "COD — descripcion"; al servidor va solo el codigo */
function mvSoloCodigos(lista){
  return (lista || []).map(function(x){
    var i = x.indexOf(' — ');
    return i > 0 ? x.substring(0, i) : x;
  });
}

/* ---------- armar el objeto de filtros ---------- */
function mvFiltros(){
  var aprox = document.getElementById('mvAprox').checked;
  return {
    desde:        mvValor('mvDesde'),
    hasta:        mvValor('mvHasta'),
    texto:        mvValor('mvTexto'),
    clientes:     MV.elegido.Clientes    || [],
    articulos:    mvSoloCodigos(MV.elegido.Articulos),
    vendedores:   MV.elegido.Vendedores  || [],
    zonas:        MV.elegido.Zonas       || [],
    provincias:   MV.elegido.Provincias  || [],
    localidades:  MV.elegido.Localidades || [],
    talonarios:   MV.elegido.Talonarios  || [],
    calidad:      (aprox ? CALIDAD_CON_180 : CALIDAD_FIRME).slice(),
    soloConPrueba: document.getElementById('mvPrueba').checked,
    margenMin:    mvValor('mvMargenMin'),
    margenMax:    mvValor('mvMargenMax'),
    ventaMin:     mvValor('mvVentaMin'),
    soloBajoCosto: document.getElementById('mvSolo').checked,
    soloProductos: document.getElementById('mvProductos').checked
  };
}

/* ---------- decir LITERALMENTE que filtros estan puestos ---------- */
function mvTextoFiltros(){
  var f = mvFiltros();
  var p = [];
  if (f.desde || f.hasta){
    p.push('del <span class="f">' + (f.desde ? mvFecha(f.desde) : 'principio') +
           '</span> al <span class="f">' + (f.hasta ? mvFecha(f.hasta) : 'último dato') + '</span>');
  }
  var etiq = { Clientes:'cliente', Articulos:'artículo', Vendedores:'vendedor', Zonas:'zona',
               Provincias:'provincia', Localidades:'localidad', Talonarios:'talonario' };
  for (var i = 0; i < PICKERS.length; i++){
    var n = PICKERS[i], el = MV.elegido[n] || [];
    if (!el.length) continue;
    p.push(etiq[n] + (el.length > 1 ? 's' : '') + ' <span class="f">' +
           mvEsc(el.slice(0,4).join(', ')) +
           (el.length > 4 ? ' y ' + (el.length-4) + ' más' : '') + '</span>');
  }
  if (f.texto)              p.push('texto <span class="f">«' + mvEsc(f.texto) + '»</span>');
  if (f.margenMin !== null) p.push('margen ≥ <span class="f">' + f.margenMin + '%</span>');
  if (f.margenMax !== null) p.push('margen ≤ <span class="f">' + f.margenMax + '%</span>');
  if (f.ventaMin !== null)  p.push('venta ≥ <span class="f">' + mvPesos(f.ventaMin) + '</span>');
  if (f.soloBajoCosto)      p.push('<span class="f">sólo por debajo del costo</span>');
  if (f.soloConPrueba)      p.push('<span class="f">sólo con prueba documental de lote</span>');
  if (!f.soloProductos)     p.push('incluye servicios y fletes');
  if (!f.calidad.length)    p.push('<span class="f">incluye costo de más de 180 días (no confiable)</span>');
  return p;
}

function mvFecha(iso){
  if (!iso) return '';
  var p = String(iso).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(iso);
}

function mvContarActivos(){ /* el encabezado se pinta con los datos; aca no hay nada que hacer */ }

/* ---------- pedir los datos ----------
   Devuelve un aviso si alguna fecha no existe (31 de junio, 30 de febrero).
   El navegador deja escribirla pero despues entrega vacio, asi que el filtro
   se perdia en silencio. validity.badInput es la senal. */
function mvFechaImposible(){
  var campos = [['mvDesde','Desde'], ['mvHasta','Hasta']];
  for (var i = 0; i < campos.length; i++){
    var el = document.getElementById(campos[i][0]);
    if (el && el.validity && el.validity.badInput){
      return 'La fecha de <b>' + campos[i][1] + '</b> no existe. Fijate que el día ' +
             'entre en ese mes (junio, abril, septiembre y noviembre tienen 30; ' +
             'febrero 28 o 29). Corregila y volvé a apretar Calcular.';
    }
  }
  return null;
}

function mvCargar(){
  if (MV.cargando) return;

  var aviso = mvFechaImposible();
  if (aviso){
    document.getElementById('mvEstado').innerHTML =
      '<div class="mv-aviso mal">' + aviso + '</div>';
    document.getElementById('mvCuerpo').hidden = true;
    return;
  }

  /* lo que quedo escrito en un buscador y no se eligio, se toma igual */
  for (var pk = 0; pk < PICKERS.length; pk++){
    if (MV['tomarEscrito' + PICKERS[pk]]) MV['tomarEscrito' + PICKERS[pk]]();
  }

  MV.cargando = true;
  var estado = document.getElementById('mvEstado');
  var cuerpo = document.getElementById('mvCuerpo');
  document.getElementById('mvAplicar').disabled = true;
  estado.innerHTML = '<div class="mv-vacio">Calculando contra la base…</div>';
  cuerpo.hidden = true;

  var f = mvFiltros();
  MV.detalle = null;

  /* La misma funcion de la base que llamaba Apps Script, con los MISMOS 17 parametros,
     con nombre y nunca por posicion. Aca va directo por PostgREST con el JWT. */
  rpc('api_margen_tablero_v3', {
    p_desde:           f.desde || null,
    p_hasta:           f.hasta || null,
    p_clientes:        f.clientes.length    ? f.clientes    : null,
    p_solo_bajo_costo: f.soloBajoCosto === true,
    p_texto:           f.texto || null,
    p_articulos:       f.articulos.length   ? f.articulos   : null,
    p_vendedores:      f.vendedores.length  ? f.vendedores  : null,
    p_zonas:           f.zonas.length       ? f.zonas       : null,
    p_provincias:      f.provincias.length  ? f.provincias  : null,
    p_localidades:     f.localidades.length ? f.localidades : null,
    p_talonarios:      f.talonarios.length  ? f.talonarios  : null,
    p_calidad:         f.calidad,
    /* mvValor() devuelve NULL cuando el campo esta vacio, no cadena vacia. Con un
       === '' el null caia en Number(null) = 0, asi que se mandaba margen desde 0 y
       margen hasta 0 y la consulta no traia NI UN renglon. */
    p_margen_min:      mvNumONada(f.margenMin),
    p_margen_max:      mvNumONada(f.margenMax),
    p_venta_min:       mvNumONada(f.ventaMin),
    p_solo_productos:  f.soloProductos !== false,
    p_solo_con_prueba: f.soloConPrueba === true
  }).then(function(res){
      var d = res.data;
      if (!d){
        MV.cargando = false;
        document.getElementById('mvAplicar').disabled = false;
        estado.innerHTML = '<div class="mv-aviso mal">La base no devolvio datos.</div>';
        return;
      }
      MV.datos = d;
      if (!MV.listasCargadas && d.listas){
        MV.listas = d.listas;
        MV.listasCargadas = true;
      }
      mvPedirDetalle(f, estado, cuerpo);
    })
    .catch(function(err){
      MV.cargando = false;
      document.getElementById('mvAplicar').disabled = false;
      estado.innerHTML = '<div class="mv-aviso mal">No se pudo calcular: ' +
                         mvEsc((err && err.message) ? err.message : 'error') + '</div>';
    });
}

/* el detalle con las 23 columnas de la planilla de DISSAN */
function mvPedirDetalle(f, estado, cuerpo){
  estado.innerHTML = '<div class="mv-vacio">Trayendo el detalle de órdenes de compra…</div>';

  /* Los 19 parametros de api_oc_pedido_reporte_v3. Los ocho del final son los que
     hasta el 14/10 la tabla de abajo ignoraba: mostraba 524 renglones mientras las
     tarjetas decian 731. Dos numeros de la misma pantalla que no coinciden. */
  rpcTodo('api_oc_pedido_reporte_v3', {
    p_desde:            f.desde || null,
    p_hasta:            f.hasta || null,
    p_articulos:        f.articulos.length   ? f.articulos   : null,
    p_clientes:         f.clientes.length    ? f.clientes    : null,
    p_proveedores:      null,
    p_texto:            f.texto || null,
    p_solo_bajo_costo:  f.soloBajoCosto === true,
    p_solo_comparables: false,
    p_vendedores:       f.vendedores.length  ? f.vendedores  : null,
    p_zonas:            f.zonas.length       ? f.zonas       : null,
    p_provincias:       f.provincias.length  ? f.provincias  : null,
    p_localidades:      f.localidades.length ? f.localidades : null,
    p_talonarios:       f.talonarios.length  ? f.talonarios  : null,
    p_margen_min:       mvNumONada(f.margenMin),
    p_margen_max:       mvNumONada(f.margenMax),
    p_venta_min:        mvNumONada(f.ventaMin),
    p_solo_productos:   f.soloProductos !== false,
    p_solo_con_prueba:  f.soloConPrueba === true,
    p_limite:           2000
  }).then(function(res){
      MV.cargando = false;
      document.getElementById('mvAplicar').disabled = false;
      MV.detalle = res.data;
      mvDibujar(MV.datos, estado, cuerpo);
    })
    .catch(function(err){
      MV.cargando = false;
      document.getElementById('mvAplicar').disabled = false;
      MV.detalle = { error: (err && err.message) ? err.message : 'error' };
      mvDibujar(MV.datos, estado, cuerpo);
    });
}

/* ---------- dibujar ---------- */
function mvDibujar(d, estado, cuerpo){
  d = d || {};
  var r = d.resumen || {};
  var h = [];

  /* 1. ENCABEZADO: que se esta mirando, con los valores literales */
  var partes = mvTextoFiltros();
  h.push('<div class="mv-titulo"><span class="q">Margen de ventas reales — ' +
         mvNum(r.medidos) + ' renglones medidos</span>' +
         (partes.length ? 'Filtrado ' + partes.join(' · ')
                        : 'Sin filtros: todo el período, sólo productos y sólo costo firme.') +
         '</div>');

  /* 2. de cuando son los datos */
  var act = d.actualizado || {};
  if (act.cuando){
    var viejo = Number(act.horas) >= 30;
    h.push('<div class="mv-aviso' + (viejo ? '' : ' ok') + '">' +
           'Datos al <b>' + mvEsc(act.cuando) + '</b>' +
           (viejo ? ' — <b>hace ' + mvNum(act.horas) + ' horas</b>. El refresco de la madrugada ' +
                    'no corrió: puede faltar lo de hoy.'
                  : '. Se refresca solo todas las mañanas.') + '</div>');
  }

  /* 3. tarjetas */
  h.push('<div class="mv-tarjetas">');
  h.push(mvTarjeta(mvDec(r.margen_pct) + '%', 'margen sobre el precio de venta',
                   'ganancia ÷ facturado', 'ok'));
  if (r.margen_sobre_costo !== null && r.margen_sobre_costo !== undefined){
    h.push(mvTarjeta(mvDec(r.margen_sobre_costo) + '%', 'margen sobre el costo',
                     'así lo calcula DISSAN', 'ok'));
  }
  h.push(mvTarjeta(mvMillones(r.margen_bruto), 'ganancia bruta',
                   mvPesos(r.margen_bruto) + ' · ' + mvNum(r.medidos) + ' renglones', 'ok'));
  h.push(mvTarjeta(mvMillones(r.facturado), 'facturado medido',
                   mvPesos(r.facturado) + ' · costo ' + mvPesos(r.costo), ''));
  h.push(mvTarjeta(mvNum(r.bajo_costo_n), 'renglones bajo el costo',
                   mvNum(r.articulos) + ' artículos distintos',
                   Number(r.bajo_costo_n) > 0 ? 'mal' : 'ok'));
  h.push(mvTarjeta(mvPesos(r.perdida), 'cuánto se perdió ahí',
                   'sólo esos renglones', Number(r.perdida) > 0 ? 'mal' : 'ok'));
  if (Number(r.cuarentena_n || 0) > 0){
    h.push(mvTarjeta(mvNum(r.cuarentena_n), 'apartados en cuarentena',
                     mvPesos(r.cuarentena_monto) + ' — no sumados', 'ojo'));
  }
  h.push('</div>');

  /* 4. la cobertura, siempre declarada con su denominador */
  h.push('<div class="mv-aviso ok"><b>Cobertura: ' + mvDec(r.cobertura_pct) + '%.</b> ' +
         'De los ' + mvNum(r.renglones_totales) + ' renglones que entran en esos filtros se miden ' +
         mvNum(r.medidos) + '. El resto no tiene costo confiable y queda afuera. ' +
         '<b>No dice que el resto esté bien: dice que no se puede saber.</b>' +
         (Number(r.costo_posterior || 0) > 0
            ? ' <b style="color:var(--mal)">Atención: ' + mvNum(r.costo_posterior) +
              ' renglones están costeados con una compra posterior a la venta.</b>'
            : ' Ningún renglón está costeado con una compra posterior a la venta.') +
         '</div>');

  /* 5. calidad del costo: lo confiable separado de lo que no lo es */
  var cal = d.calidad || [];
  if (cal.length){
    h.push('<div class="mv-sec">De dónde sale el costo' +
           '<small>Sólo se suman las filas que empiezan con A. Las B usan un costo de más de ' +
           '180 días: en pesos nominales eso infla el margen y no se puede llamar rentabilidad. ' +
           'Las C no tienen ninguna compra con la que medirse.</small></div>');
    h.push('<div class="mv-tb-caja" style="max-height:none"><table class="mv-tb"><thead><tr>' +
           '<th>Calidad del costo</th><th class="mv-num">Renglones</th>' +
           '<th class="mv-num">Venta</th><th class="mv-num">% de la venta</th>' +
           '<th class="mv-num">Margen</th></tr></thead><tbody>');
    for (var ci = 0; ci < cal.length; ci++){
      var c = cal[ci];
      var fuera = String(c.calidad || '').charAt(0) !== 'A';
      h.push('<tr' + (fuera ? ' class="aparte"' : '') + '><td>' + mvEsc(c.calidad) + '</td>' +
             '<td class="mv-num">' + mvNum(c.renglones) + '</td>' +
             '<td class="mv-num">' + mvPesos(c.venta) + '</td>' +
             '<td class="mv-num">' + mvDec(c.pct_venta) + '%</td>' +
             '<td class="mv-num">' + (c.margen_pct === null ? '—' : mvDec(c.margen_pct) + '%') +
             '</td></tr>');
    }
    h.push('</tbody></table></div>');
  }

  /* 6. grafico chico: margen mes a mes, SOBRE LO FILTRADO */
  var pm = (d.por_mes || []).filter(function(m){ return Number(m.n || 0) > 0; });
  if (pm.length > 1){
    h.push('<div class="mv-sec">Margen mes a mes' +
           '<small>Sobre lo que entra en estos filtros, no sobre todo. ' +
           'Porcentaje del facturado de cada mes.</small></div>');
    h.push(mvGrafBarras(pm, 'mes', 'margen', function(f){
      return f.mes + ' — margen ' + mvDec(f.margen) + '% en ' + mvNum(f.n) + ' renglones';
    }, function(f){ return mvDec(f.margen) + '%'; }, 'v', 58));
  }

  /* 7. EL DETALLE: las 23 columnas de la planilla de DISSAN */
  h.push(mvTablaDetalle());

  /* 8. cuarentena: para ir a corregir */
  var cu = d.cuarentena || [];
  if (cu.length){
    h.push('<div class="mv-sec">Para corregir a mano' +
           '<small>Costo cuatro veces el precio de venta o más, o menor al 5% del precio. ' +
           'Nadie vende sistemáticamente a un cuarto de lo que pagó: es error de carga, de ' +
           'unidad de envase, o el código se usa para facturar otra cosa. NO están sumados ' +
           'arriba.</small></div>');
    h.push('<div class="mv-tb-caja"><table class="mv-tb"><thead><tr>' +
           '<th>Artículo</th><th>Detalle</th><th>Cliente</th><th>Fecha</th>' +
           '<th class="mv-num">Vendió a<br>(x unidad)</th>' +
           '<th class="mv-num">Costo<br>(x unidad)</th>' +
           '<th class="mv-num">Veces el<br>precio</th>' +
           '<th class="mv-num">Dice perder<br>(el renglón)</th>' +
           '</tr></thead><tbody>');
    for (var q = 0; q < cu.length; q++){
      h.push('<tr class="aparte"><td class="mv-cod">' + mvEsc(cu[q].articulo) + '</td>' +
             '<td class="mv-desc" title="' + mvEsc(cu[q].detalle) + '">' + mvEsc(cu[q].detalle) + '</td>' +
             '<td>' + mvEsc(cu[q].cliente) + '</td>' +
             '<td>' + mvEsc(cu[q].fecha) + '</td>' +
             mvCelPrecio(cu[q].vendio) +
             mvCelPrecio(cu[q].costo) +
             '<td class="mv-num">' + mvVeces(cu[q].vendio, cu[q].costo) + '</td>' +
             mvCelPerder(cu[q].dice_perder) + '</tr>');
    }
    h.push('</tbody></table></div>');
  }

  h.push('<div class="mv-pie">Los diez que más ganaron, los diez que más perdieron y la ' +
         'concentración por cliente están en el <b>Tablero general</b>, que es la pantalla ' +
         'para mirar el negocio entero. Ésta es la de detalle.</div>');

  estado.innerHTML = '';
  cuerpo.innerHTML = h.join('');
  cuerpo.hidden = false;
  mvConectarTips(cuerpo);
}

/* ---------- las 23 columnas de la planilla de DISSAN ---------- */
function mvTablaDetalle(){
  var det = MV.detalle;
  var h = [];

  h.push('<div class="mv-sec">Orden de compra contra el pedido de venta — renglón por renglón' +
         '<small>Las columnas de la planilla que pasó DISSAN. El número de pedido es el que ' +
         'Compras escribió en las observaciones del renglón de la orden de compra. ' +
         'El precio de la OC ya tiene aplicadas las bonificaciones y, cuando el artículo se ' +
         'compra por caja, está dividido por el factor de envase verificado.</small></div>');

  if (!det){
    h.push('<div class="mv-vacio">No se pidió el detalle.</div>');
    return h.join('');
  }
  if (det.error){
    h.push('<div class="mv-aviso mal">No se pudo traer el detalle: ' + mvEsc(det.error) + '</div>');
    return h.join('');
  }
  var filas = det.filas || det;
  if (!filas || !filas.length){
    h.push('<div class="mv-vacio">Ningún renglón de orden de compra entra en estos filtros. ' +
           'Puede ser que el período no tenga OC con el pedido cargado en las observaciones: ' +
           'el circuito no existía en 2022 ni 2023, y en 2026 cubre el 30% de los renglones. ' +
           'Probá un período más largo o sacá algún filtro.</div>');
    return h.join('');
  }

  var nComp = 0, nBajo = 0, venta = 0, costo = 0;
  for (var i = 0; i < filas.length; i++){
    var f = filas[i];
    if (f.comparable === 'SI'){
      nComp++;
      venta += Number(f.venta_comparable || 0);
      costo += Number(f.costo_comparable || 0);
      if (Number(f.margen_pesos || 0) < 0) nBajo++;
    }
  }
  var mPrecio = venta > 0 ? 100 * (venta - costo) / venta : null;
  var mCosto  = costo > 0 ? 100 * (venta - costo) / costo : null;

  h.push('<div class="mv-aviso ok"><b>' + mvNum(filas.length) + ' renglones</b>, de los que ' +
         '<b>' + mvNum(nComp) + ' son comparables</b> (los demás tienen la OC anulada, sin ' +
         'precio, o el costo cae en cuarentena — la columna Observación lo dice en cada uno). ' +
         'Venta comparable <b>' + mvPesos(venta) + '</b>, costo <b>' + mvPesos(costo) + '</b>, ' +
         'margen <b>' + (mPrecio === null ? '—' : mvDec(mPrecio) + '%') + ' sobre el precio</b> y ' +
         '<b>' + (mCosto === null ? '—' : mvDec(mCosto) + '%') + ' sobre el costo</b>' +
         (nBajo ? '. <b style="color:var(--mal)">' + mvNum(nBajo) + ' renglones están por debajo ' +
                  'del costo de la orden de compra.</b>' : '. Ninguno por debajo del costo.') +
         '</div>');

  h.push('<div class="mv-tb-caja"><table class="mv-tb"><thead><tr>' +
         '<th>OC</th><th>Fecha OC</th><th>Proveedor</th>' +
         '<th>Pedido</th><th>Fecha pedido</th><th>Cliente</th>' +
         '<th>Artículo</th><th>Descripción</th>' +
         '<th class="mv-num">Cant. ped.</th><th class="mv-num">Precio venta</th>' +
         '<th class="mv-num">Cant. OC</th><th class="mv-num">Precio OC</th>' +
         '<th class="mv-num">Bonif. %</th><th class="mv-num">Precio OC neto</th>' +
         '<th>Mon.</th><th class="mv-num">Cant. comp.</th>' +
         '<th class="mv-num">Venta comp.</th><th class="mv-num">Costo comp.</th>' +
         '<th class="mv-num">Margen $</th><th class="mv-num">Margen x u.</th>' +
         '<th class="mv-num" title="Margen sobre el PRECIO DE VENTA: ' +
         '(venta − costo) ÷ venta. Es la columna «Costo Vta» del Excel de DISSAN.">' +
         'Margen %</th>' +
         /* LA COLUMNA QUE PIDIÓ DISSAN, 23/10/2026.
            Su Excel la llama MarkUp y la calcula = PxV/PxC − 1, que es lo
            mismo que (venta − costo) ÷ costo: el margen medido sobre el
            COSTO, no sobre el precio. Con sus propios números del archivo
            (venta 201.549.972, costo 132.832.842) da 51,7%, que es el
            mismo «sobre el costo» que ya dice el renglón de arriba.
            Acá va renglón por renglón, que es lo que faltaba. */
         '<th class="mv-num" title="MarkUp, como lo calcula el Excel de DISSAN: ' +
         'Precio de venta ÷ Precio de costo − 1. Es el margen medido sobre el COSTO.">' +
         'MarkUp %</th>' +
         '<th>Comp.</th><th>Observación</th>' +
         '</tr></thead><tbody>');

  for (var j = 0; j < filas.length; j++){
    var x = filas[j];
    var clase = x.comparable !== 'SI' ? ' class="aparte"'
              : (Number(x.margen_pesos || 0) < 0 ? ' class="alerta"' : '');
    h.push('<tr' + clase + '>' +
      '<td class="mv-cod">' + mvEsc(x.oc_nro) + '</td>' +
      '<td>' + mvFecha(x.fecha_oc) + '</td>' +
      '<td class="mv-desc" title="' + mvEsc(x.proveedor) + '">' + mvEsc(x.proveedor) + '</td>' +
      '<td class="mv-cod">' + mvEsc(x.pedido_nro) + '</td>' +
      '<td>' + mvFecha(x.fecha_pedido) + '</td>' +
      '<td class="mv-desc" title="' + mvEsc(x.cliente) + '">' + mvEsc(x.cliente) + '</td>' +
      '<td class="mv-cod">' + mvEsc(x.codigo_articulo) + '</td>' +
      '<td class="mv-desc" title="' + mvEsc(x.descripcion) + '">' + mvEsc(x.descripcion) + '</td>' +
      '<td class="mv-num"' + mvDatoV(x.cant_pedido) + '>' + mvNum(x.cant_pedido) + '</td>' +
      '<td class="mv-num"' + mvDatoV(x.precio_venta_unit) + '>' + mvPrecio(x.precio_venta_unit) + '</td>' +
      '<td class="mv-num"' + mvDatoV(x.cant_oc) + '>' + mvNum(x.cant_oc) + '</td>' +
      '<td class="mv-num"' + mvDatoV(x.precio_oc_unit) + '>' + mvPrecio(x.precio_oc_unit) + '</td>' +
      '<td class="mv-num"' + mvDatoV(x.porc_bonif) + '>' + mvDec(x.porc_bonif) + '</td>' +
      '<td class="mv-num"' + mvDatoV(x.precio_oc_neto) + '>' + mvPrecio(x.precio_oc_neto) + '</td>' +
      '<td>' + mvEsc(x.moneda) + '</td>' +
      '<td class="mv-num"' + mvDatoV(x.cant_comparable) + '>' + mvNum(x.cant_comparable) + '</td>' +
      /* la pantalla redondea a pesos; el archivo se lleva el exacto */
      '<td class="mv-num"' + mvDatoV(x.venta_comparable) + '>' + mvPesos(x.venta_comparable) + '</td>' +
      '<td class="mv-num"' + mvDatoV(x.costo_comparable) + '>' + mvPesos(x.costo_comparable) + '</td>' +
      '<td class="mv-num"' + mvDatoV(x.margen_pesos) + '>' + mvPesos(x.margen_pesos) + '</td>' +
      '<td class="mv-num"' + mvDatoV(x.margen_unitario) + '>' + mvPrecio(x.margen_unitario) + '</td>' +
      '<td class="mv-num"' + mvDatoV(x.margen_pct) + '>' +
        (x.margen_pct === null || x.margen_pct === undefined
          ? '—' : mvDec(x.margen_pct) + '%') + '</td>' +
      mvCelMarkup(x.venta_comparable, x.costo_comparable) +
      '<td>' + (x.comparable === 'SI' ? 'sí' : '<span class="mv-marca">no</span>') + '</td>' +
      '<td class="mv-obs">' + mvEsc(x.observacion) + '</td></tr>');
  }
  h.push('</tbody></table></div>');
  h.push('<div class="mv-pie">Las filas en tono salmón están por debajo del costo de la OC. ' +
         'Las amarillentas no son comparables y no suman a ninguna cifra.</div>');
  return h.join('');
}

function mvTarjeta(n, r, p, clase){
  return '<div class="mv-t"><div class="n ' + (clase||'') + '">' + n + '</div>' +
         '<div class="r">' + mvEsc(r) + '</div>' +
         (p ? '<div class="p">' + mvEsc(p) + '</div>' : '') + '</div>';
}

/* ---------- grafico chico de barras horizontales ----------
   barras finas, pasteles, y el numero escrito al lado: ninguna lectura
   depende del color. */
function mvGrafBarras(filas, campoEt, campoVal, fnTip, fnTexto, tono, anchoEt){
  if (!filas || !filas.length) return '';
  var max = 0;
  for (var i = 0; i < filas.length; i++) max = Math.max(max, Math.abs(Number(filas[i][campoVal] || 0)));
  if (max <= 0) max = 1;

  var aEt = anchoEt || 90, aBarra = 380, alto = 19, pad = 7, aNum = 72;
  var total = aEt + aBarra + aNum;
  var h = alto * filas.length + pad * 2;
  var s = ['<div class="mv-graf"><div class="mv-tip"></div>',
           '<svg viewBox="0 0 ' + total + ' ' + h + '" role="img" aria-label="gráfico de barras">'];

  for (var j = 0; j < filas.length; j++){
    var f = filas[j];
    var v = Number(f[campoVal] || 0);
    var y = pad + j * alto;
    var w = Math.max(1, Math.round(aBarra * Math.abs(v) / max));
    s.push('<g class="f" data-tip="' + mvEsc(fnTip(f)) + '">');
    s.push('<text class="et" x="0" y="' + (y + 10) + '">' + mvEsc(f[campoEt]) + '</text>');
    s.push('<rect class="b ' + (v < 0 ? 'r' : (tono || '')) + '" x="' + aEt + '" y="' + (y + 3) +
           '" width="' + w + '" height="' + (alto - 8) + '"></rect>');
    s.push('<text class="val" x="' + (aEt + w + 6) + '" y="' + (y + 10) + '">' +
           mvEsc(fnTexto(f)) + '</text>');
    s.push('<rect class="z" x="0" y="' + y + '" width="' + total + '" height="' + alto + '"></rect>');
    s.push('</g>');
  }
  s.push('<line class="eje" x1="' + (aEt - 1) + '" y1="' + (pad - 3) +
         '" x2="' + (aEt - 1) + '" y2="' + (h - pad + 3) + '"></line>');
  s.push('</svg></div>');
  return s.join('');
}

/* ---------- tooltips ---------- */
function mvConectarTips(raiz){
  var graficos = raiz.querySelectorAll('.mv-graf');
  for (var g = 0; g < graficos.length; g++){
    (function(grafico){
      var tip = grafico.querySelector('.mv-tip');
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
   core.js llama calcular() al entrar. La primera vez arma los buscadores, engancha
   los botones y pone el mes corriente; despues cada apretada de Calcular pasa por
   mvCargar(), igual que en el panel de siempre. */
var MV_ARMADO = false;
function calcular(){
  if (MV_ARMADO) { mvCargar(); return; }
  MV_ARMADO = true;
  for (var i = 0; i < PICKERS.length; i++) mvArmarPicker(PICKERS[i]);

  document.getElementById('mvAplicar').addEventListener('click', mvCargar);

  document.getElementById('mvTexto').addEventListener('keydown', function(ev){
    if (ev.key === 'Enter') mvCargar();
  });

  document.getElementById('mvVerMas').addEventListener('click', function(){
    var caja = document.getElementById('mvMasCampos');
    caja.hidden = !caja.hidden;
    this.textContent = caja.hidden ? 'Más filtros ▾' : 'Menos filtros ▴';
  });

  document.getElementById('mvLimpiar').addEventListener('click', function(){
    var textos = ['mvDesde','mvHasta','mvTexto','mvMargenMin','mvMargenMax','mvVentaMin'];
    for (var i = 0; i < textos.length; i++) document.getElementById(textos[i]).value = '';
    document.getElementById('mvSolo').checked = false;
    document.getElementById('mvAprox').checked = false;
    document.getElementById('mvPrueba').checked = false;
    document.getElementById('mvProductos').checked = true;
    for (var j = 0; j < PICKERS.length; j++){
      if (MV['limpiar' + PICKERS[j]]) MV['limpiar' + PICKERS[j]]();
    }
    mvCargar();
  });

  /* arranca en el mes corriente: traer todo el periodo en la pantalla de
     detalle son 20.000 renglones y no se lee. El tablero general es el que
     mira todo. */
  var hoy = new Date();
  var p = function(n){ return (n < 10 ? '0' : '') + n; };
  document.getElementById('mvDesde').value =
    hoy.getFullYear() + '-' + p(hoy.getMonth() + 1) + '-01';
  document.getElementById('mvHasta').value =
    hoy.getFullYear() + '-' + p(hoy.getMonth() + 1) + '-' + p(
      new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate());

  mvCargar();   // la primera vez trae todo y de paso llena los buscadores
}
