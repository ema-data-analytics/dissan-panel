// ============================================================================
//  AYUDA INTELIGENTE DISSAN
//  Circuito de una pregunta:
//    1. memoria      -> si ya se resolvio antes, se reusa la consulta (gratis)
//    2. contexto     -> ayuda.contexto_para recorta el DER para esa pregunta
//    3. modelo       -> escribe la consulta SQL
//    4. validador    -> ayuda.validar_sql: solo lectura, y cada tabla y cada
//                       columna tienen que existir de verdad
//    5. ejecucion    -> ayuda.ejecutar, con tope de tiempo y de filas
//    6. redaccion    -> el modelo explica el resultado en castellano
//    7. memoria      -> si salio bien, queda aprendida
//  Todo queda anotado en ayuda.registro con su costo.
//
//  ACCESO: ademas del JWT de Supabase, hay que mandar el encabezado
//  x-ayuda-token con el token guardado en ayuda.config. Sin eso no contesta.
// ============================================================================

import postgres from "npm:postgres@3.4.5";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 4 });

const API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODELO  = Deno.env.get("AYUDA_MODELO") ?? "claude-haiku-4-5";

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-ayuda-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }});

async function tokenEsperado(): Promise<string> {
  const [r] = await sql`select valor from ayuda.config where clave = 'token'`;
  return r?.valor ?? "";
}

const REGLAS = `Sos el motor de consultas del sistema de gestion de DISSAN (Drogueria Cuyo, Mendoza).
Te dan una pregunta de negocio y el recorte del mapa de la base que puede servir para contestarla.
Tenes que devolver UNA sola consulta SQL de PostgreSQL que la conteste.

REGLAS QUE NO SE NEGOCIAN
- Solo SELECT o WITH. Nada que escriba, borre o cambie algo.
- Usa unicamente las tablas y las columnas que figuran en el contexto. Si una columna
  no esta listada, no existe: no la inventes.
- Para unir tablas usa solo las relaciones listadas en COMO SE UNEN.
- Pone siempre un LIMIT (500 como maximo).
- Pone alias en castellano a las columnas del resultado, para que se entiendan.
- Si el contexto no alcanza para contestar, devolve exactamente: NO_SE_PUEDE

DATOS DEL NEGOCIO QUE CONVIENE SABER
- cotiza.presupuesto_linea tiene el historico de lo que se cotizo: precio_unit (sin IVA),
  costo_unit (sin IVA), margen_pct ya calculado, y se_gano (si llego a remito o factura).
- cotiza.presupuesto es la cabecera: cliente, fecha, tipo_compra, expediente.
  Se une por presupuesto_id.
- Los precios de Tango estan sin IVA salvo que la columna diga lo contrario.

Devolve SOLO la consulta SQL, sin explicaciones, sin markdown, sin backticks.`;

async function claude(system: string, user: string, maxTokens = 1200) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: maxTokens,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!r.ok) throw new Error("la API de Anthropic respondio " + r.status + ": " + (await r.text()).slice(0, 300));
  const d = await r.json();
  return {
    texto: (d.content?.[0]?.text ?? "").trim(),
    entrada: d.usage?.input_tokens ?? 0,
    salida: d.usage?.output_tokens ?? 0,
  };
}

