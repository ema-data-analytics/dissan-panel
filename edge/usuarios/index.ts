// SEGURIDAD: USUARIOS Y PERMISOS, para el panel que NO corre en Apps Script.  21/10/2026
//
// ---------------------------------------------------------------------------
// POR QUE ESTO EXISTE
//
// Todo el modulo Seguridad del panel viejo usa SUPABASE_SERVICE_KEY: listar
// perfiles, crear usuarios en /auth/v1/admin/users, cambiar email, cambiar
// contrasena y dar de baja. Eso en el panel nuevo NO puede vivir en el
// navegador: el repositorio es publico y la clave de servicio nunca entra ahi.
//
// Aca la clave la pone Supabase en el entorno (SUPABASE_SERVICE_ROLE_KEY) y no
// sale nunca de esta funcion. La funcion se despliega con verify_jwt, asi que
// sin sesion no se llega; y ademas, adentro, se exige que el que llama tenga
// rol super y este activo, igual que exigirSuper_() del panel viejo.
//
// ---------------------------------------------------------------------------
// LAS REGLAS SON LAS DE ANTES, MEDIDAS EN EL CODIGO VIEJO
//
//  · Solo un super entra. (exigirSuper_)
//  · No se puede dejar el sistema sin administrador: no se da de baja ni se le
//    saca el rol al ULTIMO super activo, y nadie se lo puede sacar a si mismo.
//    (puedeTocarA_, comentario S7 del codigo viejo)
//  · La contrasena, 12 caracteres como minimo. El panel viejo pedia 12 al
//    crear y 6 al cambiar; se unifica en 12, que es la mas estricta de las dos
//    y no le quita nada a nadie.
//  · Los roles validos NO se escriben aca: salen de api_roles_v2(), que los
//    lee de la tabla modulos. El formulario viejo ofrecia 'usuario', que el
//    servidor viejo rechazaba, y no ofrecia ni gerencia ni consulta ni
//    operador -- que es el rol real del usuario de DISSAN.
// ---------------------------------------------------------------------------

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const CLAVE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MINIMO_CLAVE = 12;

// Los roles que pueden administrar usuarios desde este modulo. El rol pruebas es el
// rol del dueno del sistema y se agrego el 28/10/2026: adentro de esta funcion
// tiene el mismo poder que super, porque lo pidio el dueno. Los candados de
// negocio NO cambian: el del ultimo administrador sigue contando los super.
const ROLES_QUE_ADMINISTRAN = ["super", "pruebas"];

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const cabServicio = {
  "Content-Type": "application/json",
  apikey: CLAVE,
  Authorization: `Bearer ${CLAVE}`,
};

async function rest(ruta: string, init: RequestInit = {}) {
  const r = await fetch(`${URL_SB}/rest/v1/${ruta}`, {
    ...init,
    headers: { ...cabServicio, ...(init.headers || {}) },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.substring(0, 300)}`);
  return t ? JSON.parse(t) : null;
}

async function rpc(nombre: string, args: Record<string, unknown> = {}) {
  return await rest(`rpc/${nombre}`, { method: "POST", body: JSON.stringify(args) });
}

async function admin(ruta: string, init: RequestInit = {}) {
  const r = await fetch(`${URL_SB}/auth/v1/admin/${ruta}`, {
    ...init,
    headers: { ...cabServicio, ...(init.headers || {}) },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.substring(0, 300)}`);
  return t ? JSON.parse(t) : null;
}

/** Quien llama, segun SU token. Devuelve el perfil solo si es super y esta activo. */
async function exigirSuper(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    return { ok: false, motivo: "Falta la sesion." };
  }
  const r = await fetch(`${URL_SB}/auth/v1/user`, {
    headers: { apikey: CLAVE, Authorization: auth },
  });
  if (!r.ok) return { ok: false, motivo: "La sesion no es valida o vencio." };
  const u = await r.json();
  if (!u?.id) return { ok: false, motivo: "La sesion no identifica a nadie." };

  const filas = await rest(`perfiles?select=id,nombre,email,rol,activo&id=eq.${u.id}`);
  const yo = Array.isArray(filas) ? filas[0] : null;
  if (!yo) return { ok: false, motivo: "Tu usuario no tiene perfil cargado." };
  if (!yo.activo) return { ok: false, motivo: "Tu usuario esta dado de baja." };
  if (!ROLES_QUE_ADMINISTRAN.includes(yo.rol)) {
    return { ok: false, motivo: `Este modulo es solo para administradores. Entraste como ${yo.rol}.` };
  }
  return { ok: true, yo };
}

async function rolesValidos(): Promise<string[]> {
  const filas = await rpc("api_roles_v2");
  return (filas || []).map((f: any) => String(f.rol));
}

