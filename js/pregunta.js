
/* =====================================================================
   PREGUNTAR — el circuito con herramientas            28/10/2026
   =====================================================================
   Pagina APARTE, fuera del menu, para no tocar ayuda.html que anda.

   EL ORDEN, y es a proposito:
     1. api_preguntar  — las 59 intenciones. Menos de un segundo, SIN GASTAR
        UN TOKEN, y no puede inventar una consulta.
     2. Si no entendio o no trajo filas, o si se aprieta "Armar el tablero",
        la Edge Function preguntar2: el circuito con herramientas, que lee el
        diccionario del sistema, escribe la consulta, LA EJECUTA, MIRA EL
        RESULTADO, corrige si vino vacia, y declara el armado del tablero.

   Por que ese orden y no el inverso: el 14/10 la pantalla iba primero al
   modelo y servia de su memoria una consulta podrida que ligaba
   cpa36.observaciones en crudo contra gva21.nro_pedido — cero coincidencias —
   y devolvia 200 filas con las columnas pedidas vacias.

   NINGUNA CIFRA DE LAS TARJETAS LA ESCRIBE EL MODELO: el modelo declara la
   columna y el agregado, y el numero sale del bloque `resumen` que calcula la
   base EN SQL SOBRE TODAS LAS FILAS. Es la regla del 15/10, cuando conto por
   su cuenta y escribio "54 OC" donde eran 94.
   ===================================================================== */

var PG = { yendo:false, ultima:null };

var PG_EJEMPLOS = [
  'reporte de ventas comparativo desde 2024 a la fecha',
  'ventas por proveedor de 2026',
  'que articulos tienen stock cero',
  'que partidas estan vencidas o se vencen en los proximos 180 dias',
  'ordenes de compra contra pedido agosto 2026',
  'cuanto le vendimos a DROGUERIA CENTRAL en 2026'
];

