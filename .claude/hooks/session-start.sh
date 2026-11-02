#!/bin/bash
# =====================================================================
# EL ESTADO DEL SISTEMA LLEGA SOLO AL ARRANCAR LA SESION    02/11/2026
# =====================================================================
# POR QUE EXISTE. Es el reclamo de fondo del usuario, textual:
#
#   "QUE SI TE PREGUNTO, LO PROBASTE, FUNCIONA, LO PROBAS FUNCIONA,
#    CUANDO TE VUELVA A PREGUNTAR, ME CONTESTES AL INSTANTE, SI ESTA
#    PROBADO, FUNCIONA, NO ME MIENTAS MAS"
#
# El 01/11 quedo armado el registro que contesta eso sin pasar por la
# memoria de nadie: ema.control_corrida + api_estado_del_sistema(). Y
# CLAUDE.md dice, arriba de todo, que lo primero de cada sesion es correr
# dos comandos. Pero eso es una REGLA SOBRE LA CONDUCTA DEL ASISTENTE, y
# de esas se rompieron dieciseis. Mientras el estado haya que ir a
# buscarlo, el dia que no se acuerde contesta de memoria otra vez.
#
# Esto lo imprime ANTES de que la sesion pueda decir una palabra. No
# obliga a ser sincero: obliga a haber MIRADO, que es lo que faltaba.
#
# POR QUE EN EL REPOSITORIO: `core.hooksPath` es configuracion local del
# clon y no se versiona — por eso el pre-push estuvo desenchufado sin que
# nadie lo supiera hasta el 31/10. Un hook en .claude/ del repositorio
# viaja con el repositorio.
#
# NO INSTALA NADA Y NO FALLA A PROPOSITO. Sale siempre con 0: un hook de
# arranque que corta deja la sesion sin arrancar, y eso seria peor que no
# tenerlo. Si no puede leer la base lo DICE, que es informacion, no
# silencio: "no saber NO es que ande".
#
# Se prueba corriendolo a mano, que es lo que pide el procedimiento:
#     CLAUDE_PROJECT_DIR=. ./.claude/hooks/session-start.sh
# =====================================================================
set -u

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || true

if ! command -v node >/dev/null 2>&1; then
  echo "ESTADO DEL SISTEMA DISSAN: no hay node en esta sesion, asi que NO se"
  echo "  pudo leer el estado. No saber NO es que ande: si preguntan"
  echo "  \"probaste? funciona?\", la respuesta es NO hasta medirlo."
  exit 0
fi

node control/estado.js 2>&1 || true
exit 0
