#!/usr/bin/env node
/* =====================================================================
   PUERTA 15 — EL CONTROL DE LOS PASOS EN VIVO          13/11/2026
   =====================================================================
   POR QUE EXISTE, Y ES EL MISMO GOLPE DEL 10/11. Ese dia cree
   api_ventas_fact_informe_json con la firma mal y ventas.html quedo rota
   en produccion TODA LA NOCHE: las trece puertas pasaron todas, porque
   ninguna miraba eso. Los pasos en vivo son exactamente igual de
   invisibles: si el stream deja de llegar, la pantalla NO se rompe
   -vuelve sola a preguntar4- y nadie se entera nunca de que la mejora
   dejo de existir. Una funcion que se apaga en silencio es peor que una
   que falla fuerte.

   QUE PRUEBA, abriendo ayuda.html de verdad y mirando el cartel:
     A. que los pasos se pintan EN ORDEN y DE A UNO, mientras trabaja,
        no todos juntos al final;
     B. que el paso del control se escribe con todas las letras: es lo
        unico que este sistema hace y los demas no;
     C. FRENO 1 — si el vivo no abre, se vuelve SOLO a preguntar4 y la
        respuesta llega igual;
     D. FRENO 2 — si el vivo se corta DESPUES de haber empezado, NO se
        reintenta: el modelo ya corrio y reintentar paga la pregunta dos
        veces. Eso es el 12/11, cuando mi conductor siguio 92 llamadas
        despues del primer error de credito.

   NO PRUEBA, declarado: que la Edge Function preguntar5 siga mandando
   esos eventos. Eso lo mide `control/edge.js` contra la funcion viva.
   Aca el servidor es de mentira A PROPOSITO: lo que se prueba es la
   pantalla, y probarla contra el servidor real costaria plata en cada
   push.

   EL ARNES VA ADENTRO. Al final se rompe ayPintarPaso a proposito y el
   control TIENE que fallar. Si pasa, esta ciego y no sirve.
   ===================================================================== */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ    = path.join(__dirname, '..');
const PUERTO  = 8111;
const JUGUETE = path.join(__dirname, 'supabase-de-juguete.js');
const TIPOS = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8',
                '.css':'text/css; charset=utf-8', '.json':'application/json', '.svg':'image/svg+xml',
                '.png':'image/png', '.ico':'image/x-icon' };

const fallas = [];
const falla  = (q, c, d) => fallas.push({ quien:q, que:c, detalle:d });

/* EL SERVIDOR DE MENTIRA. Reemplaza window.fetch SOLO para las dos edge
   functions de la Ayuda, y manda los eventos con sus esperas de verdad,
   para que se pueda comprobar que la pantalla pinta MIENTRAS llegan y no
   todos juntos al final. */
