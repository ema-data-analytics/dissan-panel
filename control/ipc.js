#!/usr/bin/env node
/* PUERTA 24 — EL IPC CON EL QUE SE CONVIERTE A PESOS CONSTANTES.
   =========================================================================

   POR QUE EXISTE, Y ES UNA CAGADA MIA DEL 13/11

   Ese dia cargue a mano los 68 indices del IPC Nivel General del INDEC, y
   escribi en el documento del dia: «Se controlo fila por fila contra la API
   viva: 68 en la base, 68 en la API, 0 diferencias». No quedo rastro de esa
   medicion en ningun lado. El 24/11, al cargar septiembre y octubre, la
   rehice de verdad —SHA-256 de la serie entera de los dos lados— y NO
   COINCIDIO: mayo 2024 decia 6073,7000 en la base y el INDEC dice 6073,7165.
   Lo tipee mal, y mi propio control lo dejo pasar.

   La leccion no es «tipear con mas cuidado»: es que **un control que no deja
   rastro no es un control, es una afirmacion mia**. Esta puerta exige el
   rastro y lo compara.

   QUE MIDE

   1. La huella SHA-256 de ema.indice_precios AHORA, leida de la base con la
      sesion de CLAUDEBASE (api_ipc_huella).
   2. control/ipc-medido.json: la ultima bajada de verdad de la serie desde
      apis.datos.gob.ar, con SU SHA, cuantas filas y hasta que mes.
   3. ema.ipc_control: la misma medicion anotada del lado de la base.

   Corta si: falta el archivo · el archivo tiene mas de 45 dias (el INDEC
   publica una vez por mes: 45 dias sin comparar contra la fuente es no haber
   comparado) · el SHA del archivo no es el de la base · el archivo y
   ema.ipc_control no dicen lo mismo · la base no tiene control reciente.

   QUE NO MIDE, DECLARADO

   **No baja la serie del INDEC.** Medido el 13/11 y otra vez el 24/11: desde
   el contenedor, `fetch` a apis.datos.gob.ar da `fetch failed`. La bajada de
   verdad se hace desde el Chrome del usuario y se anota en los dos lados; esta
   puerta controla que esa anotacion exista, sea reciente y siga valiendo. Si
   el INDEC corrigiera un indice viejo sin que nadie vuelva a bajar la serie,
   esta puerta NO lo ve hasta que se cumplan los 45 dias. Queda escrito.

   Tampoco mide si el IPC es el indice que corresponde usar: eso es criterio.
   Mide que los numeros sean los que publica la fuente.
   ========================================================================= */
const fs = require('fs'), path = require('path');
const ses = require('./sesion.js');

const ARCHIVO = path.join(__dirname, 'ipc-medido.json');
const DIAS_MAX = 45;

