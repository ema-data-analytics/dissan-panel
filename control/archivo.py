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


def decimales_del_formato(fmt):
    """Cuantos decimales va a MOSTRAR Excel con ese formato. Lo que esta
    entre comillas es texto y no cuenta."""
    limpio = re.sub(r'"[^"]*"', '', fmt or '')
    limpio = limpio.split(';')[0]            # el formato de los positivos
    m = re.search(r'[0#]\.([0#]+)', limpio)
    return len(m.group(1)) if m else 0


def muestra_miles(fmt):
    """El separador de miles. Con `#,##0` Excel escribe 2.024 donde la
    pantalla escribe 2024."""
    return '#,##' in re.sub(r'"[^"]*"', '', fmt or '')


def pantalla_entero_pelado(texto):
    """La pantalla muestra un entero SIN separador de miles y SIN decimales
    —un año, un codigo numerico, un contador chico—. Devuelve False en
    cuanto hay un separador, una coma decimal, un $ o un %: esos casos son
    plata o porcentaje y los miden los controles de al lado."""
    t = (texto or '').replace(' ', ' ').strip()
    if not t or '$' in t or '%' in t:
        return False
    return bool(re.fullmatch(r'-?\d+', t))


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
    ultima_con_datos = fila_enc
    r = fila_enc + 1
    while r <= ws.max_row:
        if any(ws.cell(row=r, column=c).value not in (None, '')
               for c in range(1, len(encs) + 1)):
            filas_arch += 1
            ultima_con_datos = r
        r += 1
    medido['filas'] += filas_arch

    # la fila de totales, antes de comparar celda por celda: si falta, el
    # resto de la comparacion igual corre y se ve todo junto.
    revisar_fila_de_totales(nombre, ws, vista, fila_enc, encs, ultima_con_datos)

    # y que las partes de CADA renglon den su propio total.
    revisar_que_las_partes_den_el_total(nombre, ws, vista, fila_enc, encs,
                                        ultima_con_datos)

    # y que la hoja de Controles diga lo que cada control mide.
    revisar_la_hoja_de_controles(nombre, wb, vista)

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
                    # EL FORMATO MUESTRA UN NUMERO QUE LA PANTALLA NO
                    # MUESTRA.                                 01/11/2026
                    # La columna Año del comparativo de Ventas mostraba 2024
                    # y el archivo la guardaba con formato de dos decimales:
                    # en Excel se abria 2.024,00 y en el PDF 2.024. El VALOR
                    # estaba bien —2024— asi que los cuatro controles de
                    # arriba pasaban. Lo que miente es el formato, y es la
                    # OC 5245 que salia 5.245 (23/10) un piso mas abajo.
                    # Causa de fondo: una columna que mezcla numeros y texto
                    # ("2024, 2025, 2026, Total") no queda declarada
                    # numerica, y el armador le ponia igual el formato de
                    # plata por defecto.
                    elif pantalla_entero_pelado(texto) and float(v) == int(float(v)):
                        medido['enteros_pelados'] = medido.get('enteros_pelados', 0) + 1
                        dec = decimales_del_formato(fmt)
                        mil = muestra_miles(fmt) and abs(float(v)) >= 1000
                        if dec or mil:
                            va_a_mostrar = ('{:,.%df}' % dec).format(float(v)) \
                                .replace(',', ' ').replace('.', ',') \
                                .replace(' ', '.' if mil else '')
                            falla(nombre, 'el_formato_muestra_otro_numero',
                                  '%s: la pantalla muestra "%s" y el archivo lo '
                                  'guardo con formato %s, asi que Excel lo va a '
                                  'mostrar "%s". El valor esta bien; lo que miente '
                                  'es el formato.'
                                  % (donde, texto, fmt, va_a_mostrar))
                continue

            # 5. TEXTO CONTRA TEXTO: los caracteres no se pueden perder.
            if isinstance(v, str) and v.strip() != texto and texto not in v:
                falla(nombre, 'el_texto_del_archivo_no_es_el_de_la_pantalla',
                      '%s: pantalla "%s", archivo "%s".'
                      % (donde, texto[:60], v.strip()[:60]))


