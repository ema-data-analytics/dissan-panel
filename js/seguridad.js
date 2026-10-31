/* ===================================================================
   USUARIOS Y PERMISOS  —  el modulo de Apps Script, tal cual, en la
   plataforma nueva.
   -------------------------------------------------------------------
   El marcado, la hoja de estilo, la tabla con sus insignias, los cuatro
   modales y los botones de icono son los del modulo viejo, copiados
   verbatim. Lo unico que cambia son los puentes:

     listarUsuarios          -> usuarios {accion:'listar'}
     crearUsuario            -> usuarios {accion:'crear'}
     editarPerfilUsuario     -> usuarios {accion:'perfil'}
     cambiarEmailUsuario     -> usuarios {accion:'email'}
     cambiarPasswordUsuario  -> usuarios {accion:'password'}
     anular / reactivar      -> usuarios {accion:'estado'}

   POR QUE UNA EDGE FUNCTION Y NO UNA rpc: todo esto necesita la clave de
   SERVICIO (/auth/v1/admin/users). Esta pagina es publica; esa clave no
   puede estar aca. Vive en el entorno de la Edge Function «usuarios»
   como SUPABASE_SERVICE_ROLE_KEY, nunca se devuelve, y la funcion exige
   rol super y activo antes de hacer nada — igual que exigirSuper_().

   DOS COSAS QUE NO SE COPIAN, Y POR QUE (las dos son defectos medidos
   del modulo viejo, no mejoras):

   1. LOS ROLES SALEN DE api_roles_v2(), NO DE UNA LISTA A MANO. El
      desplegable viejo ofrecia «usuario», que el servidor rechaza con
      «Rol invalido», y NO ofrecia «operador», que es el rol real del
      usuario de DISSAN: editarle el nombre le cambiaba el rol sin
      querer. Los roles de verdad los lee modulos.roles: admin,
      consulta, gerencia, operador, super.

   2. LA INSIGNIA NO VA ESCAPADA DOS VECES. El modulo viejo hacia
      esc(badgeRol) sobre un texto que YA es HTML, asi que en las
      columnas Rol y Estado se leia el <span ...> escrito como texto en
      vez de la insignia. El contenido de la insignia ya pasa por esc()
      cuando se arma.
   =================================================================== */

/* El puente. No se usa sb.functions.invoke: con payloads grandes miente
   con «non-2xx status code» mientras un fetch crudo devuelve 200 (medido
   el 20/10). Va fetch, con el codigo HTTP y el cuerpo a la vista. */
function SEG_FN(cuerpo, intentos){
  intentos = intentos || 2;
  var ultimo = '';
  function una(i){
    return sb.auth.getSession().then(function(s){
      var ses = s && s.data ? s.data.session : null;
      if (!ses) throw new Error('La sesión venció. Volvé a entrar.');
      return fetch(SB_URL + '/functions/v1/usuarios', {
        method: 'POST',
        headers: { 'Content-Type':'application/json',
                   'Authorization':'Bearer ' + ses.access_token,
                   'apikey': SB_KEY },
        body: JSON.stringify(cuerpo)
      });
    }).then(function(r){
      return r.text().then(function(txt){
        var j = null;
        try { j = JSON.parse(txt); } catch(e){}
        if (j && typeof j.ok === 'boolean') return j;   /* contesto, bien o mal */
        ultimo = 'HTTP ' + r.status + ' · ' + txt.slice(0,160);
        throw new Error(ultimo);
      });
    }).catch(function(e){
      ultimo = String(e.message || e);
      if (i < intentos) return una(i + 1);
      /* la pantalla espera {ok:false, error:...}, como el servidor viejo */
      return { ok:false, error: ultimo || 'no contestó' };
    });
  }
  return una(1);
}

/* El motivo que devuelve la Edge Function se llama «motivo»; el servidor
   viejo lo llamaba «error». La pantalla lee los dos. */
function SEG_MOTIVO(res){
  if (!res) return 'No salió.';
  return res.motivo || res.error || 'No salió.';
}

var SEG_ROLES = [];   /* los que manda api_roles_v2(), via la Edge Function */

