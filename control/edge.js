/* =====================================================================
   CONTROL DE LAS EDGE FUNCTIONS — corre antes de cada push   31/10/2026
   =====================================================================
   POR QUE EXISTE. Cuatro veces el arreglo existio y NO ESTABA DONDE TENIA
   QUE ESTAR, y ninguna de las cuatro la agarro un control:

     21/10  Un push anuncio el arreglo del kardex y no lo llevaba adentro.
            El script de parcheo aborto en un assert y el `git commit &&
            git push` de la misma linea salio igual.
     28/10  El arreglo de costo quedo escrito en el archivo local y sin
            desplegar toda la manana. El circuito cobro US$ 1,0566 por la
            pregunta del usuario mientras el arreglo ya existia.
     30/10  Desplegue la Edge Function `listas` con la palabra PLACEHOLDER
            en vez del contenido del archivo. Quedo rota ~2 minutos.
     31/10  Hice lo mismo con `excel`, CON LA REGLA DEL DIA ANTERIOR YA
            ESCRITA. Lo que me la hizo ver fue la regla, no el deploy.

   ACTIVE no quiere decir que adentro haya codigo. Y una regla escrita no
   frena nada: la del 30/10 se rompio el 31/10.

   QUE MIDE, y por que asi. La API de despliegues de Supabase no se puede
   alcanzar desde este contenedor (el proxy la rechaza), asi que el control
   no pregunta "cuando se desplego". Mide lo que si puede medir y es lo que
   fallo de verdad:

     1. Todo edge/<slug>/index.ts tiene que tener su fila de verificacion
        en la base. Sin fila: no verificada. Y no verificada NO es limpia.
     2. El sha256 del archivo local tiene que ser el mismo que se verifico.
        Si cambie el archivo y no desplegue + verifique, no coincide y se
        corta. Ese es el defecto del 28/10, el que costo plata.
     3. El veredicto que calcula la base (marcador adentro, cuerpo de menos
        de 1.000 bytes, marcas faltantes, humo que no contesta) tiene que
        decir PASA.
     4. Y el archivo local tiene que tener `Deno.serve` y NO tener ningun
        marcador de texto. Esto se mide aca, sin red.

   COMO SE ASIENTA UNA VERIFICACION. Despues de cada deploy se LEE el
   cuerpo vivo y se escribe una fila en public.edge_verificada con el
   sha del archivo local, los bytes del cuerpo vivo, si tiene marcador y
   que marcas se le pidieron. Sin esa fila, este control corta.
   ===================================================================== */

/* EL CONTROL TIENE QUE PODER LLEGAR A LA BASE.                 31/10/2026
   El fetch de Node NO usa el proxy del contenedor por defecto: daba
   "fetch failed" y el control cortaba por no poder medir, que es correcto
   pero inutil. Con NODE_USE_ENV_PROXY=1 llega. Se relanza con la variable
   puesta en vez de pedirle a nadie que la exporte: una puerta que depende
   de que alguien se acuerde de algo no es una puerta. */
if (!process.env.NODE_USE_ENV_PROXY && process.env.HTTPS_PROXY) {
  const r = require('child_process').spawnSync(process.execPath, [__filename], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' })
  });
  process.exit(r.status === null ? 1 : r.status);
}

const fs   = require('fs');
const path = require('path');
const cry  = require('crypto');

const RAIZ  = path.join(__dirname, '..');
const EDGE  = path.join(RAIZ, 'edge');
const BASE  = 'https://hwgfmpvszdohnzqtwscw.supabase.co';
/* la publishable esta hecha para estar a la vista: lo que protege los datos
   es Auth + RLS. La service_role NUNCA entra al repo. */
const KEY   = 'sb_publishable_7CfYchCqBdDnXJ63IblnTw_cjFCjvUl';

/* marcadores que NO pueden estar en el codigo de una funcion desplegada.
   Son los que me desplegue de verdad el 30/10 y el 31/10. */
const MARCADORES = ['PLACEHOLDER', '__LEER_DEL_ARCHIVO__', 'TODO:', 'FIXME', 'XXX:'];

const fallas = [];
const medido = { locales: 0, verificadas: 0, marcas: 0 };
function falla(slug, clase, que){ fallas.push({ slug, clase, que }); }

function sha(f){ return cry.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); }

async function veredictos(){
  const r = await fetch(BASE + '/rest/v1/rpc/api_control_edge', {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: '{}'
  });
  if (!r.ok) throw new Error('la base contesto HTTP ' + r.status + ': ' + (await r.text()).slice(0,200));
  return await r.json();
}

