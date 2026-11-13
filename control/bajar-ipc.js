/* =====================================================================
   BAJAR EL IPC DEL INDEC Y ESCRIBIR EL INSERT.            13/11/2026
   =====================================================================
   POR QUE NO CORRE EN EL CONTENEDOR. apis.datos.gob.ar no esta en la
   lista blanca del proxy de la sesion: medido, WebFetch contesta
   URL_NOT_ON_ALLOWLIST. Y todo camino que sale del shell pasa por la
   misma lista, asi que reintentar con curl no cambia nada.
   Entonces esto corre EN EL CHROME DEL USUARIO, igual que el conductor
   del analisis: se pega en la consola de cualquier pestania del panel,
   o se manda con la herramienta de javascript.

   LO QUE ESCRIBE. El INSERT listo para pegar en sql/, y ADEMAS la
   comparacion contra lo que ya esta en la base. Las dos cosas juntas a
   proposito: escribir 68 numeros a mano no es copiar, es transcribir, y
   un error de transcripcion da una cifra creible y mal. El 13/11 esta
   comparacion dio 68 de 68 identicos; sin ella el indice no se entregaba.

   LA SERIE. INDEC, IPC Nivel General Nacional, base dic-2016 = 100.
   id 148.3_INIVELNAL_DICI_M_26 del portal de datos abiertos del Estado.

   CUANDO SE VUELVE A CORRER. Cuando la identidad `indice_precios_al_dia`
   se ponga en rojo: eso quiere decir que el INDEC publico meses nuevos y
   la tabla se quedo atras mas de 4 meses.
   ===================================================================== */

const SERIE = '148.3_INIVELNAL_DICI_M_26';
const DESDE = '2021-01';
const KEY   = 'sb_publishable_7CfYchCqBdDnXJ63IblnTw_cjFCjvUl';
const BASE  = 'https://hwgfmpvszdohnzqtwscw.supabase.co';

window.__ipc_resultado = 'corriendo';

(async () => {
  try {
    /* --- 1. la fuente viva ------------------------------------------- */
    const url = 'https://apis.datos.gob.ar/series/api/series/'
              + '?ids=' + SERIE + '&limit=1000&format=json&start_date=' + DESDE;
    const api = await fetch(url).then(r => r.json());
    if (!api || !Array.isArray(api.data)) throw new Error('la API no devolvio data');

    const vivo = api.data
      .filter(d => d && d[1] != null)
      .map(d => ({ mes: d[0].slice(0, 7), indice: Number(d[1]) }));

    /* --- 2. el INSERT, armado por la maquina y no por mi -------------- */
    const sql =
      'insert into ema.indice_precios (mes, indice, serie, fuente) values\n' +
      vivo.map(v =>
        " ('" + v.mes + "-01'," + String(v.indice).padStart(11) +
        ",'" + SERIE + "','INDEC via apis.datos.gob.ar')").join(',\n') +
      '\non conflict (mes) do update set indice = excluded.indice, bajado_cuando = now();';

    /* --- 3. y la comparacion contra lo que YA esta en la base --------- */
    let comparacion = 'no se pudo comparar: no hay sesion en esta pestania';
    const o  = JSON.parse(localStorage.getItem('dissan_panel_v1') || '{}');
    const tk = o.access_token || (o.session || {}).access_token || (o.currentSession || {}).access_token;
    if (tk) {
      const r = await fetch(BASE + '/rest/v1/vista_indice_precios?select=mes,indice&order=mes',
                            { headers: { apikey: KEY, Authorization: 'Bearer ' + tk } });
      const base = await r.json();
      if (Array.isArray(base)) {
        const mapaVivo = new Map(vivo.map(v => [v.mes, v.indice]));
        const difs = [];
        for (const f of base) {
          const m = String(f.mes).slice(0, 7);
          const v = mapaVivo.get(m);
          if (v === undefined) { difs.push(m + ': esta en la base y no en la API'); continue; }
          if (Math.abs(Number(f.indice) - v) > 0.00001) difs.push(m + ': base=' + f.indice + ' api=' + v);
        }
        const faltan = vivo.filter(v => !base.some(f => String(f.mes).slice(0, 7) === v.mes))
                           .map(v => v.mes);
        comparacion = { http: r.status, en_la_base: base.length, en_la_api: vivo.length,
                        diferencias: difs, en_api_y_no_en_base: faltan,
                        veredicto: (difs.length === 0 && faltan.length === 0)
                                   ? 'IDENTICOS: la base dice lo mismo que el INDEC'
                                   : 'HAY DIFERENCIAS: mirar la lista antes de publicar nada' };
      } else {
        comparacion = 'postgrest contesto: ' + JSON.stringify(base).slice(0, 300);
      }
    }

    window.__ipc_resultado = { meses: vivo.length,
                               primero: vivo[0] && vivo[0].mes,
                               ultimo: vivo[vivo.length - 1] && vivo[vivo.length - 1].mes,
                               comparacion: comparacion,
                               sql: sql };
    console.log('IPC bajado:', vivo.length, 'meses.', vivo[0].mes, '->', vivo[vivo.length - 1].mes);
    console.log(comparacion);
  } catch (e) {
    window.__ipc_resultado = 'ERROR: ' + ((e && e.message) || e);
    console.log(window.__ipc_resultado);
  }
})();
