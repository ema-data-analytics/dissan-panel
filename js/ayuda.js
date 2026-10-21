/* DISSAN · Ayuda inteligente — sobre Supabase
   ---------------------------------------------------------------------------
   La cadena entera, DIRECTO desde el navegador. Medido el 20/10 contra la base:

     api_preguntar        50 filas   1,1 s   ← lo que se MUESTRA
     api_preguntar_todo  219 filas   1,0 s   ← lo que se LEE y lo que se BAJA
     funcion «leer»                 37,9 s   claude-opus-5-5
     funcion «excel»       6 hojas    3,7 s   219 filas, zip valido

   DOS COSAS QUE NO SON DETALLE:

   1. El Excel y la lectura usan api_preguntar_todo, NUNCA api_preguntar.
      El tope 50 de api_preguntar es el de la PANTALLA. Leyendo 50 de 219 el
      modelo describiria un recorte como si fuera todo: la lista incompleta
      con pinta de completa.

   2. Aca NO hace falta el vale ni la funcion «bajar». Ese rodeo existia
      porque el panel de Apps Script corre dentro de un iframe con sandbox y
      ahi no se puede bajar un blob. Esta pagina no tiene sandbox: el .xlsx
      se arma, se vuelca a un Blob y se baja. Menos piezas, menos que romper.
   --------------------------------------------------------------------------- */
'use strict';

/* El techo del motor de la Ayuda: ayuda.resolver trae hasta 50.000 filas.
   Se pide ese mismo numero para la lectura y para el Excel, asi el archivo
   nunca se lleva menos de lo que dice la pantalla. */
const TOPE_DEL_MOTOR = 50000;

let AY = { pregunta: '', respuesta: null, todo: null, lectura: null, sello: 0, recortado: null };

/* core.js llama calcular() al entrar. Aca no hay nada que calcular. */
async function calcular() { $('q').focus(); }

/* ---------- el texto que escribe el modelo ----------
   Viene de un modelo, asi que se escapa TODO y despues se permiten dos cosas:
   **negrita** y listas con guion. Nada mas. */
const negrita = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

function lecturaHtml(t) {
  const out = [], buf = [], li = [];
  const cerrarP = () => { if (buf.length) { out.push('<p>' + negrita(buf.join(' ')) + '</p>'); buf.length = 0; } };
  const cerrarL = () => { if (li.length) { out.push('<ul>' + li.map(x => '<li>' + negrita(x) + '</li>').join('') + '</ul>'); li.length = 0; } };
  String(t || '').replace(/\r/g, '').split('\n').forEach(linea => {
    const l = linea.trim();
    if (!l) { cerrarP(); cerrarL(); return; }
    const m = l.match(/^[-•·*+]\s+(.*)$/);
    if (m) { cerrarP(); li.push(m[1]); } else { cerrarL(); buf.push(l); }
  });
  cerrarP(); cerrarL();
  return out.join('');
}

/* ---------- valores de la tabla ----------
   Los datos son genericos (cualquier consulta), asi que no se inventa formato:
   los numeros se separan en miles y el resto va tal cual, escapado. */
function valor(v) {
  if (v === null || v === undefined || v === '') return '<span class="ay-nil">—</span>';
  if (typeof v === 'number') return nf0.format(v % 1 === 0 ? v : Math.round(v * 100) / 100)
    .replace(/^(-?[\d.]+)$/, '$1');
  if (typeof v === 'boolean') return v ? 'sí' : 'no';
  if (typeof v === 'object') return esc(JSON.stringify(v));
  /* una fecha ISO se lee al revés acá: 2025-09-30 va como 30/09/2025 */
  const f = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
  if (f) return f[3] + '/' + f[2] + '/' + f[1];
  return esc(v);
}
const esNumero = v => typeof v === 'number';

