#!/usr/bin/env node
/* =====================================================================
   LAS PUERTAS, CORRIDAS SOLAS                               02/11/2026
   =====================================================================
   POR QUE EXISTE. El 01/11 quedo armado el registro que contesta
   "lo probaste?" sin pasar por mi memoria (ema.control_corrida +
   api_estado_del_sistema). Pero las puertas corren CUANDO YO PUSHEO, y
   el usuario lo dijo apenas lo vio:

     "quiero trabajar tranquilo"

   Si pasan tres dias sin que yo suba nada, cuando pregunte las ocho van
   a estar en AMBAR —"paso, pero la medicion esta vieja"— y eso es casi
   tan inutil como no saber. El semaforo tiene razon en ponerse ambar: lo
   que falta es que algo las corra sin que yo me acuerde.

   QUE HACE. Corre todas en el mismo orden del pre-push, anota cada
   una en ema.control_corrida con control/anotar.js, y al final imprime
   el estado. Se corre a mano en cualquier momento:

       node control/todos.js

   OJO — LO QUE ESTE ARCHIVO DECIA Y NO ERA CIERTO.        02/11/2026
   Hasta hoy este comentario decia "es lo que llama la tarea programada
   de cada mañana". MEDIDO hoy con list_triggers: las unicas dos tareas
   programadas de la cuenta son el refresco nocturno del costo (05:52) y
   la revision semanal de la Ayuda (lunes 08:59). LA TAREA DE LA MAÑANA
   NO EXISTE. Era una afirmacion sobre algo de afuera del repositorio,
   escrita sin mirar — la misma clase que decir "lo probe" sin probarlo,
   y encima adentro del sistema que existe para que eso no pase.

   LO PRIMERO QUE HABIA QUE MEDIR, Y SE MIDIO: una tarea programada
   arranca una sesion NUEVA en un contenedor nuevo, y las diez puertas no
   corren con node pelado — `control/pantallas.js` necesita Chromium, y
   `control/archivo-senuelos.py` y `control/pdf.py` necesitan openpyxl y
   pdfplumber. Medido el 02/11 por la fecha de los paquetes:

     openpyxl 3.1.5 y pdfplumber 0.11.10  -> Oct 30 20:17
     el contenedor (/home/claude)         -> Oct 30 20:19
     el pip del contenedor                -> Oct 30 20:38

   Los dos son ANTERIORES al contenedor: vienen en la imagen, no los
   instale yo. Playwright y Chromium tambien. Asi que la tarea es viable:
   clonar el repo y correr `node control/todos.js --desatendido`.

   POR QUE IGUAL NO LA CREE SOLO: cuesta plata todas las mañanas. Las
   diez puertas son ~12 minutos de navegador y archivos, todos los dias,
   en la cuenta de Anibal. El 22/10 se acabo el credito de la API porque
   un gasto quedo invisible, y la regla que salio de ahi fue que un costo
   no se mete sin que el lo sepa. La medicion esta hecha y escrita aca; la
   decision de prenderla es suya.

   NO REEMPLAZA AL PRE-PUSH, y esto importa: el pre-push es la puerta
   —corta el push—, esto es el reloj. Si se usara esto en vez del hook,
   un push podria pasar sin control. Por eso el hook sigue igual y este
   archivo no lo toca.

   LO QUE NO HACE, declarado: no arregla nada. Si una puerta falla, queda
   anotada en rojo y el estado lo muestra. Avisar es su trabajo; arreglar
   es mio.
   ===================================================================== */

