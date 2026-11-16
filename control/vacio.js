#!/usr/bin/env node
/* LA PANTALLA VACIA — puerta 18.                                  16/11/2026
   =========================================================================

   POR QUE EXISTE, Y ES LA FALTA MAS CARA DEL PROYECTO REPETIDA POR TERCERA VEZ

   Hoy a la maniana el usuario abrio Listas con ICU y las dos secciones de
   abajo NO ESTABAN. No estaban rotas: estaban VACIAS con razon, y la pantalla
   callaba. Una seccion que desaparece se lee como "falta algo", y una pantalla
   que calla no se distingue de una rota. Perdio la maniana buscando que le
   habia roto yo.

   Y NINGUNA DE LAS 17 PUERTAS PODIA VERLO. El supabase de juguete contestaba
   SIEMPRE el caso lleno, porque las respuestas las escribi yo y escribi la que
   me imaginaba. Es textual:
     - 10/11: el Tablero estuvo NUEVE HORAS caido con doce puertas alrededor,
       porque el juguete no tenia respuesta para esa funcion.
     - 14/11: el control de la fila de totales canto "0 fallas" el mismo dia que
       lo escribi, sin haber mirado una sola fila de totales.
   Un control que nunca vio el caso que importa no esta midiendo: acompania.

   QUE MIDE ESTA PUERTA

   Carga cada pantalla DOS VECES contra el mismo juguete:
     A) como siempre, con las respuestas llenas;
     B) con `window.__CONTROL_VACIO`, que sirve LAS MISMAS respuestas con todas
        sus listas anidadas vacias.
   Despues compara los ROTULOS de seccion que quedaron pintados adentro de
   `#contenido`. Un rotulo que esta en A y NO esta en B es una seccion que se
   esfuma cuando no hay datos: el defecto de hoy.

   POR QUE SE COMPARA POR CLASE Y NO POR TEXTO. El texto de un rotulo lleva
   datos adentro ("289 renglones leidos en 1589 ms"), asi que cambia
   legitimamente entre las dos corridas y compararlo daria fallas falsas. Lo
   estable es la CLASE, y se cuenta cuantas veces aparece cada una.

   Y EL ROTULO SE RECONOCE POR LA CONVENCION DE LA CASA, NO POR UNA LISTA.
   Una clase que TERMINA en `-sec` o en `-titulo`. El 14/11 tres listas de
   clases escritas a mano mordieron el mismo dia (`.sd-caja` que faltaba en
   control/pantallas.js, `.sd-sec` que faltaba en bajarTitulo, y la de
   calidades del 14/10 de donde sale la regla). Cuando una lista muerde no se
   le agrega un nombre: se la reemplaza por la convencion.

   LO QUE ESTA PUERTA NO PUEDE VER, Y LO DECLARA

   `listas.html` no pinta nada hasta que se suelta un archivo, asi que aca sus
   secciones no aparecen en NINGUNA de las dos corridas y esta puerta no la
   puede medir. Ese caso vive en control/listas.js (puerta 17), que arma la
   pantalla soltando el archivo. Se dice en el pie en vez de cantar un pase:
   un control que pasa sin declarar que midio es media medicion (14/11).

   EL ARNES

   CONTROL_PLANTAR=seccion_se_esfuma sirve el `js/margen.js` del repositorio
   con una seccion que HOY se pinta siempre envuelta en `if (<lista>.length)`,
   o sea el defecto de hoy plantado a mano en otra pantalla. Si la puerta no
   canta, esta ciega. Y si el reemplazo no encuentra su ancla, REVIENTA: un
   arnes que no planta nada da verde sin haber probado (14/11).
   ========================================================================= */

const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const RAIZ    = path.resolve(__dirname, '..');
const PUERTO  = 8218;
const JUGUETE = path.join(__dirname, 'supabase-de-juguete.js');
const PLANTAR = process.env.CONTROL_PLANTAR || '';
const SOLO    = process.env.CONTROL_VACIO_SOLO || '';

const TIPOS = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
                '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml',
                '.ico':'image/x-icon', '.woff2':'font/woff2' };

const fallas = [];
const medido = { pantallas:0, con_rotulos:0, rotulos_llenos:0, rotulos_vacios:0,
                 sin_rotulos:[], reventaron:[], declararon:[] };
