/* =====================================================================
   EL ROTULO SALE DE LA MISMA FUENTE QUE LA DECISION         01/11/2026
   =====================================================================
   POR QUE EXISTE. Tres veces entregue una pantalla donde el cartel decia
   una cosa y la decision la tomaba otra fuente. Las tres veces el cartel
   era la parte que el usuario leia:

     21/10  El desplegable de Seguridad ofrecia el rol «Usuario», que el
            servidor rechaza con «Rol invalido», y NO ofrecia «operador»,
            que es el rol real del usuario de DISSAN: editarle el perfil
            LE CAMBIABA EL ROL SIN QUERER.
     31/10  El rotulo decia «se espera un PDF» y la Edge Function ya leia
            los dos formatos. Ese cartel fue justo el que hizo pensar que
            el archivo no servia. Arreglar el motor y dejar el cartel
            viejo es no haber arreglado nada.
     31/10  El portero fallaba ABIERTO sin data-modulo. Una pantalla que
            dice quien la ve con un texto escrito a mano tiene el mismo
            problema: ese texto no lo lee nadie.

   COMO LO MIDE. Abre cada pantalla de verdad, lee del DOM lo que la
   pantalla DICE —los valores de cada desplegable, las frases que hablan
   de quien ve, el rotulo de cada control de archivo— y se lo manda a
   public.api_control_rotulos, que devuelve UNA FILA POR DISCREPANCIA
   contra modulos.roles. Cero filas = pasa.

   EL CONTROL NO SABE QUE ES UN ROL, A PROPOSITO. No tiene ninguna lista
   de ids ni de nombres: manda todos los desplegables y todas las frases,
   y la base decide cual es de roles y que roles nombra. Una lista escrita
   a mano adentro de un control se queda corta o se pasa, y no avisa — el
   mismo 01/11 una lista mia de nombres de columna dio 12 fallas falsas.
   ===================================================================== */

if (!process.env.NODE_USE_ENV_PROXY && process.env.HTTPS_PROXY) {
  const r = require('child_process').spawnSync(process.execPath, [__filename], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' })
  });
  process.exit(r.status === null ? 1 : r.status);
}

const fs    = require('fs');
const path  = require('path');
const http  = require('http');
const { chromium } = require('playwright');

const RAIZ    = path.join(__dirname, '..');
const JUGUETE = path.join(__dirname, 'supabase-de-juguete.js');
const EDGE    = path.join(RAIZ, 'edge');
const PUERTO  = 8096;
const BASE    = 'https://hwgfmpvszdohnzqtwscw.supabase.co';
/* la publishable esta hecha para estar a la vista. La service_role NUNCA
   entra al repo. Y api_control_rotulos no devuelve el mapa de modulos y
   roles: solo confirma o desmiente lo que el repositorio ya dice en voz
   alta, asi que no hay nada que filtrar. */
const KEY     = 'sb_publishable_7CfYchCqBdDnXJ63IblnTw_cjFCjvUl';

const fallas = [];
const medido = { pantallas:0, selects:0, opciones:0, frases:0, archivos:0, modulos:0 };
function falla(clase, donde, detalle){ fallas.push({ clase, donde, detalle }); }

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

/* ---- LOS FORMATOS: el rotulo, el accept y la Edge Function ----------
   Esto se mide sin base. El rotulo de un control de archivo nombra
   extensiones; el atributo accept dice las que el navegador deja elegir;
   y la Edge Function que lo recibe dice las que de verdad sabe leer. Las
   tres listas tienen que decir lo mismo. */
/* SE COMPARAN FAMILIAS, NO EXTENSIONES.                         01/11
   La primera version buscaba ".pdf" con el punto, y el rotulo de listas
   dice «Se sube el PDF o el Excel», en palabras: marco una falla donde el
   cartel estaba bien. Lo que el usuario lee es la FAMILIA, no la
   extension, asi que es lo que hay que comparar. Lo que el accept le deja
   elegir, en cambio, si son extensiones, y eso se mide aparte contra la
   funcion — ahi un .xls no es «Excel», es un formato que el motor no
   sabe leer. */
const FAMILIA = { pdf:'PDF', xlsx:'Excel', xlsm:'Excel', xls:'Excel',
                  excel:'Excel', csv:'CSV', txt:'texto', doc:'Word',
                  docx:'Word', json:'JSON', zip:'zip' };
