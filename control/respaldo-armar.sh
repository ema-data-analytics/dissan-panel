#!/usr/bin/env bash
# ============================================================================
# ARMADOR DEL RESPALDO — con la puerta que me faltó el 13/11/2026
# ============================================================================
#
# POR QUE EXISTE
# --------------
# El 13/11 armé el respaldo y lo entregué con DOS archivos viejos adentro:
#   * `base/01-identidades-y-funciones-api.sql` volcado a las 12:39, antes de
#     arreglar la identidad `mapa_sin_secretos` a las 12:58.
#   * `panel/` sacado de `git archive HEAD` ANTES del commit f4260a8.
#
# Las dos veces el paquete se abría bien, pesaba lo mismo y pasaba el escáner
# de secretos. **Un paquete íntegro puede estar entero y viejo**: la integridad
# no dice nada sobre la frescura.
#
# LA PUERTA
# ---------
# Se corta si:
#   1. El repositorio tiene cambios sin commitear  -> el panel/ no sería HEAD.
#   2. El repositorio tiene commits sin pushear    -> el panel/ no estaría vivo.
#   3. Algún `base/*.sql` es MAS VIEJO que el commit de HEAD -> se volcó antes
#      del último cambio, que es exactamente lo que pasó hoy.
#   4. Falta alguno de los archivos obligatorios.
#   5. El escáner de secretos encuentra algo.
#
# USO:  bash control/respaldo-armar.sh <carpeta-del-respaldo> <salida.tar.gz>
# ============================================================================

set -euo pipefail

RESP="${1:?falta la carpeta del respaldo}"
SALIDA="${2:?falta el archivo de salida}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

rojo()  { printf '\033[31m%s\033[0m\n' "$*"; }
verde() { printf '\033[32m%s\033[0m\n' "$*"; }

echo "== ARMADOR DEL RESPALDO =="
echo "   repositorio: $REPO"
echo "   respaldo:    $RESP"

# ---------------------------------------------------------------- 1 y 2
cd "$REPO"
if [ -n "$(git status --porcelain)" ]; then
  rojo "CORTA: el repositorio tiene cambios sin commitear."
  rojo "       panel/ saldría de HEAD y no sería lo que está en el árbol."
  git status --short
  exit 1
fi
if [ -n "$(git log --oneline '@{u}..HEAD' 2>/dev/null)" ]; then
  rojo "CORTA: hay commits sin pushear. El respaldo guardaría código que"
  rojo "       todavía no pasó las 16 puertas y no está publicado."
  git log --oneline '@{u}..HEAD'
  exit 1
fi
COMMIT="$(git rev-parse HEAD)"
COMMIT_EPOCH="$(git log -1 --format=%ct HEAD)"
verde "OK  el repositorio está limpio y pusheado — HEAD ${COMMIT:0:7}"

