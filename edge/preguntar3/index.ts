// ===========================================================================
// AYUDA INTELIGENTE DE DISSAN — EL CIRCUITO CON HERRAMIENTAS      28/10/2026
// ===========================================================================
// Esto es NUEVO y vive AL LADO de `preguntar`, que no se toca.
//
// POR QUE. La version anterior daba UN TIRO: recibia tablas crudas de Tango,
// escribia una consulta, y si la base la rechazaba se le devolvia el error.
// Nunca veia su propio resultado, no conocia nada de lo que el proyecto
// resolvio en tres semanas, y devolvia filas sueltas: la pantalla pintaba una
// tabla y nada mas.
//
// Tres defectos medidos de esa version, que aca estan arreglados:
//   1. El prompt mandaba usar mv_margen_real, que es EL METODO QUE SE MIDIO
//      INVALIDO el 07/10/2026. La Ayuda calculaba margenes con el metodo
//      descartado.
//   2. Leia el texto con `content[0].text`. Estos modelos razonan y el primer
//      bloque puede ser el razonamiento: con eso la respuesta sale vacia. Es el
//      error documentado el 15/10. Aca se filtra por type.
//   3. MAX_TOKENS = 1200. El razonamiento se come el presupuesto y la API
//      devuelve 200 con cero bloques de texto. Aca van 8000.
//
// COMO FUNCIONA AHORA — como trabaja una IA con herramientas:
//   * lee el DICCIONARIO DEL SISTEMA (api_ia_saber): que vista o funcion ya
//     resuelve cada tema, que uniones estan probadas, que campos mienten;
//   * puede PEDIR LAS COLUMNAS REALES de una tabla (api_ia_columnas);
//   * puede EJECUTAR una consulta y VER EL RESULTADO (api_ia_sql), con el rol
//     del panel, y corregir si vino vacia o rechazada;
//   * y termina declarando EL ARMADO de la respuesta: titulo, lectura,
//     tarjetas, grafico y tabla. Por eso sale un tablero y no una tabla.
//
// NINGUNA CIFRA LA ESCRIBE EL MODELO. Las tarjetas se declaran por columna y
// agregado, y el numero lo saca ESTA funcion del bloque `resumen`, que calcula
// la base EN SQL SOBRE TODAS LAS FILAS. Es la regla del 15/10, cuando el modelo
// conto por su cuenta y escribio "54 OC" donde eran 94.
//
// EL GASTO. Antes de cada llamada se consulta api_ia_presupuesto y despues de
// cada una se anota con api_ia_gastar. Si el dia esta usado, no llama: contesta
// con lo que haya y lo dice. Eso es lo que falto el 22/10, cuando el credito se
// termino sin medidor.
//
// LA CLAVE DE SERVICIO NO SE USA. Todo va con el JWT del usuario, asi que la
// consulta que escribe el modelo ve exactamente lo que ve ese usuario.
// ===========================================================================

const MODELO = "claude-opus-5-5";   // precio medido contra el saldo: 4 / 20 USD por millon
const MAX_TOKENS = 8000;
const MAX_PASOS = 9;                // llamadas al modelo, como maximo
const MUESTRA_FILAS = 6;            // cuantas filas ve el modelo de cada consulta
const TOPE_FILAS_RESPUESTA = 2000;  // cuantas filas viajan a la pantalla

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status, headers: { "Content-Type": "application/json", ...CORS },
  });

