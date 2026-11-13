# 13/11/2026 — El período parcial, la inflación, los pasos en vivo y el dictado

Salió de un video de un producto competidor (“Copernicus Estratégico”) que Aníbal
mandó para ver qué se le podía copiar. **De las cuatro cosas que tenía, dos
arreglan un defecto de verdad, una es comodidad y una es presentación.** Eso se
le dijo así, sin maquillarlo, antes de empezar.

---

## 1. EL PERÍODO PARCIAL — SOLUCIONA

**El defecto:** preguntar “cómo venimos este mes” comparaba **12 días contra 30**
y daba una **caída del 60% que no existe**. Es una cifra creíble y mal, de la
misma clase que publicar un porcentaje sin decir su denominador.

**`api_hasta_cuando_hay_datos()`** contesta hasta qué día hay datos de verdad,
por fuente, y **descarta el futuro**: `gva12` tiene una factura fechada
**05/12/2202** —un año tipeado mal en Tango— así que un `max(fecha)` pelado
contesta el año 2202. La última de verdad es del 12/11/2026.

**Medido de punta a punta, con una pregunta nueva real** (*“comparame las ventas
de noviembre contra octubre”*): el SQL que escribió el modelo cortó los tres
tramos al día 12.

```
2026-11-01  ->  < 2026-11-13     (1 al 12 de noviembre)
2026-10-01  ->  < 2026-10-13     (1 al 12 de octubre)
2025-11-01  ->  < 2025-11-13     (1 al 12 de noviembre del año pasado)
```

El tercero **no se lo pidió nadie**: la regla dice comparar también contra el
mismo mes del año anterior, y lo hizo solo.

---

## 2. LA INFLACIÓN — SOLUCIONA

**El defecto:** en Argentina una suba **nominal** del 80% interanual puede ser
una **caída real**. Publicar “crecimos 80%” sin aclarar que es nominal es hacer
quedar mal al que lo lee.

**`ema.indice_precios`**: IPC Nivel General Nacional del INDEC, base dic-2016=100,
serie `148.3_INIVELNAL_DICI_M_26` del portal de datos abiertos. **68 meses,
2021-01 a 2026-08.**

**LA TRANSCRIPCIÓN SE CONTROLÓ, QUE ES LO QUE SIEMPRE SE SALTEA.** Escribir 68
números a mano no es copiar, es transcribir. Medido desde el navegador, fila por
fila, lo que quedó en la base contra la API en vivo:

```
en_la_base: 68 · en_la_api: 68 · diferencias: [] · en_api_y_no_en_base: []
```

Y además el archivo del repositorio contra la base, por md5 de los 68 pares:
`8a3a96ccb74395b32e52f9decc94d73e` de los dos lados. **API → base → repositorio,
la cadena entera cerrada.**

**LO QUE SE NIEGA A HACER, QUE ES LO MÁS IMPORTANTE.** El INDEC publica con
atraso: el último índice es el de **agosto 2026** y las ventas llegan al
**12/11/2026**. Septiembre, octubre y noviembre **no se pueden ajustar**.
`api_pesos_constantes` contesta `se_puede = false` con el motivo escrito, en vez
de devolver 1 —que sería decir “no hubo inflación”— o `null` —que al multiplicar
da cero—. **Un factor inventado es una cifra creíble y mal.**

**Y LA TRAMPA DEL JOIN, escrita en la regla que lee el modelo:** si se joinea
contra `vista_indice_precios` con un join común, los meses sin índice
**desaparecen de la suma en silencio** y el total ajustado queda más chico que el
nominal sin que se note. Va `left join`, y se contesta aparte cuántos meses
quedaron sin ajustar.

**Dos identidades nuevas, con su arnés corrido ANTES de darlas por buenas:**

| | de verdad | con el defecto plantado |
|---|---|---|
| `indice_precios_sin_huecos` | **0** (verde) | con 2024-05 sacado: **1** |
| `indice_precios_al_dia` | **0** (verde) | como si el último fuera 2026-02: **5** |

