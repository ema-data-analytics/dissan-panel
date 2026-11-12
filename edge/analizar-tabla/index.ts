// ===========================================================================
// ANALIZAR UNA TABLA: QUE SIGNIFICA, NO QUE FORMA TIENE        12/11/2026
// ===========================================================================
// POR QUE EXISTE. El mapa tiene las 627 tablas y los 10.642 campos MEDIDOS:
// tipos, rangos, llenado, conexiones. Pero el `significado` era mecanico —
// repetia la forma con otras palabras. Medido el 12/11, tres ejemplos:
//
//   gva12.t_comp   -> "Apunta a gva12de.t_comp: el 75% de sus valores existe
//                      alla". NO dice que DVM y DMZ son las notas de credito,
//                      y por eso la Ayuda contesto "cero notas de credito en
//                      octubre" cuando eran 6.
//   sta11.stock    -> decia "NUNCA SE USO". Son 14.648 en true: es el campo
//                      que separa mercaderia propia de CONSIGNACION, el 32%
//                      de lo facturado.
//   cpa04.mon_cte  -> decia "NUNCA SE USO". Son 91 facturas en false.
//
// Los dos ultimos ya se arreglaron remidiendo (eran un defecto del medidor,
// que leia `false` como ausencia de dato). El primero NO se arregla midiendo:
// hay que SABER que DVM es una nota de credito. Eso es lo que escribe esto.
//
// QUE HACE. Recibe el nombre de una tabla, le pasa al modelo LO MEDIDO de cada
// campo -nunca la tabla entera- con sus ejemplos reales y sus conexiones, y el
// modelo declara que registra la tabla y que significa cada campo EN EL
// NEGOCIO. Se guarda con api_mapa_guardar_analisis, que RECHAZA cualquier
// columna que el modelo invente: una columna inventada en el mapa es peor que
// un mapa incompleto.
//
// LO MEDIDO NO SE TOCA. El significado se escribe al lado; que_es, llenos,
// distintos y las conexiones quedan como los midio la base.
// ===========================================================================

const MODELO = "claude-opus-5-5";
/* EL TOPE DE SALIDA CORTA LAS TABLAS GRANDES EN SILENCIO.     12/11/2026
   Con 8.000 el modelo se quedaba sin espacio escribiendo los significados de
   las tablas con mas de ~100 campos y devolvia la herramienta con la lista de
   campos VACIA. Y lo peor: contestaba ok = true, origen = "analizada", con
   que_registra escrito y campos_escritos = 0. O sea, pasaba por buena.
   Medido: cpa04 (137 campos) -> 0 escritos en 70 s; sta16 (86) -> 76 escritos.
   Las tres tablas mas grandes de la base -cpa04, sua29, sta16- son las unicas
   que quedaron sin analizar de las 627, y cpa04 es la cabecera de facturas de
   compra que usan todas las identidades.
   No se paga por el tope sino por lo que se genera, asi que subirlo no cuesta
   nada en las tablas chicas. */
const MAX_TOKENS = 24000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (c: unknown, status = 200) =>
  new Response(JSON.stringify(c), { status, headers: { "Content-Type": "application/json", ...CORS } });

