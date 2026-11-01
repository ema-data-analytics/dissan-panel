/* =====================================================================
   EL CONTROL DEL CONTROL DEL PDF                           01/11/2026
   =====================================================================
   Un control que nunca vi cortar no es un control: es una suposicion con
   pinta de puerta. El 01/11, el verificador del Excel daba 13 fallas de
   las cuales 12 eran falsas, y lo supe recien cuando le puse senuelos.

   Aca se arman PDFs de verdad —con el mismo armador que usa el panel,
   js/bajar-formatos.js— cada uno con UN defecto plantado, y se exige que
   control/pdf.py corte nombrando esa clase. Y al final un par bien
   puesto, que NO tiene que disparar nada: un control que grita siempre
   se apaga, y entonces no frena nada.

   Se corre solo: `node control/pdf-senuelos.js`
   ===================================================================== */

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const vm   = require('vm');
const { spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const VERIF = path.join(__dirname, 'pdf.py');

/* ---- el armador del panel, cargado tal cual -------------------------
   Se carga js/bajar-formatos.js EN UN CONTEXTO, sin tocarlo: el senuelo
   tiene que salir del MISMO codigo que arma el PDF de verdad, o no
   prueba nada sobre ese codigo. */
const contexto = {
  TextEncoder, TextDecoder, Uint8Array, Math, Date, JSON, String, Number,
  Array, Object, Promise, isFinite, isNaN, parseInt, parseFloat,
  console, Response, Blob, CompressionStream,
  document: { createElement: () => ({ style:{}, appendChild(){}, remove(){} }),
              body: { appendChild(){}, removeChild(){} } },
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL(){} },
  setTimeout: () => 0,
};
vm.createContext(contexto);
vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'bajar-formatos.js'), 'utf8'),
                contexto, { filename: 'bajar-formatos.js' });

function hacerPdf(doc){
  contexto.__doc = doc;
  return vm.runInContext('bajarPdf(__doc)', contexto);
}

function cel(texto, dataV, clase){
  return { texto: texto, dataV: dataV === undefined ? null : dataV,
           title: null, clase: clase || '' };
}

/* escribe el par (pdf + pantalla.json) en una carpeta limpia */
function armar(carpeta, doc, vista, nombre){
  fs.mkdirSync(carpeta, { recursive: true });
  const bytes = hacerPdf(doc);
  const f = path.join(carpeta, (nombre || 'senuelo') + '.pdf');
  fs.writeFileSync(f, Buffer.from(bytes));
  fs.writeFileSync(f.replace(/\.pdf$/, '.pantalla.json'), JSON.stringify(vista));
  return f;
}

function correr(carpeta){
  const p = spawnSync('python3', [VERIF, carpeta], { encoding: 'utf8' });
  return { codigo: p.status,
           texto: ((p.stdout || '') + (p.stderr || '')).toLowerCase() };
}

/* =====================================================================
   LOS SENUELOS
   ===================================================================== */
const FILAS_OK = [
  ['5245', '30/09/2025', '2.638.992,35', 'COLO0170'],
  ['5246', '01/10/2025', '161.399,50',   'JHO0172'],
  ['5247', '02/10/2025', '12,00',        'IMATR0043'],
];
const ENC_OK = ['Orden de compra', 'Fecha', 'Costo total', 'Articulo'];

function vistaOk(){
  return {
    encabezados: ENC_OK.slice(),
    filas: [
      [cel('5245', null, 'mv-cod'), cel('30/09/2025'), cel('$2.638.992,35', '2638992.35'), cel('COLO0170', null, 'db-cod')],
      [cel('5246', null, 'mv-cod'), cel('01/10/2025'), cel('$161.399,50',   '161399.5'),   cel('JHO0172',  null, 'db-cod')],
      [cel('5247', null, 'mv-cod'), cel('02/10/2025'), cel('$12,00',        '12'),         cel('IMATR0043',null, 'db-cod')],
    ],
  };
}

function docOk(filas, pie){
  return {
    titulo: 'DISSAN · Senuelo',
    subtitulo: 'Control del control del PDF',
    pie: ['Sin filtros', (pie === undefined ? filas.length : pie) + ' renglones · 01/11/2026 00:00'],
    encabezados: ENC_OK.slice(),
    filas: filas,
    alinear: ['izq', 'izq', 'der', 'izq'],
    fijas:   [true, true, true, false],
  };
}

