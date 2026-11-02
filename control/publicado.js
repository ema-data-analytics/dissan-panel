/* =====================================================================
   LO PUBLICADO TIENE QUE SER LO QUE SE SUBIO                02/11/2026
   =====================================================================
   POR QUE EXISTE. Es el defecto del 14/10, el mas caro del proyecto en
   horas perdidas, y hasta hoy NO LO MEDIA NINGUNA PUERTA:

     Publique en la implementacion equivocada, dije que estaba listo, y el
     panel siguio sirviendo codigo del 5 de octubre. Nueve dias de atraso.
     El sintoma fue el Tablero dando "Modulo no encontrado" mientras el
     menu ya mostraba la opcion — porque el menu sale de la tabla `modulos`
     (base, al instante) y la pantalla sale del codigo publicado.

   De ahi salio la regla: "cerrar siempre abriendo la URL del panel y
   mirando la pantalla". Una regla. Y las reglas se rompen.

   LO QUE MEDIAN LAS OTRAS PUERTAS, Y POR QUE NO ALCANZABA:
     - control/pantallas.js sirve el arbol LOCAL en 127.0.0.1 y lo prueba.
       Eso esta bien para un pre-push —se prueba lo que se esta por
       publicar— pero no dice una palabra sobre lo que github.io sirve.
     - control/acceso.js le pega al panel publicado y mide que CONTESTA
       (HTTP 200). Que contesta no es que sirva lo correcto.
     - control/edge.js SI hace esto para las Edge Functions ("12 con el sha
       local igual al verificado"). El panel no tenia su equivalente.

   QUE MIDE. Para cada archivo que Pages sirve, el SHA-256 de lo que
   github.io devuelve AHORA contra el SHA-256 de ese mismo archivo en
   `origin/main` — el ultimo commit que se subio, no el arbol de trabajo.
   Esa es la comparacion correcta: mientras estoy por pushear, mi arbol
   local tiene cambios que todavia no se publicaron; lo que tiene que
   coincidir es lo publicado con lo ya subido.

   POR QUE ES UNA PUERTA Y NO UN CHEQUEO: va en el pre-push, asi que si el
   push anterior nunca llego a servirse, EL SIGUIENTE SE CORTA. No se puede
   seguir apilando commits arriba de algo que no esta publicado.

   PAGES TARDA, Y ESO NO ES UNA FALLA: despues de un push, github.io tarda
   entre unos segundos y un par de minutos en servir lo nuevo. Asi que si
   algo no coincide se REINTENTA, con espera, hasta REINTENTOS veces. Lo
   que corta es que no coincida DESPUES de esperar.

   LO QUE NO CUBRE, declarado: mide los bytes, no el comportamiento. Que
   el archivo publicado sea identico al subido no dice que ande — eso lo
   miden las otras nueve puertas. Y no mide los .png de img/ ni nada que
   no sea texto servible, porque ahi la comparacion de bytes por HTTP se
   complica sin agregar nada: si una imagen no esta, la pantalla lo grita.

   Se corre solo: `node control/publicado.js`
   ===================================================================== */

if (!process.env.NODE_USE_ENV_PROXY && process.env.HTTPS_PROXY) {
  const r = require('child_process').spawnSync(process.execPath, [__filename], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' })
  });
  process.exit(r.status === null ? 1 : r.status);
}

require('./enchufar').enchufar();   /* la puerta se enchufa sola */

const crypto = require('crypto');
const { execFileSync } = require('child_process');
const path = require('path');

const RAIZ  = path.join(__dirname, '..');

/* LAS TRES COSAS QUE SE PUEDEN CAMBIAR POR ENTORNO, Y PARA QUE.
   Son para control/publicado-senuelos.js, que es el control de ESTE
   control: no puedo plantar un defecto en lo que github.io sirve, asi que
   el senuelo lo planta del otro lado —un commit de mentira, hecho con
   plumbing, que no toca el arbol ni la rama— y le apunta la comparacion
   ahi. Sin esto esta puerta no se podria probar nunca, y una puerta que
   nunca se vio cortar es una suposicion con cara de puerta.
   En la corrida de verdad no se define ninguna y valen los de abajo. */