const SERVIDOR_FALSO = `
window.__modo = 'normal';          /* normal | no_abre | se_corta */
window.__pedidos = [];             /* que edge functions se pidieron */
window.__cartel  = [];             /* cada texto que mostro el cartel, con su ms */

window.__GUION = [
  { t:'arranca',  d:{},                                 ms: 60 },
  { t:'piensa',   d:{ paso:1, de:9 },                    ms: 90 },
  { t:'usa',      d:{ herramientas:['buscar_en_el_mapa'] }, ms: 90 },
  { t:'piensa',   d:{ paso:2, de:9 },                    ms: 90 },
  { t:'usa',      d:{ herramientas:['consultar_base','consultar_base'] }, ms: 90 },
  { t:'piensa',   d:{ paso:3, de:9 },                    ms: 90 },
  { t:'usa',      d:{ herramientas:['contestar'] },      ms: 90 },
  { t:'controla', d:{ de:'las cifras' },                 ms: 90 }
];

window.__FIN = { ok:true, origen:'circuito', titulo:'De mentira',
                 lectura:'Respuesta de mentira del control.',
                 bloques:[], tarjetas:[], datos:[], filas:0,
                 llamadas:3, ms:600, control:{ veredicto:null } };

(function(){
  var fetchReal = window.fetch.bind(window);
  window.fetch = function(url, opt){
    var u = String(url && url.url ? url.url : url);
    var cual = (u.split('/functions/v1/')[1] || '').split('?')[0];
    if (cual) window.__pedidos.push(cual);

    if (cual === 'preguntar5'){
      if (window.__modo === 'no_abre'){
        return Promise.resolve(new Response('fuera de servicio', { status:503 }));
      }
      var corta = (window.__modo === 'se_corta');
      var enc = new TextEncoder();
      var cuerpo = new ReadableStream({
        start: function(c){
          var i = 0;
          (function paso(){
            if (i >= window.__GUION.length){
              c.enqueue(enc.encode('event: fin\\ndata: ' + JSON.stringify(window.__FIN) + '\\n\\n'));
              c.close(); return;
            }
            var p = window.__GUION[i++];
            setTimeout(function(){
              /* el corte se hace DESPUES de que ya llegaron eventos: ese es
                 el caso en que reintentar pagaria la pregunta dos veces */
              if (corta && p.t === 'usa'){ c.error(new Error('se corto el vivo')); return; }
              c.enqueue(enc.encode('event: ' + p.t + '\\ndata: ' + JSON.stringify(p.d) + '\\n\\n'));
              paso();
            }, p.ms);
          })();
        }
      });
      return Promise.resolve(new Response(cuerpo, { status:200,
        headers:{ 'Content-Type':'text/event-stream' } }));
    }

    if (cual === 'preguntar4'){
      return Promise.resolve(new Response(
        JSON.stringify(Object.assign({}, window.__FIN, { origen:'por_preguntar4' })),
        { status:200, headers:{ 'Content-Type':'application/json' } }));
    }
    return fetchReal.apply(null, arguments);
  };
})();

/* El cartel se anota solo, con la hora: asi se ve si los pasos llegaron DE
   A UNO mientras trabajaba, o todos juntos al final. */
window.addEventListener('DOMContentLoaded', function(){
  var t0 = Date.now();
  var reloj = setInterval(function(){
    var c = document.getElementById('ayCargandoTxt');
    if (!c) return;
    clearInterval(reloj);
    var ultimo = null;
    var anotar = function(){
      var v = c.textContent;
      if (v !== ultimo){ ultimo = v; window.__cartel.push({ txt:v, ms: Date.now()-t0 }); }
    };
    anotar();
    new MutationObserver(anotar).observe(c, { childList:true, characterData:true, subtree:true });
  }, 20);
});
`;

function servir(){
  const srv = http.createServer((q, r) => {
    let u = decodeURIComponent(q.url.split('?')[0]);
    if (u.endsWith('/')) u += 'index.html';
    const f = path.join(RAIZ, u);
    fs.readFile(f, (e, d) => {
      if (e){ r.writeHead(404); r.end(); return; }
      r.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
      r.end(d);
    });
  });
  return new Promise(ok => srv.listen(PUERTO, () => ok(srv)));
}

async function abrir(b, romperPintado){
  const ctx = await b.newContext({ viewport:{ width:1400, height:900 } });
  const pg  = await ctx.newPage();
  const errores = [];
  pg.on('pageerror', e => errores.push(String(e.message)));
  await pg.route('**/supabase-js@*/**', r => r.fulfill({
    status:200, contentType:'application/javascript', body:'/* cortado: manda el juguete */' }));
  if (fs.existsSync(JUGUETE)) await pg.addInitScript({ path: JUGUETE });
  await pg.addInitScript({ content: SERVIDOR_FALSO });
  /* EL ARNES: se deja a ayPintarPaso sin hacer nada, como si me hubiera
     olvidado de pintar. El control tiene que darse cuenta. */
  if (romperPintado) await pg.addInitScript({ content:
    'window.addEventListener("DOMContentLoaded", function(){' +
    ' var t=setInterval(function(){ if (typeof window.ayPintarPaso==="function"){' +
    '   window.ayPintarPaso=function(){}; clearInterval(t);} },5); });' });
  await pg.goto('http://127.0.0.1:' + PUERTO + '/ayuda.html?f=' + Date.now(), { waitUntil:'load' });
  await pg.waitForTimeout(1800);
  return { ctx, pg, errores };
}

