#!/usr/bin/env node
/* =====================================================================
   PUERTA 14 — LAS FIRMAS                                    11/11/2026
   =====================================================================
   POR QUE EXISTE. El 10/11 cambie ventas.html para que pidiera los datos
   de una sola vez en vez de de a paginas, y cree para eso dos funciones
   nuevas, api_ventas_fact_informe_json y api_ventas_fact_por_mes_v2_json.
   Les puse MAL LA FIRMA: les falto p_limite, y encima tenian p_proveedores
   y p_provincias en el orden cambiado, pasandolas posicionalmente.

   VENTAS.HTML QUEDO ROTA EN PRODUCCION TODA LA NOCHE. PostgREST contestaba
   "Could not find the function ... in the schema cache" y la pantalla no
   pintaba una sola tabla.

   LAS TRECE PUERTAS PASARON TODAS. Ninguna lo vio, porque el juguete
   contesta por NOMBRE de funcion y nunca mira los argumentos: una llamada
   con parametros que en la base no existen le parece perfecta. El juguete
   es mas amable que la realidad justo en el punto donde no tiene que serlo.
   Lo encontro el aviso en vivo —el que anota lo que tarda y lo que falla en
   el navegador del que usa el panel— a la mañana siguiente.

   QUE MIDE. Carga las pantallas con el juguete y junta TODA llamada que el
   panel hace, con los nombres de sus argumentos. Despues le manda a
   PostgREST DE VERDAD esas mismas llamadas, con el mismo juego de nombres,
   con un rango de fechas del año 2099 para que no tenga nada que buscar.
   Si PostgREST contesta PGRST202 —"no encuentro esa funcion"— la firma del
   panel y la de la base no coinciden y el push se corta.

   POR QUE ASI Y NO LEYENDO pg_proc. Porque esto prueba la cadena entera por
   donde se rompio: el nombre, los argumentos y el resolvedor de PostgREST,
   que es quien decide. Y no hace falta darle a anon ningun permiso nuevo:
   un "permission denied" ya demuestra que la funcion EXISTE con esa firma,
   que es lo unico que se esta midiendo.
   ===================================================================== */

if (!process.env.NODE_USE_ENV_PROXY && process.env.HTTPS_PROXY) {
  const r = require('child_process').spawnSync(process.execPath, [__filename], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' })
  });
  process.exit(r.status === null ? 1 : r.status);
}
require('./enchufar').enchufar();

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ   = path.join(__dirname, '..');
const PUERTO = 8231;
const BASE   = 'https://hwgfmpvszdohnzqtwscw.supabase.co';
const KEY    = 'sb_publishable_7CfYchCqBdDnXJ63IblnTw_cjFCjvUl';

const PANTALLAS = fs.readdirSync(RAIZ)
  .filter(f => f.endsWith('.html'))
  .sort();

const TIPOS = { '.js':'text/javascript', '.css':'text/css', '.html':'text/html',
                '.json':'application/json', '.svg':'image/svg+xml' };

/* Un valor con el que llenar cada argumento. No importa que devuelva: importa
   que PostgREST ENCUENTRE la funcion. Las fechas van al 2099 para que no
   tenga una sola fila que mirar. */
function valorPara(nombre){
  if (/desde/.test(nombre))  return '2099-01-01';
  if (/hasta/.test(nombre))  return '2099-01-02';
  if (/limite|top|max|_n$/.test(nombre)) return 1;
  return null;
}

