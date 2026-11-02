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

/* EL TOPE DE 1.000 DEL SERVIDOR, Y POR QUE ESTO EXISTE.      29/10/2026
   Lo encontro DISSAN, no yo: pidio el ano 2026 entero en Ventas y en
   pantalla no estaba ENERO. La base devuelve 5.108 renglones; el
   navegador recibia 1.000.
   El recorte NO estaba en mi codigo ni en la funcion de la base: es el
   "Max rows" de la API de Supabase, que viene en 1.000 de fabrica y
   corta CUALQUIER consulta que devuelva filas, sin una palabra, sin un
   error y sin un aviso. De las 43 consultas del panel, 31 devuelven
   filas: las 31 estaban expuestas.
   Arreglarlo subiendo ese numero en el tablero de Supabase no sirve:
   es una perilla que manana vuelve a estar en otro lado y nadie se
   entera. Asi que se pide DE A PAGINAS hasta que no venga mas nada.

   EL PASO NO SE SUPONE, SE MIDE: si el tope del servidor fuera 500 y
   aca estuviera escrito 1.000, la primera pagina vendria con 500, se
   leeria como "ya vinieron todas" y volveriamos al mismo recorte con
   otro numero. Por eso el paso es LO QUE VINO EN LA PRIMERA PAGINA. */
const RPC_PAGINA = 1000;
const RPC_VUELTAS_MAX = 200;        /* 200 paginas: freno duro, nunca un bucle eterno */