/* ---------- numeros ---------- */
function pgSigno(v, cuerpo){ return (Number(v) < 0 ? '-$' : '$') + cuerpo; }
function pgNum(n){
  if (n === null || n === undefined || n === '') return '';
  return Number(n).toLocaleString('es-AR', {maximumFractionDigits:2});
}
function pgPesos(n){
  if (n === null || n === undefined || n === '') return '';
  return pgSigno(n, Math.abs(Math.round(Number(n))).toLocaleString('es-AR'));
}
function pgExacto(n){
  if (n === null || n === undefined || n === '') return '';
  return pgSigno(n, Math.abs(Number(n)).toLocaleString('es-AR',
                  {minimumFractionDigits:2, maximumFractionDigits:2}));
}
function pgMillones(n){
  var v = Number(n || 0);
  if (Math.abs(v) >= 1e6)
    return pgSigno(v, (Math.abs(v)/1e6).toLocaleString('es-AR', {maximumFractionDigits:1}) + ' M');
  return pgPesos(v);
}
function pgPct(n){
  if (n === null || n === undefined || n === '') return '';
  return Number(n).toLocaleString('es-AR', {minimumFractionDigits:1, maximumFractionDigits:2}) + '%';
}
function pgEsc(s){
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function pgFecha(v){
  var s = String(v === null || v === undefined ? '' : v);
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? m[3] + '/' + m[2] + '/' + m[1] : s;
}
/* Una celda, con el formato que declaro el circuito. El crudo va en data-v
   SALVO en las fechas: ahi data-v haria que el Excel se la lleve como TEXTO y
   la columna deje de ser una fecha. Medido abriendo el archivo bajado. */
function pgCelda(valor, formato){
  if (valor === null || valor === undefined || valor === '')
    return '<td' + (formato === 'pesos' || formato === 'numero' || formato === 'porcentaje'
                    ? ' class="db-num"' : '') + '></td>';
  if (formato === 'fecha')  return '<td>' + pgEsc(pgFecha(valor)) + '</td>';
  if (formato === 'codigo') return '<td class="db-cod">' + pgEsc(valor) + '</td>';
  if (formato === 'pesos'){
    var v = Number(valor);
    var corto = Math.abs(v) >= 1e6
      ? pgSigno(v, (Math.abs(v)/1e6).toLocaleString('es-AR', {maximumFractionDigits:2}) + ' M')
      : pgExacto(v);
    return '<td class="db-num" data-v="' + v + '" title="' + pgEsc(pgExacto(v)) + '">' +
           pgEsc(corto) + '</td>';
  }
  /* un ANIO no lleva separador de miles: 2024 escrito "2.024" se lee como otro
     numero. Va como entero pelado, pero numerico en data-v para que el Excel lo
     pueda ordenar. Lo agarre en el control local del 28/10. */
  if (formato === 'entero')
    return '<td class="db-num" data-v="' + Number(valor) + '">' + pgEsc(String(valor)) + '</td>';
  if (formato === 'numero')
    return '<td class="db-num" data-v="' + Number(valor) + '">' + pgEsc(pgNum(valor)) + '</td>';
  if (formato === 'porcentaje')
    return '<td class="db-num" data-v="' + Number(valor) + '">' + pgEsc(pgPct(valor)) + '</td>';
  return '<td>' + pgEsc(valor) + '</td>';
}
/* EL ROTULO de una columna cuando no viene declarado (es el caso de la via
   gratis: las intenciones devuelven los nombres crudos de la funcion). Sin
   esto la tabla muestra ANIO y VARIACION PCT, que es el nombre de la columna,
   no el de la cosa. */
var PG_ROTULOS = {
  anio:'Año', mes:'Mes', mes_nro:'Mes', fecha:'Fecha', fecha_venta:'Fecha',
  facturado:'Facturado', venta:'Venta', venta_total:'Venta', venta_renglon:'Venta',
  renglones:'Renglones', comprobantes:'Facturas', clientes:'Clientes',
  articulos:'Artículos', unidades:'Unidades', cantidad:'Cantidad',
  variacion_pct:'Variación', participacion_pct:'Participación',
  margen_pct:'Margen', markup_pct:'MarkUp', cobertura_pct:'Cobertura',
  cod_client:'Código', cliente:'Cliente', provincia:'Provincia',
  provincia_fiscal:'Provincia fiscal', zona:'Zona', localidad:'Localidad',
  cod_vended:'Código', vendedor:'Vendedor',
  cod_proveedor:'Código', proveedor:'Proveedor',
  cod_articu:'Artículo', articulo:'Descripción', detalle:'Descripción',
  comprobante:'Comprobante', n_comp:'Comprobante', t_comp:'Tipo',
  precio_unitario:'Precio unitario', costo:'Costo', costo_unitario:'Costo unitario',
  primera:'Primera', ultima:'Última', metodo:'Método', total:'Total',
  f2024:'2024', f2025:'2025', f2026:'2026'
};
function pgRotulo(col){
  var c = String(col || '');
  if (PG_ROTULOS[c]) return PG_ROTULOS[c];
  var t = c.replace(/_pct$/, ' %').replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* el formato de una columna cuando el circuito no lo declaro */
function pgAdivinarFormato(col, muestra){
  var c = String(col || '').toLowerCase();
  if (/^fecha|_fecha|fecha_|vencim|emision|primera|ultima/.test(c)) return 'fecha';
  /* un anio no es una cantidad: sin separador de miles */
  if (/^(anio|ano|year|mes_nro|dia)$/.test(c)) return 'entero';
  /* LOS CODIGOS EN SINGULAR. "comprobantes" y "partidas" en plural son CONTEOS,
     y tomarlos por codigo les saca el separador de miles y los baja como texto:
     la columna entera deja de poderse sumar en Excel. */
  if (/^cod_|_cod$|^codigo$|^comprobante$|^n_comp$|^nro_|_nro$|^partida$|^oc_nro$|^cuit$/.test(c))
    return 'codigo';
  if (/pct|porcentaje|margen_%|participacion/.test(c)) return 'porcentaje';
  var v = muestra;
  if (typeof v === 'number'){
    if (/facturado|venta|costo|importe|precio|monto|total|plata|margen|perdida|ganancia/.test(c))
      return 'pesos';
    return 'numero';
  }
  return 'texto';
}

/* ---------- Markdown de a poco: negrita, listas y parrafos.
   Todo lo demas se escapa: el texto lo escribio un modelo. ---------- */
function pgTexto(t){
  var s = pgEsc(String(t || '')).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  var out = [], lista = [];
  s.split(/\n/).forEach(function(l){
    var li = /^\s*[-•]\s+(.*)$/.exec(l);
    if (li){ lista.push('<li>' + li[1] + '</li>'); return; }
    if (lista.length){ out.push('<ul>' + lista.join('') + '</ul>'); lista = []; }
    if (l.trim()) out.push('<p>' + l + '</p>');
  });
  if (lista.length) out.push('<ul>' + lista.join('') + '</ul>');
  return out.join('');
}

/* ---------- el presupuesto, a la vista ---------- */
function pgMostrarPresupuesto(p){
  var el = document.getElementById('pgPresu');
  if (!el) return;
  if (!p){ el.textContent = ''; return; }
  el.innerHTML = 'Presupuesto de hoy: <b>' + pgExacto(p.usado_usd) + '</b> de ' +
                 pgExacto(p.tope_usd) + ' &middot; ' + pgNum(p.llamadas) + ' de ' +
                 pgNum(p.tope_llamadas) + ' llamadas';
}

/* ---------- preguntar ---------- */
function pgPreguntar(forzarCircuito){
  if (PG.yendo) return;
  var texto = document.getElementById('pgQ').value.trim();
  if (!texto){ document.getElementById('pgQ').focus(); return; }

  PG.yendo = true;
  document.getElementById('pgEnviar').disabled = true;
  document.getElementById('pgCircuito').disabled = true;
  document.getElementById('pgCuerpo').hidden = true;
  document.getElementById('pgEstado').innerHTML =
    '<div class="db-vacio">' + (forzarCircuito
      ? 'Armando el tablero: el circuito escribe la consulta, la ejecuta y mira el resultado&hellip;'
      : 'Buscando en lo que la base ya sabe contestar&hellip;') + '</div>';

  var t0 = Date.now();
  var listo = function(){
    PG.yendo = false;
    document.getElementById('pgEnviar').disabled = false;
    document.getElementById('pgCircuito').disabled = false;
  };

  if (forzarCircuito){ pgCircuito(texto, null, t0).then(listo, listo); return; }

  rpc('api_preguntar', { p_texto: texto, p_contexto: null })
    .then(function(r){
      var p = r.data || {};
      var sirve = p.entendio === true && Number(p.filas || 0) > 0;
      if (sirve){ pgDibujarIntencion(texto, p, Date.now() - t0); listo(); return; }
      document.getElementById('pgEstado').innerHTML =
        '<div class="db-vacio">La base no lo sabe contestar sola. Pasando al circuito&hellip;</div>';
      return pgCircuito(texto, p, t0).then(listo, listo);
    })
    .catch(function(e){
      document.getElementById('pgEstado').innerHTML =
        '<div class="db-aviso mal">No se pudo preguntar a la base: ' +
        pgEsc(e && e.message ? e.message : e) + '</div>';
      listo();
    });
}

/* la Edge Function preguntar2, con fetch crudo y el codigo HTTP a la vista:
   sb.functions.invoke miente con payloads grandes (medido el 20/10). */
function pgCircuito(texto, deIntencion, t0){
  return sb.auth.getSession().then(function(s){
    var tok = s && s.data && s.data.session ? s.data.session.access_token : null;
    if (!tok) throw new Error('La sesión venció. Volvé a entrar.');
    return fetch(SB_URL + '/functions/v1/preguntar2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
                 'Authorization': 'Bearer ' + tok, 'apikey': SB_KEY },
      body: JSON.stringify({ pregunta: texto })
    });
  }).then(function(r){
    return r.text().then(function(txt){
      var j;
      try { j = JSON.parse(txt); }
      catch (e){ throw new Error('HTTP ' + r.status + ': ' + txt.substring(0, 300)); }
      if (!r.ok && !j) throw new Error('HTTP ' + r.status);
      return j;
    });
  }).then(function(j){
    pgDibujarCircuito(texto, j, Date.now() - t0, deIntencion);
  }).catch(function(e){
    var h = '<div class="db-aviso mal"><b>El circuito no contestó.</b> ' +
            pgEsc(e && e.message ? e.message : e);
    if (deIntencion && deIntencion.entendio === true && deIntencion.respuesta){
      h += '<br><br>Lo que sí entendió la base: ' + pgEsc(deIntencion.respuesta);
    }
    h += '</div>';
    document.getElementById('pgEstado').innerHTML = h;
  });
}

