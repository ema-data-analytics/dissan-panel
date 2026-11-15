#!/usr/bin/env node
/* =====================================================================
   PUERTA 17 — LA LECTURA DE LISTAS                          14/11/2026
   =====================================================================
   POR QUE EXISTE. Hasta hoy la lectura de los PDF de los proveedores no
   tenia NINGUN control. Ninguno. Y el 14/11 el usuario mando dos capturas
   con el codigo de ICU escrito asi:

       14001-31Set              (tenia que ser 14001-31)
       LAT-MC2005Extension      (tenia que ser LAT-MC2005)

   La primera palabra de la descripcion pegada al codigo. Un codigo asi NO
   liga con el articulo de Tango, asi que el renglon se pierde: un precio
   que no entra es una cotizacion mal hecha o una venta bajo el costo. Y
   ademas la descripcion quedaba sin su primera palabra.

   QUE MIDE, Y CONTRA QUE. Se genera un PDF con la GEOMETRIA MEDIDA de la
   lista de ICU —no con el archivo del proveedor: los datos de los
   proveedores de DISSAN no entran al repositorio— y se le pasa el lector
   DE VERDAD del panel, `lpLeerPdf` de js/listas.js, cargado en un
   navegador igual que en la pantalla. Despues se exige que los codigos
   leidos sean EXACTAMENTE los que escribio el generador. El generador es
   la fuente independiente: sabe la verdad sin mirar al lector.

   LA GEOMETRIA, MEDIDA sobre "Lista III NOVIEMBRE 2026 dissan icu
   medical.pdf" el 14/11/2026, con pdfplumber:
     el codigo arranca en  x 54,1 a 59,3
     el codigo MAS ANCHO termina en x 86,4   (LAT-MC33054)
     la descripcion arranca SIEMPRE en x 89,9  (los 42 renglones)
     el hueco mas chico entre las dos columnas: 3,5 puntos
     el precio: "$" en x 369,8 y el numero desde x 381,7
   Lo que hace imposible el atajo: la franja configurada del codigo es
   [0, 90] —la descripcion entra por UN DECIMO— y el umbral de 6 puntos
   del "salto de columna" no corta un hueco de 3,5.

   EL ARNES, ADENTRO. CONTROL_PLANTAR=sin_borde sirve un js/listas.js con
   el medidor del borde desactivado —exactamente el codigo de ayer— y
   exige que esta puerta grite. Una puerta que deja de gritar puede estar
   arreglada o ciega, y las dos se ven igual desde afuera.
   Y si el arnes no puede plantar el defecto, revienta: un arnes que no
   planta nada da verde sin haber probado.

   LO QUE NO MIDE, declarado: los PDF de verdad de los 8 proveedores. No
   estan en el repositorio y no van a estar. Esto mide que el lector
   resuelva la geometria que los rompia, no que cada archivo del mes que
   viene entre bien.
   ===================================================================== */
'use strict';

const { chromium } = require('playwright');
const http = require('http');
const fs   = require('fs');
const path = require('path');

const RAIZ    = path.resolve(__dirname, '..');
const JUGUETE = path.join(__dirname, 'supabase-de-juguete.js');
const PUERTO  = 8094;
const PLANTAR = process.env.CONTROL_PLANTAR || '';
const TMP     = fs.mkdtempSync('/tmp/control-listas-');

const fallas = [];
function falla(donde, clase, que) { fallas.push({ donde, clase, que }); }

/* ------------------------------------------------------------------
   EL FIXTURE. La geometria va en PUNTOS y absoluta, para que el x0 que
   vea pdf.js sea el que yo puse. El ancho del codigo se fuerza con
   letter-spacing hasta que el hueco con la descripcion quede chico: eso
   es lo que reproduce el caso que los umbrales no agarran.
   ------------------------------------------------------------------ */
const X_COD  = 57.2;
const X_DESC = 89.9;
const X_CUR  = 369.8;
const X_NUM  = 381.7;
const X_CAJA = 412.3;

