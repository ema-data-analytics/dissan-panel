/* ===================================================================
   ARMAR UN .xlsx Y UN .pdf SIN NINGUNA BIBLIOTECA         23/10/2026
   -------------------------------------------------------------------
   POR QUE A MANO Y NO CON SheetJS / jsPDF.

   Dos razones, y la segunda es la que manda:

   1. El panel es una pagina publica que muestra los margenes de la
      empresa. Cada script de terceros que se le cuelga es una pieza
      mas que puede caerse o cambiar debajo de los pies.

   2. NO PUEDO PROBAR LO QUE NO PUEDO CORRER. El contenedor donde
      trabajo no llega a cdnjs, asi que una biblioteca traida de un CDN
      se subiria SIN haberla ejecutado una sola vez. La regla del
      proyecto es que no se entrega nada sin verlo funcionar. Escrito
      a mano, el archivo se arma, se baja y se ABRE en el control
      local, renglon por renglon, antes de subir.

   Lo que hay aca:
     bajarZip(archivos)   -> Uint8Array con un ZIP valido (deflate-raw
                             nativo del navegador, STORED si no esta)
     bajarXlsx(hoja)      -> Uint8Array con un libro de Excel
     bajarPdf(doc)        -> Uint8Array con un PDF apaisado

   LAS DOS TRAMPAS QUE ESTE ARCHIVO TIENE QUE RESPETAR:
     - Un numero guardado como TEXTO no se suma en Excel. Ya paso en
       este proyecto con `ultima_venta`. Por eso cada celda declara su
       tipo y los numeros van como numeros.
     - Las fechas de Excel son un SERIAL desde el 31/12/1899, y Excel
       arrastra el error del 29/02/1900 que no existio. Por eso el
       serial se calcula con esa base y no con una resta ingenua.
   =================================================================== */

