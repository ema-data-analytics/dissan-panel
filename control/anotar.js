#!/usr/bin/env node
/* =====================================================================
   EL ESCRIBIENTE DE LAS PUERTAS                            01/11/2026
   =====================================================================
   POR QUE EXISTE. Pedido textual del usuario el 01/11:

     "QUE SI TE PREGUNTO, LO PROBASTE, FUNCIONA, LO PROBAS FUNCIONA,
      CUANDO TE VUELVA A PREGUNTAR, ME CONTESTES AL INSTANTE, SI ESTA
      PROBADO, FUNCIONA, NO ME MIENTAS MAS"

   Hasta hoy la respuesta a "lo probaste?" salia de mi memoria, y mi
   memoria se reinicia cada sesion: por eso contestaba "deberia andar",
   que es la frase que el tiene prohibida desde el 31/10. Esto escribe el
   veredicto de cada puerta en ema.control_corrida, con la hora, el
   commit y la rama. La respuesta deja de ser un recuerdo y pasa a ser
   una consulta: api_estado_del_sistema().

   DONDE SE LLAMA. En el `correr` del .githooks/pre-push, UNA sola vez,
   para las siete puertas. A proposito NO adentro de cada control: una
   lista de llamadas repartidas en siete archivos se queda corta en
   cuanto aparezca la octava puerta, y nadie se entera. Es la misma
   razon por la que bajar.js le pone la barra a TODA tabla en vez de
   tener una lista de tablas escrita a mano (23/10).

   LO QUE NO HACE, declarado: no frena nada. Si la base no contesta, lo
   dice y sale con 0 — un escribiente caido no puede cortar un push que
   las puertas ya aprobaron. Lo que no puede pasar es que una puerta
   corra y no quede anotada, y eso se ve en api_estado_del_sistema: si
   falta, sale en rojo como "NUNCA SE MIDIO".
   ===================================================================== */

if (!process.env.NODE_USE_ENV_PROXY && process.env.HTTPS_PROXY) {
  const r = require('child_process').spawnSync(process.execPath, [__filename, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' })
  });
  process.exit(r.status === null ? 0 : r.status);
}

const { execSync } = require('child_process');
const path = require('path');

const BASE = 'https://hwgfmpvszdohnzqtwscw.supabase.co';
/* la publishable esta hecha para estar a la vista. La service_role NUNCA
   entra al repo. */
const KEY  = 'sb_publishable_7CfYchCqBdDnXJ63IblnTw_cjFCjvUl';

/* anotar.js "<control>" <ok:0|1> "<que midio>" "<detalle>" */
const control  = String(process.argv[2] || '').trim();
const ok       = String(process.argv[3] || '') === '1';
const queMidio = String(process.argv[4] || '').trim().slice(0, 600);
const detalle  = String(process.argv[5] || '').trim().slice(0, 2000);

if (!control) {
  console.log('  (no se anoto: falta el nombre del control)');
  process.exit(0);
}

function git(cmd){
  try {
    return execSync('git ' + cmd, { cwd: path.join(__dirname, '..'),
                                    stdio: ['ignore','pipe','ignore'] })
             .toString().trim();
  } catch (e){ return null; }
}

(async () => {
  try {
    const r = await fetch(BASE + '/rest/v1/rpc/api_control_anotar', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_control:   control,
        p_ok:        ok,
        p_que_midio: queMidio || null,
        p_detalle:   detalle  || null,
        p_commit:    git('rev-parse --short HEAD'),
        p_rama:      git('rev-parse --abbrev-ref HEAD')
      })
    });
    if (!r.ok){
      console.log('  (no se pudo anotar "' + control + '": HTTP ' + r.status + ')');
      process.exit(0);
    }
    process.exit(0);
  } catch (e){
    console.log('  (no se pudo anotar "' + control + '": ' + e.message.slice(0,80) + ')');
    process.exit(0);
  }
})();
