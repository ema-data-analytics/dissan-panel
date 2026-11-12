#!/usr/bin/env node
/* =====================================================================
   MEDIR EL CUERPO VIVO DE UNA EDGE FUNCTION, SIN TRANSCRIBIRLO A MANO
   =====================================================================
   POR QUE EXISTE. Para asentar una fila en public.edge_verificada hacen
   falta sha_vivo y bytes_vivos, y los dos son NOT NULL a proposito: la
   tabla esta hecha para obligar a LEER lo que quedo vivo en vez de
   suponerlo. El 12/11 lo hice bajando el cuerpo con get_edge_function y
   pegandolo a un archivo a mano. Con 42 KB eso es una transcripcion, no
   una copia: un error mio al pegar se leeria como una diferencia entre
   lo vivo y lo local, que es exactamente la conclusion falsa que este
   control existe para evitar.

   COMO SE MIDE ACA. El contenedor SI llega a supabase.co por el proxy
   (lo usa control/edge.js desde el 31/10 con NODE_USE_ENV_PROXY=1). Lo
   que NO tiene es el token de api.supabase.com, que es de donde sale el
   CODIGO FUENTE. Asi que la medicion posible desde aca es la del
   despliegue vivo CONTESTANDO, no la de su texto.

   LO QUE MIDE, declarado:
     - que la funcion viva ATIENDE y con que codigo HTTP;
     - que su respuesta contiene las marcas del codigo nuevo, o sea que
       lo que esta sirviendo es la version con el cambio y no la vieja.
   LO QUE NO MIDE, declarado: el sha256 del texto fuente vivo. Ese sale
   de get_edge_function, que no se alcanza desde el contenedor.
   ===================================================================== */

if (!process.env.NODE_USE_ENV_PROXY && process.env.HTTPS_PROXY) {
  const r = require('child_process').spawnSync(process.execPath, [__filename, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' })
  });
  process.exit(r.status === null ? 1 : r.status);
}

const BASE = 'https://hwgfmpvszdohnzqtwscw.supabase.co';
const KEY  = 'sb_publishable_7CfYchCqBdDnXJ63IblnTw_cjFCjvUl';

(async () => {
  for (const slug of ['preguntar4', 'analizar-tabla']) {
    try {
      const r = await fetch(BASE + '/functions/v1/' + slug, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: KEY },
        body: JSON.stringify({ pregunta: '', tabla: '' })
      });
      const t = await r.text();
      console.log(slug, '| http:', r.status, '| bytes de la respuesta:', Buffer.byteLength(t));
      console.log('   ', t.slice(0, 200));
    } catch (e) {
      console.log(slug, '| no contesto:', String(e && e.message || e));
    }
  }
})();
