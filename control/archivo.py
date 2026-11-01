#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=====================================================================
EL ARCHIVO BAJADO, CONTRA LA PANTALLA, CELDA POR CELDA      01/11/2026
=====================================================================
Lo llama control/archivo.js, que aprieta los botones de verdad, guarda
el .xlsx y al lado un .pantalla.json con lo que la pantalla MOSTRABA
en ese momento, leido del DOM en crudo.

POR QUE CONTRA LA PANTALLA Y NO CONTRA UNA LISTA DE NOMBRES.
La primera version de este control adivinaba el tipo por el nombre de
la columna, con una regex de palabras: cod|nro|factura|... De 13 fallas
que encontro, 12 ERAN FALSAS — marco "Facturado", "Facturas",
"Clientes" y "Articulos" como codigos porque la palabra "factura"
estaba en mi lista. Es el mismo defecto que el catalogo tiene anotado
cuatro veces: UNA LISTA ESCRITA A MANO SE QUEDA CORTA O SE PASA, Y NO
AVISA. La pantalla ya declara el tipo de cada celda — con data-v, con
el title y con la clase ...-cod — asi que el control no tiene que
adivinar nada: compara.

Y LEE EL DOM EN CRUDO A PROPOSITO. No usa bajarCelda() ni
bajarLeerTabla(), que son el codigo que tiene que controlar: si midiera
con la misma funcion que arma el archivo, un defecto de esa funcion
pasaria de los dos lados y el control diria OK. Son dos lecturas
independientes del mismo dato. Si no dicen lo mismo, eso es el hallazgo.

