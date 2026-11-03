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

function elRepo() {
  var lista = JSON.parse(UrlFetchApp.fetch(
    'https://api.github.com/repos/' + REPO + '/git/trees/main?recursive=1'
  ).getContentText()).tree;
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
