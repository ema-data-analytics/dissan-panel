/* =====================================================================
   CONTROL DEL ARCHIVO BAJADO — corre antes de cada push     01/11/2026
   =====================================================================
   POR QUE EXISTE. Es la clase que mas repeti, y las cuatro veces la
   encontre ABRIENDO EL ARCHIVO A MANO. Nunca la agarro un control:

     UN CODIGO NO ES UN NUMERO — 5 veces
       14/10  $2.638.992 se mostraba 2,64 y bajaba cortado
       23/10  la OC 5245 salia 5.245 en el PDF
       27/10  el Sinonimo salia como NUMERO y Tango no importaba el archivo
       28/10  la fecha bajaba como TEXTO porque le habia puesto data-v
       31/10  el deposito '03' salia 3. "Un deposito 3 no liga contra Tango"

     UNA FECHA MAL FORMATEADA SE LLEVA EL ARCHIVO PUESTO — 4 veces
       15/10  ultima_venta con formato de plata y el valor como TEXTO
       31/10  FECHA_VTO en ISO: bajaba como texto y la columna dejaba de
              ser fecha. En Excel no se podia ordenar por vencimiento, que
              es el unico uso que tiene ese archivo

     SUMAR LO QUE NO SE SUMA — 3 veces
       15/10  "Suma de Ultima Venta" y "Suma de Dias Sin Venta"
       21/10  el total de una columna que cuenta pares artículo-deposito
       31/10  "Suma de Costo Unitario": sumar precios por unidad de
              articulos distintos no significa nada

     EL RENGLON DE FILTROS DEL ARCHIVO — 2 veces
       23/10  los archivos salian llamados ingresar-al-panel-dissan.xlsx
       31/10  "Filtros: ... Filas por pagina 3060120250500todas: 30"

   La regla del 23/10 decia: "antes de entregar una descarga, ABRIR el
   archivo bajado. Que el boton diga Bajado no prueba nada sobre lo que
   hay adentro." Estaba escrita y no frenaba nada, porque abrir el archivo
   dependia de que yo me acordara. Esto lo hace solo.

   QUE HACE. Levanta cada pantalla con el juguete, aprieta el boton de
   Excel de cada grilla, CAPTURA LA DESCARGA de verdad, y le pasa los
   archivos a control/archivo.py, que los abre con openpyxl y mide celda
   por celda.

   LO QUE NO MIDE, declarado: el PDF. Verificar que no haya un numero,
   una fecha o un codigo cortado en el PDF necesita extraer el texto con
   su posicion, y eso todavia no esta. El aviso de recorte del 28/10 sigue
   siendo la unica proteccion de ese lado.
   ===================================================================== */

if (!process.env.NODE_USE_ENV_PROXY && process.env.HTTPS_PROXY) {
  const r = require('child_process').spawnSync(process.execPath, [__filename], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' })
  });
  process.exit(r.status === null ? 1 : r.status);
}

require('./enchufar').enchufar();   /* la puerta se enchufa sola */

const fs    = require('fs');
const path  = require('path');
const http  = require('http');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const RAIZ    = path.join(__dirname, '..');
const JUGUETE = path.join(__dirname, 'supabase-de-juguete.js');
const SALIDA  = path.join('/tmp', 'control-archivos');
const PUERTO  = 8099;

const fallas = [];
const medido = { pantallas: 0, grillas: 0, bajados: 0, conPantalla: 0,
                 pdfs: 0, pdfsBajados: 0 };
function falla(donde, clase, que){ fallas.push({ donde, clase, que }); }

/* servidor local, igual que el control de pantallas */
const TIPOS = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css',
                '.json':'application/json', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
function servidor(){
  return http.createServer((rq, rs) => {
    let u = decodeURIComponent(rq.url.split('?')[0]);
    if (u === '/') u = '/index.html';
    const f = path.join(RAIZ, u);
    if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){
      rs.writeHead(404); rs.end('no'); return;
    }
    rs.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(rs);
  });
}

