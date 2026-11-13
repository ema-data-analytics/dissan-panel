# EMA Data Analytics — ficha de marca y prompt para armar piezas

**Para qué sirve este archivo.** Lo adjuntás a cualquier chat de Claude y le pedís
la pieza que necesites. Tiene todo lo que hace falta para que salga en marca sin
que tengas que explicar nada de nuevo.

---

## CÓMO SE USA

Arrastrá este archivo al chat y escribí una de estas:

```
Adjunto la ficha de marca de EMA. Armame un flyer A4 vertical
para imprimir, en HTML, respetando todo lo que dice la ficha.
```

```
Con la ficha adjunta, armame 3 posteos para LinkedIn.
Uno por cada cifra de prueba. Sin hashtags.
```

```
Con la ficha adjunta, armame la primera lámina de la presentación
y la última. Nada más que esas dos.
```

**Si no querés adjuntar el archivo**, pegá el prompt largo del final: dice lo mismo.

---

## LAS CUATRO FRASES

| # | Frase | Dónde va | Dónde NO va |
|---|---|---|---|
| **1 · Slogan** | **Ningún número viaja solo.** | Con el logo · tarjeta · firma de mail · portada de informes · pie del panel · **titular único del flyer** | Nunca junto a la frase 2 |
| **2 · Apertura** | **Un número sin control no es un dato. Es una afirmación sin respaldo.** | Primera lámina sola, sin logo ni imagen · primer párrafo de la propuesta · lo primero que se dice en voz alta | En el flyer no va |
| **3 · Bajada** | **No te pedimos que confíes en el número. Te mostramos contra qué lo controlamos.** | Debajo del slogan en cuerpo chico · LinkedIn · encabezado del sitio · cuerpo del flyer | Nunca sola: siempre acompaña al slogan |
| **4 · Firma** | **No producimos informes. Los certificamos.** | Pie de firma de mail · última lámina | En el flyer no va |

**Variante corta de la 3**, cuando no entra entera:
*Cada cifra, con lo que tenés derecho a creerle.*

### Reglas de escritura, no negociables

- El slogan **siempre con punto final**: `Ningún número viaja solo.`
- **Nunca en mayúsculas.** Se lee como cartel de prohibición y pierde fuerza.
- Máximo dos renglones: *Ningún número / viaja solo.* Nunca tres.
- **La 1 y la 2 no van juntas en la misma pieza.** Dos frases fuertes se anulan.
- Si el slogan no entra grande, se saca. No se achica hasta volverlo una nota al pie.

### De dónde salió el slogan

Del documento del Timón, 31/10/2026, textual:
*"Un número nunca viaja solo. Viaja con lo que tenés derecho a creerle."*

---

## LAS CIFRAS DE PRUEBA

Un slogan sin esto es una promesa más. Son lo que el sistema encontró en una sola
empresa, y es lo único que no puede copiar nadie.

**En un flyer van DOS, no seis.** Las dos primeras son las que más pegan.

| Cifra | Qué es |
|---|---|
| **$6.305 millones** | sin contabilizar, que Tango marcaba y nadie miraba. 4.861 facturas de venta y 4.262 de compra |
| **$55.041.933** | de IVA al 10,5% que el subdiario tiraba en silencio, con la columna en cero. 45 comprobantes |
| **41,4% → 36,5%** | el margen real. Una lista escrita a mano borraba la mitad de lo facturado sin avisar |
| **$211** | de diferencia contra la contabilidad, sobre $15.527 millones y 10.434 comprobantes |
| **84** | controles que comparan cada cifra contra una fuente que no la calcula. Corren solos |
| **627 de 627** | tablas con el significado escrito. Ni una columna inventada: la puerta las rechaza |

Las tres primeras se escriben en **rojo** (son defectos encontrados).
Las tres últimas en **blanco** (son capacidad instalada).

---

## LO QUE NO SE DICE NUNCA

Están prohibidas porque las dice todo el mercado. Usarlas te pone en la fila
en vez de adelante.

- **"Datos confiables" · "Confianza en el dato"** — lo promete cada ERP y cada
  consultora, y ninguno lo prueba. El producto no pide confianza: da con qué
  comprobar. Es la palabra que hay que evitar, no la que hay que usar.
- **"Inteligencia artificial aplicada a tus datos"** — en 2026 no distingue nada.
  La IA es la puerta de entrada; el control es el producto.
- **"Tomá mejores decisiones"** — escuchado veinte veces, y no es medible, que es
  justo lo contrario de lo que se vende.
- **"Transformación digital" · "Data driven"** — palabras de folleto.

---

## COLORES Y TIPOGRAFÍA

Son los del panel, para que el flyer y la pantalla se vean del mismo sistema.

