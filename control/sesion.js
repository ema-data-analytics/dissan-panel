/* LA SESION DE LOS CONTROLES — CLAUDEBASE.                       16/11/2026
   =========================================================================

   POR QUE EXISTE

   Hasta hoy mis controles entraban a la base con la clave *publishable*, o
   sea COMO CUALQUIER ANONIMO. Andaban. Y andaban porque la base entera estaba
   abierta: medido hoy, 667 de 678 tablas y 170 funciones las podia leer
   -y borrar- cualquiera que mirara el codigo del panel, que es publico.
   Que mis controles entraran sin sesion no era una comodidad: era el agujero.

   Cerrado eso, los controles tienen que entrar como entra una persona: con
   usuario y contrasenia, por /auth/v1/token, y hablar con la base como rol
   `authenticated`. Es ademas lo correcto por otro motivo: un control que
   entra con MAS permiso que el usuario no esta probando lo que ve el usuario.

   LA CONTRASENIA NO ESTA ACA NI EN NINGUN ARCHIVO DEL REPOSITORIO

   Vive en un archivo fuera del repositorio, que se crea solo y al azar la
   primera vez. El repositorio se sirve PUBLICO por GitHub Pages: "ningun vale,
   token ni clave se escribe en un archivo del repositorio, aunque venza en
   tres horas". Si el archivo no esta, esto no inventa nada ni sigue de
   taquito: dice que no hay sesion y el control que lo use tiene que declarar
   que NO MIDIO. No medido no es limpio.

   EL USUARIO ES DE SOLO LECTURA y su rol es `pruebas`, el unico que entra a
   todos los modulos activos. No es admin y no puede tocar usuarios. */

const fs = require('fs'), path = require('path');

const BASE = 'https://hwgfmpvszdohnzqtwscw.supabase.co';
const CORREO = 'claudebase@dissan.com.ar';

/* La clave publishable NO se escribe aca: se lee del panel, que es donde
   vive de verdad. Si el dia de maniana se rota, esto la toma sola. */
function clavePublica(){
  const raiz = path.resolve(__dirname, '..');
  for (const f of ['js/core.js', 'index.html']){
    try {
      const m = fs.readFileSync(path.join(raiz, f), 'utf8')
                  .match(/sb_publishable_[A-Za-z0-9_-]+/);
      if (m) return m[0];
    } catch (e) { /* sigue con el proximo */ }
  }
  throw new Error('no encontre la clave publishable en el panel');
}

/* DONDE BUSCA LA CLAVE, en este orden. Ninguno de estos caminos esta adentro
   del repositorio, que se sirve PUBLICO por GitHub Pages. */
function archivoClave(){
  if (process.env.CLAUDEBASE_PW) return process.env.CLAUDEBASE_PW;
  const donde = ['/home/claude/.claudebase.pw',
                 path.join(process.env.HOME || '/root', '.claudebase.pw')];
  for (const f of donde) if (fs.existsSync(f)) return f;
  return donde[0];
}

let cache = null;

/** Devuelve { ok, token, clave, porque }. NUNCA tira: el que llama decide. */
async function entrar(){
  if (cache) return cache;
  let clave;
  try { clave = clavePublica(); }
  catch (e) { return (cache = { ok:false, porque: e.message }); }

  const f = archivoClave();
  if (!fs.existsSync(f)){
    return (cache = { ok:false, clave, porque:
      'no hay sesion para los controles: falta ' + f + '. Sin eso no se puede ' +
      'medir nada contra la base, y NO MEDIDO NO ES LIMPIO.' });
  }
  const pw = fs.readFileSync(f, 'utf8').trim();

  try {
    const r = await fetch(BASE + '/auth/v1/token?grant_type=password', {
      method:'POST',
      headers:{ apikey: clave, 'Content-Type':'application/json' },
      body: JSON.stringify({ email: CORREO, password: pw })
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.access_token){
      return (cache = { ok:false, clave, porque:
        'no pude entrar como ' + CORREO + ': HTTP ' + r.status + ' ' +
        String((j && (j.error_description || j.msg || j.error)) || '').slice(0,120) });
    }
    return (cache = { ok:true, clave, token: j.access_token });
  } catch (e) {
    return (cache = { ok:false, clave, porque: 'no llegue a la base: ' + e.message });
  }
}

/** Llama una funcion de la base COMO LA LLAMA EL PANEL: con la sesion puesta.
    Devuelve { ok, http, datos, porque }. */
async function rpc(nombre, args){
  const s = await entrar();
  if (!s.ok) return { ok:false, http:0, porque: s.porque };
  try {
    const r = await fetch(BASE + '/rest/v1/rpc/' + nombre, {
      method:'POST',
      headers:{ apikey: s.clave, Authorization: 'Bearer ' + s.token,
                'Content-Type':'application/json' },
      body: JSON.stringify(args || {})
    });
    const t = await r.text();
    let d = null; try { d = t ? JSON.parse(t) : null; } catch (e) { d = t; }
    if (!r.ok) return { ok:false, http:r.status, datos:d,
                        porque: nombre + ' contesto HTTP ' + r.status + ': ' + t.slice(0,180) };
    return { ok:true, http:r.status, datos:d };
  } catch (e) {
    return { ok:false, http:0, porque: 'no llegue a la base llamando ' + nombre + ': ' + e.message };
  }
}

/* Las cabeceras que manda el panel: la clave publishable MAS la sesion.
   Si no hay sesion van sin Authorization, o sea como anonimo — y entonces la
   base contesta 401 y el control que la use tiene que CANTARLO, no taparlo.
   Ese 401 es informacion: dice que el control esta intentando entrar por donde
   ya no se puede, que es exactamente lo que se cerro hoy. */
async function cabeceras(){
  const s = await entrar();
  const h = { 'Content-Type': 'application/json' };
  try { h.apikey = s.clave || clavePublica(); } catch (e) { /* sin clave */ }
  if (s.ok) h.Authorization = 'Bearer ' + s.token;
  return h;
}

/* Para que un control pueda DECLARAR en su `midio:` con que entro, en vez de
   dejarlo a la imaginacion del que lee. */
async function conQueEntre(){
  const s = await entrar();
  return s.ok ? 'con la sesion de ' + CORREO + ' (rol authenticated, como el panel)'
              : 'SIN SESION (' + s.porque + ')';
}

module.exports = { entrar, rpc, cabeceras, conQueEntre, BASE, CORREO,
                   archivoClave, clavePublica };