Una identidad que da cero sin que se haya probado que puede dar distinto de cero
no es un control: es un cero que parece una respuesta.

---

## 3. LOS PASOS EN VIVO — ERA PRESENTACIÓN, Y DEJÓ DE SERLO AL MEDIRLO

Se le dijo a Aníbal que era lo menos útil de las cuatro. **Y después la medición
lo desmintió:** una pregunta nueva real tardó **56 segundos**.

```
arranca            0,4 s
pensando           3,0 s
consultando ×2     7,1 s
viendo columnas   10,5 s
consultando ×3    21,3 s
consultando       27,7 s
armando           54,6 s
controlando       54,6 s
```

A los 56 segundos mirando un cartel que dice “Buscando…” **la gente recarga la
página, y la pregunta se paga dos veces.** Eso no es presentación.

**`preguntar5` = `preguntar4` + `avisar()`.** El cuerpo entero quedó igual,
adentro de `manejar()`. **Sin la cabecera `Accept: text/event-stream` contesta
exactamente el mismo JSON**, medido: mismas claves (0 de más, 0 de menos) y el
mismo valor (11 vendedores por las tres vías).

**Y el cuerpo final no se arma aparte: se lee de la `Response` que devuelve
`manejar()`**, así no hay dos formas de armar la respuesta que se puedan separar
con el tiempo. Eso ya pasó el 30/10 con `listas`.

### Lo que lee la persona en la pantalla

```
Mirando si ya lo sé contestar…
Pensando…
Buscando en el mapa de las 627 tablas…
Pensando… (paso 2 de 9)
Consultando la base (2 a la vez)…
Pensando… (paso 3 de 9)
Armando la respuesta…
Controlando cada cifra contra su fuente independiente…
```

**Ese último renglón es el slogan funcionando solo.** El cliente lo lee sin que
nadie se lo explique.

### Los dos frenos, y por qué el segundo importa más

1. **Si el vivo no abre** → vuelve solo a `preguntar4`. Una mejora de
   presentación no puede dejar la pantalla muda.
2. **Si el vivo se corta DESPUÉS de empezar → NO se reintenta.** Ahí el modelo ya
   corrió, y reintentar **paga la pregunta dos veces**. Es el 12/11 otra vez,
   cuando el conductor siguió 92 llamadas después del primer error de crédito.

---

## 4. EL DICTADO — COMODIDAD, Y SE DECLARA LO QUE NO SE PUEDE PROBAR

Web Speech API, `es-AR`. **El botón arranca `[hidden]` y sólo se prende si el
navegador tiene `SpeechRecognition` de verdad**: un botón que está y no anda es
peor que no tenerlo. No manda la pregunta sola al terminar de dictar —una frase
mal escuchada no la va a pagar nadie— y se corta sola a los 45 segundos.

**Y se declara, antes de entregar y no al cierre: no se puede probar que Google
entienda una voz de verdad.** Eso necesita el micrófono del usuario y su voz.
También queda escrito que **Chrome manda el audio a los servidores de Google**:
la pregunta dictada sale de la empresa.

---

## LAS DOS PUERTAS NUEVAS, Y LAS DOS CAGADAS QUE ENCONTRARON SOLAS

**Puerta 15, `los pasos en vivo` (`control/vivo.js`).** Los pasos se apagan **en
silencio**: si el stream deja de llegar la pantalla no se rompe —vuelve sola a
`preguntar4`— y nadie se entera de que la mejora dejó de existir. Es el mismo
golpe del 10/11, cuando trece puertas pasaron con `ventas.html` rota. Controla
también los dos frenos, con un servidor de mentira que manda los eventos con sus
esperas de verdad.

**Puerta 16, `el dictado` (`control/voz.js`).**

