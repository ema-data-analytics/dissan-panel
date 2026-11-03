/* RESPALDO DISSAN -> GOOGLE DRIVE                              02/11/2026
   =====================================================================
   POR QUE ESTE SCRIPT EXISTE. El respaldo tiene que quedar EN DRIVE y
   tiene que ser EXACTO. Si lo escribiera yo a mano, 1,9 MB tipeados no
   dan el mismo hash: seria una copia, no un respaldo. Este script corre
   en los servidores de Google, baja los archivos del origen y los
   escribe en el Drive del usuario sin que nadie los transcriba.

   QUE HACE, en una linea cada cosa:
     laBase()  -> baja de Supabase las funciones, vistas, tablas y
                  permisos, y los deja en 03-BASE-SQL
     elRepo()  -> baja los 87 archivos del repositorio del panel y los
                  deja en 01-PANEL, 02-CONTROL y 04-EDGE-FUNCTIONS
     respaldarTodo() -> las dos, y al final escribe 00-LO-QUE-SE-BAJO.txt
                  con el tamano de cada archivo, que es el control.

   COMO SE CORRE. Este archivo NO se pega en el editor de Apps Script: se
   lo baja el proyecto solo. En el editor van tres renglones:

     function respaldarTodo(){
       eval(UrlFetchApp.fetch('https://ema-data-analytics.github.io/dissan-panel/respaldo-drive.js').getContentText());
       return principal();
     }

   Asi el codigo de verdad vive en el repositorio, versionado y con su
   historia, y en el editor no hay 4.700 caracteres tipeados a mano que
   es justo lo que este respaldo existe para no hacer.                 */

var CARPETA = '1U6w6yQ2nnJLcj8FLl_-cy9IGcCGT0Fx9';
var SB      = 'https://hwgfmpvszdohnzqtwscw.supabase.co';
var KEY     = 'sb_publishable_7CfYchCqBdDnXJ63IblnTw_cjFCjvUl';
var VALE    = '6dcdce2d32793fb4d4b23c37320ae8a8be7f75ab2752553b';
var REPO    = 'ema-data-analytics/dissan-panel';

function principal() {
  var hecho = [];
  hecho = hecho.concat(laBase());
  hecho = hecho.concat(elRepo());
  var mal = 0;
  for (var k = 0; k < hecho.length; k++) if (hecho[k].indexOf('MAL:') >= 0) mal++;
  var txt = 'LO QUE SE BAJO — ' + new Date().toISOString() + '\n\n';
  for (var i = 0; i < hecho.length; i++) txt += hecho[i] + '\n';
  txt += '\nTotal: ' + hecho.length + ' archivos.\n';
  txt += mal === 0
    ? 'Los tamanos coinciden con el origen en todos.\n'
    : 'OJO: ' + mal + ' archivo(s) NO coinciden con el origen. Buscar "MAL:" arriba.\n';
  escribir_(DriveApp.getFolderById(CARPETA), '00-LO-QUE-SE-BAJO.txt', txt);
  Logger.log(txt);
  return txt;
}

function carpeta_(idPadre, nombre) {
  var p = DriveApp.getFolderById(idPadre);
  var it = p.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : p.createFolder(nombre);
}

/* se borra el anterior antes de escribir: si no, Drive deja dos archivos
   con el mismo nombre y no se sabe cual es el bueno */
function escribir_(carpeta, nombre, texto) {
  var it = carpeta.getFilesByName(nombre);
  while (it.hasNext()) it.next().setTrashed(true);
  return carpeta.createFile(nombre, texto, 'text/plain');
}

function laBase() {
  var c = carpeta_(CARPETA, '03-BASE-SQL');
  var partes = ['funciones', 'vistas', 'tablas', 'permisos'];
  var out = [];
  for (var i = 0; i < partes.length; i++) {
    var r = UrlFetchApp.fetch(SB + '/rest/v1/rpc/ema_respaldo_sql', {
      method: 'post',
      contentType: 'application/json',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY },
      payload: JSON.stringify({ p_vale: VALE, p_parte: partes[i] }),
      muteHttpExceptions: true
    });
    var cuerpo = r.getContentText();
    var t = JSON.parse(cuerpo);
    /* la funcion devuelve TEXTO. Si vuelve un objeto es un error de la
       base (vale vencido, por ejemplo) y se corta: un archivo con el
       mensaje de error adentro seria un respaldo falso. */
    if (typeof t !== 'string') {
      throw new Error('La base rechazo ' + partes[i] + ': ' + cuerpo.slice(0, 300));
    }
    var f = escribir_(c, partes[i] + '.sql', t);
    out.push('03-BASE-SQL/' + partes[i] + '.sql   ' + f.getSize() + ' bytes');
  }
  return out;
}

