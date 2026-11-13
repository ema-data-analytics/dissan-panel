// ===========================================================================
// AYUDA INTELIGENTE DE DISSAN — EL CIRCUITO, CON EL MAPA ADENTRO   11/11/2026
// ===========================================================================
// Vive AL LADO de preguntar, preguntar2 y preguntar3, que no se tocan.
//
// POR QUE EXISTE. Medido hoy en el panel: de 64 preguntas en 30 dias, SOLO 8
// llegaron a la IA. Las otras 52 las intercepto una lista de intenciones
// escritas a mano, que no tiene piso: gana la que mas puntua aunque la
// pregunta diga otra cosa. Dos ejemplos reales de hoy:
//
//   "cuantos proveedores distintos nos facturaron en 2026"
//      -> contesto "proveedores cargados: 999", CON CONFIANZA ALTA.
//   "que articulo compramos mas caro este año"
//      -> contesto "$ 936.965", sin nombrar ningun articulo.
//
// La misma pregunta por el circuito con IA contesto, en 3 llamadas y 25 s:
//   "NEUROESTIM NO RECAR Y ELECT 32 CONTAC. ALPHA PRIME (BIO-NEURO0001), a
//    BIO-LAP S.A., el 20/05/2026, una unidad, $28.831.396, factura
//    A0000300089731" — con los 15 renglones mas caros atras.
//
// Y HABIA UN SEGUNDO AGUJERO, PEOR: la IA no veia el mapa. El circuito le
// pasaba ayuda.saber, un diccionario escrito a mano y chico. Las 627 tablas y
// los 10.642 campos de ema.diccionario —medidos campo por campo— NO ENTRABAN.
// Le preguntabamos con los ojos tapados.
//
// LO QUE ESTE AGREGA SOBRE preguntar3 (que ya traia el cache de la
// conversacion, el resumen recortado y el gasto cobrado separando el cache):
//
//   1. MEMORIA DE VERDAD. Si la pregunta ya se contesto bien, se guarda el
//      ARMADO ENTERO (titulo, lectura, bloques, tarjetas). Repetirla vuelve a
//      correr el SQL —los datos siempre frescos— y se pinta igual, CON CERO
//      LLAMADAS AL MODELO. Una pregunta se paga una sola vez en la vida.
//   2. EJEMPLOS DE LA CASA. api_ia_ejemplos busca, entre las 8.961 preguntas
//      reales que ya salieron bien, las que se parecen a esta, con la consulta
//      que funciono. Acierta mas Y cuesta menos: se ahorra los pasos de tanteo,
//      y cada paso reenvia toda la conversacion.
//   3. EL MAPA. Entra de dos formas: las tablas que pegan con la pregunta van
//      en el primer mensaje, y ademas hay una herramienta, buscar_en_el_mapa,
//      para seguir buscando sola.
//   4. SE GUARDA LO QUE SALIO BIEN, para que la proxima sea el punto 1.
//
// NINGUNA CIFRA LA ESCRIBE EL MODELO. Las tarjetas se declaran por columna y
// agregado, y el numero lo saca ESTA funcion del bloque `resumen`, que calcula
// la base EN SQL SOBRE TODAS LAS FILAS. Es la regla del 15/10, cuando el modelo
// conto por su cuenta y escribio "54 OC" donde eran 94.
//
// LA CLAVE DE SERVICIO NO SE USA. Todo va con el JWT del usuario, asi que la
// consulta que escribe el modelo ve exactamente lo que ve ese usuario.
// ===========================================================================

const MODELO = "claude-opus-5-5";   // decidido por el usuario el 11/11: queda Opus 5.5
const MAX_TOKENS = 8000;
const MAX_PASOS = 9;                // llamadas al modelo, como maximo
const MUESTRA_FILAS = 6;            // cuantas filas ve el modelo de cada consulta
const TOPE_FILAS_RESPUESTA = 2000;  // cuantas filas viajan a la pantalla
const MAX_BLOQUES_MEMORIA = 6;      // bloques que se aceptan de un armado guardado