function extensionesDe(txt){
  const out = new Set();
  const re = /\.(pdf|xlsx|xlsm|xls|csv|txt|docx?|json|zip)\b/gi;
  let m; while ((m = re.exec(txt || ''))) out.add('.' + m[1].toLowerCase());
  return [...out].sort();
}
function familiasDe(txt){
  const out = new Set();
  const re = /\b\.?(pdf|xlsx|xlsm|xls|excel|csv|docx?|json)\b/gi;
  let m; while ((m = re.exec(txt || ''))) out.add(FAMILIA[m[1].toLowerCase()]);
  return [...out].filter(Boolean).sort();
}
function extensionesDeLaFuncion(slug){
  const f = path.join(EDGE, slug, 'index.ts');
  if (!fs.existsSync(f)) return null;
  return extensionesDe(fs.readFileSync(f, 'utf8'));
}
function familiasDeLaFuncion(slug){
  const f = path.join(EDGE, slug, 'index.ts');
  if (!fs.existsSync(f)) return null;
  return familiasDe(fs.readFileSync(f, 'utf8'));
}

/* ---- LO QUE DICE EL ARCHIVO, ADEMAS DE LO QUE DICE LA PANTALLA ------
   01/11: la primera version solo leia el DOM ya cargado, y se perdio los
   dos defectos que yo habia medido a mano. Dos razones, las dos de fondo:

   1. EL PORTERO TAPA LAS PANTALLAS QUE EL JUGUETE NO HABILITA
      (seguridad, listas, cartera): vacia #contenido entero, asi que sus
      textos y sus desplegables no existen para el control.
   2. Y SOBRE TODO: lo que esta cableado en el HTML es EL CAMINO DE LA
      FALLA. js/seguridad.js rellena el desplegable con api_roles_v2(),
      pero si la base no contesta hace `return` y deja las opciones del
      HTML — que incluyen «usuario», el rol que el servidor rechaza, y NO
      incluyen «operador». O sea que falla ABIERTA al defecto del 21/10,
      igual que el portero sin data-modulo del 31/10. El DOM cargado
      muestra el camino feliz; el archivo muestra el otro.

   Por eso se miden los dos, y cada falla dice de donde salio. */
function delArchivo(p){
  const txt = fs.readFileSync(path.join(RAIZ, p), 'utf8');
  const out = { selects: [], frases: [], modulo: '', archivos: [] };

  const mm = /id="app"[^>]*data-modulo="([^"]*)"/.exec(txt)
          || /data-modulo="([^"]*)"[^>]*id="app"/.exec(txt);
  out.modulo = mm ? mm[1] : '';

  const reSel = /<select\b([^>]*)>([\s\S]*?)<\/select>/gi;
  let m;
  while ((m = reSel.exec(txt))){
    const id = (/id="([^"]*)"/.exec(m[1]) || [, ''])[1];
    const vals = [];
    const reOpt = /<option\b[^>]*\bvalue="([^"]*)"/gi;
    let o; while ((o = reOpt.exec(m[2]))) if (o[1] !== '') vals.push(o[1]);
    /* EL ROTULO DEL DESPLEGABLE, que es como la pantalla declara de que es.
       Sin esto, un desplegable con TODOS los valores malos no se reconocia
       como de roles y pasaba limpio: lo encontro el senuelo del 01/11, no
       yo. Es el mismo principio que la clase ...-cod de las celdas: la
       declaracion ya esta escrita en el marcado, el control no la adivina. */
    const antes = txt.slice(Math.max(0, m.index - 300), m.index);
    const lab = [...antes.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/gi)].pop();
    const rotulo = lab ? lab[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
    if (vals.length) out.selects.push({ id, valores: vals, rotulo });
  }

  /* el texto del archivo, sin etiquetas ni script ni style */
  const plano = txt
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&mdash;|&ndash;/g, '—')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ');
  for (const fr of plano.split(/(?<=[.:;])\s+|—/)){
    if (fr.length > 240 || fr.length < 12) continue;
    if (/\b(solo|s[oó]lo|[uú]nicamente|visible|ve|ven|acceso|accede|permiso)\b/i.test(fr)
        && /\brol(es)?\b/i.test(fr))
      out.frases.push(fr.trim());
  }

  const reFile = /<input\b[^>]*type="file"[^>]*>/gi;
  while ((m = reFile.exec(txt))){
    const id = (/id="([^"]*)"/.exec(m[0]) || [, ''])[1];
    const accept = (/accept="([^"]*)"/.exec(m[0]) || [, ''])[1];
    /* EL ROTULO ES TODO LO QUE LA PANTALLA LE DICE AL USUARIO.   01/11
       La primera version miraba una ventana de 900 caracteres antes del
       control. Despues le agregue un comentario de seis lineas al HTML, el
       texto que anuncia los formatos quedo fuera de la ventana, y el
       control dijo que el rotulo «no nombra nada» cuando estaba escrito
       arriba. Otro numero escrito a mano adentro del control.
       La pregunta de verdad es si LA PANTALLA se lo dice al usuario, y el
       usuario lee la pagina, no una ventana. Limite declarado: con dos
       controles de archivo de formatos distintos en la misma pantalla esto
       los confundiria. Hoy hay uno en todo el panel. */
    out.archivos.push({ id, accept, rotulo: plano });
  }
  return out;
}

