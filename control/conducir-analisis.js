/* ===========================================================================
   EL CONDUCTOR QUE FRENA EN EL PRIMER ERROR DE CREDITO       12/11/2026
   ===========================================================================
   POR QUE EXISTE, Y QUE CAGADA ARREGLA.
   El 12/11 conduje 626 llamadas a `analizar-tabla` con un conductor escrito a
   mano en la consola. Cuando se acabo el credito de la cuenta, la API empezo a
   contestar "credit balance is too low" — y el conductor SIGUIO 92 VECES MAS,
   porque solo frenaba con `origen === 'sin_presupuesto'`, que es MI tope
   interno, no el saldo real. Dos cosas distintas que trate como una.

   Las tres puertas de este archivo, en orden de importancia:

     1. FRENA EN EL PRIMER ERROR DE CREDITO, de cualquier forma que venga:
        'credit balance', 'insufficient', 'too low', 'billing', 'quota',
        HTTP 402. Sin reintentos. Sin "a ver si la proxima anda".
     2. FRENA A LOS 3 FALLOS SEGUIDOS de cualquier clase. Si algo se rompio
        sistematicamente, 300 llamadas mas no lo arreglan: lo pagan.
     3. FRENA EN EL TOPE DECLARADO, medido contra ayuda.presupuesto ANTES de
        empezar y despues de cada tabla. El tope se declara al arrancar y no
        se toca desde adentro.

   Y UNA REGLA QUE NO ES CODIGO: una tabla que falla POR FALTA DE SALDO se
   devuelve a la cola como `pendiente`, NUNCA como `fallo`. Una falla por
   falta de plata no es un defecto de la tabla, y marcarla como tal hace que
   no se reintente nunca y se pierda el analisis.

   COMO SE USA (en la consola del panel, ya logueado):
     __P3.arrancar({ tope_nuevo_usd: 35, max_tablas: 400 })
     __P3.estado()      -> como viene
     __P3.frenar()      -> cortar a mano
   =========================================================================== */

