#!/usr/bin/env python3
# =====================================================================
# EL ARCHIVO PARA TANGO, ABIERTO DE VERDAD                  15/11/2026
# =====================================================================
# POR QUE EXISTE. El usuario pregunto, textual: "que salga bien para poder
# subirlas". Esa pregunta no la contestaba ninguna puerta. La 12 abre los 16
# Excel del panel con openpyxl, pero el de Listas no: para que exista hay que
# soltar el PDF del proveedor en la pantalla, y un control no puede soltar un
# archivo. Lo que SI se puede es apretar el boton con `bajarArchivo`
# interceptado y abrir los bytes aca.
#
# Un `.xlsx` que no abre no se nota hasta que alguien lo intenta: el 10/11 un
# `return` solo en su renglon dejo `xl/styles.xml` en 0 bytes y los 13 Excel del
# panel NO ABRIAN, y `node --check` los daba por buenos.
#
# Lo recibe por stdin como JSON: { b64, nombre, cuit, encabezado[], filas[][] }
# y escribe por stdout un JSON con las fallas. Sin fallas, lista vacia.
# =====================================================================
import base64
import io
import json
import sys

fallas = []


def falla(clase, que):
    fallas.append({"clase": clase, "que": que})


def main():
    d = json.load(sys.stdin)
    try:
        import openpyxl
    except ImportError:
        print(json.dumps({"fallas": [{"clase": "no_hay_openpyxl",
              "que": "no se pudo importar openpyxl: el archivo NO se abrio, "
                     "asi que ESE CONTROL NO SE EJERCITO"}]}))
        return

    crudo = base64.b64decode(d["b64"])
    if len(crudo) < 1000:
        falla("el_archivo_salio_vacio",
              "el .xlsx pesa %d bytes: no puede ser un libro de %d renglones"
              % (len(crudo), len(d["filas"])))
        print(json.dumps({"fallas": fallas}))
        return

    try:
        wb = openpyxl.load_workbook(io.BytesIO(crudo))
    except Exception as e:
        falla("el_archivo_no_abre",
              "openpyxl no pudo abrir el .xlsx que armo la pantalla: %s" % str(e)[:160])
        print(json.dumps({"fallas": fallas}))
        return

    hs = wb.worksheets
    if len(hs) != 1:
        falla("hojas_de_mas", "el libro tiene %d hojas y Tango lee una" % len(hs))
    ws = hs[0]

    # A1 = el CUIT del proveedor
    a1 = ws.cell(row=1, column=1).value
    if str(a1 or "").strip() != str(d["cuit"] or "").strip():
        falla("el_cuit_no_esta_en_A1",
              "A1 tiene %r y el CUIT del proveedor es %r" % (a1, d["cuit"]))

    # fila 2 = los 12 titulos, en orden
    enc = [ws.cell(row=2, column=c + 1).value for c in range(len(d["encabezado"]))]
    enc = [str(x or "").strip() for x in enc]
    esp = [str(x or "").strip() for x in d["encabezado"]]
    if enc != esp:
        for i, (a, b) in enumerate(zip(enc, esp)):
            if a != b:
                falla("el_titulo_de_la_columna_no_es_el_que_va",
                      "la columna %d dice %r y tiene que decir %r" % (i + 1, a, b))
                break
        else:
            falla("faltan_titulos",
                  "la fila 2 trae %d titulos y el armado tiene %d" % (len(enc), len(esp)))

    # los datos arrancan en la fila 3, sin un renglon en blanco en el medio
    if ws.cell(row=3, column=1).value in (None, ""):
        falla("hay_un_renglon_en_blanco_antes_de_los_datos",
              "la fila 3 tiene que ser el primer articulo y vino vacia: Tango "
              "deja de leer ahi")

    # un renglon por fila del armado, ni uno de mas
    datos = 0
    r = 3
    while ws.cell(row=r, column=1).value not in (None, ""):
        datos += 1
        r += 1
    if datos != len(d["filas"]):
        falla("faltan_renglones_en_el_archivo",
              "el armado tiene %d renglones y el .xlsx trae %d"
              % (len(d["filas"]), datos))

    # el PRECIO: numero de verdad, no texto, y el MISMO que el armado.
    # Es la columna que tenia el defecto del 15/11.
    malos, notexto = [], []
    for i, f in enumerate(d["filas"]):
        c = ws.cell(row=3 + i, column=9)
        if c.value is None:
            malos.append("renglon %d (%s) sin precio" % (i + 1, f[0]))
            continue
        if not isinstance(c.value, (int, float)):
            notexto.append("renglon %d (%s) trae %r, que es %s"
                           % (i + 1, f[0], c.value, type(c.value).__name__))
            continue
        if abs(float(c.value) - float(f[8])) > 0.00005:
            malos.append("renglon %d (%s): el .xlsx dice %s y el armado %s"
                         % (i + 1, f[0], c.value, f[8]))
    if notexto:
        falla("el_precio_viaja_como_texto",
              "%d renglon(es): %s" % (len(notexto), " · ".join(notexto[:3])))
    if malos:
        falla("el_precio_del_archivo_no_es_el_del_armado",
              "%d renglon(es): %s" % (len(malos), " · ".join(malos[:3])))

    # el codigo de articulo y el sinonimo van como TEXTO: el sinonimo es todo
    # digitos y si sale como numero pierde los ceros de la izquierda (01450).
    for col, comoSe in ((1, "el codigo de articulo"), (4, "el sinonimo")):
        for i in range(min(len(d["filas"]), 60)):
            v = ws.cell(row=3 + i, column=col).value
            if v is not None and not isinstance(v, str):
                falla("una_columna_de_texto_viaja_como_numero",
                      "%s del renglon %d viaja como %s (%r): un sinonimo como "
                      "'01450' pierde el cero de la izquierda y no liga"
                      % (comoSe, i + 1, type(v).__name__, v))
                break

    print(json.dumps({"fallas": fallas, "midio": {
        "bytes": len(crudo), "hojas": len(hs), "renglones": datos,
        "titulos": len(enc), "a1": str(a1 or "")}}))


main()
