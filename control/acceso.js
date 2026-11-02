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

/* DOS MODOS, Y EL MODO QUEDA ANOTADO.                        02/11/2026
   Esta puerta exige control/acceso-medido.json, que sale de dos llamadas
   que un script NO puede hacer: si tengo el Chrome del usuario y si tengo
   el puente a su maquina. Eso esta bien cuando hay alguien —yo— y es
   justamente la falla del 01/11 que la hizo nacer.
   Pero el 02/11 se le agrego un reloj: control/todos.js corre las ocho
   puertas solas cada mañana, para que la medicion nunca este vieja. En esa
   corrida NO HAY NADIE que mida el navegador, y exigirlo pondria un rojo
   todas las mañanas. Un control que grita siempre se apaga, y entonces no
   frena nada el dia que grita de verdad.
   Asi que en modo desatendido se mide lo que SI se puede medir desde el
   contenedor —las dos vias de red, ahora mismo— y se DECLARA en la linea
   "midio:" que el navegador y el puente no se midieron en esa corrida. El
   pre-push sigue en modo estricto, porque ahi hay alguien. */
const DESATENDIDO = process.env.CONTROL_SIN_NADIE === '1'
                 || process.argv.includes('--desatendido');

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

  /* ---- 2 bis: CON QUE VA A ARRANCAR LA PROXIMA SESION ------- 02/11/2026
     El hook SessionStart de .claude/ imprime api_estado_del_sistema() antes
     de que la sesion pueda decir una palabra. Es el mecanismo que hace que
     el estado NO dependa de que alguien se acuerde de pedirlo — o sea, el
     que sostiene toda esta puerta un piso mas arriba.
     Si ese hook se rompe o se borra, no avisa NADA: la proxima sesion
     arranca sin el estado y nadie se entera, que es exactamente lo que paso
     con `core.hooksPath` hasta el 31/10 (el pre-push estuvo desenchufado
     dias). Por eso se mide aca: esta puerta es la de "con que cuento". */
  const HOOK_JSON = path.join(__dirname, '..', '.claude', 'settings.json');
  const HOOK_SH   = path.join(__dirname, '..', '.claude', 'hooks', 'session-start.sh');
  let hookOk = false, hookDetalle = '';
  try {
    const cfg = JSON.parse(fs.readFileSync(HOOK_JSON, 'utf8'));
    const entradas = ((cfg.hooks || {}).SessionStart || [])
                       .flatMap(e => e.hooks || []);
    const cmd = entradas.map(h => String(h.command || '')).join(' ');
    if (!entradas.length)
      throw new Error('.claude/settings.json no declara ningun hook SessionStart');
    if (!/session-start\.sh/.test(cmd))
      throw new Error('el hook SessionStart no apunta a .claude/hooks/session-start.sh'
                    + ' (dice: ' + cmd.slice(0, 80) + ')');
    const sh = fs.readFileSync(HOOK_SH, 'utf8');
    if (!/control\/estado\.js/.test(sh))
      throw new Error('.claude/hooks/session-start.sh no llama a control/estado.js');
    /* y que de verdad imprima el estado: el archivo puede existir y no servir */
    const r = require('child_process').spawnSync('node',
                [path.join(__dirname, 'estado.js')],
                { encoding: 'utf8', cwd: path.join(__dirname, '..'), timeout: 60000 });
    const salida = (r.stdout || '') + (r.stderr || '');
    if (!/ESTADO DEL SISTEMA DISSAN/.test(salida))
      throw new Error('control/estado.js corrio y NO imprimio el estado');
    const puertas = (salida.match(/^\s{2}(VERDE|AMBAR|ROJO)/gm) || []).length;
    if (!puertas)
      throw new Error('control/estado.js imprimio el encabezado pero ni una fila '
                    + 'de semaforo: un cartel vacio es peor que ninguno');
    hookOk = true;
    hookDetalle = 'el hook SessionStart de .claude/ llama a control/estado.js, que '
                + 'corrio e imprimio ' + puertas + ' filas de semaforo.';
  } catch (e){
    hookDetalle = e.message.slice(0, 180);
    fallas.push('EL ESTADO NO VA A LLEGAR SOLO A LA PROXIMA SESION: ' + hookDetalle
              + '. Ese hook es lo que hace que "lo probaste?" no dependa de que '
              + 'alguien se acuerde de preguntarle a la base. Si se rompe no avisa '
              + 'nada y la sesion que viene arranca a ciegas — es `core.hooksPath` '
              + 'otra vez, que estuvo desenchufado dias sin que nadie lo supiera.');
  }

  /* ---- 3: lo que un script NO puede medir, y por eso se exige ---------- */
  let m = null;
  try {
    /* En modo desatendido el archivo NO se lee, ni siquiera si existe: seria
       la medicion de OTRA corrida, y decir "TENGO el Chrome" porque anoche lo
       tenia es exactamente la clase de afirmacion sin medir que esta puerta
       existe para frenar. */
    if (DESATENDIDO) throw new Error('modo desatendido: no se lee la medicion de otra corrida');
    m = JSON.parse(fs.readFileSync(MEDIDO, 'utf8'));
  } catch (e){
    if (DESATENDIDO){
      console.log('CONTROL DE ACCESO — QUE PUEDO PROBAR HOY  (modo desatendido)');
      for (const v of vias)
        console.log('  ' + (v.llega ? 'LLEGA   ' : 'NO LLEGA')
                  + '  ' + v.via + (v.llega ? '  (HTTP ' + v.http + ', ' + v.ms + ' ms)'
                                            : '  — ' + (v.error || '')));
      console.log('  NO SE MIDIO  el Chrome del usuario ni el puente a su computadora: '
                + 'en esta corrida no hay nadie que pueda medirlos.');
      if (fallas.length){
        console.log('\nCONTROL DE ACCESO: ' + fallas.length + ' falla(s)\n');
        for (const f of fallas) console.log('  - ' + f);
        process.exit(1);
      }
      console.log('\nCONTROL DE ACCESO: 0 fallas.');
      console.log('  midio: las dos vias de red AHORA MISMO (la base y el panel '
                + 'publicado). NO midio el navegador ni el puente: corrida '
                + 'desatendida, no hay nadie que los mida. Para probar en pantalla '
                + 'hace falta una corrida con alguien.');
      process.exit(0);
    }
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
  console.log('  ' + (hookOk ? 'ARRANCA ' : 'NO ARRANCA')
            + '  la proxima sesion con el estado a la vista  — ' + hookDetalle);

  if (fallas.length){
    console.log('\nCONTROL DE ACCESO: ' + fallas.length + ' falla(s)\n');
    for (const f of fallas) console.log('  - ' + f);
    console.log('\n  No medido no es limpio: el push se corta.');
    process.exit(1);
  }

  /* LA LINEA "midio:" ES LO QUE QUEDA EN LA BASE.               02/11/2026
     Encontrado al volver a correr esta puerta hoy: pasaba con el navegador
     en NO —medido, legitimo— y la linea que se guarda en ema.control_corrida
     decia solo "exigio la medicion", sin decir QUE dio. Entonces
     api_estado_del_sistema() mostraba "el acceso: paso" y el que la leyera no
     podia saber que hoy NO se verifico nada en el Chrome del usuario. Es la
     misma clase que todo esto frena: un registro que pasa sin declarar lo que
     no pudo medir. Ahora el resultado va ADENTRO de la linea que se guarda. */
  const si = x => (x === true || x === 'si' || x === 'SI');
  console.log('\nCONTROL DE ACCESO: 0 fallas.');
  console.log('  midio: las dos vias de red AHORA MISMO ('
            + vias.map(v => v.via + ' ' + (v.llega ? 'HTTP ' + v.http : 'NO LLEGA')).join(' · ')
            + ') · el Chrome del usuario: ' + (si(m.navegador) ? 'TENGO' : 'NO TENGO')
            + ' · el puente a su computadora: ' + (si(m.puente) ? 'TENGO' : 'NO TENGO')
            + ' · medicion fechada ' + m.cuando
            + ' · el arranque de la proxima sesion: ' + hookDetalle
            + (si(m.navegador) ? '' : ' · OJO: sin el Chrome del usuario, en esta '
               + 'corrida NO se verifico nada en SU pantalla.'));
  process.exit(0);
}

main().catch(e => {
  console.error('EL CONTROL DE ACCESO NO PUDO CORRER: ' + e.message);
  process.exit(1);
});