| Rol | Hex |
|---|---|
| Fondo | `#09233A` |
| Contenido | `#0B2740` |
| Caja | `#123252` |
| Verde | `#0BC492` (claro) · `#08A57A` (base) |
| Texto | `#F2F5F3` |
| Rojo | `#ff8b8f` |
| Ámbar | `#E9B949` |

**El verde se usa poco**: sólo en lo que está medido y da bien. Si se pone verde
en todo, deja de querer decir algo.

**Tipografía**
- **Inter**, pesos 800/900, interletrado −3%: frases y títulos.
- **IBM Plex Mono**, peso 500: cifras y rótulos. Los números que se alinean en
  columna van con `font-variant-numeric: tabular-nums`.
- Las dos están en Google Fonts.

---

## QUÉ ES EL PRODUCTO, EN UN PÁRRAFO

> El panel contesta preguntas sobre el negocio en castellano, y **cada cifra que
> publica viene con la fuente independiente contra la que se controló**. Si no hay
> ninguna que la controle, lo dice. Hoy son 84 controles que corren solos, 14
> puertas que no dejan publicar algo roto, y 627 tablas con el significado escrito.

**La frase que resume la diferencia:** la competencia muestra el número. Esto
muestra el número **y contra qué se controló**.

---

## EL PROMPT LARGO (si no querés adjuntar el archivo)

Copiá de acá para abajo y pegalo en cualquier chat, agregando al final qué pieza
querés.

```
Sos el diseñador de EMA Data Analytics. Armá la pieza que te pido respetando
esta ficha de marca al pie de la letra.

QUÉ VENDE EMA: un panel que contesta preguntas sobre el negocio en castellano,
donde cada cifra publicada viene con la fuente independiente contra la que se
controló. Si no hay ninguna que la controle, lo dice. Hoy: 84 controles que
corren solos, 14 puertas que no dejan publicar algo roto, 627 tablas con el
significado escrito.

LAS FRASES, cada una con su lugar:
1. SLOGAN: "Ningún número viaja solo." — va con el logo, en la tarjeta, en la
   firma de mail, en la portada de informes, y es el TITULAR ÚNICO del flyer.
2. APERTURA: "Un número sin control no es un dato. Es una afirmación sin
   respaldo." — primera lámina sola, sin logo ni imagen. En el flyer NO va.
3. BAJADA: "No te pedimos que confíes en el número. Te mostramos contra qué lo
   controlamos." — siempre debajo del slogan, en cuerpo chico.
4. FIRMA: "No producimos informes. Los certificamos." — pie de firma de mail y
   última lámina. En el flyer NO va.

REGLAS: el slogan siempre con punto final; nunca en mayúsculas; máximo dos
renglones; la 1 y la 2 NUNCA van juntas en la misma pieza; si el slogan no entra
grande, se saca.

CIFRAS DE PRUEBA (en un flyer van DOS, no seis). En rojo las tres primeras,
en blanco las tres últimas:
- $6.305 millones sin contabilizar, que Tango marcaba y nadie miraba
- $55.041.933 de IVA al 10,5% que el subdiario tiraba en silencio
- 41,4% → 36,5%: el margen real, después de sacar una lista escrita a mano
- $211 de diferencia contra la contabilidad, sobre $15.527 millones
- 84 controles que comparan cada cifra contra una fuente que no la calcula
- 627 de 627 tablas con el significado escrito, ni una columna inventada

PROHIBIDO ESCRIBIR: "datos confiables", "confianza en el dato", "inteligencia
artificial aplicada a tus datos", "tomá mejores decisiones", "transformación
digital", "data driven". Las dice todo el mercado.

COLORES: fondo #09233A, contenido #0B2740, caja #123252, verde #0BC492,
texto #F2F5F3, rojo #ff8b8f, ámbar #E9B949. El verde se usa POCO: sólo en lo
que está medido y da bien.

TIPOGRAFÍA: Inter 800/900 con interletrado −3% para frases y títulos;
IBM Plex Mono 500 para cifras y rótulos, con tabular-nums donde se alinean.
Las dos de Google Fonts.

TONO: directo, sin adjetivos de folleto, sin signos de admiración. Frases
cortas. Nada de "potenciá", "impulsá", "revolucioná".

LA PIEZA QUE NECESITO:
[acá escribís qué querés: flyer A4 vertical para imprimir / 3 posteos de
LinkedIn / la primera y la última lámina / una placa cuadrada para Instagram]
```

---

*Escrito el 13/11/2026. Las cifras de prueba están medidas; si cambian, se
cambian acá también — un material de marca con una cifra vieja es la misma falta
que publicar una cifra sin verificar.*
