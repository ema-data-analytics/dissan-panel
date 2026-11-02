/* =====================================================================
   EL CONTROL DEL CONTROL DEL ALCANCE                       02/11/2026
   =====================================================================
   Un control que nunca vi cortar no es un control. Y este es el que mas
   necesita probarse, porque el defecto que frena —portar pantallas que
   nadie pidio— no se nota mirando la pantalla: se nota cuando el usuario
   abre el menu y ve algo que no pidio, o peor, cuando no lo ve.

   COMO SE PRUEBA SIN TOCAR NI EL REPO NI LA BASE: se copia el arbol a una
   carpeta temporal —los .html, js/core.js y la carpeta control/— se planta
   UN defecto en la copia, y se corre control/alcance.js DE ESA COPIA. La
   base se lee de verdad (api_alcance_modulos), que es lo que tiene que
   pasar: el alcance lo declara `modulos`, no un archivo de prueba.

   Se corre solo: `node control/alcance-senuelos.js`
   ===================================================================== */

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');

/* ---- la copia: solo lo que el control mira --------------------------- */
function copiar(destino){
  fs.mkdirSync(path.join(destino, 'js'), { recursive: true });
  fs.mkdirSync(path.join(destino, 'control'), { recursive: true });
  for (const f of fs.readdirSync(RAIZ))
    if (f.endsWith('.html'))
      fs.copyFileSync(path.join(RAIZ, f), path.join(destino, f));
  for (const d of ['agenda', 'pruebas']){
    const dir = path.join(RAIZ, d);
    if (!fs.existsSync(dir)) continue;
    fs.mkdirSync(path.join(destino, d), { recursive: true });
    for (const f of fs.readdirSync(dir))
      if (f.endsWith('.html'))
        fs.copyFileSync(path.join(dir, f), path.join(destino, d, f));
  }
  fs.copyFileSync(path.join(RAIZ, 'js', 'core.js'),
                  path.join(destino, 'js', 'core.js'));
  for (const f of ['alcance.js', 'enchufar.js'])
    fs.copyFileSync(path.join(__dirname, f), path.join(destino, 'control', f));
  return destino;
}

function correr(destino){
  const p = spawnSync('node', [path.join(destino, 'control', 'alcance.js')],
                      { encoding: 'utf8', cwd: destino });
  return { codigo: p.status,
           texto: ((p.stdout || '') + (p.stderr || '')).toLowerCase() };
}

function leer(d, f){ return fs.readFileSync(path.join(d, f), 'utf8'); }
function escribir(d, f, t){ fs.writeFileSync(path.join(d, f), t); }

/* =====================================================================
   LOS SENUELOS
   ===================================================================== */
const SENUELOS = [

  ['una pantalla que declara un modulo que no existe',
   'pantalla_de_un_modulo_que_no_existe', (d) => {
      const t = leer(d, 'tablero.html');
      escribir(d, 'tablero.html',
               t.replace('data-modulo="Dashboard"', 'data-modulo="RadarQueInvente"'));
   }],

  ['una pantalla sin declarar su modulo',
   'pantalla_sin_declarar_su_modulo', (d) => {
      const t = leer(d, 'informe.html');
      escribir(d, 'informe.html', t.replace(/\s*data-modulo="Informe"/, ''));
   }],

  ['un modulo activo que se quedo sin pantalla',
   'modulo_activo_sin_pantalla', (d) => {
      fs.unlinkSync(path.join(d, 'tablero.html'));
   }],

  ['la pagina suelta declarando un modulo que nadie va a leer',
   'una_suelta_declara_modulo', (d) => {
      const f = path.join('agenda', 'index.html');
      const t = leer(d, f);
      escribir(d, f, t.replace(/<body([^>]*)>/i,
               '<body$1><div id="app" data-modulo="Agenda"></div>'));
   }],

  /* 02/11: la regla nueva es que un modulo puede estar activo SIN pantalla
     si su nombre dice "(en construcción)". Eso abre una puerta de atras que
     hay que cerrar del otro lado: un modulo que dice estar en construccion y
     SI tiene pantalla. Ahi el nombre le miente al usuario —le dice que no se
     puede usar algo que si se puede— y encima core.js lo dibuja apagado y sin
     enlace, asi que la pantalla queda inalcanzable.
     Se planta agregando la pantalla a la COPIA: la base no se toca. */
  ['un modulo "(en construcción)" que SI tiene pantalla',
   'modulo_en_construccion_que_si_tiene_pantalla', (d) => {
      /* Cotizador esta ACTIVO y en construccion en `modulos`. Si aparece una
         pantalla que lo declara, el nombre le miente al usuario. (Antes este
         senuelo usaba Sueldos, que el 02/11 volvio a apagarse: un senuelo
         apuntado a un modulo inactivo no prueba nada y pasa por OK sin medir,
         que es el peor estado de un control.) */
      escribir(d, 'cotizador.html',
        '<!doctype html><html><body><div id="app" data-modulo="Cotizador"></div>'
      + '</body></html>\n');
   }],

  ['el menu armado con una lista fija en vez del portero',
   'el_menu_no_pasa_por_el_portero', (d) => {
      const t = leer(d, path.join('js', 'core.js'));
      escribir(d, path.join('js', 'core.js'),
               t.replace(/api_mis_modulos/g, 'LISTA_FIJA_DE_MODULOS'));
   }],
];

