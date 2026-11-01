/* =====================================================================
   LA PUERTA SE ENCHUFA SOLA                                 01/11/2026
   =====================================================================
   `core.hooksPath` es configuracion LOCAL del clon: no se versiona. El
   contenedor de trabajo se rehace cada sesion, asi que el pre-push que
   existia desde el 28/10 se desenchufaba solo todos los dias y NUNCA
   HABIA CORRIDO hasta el 31/10. Una puerta que depende de que alguien se
   acuerde de un comando no es una puerta.

   El 31/10 esto quedo adentro de control/pantallas.js, y ahi tenia un
   agujero que se ve recien cuando se lo mira de frente: pantallas.js se
   enchufa cuando CORRE, y corre por el hook, que es justamente lo que hay
   que enchufar. Circular.

   Por eso vive aca y lo llaman LOS CINCO controles: correr cualquiera de
   ellos a mano, una sola vez, deja la puerta puesta para todo lo que
   venga despues. Lo que queda, declarado: en una copia nueva del
   repositorio donde nadie corra ningun control a mano, la puerta sigue
   desenchufada. El unico comando que lo arregla de entrada es
       git config core.hooksPath .githooks
   ===================================================================== */
const { execSync } = require('child_process');
const path = require('path');

function enchufar(){
  const raiz = path.join(__dirname, '..');
  try {
    const actual = execSync('git config core.hooksPath || true', { cwd: raiz })
                     .toString().trim();
    if (actual === '.githooks') return;
    execSync('git config core.hooksPath .githooks', { cwd: raiz });
    console.log('AVISO: el pre-push estaba DESENCHUFADO (core.hooksPath = "'
              + (actual || 'sin configurar') + '"). Lo enchufe: .githooks\n');
  } catch (e){
    console.log('AVISO: no pude revisar el pre-push: ' + e.message + '\n');
  }
}

module.exports = { enchufar };