/* ---------- dibujar: la respuesta de las intenciones ---------- */
function pgDibujarIntencion(texto, p, ms){
  var datos = p.datos || [];
  var h = [];
  h.push('<div class="db-titulo"><span class="q">' + pgEsc(texto) + '</span>' +
         pgEsc(p.respuesta || '') + '</div>');
  h.push('<div class="db-aviso ok"><b>Resuelta sin costo.</b> La contestó la base con lo que ya ' +
         'sabe, en ' + pgNum(ms) + ' ms, sin tocar el modelo. Si querés el tablero armado, ' +
         'apretá <b>Armar el tablero con la IA</b>.</div>');
  if (p.aviso) h.push('<div class="db-aviso">' + pgEsc(p.aviso) + '</div>');
  h.push(pgTabla(datos, null, p.entendido && p.entendido.que ? p.entendido.que.titulo : 'Resultado'));
  pgPintar(h.join(''));
}

/* ---------- dibujar: el tablero que declaro el circuito ---------- */
function pgDibujarCircuito(texto, j, ms, deIntencion){
  var h = [];

  if (!j || j.ok !== true){
    h.push('<div class="db-aviso mal"><b>' + pgEsc((j && j.respuesta) || 'No contestó.') + '</b>');
    if (j && j.origen) h.push('<div class="db-pie">origen: ' + pgEsc(j.origen) +
      (j.detalle ? ' &middot; ' + pgEsc(String(j.detalle).substring(0,300)) : '') + '</div>');
    h.push('</div>');
    if (j && j.presupuesto) pgMostrarPresupuesto(j.presupuesto);
    if (j && (j.consultas || j.pasos)) h.push(pgComoLoHizo(j));
    if (deIntencion && deIntencion.entendio === true && (deIntencion.datos || []).length){
      h.push('<div class="db-sec">Lo que sí pudo contestar la base</div>');
      h.push(pgTabla(deIntencion.datos, null, 'Resultado de la base'));
    }
    pgPintar(h.join(''));
    return;
  }

  PG.ultima = j;
  if (j.presupuesto) pgMostrarPresupuesto(j.presupuesto);

  /* UN BLOQUE POR CADA COSA QUE SE PREGUNTO. Si la pregunta pedia el
     comparativo, por cliente, por provincia, por proveedor y el detalle, acá
     vienen cinco, cada uno con sus tarjetas, su gráfico y su tabla — y cada
     tabla con sus botones de Excel y PDF, que se los cuelga bajar.js. */
  var bl = (j.bloques && j.bloques.length) ? j.bloques
         : [{ titulo:j.titulo, tarjetas:j.tarjetas, grafico:j.grafico, tabla:j.tabla,
              datos:j.datos, filas:j.filas, filas_que_viajan:j.filas_que_viajan,
              sin_datos: !(j.datos || []).length }];
  var conDatos = 0, i, k;
  for (i = 0; i < bl.length; i++) if (!bl[i].sin_datos) conDatos++;

  h.push('<div class="db-titulo"><span class="q">' + pgEsc(j.titulo || texto) + '</span>' +
         'La armó el circuito en <b>' + pgNum(ms) + ' ms</b> con <b>' + pgNum(j.llamadas || 0) +
         '</b> llamada(s) al modelo y <b>' + pgNum((j.consultas || []).length) +
         '</b> consulta(s) a la base &middot; <b>' + pgNum(conDatos) + '</b> bloque(s)</div>');

  /* la lectura, arriba de todo: es lo que hay que mirar */
  if (j.lectura){
    h.push('<div class="db-sec">Lo que hay que mirar</div>');
    h.push('<div class="db-titulo">' + pgTexto(j.lectura) + '</div>');
  }
  if (j.reparo){
    h.push('<div class="db-aviso"><b>Lo que esta medición no puede afirmar.</b> ' +
           pgEsc(j.reparo) + '</div>');
  }

  for (k = 0; k < bl.length; k++){
    var b = bl[k];
    var datos = b.datos || [];

    if (b.sin_datos || !datos.length){
      h.push('<div class="db-sec">' + pgEsc(b.titulo || ('Bloque ' + (k+1))) + '</div>');
      h.push('<div class="db-aviso mal">Este bloque quedó sin datos: la consulta que lo tenía ' +
             'que traer no corrió o volvió vacía. No se muestra una tabla vacía como si fuera ' +
             'una respuesta.</div>');
      continue;
    }

    h.push('<div class="db-sec">' + pgEsc(b.titulo || ('Bloque ' + (k+1))) +
           '<small>' + pgNum(b.filas || datos.length) + ' filas medidas' +
           (Number(b.filas || 0) > Number(b.filas_que_viajan || 0)
              ? ', ' + pgNum(b.filas_que_viajan) + ' en pantalla' : '') +
           (b.ms ? ' &middot; ' + pgNum(b.ms) + ' ms de base' : '') + '</small></div>');

    var tj = b.tarjetas || [];
    if (tj.length){
      h.push('<div class="db-tarjetas">');
      for (i = 0; i < tj.length; i++){
        var t = tj[i];
        var txt = t.formato === 'pesos' ? pgMillones(t.valor)
                : t.formato === 'porcentaje' ? pgPct(t.valor) : pgNum(t.valor);
        var sub = t.formato === 'pesos' ? pgExacto(t.valor) : '';
        h.push('<div class="db-t" title="' + pgEsc(t.de_donde || '') + '">' +
               '<div class="n">' + pgEsc(txt) + '</div>' +
               '<div class="r">' + pgEsc(t.etiqueta || '') + '</div>' +
               (sub ? '<div class="p">' + pgEsc(sub) + '</div>' : '') + '</div>');
      }
      h.push('</div>');
    }

    var g = b.grafico;
    if (g && g.etiqueta && g.valor && datos.length > 1) h.push(pgGrafico(datos, g));

    h.push(pgTabla(datos, b.tabla, b.titulo || 'Resultado', true));
  }

  h.push(pgComoLoHizo(j));
  pgPintar(h.join(''));
}