/* =====================================================================
   LA CORRIDA
   ===================================================================== */
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senuelos-alcance-'));
let ok = 0, mal = 0;

console.log('EL CONTROL DEL CONTROL DEL ALCANCE — cada senuelo tiene que CORTAR\n');

SENUELOS.forEach(([nombre, clase, plantar], i) => {
  const d = copiar(path.join(base, 's' + i));
  try { plantar(d); }
  catch (e){
    console.log('  NO PUDO PLANTARSE  ' + nombre + ' -> ' + e.message);
    mal++; return;
  }
  const r = correr(d);
  const rot = '  ' + nombre.padEnd(58);
  if (r.codigo === 0){
    console.log('NO CORTO' + rot + '-> el control dijo 0 fallas. AGUJERO.');
    mal++;
  } else if (r.texto.includes(clase)){
    console.log('  OK  ' + rot + '-> ' + clase);
    ok++;
  } else {
    console.log('OTRA CLASE' + rot + '-> corto, pero no nombro ' + clase);
    console.log(r.texto.split('\n').slice(0, 8).map(l => '        ' + l).join('\n'));
    mal++;
  }
});

/* ---- y el arbol tal cual, que NO tiene que disparar nada ------------- */
const limpio = copiar(path.join(base, 'limpio'));
const rl = correr(limpio);
if (rl.codigo === 0){
  console.log('  OK  ' + 'y el arbol tal cual NO dispara nada'.padEnd(58)
            + '-> 0 fallas, como tiene que ser');
  ok++;
} else {
  console.log('FALSA FALLA  el arbol tal cual disparo. Una puerta que grita');
  console.log('             siempre se apaga, y entonces no frena nada.');
  console.log(rl.texto.split('\n').slice(0, 14).map(l => '    ' + l).join('\n'));
  mal++;
}

console.log('\n  ' + ok + ' de ' + (ok + mal) + '. '
          + (mal === 0 ? 'Las ' + SENUELOS.length + ' clases cortan y el limpio pasa.'
                       : 'HAY ' + mal + ' QUE NO SE PORTAN: el control no esta probado.'));
/* la linea que queda en ema.control_corrida: sin esto el registro decia
   "paso" sin decir cuantas clases cortaron (encontrado el 02/11 leyendo
   api_estado_del_sistema), y media medicion no es una medicion */
console.log('  midio: ' + SENUELOS.length + ' defectos de alcance plantados de a uno '
          + 'en una COPIA del arbol, con el control corrido de esa copia y `modulos` '
          + 'leida de la base de verdad, mas el arbol limpio: ' + ok + ' de '
          + (ok + mal) + ' se portaron'
          + (mal === 0 ? ' (las ' + SENUELOS.length + ' clases cortan nombrando su '
             + 'clase, y el arbol tal cual no dispara)'
                       : ' — ' + mal + ' NO, el control no esta probado') + '.');
console.log('  los senuelos quedaron en ' + base);
process.exit(mal === 0 ? 0 : 1);
