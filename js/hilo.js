
/* El puente del panel viejo llamaba a Apps Script por nombre. Aca cada nombre es su
   funcion de la base, llamada directo por PostgREST con el JWT: son las MISMAS tres. */
var HILO_RPC = {
  apiHiloMapa:    function(a){ return ['api_hilo_mapa',    {}]; },
  apiHiloVecinos: function(a){ return ['api_hilo_vecinos',
                                       { p_tabla: a[0], p_incluir_dudosas: a[1] === true }]; },
  apiHiloCamino:  function(a){ return ['api_hilo_camino',
                                       { p_origen: a[0], p_destino: a[1],
                                         p_max_saltos: a[2] || 6 }]; }
};

function hiloPedir(fn, args, caja, boton, alLlegar){
  if (boton) boton.disabled = true;
  var par = HILO_RPC[fn](args || []);
  rpc(par[0], par[1]).then(function(res){
      if (boton) boton.disabled = false;
      var r = res.data;
      if (!r){
        caja.innerHTML = '<div class="hil-mal">Sin respuesta</div>';
        return;
      }
      alLlegar(r);
    })
    .catch(function(e){
      if (boton) boton.disabled = false;
      caja.innerHTML = '<div class="hil-mal">No se pudo consultar: ' +
                       esc((e && e.message) || 'error') + '</div>';
    });
}

/* core.js llama calcular() al entrar. */
function calcular(){ return iniciarHilo(); }

function iniciarHilo(){
  var c = document.getElementById('hilMapa');
  c.textContent = 'Leyendo el mapa medido...';
  hiloPedir('apiHiloMapa', [], c, null, function(res){
    var m = (res.filas ? res.filas[0] : res[0]) || res || {};
    c.innerHTML = '<div class="hil-tarjetas">' +
      hiloT(m.tablas_en_el_grafo, 'tablas en el mapa') +
      hiloT(m.aristas_usables,    'relaciones usables') +
      hiloT(m.confirmadas, 'integridad 100%', '#3DD68C') +
      hiloT(m.probables,   'probables',       '#E8C468') +
      hiloT(m.parciales,   'parciales',       '#FF8A8A') +
      hiloT(m.descartadas, 'descartadas: el hilo NO las usa') +
      '</div>';
  });
}

function hiloT(v, r, color){
  var t = (v === null || v === undefined) ? '—' : Number(v).toLocaleString('es-AR');
  return '<div class="hil-t"><div class="n"' + (color ? ' style="color:' + color + '"' : '') + '>' +
         esc(t) + '</div><div class="r">' + esc(r) + '</div></div>';
}

function hiloVecinas(){
  var t = document.getElementById('hilTabla').value.trim();
  var caja = document.getElementById('hilR1'), b = document.getElementById('hilB1');
  if (!t){ caja.innerHTML = '<div class="hil-no">Escribí el nombre de una tabla.</div>'; return; }
  caja.innerHTML = '<p style="font-size:13px;margin-top:10px">Buscando...</p>';
  hiloPedir('apiHiloVecinos', [t, false], caja, b, function(r){
    var op = r.misma_operacion || [], fi = r.fichas_relacionadas || [];
    if (!op.length && !fi.length){
      caja.innerHTML = '<div class="hil-no"><strong>' + esc(r.tabla) +
        '</strong> no tiene relaciones medidas con cobertura suficiente.</div>'; return; }

    /* «filas medidas en el mapa», no «filas». El numero sale de motor.senal_tabla,
       que se midio cuando se armo el mapa, y la carga nocturna sigue agregando
       renglones: el 22/10 gva53 decia 52.690 y la tabla tenia 53.768. Las
       coberturas de abajo estan calculadas sobre ESE denominador, asi que el
       numero no esta mal — lo que estaba mal era llamarlo «filas» a secas, que
       se lee como «lo que hay hoy». */
    var h = '<div style="margin-top:12px;font-size:13px">' + esc(r.tabla) + ' — ' +
            Number(r.filas||0).toLocaleString('es-AR') + ' filas medidas en el mapa · ' +
            (r.clase === 'documento' ? 'comprobante' : 'ficha') +
            '<span title="Las coberturas de abajo se midieron sobre esta cantidad de ' +
            'filas. La tabla puede tener mas hoy: la carga nocturna agrega todas las ' +
            'mañanas." style="opacity:.55"> ⓘ</span></div>';

    if (op.length){
      h += '<div style="margin-top:14px;font-size:12.5px;color:#3DD68C;font-weight:700">' +
           'MISMA OPERACIÓN<span class="hil-tag tg-op">el hilo camina por acá</span></div>' +
           hiloTabla(op, true);
    }
    if (fi.length){
      h += '<div style="margin-top:18px;font-size:12.5px;color:#8FB8E8;font-weight:700">' +
           'FICHAS RELACIONADAS<span class="hil-tag tg-fi">no se cruzan</span></div>' +
           '<p class="ayuda" style="margin:6px 0 0">Dicen a quién o a qué corresponde esta fila. ' +
           'Cruzarlas saltaría a todas las operaciones que comparten ese valor.</p>' +
           hiloTabla(fi, false);
    }
    caja.innerHTML = h;
  });
}

function hiloTabla(lista, conAviso){
  var h = '<table class="hil"><thead><tr><th>Tabla</th><th>Módulo</th><th class="num">Filas</th>' +
          '<th>Se une por</th><th>Card.</th><th class="num">Cobertura</th>' +
          (conAviso ? '<th>Aviso</th>' : '') + '</tr></thead><tbody>';
  lista.forEach(function(x){
    h += '<tr><td><strong>' + esc(x.tabla) + '</strong></td><td>' + esc(x.modulo || '') + '</td>' +
         '<td class="num">' + Number(x.filas||0).toLocaleString('es-AR') + '</td>' +
         '<td>' + esc(x.por) + '</td><td>' + esc(x.cardinalidad) + '</td>' +
         '<td class="num">' + esc(x.cobertura_pct) + '%</td>' +
         (conAviso ? '<td>' + (x.multiplica ? '<span style="color:#E8C468">multiplica</span>'
                                            : 'seguro') + '</td>' : '') + '</tr>';
  });
  return h + '</tbody></table>';
}

function hiloCamino(){
  var d = document.getElementById('hilD').value.trim();
  var h2 = document.getElementById('hilH').value.trim();
  var caja = document.getElementById('hilR2'), b = document.getElementById('hilB2');
  if (!d || !h2){ caja.innerHTML = '<div class="hil-no">Completá las dos tablas.</div>'; return; }
  caja.innerHTML = '<p style="font-size:13px;margin-top:10px">Buscando el camino...</p>';
  hiloPedir('apiHiloCamino', [d, h2, 6], caja, b, function(r){
    if (!r.encontrado){
      caja.innerHTML = '<div class="hil-no"><strong>No hay camino de operación entre ' +
        esc(r.origen) + ' y ' + esc(r.destino) + '.</strong><br>' + esc(r.motivo) + '</div>';
      return;
    }
    var out = '<div class="hil-ok"><strong>' + r.saltos + ' paso(s)</strong> · ' +
      esc(r.confianza) + '<br>' + esc(r.aviso) + '</div>' +
      '<div style="margin-top:10px;font-size:13px;color:#9FB3C8">' +
      (r.ruta || []).map(function(x){ return esc(x); }).join(' <span style="color:#54708C">→</span> ') + '</div>';
    (r.pasos || []).forEach(function(p, i){
      out += '<div class="hil-paso">' + (i+1) + '. ' + esc(p) + '</div>';
    });
    caja.innerHTML = out;
  });
}