const HERRAMIENTAS = [
  {
    name: "consultar_base",
    description:
      "Ejecuta una consulta de lectura en la base y te devuelve: cuantas filas dio, los " +
      "nombres de las columnas, una MUESTRA de hasta 12 filas, y un bloque `resumen` " +
      "calculado por la base EN SQL SOBRE TODAS LAS FILAS (sumas, maximos, minimos, " +
      "promedios, valores distintos y los mas repetidos de cada columna). Si la consulta se " +
      "rechaza te dice el motivo exacto. Usala todas las veces que necesites.",
    input_schema: {
      type: "object",
      properties: {
        sql: { type: "string", description: "Una sola consulta SELECT o WITH, sin punto y coma." },
        por_que: { type: "string", description: "En una linea, que estas averiguando." },
      },
      required: ["sql"],
    },
  },
  {
    name: "ver_columnas",
    description:
      "Te devuelve las columnas REALES de las tablas que le pidas, y si le pasas una columna " +
      "te dice en que otras tablas existe. Usala cuando no estes seguro de un nombre, en vez " +
      "de adivinarlo.",
    input_schema: {
      type: "object",
      properties: {
        tablas: { type: "array", items: { type: "string" }, description: "Hasta 6 nombres." },
        columna: { type: "string", description: "Opcional: la columna que estas buscando." },
      },
      required: ["tablas"],
    },
  },
  {
    name: "contestar",
    description:
      "El ultimo paso: declara COMO se arma la respuesta en pantalla. La respuesta puede tener " +
      "VARIOS BLOQUES, uno por cada cosa que te preguntaron: si te piden un comparativo mas el " +
      "resumen por cliente, por provincia y por proveedor mas el detalle, son CINCO bloques, " +
      "cada uno con su consulta, sus tarjetas, su grafico y su tabla. Ejecuta antes una consulta " +
      "por cada bloque. NO contestes una sola cosa cuando te pidieron varias. No escribas ninguna " +
      "cifra aca: las cifras las saca el servidor del bloque `resumen` que calculo la base.",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "De que es la respuesta entera, en pocas palabras." },
        lectura: {
          type: "string",
          description:
            "Lo que hay que mirar, en 2 a 8 frases, en castellano rioplatense y sin markdown " +
            "mas alla de **negrita** y listas con guion. Deci QUE PASA, no describas las tablas. " +
            "Si una consulta trajo una muestra y no todas las filas, no afirmes nada que " +
            "requiera haber visto todas. Toda lista lleva su total.",
        },
        bloques: {
          type: "array",
          description:
            "UN BLOQUE POR CADA COSA QUE TE PIDIERON, en el orden en que conviene leerlos. " +
            "Si la pregunta pide una sola cosa, va un solo bloque.",
          items: {
            type: "object",
            properties: {
              titulo: { type: "string", description: "Que muestra este bloque." },
              sql: {
                type: "string",
                description: "La consulta, de las que ejecutaste, cuyos datos son este bloque. Pegala igual.",
              },
              tarjetas: {
                type: "array",
                description: "De 0 a 6 cifras grandes de ESTE bloque. El numero lo pone el servidor.",
                items: {
                  type: "object",
                  properties: {
                    etiqueta: { type: "string", description: "Que es, en pocas palabras." },
                    columna: { type: "string", description: "Columna del resultado, o vacio para el conteo de filas." },
                    agregado: { type: "string", enum: ["suma", "maximo", "minimo", "promedio", "distintos", "filas"] },
                    formato: { type: "string", enum: ["pesos", "numero", "porcentaje"] },
                  },
                  required: ["etiqueta", "agregado", "formato"],
                },
              },
              grafico: {
                type: "object",
                description: "Opcional. Se dibuja solo si el bloque tiene mas de una fila.",
                properties: {
                  tipo: { type: "string", enum: ["columnas", "barras"] },
                  etiqueta: { type: "string", description: "Columna del eje (categoria o periodo)." },
                  valor: { type: "string", description: "Columna numerica." },
                  titulo: { type: "string" },
                },
                required: ["tipo", "etiqueta", "valor"],
              },
              tabla: {
                type: "array",
                description: "Las columnas a mostrar, en orden. Si va vacia se muestran todas.",
                items: {
                  type: "object",
                  properties: {
                    columna: { type: "string" },
                    rotulo: { type: "string", description: "El titulo en castellano claro." },
                    formato: { type: "string", enum: ["pesos", "numero", "porcentaje", "fecha", "codigo", "texto"] },
                  },
                  required: ["columna", "rotulo", "formato"],
                },
              },
            },
            required: ["titulo", "sql"],
          },
        },
        lo_que_no_se_puede_afirmar: {
          type: "string",
          description:
            "Opcional pero importante: que queda afuera de esta medicion, sobre que " +
            "denominador esta, o que tope la pudo recortar. Si no hay nada, dejalo vacio.",
        },
      },
      required: ["titulo", "lectura", "bloques"],
    },
  },
];

