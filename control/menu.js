/* PUERTA 19 — EL CAMINO DEL USUARIO.                             20/11/2026
   =========================================================================

   POR QUE EXISTE, Y ES LA CAGADA QUE MAS REPETI.

   El 20/11 le entregue «Detalle de Ventas» diciendo que estaba PROBADO, con
   el par de numeros de la pantalla publicada contra la base, 0 diferencias,
   en los dos anios. Todo eso era cierto. Y el usuario abrio el panel y le
   decia **«No tenes acceso a este modulo»**, con el renglon apagado, pese a
   tener permiso: me habia olvidado de agregar `VentasDetalle` a la lista
   `PANTALLAS` de js/core.js, y `renglon()` mira esa lista ANTES que el
   permiso. Sin esa entrada no hay enlace posible.

   NINGUNA de las 18 puertas lo vio. Y yo tampoco, porque **entre por la URL
   directa**. Lo mismo el 16/11 con ICU (abri la lista que yo elegi, no la
   que me mando el), lo mismo con los botones de Listas, lo mismo con la
   carga congelada. Las cuatro las encontro el usuario, y las cuatro estaban
   en SU camino y fuera del mio.

   El mecanismo, dicho sin vueltas: **yo pruebo desde adentro, donde ya se
   que la cosa esta. El entra desde afuera, por la puerta de calle.** Mis
   controles cargaban la pantalla por su URL, que es como no tocar el timbre.

   QUE HACE ESTA PUERTA. Entra al panel, espera el menu, y **para cada modulo
   al que el usuario PUEDE entrar, busca su renglon en el menu, LO APRIETA,
   y comprueba que la pantalla se abrio**. No navega a ninguna URL: hace lo
   que hace una persona.

   CORTA el push si:
     · un modulo con permiso aparece APAGADO en el menu (lo del 20/11),
     · su renglon no esta en el menu,
     · el renglon no es un enlace o no lleva a ninguna parte,
     · apretarlo no abre la pantalla (404, pantalla en blanco, error),
     · o un modulo SIN permiso aparece como enlace (el agujero al reves).

   PUERTA-MIRA: js/core.js js/*.js *.html control/menu.js control/supabase-de-juguete.js
   ========================================================================= */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ   = path.join(__dirname, '..');
const JUGUETE = path.join(__dirname, 'supabase-de-juguete.js');
const PUERTO = 8931;
const TIPOS = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css',
                '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png',
                '.ico':'image/x-icon', '.woff2':'font/woff2' };

const fallas = [];
const medido = { apretados: 0, apagados: 0, grupos: 0, pantallas: new Set() };
function falla(clase, que){ fallas.push({ clase, que }); }

/* EL ARNES. Sin tocar el repositorio: se sirve un core.js con la entrada
   sacada, que es EXACTAMENTE el defecto del 20/11. Si el ancla no aparece,
   revienta: un arnes que no planta nada da verde sin haber probado. */
const PLANTAR = process.env.CONTROL_PLANTAR || '';

