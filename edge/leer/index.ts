// LA LECTURA — la Ayuda contesta como se contesta de frente.   15/10/2026
//
// ---------------------------------------------------------------------------
// POR QUE EXISTE
//
// La Ayuda resolvia bien y contestaba mal. La intencion traia las 219 filas
// de agosto en 0,8 s, con el sello "Resuelta sin costo", y le dejaba al
// usuario una tabla de 23 columnas para que la lea el. Pero el usuario no
// pregunta para ver una tabla: pregunta para que le digan QUE PASA. El dato
// estaba; la lectura del dato no.
//
// Esta funcion NO consulta la base y NO escribe SQL. Recibe las filas que la
// base ya trajo y el resumen que la base ya calculo, y escribe arriba la
// lectura. El circuito queda: la intencion trae el dato (gratis, 0,8 s, sin
// poder inventar una consulta) y el modelo lo lee.
//
// LA REGLA DEL PROYECTO QUE ESTA FUNCION TIENE QUE RESPETAR:
// "Ninguna cifra sale de una estimacion." Por eso los totales llegan
// calculados en SQL por api_ia_resumen_datos y el modelo tiene prohibido
// sumar. Si el modelo suma, inventa, y una cifra inventada disfrazada de
// respuesta es peor que no contestar.
//
// ---------------------------------------------------------------------------
// 22/10/2026 — LO QUE SE ARREGLO ACA, Y POR QUE SE COMIO EL CREDITO
//
// Esta funcion le mandaba al modelo HASTA 260 FILAS ENTERAS (tope 420 KB).
// Para el informe de OC contra pedido eso son 219 renglones por 23 columnas:
// ~200 KB de JSON, medidos en ~77.000 tokens de entrada POR PREGUNTA. Y no
// anotaba nada: el 15/10 la lectura paso de Haiku a claude-opus-5-5 y el
// gasto quedo sin registro ni en la base ni en la pantalla. El panel mostraba
// "sin costo" mientras se consumia el credito de la cuenta.
//
// Las dos cosas estaban mal POR LA MISMA RAZON: mandarle las filas enteras no
// sirve para nada. Los totales, los distintos, los maximos, los minimos y los
// ponderados LOS CALCULA LA BASE en api_ia_resumen_datos, sobre TODAS las
// filas, y al modelo se le prohibe sumar. Las filas solo sirven para que vea
// COMO es un renglon y que patron se repite. Para eso alcanzan 40.
//
//   FILAS_ENTERAS  260 -> 40      TOPE_BYTES  420.000 -> 60.000
//   muestra         60 -> 40      + api_lectura_anotar en cada llamada
//
// Medido el 22/10 sobre el informe de OC de agosto (219 x 23): el contenido
// que viaja pasa de ~197 KB a ~37 KB. El resumen no se toca, asi que ninguna
// cifra de la lectura cambia: las cifras nunca salieron de las filas.
//
// Y el prompt ahora avisa explicitamente que las filas pueden ser una muestra,
// para que no cuente casos sobre ella. Sin ese bloque, recortar las filas
// cambiaria "hay tres renglones asi" de verdadero a falso.
// ---------------------------------------------------------------------------
//
// CUATRO COSAS MEDIDAS EL 15/10/2026, cada una despues de una corrida fallada:
//
//   1. LOS MODELOS SON LOS MEDIDOS, NO LOS SUPUESTOS. Se consulto
//      GET /v1/models con la clave real: la cuenta tiene claude-opus-5-5,
//      claude-sonnet-5-5, claude-haiku-5-5 y claude-fable-5-1. La primera
//      version de esta funcion apuntaba a claude-opus-4-5-20251101, que NO
//      existe en esta cuenta. Antes de cambiar un nombre de modelo aca,
//      pedirle la lista a la API con {"listar":true} -- no gasta tokens.
//
//   2. ESTOS MODELOS PIENSAN POR DEFECTO, Y EL RAZONAMIENTO SE COME EL
//      max_tokens. Con max_tokens 1600 la API devolvia 200 OK y CERO bloques
//      de texto: 20 s de razonamiento, presupuesto agotado, respuesta
//      truncada. Por eso MAX_TOKENS es grande y el texto se saca filtrando
//      los bloques type === 'text' -- nunca content[0], que es el bloque de
//      razonamiento. Si alguna vez vuelve vacio, mirar stop_reason: si dice
//      'max_tokens', falta presupuesto.
//
//   3. EL MODELO DABA UNA LISTA INCOMPLETA CON PINTA DE COMPLETA. En la
//      primera corrida buena nombro "OC 5005, 5029 y 5057" con fecha anterior
//      al pedido que citan, y en la base son 6 renglones en 4 OC: se comio la
//      4979. Los otros siete controles dieron exactos. Por eso el prompt lleva
//      el bloque TODA LISTA LLEVA SU TOTAL: el defecto no era del dato, era de
//      como se presentaba.
//
//   4. EL MODELO CONTO EL SOLO Y LE DIO MAL. Escribio "medido sobre 203 de 219
//      renglones, en 54 OC", y el resumen que le llego decia, para oc_nro,
//      distintos: 94. Sobre las 203 comparables son 89. El 54 no sale de
//      ningun lado. Por eso el prompt lleva el bloque CUANTOS SON: el numero
//      de valores distintos se COPIA del resumen, no se cuenta.
// ---------------------------------------------------------------------------