/* ---------- la tabla, con los botones de bajar que le cuelga bajar.js ---------- */
/* sinTitulo: cuando el bloque ya escribio su rotulo .db-sec. bajar.js toma el
   titulo del archivo del .db-sec anterior a la tabla, asi que SIEMPRE tiene que
   haber uno antes — si no, el nombre del archivo trepa el DOM y termina en el
   h1 del login, que es el defecto del 23/10. */
function pgTabla(datos, columnas, titulo, sinTitulo){
  datos = datos || [];
  if (!datos.length) return '<div class="db-vacio">No hay filas para mostrar.</div>';

  var cols = [];
  if (columnas && columnas.length){
    for (var i = 0; i < columnas.length; i++){
      if (datos[0].hasOwnProperty(columnas[i].columna)) cols.push(columnas[i]);
    }
  }
  if (!cols.length){
    for (var k in datos[0]){
      cols.push({ columna:k, rotulo: pgRotulo(k),
                  formato: pgAdivinarFormato(k, datos[0][k]) });
    }
  }

  var h = [];
  if (!sinTitulo){
    h.push('<div class="db-sec">' + pgEsc(titulo || 'Resultado') +
           '<small>' + pgNum(datos.length) + ' filas &middot; los dos botones de arriba bajan ' +
           'exactamente esto, sin volver a consultar la base.</small></div>');
  }
  h.push('<div class="db-tb-caja"><table class="db-tb"><thead><tr>');
  for (var c = 0; c < cols.length; c++){
    h.push('<th' + (cols[c].formato === 'pesos' || cols[c].formato === 'numero' ||
                    cols[c].formato === 'porcentaje' ? ' class="db-num"' : '') + '>' +
           pgEsc(cols[c].rotulo || cols[c].columna) + '</th>');
  }
  h.push('</tr></thead><tbody>');
  for (var f = 0; f < datos.length; f++){
    h.push('<tr>');
    for (var d = 0; d < cols.length; d++){
      h.push(pgCelda(datos[f][cols[d].columna], cols[d].formato));
    }
    h.push('</tr>');
  }
  h.push('</tbody></table></div>');
  return h.join('');
}