async function rpcTodo(fn, args = {}) {
  const t0 = performance.now();
  let desde = 0, todo = [], paso = null, vueltas = 0, freno = false;
  for (;;) {
    const { data, error } = await sb.rpc(fn, args).range(desde, desde + RPC_PAGINA - 1);
    if (error) {
      const x = new Error(traducirError(error));
      x.ms = Math.round(performance.now() - t0);
      throw x;
    }
    const p = data || [];
    todo = todo.concat(p);
    vueltas++;
    if (paso === null) paso = p.length;
    if (p.length === 0 || p.length < paso) break;
    desde += p.length;
    if (vueltas >= RPC_VUELTAS_MAX) { freno = true; break; }
  }
  return { data: todo, ms: Math.round(performance.now() - t0),
           paginas: vueltas, paso: paso, freno: freno };
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
  Ventas:         { archivo: 'ventas.html',    rotulo: 'Ventas' },
  Pruebas:        { archivo: 'pruebas.html',   rotulo: 'Pruebas' },
  Bitacora:       { archivo: 'bitacora.html',  rotulo: 'Bitácora' },
  Agenda:         { archivo: 'agenda/',        rotulo: 'Agenda' },
  Listas:         { archivo: 'listas.html',    rotulo: 'Lista de precios de proveedores' },
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
    /* v2 porque devuelve tambien `grupo`, que es de que cabeza cuelga cada
       modulo. api_mis_modulos() quedo INTACTA: cambiar el tipo de retorno de
       una funcion no se reemplaza en el lugar, y un segundo overload deja a
       PostgREST sin saber cual elegir (la trampa del 08/10). */
    const { data } = await rpcTodo('api_mis_modulos_v4', {});
    lista = data || [];
    const p = await rpcTodo('api_mi_perfil', {});
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
  /* PANTALLAS es una lista escrita a mano, y una lista a mano se queda corta
     sin avisar: hasta el 29/10 un modulo encendido en `modulos` que no tuviera
     su entrada aca DESAPARECIA DEL MENU en silencio, y desde el panel parecia
     que no se habia encendido. Ahora aparece igual, apagado y diciendo por que.
     Es el mismo defecto del `tapar()` del 22/10 y del de las tablas de bajar.js. */
  const claves = lista.map(x => x.clave);

  /* EL MENU ES UN ARBOL, NO UNA LISTA.                        02/11/2026
     El usuario lo dibujo en una hoja y lo dijo textual: "los puntos las
     cabeza del menu, lo que esta debajo del punto el submenu". Yo lo habia
     hecho plano. La cabeza sale de `modulos.grupo`: en null el modulo es
     una cabeza suelta y clickeable (Tablero, Ayuda, Cotizador); con valor,
     cuelga de esa cabeza. Las cabezas NO son modulos: son rotulos, no se
     clickean y no tienen permisos propios — el permiso lo trae cada hijo,
     asi que una cabeza cuyos hijos no ve nadie no se dibuja sola. */
  /* TRES ESTADOS, NO DOS.                                    02/11/2026
     Hasta hoy un modulo estaba o no estaba. El usuario pidio el del medio:
     "lo que esta hecho, lo mostremos, pero no acceden todavia hasta que
     arreglemos con ellos... y lo que no esta hecho se muestre, atenuado, y
     que se vea en desarrollo".

       entra            -> enlace normal
       ve y no entra    -> atenuado, sin enlace, dice POR QUE no se abre
       en desarrollo    -> atenuado, sin enlace, y ademas no existe la pantalla

     Los dos de abajo se dibujan parecido pero NO dicen lo mismo, y la
     diferencia importa: uno esta hecho y falta acordarlo, el otro todavia
     no existe. Si los dos dijeran lo mismo, el usuario no sabria a cual
     puede pedir que le abran. */
  function renglon(x, hijo){
    const hayPantalla = !!PANTALLAS[x.clave];
    const nombre = esc(x.nombre || (hayPantalla ? PANTALLAS[x.clave].rotulo : x.clave));
    const h = hijo ? ' hijo' : '';

    if (x.puede_entrar && hayPantalla){
      const clases = (hijo ? 'hijo' : '') + (x.clave === mio ? ' activo' : '');
      const cls = clases.trim() ? ' class="' + clases.trim() + '"' : '';
      return '<a href="' + PANTALLAS[x.clave].archivo + '"' + cls + '>' + nombre + '</a>';
    }
    /* EL AVISO AL PASAR EL MOUSE.                           02/11/2026
       No se usa el `title` del navegador: tarda un segundo en aparecer, se
       va solo y no se puede leer con el teclado. Va un cartel propio, que
       sale enseguida, tambien al llegar con Tab, y con el texto que trae el
       modulo — que NO es el mismo para todos. El `aria-label` es para el
       lector de pantalla; el `tabindex` para poder llegar sin mouse. */
    const aviso = esc(x.aviso || 'No tenés acceso a este módulo. Tu usuario no lo permite.');
    const clase = hayPantalla ? 'sin-acceso' : 'en-desarrollo';
    const marca = hayPantalla
      ? '<small class="marca-sin-acceso"> · sin acceso</small>' : '';
    return '<span class="menu-apagado ' + clase + h + '" tabindex="0" '
         + 'data-aviso="' + aviso + '" aria-label="' + nombre + '. ' + aviso + '">'
         + nombre + marca + '</span>';
  }
  /* SE DESPLIEGA. Un menu con submenu muestra la cabeza y el submenu se abre
     al tocarla; si estuviera todo abierto no seria un submenu, seria una
     lista con titulos. Dicho por el usuario el 02/11 despues de que yo lo
     dibujara abierto: "se ve el encabezado de menu, nomas y se desplega el
     submenu".
     Arranca abierta SOLO la rama de la pantalla que estas mirando, para que
     se vea donde estas parado. Lo que abras despues queda guardado por
     navegador (localStorage): si se bloquea o falla, no pasa nada — se cae a
     "cerradas salvo la tuya", que es el comportamiento de siempre. */
  const ramas = [];
  let cabeza = null, rama = null;
  for (const x of lista){
    const g = x.grupo || null;
    if (!g){ ramas.push({ cabeza: null, hijos: [x] }); cabeza = null; rama = null; continue; }
    if (g !== cabeza){ cabeza = g; rama = { cabeza: g, hijos: [] }; ramas.push(rama); }
    rama.hijos.push(x);
  }

  let abiertas = {};
  try { abiertas = JSON.parse(localStorage.getItem('menuAbiertas') || '{}') || {}; }
  catch (e) { abiertas = {}; }

  const html = ramas.map((r, i) => {
    if (!r.cabeza) return renglon(r.hijos[0], false);
    const tengoElActivo = r.hijos.some(h => h.clave === mio);
    const abierta = tengoElActivo || abiertas[r.cabeza] === true;
    return '<div class="menu-cabeza' + (abierta ? ' abierta' : '') + '" role="button" '
         + 'tabindex="0" data-rama="' + i + '" data-cabeza="' + esc(r.cabeza) + '">'
         + '<span class="menu-flecha" aria-hidden="true"></span>' + esc(r.cabeza) + '</div>'
         + '<div class="menu-rama" data-rama="' + i + '"' + (abierta ? '' : ' hidden') + '>'
         + r.hijos.map(h => renglon(h, true)).join('') + '</div>';
  }).join('');

  $('menuLateral').innerHTML = lista.length ? html
    : '<span class="vacio">Sin módulos habilitados</span>';

  /* un solo oyente en el contenedor: las cabezas se redibujan y los oyentes
     puestos de a uno se pierden sin avisar */
  $('menuLateral').addEventListener('click', ev => {
    const c = ev.target.closest('.menu-cabeza');
    if (!c) return;
    const r = $('menuLateral').querySelector('.menu-rama[data-rama="' + c.dataset.rama + '"]');
    if (!r) return;
    const abrir = r.hidden;
    r.hidden = !abrir;
    c.classList.toggle('abierta', abrir);
    try {
      const g = JSON.parse(localStorage.getItem('menuAbiertas') || '{}') || {};
      g[c.dataset.cabeza] = abrir;
      localStorage.setItem('menuAbiertas', JSON.stringify(g));
    } catch (e) { /* sin localStorage el menu anda igual, solo no recuerda */ }
  });
  $('menuLateral').addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const c = ev.target.closest('.menu-cabeza');
    if (!c) return;
    ev.preventDefault();
    c.click();
  });

  /* 31/10/2026 — FALLA CERRADA. Antes este if arrancaba con `mio &&`, asi
     que una pantalla SIN data-modulo no se tapaba nunca: el portero se
     saltaba solo. Toda pantalla del panel declara su modulo en
     <div id="app" data-modulo="...">; si no lo declara es que nadie decidio
     quien puede verla, y eso se trata como "no habilitada", no como
     "habilitada para todos". */
  if (!mio) {
    tapar('<b>Esta pantalla no declara su módulo.</b> Toda pantalla del panel '
      + 'tiene que decir en <code>&lt;div id="app" data-modulo="..."&gt;</code> '
      + 'cuál es su módulo de la tabla <code>modulos</code>, que es lo que '
      + 'decide qué rol puede verla. Sin eso no se abre.');
    return false;
  }

  if (claves.indexOf(mio) === -1) {
    tapar('<b>Este módulo no está habilitado para tu usuario.</b> '
      + (MI_ROL ? 'Entraste como <b>' + esc(MI_ROL) + '</b> y ' : '')
      + 'el módulo <b>' + esc(mio) + '</b> no está en la lista de los que podés ver'
      + (claves.length ? ': ' + claves.map(esc).join(', ') + '.'
                       : ', y no hay ninguno habilitado para tu usuario.')
      + ' Lo habilita un administrador desde Seguridad.');
    return false;
  }

  /* VER NO ES ENTRAR, Y EL PORTERO TIENE QUE SABERLO.         02/11/2026
     Con `roles_ven` hay modulos que aparecen en el menu y no se abren. Si
     eso se resolviera sólo dibujando el renglón sin enlace, alcanzaría con
     escribir la dirección a mano para entrar: sería decorativo, no un
     permiso. Acá se tapa la pantalla igual, y la consulta no corre. */
  const miModulo = lista.find(x => x.clave === mio);
  if (miModulo && miModulo.puede_entrar === false) {
    /* EL TEXTO SALE DE LA FILA DEL MODULO, NO DE ACA.       02/11/2026
       No es el mismo aviso para todos: lo que esta hecho y esperando que lo
       habiliten dice que esta pronto a activarse, y lo demas dice que el
       usuario no lo permite. Escribir las dos frases en el javascript
       obligaria a publicar para cambiar una palabra; en la fila se cambia
       en un lugar y se ve al instante. */
    tapar('<b>' + esc(miModulo.aviso
            || 'No tenés acceso a este módulo. Tu usuario no lo permite.') + '</b>');
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

/* ===================================================================
   EL BOTON DE MENU DEL CELULAR                        23/10/2026
   -------------------------------------------------------------------
   Se arma desde acá y no en los diez HTML: un botón escrito diez veces
   es un botón que mañana va a estar en nueve. Hasta 900 px el menú
   lateral sale del flujo (ver css/app.css) y este botón lo abre por
   encima; de 900 para arriba el botón no se muestra y nada cambia.

   Se cierra al tocar el fondo, al elegir una pantalla, con Escape, y
   al ensanchar la ventana: si quedara abierto al girar el teléfono, la
   barra se montaría sobre el contenido en modo escritorio.
   =================================================================== */
function armarBotonMenu() {
  if ($('btnMenu')) return;
  const barra = $('topbar');
  if (!barra) return;

  const b = document.createElement('button');
  b.id = 'btnMenu';
  b.type = 'button';
  b.setAttribute('aria-label', 'Abrir el menú');
  b.setAttribute('aria-expanded', 'false');
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    + 'stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
  barra.insertBefore(b, barra.firstChild);

  const tapa = document.createElement('div');
  tapa.id = 'tapaMenu';
  document.body.appendChild(tapa);

  const abrir = (si) => {
    document.body.classList.toggle('menu-abierto', si);
    b.setAttribute('aria-expanded', si ? 'true' : 'false');
    b.setAttribute('aria-label', si ? 'Cerrar el menú' : 'Abrir el menú');
  };
  b.addEventListener('click', () => abrir(!document.body.classList.contains('menu-abierto')));
  tapa.addEventListener('click', () => abrir(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') abrir(false); });
  /* elegir una pantalla cierra el menú: en el teléfono el enlace queda
     tapado por la barra y parecería que no pasó nada */
  const menu = $('menuLateral');
  if (menu) menu.addEventListener('click', e => { if (e.target.closest('a')) abrir(false); });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) abrir(false);
  });
}

