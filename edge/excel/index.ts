// EL EXCEL DE LA AYUDA — como el que arma DISSAN.           15/10/2026
//
// ---------------------------------------------------------------------------
// POR QUE EXISTE, Y POR QUE NO LO HACE APPS SCRIPT
//
// El boton "Bajar a Excel" de la Ayuda tiraba un CSV de una sola hoja con los
// nombres CRUDOS de la base (oc_nro, precio_oc_neto). El archivo que arma
// DISSAN (OC-contra-pedido-agosto-2026.xlsx) tiene cinco hojas, titulos en
// castellano, formato numerico por columna, anchos, panel congelado,
// autofiltro, formato condicional, y -- lo mas importante -- FORMULAS VIVAS:
// el Resumen y Bajo costo se calculan sobre la hoja Detalle, asi que el
// archivo no se contradice a si mismo.
//
// NO se arma con SpreadsheetApp de Apps Script a proposito: eso agrega el
// permiso de Google "spreadsheets" al proyecto, y un permiso nuevo puede
// obligar al duenio a re-autorizar la aplicacion web. Romper el panel que
// anda para agregar una exportacion no se hace. Aca no hace falta ningun
// permiso de Google.
//
// ---------------------------------------------------------------------------
// LAS DOS TRAMPAS, MEDIDAS CONTRA EL ARCHIVO DE DISSAN
//
// 1. ESCALA. La base devuelve porc_bonif = 6 y 12. El archivo de DISSAN
//    guarda 0,06 y 0,12, porque su formato es 0.0% y su formula de precio
//    neto es L*(1-M). Escrito en crudo, un 6 con formato 0.0% se lee
//    SEISCIENTOS POR CIENTO y la formula da precio negativo. La columna
//    'escala' de public.columna_formato lo resuelve.
//    Control: precio_oc_unit * (1 - porc_bonif/100) = precio_oc_neto
//    (202,34 y 4.080,44 exactos); con (1 - porc_bonif) da -5.997,20.
//
// 2. QUE COLUMNA ES FORMULA. En el archivo de DISSAN ocho columnas no son
//    valores. Se replican siete. La octava, "Comparable", NO se copia: su
//    formula es =IF(AND(moneda="$",precio_oc>=10,cant_pedido<>""),"SI","NO"),
//    que es la regla de antes del 08/10 y deja pasar los costos inflados por
//    envase y los que son menos del 5% del precio. Comparable y Observacion
//    salen de la BASE. Si se copiara su formula, el Excel diria una cosa y la
//    pantalla otra, que es el defecto que mas veces mordio en este proyecto.
//
// ---------------------------------------------------------------------------
// 31/10/2026 — DOS DEFECTOS MAS, ENCONTRADOS ABRIENDO EL ARCHIVO BAJADO
//
// 3. UN CODIGO NO ES UN NUMERO. cod_deposi vale '03' en la base y en la
//    pantalla, y en el .xlsx salia 3: la linea que convertia convertia
//    CUALQUIER texto que pareciera numero. Es el defecto de la OC 5245 que
//    salia 5.245, del 23/10, un piso mas abajo. Ahora solo se convierte si
//    la COLUMNA tiene formato numerico; con formato General, lo que la base
//    manda como texto queda texto.
//
// 4. UN PRECIO UNITARIO NO SE SUMA. La hoja Resumen escribia "Suma de Costo
//    Unitario": sumar precios por unidad de articulos distintos no significa
//    nada, igual que sumar fechas o sumar dias (15/10). Esas columnas salen
//    de los totales, pero NO desaparecen en silencio: van aparte, con el
//    promedio y con el motivo escrito al lado.
// ---------------------------------------------------------------------------

import ExcelJS from "npm:exceljs@4.4.0";

const VERDE_DISSAN = "FF17525F";   // el fondo del encabezado de su archivo
const ROJO = "FFC00000";

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

/** numero de columna -> letra de Excel (1 -> A, 27 -> AA) */
function letra(n: number): string {
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
  return s;
}

