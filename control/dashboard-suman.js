#!/usr/bin/env node
/* PUERTA — LAS PARTES DE CADA CORTE SUMAN EL RESUMEN.         23/11/2026
   =========================================================================
   POR QUE EXISTE, y no es una puerta de adorno: la escribi hoy y AL PRIMER
   INTENTO agarro un defecto mio de verdad.

   El dashboard arma cada corte desde `_d` —las FACTURAS— y le engancha las
   notas de credito y debito desde `_n`, que es otra tabla
   (`ema.mv_ventas_detalle`). El enganche es un left join por el valor de la
   dimension. O sea que una nota de un cliente que NO facturo nada en el
   periodo no tiene a que engancharse y DESAPARECE: no esta en ningun renglon
   de la tabla, y el total del corte no coincide con el del resumen.
   Medido en 2026: **$83.057,85** se perdian en el corte por cliente. Es
   AMPES, que ese anio tiene una nota de credito y CERO facturas.

   Los otros cuatro cortes sumaban exacto —no hay proveedor ni linea que solo
   tenga devoluciones— y eso es exactamente como se ven los defectos que
   todavia no mordieron. Un corte que cierra por casualidad no esta
   controlado.

   QUE MIDE, cada corrida:
     1. los cinco cortes: facturado, notas y neto de sus claves tienen que
        sumar EXACTAMENTE los tres del resumen;
     2. las notas de credito negativas y las de debito positivas —si el signo
        se diera vuelta, el neto saldria MAS grande que el facturado y la
        cifra seguiria siendo creible—;
     3. credito + debito = notas;
     4. y que el neto de cada clave sea su facturado mas sus notas, renglon
        por renglon, no solo en el total: un total que cierra puede estar
        tapando diferencias que se compensan (20/11).

   LO QUE NO MIDE, declarado: que el facturado sea el correcto. Eso lo miden
   la puerta de cifras publicadas y la comparacion contra la tabla dinamica
   del usuario. Esto mide que las PARTES y el TODO sean el mismo numero.

   SE ENTRA CON LA SESION DE CLAUDEBASE, que es rol `authenticated`, el mismo
   del panel: un control que entra con mas permiso no prueba lo que ve el
   usuario (16/11). Y `node` no usa el proxy solo: hay que relanzarlo con
   NODE_USE_ENV_PROXY=1.
   ========================================================================= */

if (!process.env.NODE_USE_ENV_PROXY && process.env.HTTPS_PROXY) {
  const r = require('child_process').spawnSync(process.execPath, [__filename], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' })
  });
  process.exit(r.status === null ? 1 : r.status);
}

const sesion = require('./sesion.js');