/* ---------- preguntar ---------- */
async function preguntar(texto) {
  const q = (texto !== undefined ? texto : $('q').value).trim();
  if (!q) { $('q').focus(); return; }
  $('q').value = q;

  const sello = ++AY.sello;                 // una respuesta vieja no pisa a una nueva
  AY = { pregunta: q, respuesta: null, todo: null, lectura: null, sello: sello, recortado: null };

  const b = $('b-preg');
  b.disabled = true; b.textContent = 'Pensando...';
  $('cuerpo').innerHTML = '<div class="ay-esperando">Buscando…</div>';

  let d, ms;
  try {
    const r = await rpc('api_preguntar', { p_texto: q, p_contexto: null });
    d = r.data; ms = r.ms;
  } catch (e) {
    if (sello !== AY.sello) return;
    $('cuerpo').innerHTML = '<div class="aviso">No se pudo preguntar: ' + esc(e.message) + '</div>';
    b.disabled = false; b.textContent = 'Preguntar';
    return;
  }
  if (sello !== AY.sello) return;

  AY.respuesta = d;
  pintar(d, ms);
  b.disabled = false; b.textContent = 'Preguntar';

  /* la lectura corre DESPUES de pintar: la tabla ya esta a la vista */
  if (d && d.entendio === true && d.datos && d.datos.length) pedirLectura(sello);
}

function pintar(d, ms) {
  d = d || {};
  const h = [];
  const entendio = d.entendio === true;
  const hay = entendio && d.datos && d.datos.length;

  /* el sello: de donde salio la respuesta */
  const deIntencion = /funci[oó]n|capa de negocio/i.test(String(d.de_donde || ''));
  const sello = !entendio ? ['no', 'No la entendí']
    : deIntencion ? ['ok', 'Resuelta sin costo — la sé contestar']
      : ['cache', 'Resuelta'];

  h.push('<div class="ay-enc">'
    + '<div class="ay-preg">' + esc(d.pregunta || AY.pregunta) + '</div>'
    + '<span class="ay-sello ' + sello[0] + '">' + esc(sello[1]) + '</span></div>');

  h.push('<div class="ay-resp">' + esc(d.respuesta || 'No llegó respuesta.') + '</div>');

  if (d.aviso) h.push('<div class="aviso">' + esc(d.aviso) + '</div>');

  /* la caja de la lectura, que se completa sola */
  if (hay) h.push('<div class="ay-lectura pensando" id="lectura">'
    + '<div class="enc">La lectura</div>'
    + '<div class="txt">Leyendo las ' + num(d.total || d.filas) + ' filas y escribiendo '
    + 'qué dicen… (tarda cerca de medio minuto)</div></div>');

  if (hay) {
    const cols = d.columnas && d.columnas.length ? d.columnas : Object.keys(d.datos[0]);
    const mostradas = d.datos.length, total = Number(d.total || d.filas || mostradas);

    h.push('<div class="ay-acciones">'
      + '<button class="btn-s" id="b-excel" onclick="bajarExcel()">Bajar a Excel</button>'
      + '<span class="ay-cuenta" id="cuenta-filas">'
      + (total > mostradas
        ? '<b>' + num(mostradas) + ' de ' + num(total) + ' filas</b> en pantalla · '
          + 'el Excel se lleva las ' + num(total)
        : '<b>' + num(mostradas) + ' filas</b>')
      + '</span></div>');

    h.push('<div class="tb-caja"><table><tr>'
      + cols.map(c => '<th' + (esNumero(d.datos[0][c]) ? ' class="num"' : '') + '>'
        + esc(String(c).replace(/_/g, ' ')) + '</th>').join('') + '</tr>'
      + d.datos.map(f => '<tr>' + cols.map(c =>
        '<td' + (esNumero(f[c]) ? ' class="num"' : '') + '>' + valor(f[c]) + '</td>').join('')
        + '</tr>').join('')
      + '</table></div>');
  } else if (entendio) {
    h.push('<div class="aviso">La entendí, pero no hay filas para esa pregunta.</div>');
  }

  /* de donde salio y cuanto tardo */
  h.push('<div class="ay-pie">' + esc(d.de_donde || '')
    + (d.confianza ? ' · confianza ' + esc(d.confianza) : '')
    + ' · la base tardó ' + (ms / 1000).toFixed(2) + ' s'
    + (d.fecha_corte ? ' · datos al ' + esc(d.fecha_corte) : '') + '</div>');

  if (d.sugerencias && d.sugerencias.length) {
    h.push('<div class="ay-sug"><div class="ay-sug-t">También puedo contestar</div>'
      + d.sugerencias.map(s => '<button class="ay-chip" onclick="preguntar(this.dataset.q)" '
        + 'data-q="' + esc(s.pregunta) + '">' + esc(s.pregunta) + '</button>').join('')
      + '</div>');
  }

  $('cuerpo').innerHTML = h.join('');
}


