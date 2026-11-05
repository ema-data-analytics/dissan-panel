// LISTAS DE PRECIOS DE PROVEEDOR — lee el PDF o el Excel del laboratorio.   27/10/2026
//
// ---------------------------------------------------------------------------
// POR QUE SE LEE POR COORDENADA Y NO POR TEXTO PLANO
//
// Con el texto plano la lista de COLOPLAST da 179 de 251 productos: el codigo y
// las unidades por caja vienen pegados en el mismo renglon de texto y el numero
// no se puede separar del codigo sin adivinar. Leyendo por la POSICION de cada
// elemento en la pagina, el codigo sale de su columna, las unidades por caja de
// la suya y el precio de la suya.
//
// MEDIDO con esta misma pdf.js contra las listas reales (27/10):
//   COLOPLAST  249 productos leidos -> 241 entran = los 241 del archivo que armo
//              DISSAN a mano, con la suma de Precio identica al centavo.
//   SILMAG 224 · GAVAMAX 79 · CAPACCIOLI 68 · ICU 40 · BD 123 · D.MEDICA 31.
//   24 precios contrastados uno por uno contra valores ya verificados: 0 fallan.
//
// EL MAPEO NO ESTA CABLEADO ACA. Vive en cotiza.lista_proveedor.lectura (jsonb),
// una fila por laboratorio. Agregar un proveedor nuevo es cargar esa fila, no
// tocar este archivo.
//
// LAS FRANJAS DE x SE SOLAPAN SI NO SE MIDEN. En COLOPLAST la franja de
// 'unidades por caja' estaba en [60,155] y la descripcion arranca en x=135 en la
// pagina 11: el '1' quedaba pegado a 'Brava', se leia vacio, y 9 articulos que
// Tango compra por caja se apartaban por falta de unidades cuando la lista SI las
// trae. Va [60,132]. Antes de cargar una franja, mirar donde arranca la de al lado.
//
// LA IMAGEN SE RECHAZA. De una foto no se puede leer un precio con seguridad, y
// un digito mal leido es una cotizacion perdida o una venta bajo el costo.
// ---------------------------------------------------------------------------

import ExcelJS from "npm:exceljs@4.4.0";
import { decodeBase64 } from "jsr:@std/encoding@1.0.5/base64";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

/* ------------------------------------------------------------------ la base */

async function rpc(nombre: string, args: Record<string, unknown>) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${url}/rest/v1/rpc/${nombre}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key!, Authorization: `Bearer ${key}` },
    body: JSON.stringify(args),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${nombre}: ${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
}

/**
 * EL PORTERO DEL QUE LLAMA.                                     29/10/2026
 * verify_jwt solo prueba que la sesion es valida, NO que el usuario tenga el
 * modulo: cualquier usuario de DISSAN con sesion podia pedirle a esta funcion
 * que le leyera una lista, y la respuesta trae el nombre del proveedor y su
 * regla de costeo. Asi que se le pregunta a la base QUIEN ESTA LLAMANDO, con
 * el JWT de quien llama y no con la clave de servicio.
 *
 * Devuelve true (tiene el modulo), false (no lo tiene) o null (no se pudo
 * saber). SOLO SE CORTA CON false: si el control mismo falla se sigue igual
 * que antes, porque un control roto que deja a la persona afuera de su propia
 * pantalla es peor que el agujero que tapa.
 */
