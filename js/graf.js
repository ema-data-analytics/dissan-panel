/* LAS BARRAS DEL PANEL, EN UN SOLO LUGAR.                        20/11/2026
   =========================================================================
   `dbGrafBarras` y `dbConectarTips` vivian adentro de js/tablero.js. El
   Detalle de ventas necesita las mismas barras —la hoja RESUMEN del Excel
   de Tango tiene un grafico y yo habia puesto solo tablas— y copiarlas
   habria dejado DOS COPIAS de la misma cosa, que es el defecto del 30/10
   con `listas`: se separan con el tiempo y el arreglo de una no llega a la
   otra.

   Entonces se extraen aca y las dos pantallas cargan ESTE archivo. El CSS
   no se toca: `.db-graf` ya vive en css/tablero-db.css, que las dos
   pantallas ya cargaban.

   El dibujo no cambio ni un pixel respecto de la version del Tablero: es
   el mismo cuerpo, movido. Lo comprueban las puertas, que abren el Tablero
   con datos, le aprietan los botones y le bajan el Excel y el PDF.
   ========================================================================= */

function grafEsc(s){
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
    s.push('<g class="f" data-tip="' + grafEsc(fnTip(f)) + '">');
    s.push('<text class="et" x="0" y="' + (y + alto/2 + 3) + '">' + grafEsc(et) + '</text>');
    s.push('<rect class="b ' + (tono || '') + '" x="' + aEt + '" y="' + (y + 3) +
           '" width="' + w + '" height="' + (alto - 8) + '"></rect>');
    s.push('<text class="val" x="' + (aEt + w + 6) + '" y="' + (y + alto/2 + 3) + '">' +
           grafEsc(fnTexto(f)) + '</text>');
    s.push('<rect class="z" x="0" y="' + y + '" width="' + total + '" height="' + alto + '"></rect>');
    s.push('</g>');
  }
  s.push('<line class="eje" x1="' + (aEt - 1) + '" y1="' + (pad - 3) +
         '" x2="' + (aEt - 1) + '" y2="' + (h - pad + 3) + '"></line>');
  s.push('</svg></div>');
  return s.join('');
}

function dbConectarTips(raiz){
  var graficos = (raiz || document).querySelectorAll('.db-graf');
  for (var g = 0; g < graficos.length; g++){
    (function(grafico){
      var tip = grafico.querySelector('.db-tip');
      if (!tip) return;
      var grupos = grafico.querySelectorAll('g.f');
      for (var i = 0; i < grupos.length; i++){
        (function(gr){
          gr.addEventListener('mouseenter', function(ev){
            var caja = grafico.getBoundingClientRect();
            tip.textContent = gr.getAttribute('data-tip') || '';
            tip.style.left = (ev.clientX - caja.left + 12) + 'px';
            tip.style.top  = (ev.clientY - caja.top  - 8)  + 'px';
            tip.classList.add('v');
          });
          gr.addEventListener('mouseleave', function(){ tip.classList.remove('v'); });
        })(grupos[i]);
      }
    })(graficos[g]);
  }
}