# ---------------------------------------------------------------- 3
# LA QUE ME FALTABA: un volcado de la base anterior al último commit es viejo.
viejos=0
shopt -s nullglob
for f in "$RESP"/base/*.sql "$RESP"/base/*.md; do
  f_epoch="$(stat -c %Y "$f")"
  if [ "$f_epoch" -lt "$COMMIT_EPOCH" ]; then
    rojo "CORTA: $(basename "$f") se volcó ANTES del commit de HEAD."
    rojo "       volcado: $(date -d "@$f_epoch" '+%d/%m %H:%M:%S')  ·  commit: $(date -d "@$COMMIT_EPOCH" '+%d/%m %H:%M:%S')"
    viejos=$((viejos+1))
  fi
done
if [ "$viejos" -gt 0 ]; then
  rojo ""
  rojo "$viejos archivo(s) de base/ más viejos que el último commit."
  rojo "Volver a volcarlos ANTES de empaquetar. Un paquete entero puede estar viejo."
  exit 1
fi
verde "OK  los $(ls "$RESP"/base/* | wc -l) archivos de base/ son posteriores al commit"

# ---------------------------------------------------------------- 4
faltan=0
for obligatorio in \
    "00-LEEME.md" \
    "documentos/00-CLAUDE-md-LAS-REGLAS.md" \
    "documentos/00-INDICE-de-los-171-documentos.md" \
    "base/01-identidades-y-funciones-api.sql" \
    "base/03-estructura-de-todas-las-tablas.sql" \
    "base/06-edge-functions-desplegadas.md" ; do
  if [ ! -f "$RESP/$obligatorio" ]; then
    rojo "CORTA: falta $obligatorio"; faltan=$((faltan+1))
  fi
done
[ "$faltan" -gt 0 ] && exit 1
verde "OK  están los archivos obligatorios"

# ---------------------------------------------------------------- panel al día
rm -rf "$RESP/panel"; mkdir -p "$RESP/panel"
git archive HEAD | tar -x -C "$RESP/panel"
cp "$REPO/CLAUDE.md" "$RESP/documentos/00-CLAUDE-md-LAS-REGLAS.md"
verde "OK  panel/ rearmado desde HEAD ${COMMIT:0:7} — $(find "$RESP/panel" -type f | wc -l) archivos"

# ---------------------------------------------------------------- 5 secretos
ESC="$(mktemp -d)/buscar-claves.py"
cat > "$ESC" <<'PY'
import os, re, sys, json
RAIZ = sys.argv[1]
PATRONES = [
 ("PEM en claro",      re.compile(rb'-----BEGIN [A-Z ]*PRIVATE KEY-----[^A-Za-z0-9+/]{0,8}[A-Za-z0-9+/]{40,}')),
 ("PEM en HEXA",       re.compile(rb'2[dD]2[dD]2[dD]2[dD]2[dD]424547494[eE]')),
 ("JWT",               re.compile(rb'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}')),
 ("clave Anthropic",   re.compile(rb'sk-ant-[A-Za-z0-9_-]{10,}')),
 ("service_role nuevo",re.compile(rb'sb_secret_[A-Za-z0-9_-]{10,}')),
 ("token GitHub",      re.compile(rb'gh[pousr]_[A-Za-z0-9]{20,}')),
 ("clave AWS",         re.compile(rb'AKIA[0-9A-Z]{16}')),
 ("service_role viejo",re.compile(rb'"role"\s*:\s*"service_role"')),
]
PERMITIDO = re.compile(rb'sb_publishable_')   # esta SI va en el repo
hall = []
for dirp, dirs, files in os.walk(RAIZ):
    dirs[:] = [d for d in dirs if d not in ('.git','node_modules','__pycache__')]
    for f in files:
        p = os.path.join(dirp, f)
        try: b = open(p,'rb').read()
        except Exception: continue
        for nombre, rx in PATRONES:
            for m in rx.finditer(b):
                if PERMITIDO.search(b[max(0,m.start()-40):m.start()+60]): continue
                hall.append((os.path.relpath(p,RAIZ), nombre))
print(json.dumps(hall))
PY
HALL="$(python3 -I "$ESC" "$RESP")"
if [ "$HALL" != "[]" ]; then
  rojo "CORTA: el escáner de secretos encontró algo:"; echo "$HALL"; exit 1
fi
verde "OK  escáner de secretos (8 clases): cero"

# ---------------------------------------------------------------- manifiesto
{
  echo "# MANIFIESTO — $(date '+%d/%m/%Y %H:%M:%S')"
  echo
  echo "commit: \`$COMMIT\` ($(date -d "@$COMMIT_EPOCH" '+%d/%m/%Y %H:%M:%S'))"
  echo
  echo "| archivo | bytes | sha256 |"
  echo "|---|---|---|"
  (cd "$RESP" && find . -type f ! -name 'MANIFIESTO.md' | sort | while read -r f; do
     printf '| `%s` | %s | `%s` |\n' "${f#./}" "$(stat -c %s "$f")" "$(sha256sum "$f" | cut -c1-16)"
   done)
} > "$RESP/MANIFIESTO.md"
verde "OK  manifiesto escrito"

# ---------------------------------------------------------------- empaquetar
rm -f "$SALIDA"
tar -czf "$SALIDA" -C "$(dirname "$RESP")" "$(basename "$RESP")"

# y SE ABRE: no se entrega un archivo sin abrirlo
TMP="$(mktemp -d)"
tar -xzf "$SALIDA" -C "$TMP"
if ! diff -r "$RESP" "$TMP/$(basename "$RESP")" > /dev/null; then
  rojo "CORTA: el tar.gz NO reproduce la carpeta original."
  diff -r "$RESP" "$TMP/$(basename "$RESP")" | head -20
  exit 1
fi
rm -rf "$TMP"

echo
verde "LISTO  $SALIDA"
verde "       $(find "$RESP" -type f | wc -l) archivos · $(stat -c %s "$SALIDA") bytes"
verde "       abierto y comparado contra el original: 0 diferencias"
verde "       sha256: $(sha256sum "$SALIDA" | cut -d' ' -f1)"