const path = require('path');
const { spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');

/* mismo orden que .githooks/pre-push, y a proposito: si se corren en otro
   orden, el acceso —que es el que dice si se puede medir— ya no va primero */
/* `--desatendido` lo pone la tarea programada de cada mañana: en esa corrida
   no hay nadie que pueda medir el navegador ni el puente, y el control de
   acceso lo DECLARA en vez de poner un rojo falso. Corrido a mano (por mi,
   con el Chrome del usuario del otro lado) va sin el flag, o sea estricto. */
const DESATENDIDO = process.argv.includes('--desatendido');

/* `--solo <parte del nombre>` corre UNA puerta y la anota igual que las
   demas.                                                      02/11/2026
   POR QUE EXISTE. Hoy volvi a correr `node control/publicado.js` a mano
   despues de un push, dio 48 de 48 sobre el commit nuevo, y la tabla
   siguio mostrando el commit ANTERIOR: el que anota es el pre-push y el
   reloj, nunca el control suelto (y esta bien que sea asi — una llamada a
   anotar repartida adentro de cada control se queda corta en cuanto
   aparezca la puerta trece). El agujero no era el control: era que una
   medicion que paso a mano NO QUEDABA ESCRITA, y para esta tabla eso es
   lo mismo que no haberla hecho. Ahora correr una puerta a mano se hace
   por aca y queda anotada. */
const iSolo = process.argv.indexOf('--solo');
const SOLO = iSolo !== -1 ? (process.argv[iSolo + 1] || '').toLowerCase() : null;

const PUERTAS = [
  ['el acceso',                          'node',    'control/acceso.js'],
  ['lo publicado',                       'node',    'control/publicado.js'],
  ['el control del control de lo publicado', 'node','control/publicado-senuelos.js'],
  ['el alcance',                         'node',    'control/alcance.js'],
  ['el control del control del alcance', 'node',    'control/alcance-senuelos.js'],
  ['las edge functions',                 'node',    'control/edge.js'],
  ['los rotulos',                        'node',    'control/rotulo.js'],
  ['las cifras publicadas',              'node',    'control/cifra.js'],
  ['el control del control del archivo', 'python3', 'control/archivo-senuelos.py'],
  ['el control del control del pdf',     'node',    'control/pdf-senuelos.js'],
  ['las pantallas',                      'node',    'control/pantallas.js'],
  ['el archivo bajado',                  'node',    'control/archivo.js'],
  ['el aviso en vivo',                   'node',    'control/envivo.js'],
  ['las firmas',                         'node',    'control/firmas.js'],
];

/* la linea "midio:" de cada control, que es lo que se guarda como prueba
   de QUE se midio en esa corrida */
function lineaMidio(salida){
  const m = salida.split('\n')
    .find(l => /^\s*(midio|adentro de los archivos midio|el PDF midio):/.test(l));
  return (m || '').trim().slice(0, 600);
}
function lineaResumen(salida){
  const m = salida.split('\n')
    .find(l => /(0 fallas|falla\(s\)|de \d+\.|SE CORTA|NO PUDO)/.test(l));
  return (m || '').trim().slice(0, 600);
}

function anotar(nombre, ok, midio, resumen){
  const r = spawnSync('node', [path.join(__dirname, 'anotar.js'),
                               nombre, ok ? '1' : '0', midio, resumen],
                      { cwd: RAIZ, encoding: 'utf8' });
  const t = ((r.stdout || '') + (r.stderr || '')).trim();
  if (t) console.log('    ' + t);
}

const pasaron = [], fallaron = [];

const ELEGIDAS = SOLO
  ? PUERTAS.filter(([n, , a]) => n.toLowerCase().includes(SOLO) || a.toLowerCase().includes(SOLO))
  : PUERTAS;
if (SOLO && !ELEGIDAS.length){
  console.log('No hay ninguna puerta que diga "' + SOLO + '". Las que hay:');
  for (const [n, , a] of PUERTAS) console.log('  ' + n + '   (' + a + ')');
  process.exit(2);
}

console.log('LAS PUERTAS, UNA POR UNA — ' + new Date().toISOString() +
            (SOLO ? '  ·  solo: ' + ELEGIDAS.map(x => x[0]).join(' · ') : '') + '\n');

for (const [nombre, interprete, archivo] of ELEGIDAS){
  const t0 = Date.now();
  const r = spawnSync(interprete, [archivo], {
    cwd: RAIZ, encoding: 'utf8', timeout: 20 * 60 * 1000,
    env: Object.assign({}, process.env,
                       DESATENDIDO ? { CONTROL_SIN_NADIE: '1' } : {})
  });
  const salida = (r.stdout || '') + (r.stderr || '');
  /* status null = lo mato el timeout: eso NO es pasar */
  const ok = r.status === 0;
  const seg = ((Date.now() - t0) / 1000).toFixed(0);

  console.log((ok ? '  PASO  ' : '  FALLO ') + nombre.padEnd(38) + seg + ' s');
  const midio = lineaMidio(salida);
  if (midio) console.log('    ' + midio.slice(0, 160));
  if (!ok){
    /* de la que falla se muestra TODO: es lo unico que sirve para arreglarla */
    console.log(salida.trim().split('\n').map(l => '    | ' + l).join('\n'));
  }
  anotar(nombre, ok, midio, lineaResumen(salida)
         || (r.status === null ? 'la corrida se paso de los 20 minutos y se corto' : ''));
  (ok ? pasaron : fallaron).push(nombre);
}

console.log('\n' + (fallaron.length
  ? 'FALLARON ' + fallaron.length + ' de ' + ELEGIDAS.length + ':' + fallaron.map(x => ' ' + x).join(' ·')
  : 'LAS ' + ELEGIDAS.length + ' PASARON.'));
console.log('El estado quedo anotado: select * from api_estado_del_sistema();');
process.exit(fallaron.length ? 1 : 0);