async function abrirApp() {
  const { data } = await sb.auth.getUser();
  /* El email del que entró queda en el cartelito del nombre, al pie de la barra: el
     nombre y el rol los pone armarMenu() desde el perfil. */
  EMAIL_ENTRO = (data && data.user && data.user.email) || '';
  $('login-wrap').hidden = true;
  $('app').hidden = false;
  /* antes de armarMenu(): si el portero tapa la pantalla, el botón tiene
     que estar igual para poder irse a otro módulo desde el teléfono */
  armarBotonMenu();
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

/* ===== ORDEN DE LAS COLUMNAS: UNA SOLA FUENTE =====      31/10/2026
   Las pantallas genericas tomaban `Object.keys(datos[0])`, y cuando la
   funcion de la base arma su respuesta con jsonb_build_object, Postgres
   ORDENA LAS CLAVES POR LARGO. Medido: "cuanto le vendimos a DROGUERIA
   CENTRAL en 2026" salia ULTIMA · CLIENTE · PRIMERA · FACTURADO · … porque
   ultima=6, cliente=7, primera=7, facturado=9, cod_client=10,
   comprobantes=12, provincia_fiscal=16. Es el largo, no el significado.

   NO se arregla reordenando aca con un criterio propio: el .xlsx toma las
   columnas del MISMO objeto y `api_columnas_formato` decide SU orden, asi
   que dos criterios dejarian la pantalla diciendo un orden y el archivo
   otro — el defecto que mas veces mordio este proyecto.

   Entonces el orden lo da LA BASE, con la funcion que el Excel YA usa:
   devuelve el orden curado de `columna_formato.orden` cuando TODAS las
   columnas lo tienen (las 23 de la planilla de DISSAN), y el orden pedido
   cuando no. Reordenando las claves de cada fila con eso, la pantalla, el
   grafico, el informe y el .xlsx quedan con el MISMO orden, y de paso la
   pantalla empieza a respetar el orden de la planilla de DISSAN, que hasta
   hoy sólo respetaba el archivo.

   Si la llamada falla, se devuelven los datos TAL CUAL: un orden fulero es
   mucho mejor que una pantalla vacia. */
function ordenarColumnasDeLaBase(datos){
  try {
    if (!datos || !datos.length || typeof datos[0] !== 'object') {
      return Promise.resolve(datos);
    }
    var cols = Object.keys(datos[0]);
    if (cols.length < 2) return Promise.resolve(datos);
    return rpcTodo('api_columnas_formato', { p_columnas: cols })
      .then(function(r){
        var meta = (r && r.data) || [];
        if (!meta.length) return datos;
        var orden = meta.map(function(m){ return m.columna; })
                        .filter(function(c){ return cols.indexOf(c) >= 0; });
        /* lo que la base no devolvio va al final, no se pierde */
        cols.forEach(function(c){ if (orden.indexOf(c) < 0) orden.push(c); });
        if (orden.join('|') === cols.join('|')) return datos;   /* ya estaba */
        return datos.map(function(f){
          var o = {};
          for (var i = 0; i < orden.length; i++) o[orden[i]] = f[orden[i]];
          return o;
        });
      })
      .catch(function(){ return datos; });
  } catch (e) { return Promise.resolve(datos); }
}
