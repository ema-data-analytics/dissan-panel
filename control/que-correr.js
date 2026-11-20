/* QUE PUERTAS CORRER, SEGUN LO QUE CAMBIO.                       20/11/2026
   =========================================================================

   POR QUE EXISTE. Dicho por el usuario, textual:

     "CUANDO CAMBIES ALGO SI FUNCIONA QUIERO QUE AL INSTANTE LO SUBAS,
      PORQUE SI PROBASTE Y SOLUCIONASTE QUE CARAJO TENGO QUE ESPERAR DE
      PUERTAS"

   Tiene razon en la queja y no en la conclusion. El problema no son las
   puertas —hoy me frenaron tres cosas rotas que yo ya habia dado por
   buenas— es que corro las DIECIOCHO para cambiar una linea. Para agregar
   un renglon a `PANTALLAS` de core.js no hace falta volver a plantarle
   ocho seniuelos a un PDF ni releer la lista de precios de un proveedor.

   LA DIRECCION SEGURA ES CORRER, NO SALTEAR. Por eso esto no decide "cual
   corro": decide "cual puedo SALTEAR, y lo declara". Si algo no encaja en
   ningun patron conocido, corren TODAS. Si una puerta no declara de que
   depende, corre SIEMPRE. Un error de este archivo tiene que terminar en
   una corrida de mas, nunca en una de menos.

   Y LA DECLARACION VIVE ADENTRO DE CADA PUERTA, no en una lista central.
   Es la convencion de la casa —la pantalla declara `data-plata`, el
   articulo declara su clase— y sirve para lo mismo: el que toca la puerta
   ve, en el mismo archivo, de que depende. Una lista central se queda
   corta sin avisar (14/10, 14/11, y el PANTALLAS de hoy).

   COMO SE DECLARA. En el archivo de la puerta, una linea:

       PUERTA-MIRA: js/** css/** *.html control/pantallas.js

   `**` vale por cualquier cosa. `SIEMPRE` quiere decir que corre pase lo
   que pase (el acceso, que mide la sesion de HOY; lo publicado, que mide
   si el push ANTERIOR llego a servirse — ninguna de las dos depende de lo
   que yo toque ahora).

   Se usa asi:  node control/que-correr.js            -> imprime el plan
                node control/que-correr.js "el alcance"  -> sale 0 si corre
   ========================================================================= */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');

/* Los archivos que este push lleva: lo que cambio contra lo que ya esta
   publicado, MAS lo que este sin commitear. Si no se puede averiguar
   —primer push, repo raro, git que falla— se devuelve null y corren todas:
   no saber que cambio NO es lo mismo que saber que no cambio nada. */