/* cada renglon: [codigo, estiramiento del codigo en pt, descripcion, precio] */
const RENGLONES = [
  ['14001-31',    0,    'Set Primario Plum con conector clave easy open', '9.206,10'],
  ['14001-32',    0,    'Set Primario Plum con conector clave blister',   '10.521,56'],
  ['240023101',   0,    'Plum Enteral Set with ENFit',                    '11.270,98'],
  ['LAT-MC100',   0,    'Conector tapon intermitente',                    '1.056,82'],
  ['LAT-MC2005',  0.35, 'Extension Macrobore, 1 lumen, 1 Microclave',     '2.300,20'],
  ['LAT-MC3312',  0.35, 'Extension Macrobore, 2 lumenes, 2 Microclave',   '3.100,44'],
  ['LAT-MC33054', 0.55, 'Extension Microbore de 54 cm',                   '2.300,20'],
  ['LAT-CH2000S', 0.35, 'Conector Spinning Spiros Luer macho cerrado',    '2.238,72'],
  ['011-MC33063', 0.35, 'Extension con tres Microclave',                  '4.086,34'],
  ['SCXT3-2000G', 0.35, 'Set de transferencia ChemoLock',                 '5.825,76']
];

/* EL PDF SE ESCRIBE A MANO, Y NO ES CAPRICHO.              14/11/2026
   Primero lo genere con Chromium desde un HTML con divs posicionados en
   pt. No sirve, y la propia puerta lo grito: **Chromium fusiona el codigo
   y la descripcion en UN SOLO item de texto** cuando estan en la misma
   linea de base, asi que `lpPalabrasDeItems` les aproxima la x con
   `porChar = w/n` y el borde de la descripcion sale distinto en cada
   renglon (89,0 · 87,7 · ...). En el PDF del proveedor son items
   SEPARADOS, cada uno con su propio Td, y el borde es 89,9 en los 42.
   Un fixture que no reproduce la estructura del original no prueba el
   defecto: prueba otro.
   Asi que se escribe el PDF con un `BT ... Td ... Tj ET` por celda, que es
   exactamente lo que hace el generador del proveedor. Sin comprimir, con
   Helvetica -que es base-14 y no hay que embeber nada- y con la xref
   armada con los offsets de verdad. */
function armarPdf() {
  const ALTO = 792;
  const esc = function (t) {
    return String(t).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  };
  const celda = function (x, yDesdeArriba, pt, texto) {
    return 'BT /F1 ' + pt + ' Tf 1 0 0 1 ' + x + ' ' + (ALTO - yDesdeArriba)
         + ' Tm (' + esc(texto) + ') Tj ET\n';
  };
  let ops = '';
  ops += celda(52.3, 40, 10, 'ICU MEDICAL ARGENTINA S.R.L');
  ops += celda(X_COD + 5, 78, 7.5, 'Codigo');
  ops += celda(214.4, 78, 7.5, 'Descripcion');
  ops += celda(378.6, 78, 7.5, 'Precio');
  ops += celda(X_CAJA, 78, 7.5, 'Embalaje');
  RENGLONES.forEach(function (r, i) {
    const y = 96 + i * 16;
    /* EL CODIGO VA CENTRADO, como en el original: ahi los codigos arrancan
       entre x 54,1 y 59,3 segun lo largos que sean, y TODOS terminan antes
       de 86,4. Puesto a la izquierda fija, los de 10 u 11 caracteres se
       pasaban de 89,9 y se solapaban con la descripcion, que no es lo que
       pasa en el archivo de verdad. Helvetica a 5,5 pt mide ~3,03 pt por
       caracter, asi que centrando en x 70 el de 11 caracteres arranca en
       ~53,3 y termina en ~86,6: la geometria medida. */
    const anchoCod = r[0].length * 3.03;
    ops += celda(Math.round((70 - anchoCod / 2) * 10) / 10, y, 5.5, r[0]);
    ops += celda(X_DESC, y, 7.5, r[2]);
    ops += celda(X_CUR,  y, 7.5, '$');
    ops += celda(X_NUM,  y, 7.5, r[3]);
    ops += celda(X_CAJA, y, 7.5, 'Caja x 50 u.');
  });

  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ' + ALTO + ']'
      + ' /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    '<< /Length ' + Buffer.byteLength(ops, 'latin1') + ' >>\nstream\n' + ops + 'endstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  ];
  let pdf = '%PDF-1.4\n';
  const off = [];
  objs.forEach(function (cuerpo, i) {
    off.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += (i + 1) + ' 0 obj\n' + cuerpo + '\nendobj\n';
  });
  const inicioXref = Buffer.byteLength(pdf, 'latin1');
  pdf += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
  off.forEach(function (o) {
    pdf += String(o).padStart(10, '0') + ' 00000 n \n';
  });
  pdf += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\n'
       + 'startxref\n' + inicioXref + '\n%%EOF\n';
  return Buffer.from(pdf, 'latin1');
}


