#!/usr/bin/env node
/* =====================================================================
   EL CONTROL DEL DICTADO POR VOZ                          13/11/2026
   =====================================================================
   QUE PRUEBA, Y QUE NO. Lo digo primero porque es lo que siempre se
   esconde al final.

   PRUEBA, de verdad, abriendo la pantalla y tocando el boton:
     - que el boton NO aparece si el navegador no tiene SpeechRecognition;
     - que SI aparece cuando lo tiene;
     - que al tocarlo queda apretado y la pista dice que esta escuchando;
     - que lo dictado cae en el campo;
     - que NO pisa lo que la persona ya habia escrito;
     - que al tocarlo de nuevo para y la pista vuelve a lo de antes;
     - que si Chrome niega el microfono lo dice y suelta el boton.

   NO PRUEBA: que Google entienda una voz de verdad. Eso necesita el
   microfono del usuario y su voz, y no los tengo. Queda declarado aca y
   se avisa al entregar, NO al cierre.

   EL ARNES VA ADENTRO. Un control que nunca fallo no esta probado: es una
   opinion. Al final se vuelve a correr todo con ayVozArmar() desactivado
   a proposito, y el control TIENE que fallar. Si pasa, esta ciego.
   ===================================================================== */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ   = path.join(__dirname, '..');
const PUERTO = 8109;
const JUGUETE = path.join(__dirname, 'supabase-de-juguete.js');
const TIPOS = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8',
                '.css':'text/css; charset=utf-8', '.json':'application/json', '.svg':'image/svg+xml',
                '.png':'image/png', '.ico':'image/x-icon' };

const fallas = [];
const falla  = (q, c, d) => fallas.push({ quien:q, que:c, detalle:d });

/* El doble del reconocedor de Chrome. Hace lo mismo que el de verdad
   -onstart, onresult, onend, onerror- pero lo disparo yo desde el control
   en vez de hablarle al microfono. */