/* =====================================================================
   PREGUNTAR5 = PREGUNTAR4 + LOS PASOS EN VIVO.           13/11/2026
   =====================================================================
   POR QUE EXISTE Y POR QUE ES OTRA FUNCION. preguntar4 contesta TODO
   junto al final: la persona mira un cartel que dice "Buscando..."
   quince segundos sin saber si se colgo. El trabajo esta hecho -cada
   paso ya se anota en `pasos`- y se tiraba hasta el final.

   Y NO SE TOCA preguntar4. Esto es una copia que se sirve al lado. Si
   el stream falla, ayuda.js vuelve solo a preguntar4 y la pantalla
   anda igual. Lo que hoy funciona no se pone en riesgo por una mejora
   de presentacion: esa es la regla de todo el proyecto.

   COMO. El cuerpo entero de preguntar4 quedo IGUAL, adentro de
   manejar(). Lo unico nuevo es el `avisar()` que se le pasa y los
   renglones que lo llaman. Sin cabecera Accept: text/event-stream
   contesta el MISMO JSON de siempre, byte por byte: una pantalla vieja
   apuntando aca no se entera de nada.
   ===================================================================== */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
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
      "nombres de las columnas, una MUESTRA de hasta 6 filas, y un bloque `resumen` " +
      "calculado por la base EN SQL SOBRE TODAS LAS FILAS (sumas, maximos, minimos, " +
      "promedios, valores distintos). Si la consulta se rechaza te dice el motivo exacto. " +
      "Usala todas las veces que necesites, y podes mandar varias en el mismo paso.",
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
    name: "buscar_en_el_mapa",
    description:
      "EL MAPA DE TODA LA BASE: 627 tablas y 10.642 campos, medidos uno por uno contra los " +
      "datos reales. Le pasas palabras de lo que estas buscando y te devuelve las tablas que " +
      "pegan, con QUE REGISTRA cada una, sus claves, a que otras tablas apunta, y TODAS sus " +
      "columnas con el significado medido de cada una. Usala cuando no sepas en que tabla " +
      "vive algo — que es casi siempre, porque los nombres de Tango (gva21, cpa04, sta11) no " +
      "dicen nada. Es mas barato buscar aca que probar consultas a ver cual pega.",
    input_schema: {
      type: "object",
      properties: {
        texto: { type: "string", description: "Las palabras de lo que buscas, en castellano." },
        cuantas: { type: "integer", description: "Cuantas tablas traer. Por defecto 5, maximo 8." },
      },
      required: ["texto"],
    },
  },
  {
    name: "ver_columnas",
    description:
      "Te devuelve las columnas REALES de las tablas que le pidas, y si le pasas una columna " +
      "te dice en que otras tablas existe. Usala para confirmar un nombre exacto cuando ya " +
      "sabes la tabla. Si todavia no sabes en que tabla esta, usa buscar_en_el_mapa.",
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

TENES EL MAPA ENTERO DE LA BASE
627 tablas y 10.642 campos, medidos uno por uno contra los datos reales: que registra cada
tabla, que significa cada columna, como se conectan y con cuanta cobertura. No lo tenes que
adivinar: se busca con buscar_en_el_mapa. Los nombres de Tango no dicen nada (gva21, cpa04,
sta11), asi que buscar en el mapa es SIEMPRE mas barato y mas seguro que probar consultas a
ver cual pega.

COMO TRABAJAS
No adivines: medi. El camino normal es:
  1. mira los EJEMPLOS que te llegan con la pregunta: son preguntas parecidas que YA se
     resolvieron bien en esta misma base, con la consulta que funciono. Si una sirve, usala o
     adaptala: ya esta medida;
  2. mira el DICCIONARIO de abajo y las TABLAS DEL MAPA que te llegan con la pregunta. Si el
     tema ya esta resuelto por una vista o una funcion api_*, USALA: esta medida y controlada,
     y escribir la consulta a mano desde las tablas crudas es como volver a empezar;
  3. si te falta saber donde vive algo, buscar_en_el_mapa. Si ya sabes la tabla y solo queres
     confirmar un nombre exacto, ver_columnas;
  4. ejecuta la consulta con consultar_base y MIRA EL RESULTADO. Si vino vacia o rechazada,
     corregila y volve a intentar;
  5. cuando los resultados contestan la pregunta, llama a contestar y declara el armado.
Tenes como maximo ${MAX_PASOS} pasos. No gastes pasos en consultas de tanteo que no vas a usar.

CONTESTA TODO LO QUE TE PREGUNTARON, NO UNA PARTE
Si la pregunta pide varias cosas — por ejemplo un comparativo por anio Y el resumen por cliente
Y por provincia Y por proveedor Y el detalle de facturacion — eso son CINCO consultas y CINCO
bloques, y los cinco van en la misma respuesta. Ejecuta una consulta por cada cosa y despues
declara un bloque por cada una. Podes mandar varias llamadas a consultar_base en el mismo paso.
Contestar una sola cosa cuando pidieron cinco es contestar mal, aunque esa una este bien.

CONTESTA LO QUE TE PREGUNTARON, NO LO PARECIDO
Si te preguntan cuantos proveedores DISTINTOS FACTURARON, no contestes cuantos proveedores hay
cargados. Si te preguntan QUE articulo, la respuesta lleva el nombre del articulo, no solo un
numero. Antes de llamar a contestar, releé la pregunta y fijate que cada cosa que pide este
contestada. Una respuesta a otra pregunta es peor que no contestar.

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
    A cada paso se le devolvia el `resumen` entero, que trae los 5 renglones
    mas grandes y los 5 mas chicos CON TODAS SUS COLUMNAS, las primeras filas y
    los mas repetidos de cada columna. Para escribir la consulta siguiente no
    necesita nada de eso.
    NO CAMBIA NINGUNA CIFRA: los totales los calcula la base y el servidor los
    lee del resumen COMPLETO, no de este. */
function resumenLiviano(r: any) {
  if (!r) return null;
  const cols: any[] = Array.isArray(r.columnas) ? r.columnas : [];
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

/** Arma los bloques de la respuesta a partir de pares (lo que declaro el modelo,
    el resultado real de la consulta). Lo usan los DOS caminos: el circuito y la
    memoria. Esta aparte justamente para que la respuesta guardada se pinte con
    exactamente el mismo codigo que la recien hecha. */
function construirBloques(pares: { b: any; f: any }[]) {
  return pares.map(({ b, f }) => {
    const datos = (f?.datos ?? []).slice(0, TOPE_FILAS_RESPUESTA);
    return {
      titulo: b?.titulo ?? null,
      sql: f?.sql ?? b?.sql ?? null,
      filas: f?.filas ?? 0,
      filas_que_viajan: datos.length,
      datos,
      resumen: f?.resumen ?? null,
      ms: f?.ms ?? null,
      tarjetas: (b?.tarjetas ?? []).map((t: any) => ({
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
      grafico: b?.grafico ?? null,
      tabla: b?.tabla ?? null,
      /* si el modelo declaro un bloque cuya consulta no corrio, se dice: no se
         muestra una tabla vacia como si fuera una respuesta */
      sin_datos: !f,
    };
  });
}

/* ===========================================================================
   NINGUNA CIFRA SALE SIN CONTROLARSE, O SALE DICIENDO QUE NO SE PUDO.
   ===========================================================================
   POR QUE EXISTE. Que la consulta corra no dice que la cifra sea la correcta.
   Eso lo dice una FUENTE INDEPENDIENTE DEL CALCULO, que es lo unico que este
   proyecto acepta como control. Las 22 identidades ya existian pero vivian
   aparte: nadie las miraba EN EL MOMENTO de publicar un numero. Por eso la
   Ayuda pudo contestar "cero notas de credito en octubre" cuando eran 6, con
   cara de respuesta.

   QUE HACE. Por cada tarjeta -que es donde vive la cifra que la persona lee-
   le pregunta a api_ia_control_cifra contra que se puede controlar. Cuatro
   veredictos, y los cuatro se dicen:
     coincide     -> hay una fuente independiente y da lo mismo
     no_coincide  -> hay una fuente independiente y NO da lo mismo  <-- el caro
     no_cubierta  -> ninguna identidad habla de esto. NO es "esta bien":
                     es "nadie lo controla". La diferencia importa.
     no_se_pudo   -> la fuente no llego a correr a tiempo. No medido no es
                     limpio, pero tampoco es rojo.

   EL FRENO QUE IMPORTA: si una cifra sale `no_coincide`, la respuesta NO SE
   MEMORIZA. Una respuesta mala memorizada se sirve gratis y para siempre, que
   es peor que no tener memoria. Eso ya paso el 12/11 con el cero.

   SE CONTROLAN LAS 3 PRIMERAS TARJETAS Y CON 5 SEGUNDOS CADA UNA: el control
   corre SQL de verdad, y una pantalla que tarda veinte segundos en contestar
   no la usa nadie. Un control que rompe la pantalla que vigila es peor que no
   tenerlo.
   =========================================================================== */
const MAX_CIFRAS_CONTROLADAS = 3;
const SEG_CONTROL = 5;

async function controlarCifras(bloques: any[], jwt: string) {
  let controladas = 0, coinciden = 0, chocan = 0, sinCubrir = 0, noSePudo = 0;
  for (const b of bloques) {
    for (const t of (b?.tarjetas ?? [])) {
      if (controladas >= MAX_CIFRAS_CONTROLADAS) { t.control = null; continue; }
      if (t.valor == null || !isFinite(Number(t.valor))) { t.control = null; continue; }
      controladas++;
      const c = await rpc("api_ia_control_cifra",
        { p_etiqueta: String(t.etiqueta ?? ""), p_valor: Number(t.valor), p_seg: SEG_CONTROL },
        jwt).catch(() => null);
      t.control = c ?? { controlado: "no_se_pudo", motivo: "El control no contestó." };
      switch (t.control?.controlado) {
        case "coincide":    coinciden++; break;
        case "no_coincide": chocan++;    break;
        case "no_se_pudo":  noSePudo++;  break;
        default:            sinCubrir++; break;
      }
    }
  }
  return {
    cifras_controladas: controladas,
    coinciden, chocan, sin_cubrir: sinCubrir, no_se_pudo: noSePudo,
    /* la frase que la pantalla puede mostrar tal cual */
    veredicto: chocan > 0
      ? "CUIDADO: " + chocan + " cifra(s) NO coinciden con la fuente independiente que las controla."
      : coinciden > 0
        ? "Controlado: " + coinciden + " cifra(s) coinciden con una fuente independiente del cálculo."
        : controladas > 0
          ? "Sin controlar: ninguna identidad cubre estas cifras. No quiere decir que estén mal; "
            + "quiere decir que nadie las controla contra otra fuente."
          : null,
  };
}

/** El sobre comun de la respuesta, para que memoria y circuito salgan iguales. */
function respuestaConBloques(base: Record<string, unknown>, armado: any, bloques: any[]) {
  const conDatos = bloques.filter((b: any) => !b.sin_datos);
  const primero = conDatos[0] ?? bloques[0] ?? null;
  return {
    ok: true,
    titulo: armado?.titulo ?? null,
    lectura: armado?.lectura ?? null,
    reparo: armado?.lo_que_no_se_puede_afirmar || null,
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
    ...base,
  };
}

/** El texto que acompaña a la pregunta en el PRIMER mensaje: los ejemplos de la
    casa y las tablas del mapa que pegan. Esto NO es adorno: cada paso de tanteo
    que se ahorra es una vuelta entera de conversacion que no se paga. */
function sobreDeContexto(ejemplos: any, mapa: any, recordada: any) {
  let t = "";

  if (Array.isArray(ejemplos) && ejemplos.length) {
    t += "\n\nASI SE RESOLVIERON PREGUNTAS PARECIDAS EN ESTA MISMA BASE\n" +
         "(salieron bien y trajeron filas; si una sirve, usala o adaptala en vez de empezar de cero)\n";
    for (const e of ejemplos.slice(0, 4)) {
      t += `\n- "${e.pregunta}"  (${e.filas} filas)\n    ${String(e.sql ?? "").replace(/\s+/g, " ").slice(0, 700)}\n`;
    }
  }

  if (recordada && recordada.recordada === true && recordada.sql) {
    t += "\n\nESTA MISMA PREGUNTA YA SE CONTESTO ANTES CON ESTA CONSULTA\n" +
         "(verificala igual: si sigue sirviendo, usala)\n    " +
         String(recordada.sql).replace(/\s+/g, " ").slice(0, 900) + "\n";
  }

  if (Array.isArray(mapa) && mapa.length) {
    t += "\n\nTABLAS DEL MAPA QUE PEGAN CON ESTA PREGUNTA\n" +
         "(medidas campo por campo contra los datos reales. Si falta alguna, buscar_en_el_mapa)\n";
    for (const m of mapa.slice(0, 3)) {
      t += `\n${m.tabla} — ${m.filas} filas — ${m.modulo ?? "?"}\n` +
           `  registra: ${m.que_registra ?? "?"}\n` +
           (m.claves ? `  claves: ${m.claves}\n` : "") +
           (m.apunta_a ? `  apunta a: ${m.apunta_a}\n` : "") +
           `  columnas: ${String(m.columnas ?? "").slice(0, 1800)}\n`;
    }
  }

  return t;
}

async function manejar(req: Request, avisar: (t: string, d?: any) => void): Promise<Response> {

  const arranque = Date.now();
  const pasos: any[] = [];
  let pregunta = "";
  let tIn = 0, tOut = 0, llamadas = 0, tCacheLee = 0;

  try {
    const cuerpo = await req.json().catch(() => ({}));
    pregunta = String(cuerpo?.pregunta ?? cuerpo?.texto ?? "").trim();

    avisar("arranca", { pregunta });

    const auth = req.headers.get("Authorization") ?? "";
    const jwt = auth.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      /* EL CODIGO HTTP TAMBIEN TIENE QUE DECIR QUE NO. 01/11/2026 */
      return json({ ok: false, origen: "sin_sesion",
                    respuesta: "Volvé a entrar al panel." }, 401);
    }

    const llave = Deno.env.get("ANTHROPIC_API_KEY");
    if (!llave) {
      return json({ ok: false, origen: "configuracion",
        respuesta: "Falta ANTHROPIC_API_KEY en los secretos de Supabase." });
    }

    /* modo medir: arma todo SIN llamar al modelo y sin gastar un token */
    const soloMedir = cuerpo?.medir === true;
    /* sin_memoria: para medir el circuito completo aunque la pregunta este guardada */
    const sinMemoria = cuerpo?.sin_memoria === true;

    if (!pregunta && !soloMedir) {
      return json({ ok: false, origen: "vacia", respuesta: "Escribí una pregunta." });
    }

    const correrSql = async (sql: string) => {
      try { return await rpc("api_ia_sql", { p_sql: sql, p_muestra: MUESTRA_FILAS }, jwt); }
      catch (e) { return { ok: false, motivo: String((e as Error).message) }; }
    };

    // -----------------------------------------------------------------------
    // CAMINO 1 — LA MEMORIA. CERO LLAMADAS AL MODELO.
    // Si esta pregunta ya se contesto bien, el armado quedo guardado entero.
    // Se vuelven a correr SUS consultas —asi los datos son de ahora, no una
    // foto vieja— y se pinta con el mismo codigo que el circuito.
    // Si cualquier consulta falla o viene vacia, NO se muestra: se sigue de
    // largo al circuito. Una respuesta guardada que ya no corre es basura, y
    // mostrarla seria exactamente el defecto que todo esto frena.
    // -----------------------------------------------------------------------
    if (!soloMedir && !sinMemoria) {
      const guardado = await rpc("api_ia_armado_memoria", { p_pregunta: pregunta }, jwt)
        .catch(() => null);
      const arm = guardado?.hay ? guardado.armado : null;
      const decl: any[] = Array.isArray(arm?.bloques) ? arm.bloques : [];
      if (decl.length && decl.length <= MAX_BLOQUES_MEMORIA) {
        const pares: { b: any; f: any }[] = [];
        let sirve = true;
        for (const b of decl) {
          const f = await correrSql(String(b?.sql ?? ""));
          if (!f?.ok || Number(f?.filas ?? 0) <= 0) { sirve = false; break; }
          pares.push({ b, f });
        }
        if (sirve && pares.length) {
          /* La memoria TAMBIEN se controla, y no por simetria: sus consultas
             se vuelven a correr sobre los datos de HOY, asi que una respuesta
             que ayer cerraba puede no cerrar mas. Controlarla solo al
             guardarla seria controlar una foto vieja. */
          avisar("controla", { de: "la memoria" });
          const bloquesMem = construirBloques(pares);
          const controlMem = await controlarCifras(bloquesMem, jwt);
          return json(respuestaConBloques({
            origen: "memoria", pregunta, consultas: pares.map((p) => ({
              sql: p.f.sql, filas: p.f.filas, ms: p.f.ms })),
            pasos: [], llamadas: 0, modelo: null,
            tokens: { entrada: 0, salida: 0, leidos_del_cache: 0 },
            de_memoria: true,
            control: controlMem,
            nota_memoria: "Esta pregunta ya se había contestado. Se volvieron a correr sus " +
                          "consultas, así que los datos son de ahora. No costó nada.",
            ms: Date.now() - arranque,
          }, arm, bloquesMem));
        }
      }
    }

    // -----------------------------------------------------------------------
    // CAMINO 2 — EL CIRCUITO CON LA IA.
    // -----------------------------------------------------------------------
    const diccionario = await rpc("api_ia_saber", {}, jwt);
    const hoy = new Date().toISOString().slice(0, 10);
    const sistema = instrucciones(String(diccionario ?? ""), hoy);

    /* los tres se piden juntos: son independientes y asi no se suman las esperas */
    const [ejemplos, mapa, recordada] = await Promise.all([
      rpc("api_ia_ejemplos",    { p_pregunta: pregunta, p_max: 4 }, jwt).catch(() => null),
      rpc("api_ia_mapa_buscar", { p_texto: pregunta, p_max: 3 },    jwt).catch(() => null),
      rpc("api_ia_memoria",     { p_pregunta: pregunta },           jwt).catch(() => null),
    ]);
    const sobre = sobreDeContexto(ejemplos, mapa, recordada);

    if (soloMedir) {
      return json({ ok: true, origen: "medicion", modelo: MODELO,
        bytes_del_sistema: sistema.length,
        bytes_del_diccionario: String(diccionario ?? "").length,
        bytes_del_sobre: sobre.length,
        ejemplos_encontrados: Array.isArray(ejemplos) ? ejemplos.length : 0,
        tablas_del_mapa: Array.isArray(mapa) ? mapa.length : 0,
        recordada: recordada?.recordada === true,
        presupuesto: await rpc("api_ia_presupuesto", { p_estimado_usd: 0 }, jwt),
        ms: Date.now() - arranque });
    }

    const mensajes: any[] = [{ role: "user", content: pregunta + sobre }];
    let armado: any = null;
    let ultimaConsulta: any = null;
    const consultas: any[] = [];
    const resultados: any[] = [];   /* cada consulta que corrio, COMPLETA */
    const aplanar = (s: string) => String(s ?? "").replace(/\s+/g, " ").trim();

    for (let paso = 1; paso <= MAX_PASOS; paso++) {
      avisar("piensa", { paso, de: MAX_PASOS });
      /* EL TOPE, ANTES de llamar. */
      const pres = await rpc("api_ia_presupuesto", { p_estimado_usd: 0.05 }, jwt);
      if (pres && pres.permite === false) {
        return json({
          ok: false, origen: "sin_presupuesto", pregunta, pasos, consultas,
          presupuesto: pres,
          respuesta:
            "El presupuesto de la Ayuda para hoy está usado (" + pres.motivo + "). " +
            "Las preguntas que ya se contestaron antes siguen funcionando sin costo. " +
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
      /* se cobra separando el cache: lo leido cuesta la decima parte y lo
         escrito 1,25 veces. Cobrarlo todo al precio de entrada mostraria MAS
         de lo que se paga, que es tan malo como mostrar menos. */
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

      avisar("usa", { paso, herramientas: usos.map((u) => u.name),
                      razono: piezas.some((b) => b?.type === "thinking") });

      if (!usos.length) {
        /* no pidio herramienta: contesto en palabras y nada mas */
        return json({
          ok: true, origen: "texto", pregunta, pasos, consultas,
          armado: null, datos: ultimaConsulta?.datos ?? [], filas: ultimaConsulta?.filas ?? 0,
          sql: ultimaConsulta?.sql ?? null,
          respuesta: texto || "No llegó respuesta del modelo.",
          modelo: MODELO, tokens: { entrada: tIn, salida: tOut, leidos_del_cache: tCacheLee },
          llamadas, ms: Date.now() - arranque,
        });
      }

      mensajes.push({ role: "assistant", content: piezas });
      const respuestasDeHerramientas: any[] = [];

      for (const u of usos) {
        if (u.name === "contestar") { armado = u.input;
          respuestasDeHerramientas.push({ type: "tool_result", tool_use_id: u.id,
            content: "listo" });
          continue; }

        if (u.name === "buscar_en_el_mapa") {
          let res: any;
          try {
            res = await rpc("api_ia_mapa_buscar",
              { p_texto: String(u.input?.texto ?? ""),
                p_max: Math.min(Math.max(Number(u.input?.cuantas ?? 5), 1), 8) }, jwt);
          } catch (e) { res = { ok: false, motivo: String((e as Error).message) }; }
          respuestasDeHerramientas.push({ type: "tool_result", tool_use_id: u.id,
            content: JSON.stringify(res).slice(0, 24000) });
          continue;
        }

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
          const res: any = await correrSql(String(u.input?.sql ?? ""));

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
        modelo: MODELO, tokens: { entrada: tIn, salida: tOut, leidos_del_cache: tCacheLee },
        llamadas, ms: Date.now() - arranque,
      });
    }

    /* ---- UN BLOQUE POR CADA COSA QUE PREGUNTARON ----
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

    const pares = declarados.map((b: any) => ({
      b, f: buscarFuente(b.sql) ?? (declarados.length === 1 ? ultimaConsulta : null),
    }));
    avisar("controla", { de: "las cifras" });
    const bloques = construirBloques(pares);

    /* cada cifra, contra una fuente que no es la que la calculo */
    const control = await controlarCifras(bloques, jwt);

    /* ---- SE GUARDA LO QUE SALIO BIEN ----
       Solo si TODOS los bloques trajeron datos: guardar una respuesta a medias
       haria que la proxima vez salga a medias y gratis, que es peor.
       Y SOLO SI NINGUNA CIFRA CHOCA contra su fuente independiente: una
       respuesta mala memorizada se sirve gratis y para siempre.
       Un fallo al guardar no puede romper la respuesta: va con catch y se
       declara en `guardado`. */
    let guardado: any = null;
    const todosConDatos = bloques.length > 0 && bloques.every((b: any) => !b.sin_datos);
    const sinChoques = control.chocan === 0;
    if (todosConDatos && sinChoques) {
      guardado = await rpc("api_ia_armado_guardar",
        { p_pregunta: pregunta, p_armado: armado, p_modelo: MODELO }, jwt).catch(() => null);
      const principal = pares[0]?.f;
      if (principal?.sql) {
        await rpc("api_ia_aprender",
          { p_pregunta: pregunta, p_sql: principal.sql, p_filas: principal.filas }, jwt)
          .catch(() => {});
      }
    }

    return json(respuestaConBloques({
      origen: "circuito", pregunta,
      consultas, pasos, llamadas,
      modelo: MODELO,
      tokens: { entrada: tIn, salida: tOut, leidos_del_cache: tCacheLee },
      aprendio: todosConDatos && sinChoques && guardado?.guardado === true,
      no_aprendio_por_que: (todosConDatos && !sinChoques)
        ? "No se memorizó: " + control.chocan + " cifra(s) no coinciden con su fuente "
          + "independiente. Una respuesta mala memorizada se serviría gratis y para siempre."
        : null,
      control,
      ejemplos_que_vio: Array.isArray(ejemplos) ? ejemplos.length : 0,
      tablas_del_mapa_que_vio: Array.isArray(mapa) ? mapa.length : 0,
      presupuesto: await rpc("api_ia_presupuesto", { p_estimado_usd: 0 }, jwt).catch(() => null),
      ms: Date.now() - arranque,
    }, armado, bloques));
  } catch (e) {
    return json({
      ok: false, origen: "excepcion", pregunta, pasos,
      respuesta: "Algo falló al procesar la pregunta.",
      detalle: String((e as Error)?.message ?? e),
      tokens: { entrada: tIn, salida: tOut },
      ms: Date.now() - arranque,
    });
  }
}

/* =====================================================================
   EL ENVOLTORIO. Decide por la cabecera Accept y nada mas.
   =====================================================================
   SIN Accept: text/event-stream contesta exactamente lo de preguntar4.
   CON ella manda un evento por paso y uno final con el MISMO cuerpo.
   El cuerpo final no se arma aparte: se lee de la Response que devuelve
   manejar(), asi no hay dos formas de armar la respuesta que se puedan
   separar con el tiempo. Eso ya paso el 30/10 con `listas`.
   ===================================================================== */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const quiereVivo = (req.headers.get("accept") ?? "").includes("text/event-stream");
  if (!quiereVivo) return await manejar(req, () => {});

  const enc = new TextEncoder();
  const flujo = new ReadableStream({
    async start(ctrl) {
      let abierto = true;
      const mandar = (tipo: string, dato: any) => {
        if (!abierto) return;
        /* SI EL AVISO ROMPE, SE TRAGA. Un control que rompe la pantalla
           que vigila es peor que no tenerlo: si el navegador ya cerro,
           enqueue tira, y esa excepcion no se puede llevar puesta la
           respuesta que el modelo ya pago. */
        try { ctrl.enqueue(enc.encode("event: " + tipo + "\ndata: " + JSON.stringify(dato ?? {}) + "\n\n")); }
        catch (_) { abierto = false; }
      };
      try {
        const r = await manejar(req, mandar);
        const cuerpo = await r.json().catch(() => ({
          ok: false, origen: "respuesta_ilegible",
          respuesta: "La respuesta no se pudo leer como JSON." }));
        mandar("fin", cuerpo);
      } catch (e) {
        mandar("fin", { ok: false, origen: "excepcion",
                        respuesta: "Algo falló al procesar la pregunta.",
                        detalle: String((e as Error)?.message ?? e) });
      }
      try { ctrl.close(); } catch (_) {}
    },
  });

  return new Response(flujo, {
    headers: { ...CORS, "Content-Type": "text/event-stream; charset=utf-8",
               "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
  });
});
