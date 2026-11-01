#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=======================================================================
EL PDF BAJADO SE ABRE Y SE LEE PALABRA POR PALABRA      01/11/2026
=======================================================================
POR QUE EXISTE. Desde el 23/10 el control del archivo bajado cerraba
con este renglon, y era verdad:

    "NO midio: el PDF. Que no haya un numero, una fecha o un codigo
     cortado necesita extraer el texto con su posicion, y eso todavia
     no esta."

Era el agujero mas grande que quedaba, porque EL PDF ES EL QUE SE
IMPRIME Y SE MANDA. Y la clase ya habia pegado dos veces:

  23/10  la primera version del armador repartia el ancho a prorrata y
         en el PDF salia "2.638.99..." y "161.399...": importes
         cortados. Y la OC 5245 salia "5.245".
  01/11  la columna Año salia "2.024" en el PDF (separador de miles que
         la pantalla no muestra).

Las dos las encontre ABRIENDO el archivo a mano. Esto lo hace solo.

QUE MIDE, contra el .pantalla.json que guardo el control al lado:

  1. NADA RECORTABLE SALE CON PUNTOS SUSPENSIVOS. Una palabra del PDF
     que tenga un digito y termine en "..." es un numero, una fecha o un
     codigo cortado. `bajarRecortar` marca asi lo que no entro.
  2. TODO IMPORTE DE LA PANTALLA ESTA ENTERO EN EL PDF. Para cada celda
     numerica se arma el texto que el PDF TIENE que escribir —el valor
     exacto de data-v con formato es-AR— y se exige que aparezca.
     Esto es lo que agarra "2.638.99...": el valor exacto no esta.
  3. TODO CODIGO Y TODA FECHA DE LA PANTALLA ESTAN IGUALES. Los codigos
     y las fechas van al PDF tal cual, asi que se comparan literal.
  4. EL PIE DICE CUANTOS RENGLONES SON, y tiene que ser el numero de
     renglones de la pantalla. Un PDF al que le falta media hoja sigue
     abriendo bien: lo unico que lo delata es el conteo.
  5. NINGUNA PALABRA SE VA DEL BORDE DE LA HOJA.
  6. EL TITULO NO SALIO DE LA CAJA DE LOGIN (el defecto del 23/10).