const DIMS = ['zona', 'provincia', 'proveedor', 'linea', 'cliente'];
const PLANTAR = process.env.CONTROL_PLANTAR || '';
const pl = n => (n === null || n === undefined || isNaN(Number(n))) ? '—'
  : '$' + Number(n).toLocaleString('es-AR',
      { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const c2 = n => Math.round(Number(n || 0) * 100) / 100;

/* EL ARNES.                                                    23/11/2026
   Planta el defecto SOBRE LA RESPUESTA, sacandole a un corte la clave que
   solo tiene notas — que es exactamente lo que hacia la version rota—, y la
   puerta tiene que gritar.
   LO QUE EL ARNES PRUEBA Y LO QUE NO, dicho de frente: prueba que esta puerta
   DETECTA el desajuste. No prueba la funcion de la base; para eso esta la
   corrida limpia. Un arnes que no declara su alcance es media medicion.
   Y si no encuentra donde plantar, REVIENTA: un arnes que no planta nada da
   verde sin haber probado (14/11). */
function plantar(d){
  if (PLANTAR !== 'falta_una_clave') return d;
  for (const dim of DIMS){
    const t = d[dim].totales || [];
    const i = t.findIndex(x => Number(x.notas || 0) !== 0);
    if (i >= 0){
      t.splice(i, 1);
      console.log('  ARNES: le saque «' + dim + '» una clave con notas, a ver si suena.');
      return d;
    }
  }
  throw new Error('ARNES ROTO: ningun corte tiene una clave con notas, asi que ' +
                  'no hay donde plantar el defecto. Esto no es un pase.');
}

(async () => {
  const fallas = [];
  const s = await sesion.entrar();
  if (!s.ok){
    console.log('CONTROL DE QUE LAS PARTES SUMEN: NO MEDIDO — ' + s.porque);
    console.log('  No medido no es limpio: el push se corta.');
    process.exit(1);
  }

  /* el anio en curso y el anterior: el defecto aparecia en UNO solo de los
     dos, asi que mirar un periodo solo habria dado verde la mitad de las
     veces */
  const hoy = new Date();
  const anios = [hoy.getFullYear(), hoy.getFullYear() - 1];

  for (const anio of anios){
    const r = await sesion.rpc('api_ventas_dashboard_v2', {
      p_desde: anio + '-01-01', p_hasta: anio + '-12-31', p_tope: 1000,
      p_zonas: [], p_provincias: [], p_proveedores: [], p_lineas: [], p_clientes: [] });
    if (!r.ok){
      fallas.push(anio + ': la base no contesto (HTTP ' + r.http + ')');
      continue;
    }
    const d = plantar(r.datos), R = d.resumen;
    console.log('\n  ' + anio + ':  facturado ' + pl(R.venta_universo) +
                '  ·  notas ' + pl(R.notas) + '  ·  neto ' + pl(R.neto));

    for (const dim of DIMS){
      const t = d[dim].totales || [];
      const su = c2(t.reduce((a, x) => a + Number(x.venta_universo || 0), 0));
      const sn = c2(t.reduce((a, x) => a + Number(x.notas || 0), 0));
      const se = c2(t.reduce((a, x) => a + Number(x.neto || 0), 0));
      const dU = c2(su - Number(R.venta_universo));
      const dN = c2(sn - Number(R.notas));
      const dE = c2(se - Number(R.neto));
      if (dU) fallas.push(anio + ' · ' + dim + ': el facturado de las claves no suma el del resumen, ' + pl(dU));
      if (dN) fallas.push(anio + ' · ' + dim + ': las notas de las claves no suman las del resumen, ' + pl(dN));
      if (dE) fallas.push(anio + ' · ' + dim + ': el neto de las claves no suma el del resumen, ' + pl(dE));

      /* y RENGLON POR RENGLON, porque un total que cierra puede estar tapando
         diferencias que se compensan */
      let malos = 0, peor = 0;
      for (const x of t){
        const esperado = c2(Number(x.venta_universo || 0) + Number(x.notas || 0));
        const hay = c2(x.neto);
        if (esperado !== hay){ malos++; peor = Math.max(peor, Math.abs(esperado - hay)); }
      }
      if (malos) fallas.push(anio + ' · ' + dim + ': ' + malos + ' clave(s) donde neto no es ' +
                             'facturado mas notas, la peor por ' + pl(peor));

      console.log('    ' + dim.padEnd(10) + String(t.length).padStart(4) + ' claves · ' +
        (dU || dN || dE || malos ? 'NO SUMA' : 'suma exacto'));
    }

    if (Number(R.notas_credito) > 0)
      fallas.push(anio + ': las notas de credito salen POSITIVAS (' + pl(R.notas_credito) +
                  '). Con el signo al reves el neto sale mas grande que el facturado y ' +
                  'la cifra sigue siendo creible.');
    if (Number(R.notas_debito) < 0)
      fallas.push(anio + ': las notas de debito salen NEGATIVAS (' + pl(R.notas_debito) + ').');
    const suma = c2(Number(R.notas_credito) + Number(R.notas_debito) - Number(R.notas));
    if (suma) fallas.push(anio + ': credito mas debito no da el total de notas, ' + pl(suma));
  }

  console.log('\nCONTROL DE QUE LAS PARTES SUMEN: ' +
              (fallas.length ? fallas.length + ' falla(s).' : '0 fallas.'));
  for (const f of fallas) console.log('  - ' + f);
  console.log('  midio: los ' + DIMS.length + ' cortes de ' + anios.join(' y ') +
              ', sus claves contra el resumen en facturado, notas y neto, ' +
              'clave por clave y no solo en el total · el signo de las notas · ' +
              'y que credito mas debito de el total.');
  console.log('  NO midio: que el facturado sea el correcto. Eso lo miran la puerta de ' +
              'cifras publicadas y la comparacion contra la planilla del usuario. ' +
              'Esto mide que las PARTES y el TODO sean el mismo numero.');
  process.exit(fallas.length ? 1 : 0);
})().catch(e => {
  console.log('CONTROL DE QUE LAS PARTES SUMEN: se murio — ' + e.message);
  console.log('  Un control que se muere no es un control que detecta.');
  process.exit(1);
});
