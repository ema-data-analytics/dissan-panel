/* ===================================================================
   AYUDA INTELIGENTE  —  el modulo de Apps Script, tal cual, en la
   plataforma nueva.
   -------------------------------------------------------------------
   El marcado, la hoja de estilo y TODA la logica de pantalla (los
   ejemplos, el sello, la tabla, el grafico de barras, la lectura, el
   pulgar, el reporte, el imprimir) son los del modulo viejo, copiados
   verbatim. Lo unico que cambia son los SIETE puentes que iban por
   google.script.run:

     apiPreguntar      -> rpc api_preguntar
     apiAyudaIA        -> Edge Function «preguntar»
     apiAyudaLectura   -> Edge Function «leer»    (+ api_preguntar_todo)
     apiAyudaPulgar    -> rpc api_ayuda_pulgar
     apiAyudaExcelVale -> Edge Function «excel»   (+ api_preguntar_todo)
     apiAyudaHtmlVale  -> se arma y baja acá, sin servidor
     apiAyudaFilas     -> rpc api_preguntar_todo (tope 5000)

   POR QUE DESAPARECEN EL VALE Y LA FUNCION «bajar»: ese rodeo existia
   porque el panel viejo vive en un iframe con sandbox y ahi un blob no
   baja. Esta pagina no tiene sandbox. Ademas app_vale_excel_crear pide
   el uuid de «sesiones», que en esta plataforma no existe.

   Y NO SE USA sb.functions.invoke: con payloads grandes devuelve
   «Edge Function returned a non-2xx status code» mientras un fetch
   crudo al mismo endpoint devuelve 200 y el archivo entero (medido el
   20/10). Va fetch, con el codigo HTTP y el cuerpo del error a la vista.
   =================================================================== */

var AY_TOPE = 5000;   /* lo que se LLEVA al archivo; la pantalla muestra lo que trae la intencion */

/* Una rpc que ademas deja el tiempo medido adentro de la respuesta,
   porque el pie de la pantalla lo muestra. */
function AY_RPC(fn, args){
  var t0 = performance.now();
  return sb.rpc(fn, args).then(function(res){
    if (res.error) throw new Error(res.error.message || 'no contesto');
    var d = res.data;
    var ms = Math.round(performance.now() - t0);
    if (d && typeof d === 'object' && d.ms == null) d.ms = ms;
    return d;
  });
}

/* Edge Function por fetch crudo, con un reintento. */
function AY_FN(nombre, cuerpo, intento){
  intento = intento || 1;
  return sb.auth.getSession().then(function(s){
    var ses = s && s.data ? s.data.session : null;
    if (!ses) throw new Error('La sesion vencio. Volve a entrar.');
    return fetch(SB_URL + '/functions/v1/' + nombre, {
      method: 'POST',
      headers: { 'Content-Type':'application/json',
                 'Authorization':'Bearer ' + ses.access_token,
                 'apikey': SB_KEY },
      body: JSON.stringify(cuerpo)
    });
  }).then(function(r){
    return r.text().then(function(txt){
      if (!r.ok) throw new Error('HTTP ' + r.status + ' · ' + txt.slice(0,160));
      try { return JSON.parse(txt); }
      catch(e){ throw new Error('contesto algo que no se pudo leer'); }
    });
  }).catch(function(e){
    if (intento < 2) return AY_FN(nombre, cuerpo, intento + 1);
    throw e;
  });
}

/* Las filas COMPLETAS de una pregunta que resolvio una intencion.
   api_preguntar_todo es igual a api_preguntar salvo el tope, y NO anota en
   ayuda.registro: la pantalla ya anoto la pregunta. */
function AY_TODAS(pregunta){
  return AY_RPC('api_preguntar_todo',
                { p_texto: pregunta, p_contexto: null, p_tope: AY_TOPE });
}

/* El titulo y el aviso que la Edge Function pone en el encabezado. */
function AY_TITULO(p){
  var q = (p && p.entendido && p.entendido.que)    ? p.entendido.que    : {};
  var c = (p && p.entendido && p.entendido.cuando) ? p.entendido.cuando : {};
  var partes = [];
  if (q.titulo)   partes.push(q.titulo);
  if (c.etiqueta) partes.push(c.etiqueta);
  return partes.join(' · ');
}

/* Baja un archivo ya armado acá. Sin sandbox, un blob baja. */
function AY_BAJAR_BLOB(bytes, tipo, nombre){
  var url = URL.createObjectURL(new Blob([bytes], { type: tipo }));
  var a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 20000);
  return url;
}