/* Carga los roles de verdad en los tres desplegables. */
function segCargarRoles(lista, rolDe){
  if (lista && lista.length) SEG_ROLES = lista.map(function(x){ return x.rol || x; });
  if (!SEG_ROLES.length) return;
  ['segRol','perfilRol'].forEach(function(id){
    var s = document.getElementById(id);
    if (!s) return;
    var antes = s.value;
    s.innerHTML = SEG_ROLES.map(function(r){
      return '<option value="' + esc(r) + '">' + esc(r) + '</option>'; }).join('');
    if (antes && SEG_ROLES.indexOf(antes) >= 0) s.value = antes;
  });
}

/* core.js llama calcular() al entrar, y es tambien el boton Actualizar. */
function calcular(){ cargarListaUsuarios(); }

  // ============================================
  // R8 — ningun pedido al servidor queda sin manejo de error.
  // Antes, si fallaba una llamada, la pantalla quedaba en blanco o trabada
  // en "Cargando..." sin decir nada.
  // ============================================
  function avisarFalloServidor(err) {
    var texto = (err && err.message) ? err.message : 'No se pudo contactar al servidor.';
    var caja = document.getElementById('avisoError');
    if (!caja) {
      caja = document.createElement('div');
      caja.id = 'avisoError';
      caja.setAttribute('style',
        'position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;' +
        'background:#3B1111;color:#FFD7D7;border:1px solid #7A2323;' +
        'border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.5');
      document.body.appendChild(caja);
    }
    caja.textContent = 'No se pudo cargar la informacion: ' + texto +
                       '  (probá de nuevo; si sigue, avisá al administrador)';
    // Que no quede nada trabado en "Cargando..."
    var cargando = document.querySelectorAll('[data-cargando], .cargando');
    for (var i = 0; i < cargando.length; i++) cargando[i].textContent = 'No se pudo cargar.';
  }

  // ============================================
  // ESCAPADO  (S8)
  // Todo lo que viene de la base pasa por aca antes de entrar a la pagina.
  // Sin esto, un nombre como  D'Angelo  rompe el boton de editar, y un nombre
  // armado a proposito ejecuta codigo con los permisos del que esta mirando.
  // ============================================
  /* esc() ya vive en core.js y escapa los mismos cinco caracteres:
     & < > " '  — no se declara de nuevo (un segundo `esc` en el mismo
     ambito global rompe el archivo entero con SyntaxError). */
  // Para un valor que queda dentro de onclick="f('AQUI')": primero cadena de
  // JavaScript, despues atributo HTML.
  function escAtr(v) {
    if (v === null || v === undefined) return '';
    // Sin literales con barra invertida: el mismo escape, armado con
    // fromCharCode(92). Asi el archivo se puede trasladar a cualquier editor
    // sin que se pierdan o se dupliquen las barras por el camino.
    var B = String.fromCharCode(92);
    var s = String(v).split(B).join(B + B);
    s = s.split("'").join(B + "'");
    return esc(s);
  }

  let segUsuariosCache = [];

  function iniciarSeguridad() {
    cargarListaUsuarios();
  }

  function cargarListaUsuarios() {
    var t0 = performance.now();
    SEG_FN({ accion: 'listar' }).then(function(res) {
      if (!res.ok) {
        document.getElementById('segTablaBody').innerHTML =
          '<tr><td colspan="5">' + esc(SEG_MOTIVO(res)) + '</td></tr>';
        return;
      }
      segCargarRoles(res.roles);
      segUsuariosCache = res.usuarios || [];
      renderTabla(segUsuariosCache);
      /* el reloj es parte del control: contra este numero se compara la base */
      var r = document.getElementById('reloj');
      if (r) { r.hidden = false;
               r.textContent = segUsuariosCache.length + ' usuarios · ' +
                               Math.round(performance.now() - t0) + ' ms'; }
    });
  }

  function iconoUsuario() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>';
  }
  function iconoEditar() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
  }
  function iconoLlave() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="15" r="4"/><path d="M10.5 12.5L20 3M17 6l3 3M14 9l2.5 2.5"/></svg>';
  }
  function iconoBan() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/></svg>';
  }
  function iconoCheck() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 5-5"/></svg>';
  }

  function renderTabla(lista) {
    const cuerpo = document.getElementById('segTablaBody');
    if (lista.length === 0) {
      cuerpo.innerHTML = '<tr><td colspan="5">No se encontraron usuarios.</td></tr>';
      return;
    }
    cuerpo.innerHTML = lista.map(function(u) {
      const inicial = (u.nombre || '?').charAt(0).toUpperCase();
      const badgeRol = '<span class="badge badge-' + esc(u.rol) + '">' + esc(u.rol) + '</span>';
      const badgeEstado = u.activo
        ? '<span class="badge badge-activo">Activo</span>'
        : '<span class="badge badge-anulado">Anulado</span>';
      const botonEstado = u.activo
        ? '<button class="btn-icono peligro" title="Anular" onclick="cambiarEstado(\'' + escAtr(u.id) + '\', false)">' + iconoBan() + '</button>'
        : '<button class="btn-icono exito" title="Reactivar" onclick="cambiarEstado(\'' + escAtr(u.id) + '\', true)">' + iconoCheck() + '</button>';

      return '<tr>' +
        '<td><div class="fila-usuario"><div class="mini-avatar">' + esc(inicial) + '</div>' + esc(u.nombre) + '</div></td>' +
        '<td>' + esc(u.email) + '</td>' +
        '<td>' + badgeRol + '</td>' +
        '<td>' + badgeEstado + '</td>' +
        '<td><div class="acciones-fila">' +
          '<button class="btn-icono" title="Editar nombre y rol" onclick="abrirModalPerfil(\'' + escAtr(u.id) + '\', \'' + escAtr(u.nombre) + '\', \'' + escAtr(u.rol) + '\')">' + iconoUsuario() + '</button>' +
          '<button class="btn-icono" title="Cambiar email" onclick="abrirModalEmail(\'' + escAtr(u.id) + '\', \'' + escAtr(u.email) + '\')">' + iconoEditar() + '</button>' +
          '<button class="btn-icono" title="Cambiar contraseña" onclick="abrirModalPassword(\'' + escAtr(u.id) + '\')">' + iconoLlave() + '</button>' +
          botonEstado +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  function filtrarUsuarios() {
    const q = document.getElementById('segBuscar').value.toLowerCase();
    renderTabla(segUsuariosCache.filter(function(u) {
      /* un nombre o email nulo tiraba TypeError y dejaba la tabla sin pintar */
      return String(u.nombre || '').toLowerCase().includes(q) ||
             String(u.email  || '').toLowerCase().includes(q) ||
             String(u.rol    || '').toLowerCase().includes(q);
    }));
  }

  function abrirModal(id) { document.getElementById(id).classList.add('visible'); }
  function cerrarModal(id) { document.getElementById(id).classList.remove('visible'); }

  /* 31/10/2026 — Dar de baja es la unica accion destructiva de esta pantalla
     y se hacia con UN clic, sin preguntar nada. Ahora abre la confirmacion,
     que vive adentro de la pantalla (nunca confirm(), que traba la pestana). */
  function cambiarEstado(id, activar) {
    var fila = null, u = (segUsuariosCache || []);
    for (var i = 0; i < u.length; i++) if (String(u[i].id) === String(id)) fila = u[i];
    var quien = fila ? (fila.nombre || fila.email || '') : '';
    document.getElementById('estadoUsuarioId').value = id;
    document.getElementById('estadoActivar').value = activar ? '1' : '';
    document.getElementById('estadoTitulo').textContent =
      activar ? 'Reactivar el acceso' : 'Dar de baja el acceso';
    document.getElementById('estadoConfirmar').textContent =
      activar ? 'Reactivar' : 'Dar de baja';
    document.getElementById('estadoTexto').textContent = activar
      ? ('Vas a reactivar a ' + quien + '. Va a poder volver a entrar al panel con su contrase\u00f1a de siempre.')
      : ('Vas a dar de baja a ' + quien + '. No va a poder entrar al panel. El usuario NO se borra: queda anulado y se puede reactivar desde esta misma pantalla.');
    var m = document.getElementById('segMensajeEstado');
    m.textContent = ''; m.className = 'modal-mensaje';
    document.getElementById('modalEstado').classList.add('visible');
  }

  function confirmarEstado() {
    var id = document.getElementById('estadoUsuarioId').value;
    var activar = document.getElementById('estadoActivar').value === '1';
    var m = document.getElementById('segMensajeEstado');
    var b = document.getElementById('estadoConfirmar');
    m.textContent = ''; m.className = 'modal-mensaje'; b.disabled = true;
    SEG_FN({ accion: 'estado', id: id, activo: !!activar }).then(function(res) {
      b.disabled = false;
      if (res && res.ok) { cerrarModal('modalEstado'); cargarListaUsuarios(); return; }
      /* EL CANDADO NO ES UNA FALLA DE RED. El del ultimo administrador va a
         rechazar SIEMPRE: decirle "proba de nuevo" manda al usuario a dar
         vueltas, y "avisa al administrador" se lo dice AL administrador. */
      m.textContent = SEG_MOTIVO(res);
      m.className = 'modal-mensaje error';
    });
  }

  function crearUsuarioForm(e) {
    e.preventDefault();
    const msg = document.getElementById('segMensajeNuevo');
    msg.className = 'modal-mensaje';

    const nombre = document.getElementById('segNombre').value.trim();
    const email = document.getElementById('segEmail').value.trim();
    const password = document.getElementById('segPassword').value;
    const rol = document.getElementById('segRol').value;

    SEG_FN({ accion: 'crear', nombre: nombre, email: email,
             password: password, rol: rol }).then(function(res) {
      if (res.ok) {
        document.getElementById('formNuevoUsuario').reset();
        segCargarRoles();
        cerrarModal('modalNuevo');
        cargarListaUsuarios();
      } else {
        msg.textContent = SEG_MOTIVO(res);
        msg.className = 'modal-mensaje error';
      }
    });
    return false;
  }

  function abrirModalPerfil(id, nombreActual, rolActual) {
    document.getElementById('perfilUsuarioId').value = id;
    document.getElementById('perfilNombre').value = nombreActual;
    document.getElementById('perfilRol').value = rolActual;
    document.getElementById('segMensajePerfil').className = 'modal-mensaje';
    abrirModal('modalPerfil');
  }

  function guardarPerfil(e) {
    e.preventDefault();
    const id = document.getElementById('perfilUsuarioId').value;
    const nombre = document.getElementById('perfilNombre').value.trim();
    const rol = document.getElementById('perfilRol').value;
    const msg = document.getElementById('segMensajePerfil');

    SEG_FN({ accion: 'perfil', id: id, nombre: nombre, rol: rol }).then(function(res) {
      if (res.ok) {
        cerrarModal('modalPerfil');
        cargarListaUsuarios();
      } else {
        msg.textContent = SEG_MOTIVO(res);
        msg.className = 'modal-mensaje error';
      }
    });
    return false;
  }

  function abrirModalEmail(id, emailActual) {
    document.getElementById('emailUsuarioId').value = id;
    document.getElementById('emailNuevo').value = emailActual;
    document.getElementById('segMensajeEmail').className = 'modal-mensaje';
    abrirModal('modalEmail');
  }

  function guardarEmail(e) {
    e.preventDefault();
    const id = document.getElementById('emailUsuarioId').value;
    const nuevo = document.getElementById('emailNuevo').value.trim();
    const msg = document.getElementById('segMensajeEmail');

    SEG_FN({ accion: 'email', id: id, email: nuevo }).then(function(res) {
      if (res.ok) {
        cerrarModal('modalEmail');
        cargarListaUsuarios();
      } else {
        msg.textContent = SEG_MOTIVO(res);
        msg.className = 'modal-mensaje error';
      }
    });
    return false;
  }

  function abrirModalPassword(id) {
    document.getElementById('passwordUsuarioId').value = id;
    document.getElementById('passwordNueva').value = '';
    document.getElementById('segMensajePassword').className = 'modal-mensaje';
    abrirModal('modalPassword');
  }

  function guardarPassword(e) {
    e.preventDefault();
    const id = document.getElementById('passwordUsuarioId').value;
    const nueva = document.getElementById('passwordNueva').value;
    const msg = document.getElementById('segMensajePassword');

    SEG_FN({ accion: 'password', id: id, password: nueva }).then(function(res) {
      if (res.ok) {
        cerrarModal('modalPassword');
        msg.className = 'modal-mensaje';
      } else {
        msg.textContent = SEG_MOTIVO(res);
        msg.className = 'modal-mensaje error';
      }
    });
    return false;
  }