LO QUE NO MIDE, declarado: que el recorte de una columna de TEXTO sea
aceptable. El texto SI se puede recortar —es lo que el armador decide a
proposito cuando la hoja no alcanza— y el PDF ya avisa arriba cuantas
columnas de texto salieron recortadas. Eso no es un defecto.
=======================================================================
"""

import json
import os
import re
import sys
from decimal import Decimal, ROUND_HALF_UP, ROUND_HALF_EVEN

try:
    import pdfplumber
except Exception as e:                                    # pragma: no cover
    print("EL CONTROL DEL PDF NO PUDO CORRER: falta pdfplumber (%s)" % e)
    print("  No medido no es limpio: el push se corta.")
    sys.exit(1)


fallas = []
medido = {"pdfs": 0, "paginas": 0, "palabras": 0,
          "importes": 0, "codigos": 0, "fechas": 0}


def falla(archivo, clase, que):
    fallas.append({"archivo": archivo, "clase": clase, "que": que})


RE_FECHA = re.compile(r"^\d{2}/\d{2}/\d{4}$")
RE_COD = re.compile(r"\bcod\b|-cod\b|mv-cod|db-cod|rt-cod")
# un numero escrito a la argentina: 1.234.567,89
RE_NUM_AR = re.compile(r"^-?\$?\s?\d{1,3}(\.\d{3})*(,\d+)?%?$|^-?\$?\s?\d+(,\d+)?%?$")


def es_codigo(cel):
    """Lo declara LA PANTALLA con su clase. No es una lista de nombres.

    PERO UN CODIGO NO TIENE ESPACIOS, y esto se midio: la Bitacora usa
    class="cod" para la columna "Que se toco", que trae
    "auth.users · auth.identities" — una LISTA, no un codigo. En esa
    pantalla la clase `cod` es el estilo monoespaciado, no una
    declaracion de identificador. Un valor con espacios o con el
    separador · se recorta como texto y eso NO es un defecto; los
    codigos de los que habla la regla del 23/10 son 5245, COLO0170,
    H222243, y ninguno tiene espacios.
    Esta excepcion salio de una FALSA FALLA de este mismo control en su
    primera corrida contra las pantallas reales: lo primero que hay que
    dudar cuando algo da mal es el instrumento.
    """
    if not RE_COD.search(cel.get("clase") or ""):
        return False
    t = texto_de(cel)
    return bool(t) and (" " not in t) and ("·" not in t)


def texto_de(cel):
    return (cel.get("texto") or "").strip()


def formato_ar(valor, decimales_max=2):
    """Lo que escribe toLocaleString('es-AR', {maximumFractionDigits:2}).

    Devuelve DOS candidatos: uno redondeando medio-arriba (lo que hace
    Intl) y otro medio-par (lo que haria Python por su cuenta). Se
    aceptan los dos para no inventar una falla por el ultimo centavo.
    """
    salidas = []
    for modo in (ROUND_HALF_UP, ROUND_HALF_EVEN):
        try:
            d = Decimal(str(valor)).quantize(
                Decimal("1." + "0" * decimales_max), rounding=modo)
        except Exception:
            return []
        s = f"{d:,.{decimales_max}f}"          # 1,234,567.89  (estilo en-US)
        s = s.rstrip("0").rstrip(".") if "." in s else s
        s = s.replace(",", "\x00").replace(".", ",").replace("\x00", ".")
        if s not in salidas:
            salidas.append(s)
    return salidas


def tipos_de_columna(filas, n):
    """El tipo de cada columna: el que mas se repite entre sus celdas con
    valor. Mismo criterio del 80% que usa la pantalla, pero calculado ACA
    sobre el DOM crudo: si lo midiera con el codigo del armador, un
    defecto del armador pasaria de los dos lados."""
    tipos = []
    for k in range(n):
        cuenta = {"cod": 0, "fecha": 0, "num": 0, "texto": 0}
        con = 0
        for f in filas:
            if k >= len(f):
                continue
            cel = f[k]
            t = texto_de(cel)
            if not t or t in ("—", "-"):
                continue
            con += 1
            if es_codigo(cel):
                cuenta["cod"] += 1
            elif RE_FECHA.match(t):
                cuenta["fecha"] += 1
            elif RE_NUM_AR.match(t.replace(" ", " ")) or cel.get("dataV") not in (None, ""):
                cuenta["num"] += 1
            else:
                cuenta["texto"] += 1
        tipo = "texto"
        if con:
            for cual in ("cod", "fecha", "num"):
                if cuenta[cual] >= con * 0.8:
                    tipo = cual
                    break
        tipos.append(tipo)
    return tipos


def revisar(ruta_pdf, ruta_json):
    nombre = os.path.basename(ruta_pdf)

    try:
        with open(ruta_json, encoding="utf-8") as fh:
            vista = json.load(fh)
    except Exception as e:
        falla(nombre, "sin_la_pantalla_al_lado",
              "bajo el PDF pero no esta su %s: el archivo quedaria sin contra "
              "que compararse, y no medido no es limpio. (%s)"
              % (os.path.basename(ruta_json), e))
        return

    enc = vista.get("encabezados") or []
    filas = vista.get("filas") or []

    try:
        with pdfplumber.open(ruta_pdf) as doc:
            paginas = len(doc.pages)
            palabras = []
            for pag in doc.pages:
                ancho = pag.width
                for w in pag.extract_words(use_text_flow=False, keep_blank_chars=False):
                    w["_ancho_hoja"] = ancho
                    palabras.append(w)
    except Exception as e:
        falla(nombre, "el_pdf_no_abre",
              "el boton dijo Bajado y el archivo no se puede abrir como PDF: %s" % e)
        return

    medido["pdfs"] += 1
    medido["paginas"] += paginas
    medido["palabras"] += len(palabras)

    texto_plano = " ".join(w["text"] for w in palabras)
    # el PDF parte los numeros en palabras cuando hay kerning raro: para
    # buscar un importe se mira tambien el texto pegado sin espacios
    texto_pegado = texto_plano.replace(" ", "")

    def esta(s):
        return (s in texto_plano) or (s.replace(" ", "") in texto_pegado)

    # ---- 1. NADA RECORTABLE CON PUNTOS SUSPENSIVOS ---------------------
    for w in palabras:
        t = w["text"]
        if t.endswith("...") and re.search(r"\d", t):
            falla(nombre, "numero_o_codigo_cortado_en_el_pdf",
                  'la palabra "%s" (pagina de %d, x=%.0f) termina en puntos '
                  "suspensivos y tiene digitos: es un numero, una fecha o un "
                  "codigo cortado. Al numero NUNCA se le corta: su columna "
                  "tiene que llevarse primero el ancho que necesita."
                  % (t, paginas, w["x0"]))

    # ---- 5. NINGUNA PALABRA SE VA DEL BORDE ----------------------------
    # ESTA CLASE NO TIENE SENUELO, Y TIENE ALGO MEJOR: en su primera
    # corrida contra las pantallas reales CORTO DOS ARCHIVOS DE VERDAD
    # (bitacora y ventas, con palabras terminando en x=859,9 y x=860,4
    # sobre una hoja de 841,9). La causa era que los pisos de ancho de
    # las columnas de texto —26 pt y 14 pt— podian sumar mas que la hoja
    # y nadie lo frenaba despues. Un control que lo vi cortar sobre un
    # defecto real esta mas probado que uno que solo corto un senuelo.
    for w in palabras:
        if w["x1"] > w["_ancho_hoja"] - 2:
            falla(nombre, "texto_fuera_de_la_hoja",
                  'la palabra "%s" termina en x=%.1f y la hoja mide %.1f: '
                  "escribe fuera del papel y al imprimir no se ve."
                  % (w["text"], w["x1"], w["_ancho_hoja"]))
            break

    # ---- 6. EL TITULO NO ES EL DEL LOGIN -------------------------------
    if re.search(r"ingresar al panel|Entrar", texto_plano[:400], re.I):
        falla(nombre, "titulo_del_login",
              "arriba del PDF aparece el titulo de la caja de login: la "
              "busqueda del rotulo se fue hasta el <h1> del login (23/10).")

    # ---- 4. EL PIE DICE CUANTOS RENGLONES SON --------------------------
    n = len(filas)
    if n:
        if not re.search(r"\b%d\s+renglones\b" % n, texto_plano):
            hallado = re.findall(r"(\d+)\s+renglones", texto_plano)
            falla(nombre, "el_pie_no_declara_los_renglones_de_la_pantalla",
                  "la pantalla tiene %d renglones y el pie del PDF dice %s. "
                  "Un PDF al que le falta media hoja sigue abriendo bien: lo "
                  "unico que lo delata es el conteo."
                  % (n, (", ".join(hallado) + " renglones") if hallado
                     else "que no dice ninguno"))

    # ---- 2 y 3. CELDA POR CELDA ----------------------------------------
    tipos = tipos_de_columna(filas, len(enc))

    for fi, f in enumerate(filas):
        for k, cel in enumerate(f):
            if k >= len(tipos):
                continue
            t = texto_de(cel)
            if not t or t in ("—", "-"):
                continue
            donde = 'fila %d, columna "%s"' % (fi + 1, enc[k] if k < len(enc) else k + 1)

            if tipos[k] == "cod":
                medido["codigos"] += 1
                if not esta(t):
                    falla(nombre, "un_codigo_de_la_pantalla_no_esta_en_el_pdf",
                          '%s: la pantalla muestra el codigo "%s" y en el PDF no '
                          "aparece. Un codigo cortado o reformateado no liga contra "
                          "Tango." % (donde, t))
                continue

            if tipos[k] == "fecha":
                medido["fechas"] += 1
                if not esta(t):
                    falla(nombre, "una_fecha_de_la_pantalla_no_esta_en_el_pdf",
                          '%s: la pantalla muestra "%s" y en el PDF no aparece. '
                          'Una fecha cortada ("01/...") miente igual que un '
                          "importe cortado." % (donde, t))
                continue

            if tipos[k] != "num":
                continue

            # EL IMPORTE EXACTO. Sale de data-v si la pantalla lo declaro
            # (el texto puede venir abreviado: "$2,64 M").
            crudo = cel.get("dataV")
            if crudo in (None, ""):
                limpio = (t.replace("$", "").replace(" ", "")
                           .replace(" ", "").replace("%", ""))
                if not RE_NUM_AR.match(t.replace(" ", " ")):
                    continue
                limpio = limpio.replace(".", "").replace(",", ".")
                try:
                    valor = float(limpio)
                except ValueError:
                    continue
            else:
                try:
                    valor = float(crudo)
                except (TypeError, ValueError):
                    continue

            medido["importes"] += 1
            candidatos = []
            for s in formato_ar(valor):
                candidatos += [s, s + "%", "-" + s, s.lstrip("-")]
            # un entero tambien puede ir sin separador si la columna es chica
            if abs(valor - int(valor)) < 1e-9:
                candidatos.append(str(int(valor)))
            if not any(esta(c) for c in candidatos):
                falla(nombre, "un_importe_de_la_pantalla_no_esta_entero_en_el_pdf",
                      '%s: la pantalla declara %r (muestra "%s") y en el PDF no '
                      "aparece ese numero. Esperaba alguno de: %s. Un importe "
                      "cortado se lee como otro importe: el 23/10 salio "
                      '"2.638.99..." por $2.638.992,35.'
                      % (donde, valor, t, " / ".join(sorted(set(candidatos))[:4])))


def main():
    if len(sys.argv) < 2:
        print("uso: pdf.py <carpeta con los .pdf y sus .pantalla.json>")
        sys.exit(2)
    carpeta = sys.argv[1]

    pdfs = sorted(f for f in os.listdir(carpeta) if f.lower().endswith(".pdf"))
    if not pdfs:
        print("  EL PDF: no se bajo ningun PDF, asi que no se midio nada.")
        print("  No medido no es limpio: el push se corta.")
        sys.exit(1)

    for f in pdfs:
        ruta = os.path.join(carpeta, f)
        revisar(ruta, ruta[:-4] + ".pantalla.json")

    pie = ("  el PDF midio: %d archivos abiertos · %d paginas · %d palabras leidas "
           "CON SU POSICION · %d importes, %d codigos y %d fechas buscados uno por "
           "uno contra la pantalla."
           % (medido["pdfs"], medido["paginas"], medido["palabras"],
              medido["importes"], medido["codigos"], medido["fechas"]))

    if not fallas:
        print("  EL PDF: 0 fallas.")
        print(pie)
        print("  el PDF NO midio: que el recorte de una columna de TEXTO sea "
              "aceptable. El texto SI se puede recortar a proposito, y el PDF ya "
              "avisa arriba cuantas columnas de texto salieron recortadas.")
        sys.exit(0)

    print("  EL PDF: %d falla(s)\n" % len(fallas))
    por_clase = {}
    for f in fallas:
        por_clase.setdefault(f["clase"], []).append(f)
    for c in por_clase:
        print("  " + c.upper() + " (%d)" % len(por_clase[c]))
        for f in por_clase[c][:6]:
            print("    " + f["archivo"] + " :: " + f["que"])
        if len(por_clase[c]) > 6:
            print("    ... y %d mas de la misma clase" % (len(por_clase[c]) - 6))
        print("")
    print(pie)
    sys.exit(1)


if __name__ == "__main__":
    main()