async function tieneElModulo(auth: string): Promise<boolean | null> {
  try {
    if (!auth) return null;
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const r = await fetch(`${url}/rest/v1/rpc/api_mis_modulos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key!, Authorization: auth },
      body: "{}",
    });
    if (!r.ok) return null;
    const mods = JSON.parse(await r.text());
    if (!Array.isArray(mods)) return null;
    return mods.some((m: any) => m?.clave === "Listas");
  } catch { return null; }
}

/* --------------------------------------------------------------- numeros */

/** '8.558,91' (castellano) o '8,558.91' (ingles), segun el fmt del laboratorio */
function aNumero(s: string, fmt: string): number | null {
  let t = String(s).trim();
  if (!t) return null;
  t = fmt === "us" ? t.replace(/,/g, "") : t.replace(/\./g, "").replace(/,/g, ".");
  const v = Number(t);
  return isFinite(v) ? v : null;
}

const HDR = new Set([
  "CODIGO", "COD", "SKU", "ARTICULO", "PRODUCTO", "PRECIO", "DESCRIPCION", "UNITARIO",
  "LISTA", "TOTAL", "BONIF", "CATEGORIA", "SSKKUU", "PAG", "PAGINA", "ITEM", "CANT",
  "MARCA", "MODELO", "MEDIDAS", "PRESENTACION", "UNIDADES", "CAJA", "IVA", "SIN", "CON",
  "MINORISTA", "INDICE", "MATERIAL", "COD_ARTIC",
  /* LOS TITULOS EN INGLES.                                       05/11/2026
     Sin estos, la fila de titulos de una lista en ingles no se reconoce como
     titulo y entra como si fuera un articulo: un renglon de mas, con el
     codigo "CODE" y sin precio. Son los titulos que de verdad traen las
     listas de los laboratorios, no una lista de palabras inventada. */
  "CODE", "REF", "PART", "PARTNUMBER", "PART_NUMBER", "CATALOG", "CAT", "CATNO",
  "DESCRIPTION", "PRICE", "LISTPRICE", "UNITPRICE", "NETPRICE", "UNIT", "UOM",
  "QTY", "QUANTITY", "PACK", "PACKSIZE", "BOX", "EACH", "EA", "CURRENCY", "USD",
  "PRODUCTCODE", "ITEMCODE", "ITEMNO", "NO", "NUMBER", "AMOUNT", "DISCOUNT",
]);

/* Las marcas combinantes van ESCAPADAS (\u0300-\u036f), no literales.  01/11/2026
   Escritas literales son caracteres invisibles adentro de una clase de
   caracteres: cualquiera que copie este archivo las pierde sin darse
   cuenta y sinTildes deja de sacar tildes, en silencio. Es funcionalmente
   lo mismo y se puede leer. */
const sinTildes = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const FRAG = /^[0-9.,]+$/;
const NUMTOK = /^[0-9][0-9.,]*$/;
const CUR = /^(\$|USD|U\$S|US\$)$/;
const CURNUM = /^(?:\$|USD|U\$S|US\$)\s*([0-9][0-9.,]*)$/;

/* ------------------------------------------------------------------- PDF */

type Pal = { text: string; x0: number; x1: number; y: number };

/**
 * Un elemento de texto de pdf.js puede traer varias palabras juntas. Se parte
 * por espacios y se reparte el ancho del elemento entre los caracteres: las
 * franjas de columna son anchas, asi que la aproximacion alcanza. Tomando los
 * elementos enteros, una linea que viene en un solo elemento rompe todas las
 * franjas.
 */
function palabrasDeItems(items: any[]): Pal[] {
  const out: Pal[] = [];
  for (const it of items) {
    const s: string = typeof it?.str === "string" ? it.str : "";
    if (!s.trim()) continue;
    const x = Number(it.transform?.[4] ?? 0);
    const y = Number(it.transform?.[5] ?? 0);
    const w = Number(it.width ?? 0);
    const n = s.length;
    const porChar = n > 0 && w > 0 ? w / n : 0;
    let i = 0;
    while (i < n) {
      if (s[i] === " ") { i++; continue; }
      let j = i;
      while (j < n && s[j] !== " ") j++;
      out.push({ text: s.slice(i, j), x0: x + i * porChar, x1: x + j * porChar, y });
      i = j;
    }
  }
  return out;
}

/** agrupa por renglon: la misma linea de base, con tolerancia */
function renglones(pal: Pal[], tol: number): Pal[][] {
  const ord = [...pal].sort((a, b) => (b.y - a.y) || (a.x0 - b.x0));
  const lineas: Pal[][] = [];
  let actual: Pal[] = [];
  let yRef = Number.NaN;
  for (const p of ord) {
    if (isNaN(yRef) || Math.abs(p.y - yRef) <= tol) {
      if (isNaN(yRef)) yRef = p.y;
      actual.push(p);
    } else { lineas.push(actual); actual = [p]; yRef = p.y; }
  }
  if (actual.length) lineas.push(actual);
  return lineas.map((l) => l.sort((a, b) => a.x0 - b.x0));
}

const enFranja = (ln: Pal[], r?: number[]) =>
  !r ? "" : ln.filter((w) => w.x0 >= r[0] && w.x0 < r[1]).map((w) => w.text).join("");
const textoFranja = (ln: Pal[], r?: number[]) =>
  !r ? "" : ln.filter((w) => w.x0 >= r[0] && w.x0 < r[1]).map((w) => w.text).join(" ").trim();

/** el precio: anclado al signo de moneda, o por franja de x */
function precioDeLinea(ln: Pal[], pcfg: any): string | null {
  const modo = pcfg?.modo ?? "moneda";
  if (modo === "rango") {
    const t = enFranja(ln, pcfg.x).trim();
    return t && NUMTOK.test(t) ? t : null;
  }
  const quiero = Number(pcfg?.ocurrencia ?? 1);
  let vistos = 0;
  for (let i = 0; i < ln.length; i++) {
    const t = ln[i].text;
    const m = CURNUM.exec(t);
    if (m) { vistos++; if (vistos === quiero) return m[1]; continue; }
    if (CUR.test(t)) {
      vistos++;
      const piezas: string[] = [];
      let prev = 0;
      for (let k = i + 1; k < ln.length; k++) {
        const t2 = ln[k].text;
        if (!FRAG.test(t2)) break;
        if (piezas.length && (ln[k].x0 - prev) > 6) break;   // salto de columna
        if (!piezas.length && !/[0-9]/.test(t2[0])) break;
        piezas.push(t2); prev = ln[k].x1;
      }
      if (vistos === quiero) return piezas.length ? piezas.join("") : null;
    }
  }
  return null;
}

/**
 * El lector de PDF se pide SIN version fija: la version 5.7.284 que estaba
 * cableada aca no existe en el registro, y la funcion moria con "Could not find
 * constraint". Sin version, el registro resuelve la ultima publicada. Se prueban
 * varios especificadores en orden y la respuesta dice cual entro, asi no hay que
 * adivinar: el campo motor de la respuesta trae el que funciono.
 */
async function abrirPdf(bytes: Uint8Array) {
  const intentos = [
    "npm:pdfjs-dist/legacy/build/pdf.mjs",
    "npm:pdfjs-dist",
    "https://esm.sh/pdfjs-dist/legacy/build/pdf.mjs",
    "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs",
    "https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.js",
    "npm:unpdf",
    "https://esm.sh/unpdf",
  ];
  const fallas: string[] = [];
  for (const esp of intentos) {
    try {
      const mod: any = await import(esp);
      const g = mod.getDocument ?? mod.default?.getDocument;
      if (typeof g === "function") {
        const t = g({ data: bytes, useSystemFonts: false, isEvalSupported: false,
                      disableFontFace: true, useWorkerFetch: false });
        return { doc: await (t.promise ?? t), motor: esp };
      }
      if (typeof mod.getDocumentProxy === "function") {
        return { doc: await mod.getDocumentProxy(bytes), motor: esp };
      }
      fallas.push(`${esp}: no expone getDocument ni getDocumentProxy`);
    } catch (e) {
      fallas.push(`${esp}: ${String((e as Error)?.message ?? e).substring(0, 160)}`);
    }
  }
  throw new Error("no se pudo cargar el lector de PDF — " + fallas.join(" | "));
}

async function leerPdf(bytes: Uint8Array, cfg: any, diag: boolean) {
  const { doc, motor } = await abrirPdf(bytes);
  const tol = Number(cfg.y_tol ?? 2);
  const maxcod = Number(cfg.max_cod ?? 22);
  const fmt = String(cfg.fmt ?? "ar");
  const codRe = cfg.cod_re ? new RegExp(cfg.cod_re) : null;
  const filas: any[] = [];
  const descartes: any[] = [];
  const muestra: any[] = [];
  const paginas = doc.numPages ?? 0;

  for (let p = 1; p <= paginas; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const lns = renglones(palabrasDeItems(tc.items ?? []), tol);
    if (diag && p <= 4) {
      for (const ln of lns.slice(0, 14)) {
        muestra.push({ pag: p, linea: ln.map((w) => `${w.text}@${Math.round(w.x0)}`)
                                        .join(" | ").substring(0, 220) });
      }
    }
    for (const ln of lns) {
      const cod = enFranja(ln, cfg.cod).trim().replace(/\s+/g, "").replace(/\*+$/, "");
      if (!cod) continue;
      if (HDR.has(sinTildes(cod).toUpperCase().replace(/^[.:]+|[.:]+$/g, ""))) continue;
      if (cod.length > maxcod) continue;
      if (codRe && !codRe.test(cod)) continue;

      const pretxt = precioDeLinea(ln, cfg.precio);
      if (pretxt === null) { descartes.push({ cod, pag: p, porque: "no hay precio en el renglon" }); continue; }
      const precio = aNumero(pretxt, fmt);
      if (precio === null || precio <= 0) {
        descartes.push({ cod, pag: p, porque: `precio ilegible: ${pretxt}` });
        continue;
      }
      let caja: number | null = null;
      if (cfg.caja) {
        const ct = enFranja(ln, cfg.caja).trim();
        if (NUMTOK.test(ct)) { const c = aNumero(ct, fmt); caja = c !== null && c > 0 ? c : null; }
      }
      filas.push({ cod, descripcion: textoFranja(ln, cfg.desc ?? [cfg.cod[1], 320]) || null,
                   precio, caja, pag: p });
    }
  }
  return { filas, descartes, motor, paginas, muestra };
}

/* ----------------------------------------------------------------- EXCEL */

/**
 * exceljs devuelve un OBJETO cuando la celda es formula ({formula, result}),
 * texto enriquecido ({richText}) o enlace ({text, hyperlink}). La columna I de
 * la lista de MEDIX es `=+SUM(H11:H20)`: leida como objeto da NaN y el renglon
 * se pierde sin avisar. Siempre se saca el VALOR, nunca la celda.
 */
function valorCelda(v: any): any {
  if (v === null || v === undefined) return undefined;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return valorCelda((v as any).result);
    if ("richText" in v) return (v as any).richText.map((t: any) => t.text).join("");
    if ("text" in v) return (v as any).text;
    if ("error" in v) return undefined;
    return undefined;
  }
  return v;
}
function txt(v: any): string | null {
  const x = valorCelda(v);
  if (x === null || x === undefined) return null;
  if (typeof x === "number") return String(x);
  const s = String(x).trim();
  return s === "" ? null : s;
}
/**
 * UN PRECIO ESCRITO EN INGLES NO SE LEE CON LA REGLA CASTELLANA.  05/11/2026
 *
 * numeroCelda convertia TODO texto con `quitar los puntos y la coma al punto`,
 * que es la regla castellana. Medido contra el codigo que estaba vivo:
 *
 *     "1,234.56" -> 1,23        (deberia ser 1.234,56)   mil veces menos
 *     "0.75"     -> 75          (deberia ser 0,75)       cien veces mas
 *     "2.56"     -> 256
 *
 * Y no avisa nada: entra como precio bueno. Es la clase de defecto que mas
 * caro sale, porque la cifra es creible.
 *
 * LA REGLA, Y POR QUE NO HAY QUE ADIVINAR EN CASI NINGUN CASO:
 *   1. Si el texto trae coma Y punto, el decimal es EL QUE ESTA MAS A LA
 *      DERECHA. "1,234.56" ingles · "1.234,56" castellano. Sin ambiguedad.
 *   2. Si trae un solo separador repetido, es de miles: "1.234.567".
 *   3. Si trae un separador una sola vez:
 *        - con 1, 2, 4 o mas digitos a la derecha es DECIMAL en los dos
 *          idiomas: ningun separador de miles lleva 1 o 2 digitos.
 *          Aca es donde "0.75" dejaba de valer 0,75 y pasaba a valer 75.
 *        - con exactamente 3 digitos a la derecha SI es ambiguo ("1,234"
 *          vale 1234 en ingles y 1,234 en castellano). SOLO ahi se usa el
 *          formato declarado del proveedor (fmt), y si no esta declarado
 *          se usa el castellano, que es lo que hacia hasta hoy: este
 *          cambio NO mueve ninguna lista que hoy anda bien.
 *
 * El signo de moneda se saca antes: "US$ 1,998" es un precio, no un texto.
 */
function numeroDeTexto(s: string, fmt?: string): number | null {
  let t = String(s).replace(/\s/g, "")
                   .replace(/^(?:\$|USD|U\$S|US\$|ARS|EUR|€)/i, "")
                   .replace(/(?:USD|U\$S|US\$|ARS|EUR|€)$/i, "");
  if (!t) return null;
  const negativo = /^\(.*\)$/.test(t);          /* (1,234.56) de contabilidad */
  if (negativo) t = t.slice(1, -1);
  if (!/^-?[0-9.,]+$/.test(t)) return null;
  const signo = t.startsWith("-") ? -1 : 1;
  t = t.replace(/^-/, "");

  const ultComa = t.lastIndexOf(",");
  const ultPunto = t.lastIndexOf(".");
  let dec: string | null = null;

  if (ultComa >= 0 && ultPunto >= 0) {
    dec = ultComa > ultPunto ? "," : ".";
  } else {
    const sep = ultComa >= 0 ? "," : ultPunto >= 0 ? "." : null;
    if (sep !== null) {
      const veces = t.split(sep).length - 1;
      const derecha = t.length - t.lastIndexOf(sep) - 1;
      if (veces > 1) dec = null;                       /* 1.234.567 -> miles */
      else if (derecha !== 3) dec = sep;               /* 0.75 · 2,5 · 1,2345 */
      else dec = (fmt === "us") ? (sep === "." ? "." : null)
                                : (sep === "," ? "," : null);
    }
  }

  let limpio: string;
  if (dec === null) limpio = t.replace(/[.,]/g, "");
  else limpio = t.split(dec).map((p, i, a) =>
         i === a.length - 1 ? p : p.replace(/[.,]/g, "")
       ).join(".");
  const v = Number(limpio);
  if (!isFinite(v)) return null;
  return signo * (negativo ? -v : v);
}

function numeroCelda(v: any, fmt?: string): number | null {
  const x = valorCelda(v);
  if (typeof x === "number" && isFinite(x)) return x;
  if (typeof x === "string" && x.trim() !== "") return numeroDeTexto(x, fmt);
  return null;
}

/**
 * EL FORMATO LO DECIDE LA COLUMNA ENTERA, NO LA CELDA.           05/11/2026
 * Una sola celda "1,234.56" en toda la lista alcanza para saber que la
 * columna esta en ingles, y entonces "1,234" de dos renglones mas abajo vale
 * 1234 y no 1,234. Mirando celda por celda, cada renglon decide distinto y la
 * misma lista sale con dos criterios adentro.
 * Devuelve 'us', 'ar' o null (la columna no alcanza para saberlo).
 */
function formatoDeColumna(textos: string[]): "us" | "ar" | null {
  let us = 0, ar = 0;
  for (const s of textos) {
    const t = String(s).replace(/\s/g, "");
    const c = t.lastIndexOf(","), p = t.lastIndexOf(".");
    if (c >= 0 && p >= 0) { if (c > p) ar++; else us++; continue; }
    if ((t.split(",").length - 1) > 1) us++;
    else if ((t.split(".").length - 1) > 1) ar++;
  }
  if (us && !ar) return "us";
  if (ar && !us) return "ar";
  return null;                      /* vacia, ambigua, o las dos cosas */
}

/* Titulos con los que un laboratorio nombra cada columna, en los dos idiomas.
   Se comparan SIN tildes, en mayuscula y sin espacios ni signos. */
const T_COD = [
  "CODIGO", "COD", "CODARTIC", "CODARTICULO", "CODPROVEEDOR", "ARTICULO", "SKU",
  "MATERIAL", "REFERENCIA", "REF", "CODE", "ITEMCODE", "PRODUCTCODE", "ITEMNO",
  "PARTNUMBER", "PARTNO", "CATALOG", "CATALOGNUMBER", "CATNO", "ITEM", "PRODUCTO",
];
const T_PRECIO = ["PRECIO", "COSTO", "IMPORTE", "VALOR", "PRICE", "COST", "AMOUNT", "LISTPRICE"];
const T_DESC = ["DESCRIPCION", "DETALLE", "PRODUCTO", "ARTICULO", "DESCRIPTION", "PRODUCT", "NAME"];
const T_CAJA = ["CAJA", "UNIDADES", "UNIDADESPORCAJA", "PORCAJA", "PACK", "PACKSIZE",
                "BOX", "UNITSPERBOX", "EAPERBOX", "QTY", "UOM", "UNIT",
                "QTYBOX", "QTYPERBOX", "UNITSBOX", "PERBOX", "PCSBOX", "PCS",
                "UXCAJA", "UNIDADESCAJA", "CONTENIDO"];

const llave = (s: string) =>
  sinTildes(String(s)).toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * EN INGLES EL SUSTANTIVO VA AL FINAL DEL TITULO.                05/11/2026
 * "Precio neto" empieza con PRECIO; "Net Price" TERMINA en PRICE. Mirando solo
 * el principio, la columna "Net Price" no se reconocia como precio y media
 * lista en ingles quedaba sin leer. Lo encontro el banco, no yo.
 *
 * Las claves de 3 letras o menos (COD, REF, CAT, NO, EA) van SOLO por igualdad
 * exacta: con ellas, "Reference Price" se tomaria como columna de codigo, y
 * entonces la lista entera sale con el codigo equivocado.
 */
const pega = (titulo: string, lista: string[]) => {
  const k = llave(titulo);
  if (!k) return false;
  return lista.some((t) => {
    if (k === t) return true;
    if (t.length < 4) return false;           /* COD, REF, CAT, NO, EA, PCS */
    return k.startsWith(t) || k.endsWith(t) || (t.length >= 5 && k.includes(t));
  });
};

/**
 * UN EXCEL SE DESCRIBE SOLO: TIENE FILA DE TITULOS.              05/11/2026
 * Si el laboratorio manda el Excel y no hay lectura cargada para Excel, se
 * busca la primera fila que tenga un titulo de codigo Y uno de precio, y de
 * ahi salen las columnas. Un PDF no se describe solo; por eso esto existe
 * para Excel y no para PDF.
 * Si hay MAS DE UNA columna de precio se toma la primera y SE DICEN LAS
 * OTRAS POR SU TITULO: elegir a ciegas seria subir la lista entera con el
 * precio equivocado.
 */
function detectarExcel(hoja: any): any | null {
  const hasta = Math.min(hoja.rowCount || 0, 40);
  for (let r = 1; r <= hasta; r++) {
    const fila = hoja.getRow(r);
    const n = Math.max(fila.cellCount || 0, 0);
    if (n < 2) continue;
    let cod = 0, desc = 0, caja = 0;
    const precios: Array<{ col: number; titulo: string }> = [];
    for (let c = 1; c <= n; c++) {
      const t = txt(fila.getCell(c).value);
      if (!t) continue;
      if (!cod && pega(t, T_COD)) { cod = c; continue; }
      if (pega(t, T_PRECIO)) { precios.push({ col: c, titulo: t }); continue; }
      if (!desc && pega(t, T_DESC)) { desc = c; continue; }
      if (!caja && pega(t, T_CAJA)) { caja = c; continue; }
    }
    if (cod && precios.length) {
      return {
        tipo: "excel", hoja: hoja.name, fila_datos: r + 1,
        col_cod: cod, col_desc: desc || null, col_caja: caja || null,
        col_precio: precios[0].col, titulo_precio: precios[0].titulo,
        otras_precio: precios.slice(1).map((p) => p.titulo),
        fila_titulos: r, detectada: true,
      };
    }
  }
  return null;
}

async function leerExcel(bytes: Uint8Array, cfg: any, diag: boolean) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes as any);
  const filas: any[] = [];
  const descartes: any[] = [];
  const muestra: any[] = [];
  const avisosLectura: string[] = [];
  const nombres = wb.worksheets.map((w: any) => w.name);

  /* SIN COLUMNAS CARGADAS, SE BUSCAN LOS TITULOS. Antes, sin col_cod,
     fila.getCell(undefined) tiraba una excepcion y la pantalla decia
     "no se pudo leer el archivo" sin decir que era lo que faltaba. */
  let cfgUsada = cfg;
  if (!cfg.col_cod || !cfg.col_precio) {
    const prim: any = wb.getWorksheet(cfg.hoja ?? nombres[0]) ?? wb.worksheets[0];
    const det = prim ? detectarExcel(prim) : null;
    if (!det) {
      return { filas: [], descartes: [{ porque: "no se encontro la fila de titulos" }],
               motor: "npm:exceljs@4.4.0", hojas: nombres, muestra: [],
               avisos: ["No hay lectura de Excel cargada para este proveedor y tampoco se " +
                        "encontro una fila de titulos con una columna de codigo y una de " +
                        "precio. Hay que cargar la lectura antes de subir esta lista."] };
    }
    cfgUsada = Object.assign({}, cfg, det);
    avisosLectura.push(
      `No habia lectura de Excel cargada: se leyo por los TITULOS de la fila ${det.fila_titulos} ` +
      `de la hoja "${det.hoja}" — codigo en la columna ${det.col_cod}, precio en la ${det.col_precio} ` +
      `("${det.titulo_precio}").`);
    if (det.otras_precio.length) {
      avisosLectura.push(
        `La lista tiene mas de una columna de precio. Se tomo "${det.titulo_precio}". ` +
        `Las otras son: ${det.otras_precio.map((t: string) => `"${t}"`).join(", ")}. ` +
        `Si el costo sale de otra, hay que cargarla antes de confirmar.`);
    }
  }

  const hojas: any[] = cfgUsada.hojas ?? [{ hoja: cfgUsada.hoja, fila_datos: cfgUsada.fila_datos }];

  for (const h of hojas) {
    const nombre = h.hoja ?? nombres[0];
    const hoja: any = wb.getWorksheet(nombre);
    if (!hoja) {
      descartes.push({ porque: `el archivo no tiene la hoja "${nombre}"`, hojas: nombres });
      continue;
    }
    const ultima = hoja.rowCount || 0;
    const desde = Number(h.fila_datos ?? cfgUsada.fila_datos ?? 1);

    /* PRIMERA PASADA: QUE FORMATO DE NUMERO USA ESTA COLUMNA.
       Solo mira los precios que vienen como TEXTO: los que vienen como
       numero de Excel ya estan bien y no dicen nada del idioma. */
    const textos: string[] = [];
    for (let r = desde; r <= ultima; r++) {
      const v = valorCelda(hoja.getRow(r).getCell(cfgUsada.col_precio).value);
      if (typeof v === "string" && v.trim() !== "") textos.push(v);
    }
    const fmtMedido = formatoDeColumna(textos);
    const fmt = fmtMedido ?? (cfgUsada.fmt ? String(cfgUsada.fmt) : undefined);
    if (textos.length) {
      if (fmtMedido) {
        avisosLectura.push(
          `Los precios de la hoja "${nombre}" vienen escritos como texto. Medido sobre ` +
          `${textos.length} renglones, estan en formato ` +
          `${fmtMedido === "us" ? "INGLES (1,234.56)" : "CASTELLANO (1.234,56)"}, ` +
          `y se leyeron asi.`);
      } else {
        avisosLectura.push(
          `Los precios de la hoja "${nombre}" vienen como texto y la columna no alcanza ` +
          `para saber el idioma del numero (no hay ningun valor con coma y punto juntos). ` +
          `Se leyeron en formato ${cfgUsada.fmt === "us" ? "INGLES" : "CASTELLANO"}` +
          `${cfgUsada.fmt ? " (declarado del laboratorio)" : " (el de siempre)"}. ` +
          `Mirar la muestra antes de confirmar.`);
      }
    }

    let grupo: string | null = null;
    for (let r = desde; r <= ultima; r++) {
      const fila = hoja.getRow(r);
      if (cfgUsada.col_grupo) {
        const g = txt(fila.getCell(cfgUsada.col_grupo).value);
        if (g) grupo = g;
      }
      const cod = txt(fila.getCell(cfgUsada.col_cod).value);
      if (cod === null) continue;
      if (HDR.has(llave(cod))) continue;
      const d1 = cfgUsada.col_desc ? txt(fila.getCell(cfgUsada.col_desc).value) : null;
      const d2 = cfgUsada.col_desc2 ? txt(fila.getCell(cfgUsada.col_desc2).value) : null;
      const desc = [grupo, d1, d2].filter((x) => x).join(" ") || null;
      const precio = numeroCelda(fila.getCell(cfgUsada.col_precio).value, fmt);
      let caja: number | null = null;
      if (cfgUsada.col_caja) {
        const c = numeroCelda(fila.getCell(cfgUsada.col_caja).value, fmt);
        caja = c !== null && c > 0 ? c : null;
      }
      if (precio === null || precio <= 0) descartes.push({ cod, porque: "sin precio en la lista", fila: r });
      filas.push({ cod, descripcion: desc, precio, caja, hoja: nombre, fila: r });
      if (diag && muestra.length < 12) muestra.push({ hoja: nombre, fila: r, cod, desc, precio, caja });
    }
  }
  return { filas, descartes, motor: "npm:exceljs@4.4.0", hojas: nombres, muestra,
           avisos: avisosLectura, lectura_usada: cfgUsada };
}

/* ------------------------------------------------------------------ servir */

/* LA LECTURA GENERICA DE PDF.                                    05/11/2026
   Es la que usan 5 de los 6 proveedores de PDF del padron, con las mismas
   franjas. Sirve de respaldo cuando llega un PDF de un proveedor que no
   tiene lectura propia: mejor leerlo y declarar que se uso la generica, que
   rechazarlo y que el usuario crea que su archivo no sirve. */
const PDF_GENERICO = {
  cod: [30, 130], desc: [130, 330], precio: { modo: "moneda", ocurrencia: 1 },
  y_tol: 2, fmt: "ar", max_cod: 22,
};

const IMAGEN = /\.(jpe?g|png|gif|bmp|webp|tiff?|heic)$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  /* EL PORTERO, ANTES DE TODO LO DEMAS.                       01/11/2026
     Esta funcion ya tenia el control del modulo (tieneElModulo), bien hecho
     y con el JWT del que llama. Pero corria DESPUES de leer el cuerpo, y
     sobre todo: con solo la clave publishable el `Authorization` viene
     VACIO, tieneElModulo devuelve null, y null no corta a proposito —«un
     control roto que deja a la persona afuera de su propia pantalla es peor
     que el agujero que tapa», y eso sigue siendo cierto.
     Lo que faltaba es el escalon de antes: sin JWT de persona no se entra.
     Medido el 01/11: con solo la clave del repositorio esta funcion
     contestaba «Falta elegir el proveedor», o sea que habia llegado adentro. */
  {
    const autorizacion = req.headers.get("Authorization") || "";
    if (!/^bearer\s+[\w-]+\.[\w-]+\.[\w-]+$/i.test(autorizacion.trim())) {
      return json({ ok: false, filas: [],
                    avisos: ["Hace falta entrar al panel."] }, 401);
    }
  }

  const arranque = Date.now();
  try {
    const cuerpo = await req.json().catch(() => ({}));
    const proveedorId = Number(cuerpo?.proveedor_id);
    const nombre = String(cuerpo?.nombre_archivo ?? "").trim();
    const b64 = String(cuerpo?.archivo_base64 ?? "");
    const diag = cuerpo?.diag === true;
    const resumir = cuerpo?.resumir === true;

    const permitido = await tieneElModulo(req.headers.get("Authorization") ?? "");
    if (permitido === false) {
      return json({ ok: false, filas: [],
        avisos: ["Este usuario no tiene las listas de precios de proveedores."] }, 403);
    }

    if (!proveedorId) return json({ ok: false, filas: [], avisos: ["Falta elegir el proveedor."] });
    if (!nombre) return json({ ok: false, filas: [], avisos: ["Falta el nombre del archivo."] });
    if (!b64) return json({ ok: false, filas: [], avisos: ["No llego el archivo."] });

    const proveedores: any[] = await rpc("api_listas_proveedores", {});
    const prov = (proveedores ?? []).find((p) => Number(p.id) === proveedorId);
    if (!prov) return json({ ok: false, filas: [], avisos: [`No existe el proveedor ${proveedorId}.`] });

    if (IMAGEN.test(nombre) || prov.lectura?.tipo === "imagen") {
      return json({ ok: false, filas: [], proveedor: prov.proveedor,
                    avisos: ["La lista viene como imagen. Pedirla en Excel o PDF."] });
    }
    const cfg = prov.lectura ?? {};
    const esPdf = /\.pdf$/i.test(nombre);
    const esXls = /\.(xlsx|xlsm|xls)$/i.test(nombre);
    if (!esPdf && !esXls) {
      return json({ ok: false, filas: [],
        avisos: [`No se puede leer un archivo "${nombre.split(".").pop()}". Pedir la lista en Excel o PDF.`] });
    }
    /* EL FORMATO LO DECLARA EL ARCHIVO, NO LA CONFIGURACION.       05/11/2026
       Este candado estaba asi:
           if ((esPdf && cfg.tipo !== "pdf") || (esXls && cfg.tipo !== "excel")) rechaza
       o sea que miraba el tipo CONFIGURADO del proveedor y no el tipo REAL
       del archivo. BECTON DICKINSON esta cargado como "pdf" porque la vez
       anterior mandaron el PDF: con eso, su propio Excel se rechazaba.
       Peor todavia, la pantalla ya le dice al usuario que puede subir
       cualquiera de los dos — el cartel prometia lo que el servidor negaba.
       Un laboratorio cambia de PDF a Excel sin avisarle a nadie.
       Lo arregle el 30/10 y lo escribi SOLO aca, nunca en el repositorio:
       el 01/11 volvi a desplegar desde el repositorio y me lo lleve puesto.
       Por eso ahora vive en el archivo, no solo en el servidor. */
    const cfgPdf   = cfg.tipo === "pdf"   ? cfg : (cfg.pdf   ?? null);
    const cfgExcel = cfg.tipo === "excel" ? cfg : (cfg.excel ?? null);
    const avisosFormato: string[] = [];
    let cfgLeer: any;
    if (esPdf) {
      /* un PDF NO se describe solo: sin lectura propia va la generica, que
         es la que usan 5 de los 6 proveedores de PDF. */
      cfgLeer = cfgPdf ?? Object.assign({}, PDF_GENERICO, { tipo: "pdf" });
      if (!cfgPdf) {
        avisosFormato.push(
          `${prov.proveedor} no tiene lectura de PDF cargada: se leyo con la lectura ` +
          `generica. Si salen pocos renglones o precios raros, hay que medir las franjas ` +
          `de esta lista antes de confirmarla.`);
      }
    } else {
      cfgLeer = cfgExcel ?? { tipo: "excel" };
      if (!cfgExcel) {
        avisosFormato.push(
          `${prov.proveedor} no tiene lectura de Excel cargada: el archivo se leyo ` +
          `reconociendo los titulos de las columnas.`);
      }
    }

    const bytes = decodeBase64(b64);
    const leido: any = esPdf ? await leerPdf(bytes, cfgLeer, diag)
                             : await leerExcel(bytes, cfgLeer, diag);

    /* ---- la regla de costeo del laboratorio ---- */
    const factor = prov.factor === null || prov.factor === undefined ? 1 : Number(prov.factor);
    const moneda = String(prov.moneda ?? "ARS").toUpperCase();
    const avisos: string[] = [];
    if (prov.tipo_regla === "pendiente") {
      avisos.push(`La regla de costeo de ${prov.proveedor} esta PENDIENTE de definir: ` +
                  `el costo va igual al precio de lista, sin descuento.`);
    }
    if (prov.tipo_regla === "descuento_variable") {
      avisos.push(`${prov.proveedor}: el descuento es por pago anticipado, no por renglon. ` +
                  `El costo va al precio de la columna, sin descuento.`);
    }
    if (prov.tipo_regla === "dolar") {
      avisos.push(`La lista esta en dolares y NO se convierte: el precio viaja en US$ y la ` +
                  `columna Moneda dice DOLAR. No se inventa una cotizacion.`);
    }
    if (prov.tipo_regla === "columna") {
      avisos.push(`El costo sale de la columna "${cfgLeer.titulo_precio ?? "(sin titulo)"}" de la lista.`);
    }
    /* LO QUE LA LECTURA TUVO QUE RESOLVER SOLA SE DICE ARRIBA DE TODO.
       Que columna se eligio, en que idioma estaban los numeros y que
       lectura se uso: si eso no se declara, la pantalla muestra una lista
       prolija sin decir de donde salio cada cosa. */
    for (const a of avisosFormato) avisos.push(a);
    for (const a of (leido.avisos ?? [])) avisos.push(a);
    if (!prov.codigo_lista) {
      avisos.push(`${prov.proveedor} no tiene lista de precios de compra en Tango (cpa43): ` +
                  `la columna Cod. Lista va vacia.`);
    }

    const filas = leido.filas.map((f: any) => ({
      cod_proveedor: f.cod,
      descripcion: f.descripcion,
      precio_lista: f.precio,
      moneda: moneda === "USD" ? "USD" : "ARS",
      unidades_caja: f.caja,
      costo_calculado: f.precio === null || f.precio === undefined
        ? null : Math.round(f.precio * factor * 10000) / 10000,
    }));

    const conPrecio = filas.filter((f: any) => f.precio_lista !== null && f.precio_lista > 0).length;
    const conCaja = filas.filter((f: any) => f.unidades_caja !== null).length;
    if (conPrecio < filas.length) {
      avisos.push(`${filas.length - conPrecio} renglones de la lista no traen precio y no van a entrar.`);
    }
    if (!filas.length) {
      avisos.push(`No se leyo ningun renglon. Si el laboratorio cambio el formato de la lista, ` +
                  `hay que medir de nuevo las franjas de lectura antes de cargarla.`);
    }

    const resp: any = {
      ok: filas.length > 0,
      proveedor: prov.proveedor,
      proveedor_id: proveedorId,
      archivo: nombre,
      regla: { tipo: prov.tipo_regla, factor, texto: prov.regla, moneda },
      lectura: {
        /* COMO SE LEYO, no lo que dice la configuracion: informar el
           configurado habiendo leido otra cosa es ponerle a la pantalla un
           rotulo que no corresponde. */
        motor: leido.motor, tipo: esPdf ? "pdf" : "excel",
        tipo_configurado: cfg.tipo ?? null,
        columna_precio: leido.lectura_usada?.titulo_precio ?? cfgLeer.titulo_precio ?? null,
        paginas: leido.paginas ?? null, hojas: leido.hojas ?? null,
        filas_leidas: filas.length, con_precio: conPrecio,
        con_unidades_caja: conCaja, descartes: leido.descartes.length,
      },
      avisos,
      ms: Date.now() - arranque,
    };
    if (diag) resp.diag = { muestra: leido.muestra, descartes: leido.descartes.slice(0, 20) };
    if (resumir) {
      resp.muestra = filas.slice(0, 5);
      resp.compacto = filas.map((f: any) =>
        `${f.cod_proveedor}|${f.precio_lista ?? ""}|${f.unidades_caja ?? ""}`).join(";");
    } else {
      resp.filas = filas;
    }
    return json(resp);
  } catch (e) {
    return json({
      ok: false, filas: [],
      avisos: ["No se pudo leer el archivo: " + String((e as Error)?.message ?? e)],
      pila: String((e as Error)?.stack ?? "").substring(0, 700),
      ms: Date.now() - arranque,
    });
  }
});