/* el servidor del arbol local, para cargar listas.html igual que la pantalla */
const TIPOS = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css',
                '.json':'application/json', '.mjs':'application/javascript',
                '.map':'application/json', '.svg':'image/svg+xml' };
function servidor() {
  return http.createServer(function (q, s) {
    let f = decodeURIComponent(q.url.split('?')[0]);
    if (f === '/') f = '/index.html';
    const p = path.join(RAIZ, f);
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end('no'); }
    s.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream' });
    s.end(fs.readFileSync(p));
  });
}

(async function () {
  const srv = servidor();
  await new Promise(function (r) { srv.listen(PUERTO, '127.0.0.1', r); });
  const b = await chromium.launch();

  /* ---- 1. se arma el PDF del fixture ---- */
  const pdfRuta = path.join(TMP, 'icu-geometria-medida.pdf');
  fs.writeFileSync(pdfRuta, armarPdf());
  if (!fs.existsSync(pdfRuta) || fs.statSync(pdfRuta).size < 500) {
    console.log('CONTROL DE LA LECTURA DE LISTAS: no se pudo armar el PDF del fixture.');
    console.log('  No medido no es limpio: el push se corta.');
    process.exit(1);
  }

  /* ---- 2. la pantalla de listas, con el lector DE VERDAD ---- */
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  const pg  = await ctx.newPage();
  const errores = [];
  pg.on('pageerror', function (e) { errores.push(String(e).slice(0, 200)); });
  await pg.route('**/supabase-js@*/**', function (r) {
    r.fulfill({ status: 200, contentType: 'application/javascript', body: '/* cortado */' });
  });
  if (fs.existsSync(JUGUETE)) await pg.addInitScript({ path: JUGUETE });

  if (PLANTAR === 'sin_borde') {
    await pg.route('**/js/listas.js*', function (r) {
      let cuerpo = fs.readFileSync(path.join(RAIZ, 'js', 'listas.js'), 'utf8');
      const antes = cuerpo;
      cuerpo = cuerpo.replace('function lpBordeDescripcion(lns, r) {',
                              'function lpBordeDescripcion(lns, r) { return null; /* ARNES */');
      if (cuerpo === antes) {
        throw new Error('EL ARNES NO PUDO PLANTAR EL DEFECTO: no encontro '
          + 'lpBordeDescripcion en js/listas.js. Un arnes que no planta nada da '
          + 'verde sin haber probado.');
      }
      r.fulfill({ status: 200, contentType: 'application/javascript', body: cuerpo });
    });
  }

  await pg.goto('http://127.0.0.1:' + PUERTO + '/listas.html?f=' + Date.now(),
                { waitUntil: 'load' });
  await pg.waitForTimeout(2000);

  const b64 = fs.readFileSync(pdfRuta).toString('base64');
  const cfg = { cod: [0, 90], fmt: 'ar', tipo: 'pdf',
                precio: { modo: 'moneda', ocurrencia: 1 } };

  const r = await pg.evaluate(async function (args) {
    const bin = atob(args[0]);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    /* DOS COPIAS, Y NO ES CAPRICHO: pdf.js se queda con el buffer que le
       pasan y lo deja detached, asi que la segunda lectura revienta con
       "Cannot perform Construct on a detached ArrayBuffer". Medido. */
    const copia = u8.slice();
    const leido = await lpLeerPdf(u8.buffer, args[1], true);
    /* la geometria del fixture, vista por el MISMO extractor que usa la
       pantalla: asi se comprueba que el fixture de verdad tiene el hueco
       chico, en vez de suponerlo. */
    const pdfjs = await lpPdfjs();
    const doc = await pdfjs.getDocument({ data: copia, useSystemFonts: false }).promise;
    const tc = await (await doc.getPage(1)).getTextContent();
    const lns = lpRenglones(lpPalabrasDeItems(tc.items || []), 2);
    const huecos = [];
    lns.forEach(function (ln) {
      if (ln.length < 2) return;
      if (ln[0].x0 > 70) return;
      let fin = ln[0].x1, j = 1;
      while (j < ln.length && (ln[j].x0 - fin) <= 1) { fin = ln[j].x1; j++; }
      if (j < ln.length) huecos.push({ termina: Math.round(fin * 10) / 10,
                                       sigue: Math.round(ln[j].x0 * 10) / 10,
                                       hueco: Math.round((ln[j].x0 - fin) * 10) / 10 });
    });
    return { leido: leido, huecos: huecos };
  }, [b64, cfg]);

  await b.close();
  srv.close();

  if (errores.length) falla('listas.html', 'la_pantalla_tiro_un_error', errores.join(' | '));

  if (process.env.CONTROL_VER) {
    console.log('--- DIAGNOSTICO ---');
    console.log('huecos medidos:', JSON.stringify(r.huecos));
    ((r.leido && r.leido.muestra) || []).slice(0,6).forEach(function(m){
      console.log('  ', m.pag, m.linea); });
  }

  /* ---- 3. el fixture tiene que tener el hueco chico, o no probo nada ---- */
  const huecos = r.huecos || [];
  const minHueco = huecos.length ? Math.min.apply(null, huecos.map(function (h) { return h.hueco; })) : null;
  /* ojo: minHueco se mide sobre TODOS los renglones a proposito — si en alguno
     el hueco es de 1,8 pt, ese es el caso dificil que hay que poder resolver. */
  /* el codigo mas ancho: solo de los renglones donde la descripcion arranca
     donde debe. Tomando el max de todos salia 122,5 -el de un renglon donde
     la tirada se habia comido una palabra-, y declarar mal lo que se midio es
     la mitad del defecto que esta puerta existe para frenar. */
  const bucket = function (x) { return Math.floor(x * 2) / 2; };
  const cuenta = {};
  huecos.forEach(function (h) {
    if (h.sigue > 70 && h.sigue < 200) cuenta[bucket(h.sigue)] = (cuenta[bucket(h.sigue)] || 0) + 1;
  });
  let bordeFix = null, bordeN = 0;
  Object.keys(cuenta).forEach(function (k) {
    if (cuenta[k] > bordeN) { bordeN = cuenta[k]; bordeFix = Number(k); }
  });
  /* el codigo mas ancho se mide SOLO sobre los renglones donde la descripcion
     arranca en el borde. Tomando el max de todos salia 122,5 —el de un renglon
     donde la tirada se habia comido una palabra— y declarar mal lo que se
     midio es la mitad del defecto que esta puerta existe para frenar. */
  const enBorde = huecos.filter(function (h) { return bucket(h.sigue) === bordeFix; });
  const maxFin  = enBorde.length ? Math.max.apply(null, enBorde.map(function (h) { return h.termina; })) : null;
  if (minHueco === null) {
    falla('el fixture', 'el_fixture_no_tiene_renglones',
          'pdf.js no encontro ningun renglon que arranque con codigo en el PDF generado');
  } else if (minHueco > 6) {
    falla('el fixture', 'el_fixture_no_reproduce_el_caso',
          'el hueco mas chico entre el codigo y la descripcion es ' + minHueco + ' pt, y el '
        + 'caso de ICU tiene 3,5. Con un hueco grande el umbral de 6 ya alcanzaria, asi que '
        + 'este control no estaria probando nada.');
  }
  /* Y EL FIXTURE TIENE QUE TENER EL BORDE CONSTANTE, QUE ES LA ESTRUCTURA
     QUE SE ESTA PROBANDO. Con el fixture hecho desde HTML esto no se
     cumplia -Chromium fusionaba las celdas y el borde salia distinto en
     cada renglon- y la puerta gritaba contra un codigo que estaba bien. Un
     fixture que no reproduce la estructura prueba otro defecto. */
  if (minHueco !== null) {
    const bordes = cuenta, masVotado = bordeN;
    if (masVotado < 5) {
      falla('el fixture', 'el_fixture_no_tiene_un_borde_constante',
            'la descripcion tendria que arrancar en el MISMO x en todos los renglones -en la '
          + 'lista de ICU arranca en 89,9 en los 42- y en este PDF el x mas repetido lo votan '
          + 'solo ' + masVotado + ' renglones: ' + JSON.stringify(bordes) + '. Asi el control '
          + 'no esta probando la estructura que rompia.');
    }
  }

  /* ---- 4. los codigos leidos contra los que escribio el generador ---- */
  const esperados = RENGLONES.map(function (x) { return x[0]; });
  const leidos = ((r.leido && r.leido.filas) || []).map(function (x) { return x.cod; });
  const faltan = esperados.filter(function (c) { return leidos.indexOf(c) < 0; });
  const sobran = leidos.filter(function (c) { return esperados.indexOf(c) < 0; });

  faltan.forEach(function (c) {
    const pegado = leidos.filter(function (l) { return l.indexOf(c) === 0 && l !== c; });
    falla('el codigo', 'el_codigo_salio_mal',
          'el generador escribio "' + c + '" y el lector no lo devolvio'
        + (pegado.length ? ', devolvio "' + pegado[0] + '" — con la primera palabra de la '
            + 'descripcion pegada, que es el defecto del 14/11: un codigo asi NO liga con el '
            + 'articulo de Tango y el renglon se pierde' : ''));
  });
  sobran.forEach(function (c) {
    falla('el codigo', 'el_lector_invento_un_codigo',
          'el lector devolvio "' + c + '" y el generador no lo escribio');
  });

  /* ---- 5. la descripcion no puede perder su primera palabra ---- */
  ((r.leido && r.leido.filas) || []).forEach(function (f) {
    const esp = RENGLONES.filter(function (x) { return x[0] === f.cod; })[0];
    if (!esp) return;
    const primera = esp[2].split(' ')[0];
    const tiene = String(f.descripcion || '').trim();
    if (tiene.indexOf(primera) !== 0) {
      falla('la descripcion', 'la_descripcion_perdio_su_primera_palabra',
            'el renglon ' + f.cod + ' tiene que arrancar con "' + primera + '" y el lector '
          + 'devolvio "' + tiene.slice(0, 60) + '"');
    }
  });

  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}

  /* ---- el informe ---- */
  if (PLANTAR === 'sin_borde') {
    const agarro = fallas.filter(function (f) {
      return f.clase === 'el_codigo_salio_mal'
          || f.clase === 'la_descripcion_perdio_su_primera_palabra';
    }).length;
    console.log('\nARNES «sin_borde» — se sirvio un js/listas.js con el medidor del borde de la '
              + 'descripcion desactivado, que es el codigo que tenia el defecto.');
    if (agarro) {
      console.log('  OK  la puerta lo agarro: ' + agarro + ' falla(s).');
      fallas.slice(0, 4).forEach(function (f) { console.log('      · ' + f.clase + ': ' + f.que); });
      process.exit(0);
    }
    console.log('  LA PUERTA NO LO AGARRO: con el borde desactivado leyo todo bien.');
    console.log('  Una puerta que no ve el defecto plantado no es una puerta.');
    process.exit(1);
  }

  if (!fallas.length) {
    console.log('CONTROL DE LA LECTURA DE LISTAS: 0 fallas.');
    console.log('  midio: ' + esperados.length + ' renglones de un PDF armado con la geometria '
              + 'MEDIDA de la lista de ICU (la descripcion arranca en x ' + bordeFix + ' en '
              + bordeN + ' de los ' + esperados.length + ' renglones, el codigo mas ancho de '
              + 'esos termina en x ' + maxFin + ', y el hueco mas chico entre las dos columnas '
              + 'es ' + minHueco + ' pt — el de ICU es 3,5), '
              + 'leidos con el lpLeerPdf DE VERDAD de js/listas.js en un navegador: los '
              + esperados.length + ' codigos identicos a los que escribio el generador, y las '
              + esperados.length + ' descripciones con su primera palabra.');
    console.log('  NO midio: los PDF de verdad de los 8 proveedores. No estan en el '
              + 'repositorio y no van a estar.');
    process.exit(0);
  }

  console.log('CONTROL DE LA LECTURA DE LISTAS: ' + fallas.length + ' falla(s).');
  fallas.forEach(function (f) { console.log('  · ' + f.donde + ' — ' + f.clase + ': ' + f.que); });
  process.exit(1);
})().catch(function (e) {
  console.log('CONTROL DE LA LECTURA DE LISTAS: revento — ' + e.message);
  console.log('  No medido no es limpio: el push se corta.');
  process.exit(1);
});
