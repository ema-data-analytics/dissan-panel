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
]);

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

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
function numeroCelda(v: any): number | null {
  const x = valorCelda(v);
  if (typeof x === "number" && isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x.replace(/\s/g, "").replace(/\./g, "").replace(/,/g, "."));
    if (isFinite(n) && x.trim() !== "") return n;
  }
  return null;
}

async function leerExcel(bytes: Uint8Array, cfg: any, diag: boolean) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes as any);
  const hojas: any[] = cfg.hojas ?? [{ hoja: cfg.hoja, fila_datos: cfg.fila_datos }];
  const filas: any[] = [];
  const descartes: any[] = [];
  const muestra: any[] = [];
  const nombres = wb.worksheets.map((w: any) => w.name);

  for (const h of hojas) {
    const nombre = h.hoja ?? nombres[0];
    const hoja: any = wb.getWorksheet(nombre);
    if (!hoja) {
      descartes.push({ porque: `el archivo no tiene la hoja "${nombre}"`, hojas: nombres });
      continue;
    }
    const ultima = hoja.rowCount || 0;
    let grupo: string | null = null;
    for (let r = Number(h.fila_datos ?? 1); r <= ultima; r++) {
      const fila = hoja.getRow(r);
      if (cfg.col_grupo) {
        const g = txt(fila.getCell(cfg.col_grupo).value);
        if (g) grupo = g;
      }
      const cod = txt(fila.getCell(cfg.col_cod).value);
      if (cod === null) continue;
      if (HDR.has(sinTildes(cod).toUpperCase())) continue;
      const d1 = cfg.col_desc ? txt(fila.getCell(cfg.col_desc).value) : null;
      const d2 = cfg.col_desc2 ? txt(fila.getCell(cfg.col_desc2).value) : null;
      const desc = [grupo, d1, d2].filter((x) => x).join(" ") || null;
      const precio = numeroCelda(fila.getCell(cfg.col_precio).value);
      let caja: number | null = null;
      if (cfg.col_caja) {
        const c = numeroCelda(fila.getCell(cfg.col_caja).value);
        caja = c !== null && c > 0 ? c : null;
      }
      if (precio === null || precio <= 0) descartes.push({ cod, porque: "sin precio en la lista", fila: r });
      filas.push({ cod, descripcion: desc, precio, caja, hoja: nombre, fila: r });
      if (diag && muestra.length < 12) muestra.push({ hoja: nombre, fila: r, cod, desc, precio, caja });
    }
  }
  return { filas, descartes, motor: "npm:exceljs@4.4.0", hojas: nombres, muestra };
}

/* ------------------------------------------------------------------ servir */

const IMAGEN = /\.(jpe?g|png|gif|bmp|webp|tiff?|heic)$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
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
    if (!cfg.tipo) {
      return json({ ok: false, filas: [],
        avisos: [`${prov.proveedor} no tiene cargada la configuracion de lectura ` +
                 `(cotiza.lista_proveedor.lectura).`] });
    }
    if ((esPdf && cfg.tipo !== "pdf") || (esXls && cfg.tipo !== "excel")) {
      return json({ ok: false, filas: [],
        avisos: [`${prov.proveedor} manda la lista en ${String(cfg.tipo).toUpperCase()} y este ` +
                 `archivo es ${esPdf ? "PDF" : "Excel"}. Si el laboratorio cambio el formato hay ` +
                 `que actualizar la configuracion de lectura antes de cargarla.`] });
    }

    const bytes = decodeBase64(b64);
    const leido: any = esPdf ? await leerPdf(bytes, cfg, diag) : await leerExcel(bytes, cfg, diag);

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
      avisos.push(`El costo sale de la columna "${cfg.titulo_precio ?? "(sin titulo)"}" de la lista.`);
    }
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
        motor: leido.motor, tipo: cfg.tipo,
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
