// Ayuda inteligente de DISSAN — el motor de preguntas.
//
// ---------------------------------------------------------------------------
// POR QUE SE REESCRIBIO (05-10-2026)
//
// El diseño anterior era de un solo tiro: se adivinaban 6 tablas comparando
// palabras contra las descripciones del DER, se le pasaban al modelo y lo que
// saliera, salía. Si el modelo inventaba una columna, la consulta se rechazaba
// y el usuario veía un error. Si no entendía la pregunta, contestaba NO_SE.
// Cada falla nueva pedía una regla nueva. Eso no cierra nunca.
//
// Ahora el circuito está cerrado. Tres cosas, y ninguna es una regla escrita a
// mano:
//
//   1. SE DEJA DE ADIVINAR DE QUE HABLA LA PREGUNTA.
//      ayuda.anclas_de resuelve el artículo o el cliente contra su maestro: por
//      el código (COLO0170), por el número del fabricante que está dentro del
//      nombre (28412 -> COLO0170) o por el nombre mismo (hospital central).
//      Si no existe, no inventa.
//
//   2. SE DEJA DE ADIVINAR DONDE ESTAN LOS DATOS.
//      ayuda.donde_vive_el_codigo busca el código EN LOS DATOS y cuenta en qué
//      tablas aparece y cuántas filas hay. Eso es medido. Las palabras de la
//      pregunta sólo eligen entre esas tablas, pesadas por lo discriminantes
//      que son (IDF), y la cabecera viaja siempre con el renglón.
//
//   3. SE DEJA DE CONTESTAR A CIEGAS.
//      El modelo ya no tiene un solo intento. Si la base rechaza la consulta,
//      se le devuelve el error exacto MAS LAS COLUMNAS REALES de la tabla que
//      falló y en qué tablas sí vive la columna que buscaba (api_ia_columnas),
//      y la corrige. Si la consulta corre pero vuelve vacía, se le avisa y
//      afloja el filtro. Hasta 3 intentos.
//
// Y sólo se aprende lo que quedó verificado: ayuda.aprender ya no guarda
// consultas de 0 filas, y si una consulta se reescribe se le limpia el pulgar
// para que la versión corregida pueda volver a usarse.
//
// Nada se ejecuta sin pasar por ayuda.validar_sql: sólo SELECT o WITH, y la
// tabla y la columna tienen que existir.
// ---------------------------------------------------------------------------

// Se prueba el primero; si la cuenta no lo tiene habilitado, se cae solo al
// siguiente. Asi un nombre de modelo que no exista nunca deja al sistema mudo.
const MODELOS = [
  "claude-sonnet-4-5-20250929",
  "claude-haiku-4-5-20251001",
];
const MODELO = MODELOS[0];
const TABLAS_DE_CONTEXTO = 8;
const MAX_TOKENS = 1200;
const MAX_INTENTOS = 3;

