/* =====================================================================
   TODA CIFRA PUBLICADA SE VUELVE A CORRER                   01/11/2026
   =====================================================================
   POR QUE EXISTE. Cuatro veces publique una cifra que no volvi a medir, y
   una de esas cuatro la vio el usuario:

     15/10  Llame a api_margen_tablero_v3 con 17 nulls posicionales y me
            dio 106 renglones y -33,2% contra los 3.745 y 36,5% de la
            pantalla. Casi reporte el modulo como roto; era mi llamada.
     08/10  Medi sta10 contra sta19 CON UN JOIN —o sea la interseccion— y
            lo escribi como si fuera sobre todo el stock. Lo agarre al
            revalidar al cierre, PORQUE EL USUARIO PREGUNTO «probaste?».
     22/10  Publique «del orden de US$25-27» a precio Opus. Era una
            suposicion y no cerraba con los hechos. Un precio supuesto es
            una cifra inventada y vale la misma regla que cualquier otra.
     31/10  api_hilo_vecinos murio por un subselect que anduvo mientras
            motor.tabla tuvo una sola corrida de analisis. UN DEFECTO QUE
            LO DESTAPA EL CRECIMIENTO DE LOS DATOS, NO UN CAMBIO DE
            CODIGO: nadie toco nada y el control entero se murio.

   QUE MIDE. Llama a public.api_control_cifras(), que vuelve a correr TODA
   cifra activa de cifra_certificado con su fuente independiente y
   devuelve una fila por cada una que falla. Cero filas = pasa. Y asienta
   cada corrida en cifra_corrida: el libro del escribano, que es lo que
   da con que comparar manana.

   LO QUE NO CONTROLA, Y ES A PROPOSITO: que la cifra no cambie. Estas
   cifras CRECEN todas las mananas con la carga nocturna. Congelar el
   numero y exigir que no se mueva haria cortar la puerta todos los dias,
   y un control que grita siempre se apaga —es el aviso de scroll del
   28/10. Lo que se controla es que la CADENA siga en pie, que la fuente
   independiente siga coincidiendo dentro de su tolerancia declarada, y
   que una cifra que solo puede crecer no baje.
   ===================================================================== */

if (!process.env.NODE_USE_ENV_PROXY && process.env.HTTPS_PROXY) {
  const r = require('child_process').spawnSync(process.execPath, [__filename], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' })
  });
  process.exit(r.status === null ? 1 : r.status);
}

const BASE = 'https://hwgfmpvszdohnzqtwscw.supabase.co';
/* la publishable esta hecha para estar a la vista. La service_role NUNCA
   entra al repo. */
const KEY  = 'sb_publishable_7CfYchCqBdDnXJ63IblnTw_cjFCjvUl';

async function rpc(fn, body){
  const r = await fetch(BASE + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  if (!r.ok) throw new Error(fn + ' contesto HTTP ' + r.status + ': '
                           + (await r.text()).slice(0, 220));
  return await r.json();
}

async function main(){
  let fallas = [], cert;
  try {
    /* UNA LLAMADA POR CIFRA. Las cuatro juntas no entran en el
       statement_timeout de PostgREST —cada una corre su control contra la
       contabilidad— y daban HTTP 500 / 57014. Partida, cada una entra
       sobrada. La logica sigue siendo una sola, en la base. */
    const claves = (await rpc('api_certificado_todas', {})).map(x => x.clave);
    if (!claves.length) throw new Error('cifra_certificado no tiene ninguna cifra activa');
    for (const clave of claves)
      for (const f of await rpc('api_control_cifras_una', { p_clave: clave }))
        fallas.push(f);
    cert = await rpc('api_certificado_todas', {});
  } catch (e){
    /* No medido no es limpio. Una cifra publicada que hoy no se puede
       volver a medir es exactamente el defecto del 31/10. */
    console.log('CONTROL DE CIFRAS PUBLICADAS: NO PUDO MEDIR.');
    console.log('  ' + e.message);
    console.log('  No medido no es limpio: el push se corta.');
    process.exit(1);
  }

  const resumen = Array.isArray(cert) ? cert : [];
  const verdes = resumen.filter(x => x.semaforo === 'verde').length;
  const ambar  = resumen.filter(x => x.semaforo === 'ambar').length;
  const rojos  = resumen.filter(x => x.semaforo === 'rojo').length;

  const pie = resumen.length
    ? ('  midio: ' + resumen.length + ' cifras publicadas vueltas a correr '
      + 'contra la base en esta corrida · ' + verdes + ' en verde, ' + ambar
      + ' en ambar (declaradas sin fuente independiente), ' + rojos + ' en rojo.')
    : '  midio: las cifras activas de cifra_certificado, vueltas a correr en esta corrida.';

  if (!fallas.length){
    console.log('CONTROL DE CIFRAS PUBLICADAS: 0 fallas.');
    console.log(pie);
    for (const c of resumen)
      console.log('    ' + (c.semaforo === 'verde' ? 'VERDE' : c.semaforo.toUpperCase())
                + '  ' + c.clave + ' = ' + c.valor_texto
                + (c.control_lectura ? '  ·  ' + c.control_lectura : ''));
    process.exit(0);
  }

  console.log('CONTROL DE CIFRAS PUBLICADAS: ' + fallas.length + ' falla(s)\n');
  const porClase = {};
  for (const f of fallas) (porClase[f.clase] = porClase[f.clase] || []).push(f);
  for (const c of Object.keys(porClase)){
    console.log('  ' + c.toUpperCase() + ' (' + porClase[c].length + ')');
    for (const f of porClase[c]) console.log('    ' + f.clave + '\n      ' + f.detalle);
    console.log('');
  }
  console.log(pie);
  process.exit(1);
}

main().catch(e => {
  console.error('EL CONTROL DE CIFRAS PUBLICADAS NO PUDO CORRER: ' + e.message);
  process.exit(1);
});
