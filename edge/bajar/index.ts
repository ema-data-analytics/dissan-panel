// LA DESCARGA DE VERDAD — un vale de un solo uso y una URL.    15/10/2026
//
// ---------------------------------------------------------------------------
// POR QUE EXISTE ESTA FUNCION
//
// El panel armaba el .xlsx, lo pasaba a la pantalla en base64 y lo ofrecia con
// un enlace a un blob: URL.createObjectURL(new Blob(...)). PROBADO EN PANTALLA
// EL 15/10/2026: NO BAJA. Ni con el clic automatico, ni con el clic a mano
// sobre el enlace "Bajarlo". Sin archivo en Descargas, sin error en la
// consola, sin nada. El panel de Apps Script vive en un iframe con sandbox y
// origen opaco, y el navegador no honra el atributo download de un blob
// creado ahi adentro: lo bloquea EN SILENCIO.
//
// En Codigo.gs ya estaba escrito el mismo aprendizaje, del circuito de
// exportacion de tablas: "se entrega un link de descarga real, que es lo que
// si funciona". Esto es eso, para el Excel de la Ayuda.
//
// ---------------------------------------------------------------------------
// COMO ANDA, Y POR QUE NO VIAJA NINGUNA CLAVE EN LA URL
//
//   1. La pantalla pide un vale:  Ayuda.html -> apiAyudaExcelVale (Api.gs)
//                                            -> app_vale_excel_crear(token, que)
//      El vale es un uuid, de UN SOLO USO, que vence en 5 minutos. Lo da la
//      base solo si el token tiene permiso del modulo Ayuda (app_puede).
//   2. La pantalla pone  .../functions/v1/bajar?vale=<uuid>  en el enlace.
//   3. El usuario hace clic. El navegador navega a una URL de verdad y el
//      archivo baja como cualquier descarga, con Content-Disposition.
//   4. Esta funcion quema el vale (app_vale_excel_usar lo BORRA al leerlo) y
//      recien entonces arma el archivo.
//
// Una URL queda en el historial, en los registros del servidor y en el
// referer. Por eso NO viaja el token de sesion ni ninguna clave: viaja el
// vale, que ya no sirve apenas se usa.
//
// verify_jwt = false, a proposito: el navegador no puede mandar la clave de
// Supabase en una navegacion. El portero es el vale, no el JWT.
//
// ---------------------------------------------------------------------------
// EL ARCHIVO LO ARMA LA MISMA FUNCION QUE YA ESTABA
//
// Para el .xlsx esta funcion NO duplica nada: le pide el libro a la Edge
// Function "excel", que es la que se controlo renglon por renglon contra
// OC-contra-pedido-agosto-2026.xlsx. Un solo armador, en un solo lugar.
//
// Y las filas NO viajan por la URL ni por el vale cuando la pregunta la
// resuelve una intencion: se vuelven a buscar aca con api_preguntar_todo
// (219 de 219 renglones medidos el 15/10 con el rol service_role, 723 ms).
// api_preguntar tiene el tope 50, que es el de la PANTALLA: con ese tope el
// archivo bajaria un recorte con pinta de todo.
// ---------------------------------------------------------------------------

const TIPO: Record<string, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  html: "text/html; charset=utf-8",
  csv: "text/csv; charset=utf-8",
};

const url = () => Deno.env.get("SUPABASE_URL")!;
const key = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function rpc(nombre: string, args: Record<string, unknown>) {
  const r = await fetch(`${url()}/rest/v1/rpc/${nombre}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key(),
      Authorization: `Bearer ${key()}`,
    },
    body: JSON.stringify(args),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${nombre}: ${r.status} ${t.substring(0, 300)}`);
  return t ? JSON.parse(t) : null;
}

/** Una pagina, no un JSON: esto lo abre un navegador, lo lee una persona. */
function aviso(titulo: string, detalle: string, status: number) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${titulo}</title><style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
     background:#0B2238;color:#E8EEF4;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.c{max-width:520px;padding:34px 38px;background:#102E4A;border:1px solid rgba(255,255,255,.10);
   border-radius:14px}
