#!/usr/bin/env node
/* =====================================================================
   PUERTA 13 — EL AVISO EN VIVO                              10/11/2026
   =====================================================================
   POR QUE EXISTE. El 10/11 el Tablero y Margen de Ventas estuvieron NUEVE
   HORAS caidos a 54 s de statement timeout, con DOCE puertas alrededor, y
   ninguna lo vio. No es que las puertas estuvieran mal: es que corren
   CUANDO YO PUSHEO, y entre push y push no mide nadie. Lo encontre de
   casualidad probando otra cosa.

   LA SALIDA NO FUE OTRA PUERTA MIA, FUE QUE EL PANEL HABLE. js/core.js ya
   cronometraba cada llamada en rpc()/rpcTodo() y tiraba el numero. Ahora,
   cuando una llamada MOLESTA (da error, o pasa de 3 s), el navegador la
   anota en ema.panel_llamada y api_estado_del_sistema() la muestra en rojo.
   El que usa el panel es el reloj.

   Y ESTA PUERTA CONTROLA ESE AVISO, que si no es codigo que nadie mira:
   que una pantalla sana no escriba una sola fila, que de varias lentas
   mande UNA —la peor—, que un error avise al toque, que rpcTodo tambien
   avise, que no se avise del aviso, y sobre todo QUE EL AVISO NO PUEDA
   ROMPER LA PANTALLA QUE VIGILA.

   No toca la base: pone un supabase de mentira que tarda o falla a pedido
   y mira que le manda core.js a api_anotar_llamada. Corre en ~25 s.

   LO QUE NO MIDE, DECLARADO: el viaje de verdad navegador -> PostgREST.
   Eso se midio a mano el 10/11 con curl contra el proyecto real: con la
   clave publishable (anon) daba HTTP 204 —un agujero mio, porque Supabase
   otorga EXECUTE a anon de fabrica en toda funcion nueva (pg_default_acl)—
   y despues de revocarselo da 403. Para medirlo sola, esta puerta
   necesitaria un JWT de usuario, que no tengo.
   ===================================================================== */
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = require('path').join(__dirname, '..');
const PUERTO = 8099;

const TIPOS = { '.js':'text/javascript', '.css':'text/css', '.html':'text/html' };
const srv = http.createServer((req, res) => {
  const p = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, b) => {
    if (e) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'text/plain' });
    res.end(b);
  });
});

const PAGINA = `<!doctype html><html><head><meta charset="utf-8"><title>t</title>
<script>
  window.__avisos = [];
  window.__modo   = 'rapido';
  window.supabase = { createClient: function(){
    return { rpc: function(fn, args){
      if (fn === 'api_anotar_llamada'){
        window.__avisos.push(args);
        return Promise.resolve({ data: null, error: null });
      }
      var demora = 0, err = null;
      if (window.__modo === 'lento')  demora = (fn === 'api_lenta_peor' ? 5200 : 3400);
      if (window.__modo === 'error')  err = { message: 'canceling statement due to statement timeout' };
      /* OJO: rpcTodo pide paginas hasta que venga una CORTA. Un doble que
         devuelve siempre la misma cantidad lo deja girando 200 vueltas.
         La primera pagina trae 2 filas, la segunda 0, y ahi corta. */
      var vuelta = 0;
      function hacer(){
        vuelta++;
        var filas = err ? null : (vuelta === 1 ? [{x:1},{x:2}] : []);
        return new Promise(function(r){
          setTimeout(function(){ r({ data: filas, error: err }); }, demora);
        });
      }
      var p = hacer();
      p.range = function(){ return hacer(); };
      return p;
    }, auth:{ onAuthStateChange: function(){ return {data:{subscription:{unsubscribe:function(){}}}}; } } };
  }};
<\/script></head><body><script src="/js/core.js?v=22"><\/script></body></html>`;

