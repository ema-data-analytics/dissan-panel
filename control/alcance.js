/* =====================================================================
   EL ALCANCE NO SE DEDUCE DE UNA LISTA MIA                 02/11/2026
   =====================================================================
   POR QUE EXISTE. Es la cagada mas grande que me mande en este proyecto,
   y no fue de codigo: fue de ALCANCE. El 21/10 me puse a portar DIECISEIS
   pantallas porque esa lista estaba en mis propias notas. Nadie la pidio.
   El dato que habia que mirar primero estaba en la tabla `modulos`, que es
   lo que el usuario tiene en la pantalla. Textual, ese dia:

     "TERMINA TODO, PERO LO QUE MOSTREMOS ES LO QUE ESTABA VISIBLE ANTES,
      NADA DE PONER NUEVO"

   La regla quedo escrita —"el alcance se mira en `modulos`"— y una regla
   escrita no frena nada. Esto la convierte en puerta.

   Y el 02/11 el usuario volvio a nombrar esa misma clase sin saber que
   tenia nombre: "quiero que hagas lo que te pido". De todo lo que eso
   abarca, ESTO es la parte que se puede medir: que no exista en el panel
   nada que su propia tabla no declare.

   QUE MIDE, contra `modulos` en la base:

     1. Toda pantalla declara su modulo en <div id="app" data-modulo="...">.
        Sin declararlo, el portero del 31/10 la tapa —falla cerrada— asi
        que una pantalla sin declaracion es una pantalla que nadie puede
        abrir: o se declara o no va.
     2. El modulo que declara EXISTE en `modulos`. Si no existe, esa
        pantalla la invente yo: es el 21/10 otra vez.
     3. Todo modulo ACTIVO tiene su pantalla. Un modulo activo sin archivo
        es una opcion en el menu de DISSAN que lleva a un 404 — y el menu
        sale de la base, al instante, mientras la pantalla sale del codigo
        publicado (la trampa del 14/10).
     4. El menu no se arma con una lista escrita a mano. `js/core.js` tiene
        que armarlo con `api_mis_modulos()`, que cruza el rol del JWT
        contra `modulos.activo` y `modulos.roles`. Si algun dia alguien
        mete una lista fija ahi, el portero deja de ser el portero.

   LO QUE NO CUBRE, y hay que decirlo: esto mide el BULTO, no el detalle.
   Frena que yo agregue una pantalla que nadie pidio. NO frena que
   entienda mal lo que el usuario pidio ADENTRO de una pantalla. Para eso
   no hay control que corra solo, y no lo voy a disfrazar de arreglado.

   LA EXCEPCION, declarada y con su motivo: `agenda/index.html` no declara
   modulo A PROPOSITO (medido el 31/10). Es una pagina suelta: no carga
   core.js, tiene su propia clave validada en la base, y NO filtra datos
   del panel. Ponerle data-modulo haria creer que el portero la cuida, y
   ahi no hay portero que lo lea. Si alguna vez carga core.js, esta
   excepcion se cae y la puerta la va a reclamar.
   ===================================================================== */

if (!process.env.NODE_USE_ENV_PROXY && process.env.HTTPS_PROXY) {
  const r = require('child_process').spawnSync(process.execPath, [__filename], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' })
  });
  process.exit(r.status === null ? 1 : r.status);
}

require('./enchufar').enchufar();   /* la puerta se enchufa sola */

const fs   = require('fs');
const SESION = require('./sesion');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const BASE = 'https://hwgfmpvszdohnzqtwscw.supabase.co';
/* la publishable esta hecha para estar a la vista. La service_role NUNCA
   entra al repo. */
const KEY  = 'sb_publishable_7CfYchCqBdDnXJ63IblnTw_cjFCjvUl';

/* paginas sueltas que NO son modulos del panel, con el motivo al lado.
   Una lista de excepciones sin motivo es una lista de agujeros. */
/* Cada suelta declara A QUE MODULO ACTIVO le corresponde, y por que no
   declara data-modulo. Encontrado por esta misma puerta en su primera
   corrida (02/11): el modulo Agenda esta ACTIVO y aparece en el menu —lo
   probe en pantalla el 01/11— pero su pagina es suelta, asi que la regla
   "todo modulo activo tiene una pantalla que lo declara" la daba por
   faltante. El invariante que importa es que NINGUN modulo activo lleve a
   un 404; que su puerta sea el portero del panel o su propia clave es otra
   cosa, y se declara aca. Si algun dia la Agenda carga core.js, hay que
   sacarla de esta lista y la puerta le va a reclamar su data-modulo. */