def revisar_la_hoja_de_controles(nombre, wb, vista):
    """QUE LA HOJA DE CONTROLES DIGA LO QUE CADA CONTROL MIDE.    17/11/2026

    POR QUE EXISTE. Hasta hoy NINGUNA de las 18 puertas abria esa hoja:
    `grep Controles control/archivo.py` solo la encontraba en un comentario.
    Y el 17/11 DISSAN abrio el Excel de IVA Compras, vio numeros negativos en
    esa hoja y pregunto si no tenian que dar todo cero. Tenian razon en
    preguntar: la hoja se titulaba «Renglones que NO cierran, del peor al
    mejor» y listaba 231 renglones, de los cuales 224 eran de CINCO CENTAVOS
    o menos —la mediana era DOS CENTAVOS—. Esos 224 CIERRAN. El rotulo era
    falso y lo escribi yo.

    Es la tercera vez en una semana de la misma clase —los numeros bien, la
    lectura mal (16/11 las secciones que se esfumaban, 16/11 los botones de
    Listas, 17/11 este rotulo)— y lo que lo explica es que mis puertas miran
    celdas, sumas y firmas, y NINGUNA mira si el rotulo dice la verdad.

    QUE EXIGE, sin una sola lista de nombres —quien dice cual control es un
    DEFECTO y cual una DERIVA es LA PANTALLA, con `data-deriva`—:
      1. que si hay columnas de control, exista la hoja;
      2. que CADA control tenga su renglon de resumen, nombrado;
      3. que un control declarado DERIVA no salga afirmando que no cierra;
      4. que un control de DEFECTO diga si cerro o no;
      5. que el titulo de la hoja no afirme de todos los listados que no
         cierran.
    """
    ctrl = (vista or {}).get('controles') or []
    if not ctrl:
        return
    medido['pantallas_con_control'] = medido.get('pantallas_con_control', 0) + 1

    if 'Controles' not in wb.sheetnames:
        falla(nombre, 'no_bajo_la_hoja_de_controles',
              'la pantalla tiene %d columna(s) de control (%s) y el archivo no trae '
              'la hoja «Controles». Es la hoja que DISSAN abre para saber si el '
              'archivo esta bien.' % (len(ctrl), ', '.join(c['r'] for c in ctrl)))
        return
    hc = wb['Controles']
    medido['hojas_de_control'] = medido.get('hojas_de_control', 0) + 1

    cabecera = []
    for r in range(1, min(hc.max_row, 14) + 1):
        for c in hc[r]:
            if isinstance(c.value, str) and c.value.strip():
                cabecera.append(c.value.strip())
    texto = ' · '.join(cabecera)
    suena_a_que_no_cierra = ('NO cierran' in texto) or ('no cierran' in texto)

    for c in ctrl:
        nom = c['r']
        linea = next((t for t in cabecera if t.startswith(nom) or
                      t[2:].startswith(nom) if len(t) > 2), None)
        if linea is None:
            falla(nombre, 'la_hoja_de_controles_no_nombra_un_control',
                  'la pantalla declara el control «%s» y la hoja «Controles» no lo '
                  'nombra en su resumen. Un control que no se resume no se lee.' % nom)
            continue
        medido['controles_resumidos'] = medido.get('controles_resumidos', 0) + 1
        if c['deriva']:
            # una deriva declarada NO puede salir diciendo que no cierra
            if 'DERIVA' not in linea.upper():
                falla(nombre, 'una_deriva_sale_como_si_fuera_un_defecto',
                      '«%s» esta declarado en la pantalla como una DERIVA conocida '
                      '(data-deriva) y su renglon en la hoja no lo dice: "%s". Asi se '
                      'lee como plata que falta, que es lo que paso el 17/11.'
                      % (nom, linea[:150]))
            if len(linea) < 120:
                falla(nombre, 'una_deriva_sale_sin_su_motivo',
                      '«%s» sale como deriva pero sin explicar por que: "%s". Una '
                      'deriva sin motivo escrito al lado se lee como un defecto.'
                      % (nom, linea[:150]))
        else:
            if ('CIERRA' not in linea.upper()) and ('DEFECTO' not in linea.upper()):
                falla(nombre, 'un_control_de_defecto_no_dice_si_cerro',
                      '«%s» mide un defecto y su renglon no dice ni que cierra ni que '
                      'no: "%s".' % (nom, linea[:150]))

    if suena_a_que_no_cierra:
        falla(nombre, 'el_titulo_afirma_que_los_listados_no_cierran',
              'la hoja «Controles» dice «no cierran» sobre el conjunto de lo que '
              'lista. El 17/11 eso era falso para 224 de 231 renglones: cerraban, con '
              'dos centavos de redondeo. Cada control tiene que declarar lo suyo.')