/* ---------- llamar una Edge Function ----------
   NO se usa sb.functions.invoke. El 20/10, con las 12.082 filas de «stock
   cero» (3,2 MB de payload), invoke devolvio «Edge Function returned a non-2xx
   status code» —un cartel que no dice nada— mientras un fetch directo al mismo
   endpoint, con el mismo cuerpo, devolvia 200 y el archivo entero.
   Con fetch se ve el codigo y el cuerpo del error, y se puede reintentar. */
async function llamarFuncion(nombre, cuerpo, intentos = 2) {
  let ultimo = '';
  for (let i = 1; i <= intentos; i++) {
    try {
      const s = (await sb.auth.getSession()).data.session;
      if (!s) throw new Error('La sesion vencio. Volve a entrar.');
      const r = await fetch(SB_URL + '/functions/v1/' + nombre, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
                   'Authorization': 'Bearer ' + s.access_token, 'apikey': SB_KEY },
        body: JSON.stringify(cuerpo)
      });
      const txt = await r.text();
      if (!r.ok) { ultimo = 'HTTP ' + r.status + ' · ' + txt.slice(0, 160); continue; }
      try { return JSON.parse(txt); }
      catch (e) { ultimo = 'contesto algo que no se pudo leer'; continue; }
    } catch (e) { ultimo = String(e.message || e); }
  }
  throw new Error(ultimo || 'no contesto');
}

/* ---------- la lectura ---------- */
async function pedirLectura(sello) {
  let todo;
  try {
    const r = await rpc('api_preguntar_todo',
      { p_texto: AY.pregunta, p_contexto: null, p_tope: TOPE_DEL_MOTOR });
    todo = r.data;
  } catch (e) { return fallaLectura(sello, 'No se pudieron volver a buscar las filas.'); }
  if (sello !== AY.sello) return;
  if (!todo || todo.entendio !== true || !todo.datos || !todo.datos.length)
    return fallaLectura(sello, 'No hay filas que leer.');

  AY.todo = todo;
  AY.recortado = recortado(todo.datos.length);
  /* El contador dice el MISMO total que la respuesta de arriba. Antes decia
     "50 de 5.000" mientras la respuesta decia 12.082: dos numeros de la misma
     pantalla que no coinciden son un defecto aunque los dos esten bien. */
  const c = $('cuenta-filas');
  if (c) c.innerHTML = '<b>' + num(AY.respuesta.datos.length) + ' de ' + num(todo.datos.length)
    + ' filas</b> en pantalla · el Excel y la lectura se llevan las ' + num(todo.datos.length)
    + (AY.recortado ? ' <span class="ay-corte">· ' + AY.recortado + '</span>' : '');
  avisarCorte();

  const q = (todo.entendido && todo.entendido.que) || {};
  const cu = (todo.entendido && todo.entendido.cuando) || {};
  const titulo = [q.titulo, cu.etiqueta].filter(Boolean).join(' · ');

  let data;
  try {
    data = await llamarFuncion('leer',
      { pregunta: AY.pregunta, datos: todo.datos, titulo: titulo, aviso: todo.aviso || '' });
  } catch (e) { return fallaLectura(sello, String(e.message || e)); }
  if (sello !== AY.sello) return;

  if (!data || data.ok !== true || !data.lectura)
    return fallaLectura(sello, (data && data.motivo) || 'La lectura no devolvió texto.');

  AY.lectura = data.lectura;
  const caja = $('lectura');
  if (!caja) return;
  caja.className = 'ay-lectura';
  caja.innerHTML = '<div class="enc">La lectura</div>'
    + '<div class="txt">' + lecturaHtml(data.lectura) + '</div>'
    /* El pie dice SOBRE QUÉ se midió, no cuántas filas vio el modelo.
       La función «leer» calcula los totales EN SQL sobre todas las filas y al
       modelo le pasa el resumen más una muestra; poner «sobre las 59 filas»
       —que es lo que devuelve filas_leidas— hace creer que leyó 59 de 12.082
       y tira abajo una lectura que está bien. */
    + '<div class="ay-pie">Escrita por ' + esc(data.modelo || 'el modelo')
    + ' · los totales salen de una cuenta en la base sobre las '
    + num(todo.datos.length) + ' filas'
    + (data.filas_leidas && data.filas_leidas < todo.datos.length
        ? ' (al modelo se le pasó el resumen más una muestra de ' + num(data.filas_leidas) + ')'
        : '')
    + ' · ' + ((data.ms || 0) / 1000).toFixed(1) + ' s</div>';
}