const DOBLE = `
window.__voz = { creados: 0, arranques: 0, paradas: 0 };
function FalsoRec(){
  window.__voz.creados++;
  var self = this;
  this.lang=''; this.continuous=false; this.interimResults=false; this.maxAlternatives=1;
  this.onstart=null; this.onresult=null; this.onerror=null; this.onend=null;
  this.start = function(){ window.__voz.arranques++; window.__voz.vivo = self;
                           setTimeout(function(){ if (self.onstart) self.onstart(); }, 0); };
  this.stop  = function(){ window.__voz.paradas++;
                           setTimeout(function(){ if (self.onend) self.onend(); }, 0); };
  this.abort = this.stop;
}
window.SpeechRecognition = FalsoRec;
window.__vozDecir = function(txt){
  var r = window.__voz.vivo; if (!r || !r.onresult) return false;
  r.onresult({ results: [ [ { transcript: txt } ] ] });
  return true;
};
window.__vozRomper = function(motivo){
  var r = window.__voz.vivo; if (!r || !r.onerror) return false;
  r.onerror({ error: motivo });
  return true;
};
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

/* CHROMIUM TRAE webkitSpeechRecognition AUNQUE NO FUNCIONE.      13/11/2026
   Cagada mia, encontrada por este mismo control la primera vez que corrio:
   la corrida "sin soporte" no agregaba el doble y daba por hecho que
   entonces no habia reconocedor. Falso: el Chromium de Playwright expone
   webkitSpeechRecognition igual, sin servicio atras. O sea que el control
   estaba midiendo otra cosa. Para probar el caso "no hay soporte" hay que
   SACARLOS de verdad, los dos. */
const SIN_VOZ = `
try { delete window.SpeechRecognition; } catch(e){ window.SpeechRecognition = undefined; }
try { delete window.webkitSpeechRecognition; } catch(e){ window.webkitSpeechRecognition = undefined; }
Object.defineProperty(window, 'SpeechRecognition',       { value: undefined, configurable: true });
Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true });
`;

async function abrir(b, { conVoz, romperArmado }){
  const ctx = await b.newContext({ viewport:{ width:1400, height:900 } });
  const pg  = await ctx.newPage();
  const errores = [];
  pg.on('pageerror', e => errores.push(String(e.message)));
  await pg.route('**/supabase-js@*/**', r => r.fulfill({
    status:200, contentType:'application/javascript', body:'/* cortado: manda el juguete */' }));
  if (fs.existsSync(JUGUETE)) await pg.addInitScript({ path: JUGUETE });
  if (conVoz) await pg.addInitScript({ content: DOBLE });
  else        await pg.addInitScript({ content: SIN_VOZ });
  /* EL ARNES: le rompo el armado a proposito, como si me hubiera olvidado
     de llamar a ayVozArmar() en iniciarAyuda(). */
  if (romperArmado) await pg.addInitScript({ content:
    'window.addEventListener("DOMContentLoaded",function(){' +
    ' var t=setInterval(function(){ if (typeof window.ayVozArmar==="function"){' +
    '   window.ayVozArmar=function(){}; clearInterval(t);} },5); });' });
  await pg.goto('http://127.0.0.1:' + PUERTO + '/ayuda.html?f=' + Date.now(), { waitUntil:'load' });
  await pg.waitForTimeout(2200);
  return { ctx, pg, errores };
}

const leer = pg => pg.evaluate(() => {
  const b = document.getElementById('ayMic');
  const p = document.getElementById('ayPista');
  const q = document.getElementById('ayQ');
  return { hay: !!b,
           visible: !!b && !b.hidden && getComputedStyle(b).display !== 'none',
           apretado: b ? b.getAttribute('aria-pressed') : null,
           pista: p ? p.textContent : null,
           campo: q ? q.value : null };
});

/* UN BOTON QUE NO SE PUEDE TOCAR ES UN DEFECTO DETECTADO, NO UN CRASH.
   13/11/2026, segunda cagada mia que agarro el arnes: con el armado roto
   el boton queda escondido, pg.click se colgaba 30 s y REVENTABA el
   control entero. Un control que se muere no es un control que detecta.
   Ahora un click imposible se anota como falla y la corrida sigue. */
async function tocar(pg, fallo, cuando){
  try { await pg.click('#ayMic', { timeout: 2500 }); return true; }
  catch (e){ fallo('no_se_pudo_tocar', 'el microfono no se dejo tocar ' + cuando); return false; }
}

/* --------------------------------------------------------------- */
async function corrida(b, { romperArmado }){
  const mios = [];
  const fallo = (c, d) => mios.push({ que:c, detalle:d });

  /* ---- A. sin SpeechRecognition, el boton NO se prende ---------- */
  {
    const { ctx, pg } = await abrir(b, { conVoz:false, romperArmado:false });
    const e = await leer(pg);
    if (!e.hay) fallo('no_existe_el_boton', 'no hay #ayMic en ayuda.html');
    else if (e.visible) fallo('boton_sin_soporte',
      'el navegador NO tiene SpeechRecognition y el boton igual se muestra: un boton que no anda');
    await ctx.close();
  }

  /* ---- B..G. con el doble ---------------------------------------- */
  {
    const { ctx, pg, errores } = await abrir(b, { conVoz:true, romperArmado });

    const e0 = await leer(pg);
    if (!e0.visible) fallo('boton_no_aparece',
      'hay SpeechRecognition y el boton sigue escondido');
    const pistaOriginal = e0.pista;

    /* la persona ya habia escrito algo */
    await pg.fill('#ayQ', 'ventas de');
    const pudo = await tocar(pg, fallo, 'para arrancar');
    await pg.waitForTimeout(150);
    if (!pudo) { await ctx.close(); return mios; }

    const e1 = await leer(pg);
    if (e1.apretado !== 'true') fallo('no_queda_apretado',
      'se toco el microfono y aria-pressed quedo en ' + e1.apretado);
    if (!/[Ee]scuchando/.test(e1.pista || '')) fallo('no_avisa_que_escucha',
      'la pista dice: ' + JSON.stringify(e1.pista));
    const arranques = await pg.evaluate(() => window.__voz.arranques);
    if (arranques !== 1) fallo('no_arranco', 'arranques = ' + arranques);

    /* lo dictado cae en el campo, SIN pisar lo escrito */
    await pg.evaluate(() => window.__vozDecir('octubre contra septiembre'));
    await pg.waitForTimeout(120);
    const e2 = await leer(pg);
    if (!/octubre contra septiembre/.test(e2.campo || ''))
      fallo('no_escribe_lo_dictado', 'el campo quedo: ' + JSON.stringify(e2.campo));
    if (!/^ventas de/.test(e2.campo || ''))
      fallo('piso_lo_escrito', 'se perdio lo que la persona habia escrito: ' + JSON.stringify(e2.campo));

    /* se toca de nuevo y para */
    await tocar(pg, fallo, 'para parar');
    await pg.waitForTimeout(200);
    const e3 = await leer(pg);
    if (e3.apretado !== 'false') fallo('no_para', 'aria-pressed quedo en ' + e3.apretado);
    if (e3.pista !== pistaOriginal) fallo('no_vuelve_la_pista',
      'quedo: ' + JSON.stringify(e3.pista) + ' en vez de ' + JSON.stringify(pistaOriginal));

    /* Chrome niega el microfono */
    await tocar(pg, fallo, 'para probar el permiso negado');
    await pg.waitForTimeout(150);
    await pg.evaluate(() => window.__vozRomper('not-allowed'));
    await pg.waitForTimeout(150);
    const e4 = await leer(pg);
    if (e4.apretado !== 'false') fallo('no_suelta_con_error',
      'negaron el microfono y el boton quedo apretado');
    if (!/permiso|micr/i.test(e4.pista || '')) fallo('no_explica_el_permiso',
      'la pista dice: ' + JSON.stringify(e4.pista));

    for (const er of errores) fallo('error_de_consola', er.slice(0, 160));
    await ctx.close();
  }
  return mios;
}

/* --------------------------------------------------------------- */
(async () => {
  const srv = await servir();
  const b = await chromium.launch();
  let salida = 0;
  try {
    console.log('EL DICTADO POR VOZ — control\n');
    const reales = await corrida(b, { romperArmado:false });
    reales.forEach(f => falla('ayuda.html · voz', f.que, f.detalle));
    if (reales.length === 0) console.log('  las 7 comprobaciones: PASAN\n');
    else reales.forEach(f => console.log('  FALLA · ' + f.que + ' · ' + f.detalle));

    /* EL ARNES */
    console.log('ARNES — se desactiva ayVozArmar() a proposito.');
    const conDefecto = await corrida(b, { romperArmado:true });
    if (conDefecto.length === 0){
      falla('ARNES', 'control_ciego',
        'con el armado roto el control igual paso: no sirve para nada');
      console.log('  FALLA: el control esta CIEGO, paso con el defecto puesto.\n');
    } else {
      console.log('  lo detecto: ' + conDefecto.map(f => f.que).join(', ') + '\n');
    }
  } catch (e) {
    falla('control', 'se_rompio', e.message);
  }
  await b.close(); srv.close();

  if (fallas.length){
    console.log('NO PASA. ' + fallas.length + ' falla(s):');
    fallas.forEach(f => console.log('  · ' + f.quien + ' · ' + f.que + ' · ' + f.detalle));
    salida = 1;
  } else {
    console.log('PASA: el dictado anda y el control no esta ciego.');
    console.log('NO MEDIDO, declarado: que Google entienda una voz de verdad.' +
                ' Eso necesita el microfono del usuario.');
  }
  process.exit(salida);
})();