const PANEL = process.env.CONTROL_PUBLICADO_URL
           || 'https://ema-data-analytics.github.io/dissan-panel/';
const RAMA  = process.env.CONTROL_PUBLICADO_RAMA || 'origin/main';

/* Pages tarda. Tres vueltas con 40 s de espera: hasta ~2 minutos.
   Mas que eso ya no es "esta en camino", es que no se publico.
   El senuelo las baja a 1 y 0: lo que prueba es la comparacion, no la
   espera, y tres senuelos esperando 2 minutos cada uno serian 6 minutos
   de pre-push por nada. */
const REINTENTOS = Number(process.env.CONTROL_PUBLICADO_VUELTAS || 3);
const ESPERA_MS  = Number(process.env.CONTROL_PUBLICADO_ESPERA_MS || 40000);

/* los que Pages sirve y se pueden comparar byte a byte por HTTP */
const EXT = /\.(html|js|mjs|css)$/;

const fallas = [];
function falla(clase, que){ fallas.push({ clase, que }); }

function sha(buf){ return crypto.createHash('sha256').update(buf).digest('hex'); }

function git(args){
  return execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 });
}

function dormir(ms){ return new Promise(r => setTimeout(r, ms)); }

async function bajar(ruta){
  /* ?nocache: `navigate` y los proxies sirven el HTML cacheado, y eso ya me
     hizo perder tres verificaciones el 20/10 creyendo que un arreglo no
     funcionaba cuando lo que estaba viejo era la copia en cache. */
  const url = PANEL + ruta + '?nocache=' + Date.now();
  const r = await fetch(url, { headers: { 'Cache-Control': 'no-store',
                                          'Pragma': 'no-cache' } });
  if (!r.ok) return { http: r.status, buf: null };
  return { http: r.status, buf: Buffer.from(await r.arrayBuffer()) };
}