window.__P3 = (function () {
  'use strict';

  var EST = {
    corriendo: false,
    hechas: 0, fallidas: 0, devueltas_a_pendiente: 0,
    frenado_por: null,
    empezo: null, termino: null,
    ultima_tabla: null,
    gasto_al_empezar: null, gasto_ahora: null,
    tope_nuevo_usd: null,
    fallos_seguidos: 0,
    log: []
  };

  function anotar(linea) {
    EST.log.push(new Date().toISOString().slice(11, 19) + ' ' + linea);
    if (EST.log.length > 500) EST.log.shift();
  }

  /* La deteccion es a proposito ANCHA: prefiero frenar de mas que gastar de
     menos. Un falso freno cuesta que yo lo vuelva a arrancar; un freno que no
     salta cuesta la plata del usuario. */
  function esSinCredito(r, textoCrudo) {
    var s = String(textoCrudo || '') + ' ' + JSON.stringify(r || {});
    return /credit\s*balance|insufficient|too\s*low|billing|payment\s*required|\bquota\b|"status"\s*:\s*402|HTTP\s*402/i.test(s);
  }

  function gastoDeHoy() {
    return sb.rpc('api_ia_presupuesto', { p_estimado_usd: 0 })
      .then(function (res) {
        if (res.error) return null;
        var d = res.data || {};
        return (d.usado_usd != null) ? Number(d.usado_usd) : null;
      })
      .catch(function () { return null; });
  }

  function analizar(tabla) {
    return sb.auth.getSession().then(function (s) {
      var ses = s && s.data ? s.data.session : null;
      if (!ses) throw new Error('La sesion vencio. Volve a entrar al panel.');
      return fetch(SB_URL + '/functions/v1/analizar-tabla', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ses.access_token,
          'apikey': SB_KEY
        },
        body: JSON.stringify({ tabla: tabla })
      });
    }).then(function (r) {
      return r.text().then(function (txt) {
        var j = null;
        try { j = JSON.parse(txt); } catch (e) { j = null; }
        return { http: r.status, cuerpo: j, crudo: txt };
      });
    });
  }

  function frenar(motivo) {
    EST.corriendo = false;
    EST.frenado_por = motivo;
    EST.termino = new Date().toISOString();
    anotar('FRENADO: ' + motivo);
  }

  function vuelta(cola, i, opciones) {
    if (!EST.corriendo) return Promise.resolve(EST);
    if (i >= cola.length) { frenar('se terminaron las tablas de esta tanda'); return Promise.resolve(EST); }
    if (EST.hechas + EST.fallidas >= opciones.max_tablas) { frenar('tope de tablas'); return Promise.resolve(EST); }

    var tabla = cola[i];
    EST.ultima_tabla = tabla;

    return analizar(tabla).then(function (res) {
      var c = res.cuerpo || {};

      /* ---- PUERTA 1: SIN CREDITO. Se frena TODO, sin reintentos. ---- */
      if (esSinCredito(c, res.crudo)) {
        EST.devueltas_a_pendiente++;
        anotar(tabla + ' -> SIN CREDITO. Queda pendiente, no es un fallo suyo.');
        frenar('SIN CREDITO EN LA CUENTA — se corto en la tabla ' + tabla +
               ' sin gastar una llamada mas');
        return EST;
      }

      /* ---- PUERTA 1b: mi tope interno ---- */
      if (c.origen === 'sin_presupuesto') {
        EST.devueltas_a_pendiente++;
        frenar('mi tope interno de la base (' + (c.presupuesto && c.presupuesto.motivo || 'sin motivo') + ')');
        return EST;
      }

      /* UNA TABLA ANALIZADA QUE NO SE MARCA SE VUELVE A PAGAR.   12/11/2026
         La primera version de este archivo no anotaba el exito: solo el
         fallo. La cola seguia diciendo `pendiente`, asi que la vuelta
         siguiente pedia LAS MISMAS tablas y las analizaba de nuevo. Medido:
         repitio seccion_previred y cpa135 veinte minutos despues de
         haberlas hecho. Iba a quemar los $28 en cuarenta tablas repetidas.
         El exito se anota con la misma fuerza que el fallo. */
      if (c.ok === true) {
        EST.hechas++;
        EST.fallos_seguidos = 0;
        anotar(tabla + ' -> ' + (c.campos_escritos || 0) + ' campos' +
               ((c.columnas_inventadas && c.columnas_inventadas.length)
                 ? ' · INVENTADAS: ' + c.columnas_inventadas.join(',') : ''));
        return sb.rpc('api_mapa_cola_anotar', {
          p_tabla: tabla, p_estado: 'listo',
          p_campos: c.campos_escritos || 0,
          p_inventadas: (c.columnas_inventadas || []).length
        }).then(seguir, seguir);
      }

      /* Fallo de verdad de esta tabla */
      EST.fallidas++;
      EST.fallos_seguidos++;
      anotar(tabla + ' -> FALLO ' + (c.origen || res.http) + ' · ' +
             String(c.detalle || c.respuesta || res.crudo).slice(0, 120));
      return sb.rpc('api_mapa_cola_anotar', {
        p_tabla: tabla, p_estado: 'fallo',
        p_motivo: String(c.origen || res.http) + ': ' +
                  String(c.detalle || c.respuesta || '').slice(0, 200)
      }).then(seguir, seguir);

      /* ---- PUERTA 2: 3 fallos seguidos ---- */
      function seguir() {
        if (EST.fallos_seguidos >= 3) {
          frenar('3 fallos seguidos — algo se rompio sistematicamente');
          return EST;
        }
        /* ---- PUERTA 3: el tope declarado, medido ---- */
        return gastoDeHoy().then(function (g) {
          if (g != null) {
            EST.gasto_ahora = g;
            var nuevo = g - (EST.gasto_al_empezar || 0);
            if (nuevo >= EST.tope_nuevo_usd) {
              frenar('tope declarado: ya gaste $' + nuevo.toFixed(4) +
                     ' de los $' + EST.tope_nuevo_usd + ' autorizados');
              return EST;
            }
          }
          return vuelta(cola, i + 1, opciones);
        });
      }
    }).catch(function (e) {
      EST.fallidas++;
      EST.fallos_seguidos++;
      anotar(tabla + ' -> EXCEPCION ' + String(e && e.message || e).slice(0, 120));
      if (EST.fallos_seguidos >= 3) { frenar('3 fallos seguidos (excepciones)'); return EST; }
      return vuelta(cola, i + 1, opciones);
    });
  }

  function arrancar(opciones) {
    opciones = opciones || {};
    if (EST.corriendo) return Promise.resolve('ya esta corriendo');

    EST.tope_nuevo_usd = Number(opciones.tope_nuevo_usd || 10);
    opciones.max_tablas = Number(opciones.max_tablas || 400);

    EST.corriendo = true;
    EST.hechas = 0; EST.fallidas = 0; EST.devueltas_a_pendiente = 0;
    EST.fallos_seguidos = 0; EST.frenado_por = null; EST.termino = null;
    EST.empezo = new Date().toISOString();
    EST.log = [];

    return gastoDeHoy().then(function (g) {
      EST.gasto_al_empezar = g;
      EST.gasto_ahora = g;
      anotar('arranca · gasto de hoy al empezar: $' + (g != null ? g : '?') +
             ' · tope nuevo autorizado: $' + EST.tope_nuevo_usd);
      return sb.rpc('api_mapa_pendientes', { p_max: opciones.max_tablas });
    }).then(function (res) {
      if (res.error) { frenar('no pude pedir la cola: ' + res.error.message); return EST; }
      var filas = res.data || [];
      var cola = filas.map(function (f) { return (typeof f === 'string') ? f : (f.tabla || f.nombre); })
                      .filter(Boolean);
      anotar('cola: ' + cola.length + ' tablas');
      if (!cola.length) { frenar('no hay tablas pendientes'); return EST; }
      return vuelta(cola, 0, opciones);
    });
  }

  return {
    arrancar: arrancar,
    frenar: function () { frenar('cortado a mano'); return EST; },
    estado: function () {
      return {
        corriendo: EST.corriendo,
        hechas: EST.hechas,
        fallidas: EST.fallidas,
        devueltas_a_pendiente: EST.devueltas_a_pendiente,
        frenado_por: EST.frenado_por,
        ultima_tabla: EST.ultima_tabla,
        gasto_al_empezar: EST.gasto_al_empezar,
        gasto_ahora: EST.gasto_ahora,
        gastado_en_esta_corrida: (EST.gasto_ahora != null && EST.gasto_al_empezar != null)
          ? Number((EST.gasto_ahora - EST.gasto_al_empezar).toFixed(4)) : null,
        tope_nuevo_usd: EST.tope_nuevo_usd,
        empezo: EST.empezo, termino: EST.termino,
        ultimas: EST.log.slice(-12)
      };
    },
    log: function () { return EST.log; }
  };
})();