(async () => {
  await new Promise(r => srv.listen(PUERTO, r));
  const nav = await chromium.launch();
  const pg  = await nav.newPage();
  await pg.route('**/prueba.html', r => r.fulfill({ contentType:'text/html', body: PAGINA }));
  const fallas = [];
  const decir = (ok, t) => { console.log((ok ? '  OK   ' : '  FALLA') + '  ' + t); if (!ok) fallas.push(t); };

  await pg.goto('http://127.0.0.1:' + PUERTO + '/prueba.html');

  /* 1 — una pantalla sana no escribe una sola fila */
  await pg.evaluate(async () => { for (let i=0;i<5;i++) await rpc('api_rapida_'+i, {}); });
  await pg.waitForTimeout(2600);
  let a = await pg.evaluate(() => window.__avisos);
  decir(a.length === 0, 'pantalla sana: 0 avisos (midio ' + a.length + ')');

  /* 2 — varias lentas en una carga mandan UN solo aviso, el de la peor */
  await pg.evaluate(() => { window.__avisos = []; window.__modo = 'lento'; });
  await pg.evaluate(async () => {
    await Promise.all([rpc('api_lenta_a',{}), rpc('api_lenta_peor',{}), rpc('api_lenta_b',{})]);
  });
  await pg.waitForTimeout(2600);
  a = await pg.evaluate(() => window.__avisos);
  decir(a.length === 1, 'tres lentas: 1 solo aviso (midio ' + a.length + ')');
  decir(a.length === 1 && a[0].p_funcion === 'api_lenta_peor',
        'avisa la PEOR: ' + (a[0] ? a[0].p_funcion : '-'));
  decir(a.length === 1 && a[0].p_ms >= 5000 && a[0].p_ms < 9000,
        'los ms son los de verdad: ' + (a[0] ? a[0].p_ms : '-') + ' ms (esperado ~5200)');
  decir(a.length === 1 && a[0].p_pantalla === 'prueba.html',
        'dice que pantalla fue: ' + (a[0] ? a[0].p_pantalla : '-'));
  decir(a.length === 1 && a[0].p_error === null, 'una lenta no inventa un error');

  /* 3 — un error avisa YA, sin esperar los 2 s */
  await pg.evaluate(() => { window.__avisos = []; window.__modo = 'error'; });
  await pg.evaluate(async () => { try { await rpc('api_que_falla', {}); } catch(e){} });
  await pg.waitForTimeout(200);
  a = await pg.evaluate(() => window.__avisos);
  decir(a.length === 1, 'un error avisa al toque, sin esperar (midio ' + a.length + ')');
  decir(a.length === 1 && /timeout/i.test(a[0].p_error || ''),
        'el aviso lleva el error: ' + (a[0] ? String(a[0].p_error).slice(0,45) : '-'));

  /* 4 — rpcTodo tambien avisa */
  await pg.evaluate(() => { window.__avisos = []; window.__modo = 'lento'; });
  await pg.evaluate(async () => { await rpcTodo('api_lenta_peor', {}); });
  await pg.waitForTimeout(2600);
  a = await pg.evaluate(() => window.__avisos);
  decir(a.length === 1, 'rpcTodo tambien avisa (midio ' + a.length + ')');

  /* 5 — el aviso NO puede romper la pantalla que vigila */
  await pg.evaluate(() => {
    window.__avisos = []; window.__modo = 'error';
    const c = window.supabase.createClient();
    window.__rotoOk = true;
  });
  await pg.evaluate(async () => {
    /* el aviso explota adrede */
    const orig = sb.rpc;
    sb.rpc = function(fn, args){ if (fn === 'api_anotar_llamada') throw new Error('aviso roto'); return orig.call(sb, fn, args); };
    try { await rpc('api_que_falla', {}); } catch(e){ window.__errPantalla = e.message; }
    sb.rpc = orig;
  });
  const errPant = await pg.evaluate(() => window.__errPantalla);
  decir(!!errPant && !/aviso roto/.test(errPant),
        'si el aviso explota, la pantalla sigue con SU error: ' + errPant);

  /* 6 — nunca se avisa del aviso (no hay recursion).
     OJO CON ESTE TEST: la llamada que hago a mano abajo pasa por el mismo
     doble, asi que se cuenta sola. Lo que prueba la no-recursion no es el
     total: es que NINGUNA de las anotadas venga de core.js. Las de core
     llevan p_pantalla; la mia va con {} y no lo lleva. La primera version de
     este test comparaba contra 0 y daba FALLA con el codigo sano. */
  await pg.evaluate(() => { window.__avisos = []; window.__modo = 'lento'; });
  await pg.evaluate(async () => { try { await rpc('api_anotar_llamada', {}); } catch(e){} });
  await pg.waitForTimeout(2600);
  a = await pg.evaluate(() => window.__avisos);
  const deCore = a.filter(x => x && x.p_pantalla !== undefined);
  decir(deCore.length === 0,
        'no se avisa del aviso: ' + deCore.length + ' avisos de core (de ' + a.length + ' llamadas)');

  await nav.close(); srv.close();
  console.log('\nEL AVISO EN VIVO: ' + fallas.length + ' fallas.');
  console.log('  midio: 11 comprobaciones sobre el js/core.js que se publica · ' +
              '1 pantalla sana (0 avisos) · 3 llamadas lentas (1 aviso, el de 5200 ms) · ' +
              '1 error (aviso inmediato con su texto) · rpcTodo · el aviso roto a proposito · ' +
              'la recursion.');
  process.exit(fallas.length ? 1 : 0);
})();