async function main(){
  fs.rmSync(SALIDA, { recursive:true, force:true });
  fs.mkdirSync(SALIDA, { recursive:true });

  const srv = servidor();
  await new Promise(r => srv.listen(PUERTO, '127.0.0.1', r));

  /* CONTROL_SOLO existe para probar los senuelos contra UNA pantalla y no
     esperar las quince. El pre-push lo corre sin la variable, o sea entero:
     una puerta que se puede dejar a medias sin que se note no es una puerta. */
  let pantallas = fs.readdirSync(RAIZ).filter(f => f.endsWith('.html')).sort();
  if (process.env.CONTROL_SOLO){
    pantallas = pantallas.filter(f => f.includes(process.env.CONTROL_SOLO));
    console.log('AVISO: corriendo SOLO ' + pantallas.join(', ')
              + ' (CONTROL_SOLO). Esto NO es el control completo.\n');
  }
  const b = await chromium.launch();

  for (const p of pantallas){
    const ctx = await b.newContext({ viewport:{ width:1500, height:950 }, acceptDownloads:true });
    /* POR QUE HAY UNA ESPERA ENTRE GRILLA Y GRILLA — Y QUE NO ERA.  10/11/2026
       En ventas.html, despues de bajar 5 Excel y 5 PDF, el Excel de la grilla
       6 "no bajaba" en 20 s. Clickeada sola, esa misma grilla baja en 100 ms,
       y el boton llegaba a decir "Bajado · 2": el archivo SE ARMABA BIEN.
       Primero crei que era el tope de descargas automaticas en cadena de
       Chrome y le pedi el permiso por CDP. LA LLAMADA FALLO -Protocol error-
       Y AUN ASI LA CORRIDA PASO: o sea que paso por suerte, no por el
       arreglo, y ademas la hipotesis era falsa -si fuera un tope de 10, la
       descarga 12 tampoco habria salido, y salio-.
       Lo que si se sostiene con lo medido: armar un PDF deja el hilo de la
       pagina ocupado, y el Excel de la grilla siguiente queda encolado detras.
       Con 5 PDFs encima se pasaba de los 20 s de espera.
       Asi que: se le da aire a la pagina entre grilla y grilla, y la espera de
       la descarga sube a 45 s. Es mas lento y es deterministico, que es lo
       unico que le sirve a una puerta. */
    const pg = await ctx.newPage();
    /* el juguete tiene que ganarle al CDN: el mismo defecto que el control
       de pantallas tenia el 31/10 y que lo dejaba midiendo contra la base real */
    await pg.route('**/supabase-js@*/**', r => r.fulfill({
      status:200, contentType:'application/javascript', body:'/* cortado: manda el juguete */' }));
    if (fs.existsSync(JUGUETE)) await pg.addInitScript({ path: JUGUETE });

    try {
      await pg.goto('http://127.0.0.1:' + PUERTO + '/' + p + '?f=' + Date.now(), { waitUntil:'load' });
    } catch (e){ await ctx.close(); continue; }
    /* SE ESPERA A QUE LA PANTALLA SE QUEDE QUIETA, NO 2,2 SEGUNDOS.  10/11/2026
       Habia un waitForTimeout(2200) fijo. Una pantalla que tarda mas sigue
       armando grillas mientras este control ya esta clickeando, y como las
       barras se rearman solas (bajarPonerBotones con MutationObserver), el
       boton que agarro queda huerfano: el clic no hace nada y la puerta canta
       "el boton no bajo nada" sin que haya ningun defecto en el panel. Paso
       hoy en ventas.html, y antes de esto ya habia pasado una vez: la nota de
       mas abajo cuenta el mismo sintoma con otra causa.
       Un control que depende de que la pantalla tarde menos que un numero
       escrito a mano no mide el panel: mide la suerte. Ahora se espera a que
       la cantidad de botones no cambie durante 1,2 s, con tope de 30 s. */
    {
      let antes = -1, iguales = 0, vueltas = 0;
      while (vueltas++ < 100){
        const ahora = (await pg.$$('.bajar-btn[data-que="excel"]')).length;
        iguales = (ahora === antes && ahora > 0) ? iguales + 1 : 0;
        antes = ahora;
        if (iguales >= 4) break;              /* 4 x 300 ms = 1,2 s quieta */
        await pg.waitForTimeout(300);
      }
      if (antes === 0) await pg.waitForTimeout(1500);  /* pantalla sin grillas */
    }
    medido.pantallas++;

    /* los botones de Excel de cada grilla. El boton se declara con
       data-que, asi que no hay que adivinarlo por el texto. */
    let botones = await pg.$$('.bajar-btn[data-que="excel"]');
    for (let i = 0; i < botones.length; i++){
      /* LOS BOTONES SE VUELVEN A BUSCAR EN CADA VUELTA.        10/11/2026
         Este control agarraba los botones de Excel UNA SOLA VEZ, antes del
         bucle, y los de PDF los rebuscaba en cada vuelta. Las barras se
         rearman solas (bajarPonerBotones corre con un MutationObserver), asi
         que despues de bajar el PDF de la grilla 5 el botón guardado de la 6
         ya no era el de esa grilla: el clic no hacia nada, sin error de
         consola, y la puerta cantaba "el boton no bajo nada" en ventas.html.
         Medido: el mismo boton, rebuscado, baja en 100 ms. Era defecto DEL
         CONTROL, no del panel — el botón, a mano, siempre funciono. Una
         puerta que grita por lo que no importa entrena a ignorarla. */
      /* aire para que la pagina termine lo de la grilla anterior -el PDF deja
         el hilo ocupado- antes de pedirle el Excel de esta */
      if (i > 0) await pg.waitForTimeout(700);
      botones = await pg.$$('.bajar-btn[data-que="excel"]');
      if (!botones[i]) break;
      medido.grillas++;

      /* LO QUE MUESTRA LA PANTALLA, LEIDO EN CRUDO.
         A proposito NO se usa bajarCelda ni bajarLeerTabla: son el codigo
         que este control tiene que controlar. Si el control midiera con la
         misma funcion que arma el archivo, un defecto de esa funcion
         pasaria de los dos lados y el control diria OK. Esto lee el DOM
         pelado — textContent, data-v, title y la clase — y despues compara
         contra el archivo. Si los dos no dicen lo mismo, ESO es el hallazgo. */
      let vista;
      try {
        vista = await botones[i].evaluate(b => {
          const env = b.closest('.bajar-barra') && b.closest('.bajar-barra').nextElementSibling;
          const t = env && env.querySelector('table');
          if (!t) return null;
          const enc = [...t.querySelectorAll('thead th')]
                        .map(x => (x.textContent || '').trim());
          const filas = [];
          for (const tr of t.querySelectorAll('tbody tr')){
            const tds = [...tr.children];
            if (tds.length === 1 && enc.length > 1) continue;   /* "no hay datos" */
            filas.push(tds.map(td => ({
              texto: (td.textContent || '').trim(),
              dataV: td.hasAttribute('data-v') ? td.getAttribute('data-v') : null,
              title: td.getAttribute('title') || null,
              clase: td.className || ''
            })));
          }
          return { encabezados: enc, filas: filas };
        });
      } catch (e){ vista = null; }

      let dl;
      try {
        const esperar = pg.waitForEvent('download', { timeout: 45000 });
        await botones[i].click();
        dl = await esperar;
      } catch (e){
        falla(p, 'el_boton_no_bajo_nada',
              'aprete el boton de Excel de la grilla ' + (i + 1)
            + ' y no llego ninguna descarga en 20 s: ' + e.message.slice(0,90));
        continue;
      }
      const nombre = dl.suggestedFilename();
      const destino = path.join(SALIDA, p.replace('.html','') + '__' + nombre);
      await dl.saveAs(destino);
      medido.bajados++;

      /* la pantalla, al lado del archivo, para que el verificador compare */
      if (vista){
        fs.writeFileSync(destino.replace(/\.xlsx$/i, '') + '.pantalla.json',
                         JSON.stringify(vista));
        medido.conPantalla++;
      } else {
        falla(p, 'no_pude_leer_la_pantalla',
              'bajo "' + nombre + '" pero no encontre la tabla de ese boton: '
            + 'el archivo quedaria sin contra que compararse, y no medido no es limpio.');
      }

      /* EL TITULO DEL ARCHIVO. El 23/10 la busqueda trepaba el DOM hasta el
         <h1> de la caja de login y los archivos salian llamados
         ingresar-al-panel-dissan.xlsx */
      if (/login|ingresar|^panel-dissan/i.test(nombre))
        falla(p, 'nombre_de_archivo_del_login',
              'el archivo se llama "' + nombre + '": la busqueda del titulo se fue hasta el login.');

      /* ---- Y EL PDF DE LA MISMA GRILLA ----------------------------------
         Hasta el 01/11 esta puerta decia, abajo de todo, "NO midio: el PDF".
         Era verdad y era el agujero mas grande que quedaba: el PDF es el que
         se imprime y se manda, y un numero cortado ahi miente igual que en
         la pantalla (el 23/10 salio "2.638.99..." y la OC 5245 como 5.245).
         Ahora se aprieta tambien el boton de PDF, se guarda el archivo al
         lado, y control/pdf.py lo abre y lee CADA PALABRA CON SU POSICION. */
      const botonesPdf = await pg.$$('.bajar-btn[data-que="pdf"]');
      if (botonesPdf[i]){
        medido.pdfs++;
        try {
          const esperarPdf = pg.waitForEvent('download', { timeout: 45000 });
          await botonesPdf[i].click();
          const dlp = await esperarPdf;
          await dlp.saveAs(destino.replace(/\.xlsx$/i, '') + '.pdf');
          medido.pdfsBajados++;
        } catch (e){
          falla(p, 'el_boton_de_pdf_no_bajo_nada',
                'aprete el boton de PDF de la grilla ' + (i + 1)
              + ' y no llego ninguna descarga en 20 s: ' + e.message.slice(0,90));
        }
      } else {
        falla(p, 'la_grilla_no_tiene_boton_de_pdf',
              'la grilla ' + (i + 1) + ' tiene boton de Excel y no de PDF: la barra se '
            + 'pone sola en toda tabla, asi que si falta uno de los dos hay un defecto '
            + 'en js/bajar.js, no en la pantalla.');
      }
    }

    await ctx.close();
  }

  await b.close();
  srv.close();

  if (!medido.bajados){
    console.log('CONTROL DEL ARCHIVO BAJADO: no se pudo bajar ni un archivo.');
    console.log('  No medido no es limpio: el push se corta.');
    process.exit(1);
  }

  /* ---- la parte que ABRE los archivos ---------------------------------- */
  const py = spawnSync('python3', [path.join(__dirname, 'archivo.py'), SALIDA],
                       { encoding:'utf8' });
  /* y el PDF, que hasta el 01/11 no lo medía nadie */
  const pyPdf = spawnSync('python3', [path.join(__dirname, 'pdf.py'), SALIDA],
                          { encoding:'utf8' });
  const salidaPy = (py.stdout || '') + (py.stderr || '')
                 + '\n' + (pyPdf.stdout || '') + (pyPdf.stderr || '');

  if (fallas.length || py.status !== 0 || pyPdf.status !== 0){
    console.log('CONTROL DEL ARCHIVO BAJADO: ' + fallas.length + ' falla(s) al bajar'
              + (py.status !== 0 ? ' + fallas adentro del Excel' : '')
              + (pyPdf.status !== 0 ? ' + fallas adentro del PDF' : '') + '\n');
    const porClase = {};
    for (const f of fallas) (porClase[f.clase] = porClase[f.clase] || []).push(f);
    for (const c of Object.keys(porClase)){
      console.log('  ' + c.toUpperCase() + ' (' + porClase[c].length + ')');
      for (const f of porClase[c]) console.log('    ' + f.donde + ' :: ' + f.que);
      console.log('');
    }
    if (salidaPy.trim()) console.log(salidaPy.trim());
    console.log('\n  midio: ' + medido.pantallas + ' pantallas · ' + medido.grillas
              + ' botones de Excel y ' + medido.pdfs + ' de PDF apretados · '
              + medido.bajados + ' .xlsx y ' + medido.pdfsBajados
              + ' .pdf bajados y abiertos.');
    process.exit(1);
  }

  console.log('CONTROL DEL ARCHIVO BAJADO: 0 fallas.');
  if (salidaPy.trim()) console.log(salidaPy.trim());
  console.log('  midio: ' + medido.pantallas + ' pantallas · ' + medido.grillas
            + ' botones de Excel y ' + medido.pdfs + ' de PDF apretados · '
            + medido.bajados + ' .xlsx abiertos celda por celda y '
            + medido.pdfsBajados + ' .pdf abiertos palabra por palabra.');
  process.exit(0);
}

main().catch(e => {
  console.error('EL CONTROL DEL ARCHIVO BAJADO NO PUDO CORRER: ' + e.message);
  process.exit(1);
});
