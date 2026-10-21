/* DISSAN · Seguridad — usuarios y permisos
   ---------------------------------------------------------------------------
   ES EL MISMO MODULO DE ANTES: la tabla Usuario / Email / Rol / Estado /
   Acciones, el buscador, el alta, y los cuatro cambios (nombre y rol, email,
   contraseña, baja y alta). Nada nuevo.

   LO QUE CAMBIA ES POR DONDE PASA. El modulo viejo hacia todo esto desde Apps
   Script con la CLAVE DE SERVICIO de Supabase. Acá el navegador no puede tener
   esa clave -el repositorio es publico- asi que las operaciones van por la
   Edge Function `usuarios`, que la toma del entorno de Supabase y nunca la
   devuelve. La funcion esta desplegada con verify_jwt, y ademas adentro exige
   que el que llama tenga rol super y este activo, igual que exigirSuper_().

   LAS REGLAS SON LAS DE ANTES, leidas del codigo viejo antes de escribir esto:
     · Solo un super entra.
     · No se puede dejar el sistema sin administrador: no se da de baja ni se
       le saca el rol al ultimo super activo, y nadie se lo saca a si mismo.
     · La contraseña, 12 caracteres como minimo. El panel viejo pedia 12 al
       crear y 6 al cambiar; se unifica en 12, la mas estricta de las dos.

   DOS COSAS QUE ENCONTRE EN EL MODULO VIEJO Y NO REPITO:
     1. Su desplegable de rol ofrecia «Usuario», «Admin» y «Super», y el
        servidor validaba contra super, admin, gerencia y consulta: elegir el
        PRIMER item del desplegable fallaba con «Rol invalido».
     2. Ni el desplegable ni la lista del servidor incluian `operador`, que es
        el rol real del usuario de DISSAN. Editarle el perfil desde esa
        pantalla le cambiaba el rol sin querer.
   Acá los roles salen de `api_roles_v2()`, que los lee de la tabla `modulos`:
   los que el sistema usa de verdad.

   No se usan alert, confirm ni prompt del navegador: los avisos y las
   confirmaciones son parte de la pantalla.
   --------------------------------------------------------------------------- */
'use strict';

let USUARIOS = [], ROLES = [], ROLES_INFO = [], YO = '';

async function llamar(cuerpo, intentos = 2) {
  let ultimo = '';
  for (let i = 1; i <= intentos; i++) {
    try {
      const s = (await sb.auth.getSession()).data.session;
      if (!s) throw new Error('La sesión venció. Volvé a entrar.');
      const r = await fetch(SB_URL + '/functions/v1/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
                   'Authorization': 'Bearer ' + s.access_token, 'apikey': SB_KEY },
        body: JSON.stringify(cuerpo)
      });
      const txt = await r.text();
      let j = null;
      try { j = JSON.parse(txt); } catch (e) { /* abajo */ }
      if (j && typeof j.ok === 'boolean') return j;          // contestó, bien o mal
      ultimo = 'HTTP ' + r.status + ' · ' + txt.slice(0, 160);
    } catch (e) { ultimo = String(e.message || e); }
  }
  return { ok: false, motivo: ultimo || 'no contestó' };
}

function aviso(html, mal) {
  const a = $('aviso');
  a.hidden = false;
  a.innerHTML = (mal ? '<b>No se pudo.</b> ' : '') + html;
  a.scrollIntoView({ block: 'nearest' });
}
function limpiarAviso() { $('aviso').hidden = true; $('aviso').innerHTML = ''; }

async function calcular() {
  const b = $('b-calc');
  if (b.disabled) return;
  b.disabled = true; b.textContent = 'Buscando…';
  cerrarForma();
  try {
    const t0 = performance.now();
    const r = await llamar({ accion: 'listar' });
    const ms = Math.round(performance.now() - t0);
    if (!r.ok) { USUARIOS = []; ROLES_INFO = []; pintar(ms); return aviso(esc(r.motivo), true); }
    USUARIOS = r.usuarios || [];
    ROLES = (r.roles || []).map(x => x.rol);
    ROLES_INFO = r.roles || [];
    YO = r.yo || '';
    limpiarAviso();
    pintar(ms);
  } finally {
    b.disabled = false; b.textContent = 'Actualizar';
  }
}