/** '2026-08-03' -> Date. Cualquier otra cosa vuelve como vino. */
function aFecha(v: unknown): unknown {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const [a, m, d] = v.substring(0, 10).split("-").map(Number);
    return new Date(Date.UTC(a, m - 1, d));
  }
  return v;
}

function esNumero(v: unknown): boolean {
  return typeof v === "number" || (typeof v === "string" && v !== "" && !isNaN(Number(v)));
}

/** La COLUMNA es numerica? Lo dice su formato, no el valor que vino.
    'General' no tiene ni # ni 0; '#,##0.00', '0 "dias"' y '0.0"%"' si. */
function formatoNumerico(f: unknown): boolean {
  return /[#0]/.test(String(f ?? ""));
}

/** Un valor POR UNIDAD no se totaliza: sumar precios unitarios de articulos
    distintos no significa nada. Se decide por el nombre de la columna. */
function esPorUnidad(c: string): boolean {
  return /(unitario|_unit$|_unit_|^unit_|por_unidad)/i.test(String(c ?? ""));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const arranque = Date.now();

  try {
    const cuerpo = await req.json().catch(() => ({}));
    const datos: any[] = Array.isArray(cuerpo?.datos) ? cuerpo.datos : [];
    const pregunta = String(cuerpo?.pregunta ?? "").trim();
    const lectura = String(cuerpo?.lectura ?? "").trim();
    const titulo = String(cuerpo?.titulo ?? "").trim();

    if (!datos.length) return json({ ok: false, motivo: "No llegaron filas que escribir." });

    const cols = Object.keys(datos[0]);
    const n = datos.length;

    /* ---- 1. Como se llama y como se muestra cada columna (de la base) ----- */
    const meta: any[] = await rpc("api_columnas_formato", { p_columnas: cols });
    const porNombre: Record<string, any> = {};
    const letraDe: Record<string, string> = {};
    meta.forEach((m, i) => { porNombre[m.columna] = m; letraDe[m.columna] = letra(i + 1); });

    /* es el informe de OC contra pedido? */
    const esOC = ["oc_nro", "pedido_nro", "comparable", "margen_pesos"].every((c) => cols.includes(c));

    /* ---- 2. El libro ------------------------------------------------------ */
    const wb = new ExcelJS.Workbook();
    wb.creator = "EMA DATA ANALYTIC — panel DISSAN";
    wb.created = new Date();

    const hojaDatos = wb.addWorksheet(esOC ? "Detalle" : "Datos");

    /* encabezado */
    hojaDatos.columns = meta.map((m) => ({ header: m.titulo, key: m.columna, width: Number(m.ancho) || 14 }));
    const enc = hojaDatos.getRow(1);
    enc.height = 30;
    enc.eachCell((c: any) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_DISSAN } };
      c.alignment = { vertical: "middle", wrapText: true };
    });

    /* filas: valor, o formula cuando la columna la tiene */
    for (let i = 0; i < n; i++) {
      const f = i + 2;                      // numero de fila en la hoja
      const fila = hojaDatos.getRow(f);
      meta.forEach((m, j) => {
        const celda = fila.getCell(j + 1);
        if (m.formula) {
          /* {nombre_de_columna} -> letra, {f} -> numero de fila */
          let f0 = String(m.formula).replace(/\{f\}/g, String(f));
          f0 = f0.replace(/\{([a-z0-9_]+)\}/g, (_: string, c: string) => letraDe[c] ?? "#REF!");
          celda.value = { formula: f0.replace(/^=/, "") } as any;
        } else {
          let v: any = datos[i][m.columna];
          if (v === null || v === undefined) v = "";
          if (String(m.formato || "").indexOf("yyyy") >= 0) v = aFecha(v);
          else if (formatoNumerico(m.formato)) {
            /* La columna es numerica: se convierte y se aplica la escala. */
            if (esNumero(v)) v = Number(v) * Number(m.escala || 1);
          } else if (typeof v === "number") {
            /* Vino numero de verdad: se respeta la escala igual. */
            v = v * Number(m.escala || 1);
          }
          /* Si la columna NO es numerica y la base mando TEXTO, queda texto.
             Es lo que salva el '03' de cod_deposi de salir 3. */
          celda.value = v;
        }
        if (m.formato && m.formato !== "General") celda.numFmt = m.formato;
      });
    }

    const ultima = letra(cols.length);
    hojaDatos.views = [{ state: "frozen", xSplit: esOC ? 2 : 0, ySplit: 1 }];
    hojaDatos.autoFilter = { from: "A1", to: `${ultima}${n + 1}` };

    /* en rojo lo que da negativo, como su archivo */
    for (const c of ["margen_pesos", "margen_pct", "margen_unitario"]) {
      if (!letraDe[c]) continue;
      hojaDatos.addConditionalFormatting({
        ref: `${letraDe[c]}2:${letraDe[c]}${n + 1}`,
        rules: [{ type: "cellIs", operator: "lessThan", priority: 1, formulae: ["0"],
                  style: { font: { color: { argb: ROJO }, bold: true } } } as any],
      });
    }

    const hojas = [hojaDatos.name];

    /* ---- 3. Resumen: formulas vivas sobre la hoja de datos ---------------- */
    const R = wb.addWorksheet("Resumen");
    R.columns = [{ width: 44 }, { width: 22 }, { width: 62 }];
    const D = hojaDatos.name;
    const rango = (c: string) => `${D}!${letraDe[c]}2:${letraDe[c]}${n + 1}`;
    const filasR: any[][] = [];
    filasR.push([titulo || pregunta || "Consulta", null, null]);
    filasR.push([`Generado el ${new Date().toLocaleDateString("es-AR")} sobre la base Tango en Supabase`, null, null]);
    filasR.push([null, null, null]);
    filasR.push(["Alcance", null, null]);
    filasR.push(["Renglones", { formula: `COUNTA(${D}!A2:A${n + 1})` },
                 "Un renglon = una fila de la consulta"]);

    if (esOC) {
      filasR.push(["Ordenes de compra distintas",
        { formula: `SUMPRODUCT((${rango("oc_nro")}<>"")/COUNTIF(${rango("oc_nro")},${rango("oc_nro")}&""))` }, null]);
      filasR.push(["Pedidos de venta distintos",
        { formula: `SUMPRODUCT((${rango("pedido_nro")}<>"")/COUNTIF(${rango("pedido_nro")},${rango("pedido_nro")}&""))` }, null]);
      filasR.push(["Clientes distintos",
        { formula: `SUMPRODUCT((${rango("cliente")}<>"")/COUNTIF(${rango("cliente")},${rango("cliente")}&""))` }, null]);
      filasR.push(["Renglones comparables", { formula: `COUNTIF(${rango("comparable")},"SI")` },
                   "El resto se aparta y dice por que en la columna Observacion"]);
      filasR.push([null, null, null]);
      filasR.push(["Resultado sobre lo comparable", null, null]);
      filasR.push(["Venta", { formula: `SUM(${rango("venta_comparable")})` }, null]);
      filasR.push(["Costo de la orden de compra", { formula: `SUM(${rango("costo_comparable")})` }, null]);
      filasR.push(["Margen", { formula: `SUM(${rango("margen_pesos")})` }, null]);
      filasR.push(["Margen % sobre la venta",
        { formula: `IF(B13=0,"",B15/B13)` }, "ponderado: suma del margen / suma de la venta"]);
      filasR.push(["Margen % sobre el costo",
        { formula: `IF(B14=0,"",B15/B14)` }, "el marcado, como lo mira DISSAN"]);
      filasR.push([null, null, null]);
      filasR.push(["Vendido por debajo del costo", null, null]);
      filasR.push(["Renglones", { formula: `COUNTIF(${rango("margen_pesos")},"<0")` }, null]);
      filasR.push(["Perdida", { formula: `SUMIF(${rango("margen_pesos")},"<0")` },
                   "suma del margen solo en los renglones negativos"]);
    } else {
      /* generico: suma de cada columna numerica, MENOS las que son por unidad */
      const sumables = meta.filter((m) => String(m.formato || "").indexOf("#") >= 0);
      const totales = sumables.filter((m) => !esPorUnidad(m.columna));
      const aparte  = sumables.filter((m) =>  esPorUnidad(m.columna));
      totales.forEach((m) => {
        filasR.push([`Suma de ${m.titulo}`, { formula: `SUM(${rango(m.columna)})` }, null]);
      });
      /* No desaparecen en silencio: van con el promedio y con el motivo. */
      if (aparte.length) {
        filasR.push([null, null, null]);
        filasR.push(["Lo que NO se suma, y por que", null, null]);
        aparte.forEach((m) => {
          filasR.push([`Promedio de ${m.titulo}`, { formula: `AVERAGE(${rango(m.columna)})` },
            "es un valor POR UNIDAD: sumar el de articulos distintos no significa nada, "
            + "como no significa nada sumar fechas. Va el promedio."]);
        });
      }
    }
    filasR.forEach((f) => R.addRow(f));
    R.getRow(1).font = { bold: true, size: 14 };
    /* los renglones en negrita son los titulos de seccion del armado de OC.
       En el generico solo existe "Alcance" en la fila 4: poner en negrita la
       11 y la 18 pintaria un renglon cualquiera. */
    (esOC ? [4, 11, 18] : [4]).forEach((i) => { const r = R.getRow(i); if (r) r.font = { bold: true }; });
    R.getColumn(3).font = { color: { argb: "FF64748B" }, size: 10 };
    if (esOC) {
      [13, 14, 15, 21].forEach((i) => { R.getCell(`B${i}`).numFmt = "#,##0.00"; });
      [16, 17].forEach((i) => { R.getCell(`B${i}`).numFmt = "0.0%"; });
      R.getCell("B20").numFmt = "#,##0";
    }
    hojas.push("Resumen");

    /* ---- 4. Bajo costo y Sin comparar: apuntan a la hoja de datos --------- */
    if (esOC) {
      const bajo: number[] = [];
      const sin: number[] = [];
      datos.forEach((d, i) => {
        const m = Number(d.margen_pesos);
        if (d.comparable === "SI" && !isNaN(m) && m < 0) bajo.push(i + 2);
        if (d.comparable !== "SI") sin.push(i + 2);
      });

      if (bajo.length) {
        const B = wb.addWorksheet("Bajo costo");
        B.columns = [{ width: 9 }, { width: 11 }, { width: 10 }, { width: 34 }, { width: 14 },
                     { width: 38 }, { width: 15 }, { width: 14 }, { width: 11 }, { width: 10 },
                     { width: 14 }, { width: 12 }];
        B.addRow([`Renglones vendidos por debajo del costo de la orden de compra: ${bajo.length} de ${n}`]);
        B.addRow(["Cada celda apunta a la hoja " + D + ": si se corrige alla, esto se actualiza solo"]);
        B.addRow([]);
        B.addRow(["OC N°", "Fecha OC", "Pedido N°", "Cliente", "Código", "Descripción",
                  "Precio venta", "Precio OC neto", "Venta / OC", "Margen %", "Pérdida $", "Fila " + D]);
        const mapa = ["oc_nro", "fecha_oc", "pedido_nro", "cliente", "codigo_articulo", "descripcion",
                      "precio_venta_unit", "precio_oc_neto"];
        bajo.sort((a, b) => Number(datos[a - 2].margen_pesos) - Number(datos[b - 2].margen_pesos));
        bajo.forEach((f) => {
          const r = B.addRow([]);
          mapa.forEach((c, j) => { r.getCell(j + 1).value = { formula: `${D}!${letraDe[c]}${f}` } as any; });
          r.getCell(9).value  = { formula: `IF(${D}!${letraDe["precio_oc_neto"]}${f}=0,"",${D}!${letraDe["precio_venta_unit"]}${f}/${D}!${letraDe["precio_oc_neto"]}${f})` } as any;
          r.getCell(10).value = { formula: `${D}!${letraDe["margen_pct"]}${f}` } as any;
          r.getCell(11).value = { formula: `${D}!${letraDe["margen_pesos"]}${f}` } as any;
          r.getCell(12).value = f;
          r.getCell(2).numFmt = "dd/mm/yyyy";
          r.getCell(7).numFmt = "#,##0.00"; r.getCell(8).numFmt = "#,##0.00";
          r.getCell(9).numFmt = "0.000";    r.getCell(10).numFmt = "0.0%";
          r.getCell(11).numFmt = "#,##0.00";
        });
        B.getRow(1).font = { bold: true, size: 12 };
        B.getRow(2).font = { color: { argb: "FF64748B" }, size: 10 };
        B.getRow(4).eachCell((c: any) => {
          c.font = { bold: true, color: { argb: "FFFFFFFF" } };
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_DISSAN } };
        });
        B.views = [{ state: "frozen", ySplit: 4 }];
        B.autoFilter = { from: "A4", to: `L${4 + bajo.length}` };
        hojas.push("Bajo costo");
      }

      if (sin.length) {
        const S = wb.addWorksheet("Sin comparar");
        S.columns = [{ width: 9 }, { width: 10 }, { width: 14 }, { width: 38 },
                     { width: 15 }, { width: 15 }, { width: 56 }];
        S.addRow([`Renglones que no entran en los totales: ${sin.length} de ${n}`]);
        S.addRow(["Son los que tienen NO en la columna Comparable. El motivo esta en Observacion."]);
        S.addRow([]);
        S.addRow(["OC N°", "Pedido N°", "Código", "Descripción", "Precio venta", "Precio OC", "Por qué"]);
        const m2 = ["oc_nro", "pedido_nro", "codigo_articulo", "descripcion",
                    "precio_venta_unit", "precio_oc_neto", "observacion"];
        sin.forEach((f) => {
          const r = S.addRow([]);
          m2.forEach((c, j) => { r.getCell(j + 1).value = { formula: `${D}!${letraDe[c]}${f}` } as any; });
          r.getCell(5).numFmt = "#,##0.00"; r.getCell(6).numFmt = "#,##0.00";
          r.getCell(7).alignment = { wrapText: true };
        });
        S.getRow(1).font = { bold: true, size: 12 };
        S.getRow(2).font = { color: { argb: "FF64748B" }, size: 10 };
        S.getRow(4).eachCell((c: any) => {
          c.font = { bold: true, color: { argb: "FFFFFFFF" } };
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_DISSAN } };
        });
        hojas.push("Sin comparar");
      }
    }

    /* ---- 5. La lectura, escrita, adentro del archivo ---------------------- */
    if (lectura) {
      const L = wb.addWorksheet("Lectura");
      L.columns = [{ width: 118 }];
      L.addRow([pregunta || "La lectura"]).font = { bold: true, size: 13 };
      L.addRow([]);
      lectura.split(/\n/).forEach((p) => {
        const r = L.addRow([p.replace(/\*\*/g, "")]);
        r.getCell(1).alignment = { wrapText: true, vertical: "top" };
        r.height = Math.max(16, Math.ceil(p.length / 110) * 16);
      });
      L.addRow([]);
      L.addRow(["Escrita por el modelo sobre los totales calculados en SQL. Ninguna cifra sale de una estimacion."])
        .font = { color: { argb: "FF64748B" }, size: 9, italic: true };
      hojas.push("Lectura");
    }

    /* ---- 6. Metodo -------------------------------------------------------- */
    const M = wb.addWorksheet("Método");
    M.columns = [{ width: 30 }, { width: 108 }];
    M.addRow(["Cómo se armó este archivo"]).font = { bold: true, size: 13 };
    const metodo: [string, string][] = esOC ? [
      ["El vínculo", "El número de pedido de venta está escrito en las observaciones del RENGLON de la orden de compra (cpa36.observaciones). El campo propio de la cabecera esta lleno en 2 de 5.307 OC: esta abandonado."],
      ["Normalización", "El pedido se guarda de varias formas ('7567', '30175', '0000100014910'). Se normaliza con right(btrim(x),8) y la liga resuelta vive en public.oc_pedido_puente: 5.720 renglones, 99,70% resuelto."],
      ["El pedido se agrupa", "Un pedido puede traer el mismo articulo en varios renglones (lotes). Antes se unia renglon contra renglon y una sola fila de OC salia hasta 9 veces. Ahora el pedido se agrupa por articulo: la cantidad se suma y el precio va ponderado por cantidad."],
      ["Precio de venta", "gva03.precio, unitario y sin IVA."],
      ["Precio de compra", "cpa36.precio, unitario y sin IVA, menos la bonificacion del renglon."],
      ["Bonificación", "porc_dcto se guarda en el renglon pero Tango NO lo descuenta del importe. El archivo lo aplica en la columna Precio OC neto."],
      ["Cantidad comparable", "La menor entre la cantidad del pedido y la de la OC."],
      ["Qué entra en los totales", "Solo los renglones con SI en Comparable. Se apartan cuatro casos, todos medidos el 08/10/2026: el articulo se compra por caja y Tango no tiene el factor caja-a-unidad (inflaba costos 30x, 20x y 10x); el costo es menor al 5% del precio de venta (es un error de carga, casi siempre un factor de 1.000); el costo es mas de 4 veces el precio; el costo es menor a $1."],
      ["Diferencia con el Excel de octubre", "Aquel archivo marcaba Comparable con la regla vieja (moneda pesos y precio de OC >= 10). Por eso contaba 9 renglones que aca se apartan: COLO0145 x5, COLO0147 x2 y XDIMEK001 por falta de factor de envase, y COLO0138 por costo menor al 5% del precio. Las dos reglas son posteriores y son correctas."],
      ["Control", "Sobre agosto 2026 los dos archivos dan 219 renglones y, en los 203 que ambos llaman comparables, coinciden 203/203 en cantidad de pedido, precio de venta, cantidad de OC y precio de OC. El margen total difiere $72,57 sobre $74,6 millones porque el Excel redondea el unitario a 2 decimales y la base guarda 4."],
    ] : [
      ["De dónde sale", "De una consulta ejecutada en el momento contra la base Tango migrada a Supabase. No es un archivo guardado."],
      ["Los totales", "La hoja Resumen suma con formulas sobre la hoja Datos: si se corrige un valor alla, el total se actualiza solo."],
      ["Lo que no se suma", "Las columnas de valor POR UNIDAD (precio unitario, costo unitario, margen unitario) no se totalizan: sumar el precio por unidad de articulos distintos no significa nada. Van aparte, con el promedio y el motivo escrito. Las fechas y los contadores de dias tampoco se suman."],
      ["Codigos", "Un codigo va como texto, no como numero: el deposito '03' tiene que decir 03 y no 3, o no liga contra Tango."],
    ];
    metodo.forEach(([a, b]) => {
      const r = M.addRow([a, b]);
      r.getCell(1).font = { bold: true };
      r.getCell(2).alignment = { wrapText: true, vertical: "top" };
      r.height = Math.max(16, Math.ceil(b.length / 105) * 15);
    });
    M.addRow([]);
    M.addRow(["Pregunta", pregunta || "(sin pregunta)"]);
    M.addRow(["Generado", new Date().toLocaleString("es-AR")]);
    hojas.push("Método");

    /* ---- 7. A bytes ------------------------------------------------------- */
    const buf = await wb.xlsx.writeBuffer();
    const bytes = new Uint8Array(buf as ArrayBuffer);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const b64 = btoa(bin);

    return json({
      ok: true,
      base64: b64,
      bytes: bytes.length,
      hojas,
      filas: n,
      columnas: cols.length,
      es_informe_oc: esOC,
      zip_ok: bytes[0] === 0x50 && bytes[1] === 0x4b,
      ms: Date.now() - arranque,
    });
  } catch (e) {
    return json({ ok: false, origen: "excepcion",
                  motivo: String((e as Error)?.message ?? e),
                  pila: String((e as Error)?.stack ?? "").substring(0, 600),
                  ms: Date.now() - arranque });
  }
});