const MODELOS = [
  "claude-opus-5-5",
  "claude-sonnet-5-5",
  "claude-haiku-5-5",
];

/** Grande a proposito: el razonamiento sale de aca adentro. Ver nota 2. */
const MAX_TOKENS = 8000;
/** Hasta aca se le mandan TODAS las filas. Mas que esto, resumen + muestra.
 *  40, no 260: ver la nota del 22/10 arriba. */
const FILAS_ENTERAS = 40;
/** Tope duro del paquete de filas. Una tabla ancha (36 columnas) no pasa. */
const TOPE_BYTES = 60_000;
/** Cuantas filas lleva la muestra cuando el resultado es mas grande. */
const FILAS_MUESTRA = 40;

const INSTRUCCIONES = `Sos el analista de datos de DISSAN, una drogueria de insumos medicos de
Mendoza. El que pregunta es el dueño. Te paso su pregunta, las filas que la
base YA trajo, y un resumen con los totales YA CALCULADOS EN SQL.

Tu trabajo es escribir la lectura: lo que le contestarias si te lo preguntara
de frente. No describas la tabla: deci que pasa.

=== LA REGLA QUE NO SE NEGOCIA: NO CALCULES NADA ===
Todas las cifras que escribas tienen que estar en el RESUMEN o en las FILAS que
te paso, copiadas tal cual. No sumes, no restes, no promedies, no estimes, no
saques porcentajes nuevos, no digas "aproximadamente". Si para contestar bien
necesitas un numero que no esta, NO LO DIGAS: deci en una linea que ese dato no
vino y que haria falta para tenerlo.
Una cifra inventada con pinta de respuesta es peor que no contestar, y en este
proyecto ya hizo equivocarse a informes enteros.
Los importes van como los trae el resumen, en pesos argentinos con punto de
miles: $223.750.574,52. Si una cifra es de millones podes escribirla corta
($223,8 millones) SOLO si tambien dejas la exacta al lado la primera vez.

EL PORCENTAJE DE MARGEN ESTA EN EL BLOQUE "ponderados" DEL RESUMEN, ya
calculado como suma(margen) / suma(venta) y suma(margen) / suma(costo). Usa
ESOS. El campo "promedio" de una columna de porcentaje es el PROMEDIO SIMPLE
por renglon y NO es el margen del periodo: promediando porcentajes da
-316.381,66% sobre los 29.368 renglones con costo, ponderando da 41,06%. Nunca
publiques el promedio de los porcentajes como si fuera el margen.

=== CUANTOS SON: SE COPIA DEL RESUMEN, NO SE CUENTA ===
Cuantas OC distintas, cuantos clientes distintos, cuantos articulos distintos:
ese numero YA ESTA calculado en el resumen, en el campo "distintos" de esa
columna. Copialo tal cual. NO lo cuentes vos.
El 15/10 escribiste "medido sobre 203 de 219 renglones, en 54 OC" y el resumen
que te llego decia, para oc_nro, distintos: 94. El 54 no salia de ningun lado.
Y ojo con el denominador: "distintos" esta medido sobre TODAS las filas. Si
queres decir cuantas OC distintas hay entre las comparables solas, ese numero
NO esta medido: o lo decis sobre el total ("94 OC en total") o no lo decis.
Mismo criterio para cualquier conteo: si no esta en el resumen, no se publica.

=== TODA LISTA LLEVA SU TOTAL ===
Si enumeras casos, la linea que los presenta dice CUANTOS son en total, y sobre
cuantos, ANTES de los ejemplos: "seis renglones en cuatro OC (4979, 5005, 5029
y 5057)". Si no los vas a nombrar todos, escribi "entre otras" o "las tres mas
grandes" y deci cuantas quedan afuera.
Contalos en las filas ANTES de escribir la linea. Una lista que PARECE completa
y no lo es se lee como una cifra equivocada: es el mismo defecto que inventar un
numero. Esto ya paso una vez con las OC de fecha anterior al pedido.

=== LAS FILAS QUE TE LLEGAN PUEDEN SER UNA MUESTRA ===
Arriba de las filas dice cuantas te llegaron y cuantas hay en total. Si son una
muestra, NO cuentes casos sobre ella ni digas "hay tres renglones asi": en la
muestra hay tres, en el resultado puede haber treinta. Los conteos y los totales
salen del RESUMEN, que SIEMPRE esta medido sobre TODAS las filas. La muestra
sirve para ver COMO son los renglones y que patron se repite, no para contar.
Si nombras un caso que viste en la muestra, decilo asi: "por ejemplo, el
renglon de JHO0172".

=== COMO SE NOMBRA UN ARTICULO ===
Por el codigo de DISSAN, el de la columna de codigo (JHO0172, COLO0170): con ese
lo busca el en la pantalla. La descripcion suele traer adentro el codigo del
fabricante ("Prolene EP8735H 7-0"); si usas ese, poné los dos:
JHO0172 (Prolene EP8735H).

=== COMO SE ESCRIBE ===
1. PRIMERA LINEA: la respuesta. El numero que contesta la pregunta, con el
   periodo al que corresponde y sobre cuantos renglones esta medido. Sin
   introduccion, sin "segun los datos", sin repetir la pregunta.
2. Despues, lo que el dato muestra y NO se ve mirando la tabla: que se repite,
   que se sale de la norma, que dos cifras no cierran entre si.
3. Si hay algo que esta MAL en los datos de ellos -- un costo imposible, un
   lote cargado dos veces, una factura emitida por debajo del costo, una OC que
   cita un pedido que no existe -- eso va arriba de todo lo demas: es plata.
4. BUSCA EL PATRON ANTES DE DAR UNA LISTA. Si el mismo articulo aparece nueve
   veces con el mismo porcentaje exacto, eso NO son nueve errores de tipeo: es
   una relacion entre la lista de venta y la lista de compra, y se dice asi. Un
   caso suelto y grande se nombra aparte de un patron que se repite.
5. DECI SIEMPRE SOBRE QUE DENOMINADOR HABLAS. "20 renglones" no se entiende;
   "20 de 203" si. Un porcentaje sin denominador no se publica.
6. Si el resumen dice que una columna tiene vacios, y eso cambia como se lee la
   cifra, decilo.
7. Cerra con que conviene hacer, en una sola linea, y solo si sale del dato.
   Si no sale del dato, no cierres con nada.

=== TONO ===
Castellano rioplatense, de vos. Directo, sin elogios, sin "es importante
destacar", sin "en resumen". Frases cortas. Nada de ingles.
No arranques con acuerdo ni con un parrafo de introduccion.
Si la respuesta incomoda, va igual, y va primero.

=== LARGO ===
Entre 4 y 12 lineas. Lo mas corto que alcance para que entienda que pasa. El ya
tiene la tabla abajo: no la repitas renglon por renglon. Nunca pases de 250
palabras.

=== FORMATO ===
Texto llano. Podes usar **negrita** para las cifras que importan y guiones al
principio de linea para una lista corta. Nada de titulos, nada de tablas, nada
de bloques de codigo.

=== LO QUE YA SE SABE DE ESTE NEGOCIO (medido, no supuesto) ===
Esto ya se midio contra la base y contra la lista del proveedor. No lo
contradigas y no lo vuelvas a calcular.

- EL MARGEN ES (precio - costo) / precio. Dividido por el costo es el marcado y
  da bastante mas alto. DISSAN mira los dos: 2026 da 36,5% sobre el precio y
  57,5% sobre el costo. Si el resumen trae los dos, nombra cual es cual.
- EL COSTO SALE DE LA ORDEN DE COMPRA QUE COMPRAS ASOCIA AL PEDIDO DE VENTA,
  escribiendo el numero de pedido en las observaciones del renglon de la OC. Si
  no hay OC, sale de la factura del proveedor por lote. Son dos fuentes
  independientes y donde las dos coinciden la cifra esta confirmada por dos
  documentos distintos.
- HAY RENGLONES QUE SE APARTAN A PROPOSITO y no suman a ninguna medicion. Son
  cuatro motivos, todos medidos el 08/10: el articulo se compra por caja y
  Tango no tiene el factor caja-a-unidad (inflaba costos 30x, 20x y 10x); el
  costo es menor al 5% del precio de venta (no es un costo, es un error de
  carga, casi siempre un factor de 1.000); el costo es mas de 4 veces el
  precio; el costo es menor a $1. Si la columna de observacion dice alguno de
  esos motivos, el renglon esta bien apartado: NO lo presentes como un dato que
  falta ni como una falla del sistema. Es el control funcionando.
- LA COBERTURA SE DECLARA SIEMPRE. El sistema no tiene stock inicial: se
  vendieron 5.130.074 unidades y se compraron 3.648.860 migradas, asi que hay
  renglones sin costo posible por ninguna via. Una cifra de margen sin decir
  sobre cuantos renglones esta medida no se publica.
- LOS IMPLANTES DE CONSIGNACION no llevan stock en Tango y casi nunca tienen
  OC: la mercaderia entra a $0,00 y el proveedor nunca factura el implante. En
  2026 son 521 renglones por $1.916.923.206, el 39% de lo facturado. Por eso el
  margen por zona puede no sumar al total de ventas.
- UNA FECHA DE VENCIMIENTO ANTERIOR AL AÑO 2000 (1800-01-01, 1900-01-01) NO es
  un vencimiento: es lo que escribe Tango cuando la partida no lleva control de
  vencimiento. Nunca la cuentes como vencida ni la muestres como fecha.
- UNA VENTA POR DEBAJO DEL COSTO DE LA OC ES UN HALLAZGO, NO UN ERROR DEL
  SISTEMA. Ya se midio: 73 renglones en 51 pedidos de 17 clientes por
  $18.725.446, del 10/10/2024 al 02/10/2026, y sigue pasando. Si aparecen en
  las filas, son plata que se perdio y van arriba.
- DOS CIFRAS DE LA MISMA PANTALLA QUE NO COINCIDEN SON UN DEFECTO, aunque cada
  una este bien para su funcion. Si las ves, decilo.

No expliques como llegaste. Escribi la lectura y nada mas.`;

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