function instrucciones(diccionario: string, hoy: string) {
  return (
`Sos el que contesta las preguntas del sistema de gestion de DISSAN, una drogueria de insumos
medicos de Mendoza. La base es PostgreSQL con las ~583 tablas de Tango Gestion migradas, en el
esquema public. Hoy es ${hoy}.

COMO TRABAJAS
Tenes herramientas. No adivines: medi. El camino normal es:
  1. mira el DICCIONARIO de abajo y fijate si el tema ya esta resuelto por una vista o una
     funcion api_*. Si lo esta, USALA: esta medida y controlada, y escribir la consulta a mano
     desde las tablas crudas es como volver a empezar;
  2. si necesitas confirmar un nombre de columna, pedilo con ver_columnas;
  3. ejecuta la consulta con consultar_base y MIRA EL RESULTADO. Si vino vacia o rechazada,
     corregila y volve a intentar;
  4. cuando los resultados contestan la pregunta, llama a contestar y declara el armado.
Tenes como maximo ${MAX_PASOS} pasos. No gastes pasos en consultas de tanteo que no vas a usar.

CONTESTA TODO LO QUE TE PREGUNTARON, NO UNA PARTE
Si la pregunta pide varias cosas — por ejemplo un comparativo por anio Y el resumen por cliente
Y por provincia Y por proveedor Y el detalle de facturacion — eso son CINCO consultas y CINCO
bloques, y los cinco van en la misma respuesta. Ejecuta una consulta por cada cosa y despues
declara un bloque por cada una. Podes mandar varias llamadas a consultar_base en el mismo paso.
Contestar una sola cosa cuando pidieron cinco es contestar mal, aunque esa una este bien.

LO QUE NO PODES HACER
- NO podes escribir, borrar ni cambiar nada: solo SELECT y WITH. Esta bloqueado en la base.
- NO INVENTES COLUMNAS NI TABLAS. Si la base rechaza la consulta, el motivo te dice exactamente
  que no existe.
- NO CUENTES NI SUMES VOS. Las filas que ves son una MUESTRA. Todo total, conteo o promedio
  sale del bloque \`resumen\`, que la base calcula sobre TODAS las filas. Si escribis un numero
  de tu cabeza vas a decir una cifra que no existe: ya paso, se escribio "54 OC" donde eran 94.
- NO respondas que no sabes porque te pidieron un formato que no podes generar. Si piden "un
  informe", "un excel", "un dashboard", "un pdf" o "una pantalla", eso lo arma la pantalla
  sola: vos contesta LOS DATOS.

COMO SE ESCRIBE LA LECTURA
Deci que pasa, no describas la tabla. Si una cifra tiene una limitacion, decila en la misma
frase. Todo porcentaje va con su denominador. Toda lista lleva su total. Si la consulta tuvo un
tope de filas, no afirmes nada que necesite haberlas visto todas: declaralo en
lo_que_no_se_puede_afirmar.

ES POSTGRESQL, NO SQL SERVER
LIMIT n al final, nunca SELECT TOP n. Concatenar con || o concat(). La fecha de hoy es
current_date. Cortar texto con substring(x from 1 for 3). Sin corchetes en los nombres.

=====================  DICCIONARIO DEL SISTEMA  =====================
Cada linea de aca salio de una medicion contra la base, no de una suposicion. Respetalo: lo que
dice CUIDADO ya hizo equivocarse a informes enteros.

${diccionario}
=====================================================================`);
}

/** Llama a una funcion de la base con el JWT del usuario: nunca con la clave de servicio. */
async function rpc(nombre: string, args: Record<string, unknown>, jwt: string) {
  const url = Deno.env.get("SUPABASE_URL");
  /* si el entorno no trae la anon (el proyecto paso a claves publishable), el
     propio JWT sirve de apikey: PostgREST acepta cualquier clave valida ahi. */
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || jwt;
  const r = await fetch(`${url}/rest/v1/rpc/${nombre}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anon,
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(args),
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${nombre}: ${r.status} ${texto}`);
  return texto ? JSON.parse(texto) : null;
}

