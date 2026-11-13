#!/usr/bin/env python3
# ============================================================================
# EL ESCANER DE SECRETOS — una sola copia, en el repositorio
# ============================================================================
# USO:  python3 -I control/buscar-claves.py <carpeta>
#       salida 0 = limpio · salida 1 = encontro algo
#
# POR QUE ESTA ACA Y NO ADENTRO DEL ARMADOR
# -----------------------------------------
# El 13/11 lo escribi embebido en control/respaldo-armar.sh y ademas suelto en
# mi carpeta de trabajo. **Dos copias de la misma cosa se separan con el
# tiempo**: paso el 30/10 con la Edge Function `listas`, cuando un arreglo que
# no entro al repositorio se perdio en el despliegue siguiente. Una copia, en
# el repositorio, que llaman los dos.
#
# LA REGLA QUE LO HACE SERVIR: UN SECRETO DE VERDAD ES LARGO
# ----------------------------------------------------------
# La v1 dio **19 falsos positivos** sobre el respaldo: confundia la MENCION con
# la COSA. Marcaba el marcador `2d2d2d2d2d424547494e` citado en la
# documentacion, el JWT de mentira de un arnes (firma: "zz") y
# `sk-ant-api03-ZZZZ`. **Un escaner que grita siempre se termina apagando.**
#
#   clave RSA en hexa .... ~6.588 caracteres   (la de DISSAN ante AFIP, medida)
#   clave RSA en PEM ..... ~1.600 base64 sin cortar
#   firma de un JWT ...... 43+ caracteres
#   clave de Anthropic ... ~108 caracteres
#
# Un marcador citado en prosa son 20. **Eso se mide, no se opina.**
#
# SU ARNES VIVE AL LADO: control/buscar-claves-arnes.py — las dos caras, que
# agarre los de verdad Y que no grite con las menciones. Probar solo que dejo
# de gritar es apagar la alarma y entregarla rota.
# ============================================================================
import os, re, sys, json

PATRONES = [
 ("PEM en claro",      re.compile(rb'-----BEGIN [A-Z ]*PRIVATE KEY-----[^A-Za-z0-9+/]{0,8}[A-Za-z0-9+/]{200,}')),
 # asi viaja de verdad la clave de AFIP: el PEM pasado a hexadecimal.
 # 2d2d2d2d2d424547494e = "-----BEGIN"
 ("PEM en HEXA",       re.compile(rb'2[dD]2[dD]2[dD]2[dD]2[dD]424547494[eE][0-9a-fA-F]{200,}')),
 ("JWT",               re.compile(rb'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}')),
 ("clave Anthropic",   re.compile(rb'sk-ant-[A-Za-z0-9_-]{40,}')),
 ("service_role nuevo",re.compile(rb'sb_secret_[A-Za-z0-9_-]{20,}')),
 ("token GitHub",      re.compile(rb'gh[pousr]_[A-Za-z0-9]{30,}')),
 ("clave AWS",         re.compile(rb'AKIA[0-9A-Z]{16}')),
 # una clave EXPORTADA siempre trae su -----END, y no hay ningun motivo
 # honesto para que eso aparezca en un repositorio.
 ("fin de clave PEM",  re.compile(rb'-----END [A-Z ]*PRIVATE KEY-----')),
]

# La clave *publishable* de Supabase SI va en el repositorio, a proposito.
# La que nunca entra es la service_role.
PERMITIDO = re.compile(rb'sb_publishable_')


def buscar(raiz):
    hallazgos, archivos, bytes_ = [], 0, 0
    for dirp, dirs, files in os.walk(raiz):
        dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', '__pycache__')]
        for f in files:
            p = os.path.join(dirp, f)
            try:
                b = open(p, 'rb').read()
            except Exception as e:
                hallazgos.append((os.path.relpath(p, raiz), 'NO SE PUDO LEER', str(e)))
                continue
            archivos += 1
            bytes_ += len(b)
            for nombre, rx in PATRONES:
                for m in rx.finditer(b):
                    if PERMITIDO.search(b[max(0, m.start() - 40):m.start() + 60]):
                        continue
                    hallazgos.append((os.path.relpath(p, raiz), nombre, len(m.group())))
    return hallazgos, archivos, bytes_


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('uso: python3 -I control/buscar-claves.py <carpeta>', file=sys.stderr)
        sys.exit(2)
    hall, n, b = buscar(sys.argv[1])
    print(json.dumps({"archivos": n, "megas": round(b / 1048576, 2),
                      "hallazgos": len(hall), "detalle": hall[:20]},
                     ensure_ascii=False, indent=1))
    sys.exit(1 if hall else 0)