/* LA LISTA VA ADENTRO, NO SE LE PREGUNTA A LA API DE GITHUB.  02/11/2026
   La segunda corrida murio con 403 "API rate limit exceeded": sin
   autenticar, api.github.com deja 60 pedidos por hora y este respaldo
   hace 90. raw.githubusercontent no tiene ese tope. La lista se genera
   con `git ls-files` al subir el script, asi que viene con el tamano de
   cada archivo y el control de tamano sigue existiendo sin la API. */
var LISTA = [
  {p:'.claude/hooks/session-start.sh',n:2121},
  {p:'.claude/settings.json',n:252},
  {p:'.githooks/pre-push',n:6449},
  {p:'.nojekyll',n:0},
  {p:'agenda/index.html',n:28966},
  {p:'ayuda.html',n:3635},
  {p:'bitacora.html',n:7252},
  {p:'cartera.html',n:3708},
  {p:'compras.html',n:3512},
  {p:'control/acceso-medido.json',n:1175},
  {p:'control/acceso.js',n:14927},
  {p:'control/alcance-senuelos.js',n:7770},
  {p:'control/alcance.js',n:13261},
  {p:'control/anotar.js',n:3735},
  {p:'control/archivo-senuelos.py',n:11414},
  {p:'control/archivo.js',n:12702},
  {p:'control/archivo.py',n:20590},
  {p:'control/cifra.js',n:5741},
  {p:'control/edge.js',n:14125},
  {p:'control/enchufar.js',n:1925},
  {p:'control/estado.js',n:6392},
  {p:'control/pantallas.js',n:31544},
  {p:'control/pdf-senuelos.js',n:10184},
  {p:'control/pdf.py',n:14989},
  {p:'control/publicado-senuelos.js',n:9213},
  {p:'control/publicado.js',n:10951},
  {p:'control/rotulo.js',n:17642},
  {p:'control/supabase-de-juguete.js',n:55499},
  {p:'control/todos.js',n:8388},
  {p:'css/app.css',n:33140},
  {p:'css/ayuda-ay.css',n:12641},
  {p:'css/hilo-hil.css',n:2872},
  {p:'css/informe-rt.css',n:7443},
  {p:'css/listas-lp.css',n:6128},
  {p:'css/margen-mv.css',n:10947},
  {p:'css/pruebas.css',n:3677},
  {p:'css/seguridad-seg.css',n:5434},
  {p:'css/tablero-db.css',n:10469},
  {p:'css/ventas-informe.css',n:9389},
  {p:'edge/ayuda/index.ts',n:9369},
  {p:'edge/bajar/index.ts',n:9153},
  {p:'edge/carga-temporal/index.ts',n:487},
  {p:'edge/diag-clave/index.ts',n:332},
  {p:'edge/excel/index.ts',n:25495},
  {p:'edge/leer/index.ts',n:29112},
  {p:'edge/listas/index.ts',n:22461},
  {p:'edge/preguntar/index.ts',n:26956},
  {p:'edge/preguntar2/index.ts',n:26334},
  {p:'edge/preguntar3/index.ts',n:29855},
  {p:'edge/probe-pdf/index.ts',n:1462},
  {p:'edge/probe-pdf/index.ts.prueba-desechable-retirada-01-11',n:5077},
  {p:'edge/usuarios/index.ts',n:11165},
  {p:'hilo.html',n:4652},
  {p:'img/ema.png',n:3536},
  {p:'img/macromanager.png',n:3129},
  {p:'index.html',n:8144},
  {p:'informe.html',n:4086},
  {p:'js/ayuda.js',n:58279},
  {p:'js/bajar-formatos.js',n:30912},
  {p:'js/bajar.js',n:22609},
  {p:'js/bitacora.js',n:9271},
  {p:'js/cartera.js',n:15259},
  {p:'js/compras.js',n:13991},
  {p:'js/core.js',n:26205},
  {p:'js/filas.js',n:6920},
  {p:'js/hilo.js',n:8108},
  {p:'js/informe.js',n:19474},
  {p:'js/listas.js',n:36328},
  {p:'js/margen.js',n:37834},
  {p:'js/pregunta.js',n:26609},
  {p:'js/pruebas.js',n:2605},
  {p:'js/seguridad.js',n:17550},
  {p:'js/stock.js',n:13424},
  {p:'js/tablero.js',n:24116},
  {p:'js/tesoreria.js',n:20620},
  {p:'js/vendor/pdf.min.mjs',n:496989},
  {p:'js/vendor/pdf.worker.min.mjs',n:1286284},
  {p:'js/ventas.js',n:50689},
  {p:'listas.html',n:4657},
  {p:'pregunta.html',n:4049},
  {p:'pruebas.html',n:8587},
  {p:'pruebas/index.html',n:8608},
  {p:'respaldo-drive.js',n:5890},
  {p:'seguridad.html',n:9349},
  {p:'stock.html',n:3927},
  {p:'tablero.html',n:5095},
  {p:'tesoreria.html',n:3523},
  {p:'ventas.html',n:9607}
];

