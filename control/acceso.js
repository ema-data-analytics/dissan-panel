/* =====================================================================
   PUEDO PROBARLO O NO: MEDIDO, NO RECORDADO               01/11/2026
   =====================================================================
   POR QUE EXISTE. Esto es la falla de hoy, 01/11, y la peor del dia:

     Le dije al usuario que NO PODIA ENTRAR al panel, y le pedi que
     confirmara cosas en el navegador por su cuenta. El 31/10 habia
     entrado. O sea: afirme algo sobre lo que YO puedo o no puedo hacer,
     de memoria, sin medirlo. Le hice perder una hora.

   Es exactamente la misma falla que publicar una cifra sin verificarla,
   un piso mas arriba: una afirmacion sin medicion. Y las cifras ya
   tienen puerta desde el 01/11 (control/cifra.js). Esta es la de la
   otra clase de afirmacion.

   La regla del 31/10 ya decia "antes de tocar una sola linea, decir si
   voy a poder abrir la pantalla". Era una regla sobre mi conducta, como
   las dieciseis que rompi. Esto la convierte en una puerta.

   QUE MIDE, de verdad, cada vez:
     1. Llego a PostgREST de Supabase? (la base, que es de donde sale
        toda cifra que se controla)
     2. Llego al panel publicado en github.io? (sin esto no se puede
        verificar que lo publicado sea lo que se subio)
     3. Tengo el Chrome del usuario, y tengo el puente a su maquina?
        ESTO NO LO PUEDE MEDIR UN SCRIPT: son herramientas de mi lado,
        no del contenedor. Asi que se exige el archivo
        control/acceso-medido.json, escrito EN ESTA SESION, con lo que
        dieron esas dos llamadas. Si no esta, o esta viejo, SE CORTA.

   POR QUE ESO ES UNA PUERTA Y NO UNA PROMESA: no puedo entregar nada
   sin que exista un registro fechado de lo que puedo y no puedo probar.
   La puerta no me obliga a ser sincero — me obliga a haber MIRADO. Y lo
   que me hizo mentirle hoy no fue mala fe: fue no haber mirado.

   LO QUE NO CUBRE, declarado: el archivo lo escribo yo. Un script no
   puede verificar que el Chrome este conectado. Lo que si verifica es
   que la medicion EXISTA y sea de esta sesion, y que las dos vias que
   SI se pueden medir desde aca esten medidas de verdad, ahora mismo.
   ===================================================================== */

if (!process.env.NODE_USE_ENV_PROXY && process.env.HTTPS_PROXY) {
  const r = require('child_process').spawnSync(process.execPath, [__filename], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' })
  });
  process.exit(r.status === null ? 1 : r.status);
}

require('./enchufar').enchufar();   /* la puerta se enchufa sola */

const fs   = require('fs');
const path = require('path');

const BASE   = 'https://hwgfmpvszdohnzqtwscw.supabase.co';
const KEY    = 'sb_publishable_7CfYchCqBdDnXJ63IblnTw_cjFCjvUl';
const PANEL  = 'https://ema-data-analytics.github.io/dissan-panel/index.html';
const MEDIDO = path.join(__dirname, 'acceso-medido.json');
/* Doce horas: una jornada. Mas que eso ya es "lo medi ayer", que es
   justamente lo que no vale. */
const HORAS_QUE_VALE = 12;

const fallas = [];
const vias   = [];

async function probar(nombre, url, opciones){
  const t = Date.now();
  try {
    const r = await fetch(url, Object.assign({ method: 'GET' }, opciones || {}));
    vias.push({ via: nombre, http: r.status, ms: Date.now() - t, llega: true });
    return r.status;
  } catch (e){
    vias.push({ via: nombre, http: null, ms: Date.now() - t, llega: false,
                error: e.message.slice(0, 110) });
    return null;
  }
}

