/* DISSAN · panel sobre Supabase · núcleo
   ---------------------------------------------------------------------------
   Esto reemplaza al router de Apps Script. El navegador habla DIRECTO con
   PostgREST, con el JWT del usuario. Por eso desaparece la clave de servicio
   del camino: acá no hay ninguna, y no puede haberla — este archivo es público.

   La clave que SÍ va es la "publishable", que está hecha para estar a la vista.
   Lo que protege los datos es Supabase Auth + RLS, no esconder el código.
   --------------------------------------------------------------------------- */
'use strict';

const SB_URL = 'https://hwgfmpvszdohnzqtwscw.supabase.co';
const SB_KEY = 'sb_publishable_7CfYchCqBdDnXJ63IblnTw_cjFCjvUl';

const sb = window.supabase.createClient(SB_URL, SB_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'dissan_panel_v1' }
});

/* Las CUATRO calidades que manda la pantalla. Si se agrega un método de costeo
   nuevo a vista_margen_v2_oc hay que agregarlo acá también, o desaparece de la
   medición sin avisar — es el error del 14/10 que borró media facturación. */
const CALIDAD_FIRME = [
  'A. lote exacto',
  'A. peps',
  'A. ultimo costo reciente',
  'A. orden de compra del pedido'
];
const CALIDAD_CON_180 = CALIDAD_FIRME.concat(['B. costo de mas de 180 dias']);

/* ---------- utilidades ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const nf0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const num  = n => nf0.format(Number(n || 0));
const pct  = n => nf1.format(Number(n || 0)) + '%';
const peso = n => '$' + nf0.format(Number(n || 0));

/* De un millón para arriba, en millones y con el monto exacto en el title.
   Un importe cortado por el ancho se lee como otro número — pasó el 14/10 con
   $3.549.541.334 mostrado como $3.549.541.33. */
function pesoM(n) {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1e6) return '$' + nf1.format(v / 1e6) + ' M';
  return '$' + nf0.format(v);
}
const exacto = n => '$' + nf2.format(Number(n || 0));

function traducirError(e) {
  const m = (e && (e.message || e.error_description || e.msg)) || String(e);
  if (/permission denied/i.test(m))        return 'No tenés permiso para esta consulta.';
  if (/JWT expired|invalid JWT/i.test(m))  { setTimeout(() => location.reload(), 1500);
                                             return 'La sesión venció. Volvé a entrar.'; }
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión con el servidor.';
  return m.replace(/^ERROR:\s*/, '');
}

/* El reloj es parte del control, no un adorno: la comparación contra Apps
   Script se hace con este número. */
async function rpc(fn, args = {}) {
  const t0 = performance.now();
  const { data, error } = await sb.rpc(fn, args);
  const ms = Math.round(performance.now() - t0);
  if (error) { const x = new Error(traducirError(error)); x.ms = ms; throw x; }
  return { data, ms };
}

/* ---------- el ojo de la contraseña ---------- */
const OJO_VER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"'
  + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<path d="M1.8 12S5.4 5.2 12 5.2 22.2 12 22.2 12 18.6 18.8 12 18.8 1.8 12 1.8 12z"/>'
  + '<circle cx="12" cy="12" r="3.1"/></svg>';
const OJO_TAPAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"'
  + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<path d="M9.9 5.5A8.9 8.9 0 0 1 12 5.2c6.6 0 10.2 6.8 10.2 6.8a19 19 0 0 1-2.5 3.5"/>'
  + '<path d="M6.2 7A18.7 18.7 0 0 0 1.8 12S5.4 18.8 12 18.8a9.6 9.6 0 0 0 4-.85"/>'
  + '<path d="M9.8 9.9a3.1 3.1 0 0 0 4.3 4.3"/><path d="M3 3l18 18"/></svg>';