/** Llama a una funcion de Postgres expuesta como public.api_* */
async function rpc(nombre: string, args: Record<string, unknown>) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${url}/rest/v1/rpc/${nombre}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key!,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(args),
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${nombre}: ${r.status} ${texto}`);
  return texto ? JSON.parse(texto) : null;
}

/**
 * EL MEDIDOR.  22/10/2026
 * Deja una fila en ayuda.registro con los tokens de ESTA lectura. Nunca
 * interrumpe la respuesta: si el medidor falla, la lectura se entrega igual y
 * el motivo queda en el log de la funcion. Lo que no puede pasar es que se
 * gaste sin registro, que es lo que paso del 15/10 al 22/10.
 */
async function anotar(datos: Record<string, unknown>) {
  try {
    return await rpc("api_lectura_anotar", datos);
  } catch (e) {
    console.error("no se pudo anotar la lectura:", String((e as Error)?.message ?? e));
    return null;
  }
}

/**
 * Saca el texto de la respuesta. NUNCA content[0]: estos modelos razonan y el
 * primer bloque es el razonamiento, que no tiene .text. Ver nota 2 arriba.
 */
function textoDe(salida: any): string {
  const bloques = Array.isArray(salida?.content) ? salida.content : [];
  return bloques
    .filter((b: any) => b?.type === "text" && typeof b?.text === "string")
    .map((b: any) => b.text)
    .join("\n")
    .trim();
}

/** Pide la lectura. Baja por la lista de modelos si el primero no existe. */
async function pedirLectura(llave: string, contenido: string) {
  let ultima: Response | null = null;
  for (const modelo of MODELOS) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": llave,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: MAX_TOKENS,
        system: [{ type: "text", text: INSTRUCCIONES, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: contenido }],
      }),
    });
    if (r.ok) return { resp: r, modelo };

    const cuerpo = await r.clone().text().catch(() => "");
    const esDelModelo =
      r.status === 404 ||
      (r.status === 400 && /model/i.test(cuerpo) &&
       /not_found|does not exist|invalid/i.test(cuerpo));
    ultima = r;
    if (!esDelModelo) return { resp: r, modelo };
  }
  return { resp: ultima!, modelo: MODELOS[MODELOS.length - 1] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const arranque = Date.now();

  try {
    const cuerpo = await req.json().catch(() => ({}));
    const llave = Deno.env.get("ANTHROPIC_API_KEY");

    if (!llave) {
      return json({
        ok: false, origen: "configuracion",
        motivo: "Falta ANTHROPIC_API_KEY en Supabase Secrets.",
      });
    }

    /* Control: que modelos tiene habilitados esta clave. No gasta tokens. */
    if (cuerpo?.listar === true) {
      const r = await fetch("https://api.anthropic.com/v1/models?limit=40", {
        headers: { "x-api-key": llave, "anthropic-version": "2023-06-01" },
      });
      const t = await r.text();
      const ids = [...t.matchAll(/"id":"([^"]+)"/g)].map((m) => m[1]);
      return json({ ok: r.ok, http: r.status, ids, en_uso: MODELOS });
    }

    /* Control del 22/10: cuanto PESA el paquete, sin llamar al modelo.
       Asi se mide el recorte sin gastar un token. */
    const soloMedir = cuerpo?.medir === true;

    const pregunta = String(cuerpo?.pregunta ?? "").trim();
    const datos = Array.isArray(cuerpo?.datos) ? cuerpo.datos : [];
    const titulo = String(cuerpo?.titulo ?? "").trim();
    const aviso = String(cuerpo?.aviso ?? "").trim();

    if (!pregunta) return json({ ok: false, origen: "vacia", motivo: "Falta la pregunta." });
    if (!datos.length) {
      return json({ ok: false, origen: "sin_datos",
                    motivo: "No llegaron filas que leer." });
    }

    /* ---- 1. El resumen lo calcula la BASE, no el modelo -------------------- */
    let resumen: unknown = null;
    try {
      resumen = await rpc("api_ia_resumen_datos", { p_datos: datos });
    } catch (e) {
      return json({ ok: false, origen: "resumen",
                    motivo: String((e as Error)?.message ?? e) });
    }

    /* ---- 2. Que filas se le mandan ----------------------------------------
       Los totales ya estan en el resumen, medidos sobre TODAS las filas. Las
       filas que van aca son para que vea COMO es un renglon. Ver la nota del
       22/10 arriba: mandar las 219 costaba ~77.000 tokens y no agregaba una
       sola cifra. */
    let filasTexto: string;
    let cuantas: number;
    const enteras = JSON.stringify(datos);

    if (datos.length <= FILAS_ENTERAS && enteras.length <= TOPE_BYTES) {
      filasTexto = enteras;
      cuantas = datos.length;
    } else {
      /* Muestra repartida a lo largo del resultado, para que no vea solo el
         principio: el patron puede estar en el medio. */
      const paso = Math.ceil(datos.length / FILAS_MUESTRA);
      let muestra = datos.filter((_: unknown, i: number) => i % paso === 0)
                         .slice(0, FILAS_MUESTRA);
      filasTexto = JSON.stringify(muestra);
      /* Una tabla muy ancha puede pasarse igual con 40 filas: se recorta hasta
         entrar en el tope. Nunca menos de 5, que ya no mostraria nada. */
      while (filasTexto.length > TOPE_BYTES && muestra.length > 5) {
        muestra = muestra.slice(0, Math.max(5, Math.floor(muestra.length / 2)));
        filasTexto = JSON.stringify(muestra);
      }
      cuantas = muestra.length;
    }

    const contenido =
      `PREGUNTA DEL DUEÑO: ${pregunta}\n\n` +
      (titulo ? `QUE ENTENDIO EL SISTEMA: ${titulo}\n` : "") +
      (aviso ? `SUPUESTO QUE TOMO: ${aviso}\n` : "") +
      `\nRESUMEN CALCULADO EN SQL (de aca salen las cifras, copialas tal cual):\n` +
      `${JSON.stringify(resumen)}\n\n` +
      `FILAS (${cuantas} de ${datos.length}` +
      (cuantas < datos.length
        ? `, UNA MUESTRA repartida a lo largo del resultado — NO cuentes casos sobre ` +
          `ella; los totales del resumen SI estan medidos sobre las ${datos.length}`
        : " — todas") +
      `):\n${filasTexto}\n\n` +
      `Escribi la lectura.`;

    if (soloMedir) {
      return json({
        ok: true, medicion: true,
        filas_totales: datos.length, filas_que_viajan: cuantas,
        bytes_de_las_filas: filasTexto.length,
        bytes_del_resumen: JSON.stringify(resumen).length,
        bytes_del_contenido: contenido.length,
        bytes_si_fueran_todas: enteras.length,
        tokens_aprox_del_contenido: Math.round(contenido.length / 3.6),
        ms: Date.now() - arranque,
      });
    }

    /* ---- 3. La lectura ----------------------------------------------------- */
    const { resp, modelo } = await pedirLectura(llave, contenido);

    if (!resp.ok) {
      const detalle = await resp.text();
      const motivo =
        resp.status === 401 ? "La clave de la API no es valida."
        : resp.status === 429 ? "La API esta limitando el ritmo."
        : /credit|balance/i.test(detalle) ? "Se acabo el credito de la API."
        : `La API devolvio ${resp.status}.`;
      /* Tambien se anota lo que NO salio: una pregunta que fallo igual
         consumio tiempo, y el registro tiene que mostrar el intento. */
      await anotar({ p_pregunta: pregunta, p_modelo: modelo, p_in: 0, p_out: 0,
                     p_ms: Date.now() - arranque, p_ok: false, p_motivo: motivo,
                     p_filas: datos.length });
      return json({ ok: false, origen: "api", motivo, detalle: detalle.substring(0, 400),
                    ms: Date.now() - arranque });
    }

    const salida = await resp.json();
    const texto = textoDe(salida);
    const tokens = {
      entrada: salida?.usage?.input_tokens ?? 0,
      salida: salida?.usage?.output_tokens ?? 0,
    };

    if (!texto) {
      await anotar({ p_pregunta: pregunta, p_modelo: modelo,
                     p_in: tokens.entrada, p_out: tokens.salida,
                     p_ms: Date.now() - arranque, p_ok: false,
                     p_motivo: "El modelo no devolvio texto.", p_filas: datos.length });
      return json({
        ok: false, origen: "vacia_modelo",
        motivo: "El modelo no devolvio texto.",
        stop_reason: salida?.stop_reason ?? null,
        bloques: (Array.isArray(salida?.content) ? salida.content : [])
                   .map((b: any) => b?.type),
        tokens,
        ms: Date.now() - arranque,
      });
    }

    /* EL MEDIDOR: el costo vuelve A LA PANTALLA, no se queda en el servidor.
       Si el modelo no tiene precio cargado en ayuda.precio_modelo, costo_usd
       viene null y la pantalla muestra los tokens sin inventar dolares. */
    const anotado = await anotar({
      p_pregunta: pregunta, p_modelo: modelo,
      p_in: tokens.entrada, p_out: tokens.salida,
      p_ms: Date.now() - arranque, p_ok: true, p_motivo: null,
      p_filas: datos.length,
    });

    return json({
      ok: true,
      lectura: texto,
      modelo,
      stop_reason: salida?.stop_reason ?? null,
      filas_leidas: cuantas,
      filas_totales: datos.length,
      tokens,
      costo_usd: anotado?.costo_usd ?? null,
      tiene_precio: anotado?.tiene_precio === true,
      ms: Date.now() - arranque,
    });
  } catch (e) {
    return json({
      ok: false, origen: "excepcion",
      motivo: String((e as Error)?.message ?? e),
      ms: Date.now() - arranque,
    });
  }
});
