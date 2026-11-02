/* =====================================================================
   EL CONTROL DEL CONTROL DE LO PUBLICADO                   02/11/2026
   =====================================================================
   Un control que nunca vi cortar es una suposicion con cara de puerta.
   Y este es el mas incomodo de probar de todos, porque el defecto que
   frena vive AFUERA: no puedo plantarle nada a lo que github.io sirve.

   COMO SE RESUELVE: el senuelo se planta del otro lado de la comparacion.
   Con plumbing de git se arma un COMMIT DE MENTIRA —`git hash-object`,
   `git update-index` sobre un GIT_INDEX_FILE temporal, `git write-tree`,
   `git commit-tree`— que tiene el arbol de origin/main con un archivo
   cambiado o con uno de mas. Ese commit queda en la base de objetos y en
   ningun lado mas: NO toca el arbol de trabajo, NO toca el indice de
   verdad, NO mueve ninguna rama, y nadie lo ve. Despues se le apunta la
   comparacion ahi con CONTROL_PUBLICADO_RAMA y se exige que corte
   nombrando la clase.

   Y al final el caso limpio —origin/main contra el panel de verdad— que
   NO tiene que disparar nada: una puerta que grita siempre se apaga, y
   entonces no frena nada el dia que grita de verdad.

   Se corre solo: `node control/publicado-senuelos.js`
   ===================================================================== */

const os   = require('os');
const path = require('path');
const fs   = require('fs');
const { execFileSync, spawnSync } = require('child_process');

const RAIZ  = path.join(__dirname, '..');
const RAMA  = 'origin/main';
const PANEL = 'https://ema-data-analytics.github.io/dissan-panel/';

/* OJO: DOS LECTURAS DISTINTAS, Y LA DIFERENCIA ME COMIO UN SENUELO.
   `git()` devuelve texto recortado, que sirve para leer un sha o una lista.
   `gitCrudo()` devuelve los BYTES tal cual. El senuelo del byte de
   diferencia leia el archivo con el primero —o sea recortado— y le volvia a
   pegar el '\n' que el trim le habia sacado: reconstruia el original
   identico, y el control no cortaba porque NO HABIA NADA QUE CORTAR.
   El arnes dijo "AGUJERO" y el agujero estaba en el arnes. Para eso existe:
   la primera corrida de un control del control encuentra un defecto, y la
   mitad de las veces es del propio control del control. */
function git(args, env){
  return gitCrudo(args, env).toString().trim();
}
function gitCrudo(args, env){
  return execFileSync('git', args, {
    cwd: RAIZ, maxBuffer: 64 * 1024 * 1024,
    env: Object.assign({}, process.env, env || {})
  });
}

/* ---------------------------------------------------------------------
   UN COMMIT DE MENTIRA, SIN TOCAR NADA DE LO QUE SE VE
   `cambios` es una lista de [ruta, contenido]. Si el contenido es null,
   la ruta se SACA del arbol.
   --------------------------------------------------------------------- */
function commitDeMentira(cambios){
  const indice = path.join(os.tmpdir(),
                  'senuelo-indice-' + Math.random().toString(36).slice(2));
  const env = { GIT_INDEX_FILE: indice };
  try {
    git(['read-tree', RAMA], env);
    for (const [ruta, contenido] of cambios){
      if (contenido === null){
        git(['update-index', '--force-remove', ruta], env);
      } else {
        const tmp = path.join(os.tmpdir(),
                     'senuelo-blob-' + Math.random().toString(36).slice(2));
        fs.writeFileSync(tmp, contenido);
        const blob = git(['hash-object', '-w', tmp], env);
        fs.unlinkSync(tmp);
        git(['update-index', '--add', '--cacheinfo', '100644,' + blob + ',' + ruta], env);
      }
    }
    const arbol = git(['write-tree'], env);
    return git(['commit-tree', arbol, '-p', RAMA, '-m', 'senuelo'], env);
  } finally {
    try { fs.unlinkSync(indice); } catch (e){ /* ya no esta */ }
  }
}

function correr(rama, url){
  const p = spawnSync('node', [path.join(__dirname, 'publicado.js')], {
    cwd: RAIZ, encoding: 'utf8',
    env: Object.assign({}, process.env, {
      CONTROL_PUBLICADO_RAMA: rama,
      CONTROL_PUBLICADO_URL:  url || PANEL,
      /* una vuelta y sin espera: lo que se prueba es la comparacion, no la
         paciencia con Pages */
      CONTROL_PUBLICADO_VUELTAS: '1',
      CONTROL_PUBLICADO_ESPERA_MS: '0',
    })
  });
  return { codigo: p.status,
           texto: ((p.stdout || '') + (p.stderr || '')).toLowerCase() };
}

/* =====================================================================
   LOS SENUELOS
   ===================================================================== */