function pintarOjo() {
  const i = $('l-pass'), b = $('l-ojo');
  if (!i || !b) return;
  const visible = i.type === 'text';
  b.innerHTML = visible ? OJO_TAPAR : OJO_VER;
  const r = visible ? 'Ocultar la contraseña' : 'Mostrar la contraseña';
  b.setAttribute('aria-label', r); b.setAttribute('title', r);
  b.setAttribute('aria-pressed', visible ? 'true' : 'false');
}
function verClave() {
  const i = $('l-pass'); if (!i) return;
  const a = i.selectionStart, z = i.selectionEnd;
  i.type = i.type === 'password' ? 'text' : 'password';
  pintarOjo();
  try { i.focus(); i.setSelectionRange(a, z); } catch (e) { i.focus(); }
}

/* ---------- sesión ---------- */
function errLogin(t) { const e = $('l-err'); e.textContent = t; e.className = t ? 'err ver' : 'err'; }

async function entrar() {
  const u = $('l-user').value.trim(), c = $('l-pass').value;
  errLogin('');
  if (!u || !c) return errLogin('Completá usuario y contraseña.');
  const email = u.includes('@') ? u.toLowerCase() : u.toLowerCase() + '@dissan.com.ar';
  $('l-btn').disabled = true; $('l-btn').textContent = 'Entrando...';
  const { error } = await sb.auth.signInWithPassword({ email, password: c });
  $('l-btn').disabled = false; $('l-btn').textContent = 'Entrar';
  if (error) {
    return errLogin(/Invalid login/i.test(error.message)
      ? 'Usuario o contraseña incorrectos.' : traducirError(error));
  }
  $('l-pass').value = ''; $('l-pass').type = 'password'; pintarOjo();
  await abrirApp();
}

async function salir() { await sb.auth.signOut(); location.reload(); }

/* ---------- EL PORTERO ----------
   El panel viejo pregunta app_puede(token, modulo) contra la tabla `sesiones`. Acá no hay
   tabla de sesiones: el equivalente es api_mis_modulos(), que cruza el rol del usuario del
   JWT contra modulos.activo y modulos.roles. Es el MISMO criterio y los mismos datos.

   Medido el 21/10/2026 simulando los dos usuarios reales:
     super@dissan.com.ar  (rol super)     → 6 módulos: Dashboard, Informe, MargenDeVentas,
                                            Hilo, Ayuda, Seguridad
     dissan@dissan.com.ar (rol operador)  → 4 módulos: sin Ayuda y sin Seguridad
   Sin JWT devuelve 0 filas, o sea que falla cerrada.

   El menú se arma con esa lista, no con enlaces escritos en el HTML: así la pantalla
   muestra exactamente lo que ese usuario podía ver antes, y encender o apagar un módulo es
   una fila en la tabla `modulos`, como siempre fue. */
const PANTALLAS = {
  Dashboard:      { archivo: 'tablero.html',   rotulo: 'Tablero general' },
  Informe:        { archivo: 'informe.html',   rotulo: 'Informe' },
  MargenDeVentas: { archivo: 'index.html',     rotulo: 'Margen' },
  Hilo:           { archivo: 'hilo.html',      rotulo: 'Hilo' },
  Ayuda:          { archivo: 'ayuda.html',     rotulo: 'Ayuda' },
  Seguridad:      { archivo: 'seguridad.html', rotulo: 'Seguridad' },
  Stock:          { archivo: 'stock.html',     rotulo: 'Stock' },
  Compras:        { archivo: 'compras.html',   rotulo: 'Compras' },
  Tesoreria:      { archivo: 'tesoreria.html', rotulo: 'Tesorería' },
  Cartera:        { archivo: 'cartera.html',   rotulo: 'Cartera' }
};

let MI_ROL = '', EMAIL_ENTRO = '';

const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