async function main(){
  if (!fs.existsSync(EDGE)){
    console.log('CONTROL DE EDGE FUNCTIONS: no existe la carpeta edge/. Nada que controlar.');
    process.exit(0);
  }

  const slugs = fs.readdirSync(EDGE, { withFileTypes:true })
                  .filter(d => d.isDirectory())
                  .filter(d => fs.existsSync(path.join(EDGE, d.name, 'index.ts')))
                  .map(d => d.name).sort();

  if (!slugs.length){
    console.log('CONTROL DE EDGE FUNCTIONS: no hay ningun edge/<slug>/index.ts. Nada que controlar.');
    process.exit(0);
  }

  /* ---- 4. lo que se mide sin red: marcadores y Deno.serve ------------- */
  const shaDe = {};
  for (const s of slugs){
    const f = path.join(EDGE, s, 'index.ts');
    const txt = fs.readFileSync(f, 'utf8');
    shaDe[s] = sha(f);
    medido.locales++;

    if (!/Deno\.serve/.test(txt))
      falla(s, 'sin_deno_serve', 'el archivo local no tiene Deno.serve: no es una Edge Function.');
    for (const m of MARCADORES)
      if (txt.includes(m))
        falla(s, 'marcador_en_el_codigo',
              'el archivo local tiene "' + m + '" adentro. Eso es lo que desplegue el 30/10 y el 31/10.');
    if (txt.length < 1000)
      falla(s, 'archivo_muy_corto', 'el archivo local tiene ' + txt.length + ' bytes. No es codigo.');
  }

  /* ---- 1 a 3: contra lo verificado en la base ------------------------- */
  let filas;
  try { filas = await veredictos(); }
  catch (e){
    /* Si no se puede leer la base, el control NO dice "limpio": dice que no
       pudo medir, y corta. No medido no es limpio. */
    console.log('CONTROL DE EDGE FUNCTIONS: NO PUDO MEDIR.');
    console.log('  ' + e.message);
    console.log('  No medido no es limpio: el push se corta.');
    process.exit(1);
  }

  const porSlug = {};
  for (const f of filas) porSlug[f.slug] = f;

  for (const s of slugs){
    const v = porSlug[s];
    if (!v){
      falla(s, 'sin_verificar',
            'no tiene ninguna fila en edge_verificada. Se desplego sin leer lo que quedo vivo, '
          + 'o nunca se verifico. No verificada no es limpia.');
      continue;
    }
    medido.verificadas++;
    if (v.veredicto !== 'PASA'){ falla(s, 'veredicto_de_la_base', v.veredicto); continue; }
    if (v.sha_local !== shaDe[s]){
      falla(s, 'local_no_es_lo_desplegado',
            'el archivo local cambio despues de la ultima verificacion ('
          + v.verificado_en.slice(0,16).replace('T',' ') + '). El arreglo esta escrito y no desplegado: '
          + 'es el defecto del 28/10, que costo US$ 1,0566.');
      continue;
    }
    medido.marcas++;
  }

  /* las que estan verificadas y no tienen archivo local: aviso, no falla.
     Son las 10 que todavia no se bajaron del servidor. */
  const sinLocal = filas.map(f => f.slug).filter(s => !slugs.includes(s));

  if (!fallas.length){
    console.log('CONTROL DE EDGE FUNCTIONS: ' + slugs.length + ' funcion(es), 0 fallas.');
    console.log('  midio: ' + medido.locales + ' archivos locales sin marcadores y con Deno.serve · '
              + medido.verificadas + ' con su verificacion asentada en la base · '
              + medido.marcas + ' con el sha local igual al verificado.');
    if (sinLocal.length)
      console.log('  AVISO: ' + sinLocal.length + ' funcion(es) verificadas sin fuente en el repo: '
                + sinLocal.join(', '));
    process.exit(0);
  }

  console.log('CONTROL DE EDGE FUNCTIONS: ' + fallas.length + ' falla(s)\n');
  const porClase = {};
  for (const f of fallas) (porClase[f.clase] = porClase[f.clase] || []).push(f);
  for (const c of Object.keys(porClase)){
    console.log('  ' + c.toUpperCase() + ' (' + porClase[c].length + ')');
    for (const f of porClase[c]) console.log('    ' + f.slug + ' :: ' + f.que);
    console.log('');
  }
  console.log('  midio: ' + medido.locales + ' archivos locales · '
            + medido.verificadas + ' con verificacion en la base.');
  process.exit(1);
}

main().catch(e => {
  console.error('EL CONTROL DE EDGE FUNCTIONS NO PUDO CORRER: ' + e.message);
  process.exit(1);
});