/* Los iconos son los del modulo viejo, copiados de Seguridad.html. */
const ICONO = {
  perfil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
        + '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  email:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
        + '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
  clave:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
        + '<circle cx="8" cy="15" r="4"/><path d="M10.5 12.5L20 3M17 6l3 3M14 9l2.5 2.5"/></svg>',
  baja:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
        + '<circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/></svg>',
  alta:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
        + '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 5-5"/></svg>'
};

const esc2 = s => esc(s).replace(/"/g, '&quot;');
const fecha = v => {
  const f = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return f ? f[3] + '/' + f[2] + '/' + f[1] : '—';
};

function pintar(ms) {
  const activos = USUARIOS.filter(u => u.activo === true);
  const supers = activos.filter(u => u.rol === 'super');

  $('reloj').hidden = false;
  $('reloj').innerHTML = 'La base contestó en <b>' + (ms / 1000).toFixed(2) + ' s</b>'
    + ' &nbsp;·&nbsp; ' + num(USUARIOS.length) + ' usuarios, ' + num(activos.length)
    + ' activos &nbsp;·&nbsp; ' + num(supers.length) + ' administrador'
    + (supers.length === 1 ? '' : 'es') + ' activo' + (supers.length === 1 ? '' : 's');

  filtrar();
}

/* Se llama sin argumentos desde el buscador, asi que la info de roles vive en una
   variable del modulo: pasarla por parametro hacia desaparecer el cuadro al tipear. */
function filtrar() {
  const roles = ROLES_INFO;
  const q = ($('f-buscar').value || '').trim().toLowerCase();
  const filas = USUARIOS.filter(u => !q
    || String(u.nombre || '').toLowerCase().includes(q)
    || String(u.email || '').toLowerCase().includes(q)
    || String(u.rol || '').toLowerCase().includes(q));

  const h = [];
  h.push('<div class="tb-caja"><table><tr><th>Usuario</th><th>Email</th><th>Rol</th>'
    + '<th>Estado</th><th>Desde</th><th>Acciones</th></tr>'
    + (filas.length ? filas.map(u => {
        const yo = String(u.id) === String(YO);
        return '<tr class="' + (u.activo ? '' : 'mal') + '">'
          + '<td class="desc">' + esc(u.nombre || '—')
          + (yo ? ' <b title="Sos vos">(vos)</b>' : '') + '</td>'
          + '<td class="desc">' + esc(u.email || '—') + '</td>'
          + '<td>' + esc(u.rol || '—') + '</td>'
          + '<td>' + (u.activo ? 'activo' : 'dado de baja') + '</td>'
          + '<td>' + fecha(u.creado) + '</td>'
          + '<td class="sg-acc">'
          + '<button class="btn-icono" title="Editar nombre y rol" onclick="formaPerfil(\''
          + esc2(u.id) + '\')">' + ICONO.perfil + '</button>'
          + '<button class="btn-icono" title="Cambiar email" onclick="formaEmail(\''
          + esc2(u.id) + '\')">' + ICONO.email + '</button>'
          + '<button class="btn-icono" title="Cambiar contraseña" onclick="formaClave(\''
          + esc2(u.id) + '\')">' + ICONO.clave + '</button>'
          + '<button class="btn-icono ' + (u.activo ? 'peligro' : 'exito') + '" title="'
          + (u.activo ? 'Dar de baja' : 'Reactivar') + '" onclick="formaEstado(\''
          + esc2(u.id) + '\',' + (u.activo ? 'false' : 'true') + ')">'
          + (u.activo ? ICONO.baja : ICONO.alta) + '</button>'
          + '</td></tr>';
      }).join('')
      : '<tr><td colspan="6">Ningún usuario coincide con «' + esc(q) + '».</td></tr>')
    + '</table></div>');

  if (roles && roles.length) {
    h.push('<div class="aviso"><b>Qué ve cada rol.</b> Sale de la tabla <b>modulos</b>, que '
      + 'es la que manda: '
      + roles.map(r => '<b>' + esc(r.rol) + '</b> ' + num(r.modulos_visibles)
          + ' módulo' + (Number(r.modulos_visibles) === 1 ? '' : 's')
          + (Number(r.modulos_apagados) ? ' (y ' + num(r.modulos_apagados)
             + ' apagado' + (Number(r.modulos_apagados) === 1 ? '' : 's') + ')' : '')
          + ' · ' + num(r.cuantos_usuarios) + ' usuario'
          + (Number(r.cuantos_usuarios) === 1 ? '' : 's')).join(' &nbsp;·&nbsp; ')
      + '. Un módulo se enciende o se apaga en esa tabla, y el menú del panel se arma con '
      + 'eso: lo que un usuario no tiene, no lo ve ni entrando por la dirección.</div>');
  }

  $('cuerpo').innerHTML = h.join('');
}

/* ---------- las formas, dentro de la pantalla ---------- */
function cerrarForma() { $('forma').hidden = true; $('forma').innerHTML = ''; }

function abrirForma(titulo, campos, accionBoton, onGuardar) {
  const f = $('forma');
  f.hidden = false;
  f.innerHTML = '<div class="tb-sec">' + esc(titulo) + '</div>'
    + '<div class="sg-forma">'
    + campos.map(c => '<div class="fg"><label class="fl" for="' + c.id + '">'
        + esc(c.rotulo) + '</label>'
        + (c.opciones
            ? '<select id="' + c.id + '" class="fi">'
              + c.opciones.map(o => '<option value="' + esc2(o)
                  + '"' + (o === c.valor ? ' selected' : '') + '>' + esc(o) + '</option>').join('')
              + '</select>'
            : '<input id="' + c.id + '" class="fi" type="' + (c.tipo || 'text') + '"'
              + ' value="' + esc2(c.valor || '') + '"'
              + (c.tipo === 'password' ? ' autocomplete="new-password"' : '')
              + (c.ayuda ? ' placeholder="' + esc2(c.ayuda) + '"' : '') + '>')
        + '</div>').join('')
    + '<button class="btn tb-accion" id="b-guardar">' + esc(accionBoton) + '</button>'
    + '<button class="btn-s tb-accion" onclick="cerrarForma()">Cancelar</button>'
    + '</div>';
  $('b-guardar').onclick = async () => {
    const b = $('b-guardar');
    if (b.disabled) return;
    b.disabled = true; b.textContent = 'Guardando…';
    const r = await onGuardar();
    b.disabled = false; b.textContent = accionBoton;
    if (!r.ok) return aviso(esc(r.motivo), true);
    cerrarForma();
    await calcular();
    aviso(r.hecho || 'Hecho.');
  };
  f.scrollIntoView({ block: 'nearest' });
}

const quien = id => USUARIOS.find(u => String(u.id) === String(id)) || {};
/* El rol que tiene el usuario entra en la lista aunque no este en modulos: si no, guardar
   le cambiaria el rol sin querer, que es justo lo que hacia la pantalla vieja. */
const rolesPara = u => ROLES.includes(u.rol) || !u.rol ? ROLES : ROLES.concat([u.rol]);

function formaNuevo() {
  limpiarAviso();
  abrirForma('Nuevo usuario', [
    { id: 'n-nombre', rotulo: 'Nombre', ayuda: 'Cómo se lo va a ver en la lista' },
    { id: 'n-email', rotulo: 'Email', tipo: 'email', ayuda: 'con qué entra' },
    { id: 'n-clave', rotulo: 'Contraseña', tipo: 'password', ayuda: '12 caracteres o más' },
    { id: 'n-rol', rotulo: 'Rol', opciones: ROLES, valor: ROLES[ROLES.length - 1] }
  ], 'Crear usuario', async () => {
    const r = await llamar({ accion: 'crear', nombre: $('n-nombre').value.trim(),
      email: $('n-email').value.trim(), password: $('n-clave').value,
      rol: $('n-rol').value });
    if (r.ok) r.hecho = 'Usuario creado.';
    return r;
  });
}

function formaPerfil(id) {
  limpiarAviso();
  const u = quien(id);
  abrirForma('Nombre y rol de ' + (u.email || ''), [
    { id: 'p-nombre', rotulo: 'Nombre', valor: u.nombre },
    { id: 'p-rol', rotulo: 'Rol', opciones: rolesPara(u), valor: u.rol }
  ], 'Guardar', async () => {
    const r = await llamar({ accion: 'perfil', id, nombre: $('p-nombre').value.trim(),
      rol: $('p-rol').value });
    if (r.ok) r.hecho = 'Nombre y rol guardados.';
    return r;
  });
}

function formaEmail(id) {
  limpiarAviso();
  const u = quien(id);
  abrirForma('Cambiar el email de ' + (u.nombre || ''), [
    { id: 'e-email', rotulo: 'Email nuevo', tipo: 'email', valor: u.email }
  ], 'Guardar', async () => {
    const r = await llamar({ accion: 'email', id, email: $('e-email').value.trim() });
    if (r.ok) r.hecho = 'Email cambiado. Con ese email entra desde ahora.';
    return r;
  });
}

function formaClave(id) {
  limpiarAviso();
  const u = quien(id);
  abrirForma('Contraseña nueva para ' + (u.email || ''), [
    { id: 'c-clave', rotulo: 'Contraseña', tipo: 'password', ayuda: '12 caracteres o más' },
    { id: 'c-clave2', rotulo: 'Repetila', tipo: 'password' }
  ], 'Guardar', async () => {
    const a = $('c-clave').value, b = $('c-clave2').value;
    if (a !== b) return { ok: false, motivo: 'Las dos contraseñas no son iguales.' };
    const r = await llamar({ accion: 'password', id, password: a });
    if (r.ok) r.hecho = 'Contraseña cambiada.';
    return r;
  });
}

/* La baja se confirma en la pantalla, no con un confirm() del navegador. */
function formaEstado(id, activo) {
  limpiarAviso();
  const u = quien(id);
  const f = $('forma');
  f.hidden = false;
  f.innerHTML = '<div class="tb-sec">' + (activo ? 'Reactivar a ' : 'Dar de baja a ')
    + esc(u.nombre || u.email || '') + '</div>'
    + '<div class="aviso">' + (activo
        ? 'Vuelve a poder entrar con su email y su contraseña de siempre.'
        : '<b>No va a poder entrar más al panel.</b> No se borra nada: queda en la lista '
          + 'como dado de baja y se puede reactivar.')
    + ' Es <b>' + esc(u.email || '') + '</b>, rol <b>' + esc(u.rol || '') + '</b>.</div>'
    + '<div class="sg-forma">'
    + '<button class="btn tb-accion" id="b-guardar">'
    + (activo ? 'Sí, reactivarlo' : 'Sí, darlo de baja') + '</button>'
    + '<button class="btn-s tb-accion" onclick="cerrarForma()">No, dejarlo como está</button>'
    + '</div>';
  $('b-guardar').onclick = async () => {
    const b = $('b-guardar');
    if (b.disabled) return;
    b.disabled = true; b.textContent = 'Guardando…';
    const r = await llamar({ accion: 'estado', id, activo });
    b.disabled = false;
    if (!r.ok) { b.textContent = activo ? 'Sí, reactivarlo' : 'Sí, darlo de baja';
                 return aviso(esc(r.motivo), true); }
    cerrarForma();
    await calcular();
    aviso(activo ? 'Usuario reactivado.' : 'Usuario dado de baja.');
  };
}
