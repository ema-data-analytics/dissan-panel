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

     6. FILAS QUE NO SE PUEDEN ALCANZAR. El 28/10 la grilla pintaba 30
        filas y escondia el resto: con un mes filtrado se veia SOLO EL
        ULTIMO DIA y no habia forma de llegar al renglon 31. No alcanza
        con que exista un control: se aprieta «ultima» y se exige que el
        ULTIMO renglon se vea. Y se comprueba que el Excel siga bajando
        TODAS las filas y no la pagina de arriba.
     7. BOTONES QUE NO HACEN NADA. Se aprieta cada boton visible y se
        exige que cambie algo: el contenido, un campo o el foco. Un boton
        que no se puede apretar porque algo lo tapa tambien falla: es el
        golpe del 20/10, donde apretaba el vacio y la pantalla mostraba
        las cifras sin filtrar.

   EL CONTROL DICE QUE MIDIO, no solo que paso. "0 fallas" es tambien lo
   que imprime un control que no llego a mirar nada.

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
/* lo que el control MIDIO. Sin esto, "0 fallas" tambien es lo que
   imprime un control que no llego a mirar nada. */
const medido = { grillas:0, paginas:0, botones:0, descargas:0 };
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

      /* ---- 6. FILAS QUE NO SE PUEDEN ALCANZAR ----
         Una grilla que tiene 72 renglones y muestra 30 TIENE que tener un
         control que lleve al 72. No alcanza con que el control exista: se
         aprieta «ultima» y se exige que el ULTIMO renglon se vea. */
      const controlarGrillas = async () => {
      const grillas = await pg.evaluate(() => {
        const ts = [...document.querySelectorAll('#contenido table')];
        return ts.map((t, i) => {
          t.dataset.ctrl = i;
          const caja = t.closest('.vi-tb-caja,.db-tb-caja,.rt-tb,.marco') || t;
          const sig = caja.nextElementSibling;
          if (sig && /fl-barra/.test(sig.className || '')) sig.dataset.ctrl = i;
          const trs = [...t.querySelectorAll('tbody tr')];
          const datos = trs.filter(tr => !/tot\b|\btot/.test(tr.className || '') &&
                                         !(tr.children.length === 1 && trs.length > 1));
          return {
            i, total: datos.length,
            visibles: datos.filter(tr => tr.offsetParent !== null).length,
            paginado: !!(sig && /fl-barra/.test(sig.className || '')),
            titulo: (t.querySelector('thead th') || {}).textContent || ('tabla ' + (i + 1))
          };
        });
      });
      for (const g of grillas){
        if (g.visibles >= g.total) continue;
        const que = '«' + String(g.titulo).trim().slice(0, 24) + '…» muestra ' + g.visibles +
                    ' de ' + g.total + ' renglones';
        if (!g.paginado){
          falla(quien, 'filas_inalcanzables',
            que + ' y NO hay ningun control para llegar al resto. Esconder sin salida es recortar.');
          continue;
        }
        await pg.click('.fl-barra[data-ctrl="' + g.i + '"] [data-ir="u"]').catch(() => {});
        await pg.waitForTimeout(150);
        const llego = await pg.evaluate((i) => {
          const t = document.querySelector('#contenido table[data-ctrl="' + i + '"]');
          const trs = [...t.querySelectorAll('tbody tr')]
            .filter(tr => !/tot\b|\btot/.test(tr.className || ''));
          const ult = trs[trs.length - 1];
          return !!(ult && ult.offsetParent !== null);
        }, g.i);
        if (!llego) falla(quien, 'filas_inalcanzables',
          que + ' y apretando «ultima» el ultimo renglon SIGUE sin verse.');
        else { medido.grillas++; medido.paginas += Math.ceil(g.total / Math.max(1, g.visibles)); }

        /* 6b. Y QUE EL ARCHIVO SIGA BAJANDO TODO.
           Esta es LA trampa del paginado: si alguna vez se deja de pintar
           las filas de las otras paginas, el Excel y el PDF bajarian solo
           la pagina de arriba y dirian que son todas. Es el recorte
           informado como total, que ya aparecio dos veces este mes. Asi
           que se le pregunta al mismo lector que arma el archivo. */
        const bajan = await pg.evaluate((i) => {
          if (typeof bajarLeerTabla !== 'function') return -1;
          const t = document.querySelector('#contenido table[data-ctrl="' + i + '"]');
          try { return bajarLeerTabla(t).filas.length; } catch(e){ return -2; }
        }, g.i);
        if (bajan === -1) falla(quien, 'descarga_sin_lector',
          que + ': no se pudo comprobar que el archivo baje todo (falta bajarLeerTabla).');
        else if (bajan < g.total) falla(quien, 'descarga_recortada',
          que + ', y el Excel bajaria ' + bajan + ' de ' + g.total +
          ': el archivo se lleva la pagina, no la grilla.');
        else medido.descargas++;
      }
      };
      await controlarGrillas();

      /* ---- 7. BOTONES QUE NO HACEN NADA ----
         Se aprieta cada boton de la pantalla y se exige que algo cambie. Un
         boton que no mueve una sola cosa del DOM es un boton muerto, y el
         usuario lo aprieta creyendo que filtro. Es el golpe del 20/10, donde
         el boton se corria 27 px y yo apretaba el vacio: la pantalla mostraba
         las cifras sin filtrar y casi reporto roto el filtro.
         No se aprietan: salir (cierra la sesion) ni las descargas (arman un
         archivo y tardan). Si un boton legitimo aparece muerto, la excepcion
         se DECLARA aca, no se saltea en silencio. */
      const NO_APRETAR = ['btnSalir'];
      const bots = await pg.$$('#contenido button:not([disabled])');
      for (const bt of bots){
        const info = await bt.evaluate(el => ({
          id: el.id || '', cl: el.className || '',
          rot: (el.textContent || '').trim().slice(0, 28)
        }));
        if (NO_APRETAR.includes(info.id) || /bajar-btn/.test(info.cl)) continue;
        /* SE VUELVE A MIRAR SI SE VE, JUSTO ANTES DE APRETARLO. Un boton que
           una accion anterior escondio no es un defecto: al apretar la primera
           sugerencia la Ayuda esconde las otras ocho, que es lo correcto, y la
           primera version de este control las reportaba a las ocho como
           "no se puede apretar". El estado de la pantalla cambia mientras se
           la recorre; una foto tomada al principio miente. */
        const sigueVivo = await bt.evaluate(el => !!el.offsetParent && !el.disabled);
        if (!sigueVivo) continue;
        /* QUE CUENTA COMO "hizo algo". La primera version miraba SOLO las
           mutaciones del DOM y dio 26 falsos positivos: los botones de
           sugerencia de la Ayuda ESCRIBEN EN UN CAMPO, y cambiar el `value`
           de un input no es una mutacion; y Preguntar con la caja vacia PONE
           EL FOCO en la caja, que tampoco lo es. Las dos cosas son correctas.
           Asi que la huella son las tres: mutaciones + los valores de todos
           los campos + quien tiene el foco. */
        const huella = () => pg.evaluate(() => {
          const v = [...document.querySelectorAll('#contenido input, #contenido select, #contenido textarea')]
            .map(e => e.type === 'checkbox' || e.type === 'radio' ? (e.checked ? '1' : '0') : e.value).join('\u0001');
          const a = document.activeElement;
          return v + '\u0002' + (a ? (a.id || a.tagName) + ':' + (a.className || '') : '');
        });
        await pg.evaluate(() => {
          window.__mut = 0;
          if (window.__obs) window.__obs.disconnect();
          window.__obs = new MutationObserver(() => { window.__mut++; });
          window.__obs.observe(document.getElementById('contenido'),
            { childList:true, subtree:true, attributes:true, characterData:true });
        });
        /* se suelta el foco antes de medir: la Ayuda arranca con el cursor ya
           puesto en la caja de la pregunta, asi que «Preguntar» con la caja
           vacia la volvia a enfocar y el foco quedaba igual que antes. El
           boton hacia lo correcto y mi medidor lo llamaba muerto. */
        await pg.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
        const antes = await huella();
        /* el error del clic NO se tapa: un boton que no se puede apretar
           porque algo lo cubre es el defecto del 20/10, donde apretaba el
           vacio y la pantalla mostraba las cifras sin filtrar. */
        let porque = '';
        await bt.click({ timeout: 1500 }).catch(e => { porque = String(e.message).split('\n')[0]; });
        await pg.waitForTimeout(320);
        const mut = await pg.evaluate(() => { if (window.__obs) window.__obs.disconnect(); return window.__mut; });
        const despues = await huella();
        if (porque) falla(quien, 'boton_tapado',
          '«' + info.rot + '» no se puede apretar: ' + porque.slice(0, 120));
        else medido.botones++;
        if (!porque && mut === 0 && antes === despues) falla(quien, 'boton_muerto',
          '«' + info.rot + '» se aprieta y no cambia una sola cosa de la pantalla: ' +
          'ni el contenido, ni un campo, ni el foco.');
      }

      /* y las grillas OTRA VEZ. La primera pasada corrio con la pantalla
         recien cargada, donde la grilla de Ventas todavia no existe: la
         pinta el boton «Ver», que recien se apreto arriba. Un control que
         mira antes de que el dato llegue no controla nada. */
      await controlarGrillas();

      await ctx.close();
    }
  }
  await b.close(); srv.close();

  /* ---- el informe ---- */
  if (!fallas.length){
    console.log('CONTROL DE PANTALLAS: ' + pantallas.length +
                ' pantallas x 2 tamanos, 0 fallas.');
    console.log('  midio: ' + medido.botones + ' botones apretados · ' +
                medido.grillas + ' grillas paginadas recorridas hasta la ultima pagina (' +
                medido.paginas + ' paginas) · ' + medido.descargas +
                ' con el archivo comprobado que baja TODAS las filas.');
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