def revisar_que_las_partes_den_el_total(nombre, ws, vista, fila_enc, encs,
                                        ultima_con_datos):
    """QUE LAS PARTES DEL RENGLON DEN SU PROPIO TOTAL.             16/11/2026

    ESTA PUERTA NO LA INVENTE YO: ES LA FORMULA DE DISSAN. Ellos agregaron a
    mano una columna al Excel que les mandamos —

        =SUM(Tabla1[[#This Row],[EXENTO]:[OTROSIMP]]) - [IMP_TOTAL]

    — y esa columna fue la que encontro que NACION SEGUROS perdia $296.121,12
    por renglon: el comprobante no tiene una sola alicuota de IVA, los netos
    salen DERIVADOS del IVA y daban cero, y el exento salia de importe_ex, que
    en esos esta en cero. La plata no quedaba en ninguna columna.

    Lo grave no es el defecto: es que el archivo salio con su propio veredicto
    escrito adentro —la hoja de Controles decia «233 renglones, $895.536,53»—
    y nadie lo leyo. Un archivo que se entrega sin abrir su hoja de controles
    es media entrega.

    SIN UNA SOLA LISTA DE NOMBRES. Las columnas de plata y la del total las
    DECLARA la pantalla con `data-plata` y `data-total`, igual que ya declara
    `data-no-baja`. Si manana se agrega una columna de plata, entra sola.

    EL CORTE, MEDIDO Y NO TIPEADO A OJO. Se exige hueco > $1 **y** > 1% del
    total del renglon, las dos cosas:
      · el peso saca los centavos de redondeo del IVA derivado en los
        comprobantes en dolares, que son una deriva conocida y explicada desde
        el 05/11 — un control que grita todos los meses se apaga;
      · el porcentaje lo hace libre de escala, asi que no hay un numero mio
        atado al tamanio de la empresa.
    Medido sobre octubre 2026, las dos caras: con la funcion rota corta 9
    renglones (el peor $296.121,12, el 99,4% del comprobante); con la
    arreglada corta 0, y el peor hueco que queda es $31,00 — tres ordenes de
    magnitud de distancia, sin nada en el medio.

    Y SI NO HAY COLUMNA DECLARADA, SE DICE. No se pasa en silencio: un control
    que no se ejercito no es un pase (14/11).
    """
    plata = vista.get('plata') or []
    es_tot = vista.get('esTotal') or []
    if not plata or not es_tot or not any(es_tot):
        return                      # esta grilla no declara total: se cuenta en el pie
    medido['con_total_declarado'] = medido.get('con_total_declarado', 0) + 1

    i_tot = es_tot.index(True)
    i_partes = [j for j in range(min(len(plata), len(encs)))
                if plata[j] and not es_tot[j]]
    if not i_partes:
        falla(nombre, 'ninguna_columna_de_plata',
              'la pantalla declara la columna del total pero ninguna parte: '
              'la suma no tiene contra que compararse.')
        return

    def num(r, j):
        v = ws.cell(row=r, column=j + 1).value
        return float(v) if isinstance(v, (int, float)) else 0.0

    peor, peor_donde, cortan = 0.0, '', 0
    for r in range(fila_enc + 1, ultima_con_datos + 1):
        total = num(r, i_tot)
        if abs(total) < 0.005:
            continue                # sin total no hay proporcion que medir
        hueco = sum(num(r, j) for j in i_partes) - total
        medido['renglones_sumados'] = medido.get('renglones_sumados', 0) + 1
        if abs(hueco) <= 1.0 or abs(hueco) / abs(total) <= 0.01:
            continue
        cortan += 1
        if abs(hueco) > abs(peor):
            peor = hueco
            peor_donde = ' · '.join(
                str(ws.cell(row=r, column=j + 1).value)
                for j in range(min(5, len(encs)))
                if ws.cell(row=r, column=j + 1).value not in (None, ''))
        if cortan <= 4:
            falla(nombre, 'las_partes_del_renglon_no_dan_su_total',
                  'fila %d: las %d columnas de plata suman %.2f y %s dice %.2f. '
                  'Faltan %.2f, que es el %.2f%% del renglon. Es la formula que '
                  'DISSAN escribio a mano en su Excel.'
                  % (r, len(i_partes), sum(num(r, j) for j in i_partes),
                     encs[i_tot], total, hueco, abs(hueco) / abs(total) * 100))
    if cortan > 4:
        falla(nombre, 'las_partes_del_renglon_no_dan_su_total',
              '... y %d renglon(es) mas. El peor: %s, por %.2f.'
              % (cortan - 4, peor_donde, peor))


