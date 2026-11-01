// PRUEBA DESECHABLE 4 — RETIRADA.
//
// Esta funcion se escribio el 30/10 para averiguar por que pdf.js no corria
// en el servidor (ReferenceError: DOMMatrix is not defined, pdfjs-dist
// 5.7.284) y para elegir entre dos salidas: unpdf, o pdf.js con DOMMatrix y
// Path2D puestos a mano. Contesto lo que habia que contestar y quedo viva.
//
// POR QUE SE RETIRA, 01/11/2026. La encontro control/edge.js: estaba ACTIVE
// con verify_jwt:false, o sea un endpoint PUBLICO SIN AUTENTICACION, y su
// propio encabezado decia que era desechable. verify_jwt autentica, no
// autoriza, pero sin JWT no hay ni lo uno: es la regla del 21/10 al revés
// (sin JWT -> 0, falla cerrada). Una prueba que ya contesto y queda abierta
// al mundo no es una prueba: es una puerta que nadie cuida.
//
// Se retira igual que carga-temporal y diag-clave: devolviendo 410 y
// declarandose en public.edge_desactivada con su motivo.
//
// ES REVERSIBLE. El codigo entero esta al lado, en
// edge/probe-pdf/index.ts.prueba-desechable-retirada-01-11, y en el
// historial del repositorio. Para volver a abrirla hay que desplegar una
// version nueva a mano, y entonces hay que decidir su portero.

Deno.serve(() =>
  new Response(
    JSON.stringify({
      estado: "desactivado",
      desde: "2026-11-01",
      porque: "prueba desechable que quedo viva como endpoint publico sin autenticacion",
    }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  )
);