async function main(){
  /* ---- 1 y 2: las dos vias que SI se miden desde aca ------------------ */
  const sb = await probar('la base (PostgREST)', BASE + '/rest/v1/',
                          { headers: { apikey: KEY } });
  const gh = await probar('el panel publicado (github.io)',
                          PANEL + '?acceso=' + Date.now(),
                          { headers: { 'Cache-Control': 'no-store' } });

  if (sb === null)
    fallas.push('NO llego a la base. Sin eso no se puede controlar NINGUNA '
              + 'cifra: el control de cifras publicadas y el de rotulos miden '
              + 'contra la base. Hay que habilitar *.supabase.co en el proxy '
              + 'de la sesion (claude.ai -> Settings -> Capabilities).');
  if (gh === null)
    fallas.push('NO llego al panel publicado. Sin eso no se puede verificar '
              + 'que lo que sirve github.io sea lo que se subio — que es el '
              + 'defecto del 14/10 (publique en la implementacion equivocada '
              + 'y el panel siguio sirviendo codigo de nueve dias antes). '
              + 'Hay que habilitar github.io en el proxy de la sesion.');

  /* ---- 3: lo que un script NO puede medir, y por eso se exige ---------- */
  let m = null;
  try {
    m = JSON.parse(fs.readFileSync(MEDIDO, 'utf8'));
  } catch (e){
    fallas.push('NO existe control/acceso-medido.json. Esa es la medicion de '
              + 'si tengo el Chrome del usuario y el puente a su maquina, y un '
              + 'script no la puede hacer solo: son herramientas de mi lado. '
              + 'Hay que llamar a list_connected_browsers / tabs_context y a '
              + 'get_device_info, y escribir lo que dieron, ANTES de entregar '
              + 'nada. Es la falla del 01/11: le dije que no podia entrar sin '
              + 'haber mirado.');
  }

  if (m){
    const faltan = ['cuando','navegador','puente','pantalla_leida']
                     .filter(k => m[k] === undefined || m[k] === null);
    if (faltan.length)
      fallas.push('control/acceso-medido.json esta incompleto: le faltan '
                + faltan.join(', ') + '. Una medicion a medias no es una medicion.');

    const t = Date.parse(m.cuando || '');
    if (isNaN(t)){
      fallas.push('control/acceso-medido.json no tiene una fecha valida en '
                + '"cuando". Sin fecha no se puede saber si es de esta sesion.');
    } else {
      const horas = (Date.now() - t) / 3600000;
      if (horas > HORAS_QUE_VALE)
        fallas.push('control/acceso-medido.json tiene ' + horas.toFixed(1)
                  + ' horas (el tope es ' + HORAS_QUE_VALE + '). Una medicion '
                  + 'vieja no es una medicion: el Chrome se desconecta, el '
                  + 'puente se cae. Hay que volver a medir.');
      if (horas < -0.2)
        fallas.push('control/acceso-medido.json esta fechado en el futuro '
                  + '(' + m.cuando + '). Eso no se mide: se escribe a mano.');
    }
  }

  /* ---- el veredicto --------------------------------------------------- */
  console.log('CONTROL DE ACCESO — QUE PUEDO PROBAR HOY');
  for (const v of vias)
    console.log('  ' + (v.llega ? 'LLEGA   ' : 'NO LLEGA')
              + '  ' + v.via + (v.llega ? '  (HTTP ' + v.http + ', ' + v.ms + ' ms)'
                                        : '  — ' + (v.error || '')));
  if (m){
    const si = x => (x === true || x === 'si' || x === 'SI') ? 'SI' : 'NO';
    console.log('  ' + (si(m.navegador) === 'SI' ? 'TENGO   ' : 'NO TENGO')
              + '  el Chrome del usuario'
              + (m.navegador_detalle ? '  — ' + String(m.navegador_detalle).slice(0,90) : ''));
    console.log('  ' + (si(m.puente) === 'SI' ? 'TENGO   ' : 'NO TENGO')
              + '  el puente a su computadora'
              + (m.puente_detalle ? '  — ' + String(m.puente_detalle).slice(0,90) : ''));
    console.log('  LEI EN PANTALLA: ' + String(m.pantalla_leida).slice(0, 140));
    console.log('  medido el ' + m.cuando);
  }

  if (fallas.length){
    console.log('\nCONTROL DE ACCESO: ' + fallas.length + ' falla(s)\n');
    for (const f of fallas) console.log('  - ' + f);
    console.log('\n  No medido no es limpio: el push se corta.');
    process.exit(1);
  }

  console.log('\nCONTROL DE ACCESO: 0 fallas.');
  console.log('  midio: las dos vias de red AHORA MISMO, y exigio la medicion '
            + 'del navegador y del puente, fechada en esta sesion.');
  process.exit(0);
}

main().catch(e => {
  console.error('EL CONTROL DE ACCESO NO PUDO CORRER: ' + e.message);
  process.exit(1);
});