function leerArchivo(){
  if (!fs.existsSync(ARCHIVO)) return null;
  try { return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')); }
  catch (e) { return { __roto: e.message }; }
}

/* LA MEDICION, SEPARADA DE LA LECTURA, para que el arnes pueda plantarle un
   archivo sin tocar el del repositorio (14/11). */
function medir(arch, huella){
  const f = [];
  if (!arch) {
    f.push('falta ' + ARCHIVO + '. Sin el no hay rastro de que alguien haya ' +
           'comparado el IPC contra el INDEC, y NO MEDIDO NO ES LIMPIO.');
    return f;
  }
  if (arch.__roto){ f.push('ipc-medido.json no se puede leer: ' + arch.__roto); return f; }

  for (const k of ['sha','n','hasta','cuando'])
    if (arch[k] === undefined || arch[k] === null || arch[k] === '')
      f.push('ipc-medido.json no trae «' + k + '»: una medicion a la que le ' +
             'falta un dato no se puede comparar contra nada.');
  if (f.length) return f;

  const dias = (Date.now() - Date.parse(arch.cuando)) / 86400000;
  if (!isFinite(dias)) f.push('ipc-medido.json tiene una fecha que no se entiende: ' + arch.cuando);
  else if (dias > DIAS_MAX)
    f.push('la ultima bajada del INDEC tiene ' + dias.toFixed(1) + ' dias (tope ' +
           DIAS_MAX + '). El INDEC publica una vez por mes: con mas de 45 dias ' +
           'puede haber un indice nuevo, o uno corregido, que nadie miro.');

  if (!huella || !huella.ok){
    f.push('no pude leer la huella de la base: ' + ((huella && huella.porque) || 'sin motivo'));
    return f;
  }
  const h = huella.datos || {};

  if (h.sha !== arch.sha)
    f.push('la huella de ema.indice_precios NO es la que se bajo del INDEC. ' +
           'base ' + String(h.sha).substring(0,16) + '…  archivo ' +
           String(arch.sha).substring(0,16) + '… — o se toco un indice despues ' +
           'del control, o el control quedo viejo. Es el defecto del 13/11.');
  if (Number(h.n) !== Number(arch.n))
    f.push('la base tiene ' + h.n + ' indices y el control del INDEC vio ' + arch.n + '.');
  if (String(h.hasta) !== String(arch.hasta))
    f.push('la base llega hasta ' + h.hasta + ' y el control del INDEC hasta ' + arch.hasta + '.');

  /* EL LADO DE LA BASE TIENE QUE DECIR LO MISMO QUE EL REPOSITORIO.
     Dos copias de la misma cosa se separan con el tiempo (30/10, `listas`):
     aca se miran una a la otra. */
  const c = h.ultimo_control;
  if (!c) f.push('ema.ipc_control no tiene ninguna bajada que haya coincidido: ' +
                 'del lado de la base no hay rastro del control.');
  else {
    if (c.sha_api !== arch.sha)
      f.push('ema.ipc_control anoto otro SHA que el archivo del repositorio: ' +
             'base ' + String(c.sha_api).substring(0,16) + '…  archivo ' +
             String(arch.sha).substring(0,16) + '…');
    if (Number(h.dias_desde_el_control) > DIAS_MAX)
      f.push('la bajada anotada en ema.ipc_control tiene ' + h.dias_desde_el_control +
             ' dias (tope ' + DIAS_MAX + ').');
  }
  return f;
}

(async () => {
  const huellaReal = await (async () => {
    const r = await ses.rpc('api_ipc_huella', {});
    return r.ok ? { ok:true, datos:r.datos } : { ok:false, porque:r.porque };
  })();

  /* EL ARNES. Planta las DOS clases de falla que esta puerta existe para
     agarrar, sin tocar un solo archivo del repositorio, y revienta si no las
     agarra: un arnes que no planta nada da verde sin haber probado (14/11). */
  if (process.env.CONTROL_PLANTAR === 'ipc_tipeado_mal' ||
      process.env.CONTROL_PLANTAR === 'ipc_viejo' ||
      process.env.CONTROL_PLANTAR === 'ipc_sin_rastro'){
    if (!huellaReal.ok){
      console.log('  ARNES ROTO: sin la huella de la base no se puede plantar nada (' +
                  huellaReal.porque + ').');
      process.exit(1);
    }
    const base = leerArchivo();
    if (!base || !base.sha){
      console.log('  ARNES ROTO: no hay ipc-medido.json de verdad donde plantar el defecto.');
      process.exit(1);
    }
    /* CADA CASO EXIGE **SU** CLASE DE FALLA (15/11): si la puerta cortara por
       el motivo equivocado estaria dando verde de casualidad. */
    const casos = {
      /* el 13/11: un indice tipeado mal. El SHA deja de dar. */
      ipc_tipeado_mal: { arch: Object.assign({}, base, { sha: 'f'.repeat(64) }),
                         exige: 'NO es la que se bajo del INDEC' },
      /* nadie volvio a comparar contra el INDEC en dos meses */
      ipc_viejo: { arch: Object.assign({}, base,
                     { cuando: new Date(Date.now() - 60 * 86400000).toISOString() }),
                   exige: 'dias (tope 45)' },
      /* el archivo no esta */
      ipc_sin_rastro: { arch: null, exige: 'NO MEDIDO NO ES LIMPIO' }
    };
    const quien = process.env.CONTROL_PLANTAR;
    const caso = casos[quien];
    const f = medir(caso.arch, huellaReal);
    console.log('  ARNES «' + quien + '»: ' + f.length + ' falla(s).');
    for (const x of f) console.log('    - ' + x);
    if (!f.length){
      console.log('  ARNES ROTO: plante el defecto y la puerta NO lo agarro.');
      process.exit(1);
    }
    if (!f.some(x => x.indexOf(caso.exige) >= 0)){
      console.log('  ARNES ROTO: corto, pero por otro motivo. Esperaba una falla ' +
                  'que dijera «' + caso.exige + '».');
      process.exit(1);
    }
    /* y la otra cara: el archivo de verdad NO tiene que sonar, o la puerta
       estaria cortando siempre y se terminaria apagando. */
    const limpio = medir(base, huellaReal);
    if (limpio.length){
      console.log('  ARNES ROTO: el archivo de verdad suena con ' + limpio.length +
                  ' falla(s): ' + limpio[0]);
      process.exit(1);
    }
    console.log('  ARNES: la cara limpia no suena. Las dos caras, bien.');
    process.exit(0);
  }

  const arch = leerArchivo();
  const f = medir(arch, huellaReal);
  console.log('CONTROL DEL IPC: ' + (f.length ? f.length + ' falla(s).' : '0 fallas.'));
  for (const x of f) console.log('  - ' + x);

  const h = (huellaReal.ok && huellaReal.datos) || {};
  console.log('  midio: ' + (await ses.conQueEntre()) + '. ' +
    (huellaReal.ok
      ? 'ema.indice_precios tiene ' + h.n + ' indices, de ' + h.desde + ' a ' + h.hasta +
        ', huella ' + String(h.sha).substring(0,16) + '…; la ultima bajada del INDEC ' +
        'que coincidio tiene ' + h.dias_desde_el_control + ' dias.'
      : 'NO pude leer la huella de la base.'));
  console.log('  NO midio: no baja la serie del INDEC. Medido el 13/11 y otra vez ' +
    'el 24/11: desde el contenedor `fetch` a apis.datos.gob.ar da «fetch failed». ' +
    'La bajada de verdad se hace desde el Chrome del usuario; esta puerta exige ' +
    'que ese rastro exista, sea de menos de ' + DIAS_MAX + ' dias y siga valiendo.');
  process.exit(f.length ? 1 : 0);
})();
