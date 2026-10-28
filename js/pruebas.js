
/* =====================================================================
   MENU DE PRUEBAS                                          28/10/2026
   =====================================================================
   La pantalla es texto y enlaces: no consulta la base. Pero `core.js`
   llama `calcular()` al entrar y NO la llama si el modulo esta apagado
   para el usuario, asi que la funcion tiene que existir igual: sin ella,
   la consola tira un error y la pantalla queda muda.
   ===================================================================== */
function calcular(){
  var e = document.getElementById('prEstado');
  if (!e) return;
  /* se dice QUIEN esta mirando, porque el sentido de esta pantalla es que la
     vea uno solo. Si aca aparece otro rol, el portero esta mal. */
  var rol = (document.getElementById('rolUsuario') || {}).textContent || '';
  e.innerHTML = '<div class="db-aviso ok">Entraste como <b>' +
    String(rol).replace(/[<>&"]/g, '') + '</b>. ' +
    'Estas pantallas sólo las ve el rol <b>super</b>: con cualquier otro usuario el portero ' +
    'las tapa y la consulta no corre, aunque se escriba la dirección a mano.</div>';
}