async function main(){
  /* ---- 1. que exista la rama remota ---------------------------------- */
  let subidos;
  try {
    git(['fetch', '--quiet', 'origin', 'main']);
    subidos = git(['ls-tree', '-r', '--name-only', RAMA]).toString()
                .split('\n').map(s => s.trim()).filter(Boolean);
  } catch (e){
    console.log('CONTROL DE LO PUBLICADO: NO PUDO MEDIR.');
    console.log('  no se pudo leer ' + RAMA + ': ' + e.message.slice(0, 200));
    console.log('  No medido no es limpio: el push se corta.');
    process.exit(1);
  }

  /* lo que Pages sirve: todo menos lo que vive solo en el repositorio */
  const servibles = subidos.filter(f =>
    EXT.test(f) && !/^(control|\.githooks|edge|docs)\//.test(f));

  if (!servibles.length){
    console.log('CONTROL DE LO PUBLICADO: no hay archivos servibles en ' + RAMA
              + '. Sin nada contra que comparar, no medido no es limpio.');
    process.exit(1);
  }

  const commit = git(['rev-parse', '--short', RAMA]).toString().trim();
  const cuando = git(['log', '-1', '--format=%cI', RAMA]).toString().trim();

  /* ---- 2. el sha de cada archivo TAL COMO SE SUBIO -------------------- */
  const esperado = {};
  for (const f of servibles)
    esperado[f] = sha(git(['show', RAMA + ':' + f]));

  /* ---- 3. contra lo que github.io sirve ahora ------------------------- */
  let pendientes = servibles.slice();
  const bytes = { bajados: 0 };
  const noLlego = {};
  const distinto = {};

  for (let vuelta = 1; vuelta <= REINTENTOS && pendientes.length; vuelta++){
    if (vuelta > 1){
      console.log('  ' + pendientes.length + ' todavia no coinciden — Pages puede '
                + 'estar en camino. Espero ' + (ESPERA_MS / 1000) + ' s y vuelvo '
                + '(vuelta ' + vuelta + ' de ' + REINTENTOS + ').');
      await dormir(ESPERA_MS);
    }
    const quedan = [];
    /* de a 6 en paralelo: ni de a uno (lento) ni los 50 juntos (Pages corta) */
    for (let i = 0; i < pendientes.length; i += 6){
      const lote = pendientes.slice(i, i + 6);
      const res = await Promise.all(lote.map(async f => {
        try { return { f, r: await bajar(f) }; }
        catch (e){ return { f, r: { http: null, error: e.message.slice(0, 90) } }; }
      }));
      for (const { f, r } of res){
        if (!r.buf){
          noLlego[f] = r.http === null ? (r.error || 'no contesto') : 'HTTP ' + r.http;
          quedan.push(f);
          continue;
        }
        bytes.bajados += r.buf.length;
        const s = sha(r.buf);
        if (s === esperado[f]){ delete noLlego[f]; delete distinto[f]; }
        else {
          distinto[f] = { vivo: s.slice(0, 12), subido: esperado[f].slice(0, 12),
                          bytes_vivos: r.buf.length };
          quedan.push(f);
        }
      }
    }
    pendientes = quedan;
  }

  /* ---- 4. el veredicto ----------------------------------------------- */
  for (const f of Object.keys(noLlego))
    falla('un_archivo_subido_que_github_io_no_sirve',
          f + ' esta en ' + RAMA + ' y github.io contesto ' + noLlego[f]
        + '. Un archivo que se subio y no se sirve es una pantalla que al '
        + 'usuario le va a dar 404, y el menu igual se la va a ofrecer porque '
        + 'el menu sale de la base. Es el 14/10.');

  for (const f of Object.keys(distinto)){
    if (noLlego[f]) continue;
    const d = distinto[f];
    falla('lo_publicado_no_es_lo_que_se_subio',
          f + ': github.io sirve sha ' + d.vivo + ' (' + d.bytes_vivos
        + ' bytes) y en ' + RAMA + ' (' + commit + ') el sha es ' + d.subido
        + '. Despues de ' + REINTENTOS + ' vueltas con '
        + (ESPERA_MS / 1000) + ' s de espera sigue distinto, asi que no es que '
        + 'Pages este en camino: lo publicado NO es lo que se subio. Eso es '
        + 'exactamente el 14/10 — dije que estaba listo y el panel servia '
        + 'codigo de nueve dias antes.');
  }

  if (fallas.length){
    console.log('CONTROL DE LO PUBLICADO: ' + fallas.length + ' falla(s)\n');
    const porC = {};
    for (const f of fallas) (porC[f.clase] = porC[f.clase] || []).push(f);
    for (const c of Object.keys(porC)){
      console.log('  ' + c.toUpperCase() + ' (' + porC[c].length + ')');
      for (const f of porC[c]) console.log('    ' + f.que);
      console.log('');
    }
    console.log('  midio: ' + servibles.length + ' archivos de ' + RAMA + ' ('
              + commit + ', subido ' + cuando + ') bajados de github.io y '
              + 'comparados por SHA-256. ' + fallas.length + ' no coinciden.');
    console.log('\n  No medido no es limpio: el push se corta.');
    process.exit(1);
  }

  console.log('CONTROL DE LO PUBLICADO: 0 fallas.');
  console.log('  midio: los ' + servibles.length + ' archivos servibles de '
            + RAMA + ' (' + commit + ', subido ' + cuando + ') bajados de '
            + 'github.io con cache apagado y comparados por SHA-256 uno por '
            + 'uno: los ' + servibles.length + ' identicos ('
            + (bytes.bajados / 1024).toFixed(0) + ' KB bajados). Lo que el '
            + 'usuario abre ES lo que se subio.');
  console.log('  NO midio: que ande. Mide los bytes; el comportamiento lo miden '
            + 'las otras puertas. Tampoco mide img/ ni .nojekyll.');
  process.exit(0);
}

main().catch(e => {
  console.error('EL CONTROL DE LO PUBLICADO NO PUDO CORRER: ' + e.message);
  process.exit(1);
});