(async () => {
  const srv = http.createServer((q, r) => {
    let u = decodeURIComponent(q.url.split('?')[0]);
    if (u.endsWith('/')) u += 'index.html';
    fs.readFile(path.join(RAIZ, u), (e, d) => {
      if (e){ r.writeHead(404); r.end('no esta'); return; }
      r.writeHead(200, { 'Content-Type': TIPOS[path.extname(u)] || 'application/octet-stream' });
      r.end(d);
    });
  });
  await new Promise(ok => srv.listen(PUERTO, '127.0.0.1', ok));
  const base = 'http://127.0.0.1:' + PUERTO;

  const bro = await chromium.launch();
  const ctx = await bro.newContext({ viewport: { width: 1440, height: 1000 } });
  const pg  = await ctx.newPage();

  await pg.route('**/supabase-js@*/**', r => r.fulfill({
    status: 200, contentType: 'application/javascript', body: '/* juguete */' }));

  if (PLANTAR === 'sin_pantalla_en_core'){
    const original = fs.readFileSync(path.join(RAIZ, 'js', 'core.js'), 'utf8');
    const roto = original.replace(/\n\s*VentasDetalle:\s*\{[^}]*\}/, '');
    if (roto === original)
      throw new Error('EL ARNES NO ENCONTRO DONDE PLANTAR "sin_pantalla_en_core". '
                    + 'Un arnes que no planta nada da verde sin haber probado.');
    await pg.route('**/js/core.js*', r => r.fulfill({
      status: 200, contentType: 'application/javascript', body: roto }));
    console.log('  [arnes] plantado: sin_pantalla_en_core');
  }

  await pg.addInitScript({ path: JUGUETE });
  /* `sb` es un const adentro de core.js, asi que NO esta en window y no se
     le puede preguntar nada desde afuera. Se envuelve el createClient del
     juguete —que corre antes— para quedarse con el MISMO cliente que usa la
     pantalla. Asi lo que lee este control es lo que recibio el menu, no una
     segunda llamada que podria contestar otra cosa. */
  await pg.addInitScript(() => {
    const envolver = () => {
      if (!window.supabase || !window.supabase.createClient || window.__envuelto) return;
      window.__envuelto = true;
      const orig = window.supabase.createClient;
      window.supabase.createClient = function(){
        const c = orig.apply(this, arguments);
        window.__sb = c;
        return c;
      };
    };
    envolver();
    const t = setInterval(() => { envolver(); if (window.__sb) clearInterval(t); }, 5);
  });
  /* se entra por el tablero, que es la primera pantalla del panel */
  await pg.goto(base + '/tablero.html?c=' + Date.now(), { waitUntil: 'load', timeout: 40000 });

  /* el menu lo arma core.js DESPUES de contestar el portero: se espera a que
     tenga renglones, no a que exista el contenedor (la regla del 19/11). */
  try {
    await pg.waitForFunction(() => {
      const m = document.getElementById('menuLateral');
      return m && m.children.length > 0;
    }, null, { timeout: 25000 });
  } catch (e){
    falla('el_menu_no_se_armo', 'el menu lateral quedo vacio: ' + e.message.slice(0, 120));
  }

  /* lo que el portero dijo que este usuario puede, contra lo que el menu
     dibujo de verdad. No se transcribe nada: sale de la misma respuesta. */
  /* Lo que contesto el portero, pedido POR LA MISMA VIA que lo pide el panel
     —el `sb` del juguete— y no transcrito aca: si manianan cambia, cambia
     solo. (El 14/11: transcribir no es copiar.) */
  const lista = await pg.evaluate(async () => {
    try {
      const r = await window.__sb.rpc('api_mis_modulos_v4');
      return (r && r.data) || [];
    } catch (e) { return []; }
  });
  const delMenu = await pg.evaluate(() => {
    const enlaces  = [...document.querySelectorAll('#menuLateral a')]
      .map(a => ({ texto: a.textContent.trim(), href: a.getAttribute('href') }));
    const apagados = [...document.querySelectorAll('#menuLateral .menu-apagado')]
      .map(s => ({ texto: s.textContent.replace(/\s*·\s*sin acceso\s*$/, '').trim(),
                   aviso: s.getAttribute('data-aviso') || '' }));
    const cabezas  = [...document.querySelectorAll('#menuLateral .menu-cabeza')]
      .map(c => c.textContent.trim());
    return { enlaces, apagados, cabezas };
  });
  medido.grupos = delMenu.cabezas.length;
  medido.apagados = delMenu.apagados.length;

  if (!lista.length)
    falla('no_pude_leer_lo_que_dijo_el_portero',
          'el juguete no dejo a la vista la respuesta de api_mis_modulos_v4, asi '
        + 'que este control NO MIDE si el menu respeta los permisos. No medido '
        + 'no es limpio.');

  /* abrir cada rama: un renglon adentro de una cabeza cerrada no se puede
     apretar, y eso no es un defecto del menu. */
  for (let i = 0; i < delMenu.cabezas.length; i++){
    try { await pg.click('.menu-cabeza[data-rama="' + i + '"]', { timeout: 3000 }); }
    catch (e) { /* ya estaba abierta */ }
  }
  await pg.waitForTimeout(250);

  for (const m of lista){
    const nombre = (m.nombre || m.clave || '').trim();
    if (!nombre) continue;

    if (!m.puede_entrar){
      /* el agujero al reves: si NO puede entrar, no puede haber enlace */
      const comoEnlace = delMenu.enlaces.find(e => e.texto === nombre);
      if (comoEnlace)
        falla('un_modulo_sin_permiso_quedo_como_enlace',
              '"' + nombre + '" no tiene permiso y el menu lo dibujo como enlace '
            + 'a ' + comoEnlace.href + '. El portero deja de ser el portero.');
      continue;
    }

    /* PUEDE entrar: tiene que estar, como ENLACE, y tiene que abrir */
    const apagado = delMenu.apagados.find(a => a.texto === nombre);
    if (apagado){
      falla('un_modulo_con_permiso_aparece_apagado',
            '"' + nombre + '" (' + m.clave + '): el usuario TIENE permiso y el '
          + 'menu lo dibuja apagado, con el aviso «' + apagado.aviso.slice(0, 70)
          + '». Es lo del 20/11: la clave no esta en PANTALLAS de js/core.js, '
          + 'y esa lista se mira ANTES que el permiso.');
      continue;
    }
    const enlace = delMenu.enlaces.find(e => e.texto === nombre);
    if (!enlace){
      falla('un_modulo_con_permiso_no_figura_en_el_menu',
            '"' + nombre + '" (' + m.clave + '): el usuario puede entrar y su '
          + 'renglon no esta en el menu, ni como enlace ni apagado.');
      continue;
    }
    if (!enlace.href || enlace.href === '#'){
      falla('el_renglon_del_menu_no_lleva_a_ninguna_parte',
            '"' + nombre + '" es un enlace con href="' + enlace.href + '".');
      continue;
    }

    /* Y ACA ESTA LO QUE NINGUNA OTRA PUERTA HACE: SE APRIETA. */
    const errores = [];
    const oir = msj => { if (msj.type() === 'error') errores.push(msj.text().slice(0, 160)); };
    pg.on('console', oir);
    /* UN RENGLON ADENTRO DE UNA RAMA CERRADA NO SE PUEDE APRETAR, y eso no es
       un defecto del menu: es que falta abrir su cabeza. Se abre LA SUYA,
       mirando de que rama cuelga el propio enlace — no por un indice que
       guarde de otra pagina, que es lo que me hizo fallar el primer intento. */
    await pg.evaluate((href) => {
      const a = document.querySelector('#menuLateral a[href="' + href + '"]');
      if (!a) return;
      const rama = a.closest('.menu-rama');
      if (!rama || !rama.hasAttribute('hidden')) return;
      const cab = document.querySelector('.menu-cabeza[data-rama="' + rama.dataset.rama + '"]');
      if (cab) cab.click();
    }, enlace.href);
    await pg.waitForTimeout(120);
    try {
      await Promise.all([
        pg.waitForNavigation({ waitUntil: 'load', timeout: 25000 }),
        pg.click('#menuLateral a[href="' + enlace.href + '"]', { timeout: 8000 })
      ]);
    } catch (e){
      pg.off('console', oir);
      falla('apretar_el_renglon_no_abrio_la_pantalla',
            '"' + nombre + '" -> ' + enlace.href + ': ' + e.message.slice(0, 140));
      await pg.goto(base + '/tablero.html?c=' + Date.now(), { waitUntil: 'load' }).catch(()=>{});
      await pg.waitForTimeout(400);
      continue;
    }
    medido.apretados++;
    medido.pantallas.add(enlace.href);

    const vista = await pg.evaluate(() => ({
      modulo: (document.getElementById('app') || { dataset:{} }).dataset.modulo || '',
      appVisible: !!document.querySelector('#app:not([hidden])'),
      cuerpo: (document.getElementById('contenido') || { innerText:'' }).innerText.trim().length,
      titulo: document.title,
      cuatro04: /no esta/.test(document.body.innerText) && document.body.innerText.length < 40
    }));
    pg.off('console', oir);

    /* UNA PAGINA SUELTA NO TIENE `#app` Y ESO NO ES UN DEFECTO. La Agenda
       no carga core.js: tiene su propia clave validada en la base, asi que
       nunca va a mostrar el shell del panel. Se exige que el renglon LLEVE
       a algo que abre, y se declara que de esa no se mira el shell. Mi
       primera version la acusaba, que es acusar de agujero a algo que no lo
       es — por sexta vez en cinco dias.                        20/11/2026 */
    /* el discriminante es si carga core.js, NO si existe `#app`: la Agenda
       tiene `#app` pero arranca `hidden` hasta que entra su propia clave. */
    const esSuelta = !(await pg.$('script[src*="js/core.js"]'));
    if (esSuelta) medido.sueltas = (medido.sueltas || 0) + 1;

    if (vista.cuatro04)
      falla('el_renglon_del_menu_lleva_a_un_404',
            '"' + nombre + '" -> ' + enlace.href + ' no existe en el panel.');
    else if (esSuelta){
      if (!vista.titulo)
        falla('el_renglon_lleva_a_una_pagina_que_no_abre',
              '"' + nombre + '" -> ' + enlace.href + ': no cargo nada.');
    }
    else if (!vista.appVisible)
      falla('la_pantalla_no_abrio_despues_de_apretar',
            '"' + nombre + '" -> ' + enlace.href + ': el panel quedo sin mostrarse.');
    else if (!esSuelta && vista.modulo !== m.clave)
      falla('el_renglon_lleva_a_otra_pantalla',
            '"' + nombre + '" (' + m.clave + ') -> ' + enlace.href + ' declara '
          + 'data-modulo="' + vista.modulo + '".');
    else if (!esSuelta && !vista.cuerpo)
      falla('la_pantalla_abrio_en_blanco',
            '"' + nombre + '" -> ' + enlace.href + ': #contenido no pinto nada.');
    if (errores.length)
      falla('errores_de_consola_al_abrir_desde_el_menu',
            '"' + nombre + '": ' + errores.slice(0, 2).join(' | '));

    /* volver al menu para apretar el proximo, como hace una persona */
    await pg.goto(base + '/tablero.html?c=' + Date.now(), { waitUntil: 'load' }).catch(()=>{});
    await pg.waitForFunction(() => {
      const m2 = document.getElementById('menuLateral');
      return m2 && m2.children.length > 0;
    }, null, { timeout: 20000 }).catch(()=>{});
    for (let i = 0; i < delMenu.cabezas.length; i++){
      try { await pg.click('.menu-cabeza[data-rama="' + i + '"]', { timeout: 1500 }); }
      catch (e) { /* ya abierta */ }
    }
  }

  await bro.close();
  srv.close();

  if (fallas.length){
    console.log('EL CAMINO DEL USUARIO: ' + fallas.length + ' falla(s)\n');
    const porC = {};
    for (const f of fallas) (porC[f.clase] = porC[f.clase] || []).push(f);
    for (const c of Object.keys(porC)){
      console.log('  ' + c.toUpperCase() + ' (' + porC[c].length + ')');
      for (const f of porC[c]) console.log('    ' + f.que);
      console.log('');
    }
    process.exit(1);
  }
  console.log('EL CAMINO DEL USUARIO: 0 fallas.');
  console.log('  midio: entro al panel y espero el menu · ' + medido.grupos
            + ' cabezas desplegadas · ' + medido.apretados + ' renglones APRETADOS '
            + 'con el mouse (no una URL tipeada por mi), los '
            + medido.pantallas.size + ' llevando a su pantalla, abriendola y '
            + 'pintando · ' + medido.apagados + ' renglones apagados, ninguno de ' + '' 
            + 'ellos con permiso.');
  console.log('  NO midio: lo que hay ADENTRO de cada pantalla. Esto mide que se '
            + 'pueda ENTRAR por donde entra el usuario, que es lo que ninguna '
            + 'otra puerta miraba.');
  process.exit(0);
})().catch(e => {
  console.error('EL CAMINO DEL USUARIO NO PUDO CORRER: ' + e.message);
  process.exit(1);
});