const INSTRUCCIONES =
`Sos el traductor de preguntas a SQL del sistema de gestión de DISSAN, una
droguería de insumos médicos. La base es PostgreSQL y tiene las 580 tablas de
Tango Gestión migradas, en el esquema public.

Te paso las tablas candidatas con sus columnas y el rol de cada una:
  clave      identificador
  medida     número que se suma o promedia
  dimension  sirve para agrupar
  fecha      fecha
  enlace     apunta a otra tabla
  constante  siempre el mismo valor — NO LA USES
  marca      verdadero/falso

QUÉ TE PIDEN Y QUÉ TENÉS QUE DEVOLVER
La persona escribe como habla, no como un programador. Puede pedirte "un
reporte", "un informe en HTML", "un dashboard interactivo", "un gráfico", "un
PDF", "una pantalla". Vos no generás nada de eso: devolvés SOLO la consulta SQL
que trae los datos. Ignorá por completo la parte de formato y contestá la parte
de datos. NUNCA respondas NO_SE porque te pidieron una presentación que no podés
generar: el pedido real son los datos.

NO INVENTES COLUMNAS. Usá exclusivamente las que figuran en la lista de columnas
de cada tabla del contexto. Si el dato que necesitás no está en esa tabla, está
en otra: fijate en "COMO SE UNEN" y traelo de ahí con un join. Inventar una
columna hace que la consulta se rechace y el usuario se quede sin respuesta.

SI EL CONTEXTO EMPIEZA CON "CODIGOS RECONOCIDOS EN LA PREGUNTA"
Ese código ya fue buscado y verificado contra la base: existe de verdad. Puede
haber salido del código escrito tal cual, del número del fabricante que está
dentro del nombre del producto, o del nombre del cliente. Usalo tal cual en el
WHERE, con la columna que te indica el contexto. Debajo, en "DONDE ESTAN ESOS
DATOS", tenés contado en qué tablas aparece y cuántas filas hay en cada una:
empezá por las que más tienen. Si es un artículo, traé también su descripción
desde sta11 para que la respuesta se entienda sin tener que buscar qué es ese
código.

CUÁNDO USAR NO_SE
Casi nunca. Solamente si la pregunta no tiene NADA que ver con esta base (por
ejemplo "qué hora es" o "contame un chiste"). Si la pregunta habla de artículos,
ventas, compras, stock, clientes, proveedores, precios, costos, partidas,
lotes, vencimientos, pedidos, facturas o cuentas corrientes, SIEMPRE hay algo
que podés contestar: devolvé la mejor consulta posible, aunque sea parcial.
Una respuesta parcial sirve; NO_SE no sirve para nada.

Si la pregunta pide varias cosas a la vez (por ejemplo lotes Y ventas), traé la
más importante en una sola consulta clara, con las columnas que identifican al
artículo. No intentes meter todo a la fuerza.

REGLAS DEL NEGOCIO DE DISSAN — medidas contra la base, no supuestas.
Estas cosas ya hicieron equivocarse a informes enteros. Respetalas siempre.

a) EL COSTO DE UNA VENTA sale de mv_margen_real.costo_real. NO uses
   gva53.prec_ulc_l, NI sta12, NI sta10.costo_lo. Los tres están mal, cada uno por
   su motivo, y los tres ya hicieron equivocarse a informes enteros.

   Medido el 05/10/2026: prec_ulc_l lo copia Tango desde sta12, el maestro de
   costos, y ese maestro está abandonado. Tiene ceros (COLO0088 figura con costo 0
   y reposición $6.396,95 cuando las 19 compras de 2026 van de $1.888 a $3.061),
   tiene fechas de última compra 01/01/1800 en artículos que SÍ tienen facturas de
   compra cargadas en 2026, y el 01/07/2026 alguien corrió una revaluación masiva
   que dejó el campo "reposición" muy por encima del costo real. Los 22 renglones
   que ese campo marcaba como la peor pérdida de febrero-marzo 2026 en realidad
   GANAN entre 23% y 55%.

   Para cualquier pregunta de margen, rentabilidad, ganancia, utilidad, pérdida o
   costo de una venta: usá mv_margen_real. Ya viene armada, no hay que hacer joins.
   Trae por cada renglón facturado:
     cod_articu, detalle, fecha_venta, cantidad, precio_unitario,
     costo_real, costo_estampado, origen_costo, fecha_costo,
     venta_renglon, costo_renglon, margen_renglon, margen_pct, bajo_costo,
     cliente, cod_client, vendedor, zona, provincia, localidad,
     cod_proveedor, sinonimo_articulo, talonario

   Para el costo de un artículo en una fecha: mv_costo_compra (cod_articu, fecha,
   costo, cantidad). Sale de las facturas de compra reales (cpa46 + cpa04).

   COBERTURA: mv_margen_real mide el 93,4% de los renglones. Los artículos sin
   ninguna factura de compra quedan con costo_real nulo. Si calculás márgenes,
   filtrá costo_real is not null y aclará sobre cuántos renglones estás midiendo.

   origen_costo dice de dónde salió: 'compra anterior' es firme; 'compra posterior'
   es una aproximación, porque no había ninguna compra previa a esa venta. Si
   mostrás renglones sueltos, conviene mostrar esa columna.

   costo_estampado guarda el valor viejo de Tango. Está SÓLO para comparar y
   mostrar la diferencia. Nunca calcules un margen con esa columna.

b) MARGEN es (precio - costo) / precio. NO es (precio - costo) / costo: eso es
   el marcado, y da un número bastante más alto. Si te piden margen, dividí por
   el precio.

c) UNA FECHA DE VENCIMIENTO ANTERIOR AL AÑO 2000 (1800-01-01, 1900-01-01) NO es
   un vencimiento: es lo que escribe Tango cuando la partida no lleva control de
   vencimiento. Nunca la cuentes como vencida ni la muestres como fecha. Para
   vencidos de verdad: fecha_vto >= '2000-01-01' and fecha_vto < current_date.

d) SI CRUZÁS VENTAS CON LOTES/PARTIDAS, la tabla base tiene que ser la de ventas
   (gva53), con left join hacia sta10. Nunca al revés: sta10 es el saldo de HOY y
   no conserva las partidas ya consumidas, así que arrancando de sta10 se pierden
   ventas en silencio. Medido en COLO0170: arrancando de sta10 se caen 16 de 300
   renglones y $31.989.465 de $328.499.005.

e) Las ventas facturadas son t_comp = 'FAC' en gva53/gva12. Si te piden
   facturación o ventas, filtrá por eso salvo que pidan otra cosa.

f) UN MARGEN DE VARIOS RENGLONES SE PONDERA POR IMPORTE. Nunca promedies
   porcentajes. Con mv_margen_real va así:
     round(sum(margen_renglon) / nullif(sum(venta_renglon),0) * 100, 1)
   y NO así:
     avg(margen_pct)
   Medido el 05/10/2026 sobre los 29.368 renglones con costo real: promediando
   porcentajes da -316.381,66% y ponderando da 41,06%. El promedio simple lo
   arruina un puñado de renglones con precio casi cero, donde el porcentaje se
   dispara. En un artículo solo pasa lo mismo más suave: COLO0170 da 39,02%
   promediando y 28,04% ponderando, 11 puntos de diferencia.
   Si mostrás un margen junto a totales, que el margen sea coherente con esos
   totales: el margen tiene que ser el cociente de los totales que mostrás.

g) UN MES SIEMPRE VA CON SU AÑO. Si el usuario nombra un mes y no dice el año,
   es el año de current_date. Filtrá las dos cosas:
     extract(month from fecha_emis) = 9
     and extract(year  from fecha_emis) = extract(year from current_date)
   NUNCA filtres solo el mes: eso suma el mismo mes de todos los años y multiplica
   el total. Medido: "cuánto facturamos en septiembre" sumando todos los
   septiembres da $1.690.273.222; septiembre de 2026 solo son $763.294.963.

h) NO DEDUZCAS EL AÑO CON max(fecha). La base tiene un comprobante cargado con
   fecha del año 2202 (recibo E0000000153319), así que max(fecha_emis) te manda
   a un año sin datos y la respuesta vuelve vacía. El presente es current_date.
   Si filtrás por rango, acotá fecha_emis between '2000-01-01' and current_date.

Reglas:
1. Contestá ÚNICAMENTE con la consulta SQL. Sin explicación, sin markdown, sin punto y coma final.
2. Sólo SELECT o WITH. Nunca INSERT, UPDATE, DELETE, DROP, ALTER ni CREATE.
3. Usá sólo las tablas y columnas que figuran en el contexto. No inventes nombres.
4. Nombrá las columnas del resultado en castellano claro, con AS.
5. Los importes van redondeados a 2 decimales.
6. Si la pregunta menciona un período y la tabla tiene columna de fecha, filtrá por ella.
   Los meses van por número: septiembre es 9.
7. Si contar filas alcanza para contestar, usá count(*) y nada más.
8. Si la consulta puede devolver muchas filas, ordenala por lo que importa y poné LIMIT 200.
9. Para unir un renglón con su comprobante usá las columnas que figuran en
   "COMO SE UNEN". En ventas, gva53 se une con gva12 por (t_comp, n_comp), y la
   fecha y el cliente están en gva12, no en el renglón.

ES POSTGRESQL, NO SQL SERVER. Estas tablas vienen de Tango (SQL Server), pero
hoy están en PostgreSQL. Entonces:
- Para limitar filas va LIMIT n AL FINAL. Nunca "SELECT TOP n". "TOP" no existe.
- Concatenar es || o concat(), no +.
- Para la fecha de hoy va current_date, no GETDATE().
- Para cortar texto va substring(x from 1 for 3), no SUBSTRING(x,1,3).
- Nada de corchetes [] alrededor de los nombres.

No expliques nada. Sólo la consulta, o NO_SE.`;

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