**Y el arnés de la voz encontró DOS defectos míos en el control, el primer día:**

1. **Chromium trae `webkitSpeechRecognition` aunque no funcione.** La corrida
   “sin soporte” no agregaba el doble y daba por hecho que entonces no había
   reconocedor. Falso: el Chromium de Playwright lo expone igual, sin servicio
   atrás. **El control estaba midiendo otra cosa.**
2. **Un botón que no se puede tocar reventaba el control entero.** Con el armado
   roto el botón queda escondido, `pg.click` se colgaba 30 s y mataba la corrida.
   **Un control que se muere no es un control que detecta.**

---

## LO QUE SE APRENDIÓ Y NO ESTABA ESCRITO

**UN SHA QUE SALE DE VOLVER A TIPEAR 46 KB NO MIDE EL SERVIDOR: MIDE MI TIPEO.**
Para asentar `preguntar5` en `edge_verificada` hacen falta `sha_vivo` y
`bytes_vivos`, los dos NOT NULL. El contenedor no llega a `api.supabase.com`, así
que el único digest mecánico de lo vivo es el **`ezbr_sha256` que calcula el
servidor**. Copiar el cuerpo a mano para hashearlo y “comparar” habría sido
teatro: el diff probaría mi transcripción, no el despliegue. Se asentó el del
servidor, **declarando en la nota exactamente eso**, más la conducta medida.

**CASI ACUSO AL TABLERO DE ESTAR LENTO, POR TERCERA VEZ EN TRES DÍAS.** El Chrome
se colgó a mitad de la sesión y la conclusión fácil era “volvió lo del 10/11”. Se
midió antes de decirlo: `api_margen_tablero_v3` tarda **2.018 ms** y devuelve
98.235 bytes, y el servidor corta a los 8 s. **El Tablero está bien.** Era el
navegador, y se resolvió pidiendo el contexto de pestañas de nuevo.

**Y CASI DOY POR ROTA UNA RESPUESTA QUE ESTABA BIEN.** La Ayuda contestó
**11 vendedores**; conté `gva18` y me dieron 20, y estuve a punto de reportarlo.
`gva18` es el **maestro de provincias**. Los vendedores son `gva23`: **11**.
Lo resolvió el mapa en diez segundos — el mismo mapa que el 12/11 se analizó
tabla por tabla.

**“CARA” DICHO POR EL TRABAJO SE LEE COMO DICHO POR LA PLATA.** Se escribió que
los pasos en vivo eran “la más cara de construir”, hablando de esfuerzo, y
Aníbal frenó todo creyendo que era gasto. **Cuando se habla de plata con alguien
a quien ya le gastaste crédito sin permiso, la palabra tiene una sola lectura.**
El gasto real del día fue **una sola pregunta paga: ~$0,14**.

---

## LA MEDICIÓN DE ACCESO DEL DÍA

Diez cifras leídas de `tablero.html` **en el panel publicado**, con la sesión del
usuario, comparadas contra `api_margen_tablero_v3` en la misma corrida, llamada
con parámetros con nombre y las cuatro calidades firmes:

| En la pantalla | En la base |
|---|---|
| 35,4% | 35.4 |
| 54,8% | 54.8 |
| $4.404.443.043 | 4404443043 |
| $1.560.055.595 | 1560055595 |
| $2.844.387.449 | 2844387449 |
| 4.311 de 4.560 | 4311 / 4560 |
| 62,0% sobre $7.109.346.134 | 62.0 / 7109346134 |
| $2.288.733.519 · 32,2% | 2288733519 / 32.2 |
| 133 bajo el costo | 133 |
| 249 en cuarentena | 249 |

**Las diez idénticas.**

Y la Ayuda, usada con la mano en la pantalla publicada con el código nuevo:
`cuantos vendedores hay` → **11** = `count(*)` de `gva23`, en 2,3 s, **$0**,
con los carteles pintándose de a uno.