h1{margin:0 0 10px;font-size:19px;font-weight:600}
p{margin:0;font-size:14px;line-height:1.65;color:#9FB3C8}
</style></head><body><div class="c"><h1>${titulo}</h1><p>${detalle}</p></div></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** Content-Disposition con nombre ASCII y el nombre real en filename*. */
function adjunto(nombre: string) {
  const ascii = nombre.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`;
}

Deno.serve(async (req) => {
  const arranque = Date.now();
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  }

  const vale = new URL(req.url).searchParams.get("vale");
  if (!vale || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vale)) {
    return aviso("Falta el vale",
      "Esta descarga se pide desde el panel. El enlace lleva un vale de un solo uso " +
      "que la pantalla saca justo antes de ofrecer el archivo.", 400);
  }

  let permiso: any = null;
  try {
    permiso = await rpc("app_vale_excel_usar", { p_vale: vale });
  } catch (e) {
    return aviso("No se pudo validar el vale", String((e as Error).message).substring(0, 300), 500);
  }
  if (!permiso) {
    return aviso("El enlace ya no sirve",
      "El vale es de un solo uso y dura 5 minutos. Volvé al panel, pedí el archivo " +
      "otra vez y apretá «Bajarlo» en el momento.", 410);
  }

  let que: any = {};
  try { que = JSON.parse(String(permiso.que || "{}")); } catch { que = {}; }

  const tipo = String(que.tipo || "xlsx").toLowerCase();
  const pregunta = String(que.pregunta || "").trim();
  const base = String(que.nombre || "consulta").replace(/[\\/:*?"<>|]/g, "-").slice(0, 70);

  try {
    /* ---- el informe HTML y el CSV vienen escritos en el vale -------------- */
    if (tipo === "html" || tipo === "csv") {
      const cuerpo = String(que.cuerpo || "");
      if (!cuerpo) return aviso("El archivo llegó vacío", "No había contenido en el vale.", 500);
      const bytes = new TextEncoder().encode(tipo === "csv" ? "\uFEFF" + cuerpo : cuerpo);
      return new Response(bytes, {
        headers: {
          "Content-Type": TIPO[tipo],
          "Content-Disposition": adjunto(`${base}.${tipo}`),
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    /* ---- el Excel: las filas y despues el armador de siempre -------------- */
    let datos: any[] = Array.isArray(que.datos) ? que.datos : [];
    let titulo = String(que.titulo || "");

    if (!datos.length) {
      if (!pregunta) return aviso("No hay qué escribir", "El vale no traía ni filas ni pregunta.", 400);
      const p = await rpc("api_preguntar_todo",
        { p_texto: pregunta.substring(0, 500), p_contexto: null, p_tope: 5000 });
      if (p && p.entendio === true && Array.isArray(p.datos)) datos = p.datos;
      if (!titulo) {
        const q = p?.entendido?.que ?? {}, c = p?.entendido?.cuando ?? {};
        titulo = [q.titulo, c.etiqueta].filter(Boolean).join(" · ");
      }
    }
    if (!datos.length) {
      return aviso("La consulta no trajo renglones",
        "Se volvió a buscar en la base y no devolvió ninguna fila, así que no hay " +
        "Excel que armar.", 409);
    }

    const r = await fetch(`${url()}/functions/v1/excel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key(),
        Authorization: `Bearer ${key()}`,
      },
      body: JSON.stringify({
        pregunta, datos, titulo,
        lectura: String(que.lectura || ""),
      }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || j.ok !== true || !j.base64) {
      return aviso("El Excel no salió",
        String(j?.motivo || `el armador contestó HTTP ${r.status}`).substring(0, 300), 500);
    }

    const bin = atob(j.base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    return new Response(bytes, {
      headers: {
        "Content-Type": TIPO.xlsx,
        "Content-Disposition": adjunto(`${base}.xlsx`),
        "Content-Length": String(bytes.length),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        /* para controlar la descarga sin abrir el archivo */
        "X-Dissan-Filas": String(j.filas ?? ""),
        "X-Dissan-Hojas": String((j.hojas ?? []).join(" · ")),
        "X-Dissan-Ms": String(Date.now() - arranque),
      },
    });
  } catch (e) {
    return aviso("Se cortó al armar el archivo",
      String((e as Error)?.message ?? e).substring(0, 300), 500);
  }
});
