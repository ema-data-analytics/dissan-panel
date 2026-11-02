#!/usr/bin/env node
/* =====================================================================
   EL ESTADO LLEGA SOLO AL ARRANCAR                         02/11/2026
   =====================================================================
   POR QUE EXISTE. Es el reclamo de fondo del usuario, textual:

     "QUE SI TE PREGUNTO, LO PROBASTE, FUNCIONA, LO PROBAS FUNCIONA,
      CUANDO TE VUELVA A PREGUNTAR, ME CONTESTES AL INSTANTE, SI ESTA
      PROBADO, FUNCIONA, NO ME MIENTAS MAS"

   El 01/11 quedo armado el registro que contesta eso sin pasar por mi
   memoria: ema.control_corrida + api_estado_del_sistema(). Y CLAUDE.md
   dice, arriba de todo, que lo primero de cada sesion es correr dos
   comandos. Pero eso es una REGLA SOBRE MI CONDUCTA, y de esas rompi
   dieciseis. Mientras el estado haya que ir a buscarlo, el dia que no me
   acuerde voy a contestar de memoria otra vez.

   QUE HACE. Lo imprime. Nada mas. Lo llama el hook SessionStart de
   .claude/settings.json, asi que el semaforo entra en el contexto de la
   sesion ANTES de que yo pueda decir una palabra: si algo esta en ambar o
   en rojo, lo tengo adelante sin haberlo pedido. No es que me obligue a
   ser sincero; me obliga a haber MIRADO, que es lo que faltaba.

   POR QUE EN EL REPOSITORIO Y NO EN LA MAQUINA: `core.hooksPath` es
   configuracion local del clon y no se versiona — por eso el pre-push
   estuvo desenchufado sin que nadie lo supiera hasta el 31/10. Un hook en
   .claude/settings.json del repositorio viaja con el repositorio.

   NUNCA FALLA A PROPOSITO: sale siempre con 0. Un hook de arranque que
   corta deja la sesion sin arrancar, y eso seria peor que no tenerlo. Si
   no puede leer la base lo DICE, que es informacion y no silencio.

   Se corre solo: `node control/estado.js`
   ===================================================================== */

if (!process.env.NODE_USE_ENV_PROXY && process.env.HTTPS_PROXY) {
  const r = require('child_process').spawnSync(process.execPath, [__filename], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' })
  });
  process.exit(0);
}

const BASE = 'https://hwgfmpvszdohnzqtwscw.supabase.co';
/* la publishable esta hecha para estar a la vista. La service_role NUNCA
   entra al repo. */
const KEY  = 'sb_publishable_7CfYchCqBdDnXJ63IblnTw_cjFCjvUl';

const SEM = { verde: 'VERDE', ambar: 'AMBAR', rojo: 'ROJO ' };

async function main(){
  let filas;
  try {
    const r = await fetch(BASE + '/rest/v1/rpc/api_estado_del_sistema', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: '{}'
    });
    if (!r.ok) throw new Error('HTTP ' + r.status + ': ' + (await r.text()).slice(0, 160));
    filas = await r.json();
  } catch (e){
    console.log('ESTADO DEL SISTEMA DISSAN: NO SE PUDO LEER.');
    console.log('  ' + e.message);
    console.log('  Entonces NO SE SABE si esta probado, y no saber NO es que ande.');
    console.log('  Si te preguntan "probaste? funciona?", la respuesta es NO hasta');
    console.log('  haber corrido: node control/todos.js');
    return;
  }
  if (!Array.isArray(filas) || !filas.length){
    console.log('ESTADO DEL SISTEMA DISSAN: la funcion contesto vacio. Eso no es');
    console.log('  "todo bien": es que no hay con que contestar. La respuesta es NO.');
    return;
  }

  const mal = filas.filter(f => f.semaforo !== 'verde');

  console.log('════ ESTADO DEL SISTEMA DISSAN — medido, no recordado ════');
  console.log('  (lo imprime el hook SessionStart; sale de api_estado_del_sistema())');
  console.log('');
  for (const f of filas){
    const hace = f.hace_horas === null || f.hace_horas === undefined
                   ? 'nunca' : Number(f.hace_horas).toFixed(1) + ' h';
    console.log('  ' + (SEM[f.semaforo] || f.semaforo) + '  '
              + String(f.control).padEnd(40) + hace.padStart(8)
              + '  ' + (f.veredicto || ''));
  }
  console.log('');
  if (!mal.length){
    console.log('  LAS ' + filas.length + ' EN VERDE. Cada una se midio hace menos de');
    console.log('  lo que vale su medicion. "Anda" esta ganado y se puede decir.');
  } else {
    console.log('  OJO: ' + mal.length + ' de ' + filas.length + ' NO estan en verde:');
    for (const f of mal)
      console.log('    - ' + f.control + ': ' + f.veredicto
                + (f.que_midio ? '  |  ' + String(f.que_midio).slice(0, 150) : ''));
    console.log('');
    console.log('  ENTONCES: si preguntan "probaste? funciona?", LA PRIMERA PALABRA ES');
    console.log('  NO. No "deberia andar".');
    /* COMO SE VUELVE A MEDIR CADA UNA, Y NO ES LA MISMA RECETA.
       Decir "corre control/todos.js" cuando lo que esta en rojo es el
       respaldo en Drive manda a correr algo que no lo mide. Un consejo que
       no sirve para el caso que tenes adelante es ruido, y el ruido es lo
       que hace que se deje de leer el cartel. */
    const porPuerta = mal.filter(f => f.control !== 'el respaldo en Drive');
    if (porPuerta.length)
      console.log('  Las ' + porPuerta.length + ' puerta(s) se vuelven a medir con:  '
                + 'node control/todos.js');
    if (mal.some(f => f.control === 'el respaldo en Drive'))
      console.log('  El respaldo en Drive NO lo mide ese comando: se cuentan las '
                + 'carpetas\n  del Drive con la herramienta de Drive y se anota con '
                + 'control/anotar.js.');
  }
  /* la linea que SIEMPRE va, este todo en verde o no: lo que el registro no
     puede saber. Un semaforo entero en verde no dice que lo que hay adentro
     de cada pantalla sea lo que el usuario pidio. */
  console.log('');
  console.log('  LO QUE ESTO NO DICE, ni con las ' + filas.length + ' en verde: si lo que hay');
  console.log('  ADENTRO de cada pantalla es lo que el usuario pidio. Las puertas miden');
  console.log('  el bulto y los bytes, no la intencion. Eso se pregunta, no se mide.');
  console.log('══════════════════════════════════════════════════════════');
}

main().catch(e => {
  console.log('ESTADO DEL SISTEMA DISSAN: el lector del estado se cayo: ' + e.message);
  console.log('  No saber NO es que ande. La respuesta a "probaste?" es NO.');
}).finally(() => process.exit(0));