function loQueCambio(){
  try {
    const a = execSync('git diff --name-only origin/main...HEAD', {
      cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const b = execSync('git status --porcelain', {
      cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n').map(l => l.slice(3).trim()).filter(Boolean);
    const todos = a.split('\n').map(s => s.trim()).filter(Boolean).concat(b);
    return todos.length ? [...new Set(todos)] : [];
  } catch (e) { return null; }
}

/* glob simple: `**` cualquier cosa, `*` cualquier cosa menos la barra */
function pega(patron, archivo){
  const re = new RegExp('^' + patron
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '.*') + '$');
  return re.test(archivo);
}

/* La declaracion se lee del archivo de la puerta. Sin declaracion -> SIEMPRE. */
function queMira(archivoDeLaPuerta){
  try {
    const t = fs.readFileSync(path.join(RAIZ, archivoDeLaPuerta), 'utf8');
    const m = /PUERTA-MIRA:\s*(.+)/.exec(t);
    if (!m) return null;                       /* no declara -> corre siempre */
    const p = m[1].trim().split(/\s+/).filter(Boolean);
    return p.length ? p : null;
  } catch (e) { return null; }                 /* no se pudo leer -> siempre */
}

/** Devuelve { corre:bool, porque:string } para la puerta de ese archivo. */
function decidir(archivoDeLaPuerta, cambios){
  if (cambios === null)
    return { corre: true, porque: 'no pude averiguar que cambio' };
  const patrones = queMira(archivoDeLaPuerta);
  if (!patrones)
    return { corre: true, porque: 'la puerta no declara PUERTA-MIRA' };
  if (patrones.includes('SIEMPRE'))
    return { corre: true, porque: 'declarada SIEMPRE' };
  if (!cambios.length)
    return { corre: true, porque: 'el push no trae cambios de archivos' };

  /* todo archivo cambiado tiene que caer en ALGUN patron conocido de ALGUNA
     puerta; si hay uno que no conoce nadie, corren todas. Eso se resuelve
     afuera, en plan(), porque necesita ver las declaraciones de todas. */
  const toca = cambios.filter(c => patrones.some(p => pega(p, c)));
  return toca.length
    ? { corre: true, porque: 'cambio ' + toca.slice(0, 3).join(', ')
                   + (toca.length > 3 ? ' y ' + (toca.length - 3) + ' mas' : '') }
    : { corre: false, porque: 'nada de lo que cambiaste la toca' };
}

/* Los archivos que NO afectan a ninguna puerta y se declaran asi, con su
   motivo. Si cambia algo que no esta en ningun patron Y no esta aca, corren
   TODAS: un archivo que nadie reclama es un archivo que nadie midio. */
const NO_AFECTAN = [
  ['CLAUDE.md',   'son mis reglas, no codigo que se sirva'],
  ['claude/**',   'documentos del proyecto'],
  ['*.md',        'documentacion'],
  ['base/**',     'volcados de la base para el respaldo'],
  ['sql/**',      'scripts sueltos que no los sirve el panel'],
  ['img/**',      'imagenes; ninguna puerta las mide'],
  ['control/acceso-medido.json', 'la medicion del acceso, que la puerta 1 lee'],
];

function plan(){
  const cambios = loQueCambio();
  const puertas = fs.readdirSync(__dirname)
    .filter(f => /\.(js|py)$/.test(f) && f !== 'que-correr.js')
    .map(f => 'control/' + f);

  let motivoGlobal = null;
  if (cambios === null) motivoGlobal = 'no pude averiguar que cambio';
  else {
    const conocidos = new Set();
    for (const p of puertas){
      const pat = queMira(p);
      if (pat) for (const x of pat) if (x !== 'SIEMPRE') conocidos.add(x);
    }
    for (const [pat] of NO_AFECTAN) conocidos.add(pat);
    const huerfanos = cambios.filter(c => ![...conocidos].some(p => pega(p, c)));
    if (huerfanos.length)
      motivoGlobal = 'cambio ' + huerfanos.slice(0, 3).join(', ')
                   + ', que no lo reclama ninguna puerta';
  }
  return { cambios, motivoGlobal };
}

function corre(archivoDeLaPuerta){
  const { cambios, motivoGlobal } = plan();
  if (motivoGlobal) return { corre: true, porque: motivoGlobal };
  return decidir(archivoDeLaPuerta, cambios);
}

if (require.main === module){
  const pedido = process.argv[2];
  if (pedido){
    const r = corre(pedido);
    process.stdout.write(r.porque);
    process.exit(r.corre ? 0 : 1);
  }
  const { cambios, motivoGlobal } = plan();
  console.log('QUE CAMBIA ESTE PUSH: ' +
    (cambios === null ? '(no se pudo averiguar)'
                      : cambios.length ? cambios.join(' · ') : '(nada)'));
  if (motivoGlobal) console.log('CORREN TODAS: ' + motivoGlobal);
  for (const f of fs.readdirSync(__dirname).filter(x => /\.(js|py)$/.test(x)).sort()){
    if (f === 'que-correr.js') continue;
    const r = motivoGlobal ? { corre: true, porque: motivoGlobal }
                           : decidir('control/' + f, cambios);
    console.log('  ' + (r.corre ? 'CORRE  ' : 'saltea ') + f.padEnd(26) + r.porque);
  }
}

module.exports = { corre, decidir, queMira, loQueCambio, pega };
