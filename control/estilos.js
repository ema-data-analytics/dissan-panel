/* PUERTA 20 — LAS CLASES QUE NINGUNA HOJA ALCANZA.               20/11/2026
   =========================================================================

   POR QUE EXISTE. `ventas-detalle.html` nacio con `id="vdInforme"` y
   `css/ventas-informe.css` encierra sus 59 reglas adentro de `#vtInforme`
   —a proposito, para que un cambio global no rompa las otras pantallas—.
   Resultado: **ninguna regla le llegaba**. Las tarjetas del informe salian
   como texto apilado, sin caja, sin cifra grande, sin color. La pantalla
   contestaba bien, los numeros daban exactos, y se veia rota.

   NINGUNA de las 19 puertas lo vio, y no por flojas: todas miden TEXTO
   —que el numero del Excel sea el de la pantalla, que el rotulo este, que
   no haya `undefined`—. Ninguna mide **COMO SE VE**. Lo vi recien al mirar
   una captura, que es lo que ve el usuario. Es el mismo golpe del 28/10,
   escrito en el encabezado de esa misma hoja: *"mis controles no lo
   agarraron porque median errores de consola y scroll, no SI SE VE"*.

   QUE MIDE, SIN UNA SOLA LISTA DE NOMBRES. Para cada pantalla junta las
   clases que de verdad quedaron en el DOM y las agrupa por su PREFIJO (lo
   de antes del primer guion: `vi-`, `db-`, `sd-`, `lp-`). Despues le
   pregunta a las hojas de estilo cargadas si alguna regla alcanza a cada
   clase, y **corta cuando una FAMILIA ENTERA de tres o mas clases no la
   alcanza nadie**.

   POR QUE LA FAMILIA Y NO LA CLASE SUELTA. Una clase sola sin regla es
   normal: la usa el JavaScript como agarradera (`aparte`, `activo`). Lo
   que no puede pasar es que `vi-cab`, `vi-kpi`, `vi-kpis` y `vi-bajada`
   esten las cuatro sin alcanzar: eso no es una agarradera, es una hoja que
   no llega. El umbral de tres no es a ojo: con dos, cualquier par de
   agarraderas con el mismo prefijo gritaria.

   PUERTA-MIRA: css/** js/** *.html control/estilos.js control/supabase-de-juguete.js
   ========================================================================= */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ    = path.join(__dirname, '..');
const JUGUETE = path.join(__dirname, 'supabase-de-juguete.js');
const PUERTO  = 8933;
const TIPOS = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css',
                '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png',
                '.ico':'image/x-icon', '.woff2':'font/woff2' };
const PLANTAR = process.env.CONTROL_PLANTAR || '';

const fallas = [];
const medido = { pantallas: 0, clases: 0, familias: 0, sueltas: 0 };
function falla(clase, que){ fallas.push({ clase, que }); }

/* las pantallas se listan del disco, no de una lista escrita aca */
function pantallas(){
  return fs.readdirSync(RAIZ).filter(f => f.endsWith('.html')).sort();
}

