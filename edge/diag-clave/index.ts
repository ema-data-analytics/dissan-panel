// Fuera de servicio. Era el banco de pruebas de la instalacion del 02-10-2026.
// No tiene acceso a nada y no devuelve ningun dato. Se puede borrar del panel.
Deno.serve(() =>
  new Response(JSON.stringify({ ok: false, motivo: "fuera de servicio" }), {
    status: 410,
    headers: { "Content-Type": "application/json" },
  })
);