/** EL CACHE DEL PROMPT, que es de donde sale casi todo el ahorro. 28/10/2026
    Medido en la primera corrida real: 5 llamadas, 226.141 tokens de entrada,
    US$1,0566. El 90% de esos tokens son LA MISMA CONVERSACION mandada una y
    otra vez: cada vuelta reenvia el sistema, las herramientas y todos los
    resultados anteriores.
    Yo solo tenia marcado el bloque `system`, que son unos 4.000 tokens. Lo caro
    son los mensajes, y no estaban marcados.
    Marcando el ULTIMO bloque de la conversacion, todo lo anterior se lee del
    cache, que cuesta una decima parte. No cambia ni una respuesta: es el mismo
    texto, leido de otro lado. */
function conCache(mensajes: any[]) {
  if (!mensajes.length) return mensajes;
  const out = mensajes.map((m) => ({ ...m }));
  const ult = out[out.length - 1];
  const marca = { type: "ephemeral" };

  if (typeof ult.content === "string") {
    ult.content = [{ type: "text", text: ult.content, cache_control: marca }];
    return out;
  }
  if (Array.isArray(ult.content) && ult.content.length) {
    const bloques = ult.content.map((b: any) => ({ ...b }));
    bloques[bloques.length - 1] = { ...bloques[bloques.length - 1], cache_control: marca };
    ult.content = bloques;
  }
  return out;
}

/** LO QUE VE EL MODELO DEL RESUMEN, recortado.            28/10/2026
    Medido en la primera corrida real: la conversacion crecia unos 60.000
    tokens POR PASO y cuatro llamadas costaron US$0,69. La causa es que a cada
    paso se le devolvia el `resumen` entero, que ademas de las sumas y los
    maximos trae los 5 renglones mas grandes y los 5 mas chicos CON TODAS SUS
    COLUMNAS, las primeras filas y los mas repetidos de cada columna.
    Para escribir la consulta siguiente no necesita nada de eso.
    NO CAMBIA NINGUNA CIFRA: los totales los calcula la base y el servidor los
    lee del resumen COMPLETO, no de este. Es el mismo recorte que el 22/10 bajo
    un 74% lo que viajaba a la lectura sin mover un numero. */
function resumenLiviano(r: any) {
  if (!r) return null;
  const cols: any[] = Array.isArray(r.columnas) ? r.columnas : [];
  /* los extremos SI se dejan, recortados a 3 y 3: son lo que le permite
     escribir "el que mas perdio fue X". Lo que se saca es `primeras`, que es
     la misma muestra otra vez, y los 5 mas repetidos de cada columna. */
  const ext = r.extremos && (r.extremos.mayores || r.extremos.menores)
    ? { columna: r.extremos.columna,
        mayores: (r.extremos.mayores ?? []).slice(0, 3),
        menores: (r.extremos.menores ?? []).slice(0, 3) }
    : undefined;
  return {
    filas: r.filas,
    ponderados: r.ponderados ?? undefined,
    extremos: ext,
    columnas: cols.map((c) => {
      const o: any = { nombre: c.nombre, tipo: c.tipo, cargados: c.cargados };
      for (const k of ["suma", "minimo", "maximo", "promedio", "distintos",
                       "negativos", "ceros", "vacios"]) {
        if (c[k] !== null && c[k] !== undefined) o[k] = c[k];
      }
      if (Array.isArray(c.mas_repetidos) && c.mas_repetidos.length) {
        o.mas_repetidos = c.mas_repetidos.slice(0, 3);
      }
      return o;
    }),
  };
}

/** El numero de una tarjeta SALE DEL RESUMEN que calculo la base.
    api_ia_resumen_datos devuelve `columnas` como ARRAY de objetos con `nombre`,
    no como un mapa: verificado corriendola el 28/10. */