function AY_B64_BYTES(b64){
  var bin = atob(b64), buf = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

/* core.js llama calcular() al entrar. Acá eso es armar la pantalla. */
var AY_ARMADO = false;
function calcular(){
  if (AY_ARMADO) { document.getElementById('ayQ').focus(); return; }
  AY_ARMADO = true;
  iniciarAyuda();
}

var AY = { item:null, enviando:false, gasto:0, lectura:0 };
var AY_PRECIO = { entrada:1.00, salida:5.00, cache:0.10 };   // US$ por millón de tokens

var AY_EJEMPLOS = [
  ['Stock',   ['cuántos artículos tienen stock cero',
               'cuáles son los 10 artículos con más stock',
               'dame los 3 depósitos con más artículos']],
  ['Ventas',  ['cuáles son los 5 clientes con más facturas',
               'cuáles son los 10 artículos más vendidos',
               'cuáles son las 5 provincias con más clientes']],
  ['Compras', ['cuáles son los 5 proveedores a los que más les compramos',
               'cuántas órdenes de compra hay',
               'cuántos proveedores tenemos']]
];

function ayNum(n, d){ return Number(n).toLocaleString('es-AR',
  { minimumFractionDigits:d||0, maximumFractionDigits:(d===undefined?2:d) }); }
function ayEsNum(v){ return typeof v === 'number' && isFinite(v); }
function ayValor(v){
  if (v === null || v === undefined) return '<span class="ay-nulo">—</span>';
  if (ayEsNum(v)) return esc(ayNum(v));
  if (typeof v === 'object') return esc(JSON.stringify(v));
  return esc(v);
}
function ayPlata(u){ return 'US$ ' + u.toLocaleString('es-AR',{minimumFractionDigits:4, maximumFractionDigits:4}); }
function ayCosto(tk){
  if (!tk) return 0;
  return ((tk.entrada||0)*AY_PRECIO.entrada + (tk.salida||0)*AY_PRECIO.salida
        + (tk.cache_lectura||0)*AY_PRECIO.cache) / 1e6;
}

/** ¿Se puede dibujar? Una columna de texto, una de números, entre 2 y 30 filas. */
function ayGraficable(datos){
  if (!datos || datos.length < 2 || datos.length > 30) return null;
  var cols = Object.keys(datos[0]);
  var num = cols.filter(function(c){ return datos.every(function(f){ return f[c]===null || ayEsNum(f[c]); }); });
  var txt = cols.filter(function(c){ return num.indexOf(c) < 0; });
  if (!num.length || !txt.length) return null;
  return { etiqueta: txt[0], valor: num[0] };
}

/** Barras horizontales desde el cero. Si hay negativos, el cero va al medio. */
function ayBarras(datos, ej, ancho){
  var ALTO=20, SEP=7, IZQ=Math.min(220, ancho*0.33), ARR=4;
  var vals = datos.map(function(f){ return Number(f[ej.valor]) || 0; });
  var hayNeg = vals.some(function(v){ return v < 0; });
  var DER = hayNeg ? 140 : 84;
  var util = Math.max(60, ancho - IZQ - DER);
  var bajo = Math.min.apply(null,[0].concat(vals)), alto = Math.max.apply(null,[0].concat(vals));
  var rango = (alto-bajo) || 1;
  var x = function(v){ return IZQ + ((v-bajo)/rango)*util; };
  var x0 = x(0), col = IZQ + util + 9;
  var h = ARR + datos.length*(ALTO+SEP);

  var s = '<svg viewBox="0 0 '+ancho+' '+h+'" role="img" aria-label="'+esc(ej.valor+' por '+ej.etiqueta)+'">';
  s += '<line class="eje" x1="'+x0.toFixed(1)+'" y1="'+ARR+'" x2="'+x0.toFixed(1)+'" y2="'+(h-SEP+2)+'"/>';
  datos.forEach(function(f,i){
    var y = ARR + i*(ALTO+SEP), v = vals[i];
    var ini = Math.min(x0,x(v)), fin = Math.max(x0,x(v)), w = Math.max(2, fin-ini);
    var et = String(f[ej.etiqueta] === null || f[ej.etiqueta] === undefined ? '' : f[ej.etiqueta]);
    var corto = et.length > 28 ? et.slice(0,27)+'…' : et;
    var txt = esc(ayNum(v));
    s += '<g class="f'+(v<0?' neg':'')+'" data-tip="'+esc(et+' · '+ayNum(v))+'">';
    s += '<text class="et" x="'+(IZQ-10)+'" y="'+(y+ALTO/2+4)+'" text-anchor="end">'+esc(corto)+'</text>';
    s += '<rect class="b" x="'+ini.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="'+ALTO+'"/>';
    s += hayNeg ? '<text class="val" x="'+col+'" y="'+(y+ALTO/2+4)+'">'+txt+'</text>'
                : '<text class="val" x="'+(fin+8).toFixed(1)+'" y="'+(y+ALTO/2+4)+'">'+txt+'</text>';
    s += '<rect class="z" x="0" y="'+(y-SEP/2)+'" width="'+ancho+'" height="'+(ALTO+SEP)+'"/></g>';
  });
  return s + '</svg>';
}

function ayMontarGrafico(cont, datos, ej){
  cont.innerHTML = '<p class="tit">'+esc(ej.valor)+' por '+esc(ej.etiqueta)+'</p>'
                 + ayBarras(datos, ej, Math.max(420, cont.clientWidth - 40))
                 + '<div class="ay-tip"></div>';
  var tip = cont.querySelector('.ay-tip');
  Array.prototype.forEach.call(cont.querySelectorAll('g.f'), function(g){
    g.addEventListener('mouseenter', function(){ tip.textContent = g.getAttribute('data-tip'); tip.style.opacity='1'; });
    g.addEventListener('mousemove', function(e){
      var r = cont.getBoundingClientRect(), m = tip.offsetWidth/2 + 4;
      tip.style.left = Math.min(Math.max(e.clientX-r.left, m), r.width-m)+'px';
      tip.style.top  = Math.max(tip.offsetHeight+2, e.clientY-r.top-8)+'px';
    });
    g.addEventListener('mouseleave', function(){ tip.style.opacity='0'; });
  });
}

/* ---------- preguntar ---------- */
/* =====================================================================
   PRIMERO LAS INTENCIONES, DESPUES EL MODELO        (14/10/2026)
   =====================================================================
   api_preguntar resuelve con las 49 intenciones cargadas: entiende el
   96,8% de las 124 preguntas que se hicieron de verdad y contesta con
   datos el 90,3%, SIN GASTAR UN TOKEN y sin poder inventar una consulta.
   Recien si no entiende o no trae filas se llama al modelo (apiAyudaIA).

   Por que importa el orden: el 14/10 la pantalla iba directo al modelo y
   servia de su memoria un SQL que ligaba cpa36.observaciones EN CRUDO
   contra gva21.nro_pedido -- cero coincidencias, asi que las columnas de
   orden de compra salian NULL en las 200 filas -- y filtraba
   extract(month)=8 sin anio, mezclando cuatro agostos. Devolvia 200
   filas con pinta de informe y los datos pedidos vacios.
   ===================================================================== */

function ayPreguntar(){
  if (AY.enviando) return;
  var texto = document.getElementById('ayQ').value.trim();
  if (!texto){ document.getElementById('ayQ').focus(); return; }

  AY.enviando = true;
  document.getElementById('ayEnviar').disabled = true;
  document.getElementById('ayResp').hidden = true;
  document.getElementById('ayEjemplos').hidden = true;
  document.getElementById('ayCargando').hidden = false;
  document.getElementById('ayCargandoTxt').textContent = 'Buscando en lo que ya sé contestar…';

  AY_RPC('api_preguntar', { p_texto: texto, p_contexto: null })
    .then(function(p){
      var sirve = p && p.entendio === true && Number(p.filas || 0) > 0;
      if (sirve){ ayTerminar(texto, ayDesdeIntencion(p)); return; }
      ayPreguntarModelo(texto, p);
    })
    .catch(function(){ ayPreguntarModelo(texto, null); });
}

/* pasa la respuesta de api_preguntar a la forma que pinta la pantalla */
function ayDesdeIntencion(p){
  var ent = (p.entendido && p.entendido.que) ? p.entendido.que : {};
  var cuando = (p.entendido && p.entendido.cuando) ? p.entendido.cuando : {};
  var nota = [];
  if (ent.titulo)      nota.push(ent.titulo);
  if (cuando.etiqueta) nota.push(cuando.etiqueta);
  return {
    ok: true, origen: 'intencion',
    respuesta: p.respuesta || '', datos: p.datos || [],
    columnas: p.columnas || [], sql: p.sql || '',
    aviso: p.aviso || '', nota: nota.join(' · '),
    confianza: p.confianza || '', tokens: null, ms: p.ms
  };
}

function ayPreguntarModelo(texto, deIntencion){
  document.getElementById('ayCargandoTxt').textContent = 'Buscando entre las 580 tablas…';
  var lento = setTimeout(function(){
    document.getElementById('ayCargandoTxt').textContent = 'Armando la consulta…'; }, 1400);

  AY_FN('preguntar', { pregunta: texto })
    .then(function(r){
      clearTimeout(lento);
      if (r && r.ok === false && (r.error === 'sin_sesion' || r.error === 'sin_permiso')){
        r = { ok:false, origen: r.error,
              respuesta: r.error === 'sin_sesion' ? 'Tu sesión venció. Volvé a entrar.'
                                                  : 'Tu usuario no tiene habilitado este módulo.' };
      }
      /* el modelo no pudo pero la intención SI había entendido: lo que dijo
         la intención suele ser la respuesta correcta, y es mejor que un error. */
      if ((!r || r.ok === false) && deIntencion && deIntencion.entendio === true &&
          deIntencion.respuesta){
        ayTerminar(texto, ayDesdeIntencion(deIntencion)); return;
      }
      ayTerminar(texto, r || { ok:false, origen:'api', respuesta:'No llegó respuesta.' });
    })
    .catch(function(err){
      clearTimeout(lento);
      if (deIntencion && deIntencion.entendio === true){
        ayTerminar(texto, ayDesdeIntencion(deIntencion)); return;
      }
      ayTerminar(texto, { ok:false, origen:'red',
        respuesta:'No se pudo llegar al servidor. Probá de nuevo en un momento.',
        motivo: (err && err.message) ? err.message : '' });
    });
}

function ayTerminar(pregunta, r){
  AY.enviando = false;
  document.getElementById('ayEnviar').disabled = false;
  document.getElementById('ayCargando').hidden = true;
  var costo = ayCosto(r.tokens);
  AY.gasto += costo;
  AY.item = { pregunta: pregunta, r: r, costo: costo, vista: 'tabla' };
  ayPintar(AY.item);
  document.getElementById('ayQ').value = '';
  ayAjustar();
  ayPedirLectura(AY.item);
}

/* =====================================================================
   LA LECTURA                                           15/10/2026
   =====================================================================
   La intencion traia el dato en 0,8 s y dejaba una tabla de 23 columnas
   para que la lea el usuario. El no pregunta para ver una tabla:
   pregunta para que le digan QUE PASA.

   Esto corre DESPUES de pintar, no antes: la tabla ya esta a los 0,8 s y
   la lectura se completa arriba a los ~28 s. Si se hace otra pregunta
   mientras tanto, la lectura vieja se descarta por el sello AY.lectura.

   Los totales los calcula la base (api_ia_resumen_datos); el modelo solo
   lee. Por eso ninguna cifra de la lectura sale de una estimacion.
   ===================================================================== */
function ayPedirLectura(item){
  var r = item.r;
  if (!r || r.ok !== true) return;
  var datos = (r.datos && r.datos.length) ? r.datos : [];
  if (!datos.length) return;

  var sello = ++AY.lectura;
  var caja  = document.getElementById('ayLectura');
  if (!caja) return;

  caja.className = 'ay-lectura pensando';
  caja.innerHTML = '<div class="enc">La lectura<span class="de">leyendo ' +
    ayNum(datos.length,0) + (datos.length === 1 ? ' renglón' : ' renglones') +
    '…</span></div>' +
    '<div class="txt">Tarda unos segundos: mira los renglones uno por uno antes de ' +
    'contestar. La tabla de abajo ya está.</div>';

  /* cuando la respuesta salio de una INTENCION el servidor vuelve a buscar las
     filas solo (0,8 s) y no hay que subir 200 KB al servidor. Cuando
     salio del modelo, el servidor no sabe como conseguirlas sin volver a gastar
     tokens, asi que van desde aca. */
  var deLaPantalla = (r.origen === 'intencion') ? null : datos;

  /* Cuando la respuesta salio de una INTENCION se vuelven a buscar las filas
     COMPLETAS: la pantalla muestra 50 y la lectura tiene que leerlas todas.
     Cuando salio del modelo, las filas de la pantalla son las unicas que hay
     sin volver a gastar tokens. */
  var traer = deLaPantalla
    ? Promise.resolve({ datos: deLaPantalla, titulo: '', aviso: '' })
    : AY_TODAS(item.pregunta).then(function(p){
        if (p && p.entendio === true && p.datos && p.datos.length)
          return { datos: p.datos, titulo: AY_TITULO(p), aviso: p.aviso || '' };
        return { datos: datos, titulo: '', aviso: r.aviso || '' };
      });

  traer.then(function(x){
      if (sello !== AY.lectura) return null;
      if (!x.datos || !x.datos.length) throw new Error('No hay filas que leer.');
      return AY_FN('leer', { pregunta: item.pregunta, datos: x.datos,
                             titulo: x.titulo, aviso: x.aviso });
    })
    .then(function(j){
      if (j === null || sello !== AY.lectura) return;
      if (j && j.ok === true && j.lectura) ayLecturaOk(j);
      else ayLecturaMal((j && j.motivo) ? j.motivo : 'No salió.',
                        (j && j.detalle) ? j.detalle : '');
    })
    .catch(function(err){
      if (sello !== AY.lectura) return;
      ayLecturaMal('No se pudo llegar al servidor.',
                   (err && err.message) ? err.message : '');
    });
}

function ayLecturaOk(j){
  var caja = document.getElementById('ayLectura');
  if (!caja) return;
  var de = [];
  if (j.filas_leidas) de.push(ayNum(j.filas_leidas,0) + ' de ' +
                              ayNum(j.filas_totales,0) + ' renglones');
  if (j.modelo) de.push(j.modelo);
  if (j.ms != null) de.push(ayNum(j.ms/1000,1) + ' s');
  caja.className = 'ay-lectura';
  caja.innerHTML = '<div class="enc">La lectura<span class="de">' + esc(de.join(' · ')) +
                   '</span></div>' +
                   '<div class="txt">' + ayLecturaHtml(j.lectura) + '</div>';
  /* queda guardada: va adentro del Excel y arriba del informe */
  if (AY.item) AY.item.lecturaTexto = j.lectura;
  ayAjustar();
}

function ayLecturaMal(motivo, detalle){
  var caja = document.getElementById('ayLectura');
  if (!caja) return;
  caja.className = 'ay-lectura nope';
  caja.innerHTML = '<div class="enc">La lectura no salió</div>' +
    '<div class="txt">' + esc(motivo) + ' Los datos de abajo sí están.' +
    (detalle ? '<br><span style="color:#7C93A3;font-size:12px">' + esc(detalle) + '</span>' : '') +
    '</div>';
  ayAjustar();
}

/* Pasa el texto del modelo a HTML. Tres cosas y nada mas: **negrita**, listas
   con guion, y parrafos. Todo lo demas se escapa: el texto viene de un modelo,
   asi que no se inyecta HTML desde ahi. */
function ayLecturaHtml(t){
  var lineas = String(t || '').replace(/\r/g,'').split('\n');
  var out = [], buf = [], lista = [];
  function cerrarP(){
    if (buf.length){ out.push('<p>' + ayNegrita(buf.join(' ')) + '</p>'); buf = []; }
  }
  function cerrarL(){
    if (lista.length){
      out.push('<ul>' + lista.map(function(x){ return '<li>' + ayNegrita(x) + '</li>'; }).join('') + '</ul>');
      lista = [];
    }
  }
  for (var i = 0; i < lineas.length; i++){
    var l = lineas[i].trim();
    if (!l){ cerrarP(); cerrarL(); continue; }
    var m = l.match(/^[-•·*+]\s+(.*)$/);
    if (m){ cerrarP(); lista.push(m[1]); }
    else   { cerrarL(); buf.push(l); }
  }
  cerrarP(); cerrarL();
  return out.join('');
}

function ayNegrita(s){
  return esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}

/* ---------- pintar ---------- */
function ayPintar(item){
  var r = item.r, caja = document.getElementById('ayResp');
  caja.hidden = false;

  if (!r.ok){
    var duro = ['no_valida','error_sql','api','excepcion','configuracion','red','sin_sesion','sin_permiso']
                 .indexOf(r.origen) >= 0;
    var titulos = { no_se:'No puedo contestar eso', sin_contexto:'No encontré de dónde sacarlo',
      no_valida:'La consulta no pasó el control', error_sql:'La consulta no pudo ejecutarse',
      api:'Problema con la ayuda', configuracion:'Falta configurar la ayuda',
      vacia:'Escribí una pregunta', excepcion:'Algo falló', red:'No pude llegar al servidor',
      sin_sesion:'Sesión vencida', sin_permiso:'Sin permiso' };
    caja.innerHTML =
      '<div class="ay-enc"><h3>'+esc(item.pregunta)+'</h3>' +
      '<span class="ay-sello '+(duro?'err':'no')+'">'+esc(titulos[r.origen]||'No salió')+'</span></div>' +
      '<div class="ay-aviso '+(duro?'mal':'')+'"><div>'+esc(r.respuesta||'No se pudo resolver.')+'</div>' +
      (r.motivo ? '<div class="det">Detalle: '+esc(r.motivo)+'</div>' : '') +
      (!duro ? '<div class="det">Probá nombrando la tabla o el dato con otras palabras.</div>' : '') +
      '</div>' +
      (r.sql ? '<details class="ay-sql"><summary>Ver la consulta que se intentó</summary><pre>'+esc(r.sql)+'</pre></details>' : '') +
      ayPie(item, undefined);
  ayArriba(caja, item);
    ayEnganchar(item);
    return;
  }

  var datos = (r.datos && r.datos.length !== undefined) ? r.datos : [];
  var cols = datos.length ? Object.keys(datos[0]) : [];
  var ej = ayGraficable(datos);
  item.ej = ej;
  var cuerpo, filas = datos.length;

  if (datos.length === 1 && cols.length === 1){
    cuerpo = '<div class="ay-grande"><b>'+ayValor(datos[0][cols[0]])+'</b><span>'+esc(cols[0])+'</span></div>';
    filas = undefined;
  } else if (!datos.length){
    cuerpo = '<div class="ay-aviso"><div>La consulta corrió bien pero no trajo ninguna fila.</div>' +
             '<div class="det">Puede ser que no haya datos para eso, o que el filtro deje todo afuera.</div></div>';
  } else {
    var esN = cols.map(function(c){ return datos.every(function(f){ return f[c]===null || ayEsNum(f[c]); }); });
    var tabla = '<div class="ay-tabla"><table class="ay-tb"><thead><tr>' +
      cols.map(function(c,i){ return '<th'+(esN[i]?' class="ay-n"':'')+'>'+esc(c)+'</th>'; }).join('') +
      '</tr></thead><tbody>' +
      datos.map(function(f){ return '<tr>' + cols.map(function(c,i){
        return '<td'+(esN[i]?' class="ay-n"':'')+'>'+ayValor(f[c])+'</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>';
    cuerpo = (ej ? '<div class="ay-vistas">' +
        '<button class="ay-btn sec" id="ayVTabla" aria-pressed="'+(item.vista==='tabla')+'">Tabla</button>' +
        '<button class="ay-btn sec" id="ayVGraf"  aria-pressed="'+(item.vista==='grafico')+'">Gráfico</button>' +
      '</div>' : '') +
      '<div class="ay-panel" id="ayPTabla"'+(item.vista==='tabla'?'':' hidden')+'>'+tabla+'</div>' +
      (ej ? '<div class="ay-panel" id="ayPGraf"'+(item.vista==='grafico'?'':' hidden')+'><div class="ay-graf" id="ayGraf"></div></div>' : '');
  }

  var rec = r.origen === 'recordada';
  var intn = r.origen === 'intencion';
  var sello = intn ? 'Resuelta sin costo — la sé contestar'
            : rec  ? 'Ya la sabía — sin costo'
                   : 'Resuelta';
  /* la intención dice qué entendió y de qué período: sin eso, una respuesta
     con el período equivocado se lee igual que una correcta. */
  var cabeza = (intn && (r.nota || r.aviso))
    ? '<div class="ay-aviso"><div>' + esc(r.nota || '') + '</div>' +
      (r.aviso ? '<div class="det">' + esc(r.aviso) + '</div>' : '') + '</div>'
    : '';
  /* la caja de la lectura va ARRIBA de todo lo demas y arranca vacia: la
     tabla aparece en 0,8 s y la lectura se completa sola cuando llega. */
  var hayQueLeer = datos.length > 0;
  caja.innerHTML =
    '<div class="ay-enc"><h3>'+esc(item.pregunta)+'</h3>' +
    '<span class="ay-sello '+(intn||rec?'cache':'')+'">'+esc(sello)+'</span></div>' +
    (hayQueLeer ? '<div class="ay-archivo" id="ayArchivo" hidden></div>' : '') +
    (hayQueLeer ? '<div class="ay-lectura pensando" id="ayLectura"></div>' : '') +
    cabeza + cuerpo +
    '<details class="ay-sql"><summary>Ver la consulta que usó</summary><pre>'+esc(r.sql||'')+'</pre></details>' +
    ayPie(item, filas);
  ayArriba(caja, item);
  ayEnganchar(item);
  if (ej && item.vista === 'grafico') ayMontarGrafico(document.getElementById('ayGraf'), datos, ej);
}

// Sube la barra de acciones (Armar reporte / Bajar a Excel) al principio
// del resultado: con tablas largas quedaba fuera de pantalla.
function ayArriba(c, item){
  try{
    // la barra de datos y acciones va ARRIBA del resultado: con tablas largas
    // quedaba fuera de pantalla y nadie la encontraba.
    var pie = c.querySelector(".ay-pie");
    if (pie && pie !== c.firstChild){
      pie.classList.add("ay-pie-arriba");
      c.insertBefore(pie, c.firstChild);
    }
    if (!pie || !item) return;
    var datos = (item.r && item.r.datos) || [];
    var acc = pie.querySelector(".ay-acc");
    if (!acc) return;

    // Grafico y Dashboard, siempre disponibles: que la persona elija como verlo,
    // en vez de que el sistema decida por ella.
    if (datos.length && !acc.querySelector(".ay-bgraf")){
      var bg = document.createElement("button");
      bg.className = "ay-btn sec ay-bgraf"; bg.textContent = "Grafico";
      bg.onclick = function(){ ayPanelExtra(c, item, "graf"); };
      var bd = document.createElement("button");
      bd.className = "ay-btn sec ay-bgraf"; bd.textContent = "Dashboard";
      bd.onclick = function(){ ayPanelExtra(c, item, "dash"); };
      acc.insertBefore(bd, acc.firstChild);
      acc.insertBefore(bg, acc.firstChild);
    }

    // Pulgar: si una respuesta quedo mal aprendida, el usuario la saca de circulacion.
    if (datos.length && !pie.querySelector(".ay-pulg")){
      var p = document.createElement("span");
      p.className = "ay-pulg";
      var si = document.createElement("button"); si.textContent = "\u00a1Sirve!"; si.title = "La respuesta es correcta";
      var no = document.createElement("button"); no.textContent = "Esta mal";   no.title = "No volver a usar esta respuesta";
      si.className = "ok"; no.className = "no";
      si.onclick = function(){ ayPulgar(item, 1, p); };
      no.onclick = function(){ ayPulgar(item, -1, p); };
      p.appendChild(si); p.appendChild(no);
      acc.appendChild(p);
    }
  }catch(e){}
}
function ayEjes(datos){
  if (!datos || !datos.length) return null;
  var cols = Object.keys(datos[0]);
  var distintos = function(c){ var d={},n=0; datos.forEach(function(f){
      var k=String(f[c]); if(!(k in d)){d[k]=1;n++;} }); return n; };
  var esNum = function(c){ var v=0,n=0; datos.forEach(function(f){ var x=f[c];
      if(x!==null&&x!==undefined&&x!==''){ v++; if(!isNaN(Number(x))&&typeof x!=='boolean') n++; } });
      return v>0 && (n/v)>0.8; };
  var esFecha = function(c){ var n=0; datos.forEach(function(f){
      if(/^\d{4}-\d{2}-\d{2}/.test(String(f[c]))) n++; }); return n > datos.length*0.6; };
  var nums = cols.filter(esNum);
  var txts = cols.filter(function(c){ return nums.indexOf(c)<0; });
  var ident = /codigo|cod_|numero|comprobante|^id$|_id$|partida|n_comp|renglon/i;

  // el numero: el de mayor magnitud que no parezca un identificador
  var cand = nums.filter(function(c){ return !ident.test(c); });
  if (!cand.length) cand = nums.slice();
  var valor=null, mejor=-1;
  cand.forEach(function(c){ var s=0; datos.forEach(function(f){
      var x=Number(f[c]); if(!isNaN(x)) s+=Math.abs(x); });
      if(s>mejor){ mejor=s; valor=c; } });
  if (!valor) return null;

  // la etiqueta: texto con pocos valores distintos, o un mes, o agrupar por fecha
  var etiqueta=null, porFecha=null;
  txts.forEach(function(c){ if(!etiqueta){ var d=distintos(c); if(d>=2 && d<=24) etiqueta=c; } });
  if (!etiqueta) nums.forEach(function(c){ if(!etiqueta && c!==valor && !ident.test(c)){
      var d=distintos(c); if(d>=2 && d<=24) etiqueta=c; } });
  if (!etiqueta) cols.forEach(function(c){ if(!etiqueta && esFecha(c)){ etiqueta=c; porFecha=c; } });
  if (!etiqueta) txts.forEach(function(c){ if(!etiqueta && distintos(c)>=2) etiqueta=c; });
  if (!etiqueta) return null;
  // si la etiqueta resulto ser una fecha, se agrupa por mes: una barra por dia
  // no se lee, y ademas el orden tiene que ser cronologico.
  if (!porFecha && esFecha(etiqueta)) porFecha = etiqueta;
  return {etiqueta:etiqueta, valor:valor, porFecha:porFecha};
}

/** Agrupa por la etiqueta y suma el numero. Si la etiqueta es una fecha, agrupa por mes. */
function ayAgrupar(datos, ej){
  var mapa = {}, orden = [];
  datos.forEach(function(f){
    var k = f[ej.etiqueta];
    if (ej.porFecha) k = String(k).slice(0,7);
    k = (k===null||k===undefined||k==='') ? '(sin dato)' : String(k);
    var v = Number(f[ej.valor]); if (isNaN(v)) v = 0;
    if (!(k in mapa)){ mapa[k]=0; orden.push(k); }
    mapa[k] += v;
  });
  var filas = orden.map(function(k){ return {k:k, v:mapa[k]}; });
  var temporal = /^(mes|meses|periodo|anio|ano|a\u00f1o|month|trimestre)$/i.test(ej.etiqueta);
  if (ej.porFecha) filas.sort(function(a,b){ return a.k<b.k?-1:1; });
  else if (temporal) filas.sort(function(a,b){ return Number(a.k)-Number(b.k); });
  else filas.sort(function(a,b){ return Math.abs(b.v)-Math.abs(a.v); });
  return filas.slice(0,24);
}

function ayNumCorto(n){
  var a = Math.abs(n);
  try{
    // Todo en millones, una sola unidad: mezclar MM y M en la misma lista
    // hace que dos numeros parecidos se lean al reves.
    if (a>=1e6) return (n/1e6).toLocaleString('es-AR',{maximumFractionDigits:1})+' M';
    if (a>=1e3) return n.toLocaleString('es-AR',{maximumFractionDigits:0});
    return n.toLocaleString('es-AR',{maximumFractionDigits:2});
  }catch(e){ return String(n); }
}

/** Dibuja las barras en SVG. Nada de librerias: la pantalla vive adentro de Apps Script. */
function ayGrafSVG(filas, titulo){
  if (!filas.length) return '<div class="ay-sinmas">No hay con que armar un grafico.</div>';
  var W=760, izq=170, der=24, alto=26, sep=6;
  var H = 16 + filas.length*(alto+sep) + 10;
  var vals = filas.map(function(f){ return f.v; });
  var max = Math.max.apply(null, vals.concat([0]));
  var min = Math.min.apply(null, vals.concat([0]));
  var rango = (max-min)||1;
  var ancho = W-izq-der;
  var x0 = izq + (0-min)/rango*ancho;   // donde cae el cero
  var s = ['<svg viewBox="0 0 '+W+' '+H+'" width="100%" height="'+H+'" role="img" aria-label="'+
           String(titulo||'').replace(/"/g,'')+'">'];
  s.push('<line x1="'+x0.toFixed(1)+'" y1="8" x2="'+x0.toFixed(1)+'" y2="'+(H-8)+'" stroke="rgba(255,255,255,.18)" stroke-width="1"/>');
  filas.forEach(function(f,i){
    var y = 14 + i*(alto+sep);
    var w = Math.abs(f.v)/rango*ancho;
    var x = f.v>=0 ? x0 : x0-w;
    if (w<2) w=2;
    var col = f.v<0 ? '#C0303A' : '#18A37C';
    var et = f.k.length>26 ? f.k.slice(0,25)+'…' : f.k;
    s.push('<text x="'+(izq-10)+'" y="'+(y+alto*0.68)+'" text-anchor="end" font-size="12" fill="#9FB3C8">'+
           et.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</text>');
    s.push('<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="'+alto+'" rx="4" fill="'+col+'">'+
           '<title>'+et.replace(/&/g,'&amp;').replace(/</g,'&lt;')+': '+ayNumCorto(f.v)+'</title></rect>');
    var tx = f.v>=0 ? x+w+6 : x-6;
    s.push('<text x="'+tx.toFixed(1)+'" y="'+(y+alto*0.68)+'" text-anchor="'+(f.v>=0?'start':'end')+
           '" font-size="12" fill="#C8D6E3" font-variant-numeric="tabular-nums">'+ayNumCorto(f.v)+'</text>');
  });
  s.push('</svg>');
  return s.join('');
}

/** Las tarjetas de arriba del dashboard. */
function ayKpis(datos, ej, filas){
  var total=0, max=-Infinity, min=Infinity;
  filas.forEach(function(f){ total+=f.v; if(f.v>max)max=f.v; if(f.v<min)min=f.v; });
  var k = [
    {e:'Filas', n:Number(datos.length).toLocaleString('es-AR')},
    {e:(/^total/i.test(ej.valor) ? '' : 'Total ') + ej.valor.replace(/_/g,' '), n:ayNumCorto(total)},
    {e:'Mayor', n:ayNumCorto(max)},
    {e:'Menor', n:ayNumCorto(min)}
  ];
  return '<div class="ay-kpis">' + k.map(function(x){
    return '<div class="ay-kpi"><div class="et">'+x.e+'</div><div class="nu">'+x.n+'</div></div>';
  }).join('') + '</div>';
}

/** Arma el panel de grafico o de dashboard debajo de la barra de opciones. */
function ayPanelExtra(caja, item, modo){
  var viejo = caja.querySelector('.ay-extra'); if (viejo) viejo.parentNode.removeChild(viejo);
  var datos = (item && item.r && item.r.datos) || [];
  var d = document.createElement('div'); d.className = 'ay-extra';
  var ej = ayEjes(datos);
  if (!ej){
    d.innerHTML = '<div class="ay-sinmas">Con estos datos no se puede armar un grafico: ' +
      'hacen falta una columna que agrupe (un mes, un cliente, un articulo) y un numero. ' +
      'Volve a preguntar en forma de resumen, por ejemplo “por mes” o “por cliente”.</div>';
  } else {
    var filas = ayAgrupar(datos, ej);
    var tit = (ej.valor+' por '+ej.etiqueta).replace(/_/g,' ');
    d.innerHTML = '<h4>'+tit+(ej.porFecha?' (por mes)':'')+'</h4>' +
      (modo==='dash' ? ayKpis(datos, ej, filas) : '') +
      ayGrafSVG(filas, tit);
  }
  var pie = caja.querySelector('.ay-pie');
  if (pie && pie.nextSibling) caja.insertBefore(d, pie.nextSibling); else caja.appendChild(d);
}

/** Marca la respuesta como buena o mala. La mala deja de usarse al instante. */
function ayPulgar(item, valor, cont){
  try{
    AY_RPC('api_ayuda_pulgar', { p_pregunta: item.pregunta,
                                 p_valor: (Number(valor) < 0 ? -1 : 1) })
      .then(function(r){
        cont.innerHTML = '<span style="font-size:12px;color:'+(valor<0?'#C0303A':'#18A37C')+'">'+
          (valor<0 ? 'marcada como mala — no se va a volver a usar' : 'gracias, queda confirmada')+'</span>';
      })
      .catch(function(){ cont.innerHTML = '<span style="font-size:12px;color:#C0303A">no se pudo marcar</span>'; });
  }catch(e){}
}

function ayPie(item, filas){
  var r = item.r, p = [];
  if (filas !== undefined) p.push(ayNum(filas,0) + (filas===1?' fila':' filas'));
  if (r.ms != null) p.push(ayNum(r.ms/1000,1) + ' s');
  if (item.costo > 0) p.push(ayPlata(item.costo)); else if (r.ok) p.push('sin costo');
  if (AY.gasto > 0) p.push('acumulado ' + ayPlata(AY.gasto));
  var hay = r.ok && r.datos && r.datos.length;
  return '<div class="ay-pie"><span>' + p.join('</span><span style="opacity:.4"> · </span><span>') + '</span>' +
    '<span class="ay-acc">' +
      (hay ? '<button class="ay-btn sec" id="ayRep">Armar reporte</button>' : '') +
      (hay ? '<button class="ay-btn sec" id="ayCsv">Bajar a Excel</button>' : '') +
    '</span></div>';
}

function ayEnganchar(item){
  var vt = document.getElementById('ayVTabla'), vg = document.getElementById('ayVGraf');
  var rp = document.getElementById('ayRep'),    cs = document.getElementById('ayCsv');
  if (vt) vt.onclick = function(){ ayVista(item,'tabla'); };
  if (vg) vg.onclick = function(){ ayVista(item,'grafico'); };
  if (rp) rp.onclick = function(){ ayReporte(item); };
  if (cs) cs.onclick = function(){ ayExcel(item); };
}

/* =====================================================================
   EL EXCEL                                             15/10/2026
   =====================================================================
   Antes este boton tiraba un CSV de UNA hoja con los nombres crudos de
   la base (oc_nro, precio_oc_neto). Ahora pide el archivo de verdad:
   cinco hojas, titulos en castellano, formato por columna, panel
   congelado, autofiltro y FORMULAS VIVAS sobre la hoja Detalle, igual
   que el que arma DISSAN a mano.

   Si el servidor no contesta, se baja el CSV de antes: es preferible un
   CSV a quedarse sin nada.
   ===================================================================== */
function ayExcel(item){
  var b = document.getElementById('ayCsv');
  var rotulo = b ? b.textContent : '';
  if (b){ b.disabled = true; b.textContent = 'Preparando…'; }

  var r = item.r;
  var deLaPantalla = (r.origen === 'intencion') ? null : (r.datos || []);

  function listo(){ if (b){ b.disabled = false; b.textContent = rotulo || 'Bajar a Excel'; } }

  /* Las filas del archivo son TODAS, no las 50 de la pantalla. */
  var traer = deLaPantalla
    ? Promise.resolve({ datos: deLaPantalla, titulo: '' })
    : AY_TODAS(item.pregunta).then(function(p){
        if (p && p.entendio === true && p.datos && p.datos.length)
          return { datos: p.datos, titulo: AY_TITULO(p) };
        return { datos: (r.datos || []), titulo: '' };
      });

  traer.then(function(x){
      if (!x.datos || !x.datos.length) throw new Error('No hay filas que escribir.');
      AY.ultimasFilas = x.datos.length;
      return AY_FN('excel', { pregunta: item.pregunta, datos: x.datos,
                              lectura: item.lecturaTexto || '', titulo: x.titulo });
    })
    .then(function(j){
      listo();
      if (!j || j.ok !== true || !j.base64){
        ayExcelFallo(item, (j && j.motivo) ? j.motivo : 'No salió.');
        return;
      }
      var bytes = AY_B64_BYTES(j.base64);
      if (!(bytes[0] === 0x50 && bytes[1] === 0x4B)){
        ayExcelFallo(item, 'El archivo vino dañado.');
        return;
      }
      var nombre = ayNombreArchivo(item.pregunta) + '.xlsx';
      var url = AY_BAJAR_BLOB(bytes,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', nombre);
      ayOfrecerEnlace(url, nombre, 'El Excel está listo',
        ayNum(j.filas || AY.ultimasFilas, 0) + ' renglones · ' +
        ((j.hojas && j.hojas.length) ? j.hojas.length + ' hojas · ' : '') +
        Math.round(bytes.length/1024) + ' KB · ya se bajó; el enlace lo vuelve a bajar');
    })
    .catch(function(e){
      listo();
      ayExcelFallo(item, (e && e.message) ? e.message : 'No se pudo llegar al servidor.');
    });
}

/* El Excel no salio: se dice POR QUE, no en silencio.
   NO se cae al CSV: el CSV bajaba por blob, y el blob NO BAJA desde este
   iframe (probado el 15/10). Un respaldo que tampoco baja es una mentira
   mas, no una red. */
function ayExcelFallo(item, motivo){
  var caja = document.getElementById('ayLectura');
  if (caja && caja.className.indexOf('nope') < 0){
    var aviso = document.createElement('div');
    aviso.className = 'ay-lectura nope';
    aviso.style.marginTop = '10px';
    aviso.innerHTML = '<div class="enc">El Excel no salió</div>' +
      '<div class="txt">' + esc(motivo) + '</div>';
    caja.parentNode.insertBefore(aviso, caja.nextSibling);
  }
}

function ayNombreArchivo(pregunta){
  return String(pregunta || '').toLowerCase()
           .replace(/[^a-z0-9áéíóúñ ]/gi,'')
           .trim().replace(/\s+/g,'-').slice(0,50) || 'consulta';
}

/* =====================================================================
   EL ARCHIVO BAJA DE UNA URL DE VERDAD                 15/10/2026
   =====================================================================
   Un enlace comun, con su URL, que el usuario aprieta con la mano. El
   servidor contesta con Content-Disposition y el navegador lo baja como
   baja cualquier archivo. Sin blob, sin clic automatico, sin JavaScript
   en el medio: las tres cosas que el sandbox de este iframe bloquea.

   target="_blank" NO es un detalle: el sandbox trae allow-popups y
   allow-popups-to-escape-sandbox, asi que la pestaña nueva sale SIN
   sandbox y la descarga ocurre con las reglas normales del navegador.

   La URL lleva un vale de hasta 5 usos que vence a los 15 minutos
   (app_vale_excel_crear). No lleva ninguna clave: una URL queda en el
   historial y en los registros del servidor.
   ===================================================================== */
function ayOfrecerEnlace(url, nombre, titulo, detalle){
  var caja = document.getElementById('ayArchivo');
  if (!caja) return;
  caja.hidden = false;
  caja.innerHTML =
    '<div class="txt"><b>' + esc(titulo || 'El archivo está listo') + '</b>' +
    (detalle ? '<br><span class="de">' + esc(detalle) + '</span>' : '') + '</div>' +
    '<a class="baja" id="ayBajar" rel="noopener" download="' +
      esc(nombre) + '" href="' + esc(url) + '">↓ Bajarlo</a>';
  ayAjustar();
}

/* El modulo viejo tenia aca ayOfrecerArchivo(), que bajaba por blob y quedo
   marcada NO USAR: adentro del iframe con sandbox de Apps Script el blob no
   bajaba ni con el clic a mano. Esta pagina NO tiene sandbox, el blob baja, y
   es el camino que usan el Excel y el informe. No se arrastra la funcion
   muerta: su comentario decia lo contrario de lo que pasa aca. */

function ayVista(item, v){
  item.vista = v;
  document.getElementById('ayPTabla').hidden = (v !== 'tabla');
  var g = document.getElementById('ayPGraf'); if (g) g.hidden = (v !== 'grafico');
  document.getElementById('ayVTabla').setAttribute('aria-pressed', v === 'tabla');
  document.getElementById('ayVGraf').setAttribute('aria-pressed', v === 'grafico');
  if (v === 'grafico' && item.ej) ayMontarGrafico(document.getElementById('ayGraf'), item.r.datos, item.ej);
}

/* ---------- el reporte ----------
   Se arma dentro de la misma pantalla. Para imprimirlo o guardarlo en PDF se
   usa un iframe oculto: adentro de Apps Script las ventanas nuevas se bloquean,
   y window.print() a secas imprimiría toda la aplicación, no el reporte. */
function ayReporteHtml(item){
  var r = item.r, datos = r.datos || [], cols = Object.keys(datos[0] || {});
  var esN = cols.map(function(c){ return datos.every(function(f){ return f[c]===null || ayEsNum(f[c]); }); });
  var ej = ayGraficable(datos);
  var hoy = new Date();
  var uno = datos.length === 1 && cols.length === 1;

  return '<p class="emp">DISSAN SRL</p>' +
    '<h3>' + esc(item.pregunta) + '</h3>' +
    '<p class="fec">' + hoy.toLocaleDateString('es-AR',{day:'2-digit',month:'long',year:'numeric'}) +
      ' · ' + hoy.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}) +
      ' · ' + ayNum(datos.length,0) + (datos.length===1?' fila':' filas') + '</p>' +
    /* LA LECTURA ARRIBA DE TODO. El informe que arma DISSAN a mano no es una
       tabla: empieza con "Lo que hay que mirar". Esto es eso, escrito sobre
       los totales que calculo la base. */
    (item.lecturaTexto
      ? '<div style="border-left:3px solid #17525F;background:#F6F9FA;padding:12px 16px;' +
        'margin:0 0 18px;font-size:13.5px;line-height:1.65;color:#17303A">' +
        '<div style="font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;' +
        'color:#17525F;margin:0 0 8px">Lo que hay que mirar</div>' +
        ayLecturaHtml(item.lecturaTexto) + '</div>'
      : '') +
    (uno
      ? '<div class="hero"><b>' + ayValor(datos[0][cols[0]]) + '</b><span>' + esc(cols[0]) + '</span></div>'
      // 1000 de ancho para que la escala quede cerca de 1:1 con el ancho real
      // de la hoja: así la columna de nombres no se sale por la izquierda.
      : (ej ? '<p style="font-size:12.5px;color:#64748B;margin:0 0 12px">' +
                esc(ej.valor) + ' por ' + esc(ej.etiqueta) + '</p>' +
              ayBarras(datos, ej, 1000) : '') +
        '<table><thead><tr>' + cols.map(function(c,i){
            return '<th'+(esN[i]?' style="text-align:right"':'')+'>'+esc(c)+'</th>'; }).join('') +
        '</tr></thead><tbody>' + datos.map(function(f){ return '<tr>' + cols.map(function(c,i){
            return '<td'+(esN[i]?' style="text-align:right"':'')+'>'+ayValor(f[c])+'</td>'; }).join('') +
        '</tr>'; }).join('') + '</tbody></table>') +
    '<div class="nota">Generado por la ayuda inteligente de DISSAN sobre la base Tango en Supabase. ' +
      'El dato sale de una consulta ejecutada en el momento, no de un archivo guardado.</div>';
}

function ayReporte(item){
  var caja = document.getElementById('ayResp');
  caja.innerHTML =
    '<div class="ay-repbar">' +
      '<button class="ay-btn sec" id="ayVolver">&#8592; Volver</button>' +
      '<button class="ay-btn sec" id="ayImprimir">Imprimir o guardar PDF</button>' +
      '<button class="ay-btn sec" id="ayBajarHtml">Bajar el informe (.html)</button>' +
    '</div>' +
    '<div class="ay-archivo" id="ayArchivo" hidden></div>' +
    '<div class="ay-rep" id="ayRepCuerpo">' + ayReporteHtml(item) + '</div>';
  document.getElementById('ayVolver').onclick = function(){ ayPintar(item); };
  document.getElementById('ayImprimir').onclick = function(){ ayImprimir(item); };
  document.getElementById('ayBajarHtml').onclick = function(){ ayBajarInforme(item); };
}

/* Los estilos del informe, en un solo lugar: los usan la impresión y el
   archivo .html que se baja. Si estuvieran duplicados, el que se imprime y el
   que se baja podrían salir distintos. */
function ayEstilosInforme(){
  return (
    'body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#16263D;' +
      'font-size:13px;line-height:1.55;-webkit-font-smoothing:antialiased}' +
    '.emp{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#64748B;margin:0 0 9px}' +
    'h3{font-size:20px;font-weight:600;margin:0 0 5px}' +
    '.fec{color:#64748B;font-size:12px;margin:0 0 22px;padding-bottom:15px;border-bottom:2px solid #16263D}' +
    'table{width:100%;border-collapse:collapse;font-size:12.5px}' +
    'th{text-align:left;padding:7px 9px;color:#64748B;font-size:11px;font-weight:500;border-bottom:1px solid #C3CCD8}' +
    'td{padding:6px 9px;border-bottom:1px solid #DCE2EA}' +
    '.hero b{display:block;font-size:46px;font-weight:600}' +
    '.hero span{display:block;color:#64748B;font-size:13px;margin-top:7px}' +
    '.nota{margin-top:24px;padding-top:14px;border-top:1px solid #DCE2EA;color:#64748B;font-size:11px}' +
    'svg{width:100%;overflow:visible}.et{fill:#2B3F5C;font-size:11.5px}' +
    '.val{fill:#16263D;font-size:11.5px;font-weight:600}.eje{stroke:#C3CCD8}' +
    'rect.b{fill:#2a78d6}g.f.neg rect.b{fill:#eb6834}rect.z{fill:none}' +
    '@page{margin:18mm}');
}

/* El documento entero, el mismo que se imprime y el mismo que se baja. */
function ayDocumentoInforme(item){
  return '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
         '<meta name="viewport" content="width=device-width, initial-scale=1">' +
         '<title>' + esc(item.pregunta) + '</title><style>' + ayEstilosInforme() +
         '</style></head><body>' + ayReporteHtml(item) + '</body></html>';
}

/* Baja el informe como archivo .html, por la misma vía que el Excel: un vale
   y una URL de verdad. El documento se arma ACÁ, que es donde está el dato
   pintado, y viaja adentro del vale. */
function ayBajarInforme(item){
  var b = document.getElementById('ayBajarHtml');
  var rotulo = b ? b.textContent : '';
  if (b){ b.disabled = true; b.textContent = 'Preparando…'; }
  function listo(){ if (b){ b.disabled = false; b.textContent = rotulo || 'Bajar el informe (.html)'; } }

  /* El documento se arma con TODAS las filas, no con las 50 de la pantalla.
     Un informe que dice 50 de 219 sin decirlo es un recorte con pinta de
     completo. Si el servidor no las puede traer, se avisa y se usa lo que hay
     —nunca en silencio. */
  /* El documento se arma acá mismo y baja como archivo: no hace falta pasar
     por el servidor para que escriba un HTML que ya esta escrito. */
  function mandar(conTodas, cuantas){
    try{
      var doc = ayDocumentoInforme(conTodas);
      var bytes = new TextEncoder().encode(doc);
      var nombre = ayNombreArchivo(item.pregunta) + '.html';
      var url = AY_BAJAR_BLOB(bytes, 'text/html;charset=utf-8', nombre);
      listo();
      ayOfrecerEnlace(url, nombre, 'El informe está listo',
        ayNum(cuantas,0) + ' renglones · ' + Math.round(bytes.length/1024) +
        ' KB · ya se bajó; el enlace lo vuelve a bajar');
    }catch(e){
      listo();
      ayAvisoInforme((e && e.message) ? e.message : 'No salió.');
    }
  }

  var enPantalla = (item.r.datos || []).length;
  if (item.r.origen !== 'intencion'){ mandar(item, enPantalla); return; }

  AY_TODAS(item.pregunta)
    .then(function(f){
      if (!f || f.entendio !== true || !f.datos || !f.datos.length){
        mandar(item, enPantalla); return;
      }
      var todo = { pregunta: item.pregunta, lecturaTexto: item.lecturaTexto,
                   costo: item.costo,
                   r: { ok:true, origen:item.r.origen, ms:item.r.ms,
                        sql:item.r.sql, datos: f.datos } };
      mandar(todo, f.datos.length);
    })
    .catch(function(){ mandar(item, enPantalla); });
}

function ayAvisoInforme(motivo){
  var caja = document.getElementById('ayArchivo');
  if (!caja) return;
  caja.hidden = false;
  caja.innerHTML = '<div class="txt"><b>El informe no salió</b><br>' +
                   '<span class="de">' + esc(motivo) + '</span></div>';
  ayAjustar();
}

function ayImprimir(item){
  var estilos = ayEstilosInforme();

  var f = document.createElement('iframe');
  f.setAttribute('aria-hidden','true');
  f.style.cssText = 'position:fixed;right:100%;bottom:100%;width:800px;height:600px;border:0';
  document.body.appendChild(f);
  var d = f.contentDocument || f.contentWindow.document;
  d.open();
  d.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' +
          esc(item.pregunta) + '</title><style>' + estilos + '</style></head><body>' +
          ayReporteHtml(item) + '</body></html>');
  d.close();
  setTimeout(function(){
    try { f.contentWindow.focus(); f.contentWindow.print(); }
    catch (e) {
      var b = document.getElementById('ayImprimir');
      if (b) { b.textContent = 'No se pudo abrir la impresión'; }
    }
    setTimeout(function(){ if (f.parentNode) f.parentNode.removeChild(f); }, 1500);
  }, 300);
}

/* ---------- bajar a Excel ---------- */
function ayCsv(item){
  var datos = item.r.datos, cols = Object.keys(datos[0]);
  var celda = function(v){
    if (v === null || v === undefined) return '';
    if (ayEsNum(v)) return String(v).replace('.', ',');
    var s = String(v);
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  };
  var csv = [cols.join(';')].concat(datos.map(function(f){
    return cols.map(function(c){ return celda(f[c]); }).join(';'); })).join('\r\n');
  var nombre = ayNombreArchivo(item.pregunta) + '.csv';
  /* por el mismo motivo que el Excel: el clic automatico lo bloquea el
     navegador, asi que el archivo queda a la vista con su enlace. */
  var BOM = String.fromCharCode(0xFEFF);   /* para que Excel lea los acentos */
  var url = URL.createObjectURL(new Blob([BOM + csv], {type:'text/csv;charset=utf-8'}));
  try {
    var a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click();
    if (a.parentNode) a.parentNode.removeChild(a);
  } catch (e) {}
  var caja = document.getElementById('ayArchivo');
  if (caja){
    caja.hidden = false;
    caja.innerHTML =
      '<div class="txt"><b>El CSV está listo</b><br>' +
      '<span class="de">' + ayNum(datos.length,0) + ' renglones · ' +
      Math.round(csv.length/1024) + ' KB</span></div>' +
      '<a class="baja" id="ayBajar" download="' + esc(nombre) + '">↓ Bajarlo</a>';
    var enl = document.getElementById('ayBajar');
    if (enl) enl.href = url;
    ayAjustar();
  }
}

/* ---------- varios ---------- */
function ayAjustar(){
  var t = document.getElementById('ayQ');
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight, 150) + 'px';
}

function iniciarAyuda(){
  document.getElementById('ayEjemplos').innerHTML = AY_EJEMPLOS.map(function(g){
    return '<p class="ay-grupo">'+esc(g[0])+'</p><div class="ay-chips">' +
      g[1].map(function(t){ return '<button type="button" data-q="'+esc(t)+'">'+esc(t)+'</button>'; }).join('') +
      '</div>';
  }).join('');
  Array.prototype.forEach.call(document.querySelectorAll('#ayEjemplos button'), function(b){
    b.onclick = function(){ document.getElementById('ayQ').value = b.getAttribute('data-q'); ayPreguntar(); };
  });

  var q = document.getElementById('ayQ');
  q.addEventListener('input', ayAjustar);
  q.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); ayPreguntar(); }
  });
  document.getElementById('ayEnviar').onclick = ayPreguntar;
  q.focus();
}