async function main(){
  const srv = http.createServer((q, s) => {
    const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
    fs.readFile(p, (e, b) => {
      if (e){ s.writeHead(404); return s.end('no'); }
      s.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'text/plain' });
      s.end(b);
    });
  });
  await new Promise(r => srv.listen(PUERTO, r));

  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport:{ width:1500, height:950 } });
  await ctx.route('**/supabase-js@*/**', r => r.fulfill({
    status:200, contentType:'application/javascript', body:'/* cortado: manda el juguete */' }));
  await ctx.addInitScript({ path: path.join(RAIZ, 'control/supabase-de-juguete.js') });

  const vistas = new Map();     /* fn -> Set(firma)  */
  const dondeSeVio = new Map(); /* fn|firma -> pantalla */

  for (const pant of PANTALLAS){
    const pg = await ctx.newPage();
    try {
      await pg.goto('http://127.0.0.1:' + PUERTO + '/' + pant, { timeout: 25000 });
      await pg.waitForTimeout(2500);
      /* varias pantallas no piden nada hasta que se aprieta Ver */
      const ver = await pg.$$('button');
      for (const b of ver){
        const t = ((await b.textContent()) || '').trim();
        if (/^ver$/i.test(t)){ await b.click().catch(()=>{}); break; }
      }
      await pg.waitForTimeout(4000);
      const llamadas = await pg.evaluate(() => (window.__LLAMADAS || []).map(
        l => ({ fn: l.fn, args: Object.keys(l.args || {}).sort() })));
      for (const l of llamadas){
        if (!/^api_/.test(l.fn)) continue;
        const firma = l.args.join(',');
        if (!vistas.has(l.fn)) vistas.set(l.fn, new Set());
        if (!vistas.get(l.fn).has(firma)){
          vistas.get(l.fn).add(firma);
          dondeSeVio.set(l.fn + '|' + firma, pant);
        }
      }
    } catch (e){
      console.log('  AVISO: ' + pant + ' no cargo (' + e.message.slice(0,70) + ')');
    }
    await pg.close();
  }
  await nav.close(); srv.close();

  /* ---- contra PostgREST de verdad ---- */
  const fallas = [];
  let probadas = 0;
  for (const [fn, firmas] of vistas){
    for (const firma of firmas){
      const args = firma ? firma.split(',') : [];
      const cuerpo = {};
      for (const a of args) cuerpo[a] = valorPara(a);
      let r, txt;
      try {
        r = await fetch(BASE + '/rest/v1/rpc/' + fn, {
          method:'POST',
          headers:{ apikey: KEY, 'Content-Type':'application/json' },
          body: JSON.stringify(cuerpo) });
        txt = await r.text();
      } catch (e){
        fallas.push(fn + ' (' + (firma||'sin argumentos') + '): no pude preguntarle a PostgREST — ' + e.message.slice(0,80));
        continue;
      }
      probadas++;
      /* PGRST202 = PostgREST no encuentra esa funcion CON ESOS ARGUMENTOS.
         Cualquier otra cosa -incluido permission denied- demuestra que la
         encontro, que es lo unico que mide esta puerta. */
      if (r.status === 404 && /PGRST202|Could not find the function/.test(txt)){
        fallas.push('LA FIRMA NO EXISTE EN LA BASE: ' + fn + '(' + (firma || 'sin argumentos') + ')'
                  + '  — la manda ' + dondeSeVio.get(fn + '|' + firma)
                  + '  — PostgREST: ' + (JSON.parse(txt).message || txt).slice(0, 150));
      }
    }
  }

  /* ---- EL ARNES: la puerta se prueba a si misma en cada corrida ----
     Una puerta que nunca fallo no demostro nada. Aca se le planta a proposito
     la firma exacta que rompio ventas.html el 10/11 —la que no tiene
     p_limite— y se exige que la detecte. Si deja de detectarla, la puerta
     esta ciega y el push se corta igual. */
  {
     const rota = { p_desde:'2099-01-01', p_hasta:'2099-01-02',
                    p_argumento_que_no_existe_11_11: 1 };
     let detecto = false;
     try {
       const r = await fetch(BASE + '/rest/v1/rpc/api_ventas_fact_informe_json', {
         method:'POST', headers:{ apikey: KEY, 'Content-Type':'application/json' },
         body: JSON.stringify(rota) });
       const t = await r.text();
       detecto = (r.status === 404 && /PGRST202|Could not find the function/.test(t));
     } catch (e){ detecto = false; }
     if (!detecto)
       fallas.push('EL ARNES: le plante una firma inexistente y la puerta NO la detecto. '
                 + 'Esta ciega: no sirve para medir nada.');
     else
       console.log('  OK   el arnes: la firma plantada fue detectada, la puerta ve.');
  }

  for (const f of fallas) console.log('  FALLA  ' + f);
  console.log('\nLAS FIRMAS: ' + fallas.length + ' fallas.');
  console.log('  midio: ' + PANTALLAS.length + ' pantallas · ' + vistas.size +
              ' funciones api_ distintas · ' + probadas +
              ' firmas preguntadas a PostgREST de verdad, una por una.');
  process.exit(fallas.length ? 1 : 0);
}

main().catch(e => { console.log('LAS FIRMAS: NO PUDO CORRER — ' + e.message); process.exit(1); });