const SUELTAS = {
  'agenda/index.html': {
    modulo: 'Agenda',
    motivo: 'pagina suelta con su propia clave validada en la base '
          + '(ema_agenda_datos: con una clave que no es contesta "Clave '
          + 'incorrecta" y 0 filas, probado el 01/11). No carga core.js y no '
          + 'filtra datos del panel, asi que no hay portero que lea un '
          + 'data-modulo. Medido el 31/10.',
  },
};

const fallas = [];
/* los arneses: se declara una sola vez y arriba, porque se usa en varios
   puntos de main() y un `const` declarado abajo revienta con ReferenceError
   en el de arriba (zona muerta temporal). */
const PLANTAR = process.env.CONTROL_PLANTAR || '';
const medido = { pantallas: 0, declaran: 0, modulos: 0, activos: 0, sueltas: 0, enObra: 0 };
function falla(clase, que){ fallas.push({ clase, que }); }

async function rpc(fn, body){
  const r = await fetch(BASE + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: await SESION.cabeceras(),
    body: JSON.stringify(body || {})
  });
  if (!r.ok) throw new Error(fn + ' contesto HTTP ' + r.status + ': '
                           + (await r.text()).slice(0, 200));
  return await r.json();
}

/* las pantallas del panel: los .html de la raiz. Se listan del disco, no de
   una lista escrita aca: una lista a mano se queda corta sin avisar, y la
   pantalla nueva de mañana nace sin control. */
function pantallas(){
  const out = [];
  for (const f of fs.readdirSync(RAIZ).sort())
    if (f.endsWith('.html')) out.push(f);
  for (const d of ['agenda', 'pruebas'])
    if (fs.existsSync(path.join(RAIZ, d)))
      for (const f of fs.readdirSync(path.join(RAIZ, d)).sort())
        if (f.endsWith('.html')) out.push(d + '/' + f);
  return out;
}

