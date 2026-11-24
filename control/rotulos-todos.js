#!/usr/bin/env node
/* PUERTA — MIRAR LA PANTALLA ENTERA, NO SOLO LAS CIFRAS.       24/11/2026
   =========================================================================
   POR QUE EXISTE: el usuario abrio el dashboard, vio «Mza» en el segmentador
   y me freno con «cuando te diga PROBAR, SIGNIFICA QUE VEAS TODO». La noche
   anterior yo habia entregado «0 diferencias, 0 errores» — sobre las CIFRAS.
   Las veintiuna puertas miden numeros, botones, archivos y permisos. NINGUNA
   miraba lo que esta ESCRITO en la pantalla.

   Y lo hice a ojo hasta hoy, que es lo mismo que no hacerlo: a ojo se hace
   cuando me acuerdo. Enganchada al pre-push, corre sola en cada publicacion.

   QUE MIDE, en las seis pestanias:
     - texto CORTADO por CSS (el contenido es mas ancho que su caja). Un
       rotulo cortado es OTRO rotulo: el `IVA 2...` del 14/11.
     - `undefined`, `NaN`, `[object` o `null` pintados.
     - que la pagina no scrollee de costado.

   QUE NO MIDE, declarado: si la cifra es correcta -eso lo miran las otras-,
   ni si el texto esta bien REDACTADO, ni SI UN ROTULO ES UNA ABREVIATURA. Eso
   ultimo no se puede medir desde la pantalla y el intento esta abajo, tachado,
   con sus falsos positivos: vive en la identidad, contra el maestro.
   SIRVE EL ARBOL LOCAL, NO github.io. La primera version media la pantalla
   PUBLICADA y eso esta mal en un pre-push: habria gritado por los dos rotulos
   cortados que este mismo push arregla, o sea que cortaria el push por el
   defecto que viene a corregir. `control/pantallas.js` ya sirve el arbol
   local en 127.0.0.1 por esta razon, escrita el 02/11: se prueba lo que se
   esta por publicar.
   Y por eso el JUGUETE tiene que traer el caso raro -una provincia abreviada
   y un nombre largo-, o este camino no se ejercita nunca: es la regla del
   14/11 y del 16/11, al agregar una respuesta al juguete va tambien el caso
   que importa, no solo el comodo.
   ========================================================================= */
