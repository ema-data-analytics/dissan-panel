
/* =====================================================================
   MENU DE PRUEBAS                                          28/10/2026
   =====================================================================
   La pantalla es texto y enlaces: no consulta la base. Pero `core.js`
   llama `calcular()` al entrar y NO la llama si el modulo esta apagado
   para el usuario, asi que la funcion tiene que existir igual: sin ella,
   la consola tira un error y la pantalla queda muda.
   ===================================================================== */
/* La misma pantalla vive en dos direcciones:
     /pruebas.html   dentro del panel, con el menu de siempre al costado
     /pruebas/       direccion aparte, SIN el menu de DISSAN, para pasarsela a
                     alguien que viene a probar y nada mas
   En /pruebas/ hay que arreglar dos cosas: los enlaces de las fichas, que
   apuntan a la raiz y desde una subcarpeta caerian en /pruebas/ventas.html; y
   el menu que arma core.js, cuyos enlaces tienen el mismo problema. En vez de
   reescribirle los enlaces al menu, se saca: en esa direccion el menu no tiene
   sentido, y un enlace roto es peor que no tenerlo. */
var PR_APARTE = location.pathname.indexOf('/pruebas/') >= 0;

function prAcomodarAparte(){
  if (!PR_APARTE) return;
  /* 1. las fichas: a la raiz */
  var a = document.querySelectorAll('#prRaiz a.pr-btn');
  for (var i = 0; i < a.length; i++){
    var h = a[i].getAttribute('href') || '';
    if (h && h.indexOf('/') !== 0 && h.indexOf('..') !== 0 && !/^https?:/.test(h)){
      a[i].setAttribute('href', '../' + h);
    }
  }
  /* 2. el menu de DISSAN no se muestra aca */
  var m = document.getElementById('menuLateral');
  if (m) m.innerHTML = '<div class="pr-sinmenu">Dirección de pruebas:<br>el menú de DISSAN ' +
                       'no se muestra acá.</div>';
}

function calcular(){
  prAcomodarAparte();
  var e = document.getElementById('prEstado');
  if (!e) return;
  /* se dice QUIEN esta mirando, porque el sentido de esta pantalla es que la
     vea uno solo. Si aca aparece otro rol, el portero esta mal. */
  var rol = (document.getElementById('rolUsuario') || {}).textContent || '';
  e.innerHTML = '<div class="db-aviso ok">Entraste como <b>' +
    String(rol).replace(/[<>&"]/g, '') + '</b>. ' +
    'Estas pantallas sólo las ve el rol <b>pruebas</b>: con cualquier otro usuario el portero ' +
    'las tapa y la consulta no corre, aunque se escriba la dirección a mano.' +
    (PR_APARTE ? ' Estás en la <b>dirección de pruebas</b>, sin el menú de DISSAN.' : '') +
    '</div>';
}