const SENUELOS = [

  ['un archivo publicado que NO es el que se subio',
   'lo_publicado_no_es_lo_que_se_subio', () => {
      /* es el 14/10: el panel sirviendo una cosa y el repositorio otra */
      return { rama: commitDeMentira([['index.html',
               '<!doctype html><html><body>otra cosa</body></html>\n']]) };
   }],

  ['un byte de diferencia, nada mas',
   'lo_publicado_no_es_lo_que_se_subio', () => {
      /* si la comparacion fuera por tamaño o "parecido", esto pasaria.
         Un archivo que difiere en un salto de linea YA es otro archivo.
         Se lee CRUDO: con el texto recortado se reconstruye el original. */
      const vivo = gitCrudo(['show', RAMA + ':index.html']);
      return { rama: commitDeMentira([['index.html',
               Buffer.concat([vivo, Buffer.from('\n')])]]) };
   }],

  ['un archivo que se subio y github.io no sirve',
   'un_archivo_subido_que_github_io_no_sirve', () => {
      return { rama: commitDeMentira([['pantalla-que-no-existe.html',
               '<!doctype html><html><body>404</body></html>\n']]) };
   }],

  ['el panel entero contestando 404',
   'un_archivo_subido_que_github_io_no_sirve', () => {
      /* si manaña Pages se cae o cambia la URL, esto NO puede pasar en
         silencio diciendo "0 fallas" */
      return { rama: RAMA,
               url: 'https://ema-data-analytics.github.io/dissan-panel-que-no-existe/' };
   }],

  ['una rama que no existe: NO PUDO MEDIR tiene que cortar igual',
   'no medido no es limpio', () => {
      return { rama: 'origin/rama-que-no-existe-senuelo' };
   }],

  ['un arbol sin un solo archivo servible',
   'no hay archivos servibles', () => {
      /* todo borrado menos lo que Pages no sirve: si el control se quedara
         callado con cero archivos, diria "0 fallas" sin haber mirado nada */
      const todos = git(['ls-tree', '-r', '--name-only', RAMA]).split('\n')
                      .map(s => s.trim()).filter(Boolean);
      const borrar = todos
        .filter(f => /\.(html|js|mjs|css)$/.test(f))
        .filter(f => !/^(control|\.githooks|edge|docs)\//.test(f))
        .map(f => [f, null]);
      return { rama: commitDeMentira(borrar) };
   }],
];

/* =====================================================================
   LA CORRIDA
   ===================================================================== */
let ok = 0, mal = 0;

console.log('EL CONTROL DEL CONTROL DE LO PUBLICADO — cada senuelo tiene que CORTAR\n');

for (const [nombre, clase, plantar] of SENUELOS){
  let s;
  try { s = plantar(); }
  catch (e){
    console.log('  NO PUDO PLANTARSE  ' + nombre + ' -> ' + e.message.slice(0, 120));
    mal++; continue;
  }
  const r = correr(s.rama, s.url);
  const rot = '  ' + nombre.padEnd(56);
  if (r.codigo === 0){
    console.log('NO CORTO' + rot + '-> el control dijo 0 fallas. AGUJERO.');
    mal++;
  } else if (r.texto.includes(clase)){
    console.log('  OK  ' + rot + '-> ' + clase);
    ok++;
  } else {
    console.log('OTRA CLASE' + rot + '-> corto, pero no nombro "' + clase + '"');
    console.log(r.texto.split('\n').slice(0, 8).map(l => '        ' + l).join('\n'));
    mal++;
  }
}

/* ---- y origin/main contra el panel de VERDAD: no dispara nada -------- */
const rl = correr(RAMA, PANEL);
if (rl.codigo === 0){
  console.log('  OK  ' + 'origin/main contra el panel de verdad NO dispara'.padEnd(56)
            + '-> 0 fallas, como tiene que ser');
  ok++;
} else {
  console.log('FALSA FALLA  origin/main contra el panel de verdad disparo. O el');
  console.log('             panel esta desincronizado de verdad —y entonces esto');
  console.log('             no es falsa falla, es LA falla— o el control grita al');
  console.log('             aire, y la puerta que grita siempre se apaga.');
  console.log(rl.texto.split('\n').slice(0, 14).map(l => '    ' + l).join('\n'));
  mal++;
}

console.log('\n  ' + ok + ' de ' + (ok + mal) + '. '
          + (mal === 0 ? 'Las ' + SENUELOS.length + ' clases cortan y el limpio pasa.'
                       : 'HAY ' + mal + ' QUE NO SE PORTAN: el control no esta probado.'));
console.log('  midio: ' + SENUELOS.length + ' defectos plantados en commits de '
          + 'mentira hechos con plumbing (sin tocar el arbol, el indice ni ninguna '
          + 'rama) y en una URL que no sirve el panel, mas origin/main contra el '
          + 'panel de verdad: ' + ok + ' de ' + (ok + mal) + ' se portaron'
          + (mal === 0 ? ' (las ' + SENUELOS.length + ' clases cortan nombrando su '
             + 'clase, y el limpio no dispara)'
                       : ' — ' + mal + ' NO, el control no esta probado') + '.');
process.exit(mal === 0 ? 0 : 1);