async function rpc(nombre: string, args: Record<string, unknown>, jwt: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || jwt;
  const r = await fetch(`${url}/rest/v1/rpc/${nombre}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anon, Authorization: `Bearer ${jwt}` },
    body: JSON.stringify(args),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${nombre}: ${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
}

const HERRAMIENTA = {
  name: "escribir_significado",
  description:
    "Declara que registra la tabla y que significa cada campo en el negocio. " +
    "Un campo por el que no puedas decir nada util NO se incluye: es mejor dejarlo " +
    "como esta que llenarlo con palabras.",
  input_schema: {
    type: "object",
    properties: {
      que_registra: {
        type: "string",
        description:
          "Que guarda esta tabla, en una o dos frases, en castellano y en terminos del " +
          "negocio. Deci QUE ES, no cuantas filas tiene ni cuantos campos: eso ya esta medido.",
      },
      campos: {
        type: "array",
        description: "Solo los campos sobre los que tengas algo util que decir.",
        items: {
          type: "object",
          properties: {
            columna: { type: "string", description: "El nombre EXACTO, como te llego." },
            significado: {
              type: "string",
              description:
                "Que es ese campo en el negocio, en una o dos frases. Si es una lista corta de " +
                "codigos, deci QUE SIGNIFICA CADA CODIGO cuando lo podes deducir de los ejemplos, " +
                "del nombre o de la tabla a la que apunta — eso es lo mas valioso que podes " +
                "escribir. Si NO lo podes deducir, decilo con esas palabras: 'no se puede deducir " +
                "de lo medido'. Si el campo es una trampa (esta abandonado, parece una cosa y es " +
                "otra, hay que convertirlo por una cotizacion), decilo primero.",
            },
          },
          required: ["columna", "significado"],
        },
      },
    },
    required: ["que_registra", "campos"],
  },
};

function instrucciones() {
  return `Sos analista de datos y estas documentando la base de DISSAN, una drogueria de insumos
medicos de Mendoza. La base son las tablas de Tango Gestion migradas a PostgreSQL, con los
nombres crudos de Tango (gva12, cpa04, sta11): los nombres no dicen nada y por eso existe este
trabajo.

Te paso UNA tabla con TODO LO QUE YA SE MIDIO de ella contra los datos reales: cuantas filas
tiene, que forma tiene cada campo, cuantos valores distintos, ejemplos de verdad, y a que otras
tablas apunta cada campo con que cobertura.

TU TRABAJO ES ESCRIBIR EL SIGNIFICADO, NO REPETIR LA MEDICION.
Esta mal: "NUMERO, de 0 a 87247019, 3778 valores distintos".
Esta bien: "Importe total del comprobante, con IVA incluido y en pesos".

LO MAS VALIOSO QUE PODES ESCRIBIR SON LOS CODIGOS.
Si un campo es una lista corta -por ejemplo t_comp con valores FAC, DVM, DMZ, N/C, N/D- deci
que significa cada uno. Un codigo sin traducir hace que una consulta filtre por el valor
equivocado y devuelva CERO pareciendo una respuesta. Eso ya paso en este sistema: se filtro
t_comp = 'N/C' para contar notas de credito y dio cero, cuando las notas de credito de esta
empresa son DVM y DMZ.

NO INVENTES. Si no podes deducir que significa un campo de lo medido, del nombre o de la tabla
a la que apunta, escribi "no se puede deducir de lo medido" y pasa al siguiente. Una columna
inventada o un significado adivinado es peor que un campo sin documentar: el que lea el mapa
despues le va a creer. Y no inventes nombres de columna: usa los que te llegaron, exactos.

LAS TRAMPAS VAN PRIMERO. Si un campo esta abandonado, si guarda un importe en otra moneda que
hay que convertir, si parece una cosa y es otra, o si su nombre engaña, eso va al principio del
significado y no al final.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const t0 = Date.now();
  try {
    const cuerpo = await req.json().catch(() => ({}));
    const tabla = String(cuerpo?.tabla ?? "").trim();
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ ok: false, origen: "sin_sesion", respuesta: "Volvé a entrar." }, 401);
    if (!tabla) return json({ ok: false, origen: "vacia", respuesta: "Falta el nombre de la tabla." });

    const llave = Deno.env.get("ANTHROPIC_API_KEY");
    if (!llave) return json({ ok: false, origen: "configuracion", respuesta: "Falta ANTHROPIC_API_KEY." });

    const datos = await rpc("api_mapa_para_analizar", { p_tabla: tabla }, jwt);
    if (!datos || !datos.tabla) return json({ ok: false, origen: "sin_tabla", tabla, respuesta: "Esa tabla no esta en el mapa." });
    const campos: any[] = Array.isArray(datos.campos) ? datos.campos : [];
    if (!campos.length) return json({ ok: true, origen: "sin_campos", tabla, respuesta: "La tabla no tiene ningun campo con datos.", ms: Date.now() - t0 });

    const pres = await rpc("api_ia_presupuesto", { p_estimado_usd: 0.05 }, jwt).catch(() => null);
    if (pres && pres.permite === false) {
      return json({ ok: false, origen: "sin_presupuesto", tabla, presupuesto: pres,
                    respuesta: "El presupuesto del dia esta usado (" + pres.motivo + ")." });
    }

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": llave, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: MAX_TOKENS,
        system: [{ type: "text", text: instrucciones(), cache_control: { type: "ephemeral" } }],
        /* SIN tool_choice: medido el 12/11, opus-5-5 contesta
           400 "tool_choice: type tool and any are not supported for this
           model". Con una sola herramienta y la instruccion pidiendola, la
           usa igual; si no la usara, se devuelve origen=sin_declarar y no se
           guarda nada. */
        tools: [HERRAMIENTA],
        messages: [{ role: "user", content: JSON.stringify(datos) }],
      }),
    });

    if (!r.ok) {
      const detalle = await r.text();
      return json({ ok: false, origen: "api", tabla, http: r.status, detalle: detalle.slice(0, 300),
                    respuesta: r.status === 429 ? "La API esta limitando el ritmo." : `La API devolvio ${r.status}.` });
    }

    const salida = await r.json();
    const uso = salida?.usage ?? {};
    await rpc("api_ia_gastar2", {
      p_modelo: MODELO, p_in: uso.input_tokens ?? 0, p_out: uso.output_tokens ?? 0,
      p_cache_lee: uso.cache_read_input_tokens ?? 0, p_cache_escribe: uso.cache_creation_input_tokens ?? 0,
    }, jwt).catch(() => {});

    const piezas: any[] = Array.isArray(salida?.content) ? salida.content : [];
    const uso_h = piezas.find((b) => b?.type === "tool_use" && b?.name === "escribir_significado");
    if (!uso_h) {
      return json({ ok: false, origen: "sin_declarar", tabla,
                    respuesta: "El modelo no declaro el significado.",
                    motivo_de_corte: salida?.stop_reason, ms: Date.now() - t0 });
    }

    const guardado = await rpc("api_mapa_guardar_analisis",
      { p_tabla: tabla, p_analisis: uso_h.input }, jwt);

    /* CERO CAMPOS ESCRITOS SOBRE UNA TABLA QUE TIENE CAMPOS NO ES UN EXITO.
       Asi paso cpa04 por buena: ok = true, origen = "analizada", que_registra
       escrito y la lista de campos vacia porque el modelo se quedo sin tope de
       salida. Un resultado vacio que se declara exitoso es la misma clase de
       defecto que una cifra sin verificar: parece una respuesta. */
    const escritos = Number(guardado?.campos_escritos ?? 0);
    if (escritos === 0 && campos.length > 0) {
      return json({
        ok: false, origen: "no_escribio_ningun_campo", tabla,
        campos_que_tenia: campos.length, campos_escritos: 0,
        motivo_de_corte: salida?.stop_reason,
        respuesta: "El modelo no escribió el significado de ningún campo" +
                   (salida?.stop_reason === "max_tokens"
                     ? ": se quedó sin tope de salida. La tabla es muy grande para una sola pasada."
                     : "."),
        que_registra: uso_h.input?.que_registra ?? null,
        ms: Date.now() - t0,
      });
    }

    return json({
      ok: true, origen: "analizada", tabla,
      campos_que_tenia: campos.length,
      campos_escritos: guardado?.campos_escritos ?? 0,
      columnas_inventadas: guardado?.columnas_inventadas ?? [],
      que_registra: uso_h.input?.que_registra ?? null,
      modelo: MODELO,
      tokens: { entrada: (uso.input_tokens ?? 0) + (uso.cache_read_input_tokens ?? 0) + (uso.cache_creation_input_tokens ?? 0),
                salida: uso.output_tokens ?? 0, leidos_del_cache: uso.cache_read_input_tokens ?? 0 },
      ms: Date.now() - t0,
    });
  } catch (e) {
    return json({ ok: false, origen: "excepcion", respuesta: "Algo fallo.",
                  detalle: String((e as Error)?.message ?? e), ms: Date.now() - t0 });
  }
});
