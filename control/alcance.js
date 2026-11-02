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
const medido = { pantallas: 0, declaran: 0, modulos: 0, activos: 0, sueltas: 0 };
function falla(clase, que){ fallas.push({ clase, que }); }

async function rpc(fn, body){
  const r = await fetch(BASE + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
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
    filas = await rpc('api_alcance_modulos', {});
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

  for (const f of filas){
    if (f.activo !== true) continue;
    if (!declarados[f.clave]){
      falla('modulo_activo_sin_pantalla',
            'el modulo "' + f.clave + '" (' + (f.nombre || '') + ') esta ACTIVO '
          + 'en `modulos` y ninguna pantalla lo declara. El menu sale de la base '
          + 'al instante y la pantalla sale del codigo publicado: DISSAN ve la '
          + 'opcion y le da un 404. Es la trampa del 14/10.');
    }
  }

  /* ---- 4. el menu se arma con el portero, no con una lista a mano ------ */
  const core = fs.readFileSync(path.join(RAIZ, 'js', 'core.js'), 'utf8');
  if (!/api_mis_modulos/.test(core)){
    falla('el_menu_no_pasa_por_el_portero',
          'js/core.js no nombra api_mis_modulos(). El menu tiene que salir de '
        + 'esa funcion, que cruza el rol del JWT contra modulos.activo y '
        + 'modulos.roles. Con una lista fija ahi, el portero deja de ser el '
        + 'portero y el panel le muestra todo a todos (el defecto del 21/10).');
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
            + ' filas en `modulos`, ' + medido.activos + ' activas, y las '
            + medido.activos + ' con su pantalla · ' + medido.sueltas
            + ' pagina(s) suelta(s) declarada(s) con su motivo · y el menu sale '
            + 'de api_mis_modulos().');
  console.log('  NO midio: que lo que hay ADENTRO de cada pantalla sea lo que el '
            + 'usuario pidio. Esto mide el bulto, no el detalle.');
  process.exit(0);
}

main().catch(e => {
  console.error('EL CONTROL DE ALCANCE NO PUDO CORRER: ' + e.message);
  process.exit(1);
});