/* ---------- el grafico ---------- */
function pgGrafico(datos, g){
  var filas = datos.slice(0, g.tipo === 'columnas' ? 60 : 20);
  var max = 0, i;
  for (i = 0; i < filas.length; i++) max = Math.max(max, Math.abs(Number(filas[i][g.valor] || 0)));
  if (max <= 0) return '';

  var s, j;
  if (g.tipo === 'columnas'){
    var aCol = Math.max(10, Math.min(28, Math.floor(620 / filas.length)));
    var alto = 130, pad = 8, ancho = aCol * filas.length + pad * 2;
    s = ['<div class="db-graf"><div class="db-tip"></div>',
         '<svg viewBox="0 0 ' + ancho + ' ' + (alto + 30) + '" role="img" aria-label="gráfico">'];
    for (j = 0; j < filas.length; j++){
      var v = Number(filas[j][g.valor] || 0);
      var hc = Math.max(1, Math.round((alto - 10) * Math.abs(v) / max));
      var x = pad + j * aCol;
      var et = String(filas[j][g.etiqueta] === null || filas[j][g.etiqueta] === undefined
                      ? '' : filas[j][g.etiqueta]);
      s.push('<g class="f" data-tip="' + pgEsc(et + ': ' + pgExacto(v)) + '">');
      s.push('<rect class="b" x="' + (x + 2) + '" y="' + (alto - hc) + '" width="' +
             (aCol - 4) + '" height="' + hc + '"></rect>');
      if (j % Math.ceil(filas.length / 12) === 0 || j === filas.length - 1){
        s.push('<text class="et" x="' + (x + aCol/2) + '" y="' + (alto + 12) +
               '" text-anchor="middle">' + pgEsc(et.substring(0, 7)) + '</text>');
      }
      s.push('<rect class="z" x="' + x + '" y="0" width="' + aCol + '" height="' + alto + '"></rect>');
      s.push('</g>');
    }
    s.push('<line class="eje" x1="' + pad + '" y1="' + alto + '" x2="' + (ancho - pad) +
           '" y2="' + alto + '"></line></svg></div>');
    return s.join('');
  }

  var aEt = 150, aBarra = 330, altoF = 20, p2 = 7, aNum = 80;
  var total = aEt + aBarra + aNum, h2 = altoF * filas.length + p2 * 2;
  s = ['<div class="db-graf"><div class="db-tip"></div>',
       '<svg viewBox="0 0 ' + total + ' ' + h2 + '" role="img" aria-label="gráfico">'];
  for (j = 0; j < filas.length; j++){
    var v2 = Number(filas[j][g.valor] || 0);
    var y = p2 + j * altoF;
    var w = Math.max(1, Math.round(aBarra * Math.abs(v2) / max));
    var e2 = String(filas[j][g.etiqueta] === null || filas[j][g.etiqueta] === undefined
                    ? '' : filas[j][g.etiqueta]);
    s.push('<g class="f" data-tip="' + pgEsc(e2 + ': ' + pgExacto(v2)) + '">');
    s.push('<text class="et" x="0" y="' + (y + altoF/2 + 3) + '">' +
           pgEsc(e2.length > 26 ? e2.substring(0,25) + '…' : e2) + '</text>');
    s.push('<rect class="b" x="' + aEt + '" y="' + (y + 3) + '" width="' + w +
           '" height="' + (altoF - 8) + '"></rect>');
    s.push('<text class="val" x="' + (aEt + w + 6) + '" y="' + (y + altoF/2 + 3) + '">' +
           pgEsc(pgMillones(v2)) + '</text>');
    s.push('<rect class="z" x="0" y="' + y + '" width="' + total + '" height="' + altoF + '"></rect>');
    s.push('</g>');
  }
  s.push('<line class="eje" x1="' + (aEt - 1) + '" y1="' + (p2 - 3) + '" x2="' + (aEt - 1) +
         '" y2="' + (h2 - p2 + 3) + '"></line></svg></div>');
  return s.join('');
}

