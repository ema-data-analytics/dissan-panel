#!/usr/bin/env node
/* PUERTA 23 — UNA VARIABLE DE CSS QUE NO EXISTE CAE AL RESPALDO EN SILENCIO.
   =========================================================================
   POR QUE EXISTE: el 23/11 escribi `var(--panel)`, `var(--tinta)`,
   `var(--linea)`, `var(--acento)` y `var(--fondo-2)`. NINGUNA de las cinco
   existe en `app.css`, asi que las cajas del dashboard salieron BLANCAS
   adentro de un panel oscuro. Las veintiuna puertas pasaron —las cifras
   estaban todas bien— y lo vi al MIRAR LA FOTO. Un defecto que solo se
   encuentra mirando una captura se encuentra cuando me acuerdo de mirarla.

   QUE MIDE, sin una sola lista de nombres: junta cada `--x:` declarada en
   `css/*.css` y cada `var(--x)` usada, y corta cuando una usada no esta
   declarada en ninguna parte Y no trae respaldo. Con respaldo
   —`var(--borde, rgba(255,255,255,.08))`— no es un defecto: es lo que hace
   el resto del panel a proposito, para que una hoja sirva sola.

   QUE NO MIDE, declarado: si el COLOR elegido es el que corresponde, ni si
   contrasta. Eso es criterio y no se puede medir sin un umbral tipeado por
   mi. Mide que la variable EXISTA, que es lo que fallo el 23/11.

   NO NECESITA NAVEGADOR: son dos lecturas de texto. Corre en menos de un
   segundo, asi que no alarga el push.
   ========================================================================= */
const fs = require('fs'), path = require('path'), glob = p => fs.readdirSync(p);
const RAIZ = path.join(__dirname, '..');
const DIR = path.join(RAIZ, 'css');

function medir(fuentes){
  const declaradas = new Set(); const usos = [];
  for (const [arch, texto] of fuentes){
    let m;
    const reDecl = /(--[A-Za-z0-9_-]+)\s*:/g;
    while ((m = reDecl.exec(texto))) declaradas.add(m[1]);
    /* el segundo grupo dice si hay respaldo: `var(--x, algo)` */
    const reUso = /var\(\s*(--[A-Za-z0-9_-]+)\s*(,)?/g;
    while ((m = reUso.exec(texto))){
      const renglon = texto.substring(0, m.index).split('\n').length;
      usos.push({ v:m[1], respaldo:!!m[2], arch, renglon });
    }
  }
  return { declaradas, usos,
    huerfanas: usos.filter(u => !declaradas.has(u.v) && !u.respaldo) };
}

const fuentes = glob(DIR).filter(f => f.endsWith('.css'))
  .map(f => [f, fs.readFileSync(path.join(DIR, f), 'utf8')]);

/* EL ARNES: se le planta el defecto de verdad -las cinco variables del
   23/11, tal como las escribi- SIN tocar un archivo del repositorio, y la
   puerta tiene que agarrar las cinco. Un arnes que no planta nada da verde
   sin haber probado (14/11). */
if (process.env.CONTROL_PLANTAR === 'variable_que_no_existe'){
  const CINCO = ['--panel','--tinta','--linea','--acento','--fondo-2'];
  const falso = CINCO.map(v => '.arnes-23-11{background:var(' + v + ');}').join('\n');
  const r = medir(fuentes.concat([['ARNES-del-23-11.css', falso]]));
  const agarradas = new Set(r.huerfanas.map(h => h.v));
  const faltan = CINCO.filter(v => !agarradas.has(v));
  console.log('  ARNES: plante las 5 variables del 23/11. Agarro ' +
              (CINCO.length - faltan.length) + ' de ' + CINCO.length + '.');
  if (faltan.length){
    console.log('  ARNES ROTO: no agarro ' + faltan.join(', '));
    process.exit(1);
  }
  /* y la otra cara: con respaldo NO tiene que sonar, o la puerta gritaria
     contra las 47 variables que el panel usa asi a proposito. */
  const conResp = medir(fuentes.concat([['ARNES.css',
    '.a{color:var(--no-existe-24-11, #F2F5F3);}']]));
  if (conResp.huerfanas.some(h => h.v === '--no-existe-24-11')){
    console.log('  ARNES ROTO: sono con una variable que SI trae respaldo.');
    process.exit(1);
  }
  console.log('  ARNES: con respaldo no suena. Las dos caras, bien.');
  process.exit(0);
}

const r = medir(fuentes);
console.log('CONTROL DE VARIABLES DE CSS: ' +
  (r.huerfanas.length ? r.huerfanas.length + ' falla(s).' : '0 fallas.'));
for (const h of r.huerfanas)
  console.log('  - ' + h.arch + ':' + h.renglon + ' usa ' + h.v +
              ' y no esta declarada en ninguna hoja, ni trae respaldo. ' +
              'Cae a vacio: la caja sale del color del navegador (23/11).');
const conResp = r.usos.filter(u => u.respaldo).length;
console.log('  midio: ' + fuentes.length + ' hojas de css, ' + r.declaradas.size +
  ' variables declaradas y ' + r.usos.length + ' usos (' + conResp +
  ' con respaldo, ' + (r.usos.length - conResp) + ' sin).');
console.log('  NO midio: si el color elegido es el que corresponde ni si ' +
  'contrasta -eso es criterio y no se mide sin un umbral tipeado por mi-. ' +
  'Mide que la variable EXISTA.');
process.exit(r.huerfanas.length ? 1 : 0);