const claims = { selects: [], frases: [], modulos: [] };
const vistos = new Set();

/* junta lo que dice UNA fuente (la pantalla cargada o el archivo) y mide
   ahi mismo lo que no necesita la base: los formatos. */
function juntar(p, leido, origen){
  const marca = x => { if (vistos.has(x)) return false; vistos.add(x); return true; };

  for (const s of leido.selects){
    if (!s.valores.length) continue;
    if (!marca('s|' + p + '|' + s.id + '|' + s.valores.join(',') + '|' + (s.rotulo||''))) continue;
    medido.selects++; medido.opciones += s.valores.length;
    claims.selects.push({ archivo: p + ' (' + origen + ')', id: s.id,
                          rotulo: s.rotulo || '', valores: s.valores });
  }
  for (const fr of leido.frases){
    if (!marca('f|' + p + '|' + fr)) continue;
    medido.frases++;
    claims.frases.push({ archivo: p + ' (' + origen + ')',
                         modulo: leido.modulo, frase: fr });
  }
  if (leido.modulo && marca('m|' + p + '|' + leido.modulo)){
    medido.modulos++;
    claims.modulos.push({ archivo: p, modulo: leido.modulo });
  }

  for (const a of leido.archivos){
    if (!marca('a|' + p + '|' + a.id + '|' + a.accept)) continue;
    medido.archivos++;
    /* 1. el rotulo tiene que anunciar todas las familias que el accept deja
          elegir. Si el accept deja elegir un Excel y el cartel habla solo de
          un PDF, el cartel manda al usuario a la pared: eso fue el 31/10. */
    const famRotulo = familiasDe(a.rotulo);
    const famAccept = familiasDe(a.accept);
    const noAnunciadas = famAccept.filter(x => !famRotulo.includes(x));
    if (famAccept.length && noAnunciadas.length){
      falla('el_rotulo_no_anuncia_un_formato_que_el_accept_deja_elegir',
            p + ' :: input#' + (a.id || '(sin id)') + ' (' + origen + ')',
            'el accept deja elegir ' + noAnunciadas.join(' ') + ' y el rotulo no lo '
          + 'nombra (dice ' + (famRotulo.join(' ') || 'nada') + '). El 31/10 el '
          + 'rotulo decia «se espera un PDF» mientras la funcion ya leia los dos '
          + 'formatos, y ese cartel fue el que hizo pensar que el archivo no servia.');
    }
    /* 2. y el accept no puede dejar elegir un formato que el motor no lee.
          Aca si son extensiones: un .xls no es «Excel» para el motor. */
    const slug = (p.replace('.html','') || '').toLowerCase();
    const delAccept = extensionesDe(a.accept);
    const delaFn = extensionesDeLaFuncion(slug);
    if (delaFn && delAccept.length && delaFn.length){
      const faltan = delAccept.filter(x => !delaFn.includes(x));
      if (faltan.length)
        falla('el_accept_deja_elegir_un_formato_que_la_funcion_no_lee',
              p + ' :: input#' + (a.id || '(sin id)') + ' (' + origen + ')',
              'el accept deja elegir ' + faltan.join(' ') + ' y edge/' + slug
            + '/index.ts no los nombra. El usuario puede elegir un archivo que el '
            + 'motor no sabe leer.');
    }
  }
}

