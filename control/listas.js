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

  /* EL ARNES. Sirve un js/listas.js roto por pg.route, SIN TOCAR EL
     REPOSITORIO, y si no encuentra donde plantar el defecto REVIENTA: un arnes
     que no planta nada da verde sin haber probado.
       sin_borde  — el medidor del borde de la descripcion apagado (el defecto
                    del 14/11: el codigo de ICU sale con la primera palabra de
                    la descripcion pegada).
       sin_bulto  — el bloque «vienen por bulto» que no se pinta (el defecto
                    del 15/11: el precio del archivo 10 a 54 veces mas chico, y
                    nadie mirandolo).                            15/11/2026 */
  const ARNESES = {
    sin_borde: ['function lpBordeDescripcion(lns, r) {',
                'function lpBordeDescripcion(lns, r) { return null; /* ARNES */',
                'el medidor del borde de la descripcion desactivado, que es el codigo '
                  + 'que tenia el defecto del 14/11'],
    sin_bulto: ['if (a.por_caja && a.por_caja.length) {',
                'if (false && a.por_caja && a.por_caja.length) { /* ARNES */',
                'el bloque «vienen por bulto» apagado, o sea el precio del archivo sin '
                  + 'que nadie lo muestre, que es el defecto del 15/11'],
    precio_texto: ['if (LP_TIPOS[i] === \'num\') return { t: \'num\', v: Number(v) };',
                '/* ARNES */',
                'el PRECIO del .xlsx viajando como TEXTO: Tango lo lee como cero o no lo lee'],
    sin_aviso_lista: ['if (res.sin_codigo_de_lista) {',
                'if (false && res.sin_codigo_de_lista) { /* ARNES */',
                'el aviso de que el archivo NO SE PUEDE SUBIR apagado, o sea un archivo sin '
                  + 'Cod. Lista saliendo sin que nadie lo diga'],
    sin_aviso_vigencia: ['if (res.vigencia_ya_vencida) {',
                'if (false && res.vigencia_ya_vencida) { /* ARNES */',
                'el aviso de la vigencia vencida apagado, o sea un archivo que entra a Tango '
                  + 'y no rige sin que nadie lo diga'],
    /* el defecto del 16/11 guardado: la seccion que se esfuma cuando no hay
       nada que mostrar, y deja a la pantalla muda. */
    secciones_se_esfuman: [
                'h.push(\'<div class="lp-sec">Los artículos que vienen por bulto</div>\');',
                'if (hayBulto) h.push(\'<div class="lp-sec">Los artículos que vienen por '
                  + 'bulto</div>\'); /* ARNES */',
                'la seccion «vienen por bulto» esfumandose cuando esta vacia, que es lo que '
                  + 'dejo la pantalla muda con ICU el 16/11'],
    /* el reclamo del 16/11 a la tarde: «a esa pantalla la podia bajar en Excel
       y PDF, donde esta». Lo que miraba era la tabla de «lo que queda afuera»,
       que con ICU leyendo bien los 42 de 42 quedo vacia. O sea que ver como se
       leyo cada codigo DEPENDIA DE QUE ALGO ESTUVIERA ROTO. */
    sin_tabla_de_lectura: [
                'h.push(\'<div class="lp-sec">Renglón por renglón, como salió del '
                  + 'archivo</div>\');',
                '/* ARNES: la tabla de la lectura, sacada */',
                'la tabla «renglón por renglón, como salió del archivo» sacada, o sea sin '
                  + 'forma de mirar como cargo cada codigo cuando no queda ninguno afuera']
  };
  /* este se planta en filas.js, no en listas.js: es el pie del paginado
     prometiendo un Excel que esa grilla no tiene.               16/11/2026 */
  if (PLANTAR === 'promete_excel') {
    await pg.route('**/js/filas.js*', function (r) {
      let cuerpo = fs.readFileSync(path.join(RAIZ, 'js', 'filas.js'), 'utf8');
      const antes = cuerpo;
      /* la defensa esta en DOS lugares —el span arranca oculto Y
         filasAvisoDeBajar lo apaga si no hay botones— asi que el defecto hay
         que plantarlo entero: sacar uno solo lo dejaba apagado igual y el
         arnes daba «no lo agarro» sin haber reproducido nada. */
      const paso1 = cuerpo.replace('<span class="fl-baj" hidden>', '<span class="fl-baj">');
      const paso2 = paso1.replace('else span.setAttribute(\'hidden\', \'\');',
                                  '/* ARNES: no se apaga */;');
      cuerpo = paso2;
      if (paso1 === antes || paso2 === paso1) {
        throw new Error('EL ARNES NO PUDO PLANTAR EL DEFECTO (promete_excel) ENTERO: '
          + 'span oculto ' + (paso1 !== antes) + ', apagado activo ' + (paso2 !== paso1)
          + '. Un arnes que no planta nada da verde sin haber probado.');
      }
      r.fulfill({ status: 200, contentType: 'application/javascript', body: cuerpo });
    });
  }
  if (ARNESES[PLANTAR]) {
    const arn = ARNESES[PLANTAR];
    await pg.route('**/js/listas.js*', function (r) {
      let cuerpo = fs.readFileSync(path.join(RAIZ, 'js', 'listas.js'), 'utf8');
      const antes = cuerpo;
      cuerpo = cuerpo.replace(arn[0], arn[1]);
      if (cuerpo === antes) {
        throw new Error('EL ARNES NO PUDO PLANTAR EL DEFECTO (' + PLANTAR + '): no '
          + 'encontro «' + arn[0] + '» en js/listas.js. Un arnes que no planta nada da '
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
    /* Y AHORA SE PINTA LA PANTALLA CON EL ARMADO.          15/11/2026
       Leer el PDF bien no alcanza: el 15/11 el archivo para Tango mandaba el
       precio de UNA unidad en 15 articulos que Tango tiene POR BULTO, 10 a 54
       veces mas chico. El bloque que lo muestra no lo pintaba ninguna puerta
       —el golpe del 10/11—, asi que aca se llama a la funcion de verdad (la
       contesta el juguete) y se pinta con lpPintar, que es el codigo que ve el
       usuario. No se puede soltar el archivo del proveedor desde un control,
       pero SI se puede pintar lo que sale de el. */
    /* SE PINTA DOS VECES: EL CASO LLENO Y EL VACIO.             16/11/2026
       El juguete contestaba siempre el caso lleno, asi que esta puerta nunca
       vio como queda la pantalla cuando una seccion esta VACIA. El 16/11 el
       usuario abrio Listas con ICU —42 de 42 entran, 0 por bulto, 0 afuera—,
       las dos secciones se esfumaron y pregunto que le habian sacado. No le
       habian sacado nada: la pantalla callaba. */
    let pintado = null, vacio = null;
    async function pintarCon(fn){
      const ar = await rpc(fn, { p_lista_id: 6, p_filas: [] });
      /* LA LECTURA TIENE QUE TRAER RENGLONES, O NO SE PUEDE MIRAR LO QUE SE
         LEYO.                                                    16/11/2026
         Esto mandaba `filas: []` y la seccion «renglón por renglón, como salió
         del archivo» decia «Ninguno» CON RAZON: el control exigia una tabla
         que el no le habia dado con que llenar, y me hizo buscar media hora un
         defecto en la pantalla que estaba en el control.
         Los renglones se arman con los que el armado DEVOLVIO: los que entran
         (a.filas, donde el Sinonimo es el codigo del laboratorio) mas los que
         quedan afuera (a.avisos). Esa union es, exactamente, todo lo que se
         leyo — y ademas deja probar la columna «¿Entra al archivo?», que
         distingue unos de otros. */
      var ENT = (ar.data.filas || []).map(function (f) {
        return { cod_proveedor: f[3], descripcion: f[1],
                 precio_lista: Number(f[8]), moneda: f[6], unidades_caja: null };
      });
      var FUE = (ar.data.avisos || []).map(function (x) {
        return { cod_proveedor: x.cod_proveedor, descripcion: x.descripcion,
                 precio_lista: x.precio_lista, moneda: null, unidades_caja: null };
      });
      LP_LEIDO = { ok: true, filas: ENT.concat(FUE),
                   lectura: { filas_leidas: ENT.length + FUE.length,
                              con_precio: ar.data.resumen.leidas,
                              con_unidades_caja: ar.data.resumen.por_caja_que_entran,
                              paginas: 1, ms: 1 },
                   avisos: [] };
      LP_ARMADO = ar.data; LP_ARMADO._ms = ar.ms || 1;
      lpPintar();
      /* filas.js y bajar.js pintan con MutationObserver, o sea SIEMPRE un poco
         despues que la tabla (150 ms de calma). Relevar sin esperarlos daba
         «sin_paginado» y el control se declaraba no ejercitado — el golpe del
         14/11, cuando los botones se buscaban antes de que existieran. */
      function seccion(re){
        return Array.prototype.slice.call(document.querySelectorAll('.lp-sec'))
          .filter(function (s) { return re.test(s.textContent || ''); })[0];
      }
      function tablaDeSec(s){
        var n = s ? s.nextElementSibling : null;
        while (n && !/lp-sec$/.test(n.className || '')){
          if (/lp-wrap/.test(n.className || '')) return n.querySelector('table.lp-tb');
          n = n.nextElementSibling;
        }
        return null;
      }
      function barraDe(g){
        var env = g && g.parentElement && /lp-wrap/.test(g.parentElement.className || '')
                  ? g.parentElement : g;
        var sig = env ? env.nextElementSibling : null;
        return (sig && /fl-barra/.test(sig.className || '')) ? sig : null;
      }
      /* SE ESPERA A LAS DOS COSAS, NO A UNA.                     16/11/2026
         filas.js (el paginado) y bajar.js (los botones de Excel y PDF) corren
         los dos con MutationObserver y NO hay orden garantizado entre ellos.
         Esperar solo al paginado y medir ahi mismo es el tropiezo del 14/11 y
         del 16/11, las dos veces el mismo: el control relevaba antes de que
         terminara de pintar y cantaba que faltaba algo que si estaba. */
      for (let w = 0; w < 60; w++){
        var listoPag = !!barraDe(tablaDeSec(seccion(/archivo para Tango/i)));
        var gLec = tablaDeSec(seccion(/como salió del archivo/i));
        var envLec = gLec && gLec.closest('.lp-wrap');
        var listoBaj = !gLec ||
          !!(envLec && envLec.previousElementSibling &&
             /bajar-barra/.test(envLec.previousElementSibling.className || ''));
        if (listoPag && listoBaj) break;
        await new Promise(function (ok){ setTimeout(ok, 50); });
      }
      const sec = Array.prototype.slice.call(document.querySelectorAll('.lp-sec'))
        .filter(function (s) { return /vienen por bulto/i.test(s.textContent || ''); })[0];
      /* LA TABLA DE ESA SECCION, NO LA PRIMERA DEL CONTENEDOR.  16/11/2026
         Era `sec.parentElement.querySelector(...)`, que devuelve la primera de
         TODA la pantalla. En el caso lleno coincidia —la de por bulto va
         primera— y en el vacio agarraba la del archivo y contaba sus 504
         celdas como si fueran del bloque de bultos. Lo encontro esta misma
         puerta al correr el caso vacio por primera vez. Se camina a los
         hermanos siguientes y se corta en la proxima seccion. */
      function tablaDe(s){
        var n = s ? s.nextElementSibling : null;
        while (n && !/lp-sec$/.test(n.className || '')){
          if (/lp-wrap/.test(n.className || '')) return n.querySelector('table.lp-tb');
          n = n.nextElementSibling;
        }
        return null;
      }
      const tb = tablaDe(sec);
      const secAf = Array.prototype.slice.call(document.querySelectorAll('.lp-sec'))
        .filter(function (s) { return /queda afuera/i.test(s.textContent || ''); })[0];
      return {
        hay_bloque: !!sec,
        hay_bloque_afuera: !!secAf,
        pie_afuera: secAf ? (secAf.nextElementSibling ? secAf.nextElementSibling.textContent : '') : '',
        pie: sec ? (sec.nextElementSibling ? sec.nextElementSibling.textContent : '') : '',
        avisos: [].map.call(document.querySelectorAll('.lp-aviso li'),
                            function (l) { return (l.textContent || '').trim(); }),
        fechas: ['lpDesde', 'lpHasta'].map(function (id) {
          const el = document.getElementById(id);
          const lb = document.querySelector('label[for="' + id + '"]');
          return { id: id, existe: !!el, tipo: el ? el.getAttribute('type') : null,
                   rotulo: lb ? (lb.textContent || '').trim() : '' };
        }),
        encabezados: tb ? Array.prototype.map.call(tb.querySelectorAll('thead th'),
                        function (t) { return (t.textContent || '').trim(); }) : [],
        celdas: tb ? Array.prototype.map.call(tb.querySelectorAll('tbody td'),
                        function (t) { return (t.textContent || '').trim(); }) : [],
        renglones: tb ? tb.querySelectorAll('tbody tr').length : 0,
        /* la grilla del archivo se busca por SU SECCION, no por data-bajar:
           bajar.js le pone ese atributo a toda tabla que equipa, asi que el
           selector agarraba tambien la de bultos y la de afuera y sumaba 44
           renglones donde el armado trae 40.                     16/11/2026 */
        filas_del_archivo: (function(){
          var g = tablaDeSec(seccion(/archivo para Tango/i));
          return g ? g.querySelectorAll('tbody tr').length : 0;
        })(),
        /* EL PIE DE LA GRILLA DEL ARCHIVO NO PUEDE PROMETER UN EXCEL QUE AHI
           NO ESTA. Esa grilla lleva data-bajar="1" desde el 27/10 para que el
           bajador generico no le ponga su barra, y el paginado igual escribia
           «el Excel y el PDF bajan las N». El usuario los busco y no estaban.
           pantallas.js no puede ver este caso: para que esa grilla exista hay
           que soltar un archivo.                                 16/11/2026 */
        archivo_promete_excel: (function(){
          var g = tablaDeSec(seccion(/archivo para Tango/i));
          if (!g) return 'sin_grilla';
          var sig = barraDe(g);
          if (!sig) return 'sin_paginado';
          var s = sig.querySelector('.fl-baj');
          if (!s) return 'sin_aviso';
          return s.hasAttribute('hidden') ? 'apagado' : 'PROMETE';
        })(),
        /* LA TABLA DE «RENGLON POR RENGLON, COMO SALIO DEL ARCHIVO».16/11/2026
           Tiene que estar SIEMPRE que se haya leido algo —entre o no entre el
           renglon— y tiene que traer sus botones de Excel y PDF. El usuario
           miraba esto para ver como se habia leido cada codigo, y la unica
           forma que tenia era la tabla de «lo que queda afuera»: o sea que
           dependia de que algo estuviera roto. Se mide que esta, cuantos
           renglones trae y si tiene la barra de bajar. */
        lectura_tabla: (function(){
          var s = seccion(/como salió del archivo/i);
          if (!s) return { hay: false };
          var g = tablaDeSec(s);
          var env = g ? (g.closest('.lp-wrap') || g) : null;
          var ant = env ? env.previousElementSibling : null;
          return { hay: true,
                   hay_tabla: !!g,
                   /* QUE VIO, no solo si paso o no: un control que dice «no
                      esta» sin decir que encontro manda a buscar a ciegas.
                      Me paso con esta misma comprobacion hoy. */
                   visto: { envoltorio: env ? (env.className || env.tagName) : null,
                            anterior: ant ? (ant.className || ant.tagName) : null },
                   renglones: g ? g.querySelectorAll('tbody tr').length : 0,
                   encabezados: g ? Array.prototype.map.call(g.querySelectorAll('thead th'),
                                   function(t){ return (t.textContent||'').trim(); }) : [],
                   tiene_botones: !!(ant && /bajar-barra/.test(ant.className || '')),
                   pie: s.nextElementSibling ? (s.nextElementSibling.textContent||'').trim() : '' };
        })(),
        esperado: { renglones: (LP_ARMADO.por_caja || []).length,
                    filas: (LP_ARMADO.filas || []).length,
                    leidas: (LP_LEIDO && LP_LEIDO.filas ? LP_LEIDO.filas.length : 0),
                    corregidos: LP_ARMADO.resumen.corregidos_por_bulto,
                    sin_control: LP_ARMADO.resumen.por_bulto_sin_control,
                    afuera: (LP_ARMADO.avisos || []).length }
      };
    }
    try { pintado = await pintarCon('api_listas_armar_v2'); }
    catch (e) { pintado = { error: String(e && e.message || e).slice(0, 200) }; }
    try { vacio = await pintarCon('api_listas_armar_v2_vacia'); }
    catch (e) { vacio = { error: String(e && e.message || e).slice(0, 200) }; }
    /* se vuelve a dejar el caso lleno pintado, que es sobre el que se arma el
       .xlsx mas abajo */
    try { pintado = await pintarCon('api_listas_armar_v2'); }
    catch (e) { pintado = { error: String(e && e.message || e).slice(0, 200) }; }

    /* EL ARCHIVO QUE SE SUBE A TANGO, ARMADO DE VERDAD.      15/11/2026
       El usuario pregunto "que salga bien para poder subirlas". Esa pregunta
       no la contestaba nadie: la puerta 12 abre los 16 Excel del panel con
       openpyxl, pero el de Listas no, porque para que exista hay que soltar el
       PDF del proveedor y un control no puede soltar un archivo. Aca se aprieta
       el boton de verdad —el mismo lpBajarTango— con bajarArchivo interceptado,
       y los bytes se devuelven para abrirlos con openpyxl afuera. */
    let archivo = null;
    try {
      const guardar = window.bajarArchivo;
      let cap = null;
      window.bajarArchivo = function (bytes, mime, nombre) { cap = { bytes, mime, nombre }; };
      await lpBajarTango();
      for (let i = 0; i < 100 && !cap; i++) await new Promise(function (r){ setTimeout(r, 50); });
      window.bajarArchivo = guardar;
      if (!cap) throw new Error('el boton no entrego ningun archivo');
      const u = new Uint8Array(cap.bytes);
      let s = '';
      for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
      archivo = { nombre: cap.nombre, mime: cap.mime, bytes: u.length, b64: btoa(s),
                  aviso: (document.getElementById('lpBajado') || {}).textContent || '',
                  cuit: (LP_ARMADO.lista || {}).cuit || '',
                  encabezado: LP_ARMADO.encabezado || [],
                  filas: LP_ARMADO.filas || [] };
    } catch (e) { archivo = { error: String(e && e.message || e).slice(0, 200) }; }

    return { leido: leido, huecos: huecos, pintado: pintado, vacio: vacio, archivo: archivo };
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

  /* ---- 6. el bloque "vienen por bulto", PINTADO ---- 15/11/2026 ----
     El defecto del 15/11 vivia en el precio que va al archivo, no en la
     lectura. Este tramo exige que la pantalla lo pinte de verdad, con numeros
     y no con `undefined`: si alguien le cambia el nombre a una clave del
     resumen o del detalle, la pantalla escribe "undefined" y hoy nadie lo ve. */
  const P = r.pintado || {};
  if (P.error) {
    falla('el bloque por bulto', 'no_se_pudo_pintar', P.error);
  } else if (!P.hay_bloque) {
    falla('el bloque por bulto', 'la_pantalla_no_pinto_el_bloque',
          'el armado trae ' + (P.esperado && P.esperado.renglones) + ' articulos por bulto y la '
        + 'pantalla no mostro la seccion: el control del 15/11 NO SE EJERCITO');
  } else {
    if (P.renglones !== P.esperado.renglones) {
      falla('el bloque por bulto', 'faltan_renglones',
            'el armado trae ' + P.esperado.renglones + ' y la pantalla pinto ' + P.renglones);
    }
    if (P.filas_del_archivo !== P.esperado.filas) {
      falla('el archivo para Tango', 'faltan_renglones',
            'el armado trae ' + P.esperado.filas + ' renglones y la grilla del archivo pinto '
          + P.filas_del_archivo);
    }
    const sucias = (P.celdas || []).filter(function (c) {
      return /undefined|NaN|\[object/.test(c);
    });
    if (sucias.length) {
      falla('el bloque por bulto', 'la_pantalla_pinto_undefined',
            sucias.length + ' celda(s) con undefined/NaN: ' + sucias.slice(0, 4).join(' · '));
    }
    ['Precio que viaja', 'Ya en Tango', 'razón'].forEach(function (t) {
      if ((P.encabezados || []).indexOf(t) < 0) {
        falla('el bloque por bulto', 'falta_una_columna',
              'falta la columna "' + t + '", que es CONTRA QUE se decidio el precio');
      }
    });
    if (!/no hay con qué decidir|SIN CONTROLAR|no tiene.*cargado/i.test(P.pie || '')
        && P.esperado.sin_control > 0) {
      falla('el bloque por bulto', 'no_declara_lo_que_no_controla',
            'hay ' + P.esperado.sin_control + ' articulo(s) sin precio previo en Tango y el pie '
          + 'de la seccion no lo declara: "' + String(P.pie || '').slice(0, 120) + '"');
    }
  }

  /* ---- EL CASO VACIO: LAS SECCIONES NO SE PUEDEN ESFUMAR ---- 16/11/2026
     Con ICU entran los 42 de 42: 0 por bulto y 0 afuera. Antes las dos
     secciones desaparecian y la pantalla quedaba muda — el usuario pregunto
     que le habian sacado, y no le habian sacado nada. Ahora tienen que estar
     IGUAL y decir «ninguno» con el motivo. */
  const V = r.vacio || {};
  if (V.error) {
    falla('la lista vacia', 'no_se_pudo_pintar', V.error);
  } else {
    if ((V.esperado || {}).renglones !== 0 || (V.esperado || {}).afuera !== 0) {
      falla('la lista vacia', 'el_juguete_no_contesta_el_caso_vacio',
            'api_listas_armar_v2_vacia tiene que traer 0 por bulto y 0 afuera, y trajo '
          + JSON.stringify(V.esperado) + '. ESE CONTROL NO SE EJERCITO.');
    }
    if (!V.hay_bloque) {
      falla('la lista vacia', 'la_seccion_por_bulto_se_esfumo',
            'con 0 artículos por bulto la sección desaparece, y una sección que desaparece '
          + 'se lee como que falta algo: tiene que estar y decir «ninguno»');
    } else if (!/[Nn]inguno/.test(V.pie || '')) {
      falla('la lista vacia', 'la_seccion_por_bulto_no_dice_ninguno',
            'la sección está pero no declara que no hay: "' + String(V.pie || '').slice(0, 110) + '"');
    }
    if (!V.hay_bloque_afuera) {
      falla('la lista vacia', 'la_seccion_de_afuera_se_esfumo',
            'con 0 renglones afuera la sección desaparece, y eso se lee como que falta algo');
    } else if (!/[Nn]inguno/.test(V.pie_afuera || '')) {
      falla('la lista vacia', 'la_seccion_de_afuera_no_dice_ninguno',
            'la sección está pero no declara que no hay: '
          + '"' + String(V.pie_afuera || '').slice(0, 110) + '"');
    }
    if ((V.celdas || []).length) {
      falla('la lista vacia', 'pinto_renglones_que_no_existen',
            'con 0 artículos por bulto la tabla no tiene que tener ni una celda, y tiene '
          + V.celdas.length);
    }
  }

  /* LA TABLA DE «COMO SALIO DEL ARCHIVO», EN LOS DOS CASOS.      16/11/2026
     Es la que el usuario usaba para ver como se habia leido cada codigo. Hasta
     hoy la unica forma de verlo era la tabla de «lo que queda afuera», o sea
     que DEPENDIA DE QUE ALGO ESTUVIERA ROTO: con ICU leyendo bien los 42 de 42,
     no quedaba ninguno afuera, la tabla desaparecia y los botones con ella.
     Se exige en el caso lleno Y en el de ICU, porque el defecto de hoy fue
     justamente que algo estuviera solo cuando hay datos. */
  [['el caso lleno', P], ['la lista vacia', V]].forEach(function (par) {
    var donde = par[0], X = par[1];
    if (!X || X.error) return;                       /* ya se canto arriba */
    var T = X.lectura_tabla;
    if (!T || !T.hay) {
      falla(donde, 'la_tabla_de_la_lectura_no_esta',
            'falta la sección «Renglón por renglón, como salió del archivo». Sin eso no '
          + 'hay forma de ver cómo se leyó cada código si no queda ninguno afuera.');
      return;
    }
    var esperadas = (X.esperado && X.esperado.leidas) || 0;
    if (esperadas && T.renglones !== esperadas) {
      falla(donde, 'la_tabla_de_la_lectura_no_trae_todo',
            'se leyeron ' + esperadas + ' renglones y la tabla muestra ' + T.renglones);
    }
    if (!T.tiene_botones) {
      falla(donde, 'la_tabla_de_la_lectura_no_se_puede_bajar',
            'la tabla está pero no tiene su barra de Excel y PDF. Mirar sin poder bajarlo '
          + 'es la mitad de lo que el usuario necesita. Lo que vi: envoltorio «'
          + String(T.visto && T.visto.envoltorio) + '», hermano anterior «'
          + String(T.visto && T.visto.anterior) + '», tabla ' + (T.hay_tabla ? 'sí' : 'NO')
          + ', ' + T.renglones + ' renglones.');
    }
  });

  /* el pie de la grilla del archivo para Tango           16/11/2026 */
  if (P.archivo_promete_excel === 'PROMETE') {
    falla('el pie del archivo', 'el_pie_promete_un_excel_que_no_esta',
          'la grilla «El archivo para Tango» dice «el Excel y el PDF bajan las N» y no tiene '
        + 'esos botones: lleva data-bajar="1" a proposito');
  } else if (P.archivo_promete_excel !== 'apagado') {
    falla('el pie del archivo', 'no_se_pudo_mirar_el_pie',
          'se esperaba el paginado de la grilla del archivo y dio: '
        + String(P.archivo_promete_excel) + '. ESE CONTROL NO SE EJERCITO.');
  }

  /* el aviso de que el archivo NO SE PUEDE SUBIR.           15/11/2026
     `sin_codigo_de_lista` lo medía la base y la pantalla no lo leía en ningún
     lado. El juguete lo manda en true a proposito para que esto se ejercite. */
  const avisos = (P.avisos || []).join(' || ');
  if (!/NO SE PUEDE SUBIR/.test(avisos)) {
    falla('el aviso del codigo de lista', 'no_avisa_que_el_archivo_no_se_puede_subir',
          'el armado dice sin_codigo_de_lista y la pantalla no lo nombra. Los avisos que '
        + 'pinto: ' + (avisos ? avisos.slice(0, 200) : '(ninguno)'));
  }
  /* LA VIGENCIA VENCIDA. Medido el 15/11: las 14 listas salian con la ventana
     cerrada, y el archivo entra a Tango sin regir. El juguete la manda vencida
     a proposito para que esto se ejercite.                     15/11/2026 */
  if (!/YA VENCI/i.test(avisos)) {
    falla('el aviso de la vigencia', 'no_avisa_que_la_vigencia_vencio',
          'el armado dice vigencia_ya_vencida y la pantalla no lo nombra. Los avisos que '
        + 'pinto: ' + (avisos ? avisos.slice(0, 200) : '(ninguno)'));
  }
  /* y los dos campos de fecha tienen que ESTAR y tener rotulo: sin ellos la
     fecha vuelve a depender de una configuracion que nadie mueve. */
  (P.fechas || []).forEach(function (f) {
    if (!f.existe) {
      falla('los campos de vigencia', 'falta_el_campo_de_fecha',
            'no esta el campo ' + f.id + ', asi que la vigencia la vuelve a poner la '
          + 'configuracion y nadie la puede corregir');
    } else if (f.tipo !== 'date') {
      falla('los campos de vigencia', 'el_campo_de_fecha_no_es_una_fecha',
            f.id + ' es type="' + f.tipo + '"');
    } else if (!f.rotulo) {
      falla('los campos de vigencia', 'el_campo_de_fecha_no_tiene_rotulo', f.id);
    }
  });
  if (/&lt;|<b>|&amp;/.test(avisos)) {
    falla('el aviso del codigo de lista', 'el_aviso_pinto_html_escrito',
          'los avisos se pintan con esc(), asi que una etiqueta HTML sale escrita tal cual: '
        + avisos.slice(0, 160));
  }
  /* ---- 7. el archivo que se sube a Tango, abierto con openpyxl ---- */
  const A = r.archivo || {};
  let queDijoElArchivo = 'el .xlsx para Tango NO SE ARMO, asi que ESE CONTROL NO SE EJERCITO';
  if (A.error) {
    falla('el archivo para Tango', 'no_se_pudo_armar', A.error);
  } else if (!A.b64) {
    falla('el archivo para Tango', 'el_boton_no_entrego_nada',
          'se apreto el boton de bajar y no salio ningun archivo');
  } else {
    const entrada = JSON.stringify({ b64: A.b64, nombre: A.nombre, cuit: A.cuit,
                                     encabezado: A.encabezado, filas: A.filas });
    const py = require('child_process').spawnSync(
      'python3', [path.join(__dirname, 'listas-archivo.py')],
      { input: entrada, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    let res = null;
    try { res = JSON.parse((py.stdout || '').trim()); } catch (e) {}
    if (!res) {
      falla('el archivo para Tango', 'no_se_pudo_revisar',
            'el revisor no contesto: ' + String((py.stderr || py.stdout || '')).slice(0, 200));
    } else {
      (res.fallas || []).forEach(function (f) {
        falla('el archivo para Tango', f.clase, f.que);
      });
      const m = res.midio || {};
      queDijoElArchivo = 'el .xlsx para Tango armado apretando el boton de verdad y ABIERTO con '
        + 'openpyxl: ' + m.bytes + ' bytes, ' + m.hojas + ' hoja, el CUIT «' + m.a1 + '» en A1, '
        + m.titulos + ' titulos en la fila 2, ' + m.renglones + ' de ' + A.filas.length
        + ' renglones desde la fila 3, y los ' + A.filas.length + ' precios de la columna I '
        + 'numericos e identicos al armado';
      if (!A.nombre || !/\.xlsx$/.test(A.nombre)) {
        falla('el archivo para Tango', 'el_nombre_no_termina_en_xlsx', String(A.nombre));
      }
    }
  }

  const quePintoElBulto = P.hay_bloque
    ? 'el bloque «vienen por bulto» PINTADO de verdad con lpPintar: ' + P.renglones
      + ' de ' + P.esperado.renglones + ' renglones, ' + P.esperado.corregidos
      + ' con el precio corregido al del bulto y ' + P.esperado.sin_control
      + ' declarado(s) sin control, las tres columnas del control presentes, '
      + P.filas_del_archivo + ' de ' + P.esperado.filas + ' renglones en la grilla del '
      + 'archivo y 0 celdas con undefined, mas los dos avisos que importan antes de subir '
      + '—que el archivo NO SE PUEDE SUBIR sin lista en Tango, y que la vigencia YA VENCIO— '
      + 'y los dos campos de fecha con su rotulo. Y EL CASO VACIO, el de ICU: con 0 por '
      + 'bulto y 0 afuera las DOS secciones siguen estando y dicen «ninguno» con el motivo, '
      + 'y la tabla de bultos no pinta una sola celda'
    : 'el bloque «vienen por bulto» NO SE PINTO, asi que ESE CONTROL NO SE EJERCITO';

  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}

  /* ---- el informe ---- */
  if (ARNESES[PLANTAR] || PLANTAR === 'promete_excel') {
    /* cada arnes exige SU clase de falla, no una cualquiera: si el de sin_bulto
       pasara porque se rompio la lectura, estaria dando verde por el motivo
       equivocado. */
    const ESPERA = {
      promete_excel: ['el_pie_promete_un_excel_que_no_esta'],
      sin_borde: ['el_codigo_salio_mal', 'la_descripcion_perdio_su_primera_palabra'],
      /* desde el 16/11 esa linea ya no envuelve la SECCION, solo su tabla: el
         defecto plantado es que la tabla no se pinta, y eso suena como
         faltan_renglones. La seccion ausente la planta secciones_se_esfuman. */
      sin_bulto: ['faltan_renglones', 'la_pantalla_no_pinto_el_bloque'],
      precio_texto: ['el_precio_viaja_como_texto'],
      sin_aviso_lista: ['no_avisa_que_el_archivo_no_se_puede_subir'],
      sin_aviso_vigencia: ['no_avisa_que_la_vigencia_vencio'],
      secciones_se_esfuman: ['la_seccion_por_bulto_se_esfumo',
                             'la_seccion_de_afuera_se_esfumo'],
      sin_tabla_de_lectura: ['la_tabla_de_la_lectura_no_esta']
    }[PLANTAR];
    const agarro = fallas.filter(function (f) { return ESPERA.indexOf(f.clase) >= 0; });
    console.log('\nARNES «' + PLANTAR + '» — se sirvio un '
              + (ARNESES[PLANTAR] ? 'js/listas.js con ' + ARNESES[PLANTAR][2]
                                  : 'js/filas.js con el aviso «el Excel y el PDF bajan las N» '
                                  + 'escrito siempre, con botones o sin ellos') + '.');
    if (agarro.length) {
      console.log('  OK  la puerta lo agarro: ' + agarro.length + ' falla(s) de la clase que '
                + 'corresponde (' + ESPERA.join(' o ') + ').');
      agarro.slice(0, 4).forEach(function (f) { console.log('      · ' + f.clase + ': ' + f.que); });
      process.exit(0);
    }
    console.log('  LA PUERTA NO LO AGARRO: con el defecto plantado no sono ' + ESPERA.join(' ni ')
              + '. Las fallas que si hubo: '
              + (fallas.length ? fallas.map(function (f) { return f.clase; }).join(' · ') : 'ninguna'));
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
              + esperados.length + ' descripciones con su primera palabra. Y '
              + quePintoElBulto + '. Y ' + queDijoElArchivo + '.'
              + (function(){
                  /* LA TABLA DE LA LECTURA, DECLARADA EN LOS DOS CASOS.  16/11
                     Un control que pasa sin decir que miro es media medicion. */
                  var t1 = P && P.lectura_tabla, t2 = V && V.lectura_tabla;
                  if (!t1 && !t2) return ' Y la tabla «renglón por renglón, como salió del '
                    + 'archivo» NO SE PUDO MIRAR en ninguno de los dos casos: eso no es un pase.';
                  return ' Y la tabla «renglón por renglón, como salió del archivo», que es la '
                    + 'unica forma de ver como se leyo cada codigo cuando no queda ninguno '
                    + 'afuera: en el caso lleno ' + (t1 && t1.hay ? t1.renglones + ' renglones y '
                    + (t1.tiene_botones ? 'con' : 'SIN') + ' sus botones de Excel y PDF' : 'NO ESTA')
                    + ', y en el de ICU ' + (t2 && t2.hay ? t2.renglones + ' renglones y '
                    + (t2.tiene_botones ? 'con' : 'SIN') + ' sus botones' : 'NO ESTA') + '.';
                })());
    console.log('  NO midio: los PDF de verdad de los 8 proveedores. No estan en el '
              + 'repositorio y no van a estar. Tampoco el clic de soltar el archivo: eso '
              + 'necesita la pantalla del usuario.');
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