function falla(pantalla, clase, que){ fallas.push({ pantalla, clase, que }); }

/* Los rotulos de seccion que quedaron pintados adentro del area de contenido.
   Devuelve {clase: cuantos}. Se exige que el elemento SE VEA y que tenga
   texto: un rotulo con display:none no lo lee nadie. */
const RELEVAR = function(){
  const dentro = document.getElementById('contenido');
  if (!dentro) return null;
  const cuenta = {}, conTexto = {};
  dentro.querySelectorAll('*').forEach(function(el){
    const c = el.className;
    if (typeof c !== 'string' || !c) return;
    const t = (el.textContent || '').trim();
    if (!t) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    /* TODA clase que lleve un texto que se lea. Sirve para saber si la
       pantalla, cuando saco una seccion, PUSO ALGO EN SU LUGAR. */
    if (t.length >= 20) c.split(/\s+/).forEach(function(k){ if (k) conTexto[k] = true; });
    const clases = c.split(/\s+/).filter(function(x){ return /(-sec|-titulo)$/.test(x); });
    clases.forEach(function(k){ cuenta[k] = (cuenta[k] || 0) + 1; });
  });
  return { rotulos: cuenta, conTexto: Object.keys(conTexto) };
};

async function cargar(b, pantalla, vacio){
  const ctx = await b.newContext({ viewport:{ width:1500, height:950 } });
  const pg  = await ctx.newPage();
  const errores = [];
  pg.on('pageerror', e => errores.push(String(e.message)));

  /* el juguete tiene que ganarle al CDN: si no, la pantalla habla con la base
     de verdad y el control mide otra cosa (defecto del 31/10). */
  await pg.route('**/supabase-js@*/**', r => r.fulfill({
    status:200, contentType:'application/javascript',
    body:'/* supabase-js real cortado por el control */' }));

  if (PLANTAR === 'seccion_se_esfuma'){
    await pg.route('**/js/margen.js*', async r => {
      let cuerpo = fs.readFileSync(path.join(RAIZ, 'js', 'margen.js'), 'utf8');
      const antes = cuerpo;
      /* Se le devuelve a la seccion «De donde sale el costo» la condicion que
         tenia hasta hoy a la maniana: desaparecer cuando su lista viene vacia.
         Es el defecto REAL que esta puerta encontro, replantado.

         EL PRIMER ARNES QUE ESCRIBI NO SERVIA, Y ESO LO MIDIO EL ARNES MISMO.
         Plantaba la condicion en la seccion del detalle, cuyos renglones el
         juguete no tiene: la seccion faltaba en LAS DOS corridas, no habia
         diferencia que ver, y la puerta callaba con razon. Un arnes que
         planta el defecto donde la puerta no puede mirar no prueba que la
         puerta funcione: prueba que el arnes esta mal puesto. */
      cuerpo = cuerpo.replace(
        "  h.push('<div class=\"mv-sec\">De dónde sale el costo' +",
        "  if (cal.length) h.push('<div class=\"mv-sec\">De dónde sale el costo' +");
      if (cuerpo === antes)
        throw new Error('EL ARNES NO PUDO PLANTAR EL DEFECTO (' + PLANTAR + '): no '
          + 'encontro donde tocar js/margen.js. Un arnes que no planta nada da verde '
          + 'sin haber probado.');
      r.fulfill({ status:200, contentType:'application/javascript', body:cuerpo });
    });
  }

  if (vacio) await pg.addInitScript('window.__CONTROL_VACIO = true;');
  if (fs.existsSync(JUGUETE)) await pg.addInitScript({ path: JUGUETE });

  let rotulos = null;
  try {
    await pg.goto('http://127.0.0.1:' + PUERTO + '/' + pantalla,
                  { waitUntil:'networkidle', timeout:30000 });
    /* las pantallas pintan con MutationObserver a los ~150 ms: el 14/11 y el
       16/11 este mismo error -relevar antes de que termine de pintar- me tapo
       media hora dos veces. Se espera a que el relevamiento se estacione. */
    let ant = -1, igual = 0;
    for (let i = 0; i < 30 && igual < 3; i++){
      await pg.waitForTimeout(200);
      const r = await pg.evaluate(RELEVAR);
      const n = r ? Object.values(r.rotulos).reduce((a,b)=>a+b, 0) : -1;
      if (n === ant) igual++; else { igual = 0; ant = n; }
      rotulos = r;
    }
  } catch (e) {
    await ctx.close();
    return { rotulos:null, texto:'', errores, reviento: String(e.message).slice(0,160) };
  }
  /* el texto que de verdad SE VE en el area de contenido: es lo que decide si
     una pantalla sin secciones esta declarando que no hay nada o si quedo
     muda. Se lee despues de que el relevamiento se estaciono. */
  let texto = '';
  try {
    texto = await pg.evaluate(function(){
      const d = document.getElementById('contenido');
      return d ? (d.innerText || '').trim().replace(/\s+/g, ' ') : '';
    });
  } catch (e) { texto = ''; }
  await ctx.close();
  return { rotulos, texto, errores, reviento:null };
}

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

  const pantallas = fs.readdirSync(RAIZ).filter(f => f.endsWith('.html'))
                      .filter(f => !SOLO || f === SOLO).sort();
  const b = await chromium.launch();

  for (const p of pantallas){
    medido.pantallas++;
    const lleno = await cargar(b, p, false);
    const vacio = await cargar(b, p, true);

    if (lleno.reviento){ medido.reventaron.push(p + ' (lleno): ' + lleno.reviento); continue; }
    if (vacio.reviento){
      falla(p, 'revienta_con_la_pantalla_vacia', 'la pantalla no termino de cargar sin datos: ' + vacio.reviento);
      continue;
    }
    if (vacio.errores.length && !lleno.errores.length){
      falla(p, 'error_de_javascript_solo_sin_datos',
            'con datos no tira ningun error y sin datos tira ' + vacio.errores.length +
            ': ' + vacio.errores[0].slice(0,140));
    }

    const A = (lleno.rotulos && lleno.rotulos.rotulos) || {};
    const B = (vacio.rotulos && vacio.rotulos.rotulos) || {};
    const tA = new Set((lleno.rotulos && lleno.rotulos.conTexto) || []);
    const tB = ((vacio.rotulos && vacio.rotulos.conTexto) || []);
    /* QUE PUSO EN SU LUGAR. Una clase con texto legible que aparece SOLO en la
       corrida sin datos es la pantalla diciendo «no hay nada». El Tablero hace
       justo eso: saca sus cinco secciones y escribe «Ningun renglon entra en
       esos filtros». Eso NO es el defecto, y la primera version de esta puerta
       lo acusaba igual. */
    const enSuLugar = tB.filter(k => !tA.has(k));
    const nA = Object.values(A).reduce((a,b)=>a+b, 0);
    const nB = Object.values(B).reduce((a,b)=>a+b, 0);
    medido.rotulos_llenos += nA; medido.rotulos_vacios += nB;
    if (!nA){ medido.sin_rotulos.push(p); continue; }
    medido.con_rotulos++;

    /* CUANDO SE VAN TODAS A LA VEZ, NO ES EL DEFECTO: ES UNA PANTALLA VACIA
       COHERENTE.                                                16/11/2026
       La primera version de esta puerta acuso al Tablero de esconder sus
       cinco secciones. Medido: cuando no hay renglones las saca TODAS y
       escribe «Ningun renglon entra en esos filtros». Eso esta bien — pintar
       cinco secciones vacias seria ruido — y publicarlo como alarma habria
       sido acusar de agujero a algo que no lo es por quinta vez en cuatro
       dias, y encima en cada corrida. Una puerta que grita siempre se apaga.

       EL DEFECTO ES QUE SE VAYA UNA MIENTRAS LAS OTRAS SE QUEDAN: ahi el que
       mira no puede distinguir «esta vacia» de «se rompio». Eso es exactamente
       lo que le paso hoy con ICU.
       Y si se van todas y la pantalla ademas queda MUDA, eso si es falla: una
       pantalla en blanco no se distingue de una caida. */
    if (!vacio.texto || vacio.texto.length < 20){
      falla(p, 'la_pantalla_queda_muda',
            'sin datos el area de contenido queda sin un texto que se pueda leer' +
            (vacio.texto ? ' («' + vacio.texto + '»)' : '') +
            '. Una pantalla en blanco no se distingue de una caida.');
      continue;
    }

    const seFueron = Object.keys(A).filter(k => (B[k] || 0) < A[k]);
    if (seFueron.length && enSuLugar.length){
      medido.declararon.push(p + ' → saco ' + seFueron.join(', ') + ' y puso en su lugar ' +
                             enSuLugar.join(', '));
      continue;
    }
    for (const clase of seFueron){
      falla(p, 'una_seccion_se_esfuma',
            'con datos se pintan ' + A[clase] + ' rotulo(s) «' + clase + '» y sin datos ' +
            (B[clase] || 0) + ', y la pantalla NO pone nada en su lugar. El que mira no ' +
            'puede saber si eso esta vacio o roto: tiene que aparecer igual y decir que ' +
            'no hay nada, con el motivo.');
    }
  }
  await b.close();
  srv.close();

  /* ---------------- el informe ---------------- */
  console.log('LA PANTALLA VACIA — cada pantalla cargada con datos y sin datos\n');
  console.log('  pantallas miradas: ' + medido.pantallas +
              ' · con rotulos de seccion: ' + medido.con_rotulos);
  console.log('  rotulos pintados: ' + medido.rotulos_llenos + ' con datos, ' +
              medido.rotulos_vacios + ' sin datos');
  if (medido.sin_rotulos.length)
    console.log('  NO SE EJERCITO en ' + medido.sin_rotulos.length + ' pantalla(s), porque no ' +
                'pintan ninguna seccion al cargar: ' + medido.sin_rotulos.join(', ') +
                '.\n  Eso NO es un pase: es un control que no llego a mirar. listas.html ' +
                'necesita que se suelte un archivo y se mide en control/listas.js.');
  if (medido.declararon.length)
    console.log('  sacaron TODAS sus secciones y lo DECLARARON por escrito, que es lo ' +
                'correcto:\n    ' + medido.declararon.join('\n    '));
  /* LO QUE ESTA PUERTA NO PUEDE VER, DICHO POR ELLA MISMA.        16/11/2026
     Lo encontro su propio arnes: el primer defecto que le plante vivia en una
     seccion cuyos renglones salen de una respuesta que es un arreglo de PRIMER
     NIVEL, y esos no se vacian a proposito (vaciar la de modulos apaga el
     menu). Asi que una grilla cuya respuesta entera es una lista sigue
     llegando llena en la corrida "sin datos" y su seccion no se puede medir.
     Se dice en cada corrida, porque un control que pasa sin declarar que no
     midio es media medicion (14/11). */
  console.log('  NO MIDE todavia las secciones que cuelgan de una respuesta que es un ' +
              'arreglo entero (el detalle de Márgenes es una). Esas llegan llenas igual ' +
              'en la corrida sin datos. Lo encontro el arnés de esta misma puerta.');
  if (medido.reventaron.length)
    console.log('  no cargaron ni con datos (no se les puede exigir nada): ' +
                medido.reventaron.join(' · '));

  /* EL ARNES CONTESTA AL REVES QUE LA PUERTA. */
  if (PLANTAR){
    if (fallas.length){
      console.log('\nARNES «' + PLANTAR + '»: la puerta LO AGARRO (' + fallas.length + ' falla(s)).');
      fallas.slice(0,3).forEach(f => console.log('  - ' + f.pantalla + ' · ' + f.clase + ': ' + f.que));
      process.exit(0);
    }
    console.log('\nARNES «' + PLANTAR + '»: LA PUERTA NO LO AGARRO. Esta ciega.');
    process.exit(1);
  }

  if (!fallas.length){ console.log('\nLA PANTALLA VACIA: 0 fallas.'); process.exit(0); }
  console.log('\nLA PANTALLA VACIA: ' + fallas.length + ' falla(s)\n');
  fallas.forEach(f => console.log('  - ' + f.pantalla + ' · ' + f.clase + '\n      ' + f.que));
  process.exit(1);
}

main().catch(e => { console.error('EL CONTROL SE MURIO: ' + e.message); process.exit(1); });
