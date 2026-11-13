#!/usr/bin/env bash
# ============================================================================
# EL ARNES DEL ARMADOR DEL RESPALDO
# ============================================================================
# USO:  bash control/respaldo-armar-arnes.sh
#       salida 0 = la puerta ve · salida 1 = la puerta esta ciega
#
# POR QUE
# -------
# El 13/11 la puerta de la frescura comparaba los volcados de `base/` contra
# CUALQUIER commit. Eso la dejaba cortando por algo que no habia pasado: un
# commit de documentacion no envejece un volcado de la base. Se cambio por
# **el ultimo commit que toco `sql/` o `edge/`**.
#
# **Aflojar una puerta sin probar que SIGUE agarrando es apagarla.** Asi que
# este arnes reproduce el defecto real de ese dia con fechas controladas:
#
#   volcado de base/01 ....... 12:39
#   cambio en la base ........ 12:58   (la identidad mapa_sin_secretos)
#   commit que lo registra ... 13:08   (sql/2026-11-13-...)
#
# y exige que la puerta CORTE. Y al reves: con el volcado posterior al commit
# de sql/, y un commit de documentacion DESPUES, exige que NO corte.
#
# Corre sobre un repositorio de mentira en /tmp. No toca el repositorio real.
# ============================================================================
set -uo pipefail

REPO_REAL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

rojo()  { printf '\033[31m%s\033[0m\n' "$*"; }
verde() { printf '\033[32m%s\033[0m\n' "$*"; }

# ---------------------------------------------------------------- el repo falso
R="$TMP/repo"
mkdir -p "$R"/{sql,edge,control,claude}
cd "$R"
git init -q .
git config user.email arnes@ema.local
git config user.name  arnes
cp "$REPO_REAL/control/respaldo-armar.sh"      control/
cp "$REPO_REAL/control/buscar-claves.py"       control/
cp "$REPO_REAL/control/buscar-claves-arnes.py" control/
echo "# reglas de mentira" > CLAUDE.md

# commit 1 — toca sql/ : ES el que marca el ultimo cambio de la base
echo "-- el cambio de la base" > sql/2026-11-13-cambio.sql
git add -A
GIT_AUTHOR_DATE="2026-11-13T13:08:00" GIT_COMMITTER_DATE="2026-11-13T13:08:00" \
  git commit -q -m "el cambio de la base"

# ---------------------------------------------------------------- el respaldo falso
armar_respaldo() {   # $1 = fecha de los archivos de base/
  P="$TMP/resp"; rm -rf "$P"; mkdir -p "$P"/{base,documentos,panel}
  echo "# leeme"  > "$P/00-LEEME.md"
  echo "# reglas" > "$P/documentos/00-CLAUDE-md-LAS-REGLAS.md"
  echo "# indice" > "$P/documentos/00-INDICE-de-los-171-documentos.md"
  echo "-- identidades" > "$P/base/01-identidades-y-funciones-api.sql"
  echo "-- tablas"      > "$P/base/03-estructura-de-todas-las-tablas.sql"
  echo "# edge"         > "$P/base/06-edge-functions-desplegadas.md"
  touch -d "$1" "$P"/base/*
}

# UN ARNES QUE NO PUEDE MOSTRAR LO QUE MIDIO NO SIRVE. La primera version
# hacia `correr | grep -q`, y eso da "no encontro" tanto si el mensaje no
# esta como si el comando **no imprimio nada**: dos de sus OK eran falsos.
# Ahora la salida se guarda, se exige que NO este vacia, y cuando un caso
# falla se imprime lo que de verdad dijo el armador.
SALIDA=""
correr() {
  SALIDA="$(cd "$R" && bash control/respaldo-armar.sh "$TMP/resp" "$TMP/salida.zip" 2>&1)"
  if [ -z "$SALIDA" ]; then
    rojo "  ***  EL ARMADOR NO IMPRIMIO NADA. El arnes esta midiendo otra cosa."
    return 1
  fi
  return 0
}
dijo() { printf '%s' "$SALIDA" | grep -q "$1"; }
mostrar() { printf '%s\n' "$SALIDA" | sed 's/^/         | /' | head -12; }

fallas=0
echo "ARNES DEL ARMADOR DEL RESPALDO"
echo

# --- CASO 1: el defecto real del 13/11. Volcado 12:39, cambio de base 13:08.
armar_respaldo "2026-11-13 12:39:00"
correr || fallas=$((fallas+1))
if dijo "se volcó ANTES del último cambio de la base"; then
  verde "  OK   el volcado viejo (12:39 contra 13:08) CORTA"
else
  rojo  "  ***  SE LE ESCAPO el volcado viejo: la puerta esta ciega"; mostrar; fallas=$((fallas+1))
fi

# --- CASO 2: volcado posterior al cambio de la base -> esa puerta NO corta.
armar_respaldo "2026-11-13 13:30:00"
correr || fallas=$((fallas+1))
if dijo "se volcó ANTES del último cambio de la base"; then
  rojo  "  ***  CORTO EN FALSO con un volcado posterior al cambio"; mostrar; fallas=$((fallas+1))
else
  verde "  OK   el volcado fresco (13:30 contra 13:08) no corta"
fi

# --- CASO 3: EL QUE ORIGINO EL CAMBIO. Un commit de DOCUMENTACION posterior
#     no tiene que envejecer un volcado que es posterior al cambio de la base.
echo "una nota" > claude/NOTA.md
git add -A
GIT_AUTHOR_DATE="2026-11-13T15:46:00" GIT_COMMITTER_DATE="2026-11-13T15:46:00" \
  git commit -q -m "una nota, no toca la base"
armar_respaldo "2026-11-13 13:30:00"
correr || fallas=$((fallas+1))
if dijo "se volcó ANTES del último cambio de la base"; then
  rojo  "  ***  CORTO por un commit de documentacion: es el defecto que se arreglo"; mostrar; fallas=$((fallas+1))
else
  verde "  OK   un commit de documentacion NO envejece el volcado"
fi

# --- CASO 4: y si vuelve a tocarse sql/, el mismo volcado SI queda viejo.
echo "-- otro cambio" > sql/2026-11-13-otro.sql
git add -A
GIT_AUTHOR_DATE="2026-11-13T16:00:00" GIT_COMMITTER_DATE="2026-11-13T16:00:00" \
  git commit -q -m "otro cambio de la base"
armar_respaldo "2026-11-13 13:30:00"
correr || fallas=$((fallas+1))
if dijo "se volcó ANTES del último cambio de la base"; then
  verde "  OK   un commit de sql/ SI envejece el volcado"
else
  rojo  "  ***  NO CORTO con un cambio de sql/ posterior: la puerta se aflojo de mas"; mostrar; fallas=$((fallas+1))
fi

# --- CASO 5: repositorio sucio -> corta antes de todo.
echo "sucio" > sql/sin-commitear.sql
armar_respaldo "2026-11-13 16:30:00"
correr || fallas=$((fallas+1))
if dijo "cambios sin commitear"; then
  verde "  OK   el repositorio sucio corta"
else
  rojo  "  ***  NO CORTO con el repositorio sucio"; mostrar; fallas=$((fallas+1))
fi

echo
if [ "$fallas" -gt 0 ]; then
  rojo "EL ARMADOR ESTA CIEGO EN $fallas caso(s). No sirve de nada que diga LISTO."
  exit 1
fi
verde "PASA: la puerta de la frescura ve lo que tiene que ver y no corta por lo que no."
