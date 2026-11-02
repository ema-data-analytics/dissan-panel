#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=====================================================================
EL CONTROL DEL CONTROL DEL ARCHIVO                         01/11/2026
=====================================================================
control/archivo.py revisa el .xlsx contra la pantalla. Esto revisa a
control/archivo.py: le arma un par (archivo + pantalla) con UN defecto
plantado de cada clase y exige que lo nombre. Y le arma uno limpio y
exige que NO diga nada.

POR QUE HACE FALTA, medido el 01/11. Siete senuelos contra el panel de
verdad probaron cinco clases. Las otras no se pudieron probar porque EL
CASO NO EXISTE EN LOS DATOS DE HOY: cero celdas con guion largo en las
quince pantallas, sobre 138.129 celdas. Un control que nunca se vio
fallar no esta probado — es el hallazgo del 26/09, cuando 15 de 55
controles del verificador de paquetes NO PODIAN FALLAR y ninguno lo
habia dicho.

Es la misma forma: romper el dato a proposito y exigir que el control
se de cuenta. Si un senuelo pasa limpio, el control esta ciego de esa
clase y lo dice con nombre y apellido.
"""
import os, re, sys, json, shutil, subprocess, datetime, tempfile

from openpyxl import Workbook

AQUI = os.path.dirname(os.path.abspath(__file__))
VERIF = os.path.join(AQUI, 'archivo.py')


def armar(carpeta, titulo, encabezados, filas_pant, filas_xl, formatos=None):
    """filas_pant: [[{texto,dataV,title,clase}, ...]]
       filas_xl:   [[valor, ...]]  tal cual se escribe en el .xlsx
       formatos:   [numfmt por columna] o None"""
    os.makedirs(carpeta, exist_ok=True)
    wb = Workbook(); ws = wb.active; ws.title = 'Detalle'
    r = 1
    for t in titulo:
        ws.cell(row=r, column=1, value=t); r += 1
    r += 1                                  # el renglon en blanco
    for j, e in enumerate(encabezados):
        ws.cell(row=r, column=j + 1, value=e)
    r += 1
    for fila in filas_xl:
        for j, v in enumerate(fila):
            c = ws.cell(row=r, column=j + 1, value=v)
            if formatos and j < len(formatos) and formatos[j]:
                c.number_format = formatos[j]
        r += 1
    xlsx = os.path.join(carpeta, 'senuelo.xlsx')
    wb.save(xlsx)
    with open(os.path.join(carpeta, 'senuelo.pantalla.json'), 'w', encoding='utf-8') as fh:
        json.dump({'encabezados': encabezados, 'filas': filas_pant}, fh)
    return xlsx


def cel(texto, dataV=None, title=None, clase=''):
    return {'texto': texto, 'dataV': dataV, 'title': title, 'clase': clase}


def correr(carpeta):
    p = subprocess.run([sys.executable, VERIF, carpeta],
                       capture_output=True, text=True)
    # el verificador imprime la clase en MAYUSCULA (c.upper()). La primera
    # version de este medidor la buscaba en minuscula, asi que las 16 clases
    # cortaban bien y el medidor las daba por "otra clase": el defecto estaba
    # en el control del control, no en el control. Es el mismo golpe del
    # 31/10 con innerText de un elemento oculto: UN MEDIDOR MAL NO ES UN
    # MEDIDOR, y lo primero que hay que dudar cuando TODO da mal es el
    # instrumento.
    return p.returncode, ((p.stdout or '') + (p.stderr or '')).lower()


# ------------------------------------------------------------------ #
# cada senuelo: (nombre, clase que tiene que nombrar, armador)
# ------------------------------------------------------------------ #
FECHA = datetime.datetime(2025, 9, 30)

SENUELOS = [

    ('el guion largo como texto', 'guion_largo_como_texto', lambda d: armar(
        d, ['Prueba'], ['Articulo', 'Unidades'],
        [[cel('COLO0170', clase='mv-cod'), cel('—')]],
        [['COLO0170', '—']])),

    ('un identificador perdio el cero de adelante', 'perdio_el_cero_de_adelante',
     lambda d: armar(
        d, ['Prueba'], ['Deposito', 'Unidades'],
        [[cel('03'), cel('120')]],
        [[3, 120]], ['General', '#,##0'])),

    # 01/11/2026: el defecto que encontre ABRIENDO el archivo de Ventas.
    # El valor 2024 estaba bien, asi que los controles de valor pasaban; lo
    # que mentia era el formato. Dos senuelos: los decimales de mas y el
    # separador de miles de mas.
    ('un año con formato de plata: 2024 se abre 2.024,00',
     'el_formato_muestra_otro_numero', lambda d: armar(
        d, ['Prueba'], ['Año', 'Facturado'],
        [[cel('2024'), cel('100')], [cel('Total'), cel('100')]],
        [[2024, 100], ['Total', 100]], ['#,##0.00', '#,##0'])),

    ('un numero con separador que la pantalla no muestra: 2024 -> 2.024',
     'el_formato_muestra_otro_numero', lambda d: armar(
        d, ['Prueba'], ['Año', 'Facturado'],
        [[cel('2024'), cel('100')], [cel('Total'), cel('100')]],
        [[2024, 100], ['Total', 100]], ['#,##0', '#,##0'])),

    ('a un codigo le cambiaron los caracteres',
     'al_codigo_le_cambiaron_los_caracteres', lambda d: armar(
        d, ['Prueba'], ['Articulo', 'Unidades'],
        [[cel('H222243', clase='mv-cod'), cel('14')]],
        [['H22243', 14]])),

    ('una fecha guardada como serial sin formato de fecha',
     'fecha_sin_formato_de_fecha', lambda d: armar(
        d, ['Prueba'], ['Vencimiento', 'Unidades'],
        [[cel('30/09/2025'), cel('14')]],
        [[45930, 14]], ['General', '#,##0'])),

    ('la fecha del archivo no es la de la pantalla',
     'la_fecha_del_archivo_no_es_la_de_la_pantalla', lambda d: armar(
        d, ['Prueba'], ['Vencimiento', 'Unidades'],
        [[cel('30/09/2025'), cel('14')]],
        [[datetime.datetime(2025, 9, 3), 14]], ['dd/mm/yyyy', '#,##0'])),

    ('un porcentaje en una celda que multiplica por cien',
     'porcentaje_multiplicado_por_cien', lambda d: armar(
        d, ['Prueba'], ['Bonificacion'],
        [[cel('6,0%', dataV='6')]],
        [[6]], ['0.0%'])),

    ('un codigo guardado como numero', 'codigo_como_numero', lambda d: armar(
        d, ['Prueba'], ['OC', 'Unidades'],
        [[cel('5245', clase='mv-cod'), cel('14')]],
        [[5245, 14]], ['#,##0', '#,##0'])),

    ('el texto del archivo no es el de la pantalla',
     'el_texto_del_archivo_no_es_el_de_la_pantalla', lambda d: armar(
        d, ['Prueba'], ['Cliente', 'Unidades'],
        [[cel('HOSPITAL CENTRAL'), cel('14')]],
        [['HOSPITAL REGIONAL', 14]])),

    ('el titulo salio de la caja de login', 'titulo_del_login', lambda d: armar(
        d, ['Ingresar al panel DISSAN'], ['Articulo'],
        [[cel('COLO0170', clase='mv-cod')]],
        [['COLO0170']])),

    ('el paginador pegado al renglon de filtros',
     'control_de_presentacion_en_los_filtros', lambda d: armar(
        d, ['Filtros: Filas por pagina 3060120250500todas: 30'], ['Articulo'],
        [[cel('COLO0170', clase='mv-cod')]],
        [['COLO0170']])),

    ('el archivo trae menos renglones que la pantalla',
     'el_archivo_trae_menos_que_la_pantalla', lambda d: armar(
        d, ['Prueba'], ['Articulo'],
        [[cel('COLO0170', clase='mv-cod')], [cel('COLO0171', clase='mv-cod')],
         [cel('COLO0172', clase='mv-cod')]],
        [['COLO0170']])),

    ('plata en formato General', 'plata_sin_formato', lambda d: armar(
        d, ['Prueba'], ['Facturado'],
        [[cel('$1.234,56', dataV='1234.56')]],
        [[1234.56]], ['General'])),

    ('un numero guardado como texto', 'numero_como_texto', lambda d: armar(
        d, ['Prueba'], ['Facturado'],
        [[cel('$1.234,56', dataV='1234.56')]],
        [['$1.234,56']])),

    ('el numero del archivo no es el de la pantalla',
     'el_numero_del_archivo_no_es_el_de_la_pantalla', lambda d: armar(
        d, ['Prueba'], ['Facturado'],
        [[cel('$2,64 M', dataV='2638992.35', title='$2.638.992,35')]],
        [[2.64]], ['#,##0.00'])),
]


def senuelo_sin_pantalla(d):
    armar(d, ['Prueba'], ['Articulo'], [[cel('COLO0170', clase='mv-cod')]],
          [['COLO0170']])
    os.remove(os.path.join(d, 'senuelo.pantalla.json'))


def senuelo_no_abre(d):
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'senuelo.xlsx'), 'wb') as fh:
        fh.write(b'esto no es un libro de Excel')


EXTRA = [
    ('el archivo bajo sin su pantalla al lado', 'sin_la_pantalla_al_lado',
     senuelo_sin_pantalla),
    ('el boton dijo Bajado y adentro no hay un libro', 'el_archivo_no_abre',
     senuelo_no_abre),
]


def limpio(d):
    """El par que TIENE que pasar: todo bien puesto. Si este da una falla,
    el control tiene un falso positivo y eso es igual de grave."""
    armar(d, ['Informe de prueba', 'Filtros: Cliente: HOSPITAL CENTRAL'],
          ['OC', 'Deposito', 'Vencimiento', 'Facturado', 'Bonificacion', 'Cliente'],
          [[cel('5245', clase='mv-cod'), cel('03', clase='mv-cod'),
            cel('30/09/2025'), cel('$2,64 M', dataV='2638992.35',
            title='$2.638.992,35'), cel('6,0%', dataV='6'),
            cel('HOSPITAL CENTRAL')]],
          [['5245', '03', FECHA, 2638992.35, 6, 'HOSPITAL CENTRAL']],
          ['General', 'General', 'dd/mm/yyyy', '#,##0.00', '0.0"%"', 'General'])


def main():
    base = tempfile.mkdtemp(prefix='senuelos-archivo-')
    ok = mal = 0
    print('EL CONTROL DEL CONTROL DEL ARCHIVO — cada senuelo tiene que CORTAR')
    print('')

    for nombre, clase, armador in SENUELOS + EXTRA:
        d = os.path.join(base, re.sub(r'\W+', '-', nombre)[:40])
        shutil.rmtree(d, ignore_errors=True)
        armador(d)
        cod, salida = correr(d)
        if cod != 0 and clase in salida:
            print('  OK   %-58s -> %s' % (nombre, clase)); ok += 1
        elif cod != 0:
            otras = [l.strip() for l in salida.splitlines()
                     if re.match(r'^[a-z_]+ \(\d+\)$', l.strip())]
            print('  MAL  %-58s -> corto, pero por OTRA clase: %s'
                  % (nombre, ', '.join(otras) or '(sin clase)'))
            mal += 1
        else:
            print('  CIEGO %-57s -> el control dijo 0 fallas. NO MIDE esta clase.'
                  % nombre)
            mal += 1

    d = os.path.join(base, 'limpio')
    shutil.rmtree(d, ignore_errors=True)
    limpio(d)
    cod, salida = correr(d)
    if cod == 0:
        print('  OK   %-58s -> 0 fallas, como tiene que ser'
              % 'y el par bien puesto NO dispara nada'); ok += 1
    else:
        print('  MAL  %-58s -> FALSO POSITIVO:' % 'el par bien puesto disparo')
        print(salida.strip()); mal += 1

    shutil.rmtree(base, ignore_errors=True)
    print('')
    print('  %d de %d. %s' % (ok, ok + mal,
          'Las %d clases cortan y el limpio pasa.' % len(SENUELOS + EXTRA)
          if not mal else 'HAY %d CONTROL(ES) QUE NO SIRVEN.' % mal))
    # La linea que queda en ema.control_corrida. Encontrado el 02/11 leyendo
    # api_estado_del_sistema(): esta puerta quedaba con "que_midio: null" y de
    # detalle la linea del par limpio, asi que el registro decia "paso" sin
    # decir cuantas clases cortaron. Un registro que no dice QUE midio es
    # media medicion, y media medicion no es una medicion.
    print('  midio: %d defectos plantados de a uno en un .xlsx armado con el MISMO '
          'js/bajar-formatos.js del panel, mas el par bien puesto: %d de %d se '
          'portaron%s.'
          % (len(SENUELOS + EXTRA), ok, ok + mal,
             ' (las %d clases cortan nombrando su clase, y el limpio no dispara)'
             % len(SENUELOS + EXTRA) if not mal
             else ' — %d NO, el control no esta probado' % mal))
    sys.exit(0 if not mal else 1)


if __name__ == '__main__':
    main()
