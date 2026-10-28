/* =====================================================================
   CONTROL DE LAS PANTALLAS — corre antes de cada push      28/10/2026
   =====================================================================
   POR QUE EXISTE. Los defectos de pantalla que mas repeti son de clases
   que ya estaban escritas en las notas del proyecto, y una regla escrita
   no frena nada. Esto las convierte en una corrida que FALLA:

     1. CONTRASTE. El 28/10 subi una pantalla con tarjetas claras dentro
        de un panel oscuro: los titulos daban 1,19 a 1 y no se leian.
        Mis controles median errores y scroll, ninguno media SI SE VE.
     2. ERRORES DE CONSOLA y archivos 404.
     3. SCROLL HORIZONTAL DE PAGINA a 386 px. Una tabla tiene que
        deslizarse adentro de su caja, no mover la pagina.
     4. LA PANTALLA ESCRIBIO ALGO. El 21/10 a pintar() le faltaba la
        ultima linea, la que escribe el cuerpo: salia el reloj y debajo
        nada, SIN un error en la consola.
     5. EL ?v= AL DIA. El 20/10 perdi tres verificaciones creyendo que
        una regla no funcionaba, y lo que pasaba era que el navegador
        servia la hoja vieja. Si un css o un js cambio en el ultimo
        commit, todos los HTML que lo usan tienen que apuntar al ?v=
        nuevo.

   Se corre con:  node control/pantallas.js
   Devuelve 0 si pasa todo, 1 si algo falla. El hook de pre-push lo usa.
   ===================================================================== */

const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const { execSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const PUERTO = 8211;
const MINIMO_CONTRASTE = 3.0;
const TIPOS = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
                '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon' };

/* el juguete: supabase-js de mentira, para que las pantallas pinten sin base */
const JUGUETE = path.join(__dirname, 'supabase-de-juguete.js');

const fallas = [];
function falla(pantalla, clase, que){ fallas.push({ pantalla, clase, que }); }

/* --------------------------------------------------------------- */
/* 5. el ?v= al dia: se mira con git, no hace falta navegador       */
/* --------------------------------------------------------------- */
function controlarVersiones(){
  let cambiados = [];
  try {
    cambiados = execSync('git diff --name-only HEAD~1 HEAD', { cwd: RAIZ })
      .toString().split('\n').filter(f => /\.(css|js)$/.test(f));
  } catch (e) { return; }   /* sin historia todavia: no se controla */
  for (const f of cambiados){
    const base = path.basename(f);
    const usan = fs.readdirSync(RAIZ).filter(x => x.endsWith('.html'))
      .filter(x => fs.readFileSync(path.join(RAIZ, x), 'utf8').includes(base));
    /* todos los que lo usan tienen que traer el MISMO ?v= */
    const versiones = new Set();
    for (const h of usan){
      const m = fs.readFileSync(path.join(RAIZ, h), 'utf8')
        .match(new RegExp(base.replace('.', '\\.') + '\\?v=(\\d+)'));
      versiones.add(m ? m[1] : 'SIN ?v=');
    }
    if (versiones.size > 1){
      falla('(varias)', 'version_desalineada',
        base + ' cambio y los HTML que lo usan apuntan a versiones distintas: ' +
        [...versiones].join(', ') + '. El navegador va a servir la hoja vieja.');
    }
  }
}