/* ---------- como lo hizo: los pasos, las consultas y lo que costo ---------- */
function pgComoLoHizo(j){
  var h = ['<details class="db-pie" style="margin-top:14px"><summary style="cursor:pointer">' +
           'Cómo lo hizo (los pasos, las consultas y lo que costó)</summary>'];
  var cs = j.consultas || [];
  if (cs.length){
    h.push('<div class="db-sec" style="margin-top:10px">Las consultas que ejecutó</div>');
    for (var i = 0; i < cs.length; i++){
      h.push('<div class="db-aviso ' + (cs[i].error ? 'mal' : 'ok') + '">' +
             (cs[i].por_que ? '<b>' + pgEsc(cs[i].por_que) + '</b><br>' : '') +
             (cs[i].error ? 'Rechazada: ' + pgEsc(cs[i].error)
                          : pgNum(cs[i].filas) + ' filas en ' + pgNum(cs[i].ms) + ' ms') +
             '<pre style="white-space:pre-wrap;margin:6px 0 0;font-size:10.5px">' +
             pgEsc(cs[i].sql) + '</pre></div>');
    }
  }
  var t = j.tokens || {};
  h.push('<div style="margin-top:8px">Modelo <b>' + pgEsc(j.modelo || '—') + '</b> &middot; ' +
         pgNum(j.llamadas || 0) + ' llamada(s) &middot; ' + pgNum(t.entrada || 0) +
         ' tokens de entrada y ' + pgNum(t.salida || 0) + ' de salida' +
         (j.presupuesto ? ' &middot; gastado hoy ' + pgExacto(j.presupuesto.usado_usd) +
                          ' de ' + pgExacto(j.presupuesto.tope_usd) : '') + '.</div>');
  h.push('<div>Las cifras de las tarjetas no las escribe el modelo: salen del resumen que ' +
         'calcula la base en SQL sobre todas las filas.</div>');
  h.push('</details>');
  return h.join('');
}