/* ---------- CRC32, que el ZIP exige por archivo ---------- */
var BAJAR_CRC_TABLA = (function(){
  var t = new Uint32Array(256);
  for (var n = 0; n < 256; n++){
    var c = n;
    for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function bajarCrc32(bytes){
  var c = 0xFFFFFFFF;
  for (var i = 0; i < bytes.length; i++)
    c = BAJAR_CRC_TABLA[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function bajarUtf8(s){ return new TextEncoder().encode(s); }

/* deflate-raw nativo. Si el navegador no lo tiene, el archivo va sin
   comprimir: mas grande, pero valido. Nunca se cae por esto. */
function bajarDeflate(bytes){
  if (typeof CompressionStream === 'undefined') return Promise.resolve(null);
  try {
    var cs = new CompressionStream('deflate-raw');
    return new Response(new Blob([bytes]).stream().pipeThrough(cs)).arrayBuffer()
      .then(function(ab){ return new Uint8Array(ab); })
      .catch(function(){ return null; });
  } catch (e) { return Promise.resolve(null); }
}

/* ---------- el ZIP ---------- */
function bajarZip(archivos){
  var trabajos = archivos.map(function(a){
    var crudo = (a.datos instanceof Uint8Array) ? a.datos : bajarUtf8(a.datos);
    return bajarDeflate(crudo).then(function(comp){
      var usa = (comp && comp.length < crudo.length) ? comp : null;
      return { nombre: a.nombre, crudo: crudo, cuerpo: usa || crudo,
               metodo: usa ? 8 : 0, crc: bajarCrc32(crudo) };
    });
  });

  return Promise.all(trabajos).then(function(fs){
    var partes = [], central = [], off = 0;

    function u16(n){ return [n & 0xFF, (n >>> 8) & 0xFF]; }
    function u32(n){ return [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF]; }

    fs.forEach(function(f){
      var nom = bajarUtf8(f.nombre);
      var loc = [].concat([0x50,0x4B,0x03,0x04], u16(20), u16(0x0800), u16(f.metodo),
                          u16(0), u16(0), u32(f.crc), u32(f.cuerpo.length),
                          u32(f.crudo.length), u16(nom.length), u16(0));
      partes.push(new Uint8Array(loc), nom, f.cuerpo);
      central.push({ f: f, nom: nom, off: off });
      off += loc.length + nom.length + f.cuerpo.length;
    });

    var inicioCentral = off, largoCentral = 0;
    central.forEach(function(c){
      var cab = [].concat([0x50,0x4B,0x01,0x02], u16(20), u16(20), u16(0x0800),
                          u16(c.f.metodo), u16(0), u16(0), u32(c.f.crc),
                          u32(c.f.cuerpo.length), u32(c.f.crudo.length),
                          u16(c.nom.length), u16(0), u16(0), u16(0), u16(0),
                          u32(0), u32(c.off));
      partes.push(new Uint8Array(cab), c.nom);
      largoCentral += cab.length + c.nom.length;
    });

    var fin = [].concat([0x50,0x4B,0x05,0x06], u16(0), u16(0),
                        u16(central.length), u16(central.length),
                        u32(largoCentral), u32(inicioCentral), u16(0));
    partes.push(new Uint8Array(fin));

    var total = partes.reduce(function(a, p){ return a + p.length; }, 0);
    var salida = new Uint8Array(total), p = 0;
    partes.forEach(function(x){ salida.set(x, p); p += x.length; });
    return salida;
  });
}

/* ---------- el .xlsx ----------
   hoja = { nombre, encabezados:[...], filas:[[celda,...]], formatos:[...],
            anchos:[...], titulo:[lineas de arriba] }
   celda = { v, t } con t en 'num' | 'fecha' | 'texto' | 'vacio'        */
function bajarXmlEsc(s){
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    /* los caracteres de control rompen el XML y Excel se niega a abrir */
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/* El serial de Excel: dias desde el 31/12/1899, con el salteo del bug
   del 29/02/1900 (Excel cree que existio; antes de esa fecha hay que
   restar uno). */
function bajarSerialFecha(d){
  var utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  var base = Date.UTC(1899, 11, 30);
  return Math.round((utc - base) / 86400000);
}

function bajarCol(n){                /* 0 -> A, 26 -> AA */
  var s = '';
  n += 1;
  while (n > 0){ var r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26; }
  return s;
}

function bajarXlsx(hoja){
  /* Los formatos que se usan, en el orden en que se declaran abajo.
     El 0 es el General de Excel; los nuestros empiezan en 164. */
  var FMT = ['#,##0.00', '#,##0', '0.0"%"', 'dd/mm/yyyy'];
  var IDX = { num:1, ent:2, pct:3, fecha:4, texto:0, titulo:5, enc:6 };

  var numFmts = FMT.map(function(f, i){
    return '<numFmt numFmtId="' + (164 + i) + '" formatCode="' + bajarXmlEsc(f) + '"/>';
  }).join('');

  var estilos =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="' + FMT.length + '">' + numFmts + '</numFmts>' +
    '<fonts count="3">' +
      '<font><sz val="11"/><name val="Calibri"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
      '<font><b/><sz val="12"/><color rgb="FF123252"/><name val="Calibri"/></font>' +
    '</fonts>' +
    '<fills count="3">' +
      '<fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF123252"/>' +
      '<bgColor indexed="64"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="7">' +
      '<xf numFmtId="0"   fontId="0" fillId="0" borderId="0" xfId="0"/>' +            /* 0 texto  */
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
      '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
      '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
      '<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
      '<xf numFmtId="0"   fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' + /* 5 titulo */
      '<xf numFmtId="0"   fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" ' +
          'applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';

  var filas = [], nf = 1;

  (hoja.titulo || []).forEach(function(t){
    filas.push('<row r="' + nf + '"><c r="A' + nf + '" s="' + IDX.titulo +
               '" t="inlineStr"><is><t xml:space="preserve">' + bajarXmlEsc(t) +
               '</t></is></c></row>');
    nf++;
  });
  if ((hoja.titulo || []).length) nf++;          /* un renglon en blanco */

  var filaEnc = nf;
  var celdasEnc = hoja.encabezados.map(function(e, i){
    return '<c r="' + bajarCol(i) + nf + '" s="' + IDX.enc + '" t="inlineStr">' +
           '<is><t xml:space="preserve">' + bajarXmlEsc(e) + '</t></is></c>';
  }).join('');
  filas.push('<row r="' + nf + '" ht="22" customHeight="1">' + celdasEnc + '</row>');
  nf++;

  hoja.filas.forEach(function(f){
    var cs = '';
    for (var i = 0; i < hoja.encabezados.length; i++){
      var cel = f[i];
      if (!cel || cel.t === 'vacio' || cel.v === null || cel.v === undefined || cel.v === '')
        continue;
      var ref = bajarCol(i) + nf;
      if (cel.t === 'num'){
        var fmt = hoja.formatos[i] === 'pct' ? IDX.pct
                : (hoja.formatos[i] === 'ent' ? IDX.ent : IDX.num);
        cs += '<c r="' + ref + '" s="' + fmt + '"><v>' + cel.v + '</v></c>';
      } else if (cel.t === 'fecha'){
        cs += '<c r="' + ref + '" s="' + IDX.fecha + '"><v>' +
              bajarSerialFecha(cel.v) + '</v></c>';
      } else {
        cs += '<c r="' + ref + '" s="' + IDX.texto + '" t="inlineStr">' +
              '<is><t xml:space="preserve">' + bajarXmlEsc(cel.v) + '</t></is></c>';
      }
    }
    filas.push('<row r="' + nf + '">' + cs + '</row>');
    nf++;
  });

  var ultima = bajarCol(hoja.encabezados.length - 1);
  var cols = '<cols>' + (hoja.anchos || []).map(function(a, i){
    return '<col min="' + (i+1) + '" max="' + (i+1) + '" width="' + a + '" customWidth="1"/>';
  }).join('') + '</cols>';

  var sheet =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0" tabSelected="1">' +
      '<pane ySplit="' + filaEnc + '" topLeftCell="A' + (filaEnc + 1) +
      '" activePane="bottomLeft" state="frozen"/>' +
    '</sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    ((hoja.anchos || []).length ? cols : '') +
    '<sheetData>' + filas.join('') + '</sheetData>' +
    '<autoFilter ref="A' + filaEnc + ':' + ultima + (nf - 1) + '"/>' +
    '</worksheet>';

  var nombreHoja = bajarXmlEsc(String(hoja.nombre || 'Detalle').slice(0, 31)
                     .replace(/[\\\/\?\*\[\]:]/g, ' '));

  return bajarZip([
    { nombre: '[Content_Types].xml', datos:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '</Types>' },
    { nombre: '_rels/.rels', datos:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>' },
    { nombre: 'xl/workbook.xml', datos:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="' + nombreHoja + '" sheetId="1" r:id="rId1"/></sheets>' +
      '</workbook>' },
    { nombre: 'xl/_rels/workbook.xml.rels', datos:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>' },
    { nombre: 'xl/styles.xml', datos: estilos },
    { nombre: 'xl/worksheets/sheet1.xml', datos: sheet }
  ]);
}

/* ===================================================================
   EL PDF
   Apaisado A4. Helvetica con WinAnsiEncoding, que cubre todo el
   castellano (á é í ó ú ü ñ ¿ ¡ °) sin incrustar una fuente.
   Un caracter fuera de Latin-1 se reemplaza en vez de romper el
   archivo: un PDF que no abre es peor que uno con un simbolo de menos.
   =================================================================== */
function bajarPdfTexto(s){
  return String(s === null || s === undefined ? '' : s)
    .replace(/—|–/g, '-').replace(/·/g, '-')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/×/g, 'x').replace(/₨|…/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}
function bajarPdfEsc(s){
  return bajarPdfTexto(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
/* Latin-1: un byte por caracter, que es lo que espera WinAnsiEncoding */
function bajarLatin1(s){
  var out = new Uint8Array(s.length);
  for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xFF;
  return out;
}

/* Ancho real de un texto en Helvetica, para repartir las columnas y
   recortar lo que no entra. Tabla de anchos de las 95 imprimibles. */
var BAJAR_ANCHO_HELV = (function(){
  var w = {}, base =
    ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`' +
    'abcdefghijklmnopqrstuvwxyz{|}~';
  var tabla = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
               556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,
               1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,
               667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,
               556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,
               556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  for (var i = 0; i < base.length; i++) w[base[i]] = tabla[i] || 556;
  return w;
})();
function bajarAnchoTexto(s, pt){
  var t = bajarPdfTexto(s), a = 0;
  for (var i = 0; i < t.length; i++) a += (BAJAR_ANCHO_HELV[t[i]] || 556);
  return a * pt / 1000;
}
function bajarRecortar(s, pt, max){
  var t = bajarPdfTexto(s);
  if (bajarAnchoTexto(t, pt) <= max) return t;
  while (t.length > 1 && bajarAnchoTexto(t + '...', pt) > max) t = t.slice(0, -1);
  return t + '...';
}

/*  doc = { titulo, subtitulo, pie:[lineas], encabezados, filas:[[texto]],
           alinear:[ 'izq'|'der' ], anchos:[pt] }                        */
function bajarPdf(doc){
  var A = 841.89, L = 595.28;                /* A4 apaisado: ancho x alto */
  var MX = 22, ARRIBA = 74, ABAJO = 30;
  var ptEnc = doc.encabezados.length > 16 ? 6 : 7.5;
  var ptFila = ptEnc;
  var altoFila = ptFila + 5;

  /* =================================================================
     EL ANCHO DE CADA COLUMNA — UN NUMERO NO SE CORTA NUNCA
     -----------------------------------------------------------------
     La primera version repartia el ancho a prorrata y el resultado fue
     "2.638.99..." y "161.399...": importes cortados, que es el mismo
     defecto que el 14/10 hizo leer $3.549.541.334 como $3.549.541,33.
     Un texto cortado se entiende; un numero cortado MIENTE.

     Entonces: las columnas de numeros y fechas se llevan PRIMERO todo
     el ancho que necesitan, y lo que sobra se reparte entre las de
     texto, que si se pueden recortar. Si ni siquiera los numeros
     entran, se achica la letra hasta que entren.
     ================================================================= */
  var util = A - MX * 2;
  /* "fijas" = las que NO se pueden recortar: numeros y fechas. Una fecha
     cortada ("01/...") miente igual que un importe cortado. */
  var esNum = doc.alinear.map(function(a, i){
    return a === 'der' || (doc.fijas && doc.fijas[i]);
  });
  var anchos, intentos = 0;

  function necesario(pt){
    return doc.encabezados.map(function(e, i){
      var m = bajarAnchoTexto(e, pt) + 6;
      var hasta = Math.min(doc.filas.length, 400);
      for (var r = 0; r < hasta; r++)
        m = Math.max(m, bajarAnchoTexto(doc.filas[r][i] || '', pt) + 6);
      return m;
    });
  }

  while (intentos++ < 8){
    var nec = necesario(ptFila);
    var pisoNum = 0, pideTexto = 0;
    nec.forEach(function(n, i){ if (esNum[i]) pisoNum += n; else pideTexto += n; });

    /* los numeros tienen que entrar enteros, con algo de aire para el texto */
    if (pisoNum <= util * 0.82 || ptFila <= 4.2){
      var sobra = Math.max(0, util - pisoNum);
      anchos = nec.map(function(n, i){
        if (esNum[i]) return n;
        if (!pideTexto) return 0;
        /* nunca menos de 26 pt: una columna invisible no sirve para nada */
        return Math.max(26, sobra * n / pideTexto);
      });
      /* si al poner los pisos de texto se paso, se recorta SOLO al texto */
      var total = anchos.reduce(function(a, b){ return a + b; }, 0);
      if (total > util){
        var exceso = total - util;
        var textoTotal = 0;
        anchos.forEach(function(w, i){ if (!esNum[i]) textoTotal += w; });
        if (textoTotal > 0)
          anchos = anchos.map(function(w, i){
            return esNum[i] ? w : Math.max(14, w - exceso * w / textoTotal);
          });
      }
      break;
    }
    ptFila = Math.max(4.2, ptFila - 0.5);
    ptEnc = ptFila;
  }
  altoFila = ptFila + 5;

  var paginas = [], actual = null, y = 0;
  function nuevaPagina(){
    actual = { texto: [], lineas: [], cajas: [] };
    paginas.push(actual);
    y = L - ARRIBA;
    /* encabezado de la tabla, repetido en cada hoja */
    actual.cajas.push({ x: MX, y: y - altoFila + 2, w: util, h: altoFila,
                        c: [0.071, 0.196, 0.322] });
    var x = MX;
    doc.encabezados.forEach(function(e, i){
      actual.texto.push({ x: x + 3, y: y - altoFila + 6, s: bajarRecortar(e, ptEnc, anchos[i] - 6),
                          pt: ptEnc, c: [0.95, 0.96, 0.95] });
      x += anchos[i];
    });
    y -= altoFila;
  }
  nuevaPagina();

  doc.filas.forEach(function(f, nf){
    if (y - altoFila < ABAJO) nuevaPagina();
    if (nf % 2 === 1)
      actual.cajas.push({ x: MX, y: y - altoFila + 2, w: util, h: altoFila,
                          c: [0.957, 0.969, 0.976] });
    var x = MX;
    f.forEach(function(v, i){
      /* a un numero NUNCA se le corta: su columna ya tiene el ancho */
      var t = esNum[i] ? bajarPdfTexto(v || '')
                       : bajarRecortar(v || '', ptFila, anchos[i] - 6);
      var px = (doc.alinear[i] === 'der')
        ? x + anchos[i] - 3 - bajarAnchoTexto(t, ptFila)
        : x + 3;
      actual.texto.push({ x: px, y: y - altoFila + 6, s: t, pt: ptFila, c: [0.1,0.1,0.1] });
      x += anchos[i];
    });
    actual.lineas.push({ x1: MX, y1: y - altoFila + 1, x2: MX + util, y2: y - altoFila + 1 });
    y -= altoFila;
  });

  /* el encabezado de la hoja y el numero de pagina */
  paginas.forEach(function(p, i){
    p.texto.push({ x: MX, y: L - 28, s: doc.titulo, pt: 12, c: [0.071,0.196,0.322] });
    p.texto.push({ x: MX, y: L - 43, s: doc.subtitulo, pt: 9, c: [0.23,0.23,0.23] });
    (doc.pie || []).forEach(function(linea, k){
      p.texto.push({ x: MX, y: L - 56 - k * 10, s: bajarRecortar(linea, 7, A - MX*2),
                     pt: 7, c: [0.43,0.43,0.43] });
    });
    var n = 'Pagina ' + (i + 1) + ' de ' + paginas.length;
    p.texto.push({ x: A - MX - bajarAnchoTexto(n, 7), y: 16, s: n, pt: 7, c: [0.43,0.43,0.43] });
  });

  /* ---- a bytes ---- */
  var objetos = [], contenidos = [];
  paginas.forEach(function(p){
    var s = [];
    p.cajas.forEach(function(c){
      s.push(c.c[0].toFixed(3) + ' ' + c.c[1].toFixed(3) + ' ' + c.c[2].toFixed(3) + ' rg');
      s.push(c.x.toFixed(2) + ' ' + c.y.toFixed(2) + ' ' + c.w.toFixed(2) + ' ' +
             c.h.toFixed(2) + ' re f');
    });
    s.push('0.85 0.88 0.91 RG 0.4 w');
    p.lineas.forEach(function(l){
      s.push(l.x1.toFixed(2) + ' ' + l.y1.toFixed(2) + ' m ' +
             l.x2.toFixed(2) + ' ' + l.y2.toFixed(2) + ' l S');
    });
    s.push('BT');
    var ptAnt = null, cAnt = null;
    p.texto.forEach(function(t){
      if (t.pt !== ptAnt){ s.push('/F1 ' + t.pt + ' Tf'); ptAnt = t.pt; }
      var col = t.c.map(function(x){ return x.toFixed(3); }).join(' ');
      if (col !== cAnt){ s.push(col + ' rg'); cAnt = col; }
      s.push('1 0 0 1 ' + t.x.toFixed(2) + ' ' + t.y.toFixed(2) + ' Tm (' +
             bajarPdfEsc(t.s) + ') Tj');
    });
    s.push('ET');
    contenidos.push(s.join('\n'));
  });

  var nPag = paginas.length;
  var idCat = 1, idPaginas = 2, idFuente = 3, idPag0 = 4;
  objetos[idCat]     = '<< /Type /Catalog /Pages ' + idPaginas + ' 0 R >>';
  objetos[idPaginas] = '<< /Type /Pages /Count ' + nPag + ' /Kids [' +
    paginas.map(function(_, i){ return (idPag0 + i * 2) + ' 0 R'; }).join(' ') + '] >>';
  objetos[idFuente]  = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica ' +
                       '/Encoding /WinAnsiEncoding >>';
  paginas.forEach(function(_, i){
    var idP = idPag0 + i * 2, idC = idP + 1;
    objetos[idP] = '<< /Type /Page /Parent ' + idPaginas + ' 0 R /MediaBox [0 0 ' +
      A.toFixed(2) + ' ' + L.toFixed(2) + '] /Resources << /Font << /F1 ' + idFuente +
      ' 0 R >> >> /Contents ' + idC + ' 0 R >>';
    objetos[idC] = { flujo: contenidos[i] };
  });

  var partes = [], off = 0, posiciones = [];
  function meter(txt){
    var b = bajarLatin1(txt);
    partes.push(b); off += b.length;
  }
  meter('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  for (var i = 1; i < objetos.length; i++){
    posiciones[i] = off;
    var o = objetos[i];
    if (o && o.flujo !== undefined){
      meter(i + ' 0 obj\n<< /Length ' + bajarLatin1(o.flujo).length + ' >>\nstream\n');
      meter(o.flujo);
      meter('\nendstream\nendobj\n');
    } else {
      meter(i + ' 0 obj\n' + o + '\nendobj\n');
    }
  }
  var inicioXref = off;
  var xref = 'xref\n0 ' + objetos.length + '\n0000000000 65535 f \n';
  for (var j = 1; j < objetos.length; j++)
    xref += ('0000000000' + posiciones[j]).slice(-10) + ' 00000 n \n';
  meter(xref);
  meter('trailer\n<< /Size ' + objetos.length + ' /Root ' + idCat + ' 0 R >>\n' +
        'startxref\n' + inicioXref + '\n%%EOF\n');

  var total = partes.reduce(function(a, p){ return a + p.length; }, 0);
  var salida = new Uint8Array(total), p2 = 0;
  partes.forEach(function(x){ salida.set(x, p2); p2 += x.length; });
  return salida;
}
