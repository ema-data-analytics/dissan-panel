/* =====================================================================
   MOSTRAR MENOS FILAS EN LAS GRILLAS                       28/10/2026
   =====================================================================
   Pedido del usuario: que las grillas muestren menos lineas, y que se
   puedan seguir bajando a Excel y a PDF.

   LA TRAMPA, Y COMO SE RESUELVE. `bajar.js` arma el archivo CON LO QUE
   ESTA EN LA PANTALLA -- lee `tbody tr` de la tabla. Si se pintaran solo
   30 filas, el Excel bajaria 30 y diria que son todas: es exactamente el
   defecto del recorte informado como total que aparecio hoy en
   `api_ia_sql` (informaba 500 y eran 1.268).

   Asi que las filas NO se dejan de pintar: se pintan todas y las que
   sobran se esconden con el atributo `hidden`. `bajar.js` usa
   `querySelectorAll('tbody tr')`, que trae las escondidas tambien, asi
   que el archivo sigue bajando TODO. Y la barra lo dice con letras, para
   que nadie tenga que suponerlo.

   Es generico y sin lista de tablas escrita a mano, por la misma razon
   que `bajar.js`: una lista se queda corta sin avisar y la pantalla nueva
   de manana nace sin el control.
   ===================================================================== */

var FILAS_VISIBLES = 30;   /* cuantas se ven de entrada */
var FILAS_MARGEN   = 10;   /* abajo de 30+10 no vale la pena esconder nada */

function filasNum(n){
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/* esconde o muestra las que sobran, y reescribe la barra */
function filasAplicar(tabla, barra, abierta){
  var trs = tabla.querySelectorAll('tbody tr');
  var total = trs.length;
  for (var i = 0; i < total; i++){
    if (abierta) trs[i].removeAttribute('hidden');
    else if (i >= FILAS_VISIBLES) trs[i].setAttribute('hidden', '');
    else trs[i].removeAttribute('hidden');
  }
  barra.innerHTML =
    '<span class="fl-txt">' +
    (abierta ? 'Mostrando las <b>' + filasNum(total) + '</b> filas'
             : 'Mostrando <b>' + FILAS_VISIBLES + '</b> de <b>' + filasNum(total) + '</b> filas') +
    ' &middot; el Excel y el PDF bajan las <b>' + filasNum(total) + '</b></span>' +
    '<button type="button" class="fl-btn">' +
    (abierta ? 'Mostrar solo ' + FILAS_VISIBLES : 'Mostrar todas') + '</button>';
}

function filasPonerControl(){
  var cont = document.getElementById('contenido');
  if (!cont) return;
  var tablas = cont.querySelectorAll('table');
  for (var i = 0; i < tablas.length; i++){
    var t = tablas[i];
    if (t.dataset.filas === '1') continue;
    if (t.closest('.modal-fondo')) continue;
    var cuantas = t.querySelectorAll('tbody tr').length;
    if (cuantas < FILAS_VISIBLES + FILAS_MARGEN) continue;   /* chica: se deja entera */
    t.dataset.filas = '1';

    var barra = document.createElement('div');
    barra.className = 'fl-barra';

    (function(tabla, barra){
      var abierta = false;
      filasAplicar(tabla, barra, abierta);
      barra.addEventListener('click', function(ev){
        if (!ev.target.closest('.fl-btn')) return;
        abierta = !abierta;
        filasAplicar(tabla, barra, abierta);
      });
    })(t, barra);

    /* abajo de la caja que envuelve la tabla, no adentro: adentro queda
       atrapada por el scroll horizontal y no se encuentra. Es la misma
       razon por la que la barra de bajar va afuera. */
    var caja = t.parentElement;
    var envoltorio = (caja && caja !== cont && /caja|wrap|tb/.test(caja.className || ''))
                     ? caja : t;
    if (envoltorio.nextSibling)
      envoltorio.parentNode.insertBefore(barra, envoltorio.nextSibling);
    else
      envoltorio.parentNode.appendChild(barra);
  }
}

(function(){
  function arrancar(){
    var cont = document.getElementById('contenido');
    if (!cont) return;
    filasPonerControl();
    var pendiente = null;
    new MutationObserver(function(){
      clearTimeout(pendiente);
      pendiente = setTimeout(filasPonerControl, 150);
    }).observe(cont, { childList:true, subtree:true });
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
