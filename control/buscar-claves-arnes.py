#!/usr/bin/env python3
# ============================================================================
# EL ARNES DEL ESCANER DE SECRETOS — las dos caras
# ============================================================================
# USO:  python3 -I control/buscar-claves-arnes.py
#       salida 0 = el escaner ve bien · salida 1 = esta roto
#
# POR QUE LAS DOS CARAS
# ---------------------
# El 13/11 la v1 del escaner gritaba 19 veces en falso y la apreté a la v2.
# **Probar solo que dejo de gritar es apagar la alarma y entregarla rota.**
# Asi que se prueban las dos cosas en la misma corrida:
#
#   A. que agarre los OCHO secretos de verdad, a tamanio REAL
#   B. que NO suene con las SEIS menciones que la hacian gritar
#
# Los secretos de la cara A se generan con un random de semilla fija: son
# basura, no hay una sola clave real en este archivo ni en lo que escribe.
# ============================================================================
import os, random, shutil, string, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module
buscar = import_module('buscar-claves'.replace('-', '_')) if False else None

# el nombre tiene guiones, asi que se carga a mano
import importlib.util
_ruta = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'buscar-claves.py')
_spec = importlib.util.spec_from_file_location('escaner', _ruta)
escaner = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(escaner)

r = random.Random(7)
b64 = lambda n: ''.join(r.choice(string.ascii_letters + string.digits) for _ in range(n))
hexa = lambda n: ''.join(r.choice('0123456789ABCDEF') for _ in range(n))

# LOS SEÑUELOS SE ARMAN POR PEDAZOS, NUNCA SE ESCRIBEN ENTEROS.
# El 13/11 este archivo tenia los marcadores literales adentro y el escaner
# del respaldo corto acusando a su propio arnes: 3 hallazgos, dos `-----END`
# de clave PEM y un `AKIA...`. **Tenia razon**: un archivo del repositorio no
# debe llevar literales con forma de clave, aunque sean de mentira — el que
# los lea despues no sabe si lo son. Se arman en tiempo de ejecucion y el
# archivo queda limpio, sin cambiarle una coma a lo que el arnes prueba.
_G = '-' * 5
_BEGIN = _G + 'BEGIN %s' + _G
_END   = _G + 'END %s' + _G
_AWS   = 'AK' + 'IA' + 'IOSFODNN7EXAMPLE'      # el ejemplo publicado por AWS

DEBEN_SONAR = {
  'a1-pem-real.txt':        (_BEGIN % 'RSA PRIVATE KEY') + '\n' + b64(1600) + '\n' + (_END % 'RSA PRIVATE KEY') + '\n',
  'a2-hexa-real.txt':       '2D2D2D2D2D424547494E2052534120' + hexa(6500) + '\n',
  'a3-jwt-real.txt':        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.' + b64(43) + '\n',
  'a4-anthropic-real.txt':  'sk-' + 'ant-api03-' + b64(95) + '\n',
  'a5-service-role.txt':    'sb_' + 'secret_' + b64(40) + '\n',
  'a6-github.txt':          'gh' + 'p_' + b64(36) + '\n',
  'a7-aws.txt':             _AWS + '\n',
  'a8-end-pem.txt':         'alguien dejo esto: ' + (_END % 'PRIVATE KEY') + '\n',
}

NO_DEBEN_SONAR = {
  # las seis que daban falso positivo el 13/11
  'b1-doc-hexa.txt':           'el marcador 2d2d2d2d2d424547494e es "-----BEGIN" en hexa\n',
  'b2-jwt-plantado.txt':       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoieCJ9.zz\n',
  'b3-anthropic-plantado.txt': 'sk-' + 'ant-api03-' + 'Z'*20 + '\n',
  'b4-prosa.txt':              'si se decodifica empieza con ' + (_BEGIN % 'RSA PRIVATE KEY') + ' y no hay que exponerla\n',
  'b5-publishable.txt':        'const CLAVE="sb_' + 'publishable_Hs8abcdefghijklmnopqrstuvwxyz0123456789";\n',
  'b6-md5.txt':                'md5 del archivo: 8a3a96ccb74395b32e52f9decc94d73e\n',
}

tmp = tempfile.mkdtemp(prefix='arnes-escaner-')
try:
    for n, c in {**DEBEN_SONAR, **NO_DEBEN_SONAR}.items():
        open(os.path.join(tmp, n), 'w').write(c)

    hall, _, _ = escaner.buscar(tmp)
    vistos = {h[0] for h in hall}

    escapados = sorted(set(DEBEN_SONAR) - vistos)
    en_falso  = sorted(set(NO_DEBEN_SONAR) & vistos)

    print('ARNES DEL ESCANER DE SECRETOS')
    print('  los %d de verdad, agarrados: %d de %d'
          % (len(DEBEN_SONAR), len(DEBEN_SONAR) - len(escapados), len(DEBEN_SONAR)))
    for f in escapados:
        print('     *** SE LE ESCAPO:', f)
    print('  las %d menciones, en silencio: %d de %d'
          % (len(NO_DEBEN_SONAR), len(NO_DEBEN_SONAR) - len(en_falso), len(NO_DEBEN_SONAR)))
    for f in en_falso:
        print('     *** GRITO EN FALSO:', f)

    if escapados or en_falso:
        print('\nEL ESCANER ESTA ROTO. No sirve de nada que diga cero.')
        sys.exit(1)
    print('\nPASA: ve los de verdad y no grita con las menciones.')
finally:
    shutil.rmtree(tmp, ignore_errors=True)