function moduloDe(archivo){
  const t = fs.readFileSync(path.join(RAIZ, archivo), 'utf8');
  const m = /<div[^>]*\bid=["']app["'][^>]*\bdata-modulo=["']([^"']*)["']/i.exec(t)
         || /\bdata-modulo=["']([^"']*)["']/i.exec(t);
  return m ? m[1].trim() : null;
}

async function main(){
  let filas;
  try {
    /* api_alcance_modulos existe para esto: `modulos` no tiene GRANT SELECT
       (de ahi el SECURITY DEFINER del portero), asi que el control no puede
       leer la tabla con la clave publica. */
    /* v2 desde el 20/11: trae tambien `grupo`, que es lo que el juguete
       tenia distinto de la base sin que nadie lo mirara. */
    filas = await rpc('api_alcance_modulos_v2', {});
  } catch (e){
    console.log('CONTROL DE ALCANCE: NO PUDO MEDIR.');
    console.log('  ' + e.message);
    console.log('  No medido no es limpio: el push se corta.');
    process.exit(1);
  }
  if (!Array.isArray(filas) || !filas.length){
    console.log('CONTROL DE ALCANCE: `modulos` vino vacia. Sin la tabla no hay '
              + 'alcance contra que comparar, y no medido no es limpio.');
    process.exit(1);
  }

  const porClave = {};
  for (const f of filas) porClave[String(f.clave)] = f;
  medido.modulos = filas.length;
  medido.activos = filas.filter(f => f.activo === true).length;

  const declarados = {};

  for (const p of pantallas()){
    if (SUELTAS[p]){ medido.sueltas++;
      const s = SUELTAS[p];
      const m = moduloDe(p);
      if (m){
        falla('una_suelta_declara_modulo',
              p + ' esta en la lista de paginas sueltas (' + s.motivo
            + ') pero declara data-modulo="' + m + '". O deja de ser suelta y '
            + 'carga core.js, o no declara un modulo que nadie va a leer: '
            + 'hacer creer que el portero la cuida es peor que no tenerlo.');
      }
      if (!porClave[s.modulo]){
        falla('una_suelta_apunta_a_un_modulo_que_no_existe',
              p + ' dice cubrir el modulo "' + s.modulo + '" y ese modulo NO '
            + 'esta en `modulos`. Una excepcion que apunta a la nada no es una '
            + 'excepcion: es un agujero con nombre.');
      } else {
        /* la suelta CUBRE su modulo: el invariante es que ningun modulo
           activo lleve a un 404, no que todos pasen por el mismo portero */
        (declarados[s.modulo] = declarados[s.modulo] || []).push(p + ' (suelta)');
      }
      continue;
    }
    medido.pantallas++;
    const m = moduloDe(p);
    if (!m){
      falla('pantalla_sin_declarar_su_modulo',
            p + ' no declara data-modulo. El portero del 31/10 la tapa —falla '
          + 'cerrada— asi que es una pantalla que nadie puede abrir. Si es una '
          + 'pagina suelta a proposito, va en la lista SUELTAS de este control '
          + 'CON SU MOTIVO.');
      continue;
    }
    medido.declaran++;
    (declarados[m] = declarados[m] || []).push(p);
    if (!porClave[m]){
      falla('pantalla_de_un_modulo_que_no_existe',
            p + ' declara el modulo "' + m + '" y ese modulo NO esta en '
          + '`modulos`. Esa pantalla no la pidio nadie: es el 21/10 otra vez. '
          + 'El alcance se mira en `modulos`, que es lo que el usuario tiene '
          + 'en la pantalla, no en una lista mia.');
    }
  }

  /* EN CONSTRUCCION: el unico modo legitimo de estar activo sin pantalla.
     02/11/2026. El usuario pidio "lo que no este hecho, ponele en
     construccion", y tiene sentido: que el menu muestre lo que viene es
     informacion, no un defecto. Lo que NO puede pasar es que eso sea una
     puerta de atras para encender cualquier cosa sin pantalla.
     Por eso el permiso no es una lista aparte: el modulo tiene que DECIRLO
     EN SU NOMBRE, que es el mismo texto que el usuario lee en el menu. Un
     permiso que el usuario no ve es un permiso que nadie controla. Y
     core.js lo dibuja como renglon apagado y sin enlace, asi que no hay
     404 posible — que es lo que esta regla existe para evitar. */
  /* El usuario uso la palabra "en desarrollo" el 02/11 y asi se ve en la
     pantalla; "en construcción" queda aceptada por si quedo alguno. */
  const EN_CONSTRUCCION = /\(\s*en (construcci[oó]n|desarrollo)\s*\)/i;

  for (const f of filas){
    if (f.activo !== true) continue;
    const enObra = EN_CONSTRUCCION.test(String(f.nombre || ''));
    if (!declarados[f.clave]){
      if (enObra){ medido.enObra++; continue; }
      falla('modulo_activo_sin_pantalla',
            'el modulo "' + f.clave + '" (' + (f.nombre || '') + ') esta ACTIVO '
          + 'en `modulos`, ninguna pantalla lo declara, y su nombre NO dice '
          + '"(en construcción)". El menu sale de la base al instante y la '
          + 'pantalla sale del codigo publicado: DISSAN ve la opcion y le da un '
          + '404. Es la trampa del 14/10. O se le hace la pantalla, o el nombre '
          + 'dice que esta en construccion y el usuario lo ve apagado.');
      continue;
    }
    if (enObra){
      falla('modulo_en_construccion_que_si_tiene_pantalla',
            'el modulo "' + f.clave + '" se llama "' + f.nombre + '" pero SI tiene '
          + 'pantalla (' + declarados[f.clave].join(', ') + '). El nombre le miente '
          + 'al usuario: le dice que no se puede usar algo que se puede usar, y '
          + 'ademas core.js lo dibuja apagado y sin enlace, asi que la pantalla '
          + 'queda inalcanzable. Si ya esta hecha, sacale el "(en construcción)".');
    }
  }

  /* ---- 4b. LA LISTA `PANTALLAS` DE core.js TIENE QUE TENERLAS A TODAS ---
     POR QUE EXISTE. El comentario de esa lista decia, desde el 05/11, que
     «lo frena control/alcance.js». NO LO FRENABA: este control comparaba el
     data-modulo de los .html contra `modulos` y nunca miraba ESA lista.
     El 20/11 me olvide de agregar VentasDetalle y el menu le dibujo al
     usuario —que SI tiene permiso— el renglon apagado de «en desarrollo»,
     con el aviso por defecto «No tenes acceso a este modulo», que ademas no
     era lo que pasaba. `renglon()` mira `PANTALLAS[clave]` ANTES que el
     permiso, asi que sin esa entrada no hay enlace posible.
     Un comentario que promete un control que no existe es peor que no tener
     el control, porque uno deja de mirar. */
  let coreJs = fs.readFileSync(path.join(RAIZ, 'js', 'core.js'), 'utf8');
  if (PLANTAR === 'sin_pantalla_en_core'){
    const antes = coreJs;
    coreJs = coreJs.replace(/\n\s*VentasDetalle:\s*\{[^}]*\}/, '');
    if (coreJs === antes)
      throw new Error('EL ARNES NO ENCONTRO DONDE PLANTAR "sin_pantalla_en_core". '
                    + 'Un arnes que no planta nada da verde sin haber probado.');
    console.log('  [arnes] plantado: sin_pantalla_en_core');
  }
  const mapa = /const\s+PANTALLAS\s*=\s*\{([\s\S]*?)\n\};/.exec(coreJs);
  if (!mapa){
    falla('no_encontre_la_lista_PANTALLAS_de_core',
          'js/core.js no tiene un `const PANTALLAS = { ... };` reconocible. Sin '
        + 'poder leerlo este control NO MIDE si el menu puede enlazar cada '
        + 'pantalla, y no medido no es limpio.');
  } else {
    const enCore = new Set();
    const reC = /(?:^|\n)\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{\s*archivo\s*:/g;
    let c;
    while ((c = reC.exec(mapa[1])) !== null) enCore.add(c[1]);
    medido.enCore = enCore.size;
    for (const clave of Object.keys(declarados)){
      if (SUELTAS[declarados[clave][0]]) continue;        /* la suelta no se enlaza */
      if (!enCore.has(clave))
        falla('modulo_con_pantalla_que_core_no_sabe_enlazar',
              'el modulo "' + clave + '" tiene pantalla ('
            + declarados[clave].join(', ') + ') y NO esta en PANTALLAS de '
            + 'js/core.js. El menu lo dibuja apagado como «en desarrollo» '
            + 'aunque el usuario tenga permiso, y con el aviso generico «no '
            + 'tenes acceso», que ni siquiera es el motivo. Es lo que paso el '
            + '20/11 con VentasDetalle.');
    }
    for (const clave of enCore){
      if (!porClave[clave])
        falla('core_enlaza_un_modulo_que_no_existe',
              'js/core.js tiene en PANTALLAS el modulo "' + clave + '" y en '
            + '`modulos` no esta. Es una pantalla que invente yo (el 21/10).');
    }
  }

  /* ---- 4. el menu se arma con el portero, no con una lista a mano ------ */
  const core = coreJs;
  if (!/api_mis_modulos/.test(core)){
    falla('el_menu_no_pasa_por_el_portero',
          'js/core.js no nombra api_mis_modulos(). El menu tiene que salir de '
        + 'esa funcion, que cruza el rol del JWT contra modulos.activo y '
        + 'modulos.roles. Con una lista fija ahi, el portero deja de ser el '
        + 'portero y el panel le muestra todo a todos (el defecto del 21/10).');
  }

  /* ---- 5. EL JUGUETE TIENE QUE DECIR LO MISMO QUE LA BASE  20/11/2026 ---
     POR QUE EXISTE. Ese mismo dia cree el modulo VentasDetalle con
     grupo 'Ventas' en la base, y en control/supabase-de-juguete.js escribi
     'CONSULTAS'. core.js arma el arbol del menu con `if (g !== cabeza)`:
     comparacion EXACTA de texto, asi que 'Ventas' no es 'VENTAS' y el menu
     PUBLICADO le dibujaba una cabeza propia entre CONSULTAS y VENTAS —tres
     titulos donde van dos—. Las 18 puertas pasaron todas, y no por flojas:
     TODAS corren contra el juguete, y el juguete tenia la version buena.
     Es el golpe del 10/11 con el Tablero y el del 16/11 con ICU, en el
     menu: un control que solo mira el fixture no puede ver que el fixture
     y la realidad se separaron.
     Se comparan `nombre` y `grupo` porque son los dos textos que el usuario
     LEE en el menu. `activo` y `roles` no: el juguete arma su propia lista
     de quien entra a proposito, para poder pintar las tres caras (entra, ve
     y no entra, en desarrollo) sin depender de como esten los permisos hoy. */
  let jug = fs.readFileSync(path.join(__dirname, 'supabase-de-juguete.js'), 'utf8');

  /* EL ARNES, EN MEMORIA Y SIN TOCAR EL REPOSITORIO. Una puerta que deja de
     gritar puede estar arreglada o ciega, y las dos se ven igual desde
     afuera. Le planta de a uno los dos defectos reales del 20/11, y si el
     ancla no aparece REVIENTA: un arnes que no planta nada da verde sin
     haber probado. */
  if (PLANTAR === 'juguete_distinto' || PLANTAR === 'juguete_de_mas'){
    const antes = jug;
    /* el ancla NO transcribe el renglon entero: el nombre cambia y un ancla
       larga se rompe sola. Planta sobre el `grupo` del renglon que sea. */
    jug = PLANTAR === 'juguete_distinto'
      ? jug.replace(/(\{clave:'VentasDetalle',[^}]*grupo:')CONSULTAS(')/,
                    '$1Ventas$2')
      : jug.replace("{clave:'VentasDetalle',",
                    "{clave:'ModuloQueNoExiste',nombre:'inventado',grupo:'CONSULTAS'},\n                 {clave:'VentasDetalle',");
    if (jug === antes)
      throw new Error('EL ARNES NO ENCONTRO DONDE PLANTAR "' + PLANTAR + '". '
                    + 'Un arnes que no planta nada da verde sin haber probado.');
    console.log('  [arnes] plantado: ' + PLANTAR);
  }

  /* el cierre es `}];` en la misma linea del ultimo renglon, no `\n];`: una
     primera version pedia el salto de linea y el control DECLARO que no podia
     medir en vez de pasar en silencio, que es para lo que esa rama existe. */
  const bloque = /(?:var|const|let)\s+MODULOS\s*=\s*\[([\s\S]*?\})\s*\]\s*;/.exec(jug);
  if (!bloque){
    falla('no_encontre_la_lista_de_modulos_del_juguete',
          'control/supabase-de-juguete.js no tiene un `const MODULOS = [ ... ];` '
        + 'reconocible. Sin poder leerlo, este control NO MIDE si el juguete y '
        + 'la base dicen lo mismo, y no medido no es limpio.');
  } else {
    let enJuguete = 0;
    const re = /\{[^{}]*\bclave\s*:\s*'([^']+)'[^{}]*\}/g;
    let m;
    while ((m = re.exec(bloque[1])) !== null){
      const cuerpo = m[0], clave = m[1];
      enJuguete++;
      const real = porClave[clave];
      if (!real){
        falla('el_juguete_tiene_un_modulo_que_la_base_no',
              'el juguete declara el modulo "' + clave + '" y en `modulos` no '
            + 'esta. Las 18 puertas estarian probando un menu que no existe.');
        continue;
      }
      for (const campo of ['nombre', 'grupo']){
        const g = new RegExp('\\b' + campo + '\\s*:\\s*(?:\'([^\']*)\'|null)').exec(cuerpo);
        if (!g) continue;                       /* no lo declara: no se compara */
        const dice = g[1] === undefined ? null : g[1];
        const es   = real[campo] === undefined ? null : real[campo];
        if (String(dice) !== String(es)){
          falla('el_juguete_y_la_base_dicen_distinto',
                'el modulo "' + clave + '": el juguete dice ' + campo + ' = '
              + JSON.stringify(dice) + ' y la base dice ' + JSON.stringify(es)
              + '. core.js compara el grupo con texto exacto para armar las '
              + 'cabezas del menu, y el nombre es lo que el usuario LEE. Si los '
              + 'dos no coinciden, las 18 puertas miden un menu y DISSAN ve '
              + 'otro — que es exactamente lo que paso el 20/11.');
        }
      }
    }
    medido.juguete = enJuguete;
  }

  /* ---- el veredicto --------------------------------------------------- */
  if (fallas.length){
    console.log('CONTROL DE ALCANCE: ' + fallas.length + ' falla(s)\n');
    const porC = {};
    for (const f of fallas) (porC[f.clase] = porC[f.clase] || []).push(f);
    for (const c of Object.keys(porC)){
      console.log('  ' + c.toUpperCase() + ' (' + porC[c].length + ')');
      for (const f of porC[c]) console.log('    ' + f.que);
      console.log('');
    }
    console.log('  midio: ' + medido.pantallas + ' pantallas del panel contra las '
              + medido.modulos + ' filas de `modulos`.');
    process.exit(1);
  }

  console.log('CONTROL DE ALCANCE: 0 fallas.');
  console.log('  midio: ' + medido.pantallas + ' pantallas del panel, las '
            + medido.declaran + ' declarando su modulo · ' + medido.modulos
            + ' filas en `modulos`, ' + medido.activos + ' activas: '
            + (medido.activos - medido.enObra) + ' con su pantalla y '
            + medido.enObra + ' declaradas (en desarrollo), apagadas en el menu '
            + 'y sin pantalla a proposito · ' + medido.sueltas
            + ' pagina(s) suelta(s) declarada(s) con su motivo · y el menu sale '
            + 'de api_mis_modulos() · ' + (medido.juguete || 0) + ' modulos del '
            + 'juguete comparados con la base en nombre y grupo, que son los dos '
            + 'textos que el usuario LEE en el menu.');
  console.log('  NO midio: que lo que hay ADENTRO de cada pantalla sea lo que el '
            + 'usuario pidio. Esto mide el bulto, no el detalle.');
  process.exit(0);
}

main().catch(e => {
  console.error('EL CONTROL DE ALCANCE NO PUDO CORRER: ' + e.message);
  process.exit(1);
});