(async () => {
  const srv = http.createServer((q, r) => {
    let u = decodeURIComponent(q.url.split('?')[0]);
    if (u.endsWith('/')) u += 'index.html';
    fs.readFile(path.join(RAIZ, u), (e, d) => {
      if (e){ r.writeHead(404); r.end(); return; }
      r.writeHead(200, { 'Content-Type': TIPOS[path.extname(u)] || 'application/octet-stream' });
      r.end(d);
    });
  });
  await new Promise(ok => srv.listen(PUERTO, '127.0.0.1', ok));
  const base = 'http://127.0.0.1:' + PUERTO;
  const bro  = await chromium.launch();

  for (const archivo of pantallas()){
    const ctx = await bro.newContext({ viewport: { width: 1440, height: 1000 } });
    const pg  = await ctx.newPage();
    await pg.route('**/supabase-js@*/**', r => r.fulfill({
      status: 200, contentType: 'application/javascript', body: '/* juguete */' }));

    /* EL ARNES: se le sirve el HTML con el id del contenedor cambiado, que
       es EXACTAMENTE el defecto del 20/11. Si el ancla no aparece, revienta. */
    if (PLANTAR === 'hoja_que_no_llega' && archivo === 'ventas.html'){
      const orig = fs.readFileSync(path.join(RAIZ, archivo), 'utf8');
      const roto = orig.replace('id="vtInforme"', 'id="vtInformeXX"');
      if (roto === orig)
        throw new Error('EL ARNES NO ENCONTRO DONDE PLANTAR "hoja_que_no_llega" en '
                      + archivo + '. Un arnes que no planta nada da verde sin probar.');
      await pg.route('**/' + archivo + '*', r => r.fulfill({
        status: 200, contentType: 'text/html', body: roto }));
      console.log('  [arnes] plantado: hoja_que_no_llega en ' + archivo);
    }

    await pg.addInitScript({ path: JUGUETE });
    try {
      await pg.goto(base + '/' + archivo + '?c=' + Date.now(),
                    { waitUntil: 'load', timeout: 30000 });
      await pg.waitForSelector('#app:not([hidden])', { timeout: 20000 });
    } catch (e){
      falla('no_abrio', archivo + ': ' + e.message.slice(0, 100));
      await ctx.close(); continue;
    }
    /* se apreta el control principal si lo hay, para que pinte lo suyo */
    for (const sel of ['#vdAplicar', '#vtVer', '#btnCalcular', '.db-btn']){
      const b = await pg.$(sel);
      if (b){ await b.click({ timeout: 4000 }).catch(()=>{}); break; }
    }
    await pg.waitForTimeout(1200);
    medido.pantallas++;

    const r = await pg.evaluate(() => {
      /* todas las reglas de TODAS las hojas cargadas, una sola vez */
      const reglas = [];
      for (const h of document.styleSheets){
        let rs; try { rs = h.cssRules; } catch (e) { continue; }   /* hoja de otro origen */
        const meter = lista => { for (const x of lista){
          if (x.selectorText) reglas.push(x.selectorText);
          else if (x.cssRules) meter(x.cssRules);                  /* @media, @supports */
        } };
        meter(rs);
      }
      /* MENCIONAR NO ES ALCANZAR, y mi primera version media lo primero.
         `#vtInforme .vi-kpi` MENCIONA `.vi-kpi` aunque el contenedor se
         llame distinto y la regla no le llegue a ningun elemento. Por eso
         no se busca el texto de la clase en el selector: se le pregunta al
         ELEMENTO si ese selector lo matchea. Lo agarro el propio arnes:
         planto el defecto y la puerta no sono. 20/11/2026 */
      const alcanza = {};
      const clases = new Map();            /* clase -> un elemento que la lleva */
      const cuantos = new Map();
      for (const el of document.querySelectorAll('#contenido, #contenido *')){
        for (const c of el.classList){
          if (!clases.has(c)) clases.set(c, el);
          cuantos.set(c, (cuantos.get(c) || 0) + 1);
        }
      }
      for (const [c, el] of clases){
        const marca = '.' + c.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '(?![\\w-])';
        const re = new RegExp(marca);
        alcanza[c] = reglas.some(sel => {
          if (!re.test(sel)) return false;           /* ni la menciona */
          /* la menciona: ¿le llega a ESTE elemento? Un selector con comas
             se parte, porque basta con que una de sus partes matchee. */
          return sel.split(',').some(p => {
            p = p.trim();
            if (!re.test(p)) return false;
            try { return el.matches(p.replace(/::?[a-z-]+(\([^)]*\))?\s*$/i, '').trim() || p); }
            catch (e) { return false; }
          });
        });
      }
      return { clases: [...cuantos.entries()], alcanza };
    });

    const porPrefijo = new Map();
    for (const [c] of r.clases){
      const i = c.indexOf('-');
      if (i <= 0) { medido.sueltas++; continue; }   /* sin prefijo: agarradera */
      const p = c.slice(0, i + 1);
      if (!porPrefijo.has(p)) porPrefijo.set(p, []);
      porPrefijo.get(p).push(c);
    }
    medido.clases += r.clases.length;

    for (const [prefijo, lista] of porPrefijo){
      medido.familias++;
      if (lista.length < 3) continue;                /* una o dos: agarraderas */
      const sinAlcanzar = lista.filter(c => !r.alcanza[c]);
      if (sinAlcanzar.length === lista.length)
        falla('una_hoja_de_estilos_no_le_llega_a_la_pantalla',
              archivo + ': las ' + lista.length + ' clases con prefijo «' + prefijo
            + '» (' + lista.slice(0, 4).join(', ')
            + (lista.length > 4 ? '…' : '') + ') NO las alcanza ninguna regla de '
            + 'ninguna hoja cargada. Una clase suelta sin regla es una agarradera '
            + 'del JavaScript; una FAMILIA entera sin alcanzar es una hoja que no '
            + 'llega — la pantalla contesta bien y se ve rota. Es lo del 20/11: '
            + 'ventas-detalle.html usaba el id «vdInforme» y la hoja encierra '
            + 'todo en «#vtInforme».');
    }
    await ctx.close();
  }

  await bro.close();
  srv.close();

  if (fallas.length){
    console.log('LAS CLASES SIN ESTILO: ' + fallas.length + ' falla(s)\n');
    for (const f of fallas) console.log('  ' + f.clase.toUpperCase() + '\n    ' + f.que + '\n');
    process.exit(1);
  }
  console.log('LAS CLASES SIN ESTILO: 0 fallas.');
  console.log('  midio: ' + medido.pantallas + ' pantallas abiertas con el juguete · '
            + medido.clases + ' clases vivas en el DOM · ' + medido.familias
            + ' familias por prefijo, ninguna entera sin alcanzar · ' + medido.sueltas
            + ' clases sin prefijo, que son agarraderas del JavaScript y se saltean '
            + 'a proposito.');
  console.log('  NO midio: si lo que la hoja pinta se VE BIEN. Mide que la hoja '
            + 'LLEGUE, no que el disenio sea lindo.');
  process.exit(0);
})().catch(e => {
  console.error('LAS CLASES SIN ESTILO: NO PUDO CORRER: ' + e.message);
  process.exit(1);
});