/* Se llama DIRECTO a ayPreguntarModelo: es la funcion bajo prueba. Entrar por
   el campo de texto meteria antes el portero de intenciones, que no es lo que
   se esta midiendo. */
async function correrUna(pg, modo){
  await pg.evaluate((m) => {
    window.__modo = m; window.__pedidos = []; window.__cartel = [];
    const c = document.getElementById('ayCargando'); if (c) c.hidden = false;
    window.ayPreguntarModelo('pregunta de mentira del control', null);
  }, modo);
  await pg.waitForTimeout(2600);
  return pg.evaluate(() => ({ cartel: window.__cartel, pedidos: window.__pedidos,
                              resp: document.getElementById('ayResp')
                                      ? document.getElementById('ayResp').textContent.slice(0, 400) : '' }));
}

async function corrida(b, romperPintado){
  const mios = [];
  const fallo = (c, d) => mios.push({ que:c, detalle:d });
  const { ctx, pg, errores } = await abrir(b, romperPintado);

  if (await pg.evaluate(() => typeof window.AY_FN_VIVO !== 'function'))
    fallo('no_existe_AY_FN_VIVO', 'ayuda.js no define la llamada en vivo');

  /* ---- A y B. el camino normal ---- */
  {
    const r = await correrUna(pg, 'normal');
    const textos = r.cartel.map(x => x.txt);
    const juntos = textos.join(' || ');

    /* Con CONTROL_VIVO_MOSTRAR=1 escribe lo que LEE LA PERSONA en la pantalla,
       con el momento de cada cartel. Es para mirarlo con los ojos antes de
       entregar: que el control pase no quiere decir que se lea bien. */
    if (process.env.CONTROL_VIVO_MOSTRAR && !romperPintado){
      console.log('  Lo que se lee en la pantalla, cartel por cartel:');
      r.cartel.forEach(x => console.log('    ' + String(x.ms).padStart(5) + ' ms   ' + x.txt));
      console.log('');
    }

    if (!r.pedidos.includes('preguntar5'))
      fallo('no_llama_al_vivo', 'pidio: ' + JSON.stringify(r.pedidos));
    if (r.pedidos.includes('preguntar4'))
      fallo('cayo_a_preguntar4_sin_motivo', 'el vivo andaba y igual uso el viejo');

    /* de a uno y en orden: al menos cinco carteles distintos */
    if (r.cartel.length < 5)
      fallo('pinta_pocos_pasos', 'solo ' + r.cartel.length + ' carteles: ' + juntos);

    /* y repartidos en el tiempo, no todos al final */
    const ms = r.cartel.map(x => x.ms);
    if (ms.length > 2 && (ms[ms.length - 1] - ms[0]) < 200)
      fallo('todos_al_final', 'los carteles llegaron todos juntos en ' +
            (ms[ms.length-1] - ms[0]) + ' ms: no se pintaron mientras trabajaba');

    if (!/Mirando si ya lo s/i.test(juntos))   fallo('falta_el_arranque', juntos);
    if (!/Pensando/i.test(juntos))             fallo('falta_el_pensando', juntos);
    if (!/mapa de las 627 tablas/i.test(juntos)) fallo('no_traduce_la_herramienta', juntos);
    if (!/Consultando la base/i.test(juntos))  fallo('no_dice_que_consulta', juntos);
    if (!/2 a la vez/i.test(juntos))           fallo('no_dice_cuantas_consultas', juntos);
    if (!/Armando la respuesta/i.test(juntos)) fallo('no_dice_que_arma', juntos);
    /* EL QUE IMPORTA: el control tiene que decirse con todas las letras */
    if (!/Controlando cada cifra contra su fuente independiente/i.test(juntos))
      fallo('no_muestra_el_control',
            'el paso del control es lo unico que este sistema hace y los demas no. Cartel: ' + juntos);

    /* el orden: el control va despues del primer pensando */
    const iPensar  = textos.findIndex(t => /Pensando/i.test(t));
    const iControl = textos.findIndex(t => /Controlando cada cifra/i.test(t));
    if (iPensar >= 0 && iControl >= 0 && iControl < iPensar)
      fallo('orden_al_reves', 'controla antes de pensar: ' + juntos);
  }

  /* ---- C. FRENO 1: el vivo no abre -> preguntar4 ---- */
  {
    const r = await correrUna(pg, 'no_abre');
    if (!r.pedidos.includes('preguntar4'))
      fallo('no_vuelve_al_viejo', 'el vivo no abrio y no cayo a preguntar4: ' + JSON.stringify(r.pedidos));
    if (!/por_preguntar4|De mentira|Respuesta de mentira/i.test(r.resp))
      fallo('no_contesto_por_el_viejo', 'la pantalla quedo muda. Resp: ' + r.resp.slice(0, 120));
  }

  /* ---- D. FRENO 2: se corta a mitad -> NO se reintenta ---- */
  {
    const r = await correrUna(pg, 'se_corta');
    const vecesViejo = r.pedidos.filter(p => p === 'preguntar4').length;
    if (vecesViejo > 0)
      fallo('reintenta_y_paga_dos_veces',
            'el vivo se corto DESPUES de arrancar el modelo y igual llamo a preguntar4 ' +
            vecesViejo + ' vez/veces. Eso paga la pregunta dos veces.');
    if (!/cort|conexi/i.test(r.resp))
      fallo('no_avisa_el_corte', 'no dijo que se corto. Resp: ' + r.resp.slice(0, 160));
  }

  for (const e of errores) fallo('error_de_consola', e.slice(0, 160));
  await ctx.close();
  return mios;
}