/* --------------------------------------------------------------- */
/* el control de contraste, adentro del navegador                   */
/* --------------------------------------------------------------- */
const MEDIR_CONTRASTE = function(minimo){
  function aRgb(c){
    const m = String(c).match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
    return m ? { r:+m[1], g:+m[2], b:+m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
  }
  function lum(c){
    const f = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
    return 0.2126*f(c.r) + 0.7152*f(c.g) + 0.0722*f(c.b);
  }
  function sobre(frente, fondo){
    const a = frente.a;
    return { r: frente.r*a + fondo.r*(1-a), g: frente.g*a + fondo.g*(1-a),
             b: frente.b*a + fondo.b*(1-a), a: 1 };
  }
  /* el fondo EFECTIVO: se sube por los padres hasta encontrar uno opaco,
     componiendo los translucidos en el camino. Mirar solo el propio no
     sirve: casi todos son transparentes. */
  function fondoDe(el){
    let capas = [], n = el;
    while (n && n !== document.documentElement){
      const c = aRgb(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0){ capas.push(c); if (c.a === 1) break; }
      n = n.parentElement;
    }
    let base = { r:255, g:255, b:255, a:1 };
    const ultima = capas[capas.length - 1];
    if (ultima && ultima.a === 1){ base = ultima; capas.pop(); }
    for (let i = capas.length - 1; i >= 0; i--) base = sobre(capas[i], base);
    return base;
  }

  const malos = [];
  const vistos = new Set();
  document.querySelectorAll('#contenido *').forEach(el => {
    if (el.children.length && el.childNodes.length === el.children.length) return; /* sin texto propio */
    const t = (el.textContent || '').trim();
    if (!t) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const col = aRgb(cs.color); if (!col) return;
    const fondo = fondoDe(el);
    const frente = col.a < 1 ? sobre(col, fondo) : col;
    const l1 = lum(frente), l2 = lum(fondo);
    const ratio = (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
    if (ratio < minimo){
      const clave = cs.color + '|' + el.className;
      if (vistos.has(clave)) return;
      vistos.add(clave);
      malos.push({ texto: t.slice(0, 48), color: cs.color,
                   fondo: 'rgb(' + Math.round(fondo.r) + ',' + Math.round(fondo.g) + ',' +
                          Math.round(fondo.b) + ')',
                   clase: el.className || el.tagName.toLowerCase(),
                   ratio: Math.round(ratio * 100) / 100 });
    }
  });
  return malos;
};

/* --------------------------------------------------------------- */
async function main(){
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
  await new Promise(ok => srv.listen(PUERTO, ok));

  controlarVersiones();

  const pantallas = fs.readdirSync(RAIZ).filter(f => f.endsWith('.html')).sort();
  const b = await chromium.launch();

  for (const p of pantallas){
    for (const [rot, ancho, alto] of [['escritorio',1500,950], ['telefono',386,760]]){
      const ctx = await b.newContext({ viewport:{ width:ancho, height:alto } });
      const pg = await ctx.newPage();
      const errores = [], f404 = [];
      pg.on('pageerror', e => errores.push(String(e.message)));
      pg.on('response', r => { if (r.status() === 404) f404.push(r.url().split(String(PUERTO))[1]); });
      if (fs.existsSync(JUGUETE)) await pg.addInitScript({ path: JUGUETE });
      await pg.goto('http://127.0.0.1:' + PUERTO + '/' + p + '?f=' + Date.now(),
                    { waitUntil: 'load' });
      await pg.waitForTimeout(1400);

      const quien = p + ' · ' + rot;
      for (const e of errores) falla(quien, 'error_de_consola', e.slice(0, 160));
      for (const f of new Set(f404)) falla(quien, 'archivo_404', f);

      const r = await pg.evaluate(([min, medir]) => {
        const fn = new Function('return ' + medir)();
        const c = document.getElementById('contenido');
        return {
          escribio: !!(c && c.innerText.replace(/\s+/g,'').length > 40),
          scrollPagina: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          grillas: [...document.querySelectorAll('#contenido table')].length,
          grillasSinBajar: [...document.querySelectorAll('#contenido table')]
            .filter(t => { const caja = t.closest('.vi-tb-caja,.db-tb-caja,.rt-tb,.marco') || t;
                           const prev = caja.previousElementSibling;
                           return !(prev && prev.className === 'bajar-barra'); }).length,
          contraste: fn(min)
        };
      }, [MINIMO_CONTRASTE, MEDIR_CONTRASTE.toString()]);

      if (!r.escribio) falla(quien, 'pantalla_muda',
        'La pantalla cargo sin error pero #contenido quedo vacio: un pintar() que corre y no escribe.');
      if (r.scrollPagina > 0) falla(quien, 'scroll_de_pagina',
        r.scrollPagina + ' px. Una tabla tiene que deslizarse adentro de su caja.');
      if (r.grillas > 0 && r.grillasSinBajar > 0) falla(quien, 'grilla_sin_bajar',
        r.grillasSinBajar + ' de ' + r.grillas + ' grillas sin los botones de Excel y PDF.');
      for (const m of r.contraste) falla(quien, 'contraste_bajo',
        '"' + m.texto + '" · ' + m.color + ' sobre ' + m.fondo + ' = ' + m.ratio +
        ' a 1 (minimo ' + MINIMO_CONTRASTE + ') · .' + m.clase);

      await ctx.close();
    }
  }
  await b.close(); srv.close();

  /* ---- el informe ---- */
  if (!fallas.length){
    console.log('CONTROL DE PANTALLAS: ' + pantallas.length +
                ' pantallas x 2 tamanos, 0 fallas.');
    process.exit(0);
  }
  console.log('CONTROL DE PANTALLAS: ' + fallas.length + ' falla(s)\n');
  const porClase = {};
  for (const f of fallas) (porClase[f.clase] = porClase[f.clase] || []).push(f);
  for (const clase of Object.keys(porClase).sort()){
    console.log('  ' + clase.toUpperCase() + ' (' + porClase[clase].length + ')');
    for (const f of porClase[clase].slice(0, 12))
      console.log('    ' + f.pantalla + ' :: ' + f.que);
    if (porClase[clase].length > 12)
      console.log('    ... y ' + (porClase[clase].length - 12) + ' mas');
    console.log('');
  }
  process.exit(1);
}
main().catch(e => { console.error('EL CONTROL NO PUDO CORRER:', e.message); process.exit(1); });