const SENUELOS = [

  ['un importe cortado con puntos suspensivos',
   'numero_o_codigo_cortado_en_el_pdf', (d) => {
      /* la columna del importe se declara como TEXTO (fijas=false) y la
         hoja se llena de columnas anchas: el armador la recorta y escribe
         "2.638.99...", que es exactamente lo que salio el 23/10 */
      const enc = ENC_OK.concat(['Observacion muy larga que se come la hoja',
                                 'Otra observacion igual de larga que tambien',
                                 'Y una tercera para que no quede ancho libre']);
      const relleno = 'texto largo '.repeat(12);
      const filas = FILAS_OK.map(f => f.concat([relleno, relleno, relleno]));
      const vista = vistaOk();
      vista.encabezados = enc;
      vista.filas = vista.filas.map(f => f.concat([cel(relleno), cel(relleno), cel(relleno)]));
      return armar(d, {
        titulo: 'DISSAN · Senuelo', subtitulo: 'importe recortable',
        pie: ['Sin filtros', filas.length + ' renglones · 01/11/2026 00:00'],
        encabezados: enc, filas: filas,
        alinear: ['izq','izq','izq','izq','izq','izq','izq'],
        fijas:   [false,false,false,false,false,false,false],
      }, vista);
   }],

  ['el PDF escribe un importe abreviado y no el exacto',
   'un_importe_de_la_pantalla_no_esta_entero_en_el_pdf', (d) => {
      const filas = FILAS_OK.map(f => f.slice());
      filas[0][2] = '2,64 M';          /* el abreviado, no el exacto */
      return armar(d, docOk(filas), vistaOk());
   }],

  ['un codigo que el PDF escribio como numero',
   'un_codigo_de_la_pantalla_no_esta_en_el_pdf', (d) => {
      const filas = FILAS_OK.map(f => f.slice());
      filas[0][0] = '5.245';           /* la OC 5245 con separador: el 23/10 */
      return armar(d, docOk(filas), vistaOk());
   }],

  ['una fecha que el PDF escribio en ISO',
   'una_fecha_de_la_pantalla_no_esta_en_el_pdf', (d) => {
      const filas = FILAS_OK.map(f => f.slice());
      filas[1][1] = '2025-10-01';      /* el defecto del 31/10 */
      return armar(d, docOk(filas), vistaOk());
   }],

  ['al PDF le falta un renglon y el pie no lo dice',
   'el_pie_no_declara_los_renglones_de_la_pantalla', (d) => {
      const filas = FILAS_OK.slice(0, 2);   /* dos renglones de tres */
      return armar(d, docOk(filas, 2), vistaOk());
   }],

  ['el titulo salio de la caja de login',
   'titulo_del_login', (d) => {
      const doc = docOk(FILAS_OK.map(f => f.slice()));
      doc.subtitulo = 'Ingresar al panel DISSAN';
      return armar(d, doc, vistaOk());
   }],

  ['el boton dijo Bajado y adentro no hay un PDF',
   'el_pdf_no_abre', (d) => {
      fs.mkdirSync(d, { recursive: true });
      const f = path.join(d, 'senuelo.pdf');
      fs.writeFileSync(f, Buffer.from('esto no es un pdf, es el cartel de error'));
      fs.writeFileSync(f.replace(/\.pdf$/, '.pantalla.json'), JSON.stringify(vistaOk()));
      return f;
   }],

  ['el PDF bajo sin su pantalla al lado',
   'sin_la_pantalla_al_lado', (d) => {
      fs.mkdirSync(d, { recursive: true });
      const bytes = hacerPdf(docOk(FILAS_OK.map(f => f.slice())));
      const f = path.join(d, 'senuelo.pdf');
      fs.writeFileSync(f, Buffer.from(bytes));
      return f;                              /* a proposito sin el .json */
   }],
];

/* =====================================================================
   LA CORRIDA
   ===================================================================== */
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senuelos-pdf-'));
let ok = 0, mal = 0;

console.log('EL CONTROL DEL CONTROL DEL PDF — cada senuelo tiene que CORTAR\n');

SENUELOS.forEach(([nombre, clase, armador], i) => {
  const d = path.join(base, 's' + i);
  let f;
  try { f = armador(d); }
  catch (e){
    console.log('  NO PUDO ARMARSE  ' + nombre + '  -> ' + e.message);
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
    mal++;
  }
  if (f) { /* nada: la carpeta queda para poder mirarla si algo falla */ }
});

/* ---- y el par bien puesto, que NO tiene que disparar nada ------------ */
const limpio = path.join(base, 'limpio');
armar(limpio, docOk(FILAS_OK.map(f => f.slice())), vistaOk());
const rl = correr(limpio);
if (rl.codigo === 0){
  console.log('  OK  ' + 'y el par bien puesto NO dispara nada'.padEnd(58)
            + '-> 0 fallas, como tiene que ser');
  ok++;
} else {
  console.log('FALSA FALLA  el par bien puesto disparo. Esto es lo peor que puede');
  console.log('             pasarle a una puerta: la que grita siempre se apaga.');
  console.log(rl.texto.split('\n').slice(0, 14).map(l => '    ' + l).join('\n'));
  mal++;
}

console.log('\n  ' + ok + ' de ' + (ok + mal) + '. '
          + (mal === 0 ? 'Las ' + SENUELOS.length + ' clases cortan y el limpio pasa.'
                       : 'HAY ' + mal + ' QUE NO SE PORTAN: el control no esta probado.'));
console.log('  los senuelos quedaron en ' + base);
process.exit(mal === 0 ? 0 : 1);