async function armarMenu() {
  const mio = $('app').dataset.modulo || '';
  let lista = [], yo = {};
  try {
    const { data } = await rpc('api_mis_modulos', {});
    lista = data || [];
    const p = await rpc('api_mi_perfil', {});
    yo = (p.data && p.data[0]) || {};
    MI_ROL = yo.rol || '';
  } catch (e) {
    $('menuLateral').innerHTML = '';
    tapar('No se pudo comprobar qué módulos tenés habilitados. ' + esc(e.message || e));
    return false;
  }

  /* El pie de la barra: quién sos. Igual que el panel de siempre. */
  const nombre = yo.nombre || yo.email || '';
  $('nombreUsuario').textContent = nombre || EMAIL_ENTRO || '—';
  $('nombreUsuario').title = yo.email || EMAIL_ENTRO || '';
  $('rolUsuario').textContent = yo.rol || '—';
  $('avatarInicial').textContent = (nombre || '?').charAt(0).toUpperCase();
  const h = new Date();
  $('fechaHoy').textContent = DIAS[h.getDay()] + ' ' + h.getDate() + ' de '
    + MESES_LARGOS[h.getMonth()] + ' de ' + h.getFullYear();

  /* El menú lateral se arma con los módulos del usuario, en el orden de la tabla.
     El que estás mirando queda marcado, no escondido: así se ve dónde estás. */
  const claves = lista.map(x => x.clave);
  $('menuLateral').innerHTML = lista.filter(x => PANTALLAS[x.clave]).length
    ? lista.filter(x => PANTALLAS[x.clave]).map(x =>
        '<a href="' + PANTALLAS[x.clave].archivo + '"'
        + (x.clave === mio ? ' class="activo"' : '') + '>'
        + esc(x.nombre || PANTALLAS[x.clave].rotulo) + '</a>').join('')
    : '<span class="vacio">Sin módulos habilitados</span>';

  if (mio && claves.indexOf(mio) === -1) {
    tapar('<b>Este módulo no está habilitado para tu usuario.</b> '
      + (MI_ROL ? 'Entraste como <b>' + esc(MI_ROL) + '</b> y ' : '')
      + 'el módulo <b>' + esc(mio) + '</b> no está en la lista de los que podés ver'
      + (claves.length ? ': ' + claves.map(esc).join(', ') + '.'
                       : ', y no hay ninguno habilitado para tu usuario.')
      + ' Lo habilita un administrador desde Seguridad.');
    return false;
  }
  return true;
}

/* Tapa la pantalla con un cartel y deja el menú a la vista para poder irse a otra.

   SE VACIA #contenido ENTERO, no los contenedores de a uno. Antes se escondían
   por nombre (#cuerpo, #mvEstado, .filtros…), y cada pantalla nueva traía los
   suyos: la de Ayuda es #ayRaiz, la de Seguridad .seg-header + .seg-tabla-wrap,
   la del Hilo #hilMapa + .hil-panel. Una lista a mano se queda corta sin avisar
   y el módulo apagado seguiría a la vista. Vaciando el contenedor no queda
   ninguno. Y la consulta tampoco corre: abrirApp() no llama a calcular() si
   esto se ejecutó. */
function tapar(html) {
  const c = $('contenido');
  if (c) { c.innerHTML = '<div class="aviso" style="display:block">' + html + '</div>'; return; }
  /* Sin #contenido el cartel iría a ningún lado y la pantalla quedaría muda. */
  const a = $('aviso');
  if (a) { a.hidden = false; a.innerHTML = html; return; }
  const donde = $('mvEstado') || $('cuerpo');
  if (donde) donde.innerHTML = '<div class="aviso" style="display:block">' + html + '</div>';
}

async function abrirApp() {
  const { data } = await sb.auth.getUser();
  /* El email del que entró queda en el cartelito del nombre, al pie de la barra: el
     nombre y el rol los pone armarMenu() desde el perfil. */
  EMAIL_ENTRO = (data && data.user && data.user.email) || '';
  $('login-wrap').hidden = true;
  $('app').hidden = false;
  if (!await armarMenu()) return;
  await calcular();
}

window.addEventListener('load', async () => {
  pintarOjo();
  $('l-pass').addEventListener('keydown', e => { if (e.key === 'Enter') entrar(); });
  $('l-user').addEventListener('keydown', e => { if (e.key === 'Enter') $('l-pass').focus(); });
  const { data } = await sb.auth.getSession();
  if (data.session) await abrirApp(); else $('l-user').focus();
});