/* ---------- EL RECORTE, QUE NO SE PUEDE CALLAR ----------
   ARREGLADO EN LA BASE EL 20/10. `ayuda.resolver` envolvía TODA consulta en un
   «limit 2000» escrito a mano y además ataba el límite de la función interna a
   p_tope, así que «cuántos artículos tienen stock cero» contestaba 2.000 y son
   12.082. Una pregunta de CONTAR, contestada con un recorte.

   Ahora v_lim = 50000 (se TRAE mucho) y p_tope sólo decide cuánto se MUESTRA,
   así que `total` dice la verdad: «12.082 filas, se muestran 50».
   Respaldo: `ayuda.resolver_antes_del_20_10_tope2000`.
   Medido sobre las 124 preguntas reales: 0 cambios de intención, 0 de
   comprensión, 0 filas perdidas, 2 preguntas recuperadas, 73,1 s → 72,6 s.

   Queda el techo de 50.000. Si una consulta vuelve con exactamente ese número,
   la pantalla lo dice: un número que puede estar cortado y no lo dice es peor
   que no tenerlo. */
function recortado(n) {
  return n === TOPE_DEL_MOTOR
    ? 'vinieron exactamente ' + num(n) + ': puede haber más' : null;
}
function avisarCorte() {
  if (!AY.recortado) return;
  const caja = $('cuerpo');
  if (!caja || $('corte')) return;
  const d = document.createElement('div');
  d.id = 'corte'; d.className = 'aviso'; d.style.marginTop = '14px';
  d.innerHTML = '<b>Ojo con el total.</b> La consulta devolvió exactamente '
    + num(TOPE_DEL_MOTOR) + ' filas, que es el techo del motor de la Ayuda, '
    + 'no necesariamente todo lo que hay. Las cifras de abajo están bien <b>sobre esas filas</b>; '
    + 'el total real puede ser mayor.';
  const ref = caja.querySelector('.ay-acciones');
  if (ref) ref.parentNode.insertBefore(d, ref); else caja.appendChild(d);
}

function fallaLectura(sello, motivo) {
  if (sello !== AY.sello) return;
  const caja = $('lectura');
  if (!caja) return;
  caja.className = 'ay-lectura nope';
  caja.innerHTML = '<div class="enc">La lectura no salió</div>'
    + '<div class="txt">' + esc(motivo) + ' — la tabla de abajo es igual la buena.</div>';
}

/* ---------- el Excel ----------
   Se baja con un Blob. Sin vale y sin la funcion «bajar»: eso era para el
   sandbox de Apps Script, que aca no existe. */
async function bajarExcel() {
  const b = $('b-excel');
  if (!b || b.disabled) return;
  b.disabled = true; b.textContent = 'Armando el Excel...';
  try {
    let todo = AY.todo;
    if (!todo) {
      const r = await rpc('api_preguntar_todo',
        { p_texto: AY.pregunta, p_contexto: null, p_tope: TOPE_DEL_MOTOR });
      todo = r.data; AY.todo = todo;
    }
    if (!todo || !todo.datos || !todo.datos.length) throw new Error('No hay filas que escribir.');

    const q = (todo.entendido && todo.entendido.que) || {};
    const cu = (todo.entendido && todo.entendido.cuando) || {};
    const data = await llamarFuncion('excel', {
      pregunta: AY.pregunta, datos: todo.datos, lectura: AY.lectura || '',
      titulo: [q.titulo, cu.etiqueta].filter(Boolean).join(' · ')
    });
    if (!data || data.ok !== true || !data.base64) throw new Error(data && data.motivo
      || 'El servidor no devolvió el archivo.');

    const bin = atob(data.base64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    if (!(buf[0] === 0x50 && buf[1] === 0x4B)) throw new Error('El archivo vino dañado.');

    const url = URL.createObjectURL(new Blob([buf],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo(AY.pregunta) + '.xlsx';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);

    b.textContent = 'Bajado · ' + num(data.filas) + ' filas, ' + data.hojas.length + ' hojas';
    setTimeout(() => { b.textContent = 'Bajar a Excel'; }, 6000);
  } catch (e) {
    b.textContent = 'No se pudo: ' + e.message;
    setTimeout(() => { b.textContent = 'Bajar a Excel'; }, 7000);
  } finally {
    b.disabled = false;
  }
}

function nombreArchivo(t) {
  return String(t || 'consulta').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'consulta';
}

window.addEventListener('load', () => {
  const q = $('q');
  if (!q) return;
  q.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) { e.preventDefault(); preguntar(); }
  });
});