CADA CONTROL ES UNA PREGUNTA QUE TIENE QUE DAR CERO. Si da una, el
push se corta. Ninguno es una regla de conducta.
"""
import sys, os, re, json, datetime

try:
    from openpyxl import load_workbook
except ImportError:
    print('  NO PUDO MEDIR: falta openpyxl. No medido no es limpio.')
    sys.exit(1)

# ---- OPCIONES DE UN <select> PEGADAS AL RENGLON DE FILTROS ----------
# 31/10: el .xlsx de Ventas decia "Filas por pagina 3060120250500todas:
# 30". Un <label> que ENVUELVE al control: p.textContent se trae el
# texto del propio control, y un select aporta TODAS sus opciones.
OPCIONES_PEGADAS = re.compile(r'\d{2,4}\d{2,4}\d{2,4}|todas:\s*\d|'
                              r'filas\s*por\s*p[aá]g', re.I)
# 23/10: la busqueda del titulo trepaba el DOM hasta el <h1> del login
# y los archivos salian llamados ingresar-al-panel-dissan.xlsx
DEL_LOGIN = re.compile(r'(ingresar|iniciar\s*sesi|^panel\s+dissan\s*$|contrase)', re.I)

GUIONES = ('—', '–', '-')

fallas = []
medido = dict(archivos=0, columnas=0, celdas=0, comparadas=0, numeros=0,
              fechas=0, codigos=0, plata=0, titulos=0, filas=0)


def falla(archivo, clase, que):
    fallas.append((archivo, clase, que))


# ------------------------------------------------------------------ #
def numero_es_ar(txt):
    """1.234.567,89 · $1.234,56 · 34,1% · -1.234 · 1.234,5 ×
    Devuelve None si no es un numero, asi una descripcion nunca se
    convierte en cifra por accidente."""
    if txt is None:
        return None
    s = str(txt).strip()
    if not s or s in GUIONES:
        return None
    s = (s.replace(' ', ' ').replace(' ', ' ')
          .replace('$', '').replace('%', '').replace('×', ''))
    s = re.sub(r'\s', '', s)
    if not re.fullmatch(r'-?\d{1,3}(\.\d{3})*(,\d+)?', s) and \
       not re.fullmatch(r'-?\d+(,\d+)?', s):
        return None
    try:
        return float(s.replace('.', '').replace(',', '.'))
    except ValueError:
        return None


def fecha_es_ar(txt):
    m = re.fullmatch(r'\s*(\d{1,2})/(\d{1,2})/(\d{4})\s*', str(txt or ''))
    if not m:
        return None
    try:
        return datetime.date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
    except ValueError:
        return None


def exacto_de_la_pantalla(cel):
    """El numero EXACTO que la pantalla declara, con el orden del 23/10
    que no miente: data-v -> title (si el texto viene abreviado) -> texto."""
    if cel.get('dataV') not in (None, ''):
        try:
            return float(cel['dataV']), 'data-v'
        except (TypeError, ValueError):
            return None, 'data-v-texto'
    t = cel.get('texto') or ''
    if re.search(r'\sM$', t) or t.startswith('no pierde'):
        n = numero_es_ar(cel.get('title'))
        if n is not None:
            if t.startswith('no pierde'):
                n = -abs(n)
            return n, 'title'
    n = numero_es_ar(t)
    return (n, 'texto') if n is not None else (None, 'texto')


def es_codigo(cel):
    """La PANTALLA lo declara con la clase ...-cod. No es una lista de
    nombres: es la declaracion que ya existe en el marcado."""
    return bool(re.search(r'\bcod\b|-cod\b|mv-cod|db-cod|rt-cod',
                          cel.get('clase') or ''))


def formato_porcentaje_de_verdad(fmt):
    """Un % fuera de comillas MULTIPLICA POR CIEN. 15/10: la base manda
    6 y el archivo de DISSAN guarda 0,06; un 6 con formato 0.0% se lee
    600%. El armador usa 0.0"%" — el % como texto, que no multiplica."""
    return '%' in re.sub(r'"[^"]*"', '', fmt or '')


def encabezados_de(ws, ncols):
    """La fila de encabezados. Las del titulo tienen SOLO la columna A, asi
    que con dos o mas columnas basta pedir 2 celdas llenas.

    CUANTAS COLUMNAS HAY LO DICE LA PANTALLA, NO UN NUMERO FIJO. La primera
    version pedia siempre 2, y con eso una grilla de UNA columna no tenia
    fila de encabezados para el control: se la saltaba entera y las ocho
    clases que se prueban con una columna quedaban CIEGAS. Lo encontro el
    control del control, no yo. Es el umbral escrito a mano del 31/10 otra
    vez: un numero fijo adentro del control se queda corto sin avisar."""
    minimo = 2 if ncols > 1 else 1
    enblanco = 0
    for r in range(1, min(ws.max_row, 25) + 1):
        llenas = [c for c in ws[r] if c.value not in (None, '')]
        if not llenas:
            enblanco += 1
            continue
        # con una sola columna el titulo tambien ocupa la A, asi que lo que
        # separa el titulo del encabezado es el renglon en blanco del medio
        if minimo == 1 and not enblanco:
            continue
        if len(llenas) >= minimo:
            return r
    return None


# ------------------------------------------------------------------ #
def revisar(ruta):
    nombre = os.path.basename(ruta)
    try:
        wb = load_workbook(ruta, data_only=True)
    except Exception as e:
        falla(nombre, 'el_archivo_no_abre',
              'openpyxl no lo pudo abrir: %s. El boton dijo Bajado y adentro '
              'no hay un libro de Excel.' % str(e)[:120])
        return
    medido['archivos'] += 1
    ws = wb.worksheets[0]

    # ---- la pantalla con la que se compara, PRIMERO -----------------
    # Es la que dice cuantas columnas hay, y de eso depende donde esta la
    # fila de encabezados.
    jpath = re.sub(r'\.xlsx$', '', ruta, flags=re.I) + '.pantalla.json'
    if not os.path.exists(jpath):
        falla(nombre, 'sin_la_pantalla_al_lado',
              'no hay .pantalla.json: el archivo no tiene contra que compararse. '
              'No medido no es limpio.')
        return
    with open(jpath, encoding='utf-8') as fh:
        vista = json.load(fh)
    filas_pant = vista.get('filas') or []
    encs = vista.get('encabezados') or []

    fila_enc = encabezados_de(ws, len(encs))
    if not fila_enc:
        falla(nombre, 'sin_encabezados',
              'no tiene fila de encabezados: el archivo bajo vacio o sin estructura.')
        return

    # ---- el renglon de filtros y el titulo --------------------------
    for r in range(1, fila_enc):
        v = ws.cell(row=r, column=1).value
        if v in (None, ''):
            continue
        txt = str(v)
        medido['titulos'] += 1
        m = OPCIONES_PEGADAS.search(txt)
        if m:
            falla(nombre, 'control_de_presentacion_en_los_filtros',
                  'fila %d: "%s". "%s" es un control de PRESENTACION, no un '
                  'filtro: cambia COMO se ve, no QUE datos hay. Se declara con '
                  'data-no-filtro="1".' % (r, txt[:110], m.group(0)[:30]))
        if DEL_LOGIN.search(txt):
            falla(nombre, 'titulo_del_login',
                  'fila %d: "%s". La busqueda del titulo se fue hasta la caja '
                  'de login.' % (r, txt[:90]))

    if not filas_pant:
        return                      # grilla vacia: nada que comparar

    # cuantas filas de datos tiene el archivo
    filas_arch = 0
    r = fila_enc + 1
    while r <= ws.max_row:
        if any(ws.cell(row=r, column=c).value not in (None, '')
               for c in range(1, len(encs) + 1)):
            filas_arch += 1
        r += 1
    medido['filas'] += filas_arch

    # EL ARCHIVO NO PUEDE TRAER MENOS DE LO QUE SE VE. Puede traer MAS:
    # bajar.js recorre todas las paginas, y eso ya lo mide el control de
    # pantallas. Lo que no puede es traer menos.
    if filas_arch < len(filas_pant):
        falla(nombre, 'el_archivo_trae_menos_que_la_pantalla',
              'la pantalla muestra %d renglones y el archivo trae %d. '
              'Un recorte con pinta de completo.' % (len(filas_pant), filas_arch))
        return

    # ---- CELDA POR CELDA -------------------------------------------
    ncols = min(len(encs), 200)
    medido['columnas'] += ncols
    for i, fp in enumerate(filas_pant):
        fila_xl = fila_enc + 1 + i
        if fila_xl > ws.max_row:
            break
        for j in range(min(ncols, len(fp))):
            cel = fp[j]
            texto = (cel.get('texto') or '').strip()
            c = ws.cell(row=fila_xl, column=j + 1)
            v = c.value
            fmt = c.number_format or 'General'
            enc = encs[j] if j < len(encs) else ('columna %d' % (j + 1))
            donde = '%s%d, columna "%s"' % (c.column_letter, fila_xl, enc)
            medido['celdas'] += 1

            if texto in ('',) or texto in GUIONES:
                # EL GUION LARGO VA COMO CELDA VACIA. Como texto, la columna
                # entera deja de ser numerica y en Excel no se puede sumar.
                if isinstance(v, str) and v.strip() in GUIONES:
                    falla(nombre, 'guion_largo_como_texto',
                          '%s: la pantalla dice "%s" y el archivo lo escribio '
                          'como TEXTO. Va como celda vacia.' % (donde, texto or v))
                continue

            es_num_xl = isinstance(v, (int, float)) and not isinstance(v, bool)
            es_fecha_xl = isinstance(v, (datetime.datetime, datetime.date))
            medido['comparadas'] += 1

            # 1. UN CODIGO NO ES UN NUMERO. 5 reincidencias: la OC 5245
            #    (23/10), el Sinonimo (27/10), cod_deposi '03' -> 3 (31/10).
            if es_codigo(cel):
                medido['codigos'] += 1
                if es_num_xl and not es_fecha_xl:
                    falla(nombre, 'codigo_como_numero',
                          '%s: la pantalla lo declara codigo (clase "%s") y '
                          'muestra "%s"; el archivo guardo el NUMERO %r. Un '
                          'deposito 3 no liga contra Tango y la OC 5245 sale '
                          '5.245.' % (donde, (cel.get('clase') or '')[:40], texto, v))
                    continue
                # y los caracteres tienen que estar todos
                if isinstance(v, str) and v.strip() != texto:
                    falla(nombre, 'al_codigo_le_cambiaron_los_caracteres',
                          '%s: la pantalla muestra "%s" y el archivo dice "%s".'
                          % (donde, texto, v.strip()))
                continue

            # 2. UN IDENTIFICADOR CON CERO ADELANTE PIERDE EL CERO.
            #    No hace falta ninguna lista: el cero adelante lo dice el
            #    dato. '03' guardado como numero vuelve como 3.
            if re.fullmatch(r'0\d+', texto) and es_num_xl:
                falla(nombre, 'perdio_el_cero_de_adelante',
                      '%s: la pantalla muestra "%s" y el archivo guardo el '
                      'numero %r. El cero de adelante es parte del codigo.'
                      % (donde, texto, v))
                continue

            # 3. UNA FECHA. 4 reincidencias: ultima_venta (15/10),
            #    FECHA_VTO en ISO (31/10). Si baja como texto, la columna
            #    deja de ser fecha y no se puede ordenar por vencimiento.
            f = fecha_es_ar(texto)
            if f:
                medido['fechas'] += 1
                if isinstance(v, str):
                    falla(nombre, 'fecha_como_texto',
                          '%s: la pantalla muestra la fecha "%s" y el archivo '
                          'la escribio como TEXTO "%s". En Excel no se puede '
                          'ordenar ni filtrar por esa columna.' % (donde, texto, v))
                    continue
                if es_fecha_xl:
                    d = v.date() if isinstance(v, datetime.datetime) else v
                    if d != f:
                        falla(nombre, 'la_fecha_del_archivo_no_es_la_de_la_pantalla',
                              '%s: pantalla "%s", archivo %s.' % (donde, texto, d))
                elif es_num_xl and 'yy' not in fmt.lower():
                    falla(nombre, 'fecha_sin_formato_de_fecha',
                          '%s: la pantalla muestra "%s", el archivo guardo el '
                          'serial %r y lo dejo en formato %s: en Excel se ve un '
                          'numero, no una fecha.' % (donde, texto, v, fmt))
                continue

            # 4. EL VALOR. La cifra del archivo tiene que ser la que la
            #    pantalla declara. 14/10: $2.638.992 se mostraba abreviado
            #    y bajaba 2,64 — mil veces menos, sin ninguna senal.
            exacto, de_donde = exacto_de_la_pantalla(cel)
            if exacto is not None:
                medido['numeros'] += 1
                if isinstance(v, str):
                    falla(nombre, 'numero_como_texto',
                          '%s: la pantalla muestra "%s" (exacto %r por %s) y el '
                          'archivo lo escribio como TEXTO "%s". Un numero como '
                          'texto no se suma.' % (donde, texto, exacto, de_donde, v))
                    continue
                if es_num_xl:
                    tol = max(abs(exacto) * 1e-9, 0.005)
                    if abs(float(v) - exacto) > tol:
                        falla(nombre, 'el_numero_del_archivo_no_es_el_de_la_pantalla',
                              '%s: la pantalla declara %r (por %s, mostrando "%s") '
                              'y el archivo trae %r.'
                              % (donde, exacto, de_donde, texto, v))
                        continue
                    # EL PORCENTAJE QUE SE MULTIPLICA POR CIEN
                    if '%' in texto and formato_porcentaje_de_verdad(fmt):
                        falla(nombre, 'porcentaje_multiplicado_por_cien',
                              '%s: el valor %r esta en una celda con formato %s, '
                              'que MULTIPLICA por cien: Excel va a mostrar %r%%.'
                              % (donde, v, fmt, v * 100))
                        continue
                    # UNA COLUMNA DE PLATA EN FORMATO GENERAL. 31/10:
                    # valor_en_riesgo salia General porque a la regex le
                    # faltaba la palabra "valor": ni se formateaba ni
                    # entraba al Resumen. El $ lo declara la pantalla.
                    if '$' in texto:
                        medido['plata'] += 1
                        if fmt in ('General', '@'):
                            falla(nombre, 'plata_sin_formato',
                                  '%s: la pantalla la muestra con $ ("%s") y en el '
                                  'archivo quedo en formato %s.' % (donde, texto, fmt))
                continue

            # 5. TEXTO CONTRA TEXTO: los caracteres no se pueden perder.
            if isinstance(v, str) and v.strip() != texto and texto not in v:
                falla(nombre, 'el_texto_del_archivo_no_es_el_de_la_pantalla',
                      '%s: pantalla "%s", archivo "%s".'
                      % (donde, texto[:60], v.strip()[:60]))


def main():
    carpeta = sys.argv[1] if len(sys.argv) > 1 else '/tmp/control-archivos'
    archivos = sorted(f for f in os.listdir(carpeta) if f.lower().endswith('.xlsx'))
    if not archivos:
        print('  NO PUDO MEDIR: no hay ningun .xlsx en %s.' % carpeta)
        print('  No medido no es limpio: el push se corta.')
        sys.exit(1)

    for f in archivos:
        revisar(os.path.join(carpeta, f))

    pie = ('  adentro de los archivos midio: %d abiertos · %d renglones de datos · '
           '%d columnas · %d celdas, de las que %d se compararon una por una contra '
           'la pantalla (%d numeros, %d fechas, %d codigos, %d con $) · '
           '%d renglones de titulo y filtros.'
           % (medido['archivos'], medido['filas'], medido['columnas'],
              medido['celdas'], medido['comparadas'], medido['numeros'],
              medido['fechas'], medido['codigos'], medido['plata'],
              medido['titulos']))

    if not fallas:
        print('  ADENTRO DE LOS ARCHIVOS: 0 fallas.')
        print(pie)
        sys.exit(0)

    print('  ADENTRO DE LOS ARCHIVOS: %d falla(s)\n' % len(fallas))
    por_clase = {}
    for a, c, q in fallas:
        por_clase.setdefault(c, []).append((a, q))
    for c in por_clase:
        print('  %s (%d)' % (c.upper(), len(por_clase[c])))
        for a, q in por_clase[c][:6]:
            print('    %s :: %s' % (a, q))
        if len(por_clase[c]) > 6:
            print('    ... y %d mas de la misma clase' % (len(por_clase[c]) - 6))
        print('')
    print(pie)
    sys.exit(1)


if __name__ == '__main__':
    main()