/** No dejar el sistema sin administrador. Es el puedeTocarA_ del panel viejo. */
async function puedeTocar(yo: any, id: string, quitaSuper: boolean) {
  if (!quitaSuper) return { ok: true };
  const filas = await rest(`perfiles?select=id,rol,activo&id=eq.${id}`);
  const d = Array.isArray(filas) ? filas[0] : null;
  if (!d) return { ok: false, motivo: "El usuario no existe." };
  if (d.rol !== "super" || !d.activo) return { ok: true };
  const supers = await rest("perfiles?select=id&rol=eq.super&activo=eq.true");
  const quedan = Array.isArray(supers) ? supers.length : -1;
  if (quedan < 0) {
    return { ok: false, motivo: "No se pudo verificar cuantos administradores quedan. Operacion cancelada." };
  }
  if (quedan <= 1) {
    return { ok: false, motivo: "Es el ultimo administrador activo. Nombra otro super antes de sacarle el rol o darlo de baja." };
  }
  if (String(id) === String(yo.id)) {
    return { ok: false, motivo: "No podes sacarte a vos mismo el rol de administrador. Pediselo a otro super." };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const t0 = Date.now();

  try {
    const permiso = await exigirSuper(req);
    if (!permiso.ok) return json({ ok: false, motivo: permiso.motivo }, 403);
    const yo = permiso.yo;

    const cuerpo = await req.json().catch(() => ({}));
    const accion = String(cuerpo?.accion ?? "").trim();
    const id = String(cuerpo?.id ?? "").trim();

    if (accion === "listar") {
      const usuarios = await rest(
        "perfiles?select=id,nombre,email,rol,activo,creado&order=nombre.asc");
      const roles = await rpc("api_roles_v2");
      return json({ ok: true, usuarios, roles, yo: yo.id, ms: Date.now() - t0 });
    }

    if (accion === "crear") {
      const nombre = String(cuerpo?.nombre ?? "").trim();
      const email = String(cuerpo?.email ?? "").trim().toLowerCase();
      const clave = String(cuerpo?.password ?? "");
      const rol = String(cuerpo?.rol ?? "").trim();
      if (!nombre || !email || !clave || !rol) return json({ ok: false, motivo: "Faltan datos." });
      const validos = await rolesValidos();
      if (!validos.includes(rol)) {
        return json({ ok: false, motivo: `Rol invalido. Los validos son: ${validos.join(", ")}.` });
      }
      if (clave.length < MINIMO_CLAVE) {
        return json({ ok: false, motivo: `La contrasena tiene que tener al menos ${MINIMO_CLAVE} caracteres.` });
      }
      const creado = await admin("users", {
        method: "POST",
        body: JSON.stringify({ email, password: clave, email_confirm: true }),
      });
      if (!creado?.id) return json({ ok: false, motivo: "Auth no devolvio el id del usuario nuevo." });
      try {
        await rest("perfiles", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ id: creado.id, nombre, email, rol, activo: true }),
        });
      } catch (e) {
        // El usuario quedo en Auth sin perfil: se avisa con el id para no dejar un huerfano
        // invisible. No se borra nada desde aca.
        return json({ ok: false,
          motivo: `El usuario se creo en Auth (id ${creado.id}) pero no se pudo cargar su perfil: ${String((e as Error).message)}` });
      }
      return json({ ok: true, id: creado.id, ms: Date.now() - t0 });
    }

    if (accion === "perfil") {
      const nombre = String(cuerpo?.nombre ?? "").trim();
      const rol = String(cuerpo?.rol ?? "").trim();
      if (!id || !nombre || !rol) return json({ ok: false, motivo: "Faltan datos." });
      const validos = await rolesValidos();
      if (!validos.includes(rol)) {
        return json({ ok: false, motivo: `Rol invalido. Los validos son: ${validos.join(", ")}.` });
      }
      const g = await puedeTocar(yo, id, rol !== "super");
      if (!g.ok) return json({ ok: false, motivo: g.motivo });
      await rest(`perfiles?id=eq.${id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ nombre, rol }),
      });
      return json({ ok: true, ms: Date.now() - t0 });
    }

    if (accion === "email") {
      const email = String(cuerpo?.email ?? "").trim().toLowerCase();
      if (!id || !email) return json({ ok: false, motivo: "Faltan datos." });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return json({ ok: false, motivo: "Ese email no tiene forma de email." });
      }
      await admin(`users/${id}`, {
        method: "PUT",
        body: JSON.stringify({ email, email_confirm: true }),
      });
      await rest(`perfiles?id=eq.${id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ email }),
      });
      return json({ ok: true, ms: Date.now() - t0 });
    }

    if (accion === "password") {
      const clave = String(cuerpo?.password ?? "");
      if (!id || !clave) return json({ ok: false, motivo: "Faltan datos." });
      if (clave.length < MINIMO_CLAVE) {
        return json({ ok: false, motivo: `La contrasena tiene que tener al menos ${MINIMO_CLAVE} caracteres.` });
      }
      await admin(`users/${id}`, { method: "PUT", body: JSON.stringify({ password: clave }) });
      return json({ ok: true, ms: Date.now() - t0 });
    }

    if (accion === "estado") {
      const activo = cuerpo?.activo === true;
      if (!id) return json({ ok: false, motivo: "Faltan datos." });
      const g = await puedeTocar(yo, id, activo === false);
      if (!g.ok) return json({ ok: false, motivo: g.motivo });
      await rest(`perfiles?id=eq.${id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ activo }),
      });
      return json({ ok: true, ms: Date.now() - t0 });
    }

    if (accion === "probar") {
      // Control de que la funcion esta viva y de quien soy, sin tocar nada.
      return json({ ok: true, soy: { id: yo.id, email: yo.email, rol: yo.rol },
                    roles: await rolesValidos(), ms: Date.now() - t0 });
    }

    return json({ ok: false, motivo: `No se que es la accion "${accion}".` });
  } catch (e) {
    return json({ ok: false, origen: "excepcion",
                  motivo: String((e as Error)?.message ?? e),
                  ms: Date.now() - t0 }, 500);
  }
});