def revisar_fila_de_totales(nombre, ws, vista, fila_enc, encs, ultima_con_datos):
    """LA FILA DE TOTALES TIENE QUE SER LA DE UNA TABLA DE EXCEL.   14/11/2026

    Lo pidio el contador: sus archivos ("2026.09 COMPRAS contador asi lo
    envio.xlsx") no son un rango pelado — son TABLAS de Excel, estilo
    TableStyleMedium2, headerRowCount=1 y **totalsRowCount=1**, con la etiqueta
    'Total' en la primera columna y `sum` en las numericas.

    Y es la otra cara del defecto del 05/11: entonces el TOTAL entraba al
    archivo como un renglon de datos mas —con la palabra TOTAL en la columna
    FECHA y vacias las de CUIT y NUMERO— y se lo saco del <tbody>. Sacarlo lo
    dejo fuera del archivo. La forma correcta no es ninguna de las dos: es la
    fila de totales DE LA TABLA, que Excel entiende como tal, suma sola al
    filtrar y no se ordena con los datos.

    Si la pantalla no tiene <tfoot>, aca no hay nada que exigir.
    """
    totales_pant = (vista or {}).get('totales') or []
    if not totales_pant:
        return
    medido['con_totales'] = medido.get('con_totales', 0) + 1

    # NINGUNA HOJA PUEDE VOLVER A SALIR COMO TABLA DE EXCEL.   17/11/2026
    # Esta condicion estaba AL REVES hasta hoy: exigia la tabla, porque el
    # archivo del contador es una tabla y yo lo copie. DISSAN la encontro
    # usandola: al querer copiar datos del Excel de IVA Compras, Excel tira
    # «Esta accion no funcionara en selecciones multiples», que es lo que
    # contesta cuando la seleccion cruza el borde de una tabla. Textual del
    # usuario: «no tomes como tablas, mandale datos nada mas».
    # Ahora el control impide la RECAIDA: si alguna hoja vuelve a bajar como
    # tabla, el push se corta.
    tablas = list(ws.tables.values()) if getattr(ws, 'tables', None) else []
    if tablas:
        falla(nombre, 'el_excel_volvio_a_salir_como_tabla',
              'el archivo trae la tabla de Excel "%s" (%s). Con una tabla adentro, '
              'copiar un rango que cruza su borde hace que Excel conteste «Esta '
              'accion no funcionara en selecciones multiples», y la gente de DISSAN '
              'no puede copiar los datos. Las hojas bajan como rango pelado.'
              % (tablas[0].name, tablas[0].ref))
        return
    medido['sin_tabla'] = medido.get('sin_tabla', 0) + 1

    # Sin tabla, la fila de totales es la ULTIMA con datos, y tiene que venir
    # pegada a los datos: si quedara separada, seria un renglon suelto.
    fila_tot = ultima_con_datos
    if fila_tot <= fila_enc:
        falla(nombre, 'el_archivo_no_trae_la_fila_de_totales',
              'la pantalla muestra una fila de TOTALES y el archivo termina en la '
              'fila %d, que es la de los encabezados (%d): el total no entro.'
              % (fila_tot, fila_enc))
        return

    # ---- y los NUMEROS: los de la pantalla, uno por uno ---------------
    pant = totales_pant[0]
    for i in range(min(len(pant), len(encs))):
        texto = (pant[i].get('texto') or '').strip()
        # SE USA EL MISMO LECTOR QUE EL RESTO DEL CONTROL, no uno nuevo.
        # El primer intento escribio un parser propio que leia el `data-v`
        # —que es el numero de MAQUINA, con punto decimal— con la regla
        # castellana: 253698299.3 le salia 2.536.982.993. Es textual el
        # defecto del 05/11 con los precios en ingles. `exacto_de_la_pantalla`
        # ya resuelve el orden data-v -> title -> texto, y es el que usan las
        # otras comparaciones: una sola copia.
        esperado, _ = exacto_de_la_pantalla(pant[i])
        v = ws.cell(row=fila_tot, column=i + 1).value
        donde = '%s, fila de totales, columna %s' % (nombre, encs[i] or chr(65 + i))

        if esperado is None:
            # celda de texto: la etiqueta TOTAL tiene que estar
            if texto and str(v or '').strip().upper() not in (texto.upper(), 'TOTAL'):
                falla(nombre, 'la_etiqueta_del_total_no_coincide',
                      '%s: la pantalla dice "%s" y el archivo "%s".'
                      % (donde, texto[:40], str(v or '')[:40]))
            continue

        medido['totales_comparados'] = medido.get('totales_comparados', 0) + 1
        if v is None or isinstance(v, str):
            falla(nombre, 'el_total_del_archivo_no_es_un_numero',
                  '%s: la pantalla suma %s y el archivo guardo %r. Un total que '
                  'es texto no se suma ni se filtra.'
                  % (donde, texto, v))
            continue
        if abs(float(v) - esperado) > 0.01:
            falla(nombre, 'el_total_del_archivo_no_es_el_de_la_pantalla',
                  '%s: pantalla %s (%.2f) y archivo %.2f. Diferencia %.2f.'
                  % (donde, texto, esperado, float(v), float(v) - esperado))


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

    # LA FILA DE TOTALES SE DECLARA, PASE O NO PASE.              14/11/2026
    # Hoy esta puerta canto "0 fallas" el mismo dia que se le agrego el
    # control de la fila de totales, y NO HABIA MIRADO NINGUNA: las dos
    # pantallas que la tienen no contestaban con el juguete. Un control que
    # pasa sin decir que midio es media medicion, y en este proyecto ya
    # costo nueve horas de Tablero caido. Asi que el pie lo dice solo, y si
    # el numero es cero lo dice con todas las letras.
    con_tot = medido.get('con_totales', 0)
    if con_tot:
        pie += ('\n  la fila de totales: %d pantalla(s) la mostraron · %d archivo(s) '
                'bajaron SIN tabla de Excel, como rango pelado · %d celda(s) de '
                'total comparadas contra la pantalla.'
                % (con_tot, medido.get('sin_tabla', 0),
                   medido.get('totales_comparados', 0)))
    else:
        pie += ('\n  la fila de totales: NINGUNA pantalla mostro totales en esta '
                'corrida, asi que ESE CONTROL NO SE EJERCITO. No es un pase: '
                'es un control que no llego a mirar.')

    # QUE LAS PARTES DEN EL TOTAL — se declara igual que la fila de totales.
    con_dec = medido.get('con_total_declarado', 0)
    if con_dec:
        pie += ('\n  que las partes den el total: %d grilla(s) declararon su columna '
                'de total · %d renglon(es) sumados columna por columna, con la '
                'formula que DISSAN escribio a mano en su Excel.'
                % (con_dec, medido.get('renglones_sumados', 0)))
    else:
        pie += ('\n  que las partes den el total: NINGUNA grilla declaro columna de '
                'total en esta corrida, asi que ESE CONTROL NO SE EJERCITO. '
                'No es un pase: es un control que no llego a mirar.')

    # LA HOJA DE CONTROLES — se declara igual, con lo que midio.
    con_ctrl = medido.get('pantallas_con_control', 0)
    if con_ctrl:
        pie += ('\n  la hoja de Controles: %d grilla(s) con columnas de control · %d '
                'hoja(s) «Controles» abiertas · %d resumen(es) de control leidos, '
                'exigiendo que cada uno diga si lo suyo es un DEFECTO o una DERIVA.'
                % (con_ctrl, medido.get('hojas_de_control', 0),
                   medido.get('controles_resumidos', 0)))
    else:
        pie += ('\n  la hoja de Controles: NINGUNA grilla declaro columnas de control '
                'en esta corrida, asi que ESE CONTROL NO SE EJERCITO. No es un pase.')

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