const { chromium } = require('playwright');
const http=require('http'), fs=require('fs'), path=require('path');
const RAIZ=path.join(__dirname,'..');
const JUGUETE=path.join(__dirname,'supabase-de-juguete.js');
const PUERTO=8141;
const TIPOS={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const esperar=async(pg,ms)=>{const t0=Date.now();for(;;){
  const r=await pg.evaluate(()=>({hay:!!(window.DV&&window.DV.datos),
    marca:!!(window.DV&&window.DV.datos&&window.DV.datos.__marca),
    carg:!!(window.DV&&window.DV.cargando)}));
  if(r.hay&&!r.marca&&!r.carg)return Date.now()-t0;
  if(Date.now()-t0>ms)throw new Error('no cargo');await pg.waitForTimeout(150);}};
(async()=>{
  const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);
    if(u.endsWith('/'))u+='index.html'; const f=path.join(RAIZ,u);
    fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}
      r.writeHead(200,{'Content-Type':TIPOS[path.extname(f)]||'application/octet-stream'});r.end(d);});});
  await new Promise(ok=>srv.listen(PUERTO,ok));
  const nav=await chromium.launch();
  const ctx=await nav.newContext({viewport:{width:1600,height:1150},deviceScaleFactor:1});
  const pg=await ctx.newPage(); const err=[]; pg.on('pageerror',e=>err.push(String(e.message)));
  /* el CDN de supabase-js sobreescribiria el juguete (20/11) */
  await pg.route('**/supabase-js@*/**',r=>r.fulfill({status:200,
    contentType:'text/javascript',body:'/* cortado por el control */'}));

  /* EL ARNES. Sirve un CSS que angosta la primera columna de la tabla, o sea
     el mismo defecto que el usuario vio hoy -«INST. DE O.SOCIAL...» cortado-,
     y la puerta TIENE que gritar. Una puerta que deja de gritar puede estar
     arreglada o CIEGA, y las dos se ven igual desde afuera (14/11).
     Si no encuentra donde plantar, REVIENTA: un arnes que no planta nada da
     verde sin haber probado. */
  if (process.env.CONTROL_PLANTAR === 'rotulo_cortado'){
    /* EL PRIMER INTENTO NO REPRODUJO NADA Y LA PUERTA DIO VERDE. Angostaba la
       primera columna de la tabla con `max-width:60px` sobre el `<td>`, y en
       una tabla de ancho automatico el navegador IGNORA ese max-width: la
       columna se siguio midiendo por su contenido y no se corto un solo
       rotulo. El arnes canto «no lo agarro» sin haber plantado nada, que es
       exactamente contra lo que existe. Ahora se planta sobre el `<span>` del
       chip -que es donde el usuario vio «MEND…» el 23/11- y, sobre todo, EL
       ARNES SE MIDE A SI MISMO: cuenta cuantos elementos quedaron de verdad
       con el contenido mas ancho que su caja, y si son CERO revienta. */
    await pg.route('**/css/dashboard-ventas.css*', async r=>{
      const crudo = fs.readFileSync(path.join(RAIZ,'css','dashboard-ventas.css'),'utf8');
      const ANCLA = '#dvInforme .dv-op-r{';
      if (crudo.split(ANCLA).length - 1 !== 1)
        throw new Error('ARNES ROTO: el ancla «'+ANCLA+'» no aparece exactamente '+
                        'una vez en el CSS servido. No se planto nada.');
      await r.fulfill({status:200, contentType:'text/css',
        body: crudo + '\n#dvInforme .dv-op-r{display:inline-block;max-width:40px;'+
              'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'});
    });
    console.log('  ARNES: servi un CSS que angosta el rotulo del chip a 40 px.');
  }

  await pg.addInitScript({path:JUGUETE});

  /* LAS PANTALLAS SE ENUMERAN DEL DISCO, NO DE UNA LISTA MIA (14/10, 14/11).
     Si manana se agrega una, esta puerta la mira sola. */
  const PANTALLAS = fs.readdirSync(RAIZ).filter(f=>f.endsWith('.html')).sort();
  const fallas=[]; let vistos=0, vistas=0; const mudas=[], recorrido=[];

  /* lo que se mide de UNA vista: cortados por CSS, basura pintada y scroll
     de costado. Es lo unico mecanico; lo que no se puede medir desde la
     pantalla esta declarado arriba. */
  const mirar = () => pg.evaluate(()=>{
    const out={cortados:[],basura:[],n:0};
    const vis=e=>{const r=e.getBoundingClientRect();
      return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';};
    document.querySelectorAll('#contenido *').forEach(e=>{
      if(e.children.length) return; if(!vis(e)) return;
      const t=(e.textContent||'').trim(); if(!t) return;
      out.n++;
      if(e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow!=='visible')
        out.cortados.push(t.substring(0,48)+'  [caja '+e.clientWidth+' contenido '+e.scrollWidth+']');
      /* SIN la bandera `i` y con limite de palabra, porque asi los escribe
         JavaScript y porque con `i` esto grito 2 veces en su primera corrida
         sobre las 19 pantallas: «ganancia» lleva «nan» adentro, y marcaba
         «ganancia bruta» y «ganancia / facturado» del Tablero y del index.
         Un control que grita por una palabra castellana se apaga solo. */
      if(/\bundefined\b|\bNaN\b|\[object |\bnull\b/.test(t)) out.basura.push(t.substring(0,60));
    });
    out.anchoP=document.documentElement.scrollWidth; out.anchoV=window.innerWidth;
    return out;});

  const anotar=(donde,v)=>{
    vistos+=v.n;
    if(v.cortados.length) fallas.push(donde+' · CORTADOS: '+[...new Set(v.cortados)].join(' | '));
    if(v.basura.length)   fallas.push(donde+' · BASURA PINTADA: '+[...new Set(v.basura)].join(' | '));
    if(v.anchoP>v.anchoV) fallas.push(donde+' · la pagina scrollea de costado ('+v.anchoP+' vs '+v.anchoV+')');
  };

  for (const html of PANTALLAS){
    await pg.goto('http://127.0.0.1:'+PUERTO+'/'+html,{waitUntil:'networkidle'});
    await pg.waitForTimeout(900);
    const v = await mirar();

    /* UNA PANTALLA QUE NO PINTO NADA NO ES UNA PANTALLA LIMPIA: es una que no
       se ejercito, y eso se DECLARA (14/11). Doce del panel no pintan hasta
       apretar Calcular, asi que contarlas como verdes seria media medicion. */
    if (v.n < 5){ mudas.push(html+' ('+v.n+' textos)'); continue; }
    vistas++; anotar(html, v);

    /* si la pantalla usa la convencion de pestanias de la casa, se recorren
       TODAS: el dashboard esconde 5 de sus 6 vistas detras de un boton. */
    const pest = await pg.evaluate(()=>[...document.querySelectorAll('[data-pest]')]
      .map(b=>b.getAttribute('data-pest')));
    for (const id of pest){
      await pg.click('[data-pest="'+id+'"]'); await pg.waitForTimeout(800);
      vistas++; anotar(html+' › '+id, await mirar());
    }
    recorrido.push(html+(pest.length?' ('+(pest.length+1)+' vistas)':''));
  }
  console.log('  recorrido: '+recorrido.join(' · '));

  if(err.length) fallas.push('errores de consola: '+err.slice(0,3).join(' | '));

  /* UN ARNES QUE NO REPRODUCE EL DEFECTO DA VERDE SIN HABER PROBADO (14/11).
     El primer intento de este mismo arnes paso por aca con 0 fallas. */
  if (process.env.CONTROL_PLANTAR === 'rotulo_cortado' && !fallas.length)
    throw new Error('ARNES ROTO: planto el CSS que angosta el chip y la puerta '+
      'no encontro NI UN rotulo cortado en las 6 pestanias. O el defecto no se '+
      'reprodujo, o la puerta esta ciega: las dos cosas se ven igual desde '+
      'afuera y ninguna es un pase.');
  console.log('\nCONTROL DE ROTULOS EN PANTALLA: '+
    (fallas.length?fallas.length+' falla(s).':'0 fallas.'));
  for(const f of fallas) console.log('  - '+f);
  console.log('  midio: '+PANTALLAS.length+' pantallas del panel y '+vistas+' vistas, '+vistos+
    ' textos visibles · cortados por CSS · undefined/NaN/[object/null · '+
    'scroll horizontal.');
  console.log('  NO se ejercitaron (no pintan nada hasta apretar Calcular, '+
    'asi que NO son un pase): '+(mudas.length?mudas.join(' · '):'ninguna'));
  console.log('  NO midio: si la cifra es correcta -eso lo miran las otras puertas- '+
    'ni si el texto esta bien redactado, NI si un rotulo es una abreviatura de\n'+
    '    otra palabra -«Mza» por MENDOZA-: desde la pantalla no se distingue de\n'+
    '    «Otros», y eso lo mide la identidad rotulo_provincia_sin_declarar.\n'+
    '    Aca se mide que el texto se LEA ENTERO.');
  await nav.close(); srv.close(); process.exit(fallas.length?1:0);
})();