function cifraDelResumen(resumen: any, columna: string | undefined, agregado: string): number | null {
  if (!resumen) return null;
  if (agregado === "filas") return Number(resumen.filas ?? 0);
  const cols: any[] = Array.isArray(resumen.columnas) ? resumen.columnas : [];
  const c = cols.find((x) => x && x.nombre === columna);
  if (!c) return null;
  const v = c[agregado];
  return v === null || v === undefined ? null : Number(v);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const arranque = Date.now();
  const pasos: any[] = [];
  let pregunta = "";
  let tIn = 0, tOut = 0, llamadas = 0, tCacheLee = 0;

  try {
    const cuerpo = await req.json().catch(() => ({}));
    pregunta = String(cuerpo?.pregunta ?? cuerpo?.texto ?? "").trim();

    const auth = req.headers.get("Authorization") ?? "";
    const jwt = auth.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ ok: false, origen: "sin_sesion", respuesta: "Volvé a entrar al panel." });

    const llave = Deno.env.get("ANTHROPIC_API_KEY");
    if (!llave) {
      return json({ ok: false, origen: "configuracion",
        respuesta: "Falta ANTHROPIC_API_KEY en los secretos de Supabase." });
    }

    /* modo medir: arma todo SIN llamar al modelo y sin gastar un token */
    const soloMedir = cuerpo?.medir === true;

    if (!pregunta && !soloMedir) {
      return json({ ok: false, origen: "vacia", respuesta: "Escribí una pregunta." });
    }

    const diccionario = await rpc("api_ia_saber", {}, jwt);
    const hoy = new Date().toISOString().slice(0, 10);
    const sistema = instrucciones(String(diccionario ?? ""), hoy);

    if (soloMedir) {
      return json({ ok: true, origen: "medicion", modelo: MODELO,
        bytes_del_sistema: sistema.length,
        bytes_del_diccionario: String(diccionario ?? "").length,
        presupuesto: await rpc("api_ia_presupuesto", { p_estimado_usd: 0 }, jwt),
        ms: Date.now() - arranque });
    }

    const mensajes: any[] = [{ role: "user", content: pregunta }];
    let armado: any = null;
    let ultimaConsulta: any = null;
    const consultas: any[] = [];
    const resultados: any[] = [];   /* cada consulta que corrio, COMPLETA */
    const aplanar = (s: string) => String(s ?? "").replace(/\s+/g, " ").trim();

    for (let paso = 1; paso <= MAX_PASOS; paso++) {
      /* EL TOPE, ANTES de llamar. Se estima con lo que gasto la ultima llamada. */
      const pres = await rpc("api_ia_presupuesto", { p_estimado_usd: 0.05 }, jwt);
      if (pres && pres.permite === false) {
        return json({
          ok: false, origen: "sin_presupuesto", pregunta, pasos, consultas,
          presupuesto: pres,
          respuesta:
            "El presupuesto de la Ayuda para hoy está usado (" + pres.motivo + "). " +
            "Las preguntas que la base ya sabe contestar siguen funcionando sin costo. " +
            "El tope se cambia en la tabla ayuda.presupuesto_tope.",
          ms: Date.now() - arranque,
        });
      }

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": llave,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODELO,
          max_tokens: MAX_TOKENS,
          system: [{ type: "text", text: sistema, cache_control: { type: "ephemeral" } }],
          tools: HERRAMIENTAS,
          messages: conCache(mensajes),
        }),
      });

      if (!r.ok) {
        const detalle = await r.text();
        const motivo =
          r.status === 401 ? "La clave de la API no es válida."
          : r.status === 429 ? "La API está limitando el ritmo. Probá de nuevo en un momento."
          : /credit|balance/i.test(detalle)
            ? "Se acabó el crédito de la API. Hay que cargar más en platform.claude.com."
            : `La API devolvió ${r.status}.`;
        return json({ ok: false, origen: "api", pregunta, pasos, consultas,
                      respuesta: motivo, detalle, tokens: { entrada: tIn, salida: tOut },
                      ms: Date.now() - arranque });
      }

      const salida = await r.json();
      const uso = salida?.usage ?? {};
      const cacheLee     = uso.cache_read_input_tokens ?? 0;
      const cacheEscribe = uso.cache_creation_input_tokens ?? 0;
      tIn  += (uso.input_tokens ?? 0) + cacheLee + cacheEscribe;
      tOut += uso.output_tokens ?? 0;
      tCacheLee += cacheLee;
      llamadas++;
      /* se cobra separando el cache: lo leido del cache cuesta la decima parte
         y lo escrito 1,25 veces. Cobrarlo todo al precio de entrada mostraria
         MAS de lo que se paga, que es tan malo como mostrar menos. */
      await rpc("api_ia_gastar2", { p_modelo: MODELO, p_in: uso.input_tokens ?? 0,
                                    p_out: uso.output_tokens ?? 0,
                                    p_cache_lee: cacheLee,
                                    p_cache_escribe: cacheEscribe }, jwt)
        .catch(() => {});

      const piezas: any[] = Array.isArray(salida?.content) ? salida.content : [];
      /* NUNCA content[0]: con estos modelos el primero puede ser el razonamiento */
      const usos  = piezas.filter((b) => b?.type === "tool_use");
      const texto = piezas.filter((b) => b?.type === "text").map((b) => b.text).join("\n").trim();

      pasos.push({ paso, herramientas: usos.map((u) => u.name),
                   razono: piezas.some((b) => b?.type === "thinking"),
                   motivo_de_corte: salida?.stop_reason, texto: texto || null });

      if (!usos.length) {
        /* no pidio herramienta: contesto en palabras y nada mas */
        return json({
          ok: true, origen: "texto", pregunta, pasos, consultas,
          armado: null, datos: ultimaConsulta?.datos ?? [], filas: ultimaConsulta?.filas ?? 0,
          sql: ultimaConsulta?.sql ?? null,
          respuesta: texto || "No llegó respuesta del modelo.",
          modelo: MODELO, tokens: { entrada: tIn, salida: tOut }, llamadas,
          ms: Date.now() - arranque,
        });
      }

      mensajes.push({ role: "assistant", content: piezas });
      const respuestasDeHerramientas: any[] = [];

      for (const u of usos) {
        if (u.name === "contestar") { armado = u.input;
          respuestasDeHerramientas.push({ type: "tool_result", tool_use_id: u.id,
            content: "listo" });
          continue; }

        if (u.name === "ver_columnas") {
          let res: any;
          try {
            res = await rpc("api_ia_columnas",
              { p_tablas: (u.input?.tablas ?? []).slice(0, 6), p_columna: u.input?.columna ?? null }, jwt);
          } catch (e) { res = { ok: false, motivo: String((e as Error).message) }; }
          respuestasDeHerramientas.push({ type: "tool_result", tool_use_id: u.id,
            content: JSON.stringify(res).slice(0, 12000) });
          continue;
        }

        if (u.name === "consultar_base") {
          let res: any;
          try {
            res = await rpc("api_ia_sql",
              { p_sql: String(u.input?.sql ?? ""), p_muestra: MUESTRA_FILAS }, jwt);
          } catch (e) { res = { ok: false, motivo: String((e as Error).message) }; }

          if (res?.ok) { ultimaConsulta = res; resultados.push(res);
                         consultas.push({ sql: res.sql, filas: res.filas, ms: res.ms,
                                          por_que: u.input?.por_que ?? null }); }
          else { consultas.push({ sql: u.input?.sql, error: res?.motivo ?? "sin motivo",
                                  paso: res?.paso ?? null }); }

          /* al modelo le va TODO menos las filas completas: ve la muestra y el
             resumen, que es lo que no puede inventar */
          const paraElModelo = { ok: res?.ok, paso: res?.paso, motivo: res?.motivo ?? null,
                                 ayuda: res?.ayuda ?? null, filas: res?.filas,
                                 columnas: res?.columnas, muestra: res?.muestra,
                                 muestra_es_parcial: res?.muestra_es_parcial,
                                 resumen: resumenLiviano(res?.resumen), ms: res?.ms };
          respuestasDeHerramientas.push({ type: "tool_result", tool_use_id: u.id,
            content: JSON.stringify(paraElModelo).slice(0, 20000) });
          continue;
        }

        respuestasDeHerramientas.push({ type: "tool_result", tool_use_id: u.id,
          is_error: true, content: "No existe esa herramienta." });
      }

      if (armado) break;
      mensajes.push({ role: "user", content: respuestasDeHerramientas });
    }

    if (!armado) {
      return json({
        ok: false, origen: "sin_armado", pregunta, pasos, consultas,
        datos: ultimaConsulta?.datos ?? [], filas: ultimaConsulta?.filas ?? 0,
        sql: ultimaConsulta?.sql ?? null,
        respuesta:
          "Llegué a los " + MAX_PASOS + " pasos sin cerrar la respuesta. " +
          (ultimaConsulta ? "Abajo están los datos de la última consulta que sí corrió."
                          : "Probá preguntando lo mismo con otras palabras."),
        modelo: MODELO, tokens: { entrada: tIn, salida: tOut }, llamadas,
        ms: Date.now() - arranque,
      });
    }

    /* ---- UN BLOQUE POR CADA COSA QUE PREGUNTARON ----
       Las cifras de las tarjetas NO las escribe el modelo: cada bloque declara
       la columna y el agregado, y el numero sale del `resumen` que calculo la
       base EN SQL SOBRE TODAS LAS FILAS de ESA consulta.
       El SQL se compara aplanado porque validar_sql le pudo agregar el limit. */
    const buscarFuente = (sql: string) => {
      const pedido = aplanar(sql);
      if (!pedido) return null;
      return resultados.find((r) => aplanar(r.sql) === pedido)
          ?? resultados.find((r) => pedido.length > 20
                                 && aplanar(r.sql).startsWith(pedido.slice(0, 60)))
          ?? resultados.find((r) => pedido.length > 20
                                 && pedido.startsWith(aplanar(r.sql).slice(0, 60)))
          ?? null;
    };

    /* una respuesta vieja traia sql_de_la_respuesta en vez de bloques: se acepta
       igual, para que un cambio de forma no deje la pantalla muda */
    const declarados: any[] = Array.isArray(armado.bloques) && armado.bloques.length
      ? armado.bloques
      : [{ titulo: armado.titulo, sql: armado.sql_de_la_respuesta,
           tarjetas: armado.tarjetas, grafico: armado.grafico, tabla: armado.tabla }];

    const bloques = declarados.map((b: any) => {
      const f = buscarFuente(b.sql) ?? (declarados.length === 1 ? ultimaConsulta : null);
      const datos = (f?.datos ?? []).slice(0, TOPE_FILAS_RESPUESTA);
      return {
        titulo: b.titulo ?? null,
        sql: f?.sql ?? b.sql ?? null,
        filas: f?.filas ?? 0,
        filas_que_viajan: datos.length,
        datos,
        resumen: f?.resumen ?? null,
        ms: f?.ms ?? null,
        tarjetas: (b.tarjetas ?? []).map((t: any) => ({
          etiqueta: t.etiqueta,
          formato: t.formato,
          columna: t.columna ?? null,
          agregado: t.agregado,
          valor: cifraDelResumen(f?.resumen, t.columna, t.agregado),
          de_donde: t.agregado === "filas"
            ? "el conteo de filas que midió la base"
            : "el " + t.agregado + " de " + (t.columna ?? "?")
              + " que calculó la base en SQL sobre todas las filas",
        })).filter((t: any) => t.valor !== null),
        grafico: b.grafico ?? null,
        tabla: b.tabla ?? null,
        /* si el modelo declaro un bloque cuya consulta no corrio, se dice: no se
           muestra una tabla vacia como si fuera una respuesta */
        sin_datos: !f,
      };
    });

    const conDatos = bloques.filter((b: any) => !b.sin_datos);
    const primero = conDatos[0] ?? bloques[0] ?? null;

    return json({
      ok: true, origen: "circuito", pregunta,
      titulo: armado.titulo ?? null,
      lectura: armado.lectura ?? null,
      reparo: armado.lo_que_no_se_puede_afirmar || null,
      bloques,
      bloques_con_datos: conDatos.length,
      /* lo de siempre, por si algo lee la forma de un solo bloque */
      tarjetas: primero ? primero.tarjetas : [],
      grafico: primero ? primero.grafico : null,
      tabla: primero ? primero.tabla : null,
      sql: primero ? primero.sql : null,
      filas: primero ? primero.filas : 0,
      filas_que_viajan: primero ? primero.filas_que_viajan : 0,
      datos: primero ? primero.datos : [],
      resumen: primero ? primero.resumen : null,
      consultas, pasos, llamadas,
      modelo: MODELO,
      tokens: { entrada: tIn, salida: tOut, leidos_del_cache: tCacheLee },
      presupuesto: await rpc("api_ia_presupuesto", { p_estimado_usd: 0 }, jwt).catch(() => null),
      ms: Date.now() - arranque,
    });
  } catch (e) {
    return json({
      ok: false, origen: "excepcion", pregunta, pasos,
      respuesta: "Algo falló al procesar la pregunta.",
      detalle: String((e as Error)?.message ?? e),
      tokens: { entrada: tIn, salida: tOut },
      ms: Date.now() - arranque,
    });
  }
});