function elRepo() {
  var lista = LISTA.map(function(x){ return {path:x.p, size:x.n, type:'blob'}; });
  var donde = { 'control': '02-CONTROL', 'edge': '04-EDGE-FUNCTIONS' };
  var carpetas = {}, out = [];
  for (var i = 0; i < lista.length; i++) {
    var n = lista[i];
    if (n.type !== 'blob') continue;
    var top = n.path.split('/')[0];
    var cual = donde[top] || '01-PANEL';
    if (!carpetas[cual]) carpetas[cual] = carpeta_(CARPETA, cual);
    /* el nombre lleva la ruta con __ para no perder en que carpeta
       estaba: js/core.js y control/core.js no son el mismo archivo */
    var nombre = n.path.replace(/\//g, '__');
    /* UN ARCHIVO QUE LLEGA VACIO NO ES UN RESPALDO.       02/11/2026
       La primera corrida dejo 2 de 92 en 0 bytes (control/enchufar.js y
       img/macromanager.png) y el resto bien: raw.githubusercontent
       contesta vacio cada tanto. Se compara contra el tamano que declara
       el arbol de GitHub y, si no coincide, se vuelve a pedir hasta 3
       veces. Lo que despues de eso siga mal se escribe en el informe con
       la palabra MAL, no se tapa. */
    /* lo que ya esta en Drive con el tamano correcto no se vuelve a
       bajar: asi una corrida nueva arregla solo lo que esta mal y no
       vuelve a golpear 90 veces el origen. */
    var ya = carpetas[cual].getFilesByName(nombre);
    if (ya.hasNext()) {
      var vieja = ya.next();
      if (!ya.hasNext() && vieja.getSize() === n.size) {
        out.push(cual + '/' + nombre + '   ' + vieja.getSize() + ' bytes   (ya estaba)');
        continue;
      }
    }
    var f = null, bytes = -1, intentos = 0;
    while (intentos < 3) {
      intentos++;
      var b = UrlFetchApp.fetch(
        'https://raw.githubusercontent.com/' + REPO + '/main/' + n.path
          + '?t=' + Date.now() + '-' + intentos
      ).getBlob().setName(nombre);
      var it = carpetas[cual].getFilesByName(nombre);
      while (it.hasNext()) it.next().setTrashed(true);
      f = carpetas[cual].createFile(b);
      bytes = f.getSize();
      if (bytes === n.size) break;
      Utilities.sleep(700);
    }
    out.push(cual + '/' + nombre + '   ' + bytes + ' bytes'
             + (bytes === n.size ? '' : '   MAL: en GitHub mide ' + n.size
                + ' (se intento ' + intentos + ' veces)'));
  }
  return out;
}