/* --------------------------------------------------------------- */
(async () => {
  const srv = await servir();
  const b = await chromium.launch();
  try {
    console.log('LOS PASOS EN VIVO — control\n');
    const reales = await corrida(b, false);
    reales.forEach(f => falla('ayuda.html · vivo', f.que, f.detalle));
    if (!reales.length) console.log('  las comprobaciones: PASAN\n');
    else reales.forEach(f => console.log('  FALLA · ' + f.que + ' · ' + f.detalle));

    console.log('ARNES — se deja a ayPintarPaso sin hacer nada.');
    const ciego = await corrida(b, true);
    if (!ciego.length){
      falla('ARNES', 'control_ciego', 'con el pintado roto el control igual paso');
      console.log('  FALLA: el control esta CIEGO.\n');
    } else {
      console.log('  lo detecto: ' + ciego.map(f => f.que).slice(0, 4).join(', ') + '\n');
    }
  } catch (e) {
    falla('control', 'se_rompio', e.message);
  }
  await b.close(); srv.close();

  if (fallas.length){
    console.log('NO PASA. ' + fallas.length + ' falla(s):');
    fallas.forEach(f => console.log('  · ' + f.quien + ' · ' + f.que + ' · ' + f.detalle));
    process.exit(1);
  }
  console.log('PASA: los pasos se pintan de a uno, el control se dice con todas las letras,');
  console.log('      y los dos frenos funcionan (vuelve al viejo si no abre, NO reintenta si se corta).');
  console.log('NO MEDIDO, declarado: que preguntar5 siga mandando esos eventos.');
  console.log('      Eso lo mide control/edge.js contra la funcion viva.');
  process.exit(0);
})();
