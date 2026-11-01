// Puente temporal de carga de DISSAN. CERRADO.
// Se usó para cargar el historico de presupuestos, el IPC, el dolar,
// las comparativas de competencia y las listas de proveedores.
// Queda desactivado a proposito: no acepta mas cargas.
// Para volver a abrirlo hay que desplegar una version nueva a mano.

Deno.serve(() =>
  new Response(
    JSON.stringify({ estado: "desactivado", desde: "2026-10-02" }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  )
);