const limpiarSql = (s: string) => s.replace(/^```(sql)?/i, "").replace(/```$/, "").trim();

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  // ---- control de acceso -------------------------------------------------
  let esperado = "";
  try { esperado = await tokenEsperado(); }
  catch { return json({ ok: false, respuesta: "No pude leer la configuracion de la ayuda." }, 500); }

  if (!esperado) {
    return json({ ok: false, respuesta:
      "La ayuda no tiene token configurado. Hay que cargar la fila 'token' en ayuda.config." }, 503);
  }
  if (req.headers.get("x-ayuda-token") !== esperado) {
    return json({ ok: false, respuesta: "No tenes permiso para usar la ayuda." }, 403);
  }

  let pregunta = "";
  try { pregunta = String((await req.json())?.pregunta ?? "").trim(); }
  catch { return json({ ok: false, respuesta: "No entendi la pregunta." }, 400); }
  if (!pregunta) return json({ ok: false, respuesta: "Escribi una pregunta." }, 400);

  const t0 = Date.now();
  let origen = "memoria", entrada = 0, salida = 0, consulta = "";

  try {
    // ---- 1. memoria -------------------------------------------------------
    const [rec] = await sql`select ayuda.recordar(${pregunta}) as r`;
    if (rec?.r?.sql) consulta = rec.r.sql;

    // ---- 2 y 3. contexto + modelo ----------------------------------------
    if (!consulta) {
      if (!API_KEY) {
        await sql`select ayuda.anotar(${pregunta}, null, false, 'falta ANTHROPIC_API_KEY', null, 'sin-clave', ${Date.now()-t0})`;
        return json({ ok: false, listo: false, respuesta:
          "Todavia no esta cargada la clave de Anthropic. Esta pregunta es nueva, asi que hace " +
          "falta el modelo para resolverla. Las preguntas ya aprendidas si funcionan." });
      }
      origen = "modelo";
      const [ctx] = await sql`select ayuda.contexto_para(${pregunta}, 8) as c`;
      const contexto = ctx?.c ?? "";
      if (!contexto) {
        await sql`select ayuda.anotar(${pregunta}, null, false, 'sin contexto', null, 'modelo', ${Date.now()-t0})`;
        return json({ ok: false, respuesta:
          "No encontre en el mapa de la base ninguna tabla que tenga que ver con eso. " +
          "Proba decirlo con otras palabras." });
      }
      const r1 = await claude(REGLAS, `PREGUNTA\n${pregunta}\n\nCONTEXTO\n${contexto}`);
      entrada += r1.entrada; salida += r1.salida;
      if (r1.texto.includes("NO_SE_PUEDE")) {
        await sql`select ayuda.anotar(${pregunta}, null, false, 'el modelo dijo que no se puede', null, 'modelo', ${Date.now()-t0}, ${entrada}, ${salida})`;
        return json({ ok: false, respuesta:
          "Con lo que hay en la base no se puede contestar eso. Decime de otra forma que necesitas y vemos." });
      }
      consulta = limpiarSql(r1.texto);
    }

    // ---- 4 y 5. validar y ejecutar (con un reintento) ---------------------
    let [ej] = await sql`select ayuda.ejecutar(${consulta}) as r`;
    let res = ej.r;

    if (!res.ok && origen === "modelo") {
      const [ctx2] = await sql`select ayuda.contexto_para(${pregunta}, 8) as c`;
      const r2 = await claude(REGLAS,
        `PREGUNTA\n${pregunta}\n\nCONTEXTO\n${ctx2?.c ?? ""}\n\n` +
        `Tu consulta anterior fallo. Corregila.\nCONSULTA:\n${consulta}\nERROR:\n${res.motivo}`);
      entrada += r2.entrada; salida += r2.salida;
      consulta = limpiarSql(r2.texto);
      [ej] = await sql`select ayuda.ejecutar(${consulta}) as r`;
      res = ej.r;
    }

    if (!res.ok) {
      await sql`select ayuda.anotar(${pregunta}, ${consulta}, false, ${res.motivo}, null, ${origen}, ${Date.now()-t0}, ${entrada}, ${salida})`;
      return json({ ok: false, sql: consulta, motivo: res.motivo, respuesta:
        "No pude armar una consulta que funcione para eso. Quedo anotado para corregirlo." });
    }

    // ---- 6. redaccion -----------------------------------------------------
    let respuesta: string;
    const datos = JSON.stringify(res.datos).slice(0, 12000);
    if (API_KEY) {
      const r3 = await claude(
        "Sos el asistente del sistema de DISSAN. Te dan una pregunta y el resultado de la consulta. " +
        "Contesta en castellano rioplatense, en dos o tres oraciones, con los numeros concretos. " +
        "Usa separador de miles con punto y decimales con coma. No inventes nada que no este en los " +
        "datos. Si el resultado vino vacio, decilo claramente.",
        `PREGUNTA\n${pregunta}\n\nFILAS (${res.filas})\n${datos}`, 600);
      entrada += r3.entrada; salida += r3.salida;
      respuesta = r3.texto;
    } else {
      respuesta = res.filas === 0 ? "La consulta no devolvio ninguna fila."
        : `Son ${res.filas} fila(s). El detalle esta abajo.`;
    }

    // ---- 7. aprender ------------------------------------------------------
    if (origen === "modelo") await sql`select ayuda.aprender(${pregunta}, ${consulta}, ${res.filas})`;
    await sql`select ayuda.anotar(${pregunta}, ${consulta}, true, null, ${res.filas}, ${origen}, ${Date.now()-t0}, ${entrada}, ${salida})`;

    return json({ ok: true, respuesta, sql: consulta, filas: res.filas, datos: res.datos,
                  origen, ms: Date.now() - t0,
                  costo_usd: +(entrada * 1e-6 + salida * 5e-6).toFixed(6) });

  } catch (e) {
    const m = String((e as Error)?.message ?? e);
    try { await sql`select ayuda.anotar(${pregunta}, ${consulta}, false, ${m}, null, ${origen}, ${Date.now()-t0}, ${entrada}, ${salida})`; } catch { /* nada */ }
    return json({ ok: false, respuesta: "Se cayo la ayuda: " + m }, 500);
  }
});