/** Llama a una función de Postgres expuesta como public.api_* */
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

/** Saca el SQL de la respuesta, por si vino envuelto en markdown. */
function limpiarSql(texto: string): string {
  return (texto || "")
    .trim()
    .replace(/^```(?:sql)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/;\s*$/, "")
    .trim();
}

/**
 * Lee el error que devolvió Postgres y saca de ahí qué tabla y qué columna
 * fallaron, para poder ir a buscar el esquema real de esa tabla.
 * Cubre las formas que usa Postgres:
 *   column sta08.cod_articu does not exist
 *   column "cod_articu" does not exist
 *   relation "stax" does not exist
 */
function leerElError(motivo: string): { tabla?: string; columna?: string } {
  const m = motivo || "";
  let r: { tabla?: string; columna?: string } = {};

  const conTabla = m.match(/column\s+"?([a-z0-9_]+)"?\."?([a-z0-9_]+)"?\s+does not exist/i);
  if (conTabla) return { tabla: conTabla[1], columna: conTabla[2] };

  const soloCol = m.match(/column\s+"?([a-z0-9_]+)"?\s+does not exist/i);
  if (soloCol) r.columna = soloCol[1];

  const rel = m.match(/relation\s+"?([a-z0-9_.]+)"?\s+does not exist/i);
  if (rel) r.tabla = rel[1].replace(/^public\./, "");

  return r;
}

/** Saca los nombres de tabla que aparecen después de from / join en el SQL. */
function tablasDelSql(sql: string): string[] {
  const out = new Set<string>();
  const re = /\b(?:from|join)\s+(?:public\.)?([a-z0-9_]+)/gi;
  let m;
  while ((m = re.exec(sql || "")) !== null) out.add(m[1].toLowerCase());
  return [...out].slice(0, 6);
}

/** Le pide la consulta al modelo. `correccion` es el texto del intento previo. */
async function pedirSql(llave: string, contexto: string, pregunta: string, correccion?: string) {
  const contenido = correccion
    ? `${contexto}\n\nPREGUNTA: ${pregunta}\n\n${correccion}\n\nSQL corregido:`
    : `${contexto}\n\nPREGUNTA: ${pregunta}\n\nSQL:`;

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

    if (r.ok) return r;

    // 404 / 400 por nombre de modelo: se prueba el siguiente de la lista.
    const cuerpo = await r.clone().text().catch(() => "");
    const esDelModelo =
      r.status === 404 ||
      (r.status === 400 && /model/i.test(cuerpo) && /not_found|does not exist|invalid/i.test(cuerpo));
    ultima = r;
    if (!esDelModelo) return r;
  }
  return ultima!;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  /* EL PORTERO: HACE FALTA LA SESION DE UNA PERSONA.          01/11/2026
     verify_jwt NO alcanza, y esto se MIDIO, no se supuso: con solo la clave
     publishable —que esta en el repositorio publico a proposito, porque lo
     que protege los datos es Auth + RLS— esta funcion llegaba a su logica
     de negocio y rechazaba por falta de DATOS, no por falta de sesion. O
     sea que cualquiera que lea el repositorio podia hacerla trabajar.
     ACA ESO VALE PLATA: es la que llama al modelo, y el credito de la
     API se acabo el 22/10.

     La clave publishable NO es un JWT: empieza con sb_ y no tiene puntos.
     Un JWT de usuario tiene tres partes separadas por punto. El panel manda
     siempre `Authorization: Bearer <access_token>` —medido en los cuatro
     lugares del panel que llaman a una Edge Function— asi que esto no le
     cambia nada a quien entra de verdad.

     Es la regla del 21/10 (sin JWT -> 0, falla cerrada) aplicada donde
     faltaba, y el mismo golpe del portero sin data-modulo del 31/10: una
     puerta que se saltea sola porque la condicion nunca se cumple. */
  {
    /* NO ALCANZA CON LA FORMA DEL TOKEN, Y ESTO TAMBIEN SE MIDIO.
       La primera version de este portero solo exigia que el Authorization
       tuviera la FORMA de un JWT (tres partes separadas por punto). Un
       senuelo lo rompio en cinco minutos: la clave anon LEGACY del proyecto
       —que sigue habilitada— ES un JWT de tres partes, con "role":"anon"
       adentro, asi que pasaba el control y esta funcion trabajaba igual.
       En `leer` la prueba llamo al modelo de verdad y gasto credito.
       Un control que mira la forma y no el contenido no es un control: es
       el mismo defecto que `if (mio && claves.indexOf(mio) === -1)` del
       31/10, que con mio = '' no hacia nada.
       Ahora se LEE el rol que el token declara y se exige authenticated,
       que es el rol que Supabase le pone al usuario que entro con su
       contrasena. Y se exige sub, que es quien es. */
    const autorizacion = req.headers.get("Authorization") || "";
    const quien = (() => {
      const m = /^bearer\s+([\w-]+)\.([\w-]+)\.([\w-]+)$/i.exec(autorizacion.trim());
      if (!m) return null;
      try {
        const b = m[2].replace(/-/g, "+").replace(/_/g, "/");
        const p = JSON.parse(atob(b + "=".repeat((4 - b.length % 4) % 4)));
        return p && p.role === "authenticated" && p.sub ? p : null;
      } catch { return null; }
    })();
    if (!quien) {
      return json({ ok: false, origen: "sin_sesion",
                    motivo: "Hace falta entrar al panel." }, 401);
    }
  }


  const arranque = Date.now();
  let pregunta = "";

  try {
    const cuerpo = await req.json().catch(() => ({}));
    pregunta = String(cuerpo?.pregunta ?? cuerpo?.texto ?? "").trim();

    const llave = Deno.env.get("ANTHROPIC_API_KEY");
    if (!llave) {
      return json({
        ok: false,
        origen: "configuracion",
        respuesta:
          "Falta la clave de la API. Hay que cargarla en Supabase, en " +
          "Project Settings → Edge Functions → Secrets, con el nombre ANTHROPIC_API_KEY.",
      });
    }

    if (cuerpo?.probar === true) {
      const ctx = await rpc("api_ia_contexto", { p_texto: "cuantos articulos hay", p_tablas: 2 });
      return json({
        ok: true, origen: "prueba", modelo: MODELO,
        respuesta: "La clave está cargada y la base responde.",
        base_ok: ctx?.ok === true,
      });
    }

    if (!pregunta) return json({ ok: false, origen: "vacia", respuesta: "Escribí una pregunta." });

    // ---- 1. Contexto: anclas verificadas + tablas medidas ------------------
    const ctx = await rpc("api_ia_contexto", {
      p_texto: pregunta,
      p_tablas: TABLAS_DE_CONTEXTO,
    });

    if (!ctx?.ok) {
      return json({
        ok: false, origen: "sin_contexto", pregunta,
        respuesta:
          "No encontré en la base ningún dato que tenga que ver con esa pregunta. " +
          "Probá nombrando el artículo, el cliente o el código del que querés saber.",
        motivo: ctx?.motivo ?? null,
        ms: Date.now() - arranque,
      });
    }

    // Si ya la sabemos y sigue funcionando, se contesta sin gastar tokens.
    if (ctx.recordada === true && ctx.sql) {
      const r = await rpc("api_ia_resolver", {
        p_texto: pregunta, p_sql: ctx.sql, p_origen: "recordada",
        p_ms: Date.now() - arranque, p_in: 0, p_out: 0,
      });
      if (r?.ok && (r.filas ?? 0) > 0) {
        return json({
          ok: true, origen: "recordada", pregunta,
          sql: r.sql, datos: r.datos ?? [], filas: r.filas ?? 0,
          tokens: { entrada: 0, salida: 0 }, ms: Date.now() - arranque,
        });
      }
      // si lo aprendido ya no sirve, se recalcula abajo
    }

    // ---- 2. Circuito cerrado: escribir, validar, corregir ------------------
    let correccion: string | undefined;
    let ultimoSql = "";
    let ultimoMotivo = "";
    let ultimaEtapa = "";
    const tIn = { e: 0, s: 0 };
    const bitacora: string[] = [];

    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
      const resp = await pedirSql(llave, ctx.contexto, pregunta, correccion);

      if (!resp.ok) {
        const detalle = await resp.text();
        const motivo =
          resp.status === 401 ? "La clave de la API no es válida."
          : resp.status === 429 ? "La API está limitando el ritmo. Probá de nuevo en un momento."
          : /credit|balance/i.test(detalle) ? "Se acabó el crédito de la API. Hay que cargar más en platform.claude.com."
          : `La API devolvió ${resp.status}.`;
        return json({ ok: false, origen: "api", pregunta, respuesta: motivo, detalle,
                      ms: Date.now() - arranque });
      }

      const salida = await resp.json();
      const texto = (salida?.content?.[0]?.text ?? "").trim();
      tIn.e += salida?.usage?.input_tokens ?? 0;
      tIn.s += salida?.usage?.output_tokens ?? 0;

      // NO_SE: se le da una segunda oportunidad pidiéndole algo parcial.
      if (/^NO_SE/i.test(texto)) {
        bitacora.push(`intento ${intento}: dijo NO_SE`);
        if (intento < MAX_INTENTOS) {
          correccion =
            "Dijiste NO_SE, y eso no le sirve a nadie. Las tablas del contexto " +
            "tienen datos de verdad. Elegí la que más se acerque a lo que " +
            "preguntaron y devolvé la mejor consulta posible, aunque sea parcial " +
            "o aunque sólo cuente filas. No vuelvas a responder NO_SE.";
          continue;
        }
        await rpc("api_ia_resolver", {
          p_texto: pregunta, p_sql: "", p_origen: "no_se",
          p_ms: Date.now() - arranque, p_in: tIn.e, p_out: tIn.s,
        }).catch(() => {});
        return json({
          ok: false, origen: "no_se", pregunta, intentos: intento, bitacora,
          tokens: { entrada: tIn.e, salida: tIn.s },
          respuesta:
            "Esa pregunta no la pude convertir en una consulta a la base. " +
            "Si es sobre un artículo, un cliente, una venta o el stock, probá " +
            "nombrando el código o el nombre concreto.",
          ms: Date.now() - arranque,
        });
      }

      ultimoSql = limpiarSql(texto);

      const r = await rpc("api_ia_resolver", {
        p_texto: pregunta, p_sql: ultimoSql,
        p_origen: intento === 1 ? "modelo" : `modelo_intento_${intento}`,
        p_ms: Date.now() - arranque, p_in: tIn.e, p_out: tIn.s,
      });

      // Salió bien y trajo datos: listo.
      if (r?.ok && (r.filas ?? 0) > 0) {
        return json({
          ok: true, origen: intento === 1 ? "modelo" : "modelo_corregido",
          pregunta, intentos: intento, bitacora,
          sql: r.sql, datos: r.datos ?? [], filas: r.filas ?? 0,
          tokens: { entrada: tIn.e, salida: tIn.s }, ms: Date.now() - arranque,
        });
      }

      // Corrió pero vino vacía: se le avisa y se le pide aflojar el filtro.
      if (r?.ok) {
        bitacora.push(`intento ${intento}: corrió pero trajo 0 filas`);
        ultimoMotivo = "la consulta corrió pero no trajo ninguna fila";
        ultimaEtapa = "vacia";
        if (intento < MAX_INTENTOS) {
          correccion =
            `Esta consulta corrió bien pero no trajo NINGUNA fila:\n${ultimoSql}\n\n` +
            `Algún filtro está dejando todo afuera. Revisá, en este orden: ` +
            `el año o el período (puede que no haya datos en ese año — probá sin el año ` +
            `o con el último que tenga datos); el tipo de comprobante; el código o el ` +
            `texto que estás comparando (puede estar con espacios o en otra capitalización: ` +
            `usá lower(btrim(columna)) para comparar); y si usaste un join que deja ` +
            `filas afuera, pasalo a left join. Devolvé la consulta corregida, más ` +
            `amplia, para que traiga datos.`;
          continue;
        }
        return json({
          ok: true, origen: "modelo", pregunta, intentos: intento, bitacora,
          sql: r.sql, datos: [], filas: 0,
          respuesta:
            "La consulta corrió bien pero no trajo ninguna fila. Probé también " +
            "aflojando los filtros y sigue sin haber datos para eso.",
          tokens: { entrada: tIn.e, salida: tIn.s }, ms: Date.now() - arranque,
        });
      }

      // La base la rechazó: se le muestra el esquema real y se corrige.
      ultimoMotivo = r?.motivo ?? "";
      ultimaEtapa = r?.etapa ?? "";
      bitacora.push(`intento ${intento}: ${ultimaEtapa} — ${ultimoMotivo}`);

      if (intento < MAX_INTENTOS) {
        const pistas = leerElError(ultimoMotivo);
        const aMirar = pistas.tabla ? [pistas.tabla] : tablasDelSql(ultimoSql);
        let esquema: any = null;
        try {
          esquema = await rpc("api_ia_columnas", {
            p_tablas: aMirar,
            p_columna: pistas.columna ?? null,
          });
        } catch { esquema = null; }

        let ayudaTexto = "";
        if (esquema?.ok) {
          const cols = esquema.columnas ?? {};
          for (const t of Object.keys(cols)) {
            ayudaTexto += `\nCOLUMNAS REALES DE ${t}:\n  ${cols[t]}\n`;
          }
          const viveEn: string[] = esquema.la_columna_vive_en ?? [];
          if (pistas.columna && viveEn.length) {
            ayudaTexto +=
              `\nLa columna "${pistas.columna}" NO está en esa tabla. ` +
              `Sí está en: ${viveEn.slice(0, 8).join(", ")}. ` +
              `Traela de alguna de esas, uniéndolas por lo que dice "COMO SE UNEN".\n`;
          }
        }

        correccion =
          `Esta consulta fue rechazada por la base:\n${ultimoSql}\n\n` +
          `ERROR EXACTO: ${ultimoMotivo}\n` +
          ayudaTexto +
          `\nCorregila usando SOLO columnas que existan de verdad. No repitas la misma consulta.`;
        continue;
      }
    }

    // Se agotaron los intentos.
    return json({
      ok: false,
      origen: ultimaEtapa === "validacion" ? "no_valida" : "error_sql",
      pregunta, intentos: MAX_INTENTOS, bitacora,
      sql: ultimoSql, motivo: ultimoMotivo,
      tokens: { entrada: tIn.e, salida: tIn.s },
      respuesta:
        "No pude armar una consulta que la base aceptara, ni siquiera corrigiéndola. " +
        "Probá preguntando lo mismo con otras palabras, o nombrando el artículo o " +
        "el cliente concreto.",
      ms: Date.now() - arranque,
    });
  } catch (e) {
    return json({
      ok: false, origen: "excepcion", pregunta,
      respuesta: "Algo falló al procesar la pregunta.",
      detalle: String((e as Error)?.message ?? e),
      ms: Date.now() - arranque,
    });
  }
});