async function main(){
  const srv = servidor();
  await new Promise(r => srv.listen(PUERTO, '127.0.0.1', r));

  const pantallas = fs.readdirSync(RAIZ).filter(f => f.endsWith('.html')).sort();
  const b = await chromium.launch();

  /* primero el archivo: es el camino de la falla y no necesita navegador */
  for (const p of pantallas){
    try { juntar(p, delArchivo(p), 'el archivo'); }
    catch (e){ falla('no_pude_leer_el_archivo', p, e.message); }
  }

  for (const p of pantallas){
    const ctx = await b.newContext({ viewport:{ width:1500, height:950 } });
    const pg  = await ctx.newPage();
    await pg.route('**/supabase-js@*/**', r => r.fulfill({ status:200,
      contentType:'application/javascript', body:'/* cortado: manda el juguete */' }));
    if (fs.existsSync(JUGUETE)) await pg.addInitScript({ path: JUGUETE });
    try {
      await pg.goto('http://127.0.0.1:' + PUERTO + '/' + p + '?f=' + Date.now(),
                    { waitUntil:'load' });
    } catch (e){ await ctx.close(); continue; }
    await pg.waitForTimeout(2200);
    medido.pantallas++;

    const leido = await pg.evaluate(() => {
      const out = { selects: [], frases: [], modulo: null, archivos: [] };

      const app = document.getElementById('app');
      out.modulo = app ? (app.getAttribute('data-modulo') || '') : '';

      for (const s of document.querySelectorAll('select')){
        let rot = '';
        if (s.id){
          const l = document.querySelector('label[for="' + s.id + '"]');
          if (l) rot = (l.textContent || '').trim();
        }
        if (!rot){
          let n = s.previousElementSibling;
          while (n && n.tagName !== 'LABEL') n = n.previousElementSibling;
          if (n) rot = (n.textContent || '').trim();
        }
        if (!rot && s.closest('label')) rot = (s.closest('label').textContent || '').trim();
        out.selects.push({ id: s.id || '', rotulo: rot.slice(0, 80),
                           valores: [...s.options].map(o => o.value).filter(v => v !== '') });
      }

      /* LAS FRASES QUE HABLAN DE QUIEN VE. No se buscan por nombre de rol
         —eso lo decide la base— sino por el verbo: una oracion que habla
         de ver, acceder o de permisos. */
      const txt = (document.body.innerText || '').replace(/\s+/g, ' ');
      for (const fr of txt.split(/(?<=[.:;])\s+|—/)){
        if (fr.length > 240 || fr.length < 12) continue;
        if (/\b(solo|s[oó]lo|[uú]nicamente|visible|ve|ven|acceso|accede|permiso)\b/i.test(fr)
            && /\brol(es)?\b/i.test(fr))
          out.frases.push(fr.trim());
      }

      /* EL ROTULO DE UN CONTROL DE ARCHIVO contra su accept */
      /* el rotulo es TODO lo que la pantalla le dice al usuario: el usuario
         lee la pagina, no una ventana de caracteres alrededor del control */
      for (const inp of document.querySelectorAll('input[type="file"]')){
        out.archivos.push({ id: inp.id || '',
                            accept: inp.getAttribute('accept') || '',
                            rotulo: txt });
      }
      return out;
    });

    juntar(p, leido, 'la pantalla');
    await ctx.close();
  }

  await b.close();
  srv.close();

  if (!medido.pantallas){
    console.log('CONTROL DE ROTULOS: no se pudo abrir ni una pantalla.');
    console.log('  No medido no es limpio: el push se corta.');
    process.exit(1);
  }

  /* ---- lo que la base dice de esas afirmaciones ---------------------- */
  let filas;
  try {
    const r = await fetch(BASE + '/rest/v1/rpc/api_control_rotulos', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_claims: claims })
    });
    if (!r.ok) throw new Error('HTTP ' + r.status + ': ' + (await r.text()).slice(0,200));
    filas = await r.json();
  } catch (e){
    console.log('CONTROL DE ROTULOS: NO PUDO MEDIR.');
    console.log('  ' + e.message);
    console.log('  No medido no es limpio: el push se corta.');
    process.exit(1);
  }

  for (const f of filas) falla(f.clase, f.donde, f.detalle);

  const pie = '  midio: ' + medido.pantallas + ' pantallas abiertas · '
            + medido.selects + ' desplegables con ' + medido.opciones + ' opciones · '
            + medido.frases + ' frases que hablan de quien ve · '
            + medido.modulos + ' pantallas que declaran su modulo · '
            + medido.archivos + ' controles de archivo con su rotulo y su accept.';

  if (!fallas.length){
    console.log('CONTROL DE ROTULOS: 0 fallas.');
    console.log(pie);
    process.exit(0);
  }

  console.log('CONTROL DE ROTULOS: ' + fallas.length + ' falla(s)\n');
  const porClase = {};
  for (const f of fallas) (porClase[f.clase] = porClase[f.clase] || []).push(f);
  for (const c of Object.keys(porClase)){
    console.log('  ' + c.toUpperCase() + ' (' + porClase[c].length + ')');
    for (const f of porClase[c]) console.log('    ' + f.donde + '\n      ' + f.detalle);
    console.log('');
  }
  console.log(pie);
  process.exit(1);
}

main().catch(e => {
  console.error('EL CONTROL DE ROTULOS NO PUDO CORRER: ' + e.message);
  process.exit(1);
});
