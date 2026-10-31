/* =====================================================================
   PAGINAR LAS GRILLAS                                      28/10/2026
   =====================================================================
   « primera · anterior · "1 a 30 de 5.072 renglones · pagina 1 de 170"
   · siguiente · ultima » , mas un selector de filas por pagina.
   Es el mismo paginado del informe `Facturas-de-venta-2026-DISSAN.html`
   que mando el usuario, replicado.

   POR QUE SE REHIZO ESTE ARCHIVO EL MISMO DIA QUE SE ESCRIBIO. La
   primera version pintaba 30 filas y escondia el resto con un boton
   "Mostrar todas". Con un mes filtrado eso mostraba SOLO EL ULTIMO DIA y
   no habia forma de llegar al renglon 31: ni scroll ni pagina siguiente.
   Yo crei que "mostrar menos" era esconder; mostrar menos es PAGINAR.
   Esconder sin salida es el mismo defecto del recorte informado como
   total que aparecio hoy en `api_ia_sql`, un piso mas arriba.

   LA TRAMPA QUE HAY QUE RESPETAR SI SE TOCA. `bajar.js` arma el Excel y
   el PDF leyendo `tbody tr` DE LA PANTALLA. Si el paginado dejara de
   pintar las filas de las otras paginas, el archivo bajaria solo la
   pagina actual y diria que son todas.
   Por eso las filas SE PINTAN TODAS y las de las otras paginas se tapan
   con el atributo `hidden`: `querySelectorAll` las trae igual, asi que el
   archivo sigue bajando el total. Y la barra lo dice con letras, para que
   nadie tenga que suponerlo.

   Las filas de TOTAL (`tot` en la clase) no entran en la cuenta y se ven
   en todas las paginas: un total que aparece solo en la ultima pagina es
   un total que no se encuentra.

   Es generico y sin lista de tablas escrita a mano, por la misma razon
   que `bajar.js`: una lista se queda corta sin avisar y la pantalla nueva
   de manana nace sin el control.
   ===================================================================== */

var FILAS_POR_PAGINA = 30;                          /* el mismo que su informe */
var FILAS_OPCIONES   = [30, 60, 120, 250, 500, 0];  /* 0 = todas */

function filasNum(n){
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/* una fila que no es un dato: el total, o el "no hay datos" de una sola celda */
function filasEsFija(tr, cols){
  if (/tot\b|\btot/.test(tr.className || '')) return true;
  if (tr.children.length === 1 && cols > 1) return true;
  return false;
}

function filasPintar(est){
  var d = est.datos, total = d.length;
  var porPag = est.porPag > 0 ? est.porPag : total;
  var paginas = Math.max(1, Math.ceil(total / porPag));
  if (est.pag > paginas) est.pag = paginas;
  if (est.pag < 1) est.pag = 1;

  var desde = (est.pag - 1) * porPag;
  var hasta = Math.min(total, desde + porPag);
  for (var i = 0; i < total; i++){
    if (i >= desde && i < hasta) d[i].removeAttribute('hidden');
    else d[i].setAttribute('hidden', '');
  }

  var ops = '';
  for (var o = 0; o < FILAS_OPCIONES.length; o++){
    var v = FILAS_OPCIONES[o];
    if (v > 0 && v > total && v !== FILAS_POR_PAGINA) continue;   /* 500 por pagina con 80 filas no sirve */
    ops += '<option value="' + v + '"' + (v === est.porPag ? ' selected' : '') + '>' +
           (v === 0 ? 'todas' : filasNum(v)) + '</option>';
  }

  est.barra.innerHTML =
    '<button type="button" class="fl-b" data-ir="1" ' + (est.pag === 1 ? 'disabled' : '') + '>&laquo; primera</button>' +
    '<button type="button" class="fl-b" data-ir="-" ' + (est.pag === 1 ? 'disabled' : '') + '>anterior</button>' +
    '<span class="fl-pg"><b>' + filasNum(total ? desde + 1 : 0) + '</b> a <b>' + filasNum(hasta) +
      '</b> de <b>' + filasNum(total) + '</b> renglones &middot; página <b>' + est.pag +
      '</b> de <b>' + filasNum(paginas) + '</b></span>' +
    '<button type="button" class="fl-b" data-ir="+" ' + (est.pag === paginas ? 'disabled' : '') + '>siguiente</button>' +
    '<button type="button" class="fl-b" data-ir="u" ' + (est.pag === paginas ? 'disabled' : '') + '>última &raquo;</button>' +
    '<span class="fl-sep"></span>' +
    '<label class="fl-lab">Filas por página ' +
    '<select class="fl-sel" data-no-filtro="1">' + ops + '</select></label>' +
    '<span class="fl-baj">el Excel y el PDF bajan las <b>' + filasNum(total) + '</b>, no esta página</span>';
}

function filasPonerControl(){
  var cont = document.getElementById('contenido');
  if (!cont) return;
  var tablas = cont.querySelectorAll('table');
  for (var i = 0; i < tablas.length; i++){
    var t = tablas[i];
    if (t.dataset.filas === '1') continue;
    if (t.closest('.modal-fondo')) continue;

    var cols = t.querySelectorAll('thead th').length;
    var trs  = t.querySelectorAll('tbody tr');
    var datos = [];
    for (var r = 0; r < trs.length; r++) if (!filasEsFija(trs[r], cols)) datos.push(trs[r]);
    if (datos.length <= FILAS_POR_PAGINA) continue;   /* entra entera: no se pagina */
    t.dataset.filas = '1';

    var barra = document.createElement('div');
    barra.className = 'fl-barra';

    var est = { datos: datos, pag: 1, porPag: FILAS_POR_PAGINA, barra: barra };
    filasPintar(est);

    (function(est){
      est.barra.addEventListener('click', function(ev){
        var b = ev.target.closest('.fl-b');
        if (!b || b.disabled) return;
        var ir = b.getAttribute('data-ir');
        var porPag  = est.porPag > 0 ? est.porPag : est.datos.length;
        var paginas = Math.max(1, Math.ceil(est.datos.length / porPag));
        if (ir === '1') est.pag = 1;
        else if (ir === '-') est.pag = Math.max(1, est.pag - 1);
        else if (ir === '+') est.pag = Math.min(paginas, est.pag + 1);
        else if (ir === 'u') est.pag = paginas;
        filasPintar(est);
      });
      est.barra.addEventListener('change', function(ev){
        if (!ev.target.classList.contains('fl-sel')) return;
        est.porPag = Number(ev.target.value);
        est.pag = 1;
        filasPintar(est);
      });
    })(est);

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