function pgPintar(html){
  document.getElementById('pgEstado').innerHTML = '';
  var c = document.getElementById('pgCuerpo');
  c.innerHTML = html;
  c.hidden = false;
  pgConectarTips(c);
}

function pgConectarTips(raiz){
  var gs = raiz.querySelectorAll('.db-graf');
  for (var g = 0; g < gs.length; g++){
    (function(graf){
      var tip = graf.querySelector('.db-tip');
      if (!tip) return;
      var grupos = graf.querySelectorAll('g.f');
      for (var i = 0; i < grupos.length; i++){
        (function(gr){
          gr.addEventListener('mousemove', function(ev){
            var caja = graf.getBoundingClientRect();
            tip.textContent = gr.getAttribute('data-tip') || '';
            tip.style.left = (ev.clientX - caja.left) + 'px';
            tip.style.top  = (ev.clientY - caja.top - 8) + 'px';
            tip.style.opacity = 1;
          });
          gr.addEventListener('mouseleave', function(){ tip.style.opacity = 0; });
        })(grupos[i]);
      }
    })(gs[g]);
  }
}

/* ---------- arranque ---------- */
var PG_ARMADO = false;
function calcular(){
  if (PG_ARMADO) return;
  PG_ARMADO = true;

  var ej = document.getElementById('pgEjemplos');
  var h = ['Probá con: '];
  for (var i = 0; i < PG_EJEMPLOS.length; i++){
    h.push('<a href="#" data-q="' + pgEsc(PG_EJEMPLOS[i]) + '">' + pgEsc(PG_EJEMPLOS[i]) + '</a>');
    if (i < PG_EJEMPLOS.length - 1) h.push(' &middot; ');
  }
  ej.innerHTML = h.join('');
  ej.addEventListener('click', function(ev){
    var a = ev.target.closest('a[data-q]');
    if (!a) return;
    ev.preventDefault();
    document.getElementById('pgQ').value = a.getAttribute('data-q');
    pgPreguntar(false);
  });

  document.getElementById('pgEnviar').addEventListener('click', function(){ pgPreguntar(false); });
  document.getElementById('pgCircuito').addEventListener('click', function(){ pgPreguntar(true); });
  document.getElementById('pgQ').addEventListener('keydown', function(ev){
    if (ev.key === 'Enter') pgPreguntar(false);
  });

  rpc('api_ia_presupuesto', { p_estimado_usd: 0 })
    .then(function(r){ pgMostrarPresupuesto(r.data); })
    .catch(function(){});

  document.getElementById('pgQ').focus();
}
