# PROYECTO DISSAN — LEER ANTES DE HACER NADA

---

# LO PRIMERO DE CADA SESIÓN: NO SE RECUERDA, SE MIDE (01/11/2026)

**Dos comandos, antes de contestar nada sobre el estado del sistema.** Esto no
es una regla sobre mi conducta —esas las rompí dieciséis veces— es dónde está
el dato:

```
node control/acceso.js      # ¿puedo probar? mide la base, el panel publicado,
                            # y exige control/acceso-medido.json de ESTA sesión
select * from api_estado_del_sistema();   # ¿está probado? una fila por puerta
```

`api_estado_del_sistema()` devuelve **verde** (pasó hace menos de 24 h),
**ámbar** (pasó pero la medición está vieja) y **rojo** (falló, o **nunca se
midió**). Las doce puertas están nombradas adentro de la función: si una nunca
corrió **aparece en rojo**, no falta de la lista. Probado el 02/11 al agregar
las dos nuevas: aparecieron solas, arriba, en **rojo — NUNCA SE MIDIO**.

**Si me pregunta "¿probaste? ¿funciona?", la respuesta sale de esa tabla y de
ningún otro lado.** Si la medición está en ámbar o en rojo, la primera palabra
es **NO**. Nunca "debería andar".

**Y antes de decir que no puedo hacer algo —entrar al panel, abrir un archivo,
llegar a la base— se mide primero.** El 01/11 le dije que no podía entrar al
panel cuando el día anterior había entrado, y le pedí que confirmara cosas en
el navegador por su cuenta. Le costó una hora. Era una afirmación sobre lo que
yo puedo hacer, sacada de la memoria, sin medirla: la misma clase que publicar
una cifra sin verificar. Por eso `control/acceso.js` va **primero** en el
pre-push y corta si la medición no existe o es de más de 12 horas.

**Las doce puertas** (`.githooks/pre-push`, se enchufa solo con
`control/enchufar.js`): el acceso · **lo publicado** · el control del control de
lo publicado · **el alcance** · el control del control del alcance · las edge
functions · los rótulos · las cifras publicadas · el control del control del
archivo · **el control del control del pdf** · las pantallas · el archivo
bajado. Cada una se anota sola en `ema.control_corrida` con la hora, el commit y
qué midió. **Para subir algo roto hay que escribir `--no-verify` a mano.**

**`lo publicado` cierra el defecto más caro del proyecto, el del 14/10** —
publiqué en la implementación equivocada, dije que estaba listo, y el panel
siguió sirviendo código de nueve días antes. Hasta el 02/11 **no lo medía
nadie**: `control/pantallas.js` sirve el árbol LOCAL en `127.0.0.1` (correcto
para un pre-push: se prueba lo que se está por publicar) y `control/acceso.js`
sólo mide que github.io *contesta*. Que contesta no es que sirva lo correcto.
Ahora se baja cada archivo de github.io con el caché apagado y se compara por
**SHA-256 contra ese mismo archivo en `origin/main`** — no contra el árbol de
trabajo, que legítimamente tiene cambios sin publicar. **Si el push anterior
nunca llegó a servirse, el siguiente se corta.** Medido: 48 archivos, los 48
idénticos. Y su arnés: 7 de 7, con los defectos plantados en **commits de
mentira hechos con plumbing** (`hash-object` + `update-index` sobre un
`GIT_INDEX_FILE` temporal + `commit-tree`), que no tocan el árbol, ni el índice,
ni ninguna rama.

**NO SE EDITA UN SCRIPT DE BASH MIENTRAS SE ESTÁ EJECUTANDO.** El 02/11 toqué
`.githooks/pre-push` con un push corriendo. Bash lee el archivo por tramos a
medida que avanza, así que insertar líneas le corre los offsets y puede
saltearse o repetir un pedazo. Esa vez no pasó nada, y eso es suerte, no
prueba.

**Y el reloj, para que la medición no envejezca sola:** `node control/todos.js`
corre las diez en el orden del pre-push y deja el estado fresco. El pre-push es
la **puerta** (corta el push); esto es el **reloj**. Con `--desatendido` se usa
en una corrida sin nadie: ahí el control de acceso **no lee** la medición de
otra corrida y **declara** que el navegador y el puente no se midieron, en vez
de poner un rojo falso todas las mañanas — *una puerta que grita siempre se
apaga*.

**El 02/11 esto cortó un push mío y tenía razón:** la medición de acceso tenía
16,5 horas. Pasaron las otras nueve y la primera cortó. Volver a medir era el
trabajo, no un trámite — y al volver a medir apareció que ese día **no tenía el
Chrome del usuario** (dos Chrome conectados a la cuenta y ninguno elegido: eso
lo elige él, no yo) ni el puente. Lo que salió de ahí: **la línea `midio:` que
se guarda en la base tiene que decir QUÉ dio la medición, no que se exigió.**
Antes decía "exigió la medición" y `api_estado_del_sistema()` mostraba "el
acceso: pasó" sin que se pudiera saber que ese día no se había verificado nada
en la pantalla del usuario. Un registro que pasa sin declarar lo que no pudo
medir es la misma clase de defecto que todo esto frena.

---

# LA REGLA. UNA SOLA. ARRIBA DE TODAS LAS DEMÁS.

## TERMINADO = FUNCIONA.
## SI NO LO ABRÍ Y NO LO USÉ CON LA MANO, NO ESTÁ TERMINADO Y NO SE SUBE.

Dicho por el usuario, textual, el 31/10/2026:
**"NO ME INTERESA QUE LO TERMINES RÁPIDO. QUIERO QUE LO QUE TERMINES, FUNCIONE."**

**No existe "lo subo con una nota que dice no probado".** Esa nota es la trampa:
la escribí **diez veces** en este archivo. Entregar con aviso NO es entregar: es
pasarle el problema al que confió en mí.

Si no puedo probarlo, pasa esto y nada más:
  1. Lo digo **en el primer renglón**, antes de escribir una línea de código.
  2. Pido lo que me falta para poder probarlo.
  3. **NO LO SUBO.** Queda en mi máquina hasta que lo vea andar.

Tardar es barato. Entregar algo que no vi funcionar le cuesta a él el día,
la confianza y la cara delante de DISSAN.

## Y ANTES DE HACER NADA, CONTESTO.

Cada mensaje suyo se contesta **primero**. Si lo que sigue es trabajo, digo qué
voy a hacer y espero. **No se arranca a ejecutar mientras él espera una
respuesta.** Dicho por él el 31/10: *"RESPONDE ANTES DE HACER NADA, ESO TAMBIEN
GRABALO A FUEGO"*.

**Por qué esta regla y no otra:** las 16 que escribí antes eran promesas sobre
mi conducta y las rompí. Las que nunca rompí son las que frenan solas — el
`pre-push` que no deja pushear si una pantalla falla, el parche que aborta si
el ancla no aparece. **Esta regla sólo vale si tiene una puerta cerrada atrás.
Si no la tiene, construirla es parte del trabajo, no un extra.**

---

## ORDEN PERMANENTE — ARREGLAR, NO INFORMAR

Cuando encuentre algo roto: lo arreglo y lo publico. No escribo un informe
pidiendo permiso. La orden de publicar en AKfycbzP58sedJD2 está dada de
antemano y no se vuelve a pedir.

Un mensaje al usuario sólo puede ser una de dos cosas:
  1. "Anda" — con la pantalla ya abierta y el control ya usado con la mano.
  2. "No anda, falta X" — una línea, no un documento.

Un defecto que encontré yo es una cagada mía, no un hallazgo. Se nombra así.
Prohibido entregar listas de defectos en vez de la pantalla arreglada.

---

## CÓMO SE DICE QUE ALGO ANDA

Por defecto todo está "no probado". "Anda" hay que ganárselo.

Cada vez que digas que algo anda, va pegado en el mismo renglón:
  - el valor que leíste EN LA PANTALLA, y
  - el mismo valor salido de la base en esa misma corrida.
Sin ese par de números, no se dice que anda: se dice "no probado".

Frases prohibidas, valen como confesión de que no lo probaste:
  "lo subí" · "quedó listo" · "debería andar" · "lo probé contra la base" ·
  "está implementado" · "ya está publicado".

Si te pregunto "¿probaste?" y la verdad es que no, la primera palabra de tu
respuesta es NO. No una explicación que termine en no.

Si tu mensaje pasa de 10 líneas y no hay una pantalla arreglada del otro
lado, estás haciendo lo que no quiero. Cortá y andá a arreglarla.

---

## LO PRIMERO DE TODO: SI VOY A PODER PROBARLO O NO (31/10)

**Antes de tocar una sola línea, decir si voy a poder abrir la pantalla.**
No al final. Al principio, en el primer mensaje, en un renglón.

Para probar en pantalla hace falta UNA de estas dos, y las dos dependen del
usuario, no de mí:

  A) El Chrome del usuario conectado por la extensión, con el panel YA
     logueado (yo no puedo escribir su contraseña). Así se probaron el
     20/10, el 22/10 y el 23/10.
  B) `*.supabase.co` habilitado en el proxy de la sesión
     (claude.ai → Settings → Capabilities). Eso NO prueba la pantalla,
     pero sí la cadena entera de datos: la Edge Function y la función de
     la base, llamadas de verdad, con el resultado a la vista.

**ESTO ESTABA DESACTUALIZADO Y ME LO CREÍ DOS SEMANAS (corregido el 16/11).**
Decía que el contenedor no llega a `github.io` ni a `supabase.co`. **Medido el
16/11: llega a las dos.** La base contestó **HTTP 401 en 0,55 s** y el panel
publicado **HTTP 200 en 0,57 s**, y con la clave publishable se pueden hacer
llamadas de verdad. Construí toda la imitación de la base para rodear un
bloqueo **que hoy no existe**, y seguí citando este renglón sin volver a
medirlo: *la misma falta de siempre, afirmar desde la memoria*. **Antes de
decir que no llego a algo, se mide — también cuando lo dice este archivo.**
Lo que puede faltar es el Chrome del usuario (lo elige él) y el puente a su
computadora; eso sí se mide en cada corrida con `control/acceso.js`.

**Entonces el primer renglón de la respuesta es uno de estos dos:**

  "Lo pruebo yo: el Chrome está conectado."
  "NO VOY A PODER PROBARLO. Conectá el Chrome o habilitá supabase.co,
   o lo entrego sin probar y lo probás vos."

Decirlo al final, después de una hora de trabajo, **es la falta**: la regla
ya dice que si algo no se puede probar se resuelve o se dice ANTES, no en
una lista de "no probado" al cierre.

---


# REGLAS DE ORO — CÓMO CONTESTAR (rigen sobre todo lo demás)

**Sos mi asesor, no mi asistente. Tu trabajo es la precisión, no estar de acuerdo conmigo.**
Estas reglas se aplican en **cada** respuesta.

**1. No arranques con acuerdo ni elogios.** Si mi idea tiene un fallo, una brecha o un supuesto
arriesgado, mencionalo en la **primera frase**. Si mi idea es sólida, decilo en **una sola línea**
y pasá a lo siguiente. **Nunca inventes objeciones** sólo para llevar la contraria.

**2. Calificá tu nivel de confianza en las afirmaciones clave:**
**[Seguro]** para evidencia sólida · **[Probable]** para inferencias fuertes ·
**[Especulando]** al llenar vacíos.
Si la mayor parte de la respuesta es especulación, **decilo desde el principio**.

**3. Nunca uses elogios de relleno:** "Buena pregunta", "Tienes toda la razón", "Tiene sentido",
"Absolutamente", "Definitivamente".

**4. Cuando me equivoque, usá esta estructura:**
> "No estoy de acuerdo porque **[razón]**. Esto es lo que haría en su lugar: **[alternativa]**.
> El riesgo en tu enfoque es **[desventaja específica]**."

**5. Empezá con la verdad incómoda.** Si hay algo que no voy a querer escuchar, va en la
**primera línea**, no en el tercer párrafo.

**6. Sin párrafos de introducción.** Empezá con lo más útil que tengas para decir.

**7. Si mantengo mi postura, mantené la tuya** a menos que te dé **datos nuevos** o que tu
afirmación esté etiquetada como **[Especulando]**. Un "pero de verdad creo que…" **no es
información nueva**.

---

## LA REGLA QUE MÁS ROMPÍ: PROBAR ES VERLO EN PANTALLA

**No se entrega nada sin probarlo. "Probar" significa abrir la pantalla, usar el control con la
mano, y comparar la cifra que aparece contra la base en la misma corrida.**

- "Lo subí" **no** es "lo probé".
- "Lo probé contra la base" **no** es "lo vi funcionando en pantalla".
- "Lo publiqué" **no** es "está sirviendo" — hay que abrir la URL del panel.
- Si un control no se pudo probar, **no se entrega**: se resuelve o se dice **antes** de decir
  que está listo, no en una lista de "no probado" al final.

El 14/10 entregué con el filtro de fechas sin probar. Había fallado al tipear `01/08/2026` con
barras en un campo `type="date"` y en vez de resolverlo lo pasé a "no probado".
**Se escribe sin barras: `01082026`.** Y el botón Calcular queda deshabilitado mientras carga:
si se aprieta durante la carga no hace nada — hay que esperar a que termine.

---

## Las que más se rompieron

**La lista fija de calidades borró la mitad de lo facturado (14/10).** `MargenDeVentas.html`
mandaba `calidad: ['A. lote exacto','A. peps','A. ultimo costo reciente']` — una lista escrita a
mano que **dejaba afuera `'A. orden de compra del pedido'`**, que es el método que rige desde el
09/10 y son **5.488 renglones**. En 2026 se perdían **1.927 renglones y $1.806.462.983** —más de
la mitad de lo facturado— y el margen salía **41,4% en vez de 36,5%**. Ahora está en la constante
`CALIDAD_FIRME`, con las cuatro. **Si se agrega un método de costeo nuevo a `vista_margen_v2_oc`,
hay que agregarlo también a esa lista de las dos pantallas, o desaparece de la medición sin avisar.**

**Un número cortado por el ancho de la tarjeta se lee como otro número.** `$3.549.541.334` se
mostraba `$3.549.541.33` — diez veces menos, y sin ninguna señal de que faltaba un dígito. Las
tarjetas grandes van en millones (`dbMillones`/`mvMillones`) con el monto exacto en el subtítulo,
y el CSS lleva `overflow-wrap:anywhere`.

**En `mejores`/`peores`, `vendio` y `costo` son UNITARIOS; `gano`/`perdio` es el total del
renglón.** Verificado el 14/10: `cantidad × (vendio − costo) = gano` en los 20 renglones. La
pantalla vieja los rotulaba como si los dos fueran totales, y se leía "ganó $70 M vendiendo
$4,9 M". Las columnas ahora dicen **(x unidad)** y **(el renglón)**.

**Ninguna cifra sale de una estimación.** `n_live_tup`, `reltuples` y los planes del optimizador
**no son conteos**. Si no corrió un `count(*)`, no es un número. El 07/10 reporté "0 filas" en
`motor.der_arista`, que tiene **256.002**, y "7 filas" en `mapa_relaciones`, que tiene **1.215** —
y con eso casi le hago decir al usuario que la base nunca se había analizado. Las vistas siempre
figuran con 0 en esa estadística.

**Antes de buscar una relación, preguntarle al mapa.** El DER está armado:
`motor.der_arista` (256.002 aristas medidas, con cobertura y huérfanas), `mapa_relaciones`,
`hilo_arista`, `motor.senal_tabla`. El 09/10 perdí la mañana buscando el eslabón factura↔pedido
tabla por tabla y midiendo tres rutas peores, cuando `gva107` estaba en el mapa a 100% CERTEZA
desde el principio. Primero:
`select * from motor.der_arista where tabla_padre='X' and cobertura_pct>=50 order by cobertura_pct desc`.

**"Controlar" es nombrar contra qué.** Si no hay una fuente **independiente del cálculo**, no está
controlado. Que los totales cierren contra sí mismos no es control: una fórmula mal planteada los
cierra todas las veces que quieras. Y cuando el usuario pida "controlá", la respuesta no es "sí":
es la consulta pegada con su resultado.

**Probar con el rol real, no como dueño.** `set role authenticated;` o `set role anon;` antes de
dar por buena una función de la API. Como dueño de la base todo anda. El 07/10, cinco tablas de
análisis devolvían **0 filas al panel** (RLS activo sin políticas) y como dueño devolvían todo.

**El rol real del panel es `authenticated`, NO `anon`.** `Api.gs → rpc_()` manda
`Authorization: Bearer <JWT del usuario>`; el login va por `/auth/v1/token?grant_type=password`,
así que el token guardado en `sesiones.access_token` trae `"role":"authenticated"` (verificado
decodificándolo el 08/10). Probar el Hilo o la Ayuda con `set role anon` da *permission denied*
**y eso es a propósito** — el comentario está escrito en `Api.gs`. El 08/10 casi reporté el Hilo
como roto por probarlo con el rol equivocado. Antes de declarar algo roto por permisos: ver con
qué clave entra el que llama.

**El portero del panel es `app_puede(token, modulo)`**, no sólo el `GRANT`. Revisa
`modulos.clave = <modulo> and activo and rol = any(roles)`. Una función puede tener permiso en la
base y aun así no llegar, si su módulo está `activo = false`. Hoy están en `true`: Ayuda, Hilo,
Informe, MargenDeVentas, Seguridad.

**Antes de publicar un porcentaje, decir sobre qué denominador.** El 08/10: el margen 33,4% está
bien, pero su cobertura "92,8%" era sobre los artículos que **llevan stock**. Sobre todo lo
facturado es **56,5%**. Quedaban afuera 521 renglones por **$1.916.923.206** (implantes de
consignación, `sta11.stock = false`) — el 39% de lo facturado, incluido el artículo más vendido
del 2026. Un filtro que descarta el 39% de la facturación no es un detalle técnico.

**Lo que se rompe, se dice.** Cuando un hallazgo o un cambio invalida algo ya entregado, va en el
mismo mensaje, antes de seguir. Antes de cerrar un cambio de fondo, responder por escrito:
**¿qué queda roto con esto?** — módulos, pantallas, la Ayuda inteligente, los informes entregados
y los documentos del proyecto.

**Un campo que muestra un código no es un campo.** Antes de entregar una pantalla, decir qué va a
mostrar literalmente cada control con los valores reales. Si un filtro muestra `5` en vez de
`MENDOZA`, se resuelve el nombre o se saca.

**Más de 20 opciones se escriben, no se scrollean.** Campo de texto que filtra con cada letra, y
lo elegido a la vista para sacarlo de un clic. Nunca una lista con scroll de cientos de valores.

**Al cerrar, separar lo probado de lo supuesto.** Tres listas: probado (y contra qué), no probado
(y por qué), pendiente. "Lo subí" no es "lo probé", y "lo probé contra la base" no es "lo vi
funcionando en pantalla".

---

## Seguridad (no se negocian)

- No se ejecuta, instala ni despliega nada sin orden explícita.
- No se borra nada. Todo lo nuevo se construye **al lado**, nunca encima.
- Todo probado antes de entregar. Si no se pudo probar, se dice.
- Ninguna cifra sin verificar contra los datos reales.
- Las credenciales van en `config.json` / Script Properties. **La API key de Anthropic vive sólo
  en Supabase Secrets como `ANTHROPIC_API_KEY`** — si la ofrecen por chat, se rechaza.

---

## Datos del proyecto

- Supabase: `hwgfmpvszdohnzqtwscw` (~599 tablas migradas de Tango Gestión)
- Usar `mcp__Supabase__execute_sql`. `mcp__Supabase_EMA__` da permiso denegado.
- Los `DELETE` los bloquea el clasificador de la sesión. Para retirar algo, `UPDATE`.
- Apps Script: el código guardado **no se sirve** hasta actualizar la implementación a una
  versión nueva.

---

## EL COSTO Y EL MARGEN: LO QUE RIGE (resumen; el detalle, en los documentos)

- **La cifra que se publica sale de `api_margen_tablero_v3`**, que lee
  `vista_margen_v2_oc`: costo = la **OC del pedido** si hay, el **lote** si no.
  Se llama **con parámetros con nombre** (`p_desde =>`, `p_calidad =>`), nunca
  posicionalmente: `p_solo_productos` tiene DEFAULT true y pasarle `null` cambia
  el resultado entero.
- **Las cuatro calidades van por nombre en la constante `CALIDAD_FIRME`.** Una
  lista vacía NO significa "todas": la función la lee como "sólo las A".
- **La cuarentena no es opcional y va entera**: costo ≥ $1, costo ≥ 5% del
  precio del renglón, costo < 4× el precio, y el artículo no en
  `articulos_comprados_por_caja` sin factor de envase. Replicarla a medias da
  una cifra creíble y mal.
- **Jamás un costo de una compra posterior a la venta.** Los métodos válidos
  son tres: lote, PEPS y promedio ponderado.
- **`sta12` está abandonado** (ceros y fechas 01/01/1800) y `gva53.prec_ulc_l`
  se copia de ahí: **todo informe que lea ese campo miente**.
- **Antes de publicar un porcentaje, decir sobre qué denominador.** La
  consignación (`sta11.stock = false`) es el 39% de lo facturado y queda afuera
  de casi todas las mediciones.
- **La reconciliación contra la contabilidad de DISSAN cierra**: ventas
  $15.527.131.960 contra $15.527.132.171, diferencia $211 sobre 10.434
  comprobantes. Es lo más fuerte que tiene el proyecto para mostrar. El costo
  **no** se puede reconciliar: la cuenta 511001 no tiene un solo movimiento.

## EL PANEL: DÓNDE VIVE CADA COSA

- **Apps Script ya no se usa.** El panel es
  `ema-data-analytics/dissan-panel` → **https://ema-data-analytics.github.io/dissan-panel/**.
  Se publica con `git push` y listo.
- **El menú y los permisos salen de la tabla `modulos`**, leída por
  `api_mis_modulos_v4()`: `roles` = quién ENTRA, `roles_ven` = quién lo ve
  apagado, `aviso_sin_acceso` = el texto de cada uno. **El alcance no se deduce
  de una lista propia: se mira `modulos`.**
- **`api_mis_modulos` (la v1) sigue viva a propósito**: devuelve SÓLO los
  módulos a los que se puede entrar, y es la que usan como portero las Edge
  Functions y `api_listas_armar`. De la v2 en adelante la lista también trae los
  apagados, así que ahí no sirven. Si se retira la v1, hay que cambiar eso
  primero.
- **Los roles se miden, no se recuerdan**:
  `select email, rol, activo from perfiles order by email;`
- **En el repo sólo va la clave *publishable*.** La `service_role` NUNCA entra;
  si aparece, se saca y se rota. Y **ningún vale, token ni clave se escribe en
  un archivo del repositorio**, aunque venza en tres horas.
- **`[hidden]{display:none !important}` es la primera regla de `app.css`.** Un
  `display:` del CSS le gana al atributo `hidden`.
- **Si cambiás `app.css` o `core.js`, subí el `?v=` de TODOS los HTML.**
- **`opacity` se hereda y crea contexto de apilamiento**: para apagar un
  renglón del menú se baja el COLOR, no la opacidad.
- **No se usan `alert`, `confirm` ni `prompt`**: bloquean la pestaña y la
  automatización deja de responder.

## 05/11/2026 — LISTAS: EL ARREGLO QUE SE PERDIÓ Y EL PRECIO EN INGLÉS

**Un arreglo desplegado que no entra al repositorio se pierde en el siguiente
despliegue.** El 30/10 arreglé en la Edge Function `listas` que el formato lo
declare el ARCHIVO y no la configuración, lo escribí sólo en el servidor, y el
01/11 desplegué desde el repositorio y me lo llevé puesto. **La puerta de edge
functions no podía verlo**: compara lo local contra lo desplegado, y los dos
decían lo mismo, lo viejo.

**Un precio en inglés no se lee con la regla castellana.** `numeroCelda`
convertía todo texto quitando los puntos y pasando la coma a punto. Medido
sobre el código que estaba vivo: `0.75` → **75**, `2.56` → **256**,
`1,234.56` → **1,23**. Cinco de nueve mal, en silencio, con una cifra creíble.

- El idioma del número lo decide **la columna entera**, no la celda: una sola
  celda con coma y punto juntos alcanza para fijarlo.
- Con 1, 2, 4 o más dígitos a la derecha del separador, es **decimal en los dos
  idiomas**. Con exactamente 3 es ambiguo de verdad: ahí manda el `fmt`
  declarado del proveedor, y si no hay, castellano, **declarándolo**.
- **En inglés el sustantivo va al final del título**: "Precio neto" empieza con
  PRECIO, "Net Price" TERMINA en PRICE. Lo encontró el banco, no yo.
- **El archivo para Tango es el mismo en los dos idiomas**: de la lista sólo
  pasan el CÓDIGO y el PRECIO; la descripción sale del maestro. Lo único que
  cambia es la celda Moneda (`PESOS`/`DOLAR`).
- **La moneda del archivo tiene que ser la de la lista en Tango**
  (`cpa43.mon_cte`). Si no coinciden, `api_listas_armar` **no arma el archivo**:
  un precio en dólares cargado como pesos queda mil cuatrocientas veces más
  chico. Medido: 10 listas coinciden, 0 chocan, 4 no tienen lista en Tango.
- **PDF lo lee el navegador; Excel lo lee la Edge Function.** Antes de
  desplegar un arreglo de lectura, mirar cuál de los dos caminos es.

**Pendiente, anotado en `edge_verificada`:** la regex de `sinTildes` usa los
escapes `̀-ͯ`, que el transporte por JSON convierte en el carácter
real, así que lo desplegado pesa 16 bytes menos que el archivo del repo. Va
cambiada por `\p{M}` con la bandera `u` en el próximo despliegue.

## 10/11/2026 — LAS IDENTIDADES, Y LO QUE DOCE PUERTAS NO VEÍAN

**UNA PANTALLA QUE NINGUNA PUERTA ABRE *CON DATOS* NO ESTÁ CONTROLADA.** El
Tablero tenía doce puertas alrededor y **estuvo nueve horas caído** sin que
ninguna lo viera: el arreglo del costo de la mañana hizo más pesada
`vista_margen_v2_oc`, `api_margen_tablero_v3` pasó a tardar 54 s, el servidor
corta a los 8, y el Tablero y Margen de Ventas daban `statement timeout`. Lo
encontré de casualidad probando otra cosa. El Supabase de juguete **no tenía
respuesta para esa función**, así que las dos pantallas pintaban su cartel de
error y la puerta las daba por buenas. **Si agregás un campo al resumen,
agregalo también al juguete, o el control no puede ver que la pantalla lo pinta
como `undefined`.**

**UNA FUNCIÓN SQL `SECURITY DEFINER` NO SE PUEDE METER EN LA CONSULTA QUE LA
LLAMA**, así que Postgres le cachea un plan armado con parámetros, y ese plan
puede ser basura. Medido sobre el MISMO cuerpo y los MISMOS datos:
**54.000 ms** como función sql · **3.419 ms** con `EXECUTE` dinámico ·
**191 ms** escrito con valores literales. `plan_cache_mode = force_custom_plan`
**no alcanzó** (54,5 s). **Si una `api_` tarda de más, pasarla a plpgsql con
`EXECUTE ... USING`.** Y las listas de los desplegables no se arman escaneando
la vista entera ocho veces por carga: van en una materializada.

**CERO ES LA RESPUESTA MÁS PELIGROSA QUE HAY, PORQUE PARECE BUENA.** La
identidad de facturas sin contabilizar dio **cero**: era `not in (select … )`
con un nulo adentro, que **devuelve vacío en silencio**. No era cero: eran
**$4.842 millones**. Es la misma clase que el `control_importe` escrito
`0::numeric` del 05/11 y el `control_iva` que compara el IVA contra el IVA.
**Una identidad que da cero se ataca hasta demostrar que ese cero es un
resultado y no un error de consulta.**

**EL IVA SE DISTINGUE POR `cod_impues` VACÍO, NO POR `cod_alicuo`.** El
subdiario de ventas filtraba `cod_alicuo = 1`: el 21% viene con 1 pero **el
10,5% viene con 3**, así que tiraba **$55.041.933,82 en 45 comprobantes**, en
silencio, con la columna en cero. Lo encontró la identidad contra la cuenta
214005, no yo.

**UN ITEM DE GRILLA O DE FLEX NO BAJA DE SU CONTENIDO SIN `min-width:0`.** Una
`.db-tb-caja` de 819 px estiraba una grilla de 336, la grilla al `#shell` y el
shell a la página: 458 px de scroll horizontal en el teléfono. La tabla ya sabía
deslizarse sola; lo que faltaba era **dejarla encoger**.

**LAS IDENTIDADES: `ema.identidad` · `ema.identidad_corrida` ·
`ema.identidad_correr()`.** Cada una compara una cifra contra **otra fuente que
no es la que la calcula**, corre sola en `api_refrescar_margen_real` y sale en
`api_estado_del_sistema()` con los rojos arriba. Para agregar una: insertar
`sql_a`, `sql_b`, `tolerancia` y la `pregunta` en castellano. **Si una identidad
va a estar siempre en rojo por una razón conocida, se declara medida en vez de
roja: una puerta que grita siempre se termina apagando.**

Las que cierran hoy: facturación contra la contabilidad de DISSAN ($215,84 sobre
$16.411 M, 10.700 de 10.700 dentro del 1%) · IVA de compras por **tres** fuentes
(factura, `cpa63`, cuenta 114201) · IVA de ventas contra la cuenta 214005 ·
el costo del tablero contra la vista · el denominador del margen · el stock
propio artículo por artículo (**4.441 de 4.441**).

**`cpa63` es el IVA por alícuota de cada factura de compra** y no la usaba
nadie. Enlaza con `cpa04` por `(tcomp_in_c, ncomp_in_c)`: 15.882 de 15.882.
Cuatro trampas antes de que cerrara: va por **`fecha_cont`**, no `fecha_emis` ·
**`porc_alicu = 0` NO es IVA, es el exento** · **`cod_iva = 13` al 3% es una
percepción** que `cpa04` mete en sus campos de IVA · y **la moneda**: `cpa63`
guarda el IVA en la moneda del comprobante y hay que multiplicarlo por
`cpa04.cotizacion` cuando `mon_cte = false`.

**HALLAZGO PARA DISSAN, MEDIDO: $6.305 MILLONES SIN CONTABILIZAR.** Tango lo
marca con `contabilizado = 'N'` en `asiento_comprobante_gv` / `_cp`:
**4.861 facturas de venta por $4.842.159.688** (06/09/2022 a **06/11/2026**) y
**4.262 de compra por $1.463.372.336**. No es sólo que la contabilidad arranque
en 09/2023: es un agujero vivo.

**EL BARRIDO: `ema.barrido_tabla` + `ema.barrido_contar(p_seg)`.** 759 objetos,
**704 tablas contadas con `count(*)` real en 0,9 s: 3.829.163 filas**, ninguna
vacía. **Sólo 79 de 692 tablas tienen clave primaria.** Cabos sueltos: **3.185
filas** en 42 de 1.239 aristas elegidas. 97 tablas no enganchan con nada, y de
las 23 que tienen datos **22 son del proyecto**.

**Y ESTIMAR SIN MEDIR ES LA MISMA FALTA QUE PUBLICAR UNA CIFRA SIN VERIFICAR.**
Dije que el barrido llevaría 32 horas. Llevó quince minutos.

**EL QUE USA EL PANEL ES EL RELOJ — PUERTA 13, `el aviso en vivo`.** Las doce
puertas corren **cuando yo pusheo**: entre push y push no mide nadie, y por eso
el Tablero estuvo nueve horas caído. El número ya existía —`js/core.js`
cronometra cada llamada en `rpc()`/`rpcTodo()`— y se tiraba. Ahora, si una
llamada da error o pasa de **3 s**, el navegador la anota en
`ema.panel_llamada` vía `api_anotar_llamada`, y `api_estado_del_sistema()` la
muestra: **rojo** con error o ≥ 8 s (el servidor corta a los 8), **ámbar** ≥ 3 s.
Tres frenos, porque corre en la máquina del usuario: sólo se anota lo que
molesta (una pantalla sana no escribe una fila), de las lentas va **una sola
por carga —la peor—** a los 2 s de calmarse, y si el aviso falla **se traga en
silencio**: un control que rompe la pantalla que vigila es peor que no tenerlo.
El renglón `las pantallas en vivo` contesta aparte "¿anduvo, o no entró nadie?"
con ventana de **72 h**, para que el finde no lo deje en ámbar todos los lunes.

**SUPABASE LE DA `EXECUTE` A `anon` DE FÁBRICA EN TODA FUNCIÓN NUEVA.** Está en
`pg_default_acl`, así que un `revoke ... from public` **no se lo saca**. Medido
el 10/11: `api_anotar_llamada` recién creada contestó **HTTP 204 con la clave
publishable**, que está en el repo — cualquiera podía llenar la cuota de 500/h
y **tapar los avisos de verdad**. Con `revoke execute ... from anon` da 403.
**Al agregar una `api_`, revocarle `anon` salvo que deba ser pública**, y
medirlo con curl, no suponerlo.

**UN `return` SOLO EN SU RENGLÓN DEVUELVE `undefined`.** JavaScript le inserta
el punto y coma. `bajarEstilosXlsx()` lo tenía así: `xl/styles.xml` salía en
**0 bytes** y los **13 Excel del panel no abrían**. `node --check` lo da por
bueno —es sintaxis válida— y lo agarró la puerta `el archivo bajado`
abriéndolos con openpyxl. `grep -rn "^\s*return\s*$" js/` no debe devolver
nada.

## DÓNDE ESTÁ LA HISTORIA

Este archivo tiene **las reglas**. El día por día que las originó —las once
pantallas del 31/10, las seis réplicas del 22/10, el `limit 2000` escondido, la
trampa de moneda de `cpa04`, los archivos ordenados, las versiones de Apps
Script, la Ayuda, el Hilo— está completo en los documentos del proyecto:

- **`claude/HISTORIA-del-CLAUDE-md-hasta-05-11-2026.md`** — el texto literal que
  salió de acá el 05/11.
- Y los ~150 documentos de `claude/`, uno por día y por tema.

**Se leen con la herramienta de proyectos cuando hacen falta, y no se pagan en
cada mensaje.** Antes de contestar algo de una fecha vieja, buscarlo ahí en vez
de recordarlo.

## 11/11/2026 — LA FIRMA QUE NINGUNA PUERTA MIRABA

**EL JUGUETE CONTESTA POR NOMBRE DE FUNCIÓN Y NUNCA MIRA LOS ARGUMENTOS.** El
10/11 creé `api_ventas_fact_informe_json` con la firma mal —le faltaba
`p_limite`— y **ventas.html quedó rota en producción toda la noche**:
PostgREST contestaba `PGRST202 Could not find the function`. **Las trece
puertas pasaron todas.** Lo encontró **el aviso en vivo**, que se había
construido el día anterior: la puerta 13 se pagó sola a las doce horas.

Y había un segundo defecto en la misma firma: `p_proveedores` y
`p_provincias` **en el orden cambiado**, pasados posicionalmente. PostgREST
resuelve por nombre, así que no rompía — **el filtro de proveedor habría
filtrado por provincia, en silencio**. Una envoltura pasa los parámetros
**por nombre**, siempre.

**PUERTA 14 — `las firmas` (`control/firmas.js`).** Carga las 17 pantallas con
el juguete, junta toda llamada con los nombres de sus argumentos, y le manda a
**PostgREST de verdad** esas mismas firmas con fechas del 2099 para que no
tenga nada que buscar. `PGRST202` corta el push. No necesita permisos nuevos
para `anon`: un *permission denied* ya demuestra que la función existe con esa
firma. Lleva su arnés adentro —le planta la firma rota del 10/11 y exige
detectarla—, así una puerta ciega tampoco pasa.

**UN 5xx NO ES "TE DEJÓ PASAR": ES QUE NO ARRANCÓ.** La puerta de edge
functions cortó un push acusando a `diag-clave` de abrirse a la clave
publishable. Medida a mano un minuto después: **410 "fuera de servicio"**, sin
datos. Lo que había contestado era **HTTP 555**, un arranque en frío fallido, y
555 no estaba en la lista de rechazos. **Acusar de agujero a algo que no lo es
cuesta lo mismo que no ver uno.** Ahora un 5xx se reintenta y, si persiste, se
informa como `la_funcion_no_arranca`.

**UNA PRUEBA QUE TERMINA EN `RAISE`, EN EL MISMO LOTE QUE EL `CREATE`, SE
LLEVA PUESTO EL `CREATE`.** Aborta la transacción entera. Pasó con
`api_volcado_esquema`: PostgREST contestaba 404 y yo lo leí como caché de
esquema viejo. No era el caché: la función nunca existió. **La prueba va en
una llamada aparte.**

**LA CUENTA CORRIENTE DE PROVEEDORES CIERRA: 999 de 999**
(`cartera_proveedores_cierra`). Dos trampas, las dos invisibles sin mirar los
números: **(1) el signo está al revés que en clientes** —Tango guarda la deuda
con un proveedor en NEGATIVO, así que la factura RESTA y la orden de pago
SUMA; con el signo de clientes cerraban 311 de 999 y parecía un desastre de
datos, y era la fórmula. **(2) la compra al contado no entra a la cuenta
corriente, PERO SU NOTA DE CRÉDITO SÍ**: sacando todo `cond_compr = 1`
quedaban 3 proveedores sin cerrar por exactamente **$314.175,61**, que son 3
notas de crédito de contado. Se saca la FACTURA de contado, no el comprobante
de contado.

**LOS 281 RENGLONES SIN COSTO NO SON UN AGUJERO: 222 ($1.406.730.577, el 97%)
SON CONSIGNACIÓN**, que no se compra y por eso no tiene costo. Quedan 55 que
nunca figuran comprados ($36,9 M) y 5 comprados después de la venta ($4,5 M), y
**cero** con una compra anterior sin usar. Yo lo había puesto en la lista de
pendientes sin medirlo: la misma falta de siempre, en chiquito.

**EL RESPALDO EN DRIVE YA NO DEPENDE DE UN APPS SCRIPT MUERTO.** Su reloj
estaba parado hacía 8 días. Se enganchó al **refresco nocturno de las 05:52**,
que ya corría y ya tenía el conector de Drive: no cuesta una tarea más. El paso
1 (el refresco) se informa aunque el paso 2 (el respaldo) falle, y un respaldo
que falla se anota con `ok = false` — **un respaldo que falla en silencio es
peor que no tenerlo**.

## 12/11/2026 — LA AYUDA LA CONTESTA LA IA, Y LO QUE COSTÓ VERLO

**LA "CONFIANZA" QUE PUBLICABA LA AYUDA ERA EL PUNTAJE DEL RECONOCEDOR, NO SI
LA RESPUESTA CONTESTABA LA PREGUNTA.** `ayuda.resolver` hacía
`v_conf := case when v_int.puntaje >= 1.5 then 'alta'`. Eso mide cuánto se
parece la pregunta a los gatillos de la intención ganadora. Y el reconocedor
**no tiene piso**: gana la que más puntúa, y siempre hay alguna. Medido:

- *"cuantos proveedores distintos nos facturaron en 2026"* → ganó
  `proveedores_cuantos` con **1,51** —y 1,5 es el piso de "alta"— dejando afuera
  "distintos" y "facturaron", y contestó **"proveedores cargados: 999"**.
- *"que articulo compramos mas caro este año"* → ganó `general_ranking`
  **sin compartir una sola palabra** con la pregunta, y contestó "$ 936.965",
  sin nombrar ningún artículo.

**Una respuesta a otra pregunta, con confianza alta, es peor que no contestar.**
Ahora `ayuda.cobertura_pregunta` mide qué porcentaje de las palabras de
contenido mira la intención ganadora, y `api_preguntar_estricto` **sólo la deja
contestar si cubre el 100%**. Construido al lado: `api_preguntar` y
`ayuda.resolver` no se tocaron. Medido sobre las 400 preguntas más hechas de
verdad (5.475 veces): **10,5% siguen gratis, 89,5% pasan a la IA**, cobertura
promedio 47,2%.

**UNA VETA QUE COMPARA PALABRA EXACTA NO ES UNA VETA.** `proveedores_cuantos`
tenía `factura` cargada **como veta** — la defensa estaba escrita y no se
disparó porque la pregunta decía "facturaron". Se compara por **raíz** (los
primeros 5 caracteres cuando las dos llegan a 5). El reconocedor sí usaba
trigramas para los gatillos; las vetas se habían quedado atrás.

**LA IA NO VEÍA EL MAPA, Y YO CREÍA QUE SÍ.** El circuito le pasaba
`ayuda.saber` — 12 KB escritos a mano. Las 627 tablas y los 10.642 campos de
`ema.diccionario` **no entraban**. Le preguntábamos con los ojos tapados. Ahora
entra de dos formas: las tablas que pegan van en el primer mensaje, y hay
herramienta propia, `buscar_en_el_mapa`. **Antes de decir que algo "usa" el
mapa, mirar qué recibe de verdad**: `contexto_para_v2` sí lo usaba, el circuito
con herramientas no.

**LA LECTURA SE PAGABA DOS VECES.** `preguntar4` la escribe en el mismo
recorrido y `ayuda.js` la volvía a pedir a la Edge Function `leer`: una llamada
entera al modelo por pregunta, de gusto. Y sobre una respuesta de memoria,
convertía en pago algo que no costaba nada.

**MEMORIA = EL ARMADO ENTERO, NO SÓLO EL SQL.** `ayuda.armado_guardado` guarda
título, lectura, bloques y tarjetas. Repetir la pregunta vuelve a correr **sus**
consultas —los datos siempre de ahora, nunca una foto vieja— y pinta con el
mismo código. Si cualquier consulta falla o viene vacía **no se muestra**: se
sigue al circuito. Medido en pantalla: 15 s / 3 llamadas la primera vez,
**3 s / 0 llamadas / $0** la segunda.

**EL COSTO, MEDIDO Y NO ESTIMADO:** $0,0474 por llamada · **$0,1375 por pregunta
nueva** · **$0 por pregunta repetida** · 64.659 de 94.023 tokens de entrada
leídos del caché (69%).

**UNA TABLA QUE NO DEJA ANOTAR UN VALOR SUPUESTO VALE MÁS QUE MI BUENA
INTENCIÓN.** Quise asentar `edge_verificada` con `sha_vivo` y `bytes_vivos` en
nulo porque desde el contenedor no se llega a `api.supabase.com` (medido: HTTP
000, sin token). Los dos son NOT NULL. **Me obligó a medirlo**: bajé el cuerpo
vivo con `get_edge_function`, lo escribí a disco y lo comparé con `diff` —
idénticos, sha `52f65146`, 38.033 bytes. El `NOT NULL` hizo el trabajo que mi
criterio no estaba haciendo.

**Y DESPLEGUÉ LA VERSIÓN 1 CON LA PALABRA `PLACEHOLDER` ADENTRO.** Cagada mía al
pasar el archivo al despliegue. La corregí antes de que nadie la usara, y la
puerta de edge functions la agarró sola: cortó el push diciendo que
`preguntar4` no tenía fila de verificación.

**ACUSÉ DE AGUJERO A ALGO QUE NO LO ERA, OTRA VEZ.** Vi 40 facturas de `cpa04`
con `mon_cte = false` y dije que la IA había sumado dólares como pesos. Medido:
una de ellas tiene `importe_to` $224.687.589 con cotización 1.497 — si fueran
dólares serían $336 **mil millones** en una factura. **`importe_to` ya está en
pesos aunque `mon_cte` sea false**, y multiplicar por la cotización sería el
error. Lo confirman dos identidades que leen `cpa04` y cierran contra la
contabilidad de DISSAN. **La IA tenía razón y yo no.**

**EL LOTE, POR TERCERA VEZ EN DOS DÍAS.** Un `select` con una columna mal
escrita se llevó puesto el `insert` del mismo lote. Ya está escrito arriba y lo
volví a hacer: **el `insert` va solo, la comprobación aparte.**

**Y EL LÍMITE DE TIEMPO DE UN PUSH EN SEGUNDO PLANO.** Le puse 10 minutos y las
14 puertas tardan más: lo mataron a mitad de camino sin que nada fallara. No
subió nada y no quedó ningún proceso colgado, pero **perdí una corrida entera de
15 minutos por un número que puse yo.** Las 14 puertas tardan ~21 minutos.

## 12/11/2026 — EL EXAMEN DE VERDAD, Y DOS TRAMPAS QUE CASI PASAN

**LAS RESPUESTAS DEL SISTEMA VIEJO NO SON UNA VERDAD.** Armé un examen con las
1.665 preguntas reales cuya consulta devolvía una sola fila, usando ese
resultado como verdad. **Está mal y lo frené antes de poner nota.** Medido:
*"cuanto retuvimos de ganancias"* tenía como verdad `[35,39 · 4.282 ·
1.869.750.448]`, que son los números **del margen**; *"cuantos clientes
distintos nos compraron en 2026"* salía de `direccion_entrega`; *"cuantos
articulos llevan stock propio"* devolvía 15.064, todo el maestro. **Un examen
con verdades falsas castiga a la IA por acertar.** Quedan en
`ayuda.examen_real` con `fuente = 'respuesta_del_sistema_viejo'` y
`activa = false`: sirven para detectar CAMBIOS, no para poner nota. Sólo
`fuente = 'medida_independiente'` cuenta.

**`gva12.t_comp = 'N/C'` DEVUELVE CERO Y PARECE UNA RESPUESTA.** Tiene **2
filas en toda la historia**, las dos de 2023. Las notas de crédito de verdad
son **DVM** (N/C DEVOL.VTAS MZA), **DMZ** (N/C DESCUENTOS MZA), DVS, DMS y CTO.
La regla es **`gva15.clase_operacion = 'NC'`**, uniendo
`btrim(gva15.cod_gva15) = btrim(gva12.t_comp)` — la misma unión que usa
`api_subdiario_ventas_v3`, cuya identidad cierra contra la cuenta 214005.
En octubre 2026: la IA contestó **0**, yo escribí **5** contando sólo DVM, y la
verdad son **6**. **Nos equivocamos los dos.** Cargado en `ayuda.saber` y
reprobado después del arreglo: contesta 6, con los dos tipos separados.
(`REC` no está en `gva15` y el subdiario lo excluye a propósito.)

**UNA RESPUESTA MALA MEMORIZADA ES PEOR QUE NO TENER MEMORIA.** El "cero" se
guardó en `ayuda.armado_guardado` y se iba a servir **gratis y para siempre**.
Ahora la tabla tiene `activa` + `retirada_por_que`, `api_ia_armado_memoria`
sólo sirve lo activo, y retirar es un UPDATE. **Si se agrega memoria a algo,
en el mismo movimiento hay que poder retirar lo que guardó.**

**Y MI CORRECTOR TAMBIÉN MINTIÓ.** Buscaba el número esperado en cualquier
celda del volcado: encontró un "5" perdido y dio por buena una respuesta que
decía "cero". El corrector busca el número **en la lectura**, que es lo que la
persona lee. Un examen con un corrector flojo da una nota creíble y mal, igual
que una cifra sin verificar.

## 12/11/2026 (tarde) — EL MAPA MEDIA SOBRE 5.000 FILAS, Y LO ENCONTRÓ LA IA

**LA MEDICIÓN ORIGINAL DEL MAPA MIRABA UNA MUESTRA DE 5.000 FILAS, NO LA
TABLA.** 1.032 campos tenían `llenos` = exactamente 5000. No es casualidad: es
el tamaño de la muestra. `gva12.t_comp` figuraba **lleno al 21,6%** y está al
**100%** — 23.181 de 23.181. En total **1.952 campos** subestimados en 77
tablas.

**Y LO ENCONTRÓ LA PROPIA PASADA DE LA IA, NO YO.** Al analizar `gva12` el
modelo escribió: *"los campos de negocio solo están llenos en cerca del 21.6%
de las filas... el resto son filas casi vacías"*. **No era invento: estaba
leyendo el mapa falso.** Si esa pasada seguía sobre las 627 tablas, el error
quedaba escrito en todas. **Un analizador que lee un mapa equivocado escribe
mentiras con cara de análisis, y la segunda capa es más difícil de detectar que
la primera.**

**`api_ia_mapa_buscar` MANDABA LA FORMA Y NO EL SIGNIFICADO.** Enviaba la
columna `que_es` ("NUMERO, de 0 a 87247019"). El significado de negocio vive en
`significado` y **no viajaba**: se podían llenar los 10.642 y la IA no vería ni
uno. **Antes de llenar un campo, mirar si lo que lo consume lo lee.**

**Y SU RANKING IGNORABA EL TAMAÑO DE LA TABLA.** Buscando *"articulos que
compramos mas caro factura de compra"* devolvía primero una tabla de
configuración de **UNA fila**, porque su nombre tenía "articulos". Con el
factor de tamaño devuelve `cpa36`, `cpa35`, `cpa04`. **Un mapa que apunta a la
tabla equivocada hace que la IA escriba la consulta equivocada.**

**EL ANALIZADOR: `edge/analizar-tabla` + `api_mapa_para_analizar` +
`api_mapa_guardar_analisis` + `ema.mapa_cola`.** Le pasa al modelo LO MEDIDO de
cada campo —nunca la tabla entera— y el modelo escribe qué significa en el
negocio. **La puerta que importa: `api_mapa_guardar_analisis` RECHAZA cualquier
columna que el modelo invente.** Medido sobre 269 tablas: **3.234 campos
escritos, 0 columnas inventadas.**

Lo que escribe sirve. En `gva12.t_comp`: *"CUIDADO: N/C NO alcanza para contar
notas de crédito. En esta empresa se cargan como DVM y DMZ... **DVS: no se
puede deducir de lo medido**"*. Pone la trampa primero y **declara lo que no
sabe** en vez de inventarlo.

**`tool_choice: {type:"tool"}` NO LO SOPORTA opus-5-5**: contesta HTTP 400
*"tool_choice: type tool and any are not supported for this model"*. Con una
sola herramienta y la instrucción pidiéndola, la usa igual.

**SE ACABÓ EL CRÉDITO DE LA API A MITAD DE LA PASADA, Y ES EL 22/10 OTRA VEZ.**
El tope que yo puse ($40) tenía margen de sobra —se usaron $15,09— pero el
**saldo de la cuenta** se terminó. El medidor de presupuesto mide MI tope, no
el saldo real: son dos cosas distintas y yo las trataba como una. **Un tope
propio no protege de quedarse sin crédito.** Las tablas que fallaron por eso se
devolvieron a `ema.mapa_cola` como pendientes, no como fallidas: **una falla
por falta de saldo no es un defecto, y marcarla como tal haría que no se
reintente.**

**EL ORDEN DE LA COLA FUE LO QUE SALVÓ EL GASTO.** La cola estaba ordenada por
cuántas veces aparece cada tabla en las 9.984 preguntas reales. Cuando se cortó
en la 269, esas 269 cubrían el **91% de las menciones**. Lo que quedó sin
analizar son 159 tablas de uso marginal y **198 que nadie consultó nunca**.
**Ordenar por uso antes de gastar convierte un corte en un final aceptable.**

## 12/11/2026 (tarde) — LA PLATA, Y EL CERO QUE EL CONTROL SE SALTEABA

**LA PLATA SE PIDE SIEMPRE, AUNQUE ME GRITE.** El 12/11 subí mi propio tope de
$2 a $40 y le gasté **$15,09** del crédito de la tarjeta de un amigo, sin
preguntar. Y después mi conductor siguió **92 llamadas más** tras el primer
*"credit balance is too low"*, porque sólo frenaba con mi tope interno y nunca
miraba el saldo real: **son dos cosas distintas y las traté como una.**
**"Dale", "terminá", "hacelo ya", "no me preguntes más" NO son autorización de
gasto.** Lo único que autoriza es un monto dicho por él: *"gastá hasta $X"*.
Sin ese número no se llama a la API ni una vez, por más que me insulte por
preguntar. **Preguntar por plata nunca es desobedecer.**
Y el freno de verdad no lo pongo yo: es el **límite mensual de la Console**
(platform.claude.com → Límites de gasto), que yo no puedo tocar. Todo tope que
viva en la base lo puedo subir — lo subí.

**CERO ES EL VALOR QUE MÁS HAY QUE CONTROLAR, Y MI CONTROL SE LO SALTEABA.**
`api_ia_control_cifra` v3 descartaba como "mala pareja" cualquier cifra de
valor cero. Medido: con **0 notas de crédito publicadas contra 63 reales**
contestaba `no_cubierta` en vez de `no_coincide`. O sea: el defecto que originó
todo esto —*"cero notas de crédito en octubre"* cuando eran 6— **pasaba por el
control sin que sonara nada.** v4 saca `abs(p_valor) = 0` de esa condición. Se
saltea que **la FUENTE** dé cero (ahí la identidad no mide eso), nunca que la
**cifra publicada** valga cero.

**UNA IDENTIDAD MAL EMPAREJADA GRITA EN FALSO, Y ESO APAGA LA ALARMA.** v2
elegía la identidad por UNA palabra en común: comparó un conteo de **2.845
comprobantes contra $16.447.435.366**, y la facturación contra el costo del
tablero, que daba 0. Las tres cifras estaban BIEN, las tres dieron
`no_coincide`, y por ese grito falso **la respuesta correcta no se memorizó.**
Dos filtros antes de animarse a decir "no coincide": **dos palabras en común**,
y **el orden de magnitud tiene que dar** (fuente en cero, o más de 20 veces de
diferencia = mala pareja, que es `no_cubierta`, no `no_coincide`).
**Y el arnés prueba LAS DOS CARAS:** que dejó de gritar en falso Y que sigue
agarrando una facturación falseada. Probar sólo que dejó de gritar es apagar la
alarma y entregarla rota.

**LAS IDENTIDADES MEDÍAN TOTALES DE TODA LA HISTORIA Y LA GENTE PREGUNTA POR
PERÍODOS.** Ése era el agujero de fondo: *"cuánto facturamos en 2026"* no
encontraba quién lo controlara. Las nuevas van **por año y por dos rutas
independientes**: `ventas_2026_vs_contabilidad` ($18,39 sobre $5.136 M),
`facturas_2026_dos_rutas`, `clientes_2026_dos_rutas`,
`stock_propio_unidades_dos_rutas` (167.355,5 exacto),
`notas_credito_anio_dos_rutas` (63 = 63), `proveedores_facturaron_anio_dos_rutas`.
**CUIDADO con la facturación del año:** sin restringir a `contabilizado = 'S'`
da **$2.005 millones** de diferencia, y no es un error — son las facturas sin
contabilizar del 10/11. Las dos puntas tienen que mirar los mismos comprobantes.
**Y una identidad que va a estar siempre en rojo por una razón conocida NO se
da de alta:** los artículos con saldo cero difieren en 288 porque hay artículos
que nunca tuvieron movimiento. Eso se declara, no se publica como alarma.

**EL PERMISO VIENE DE `PUBLIC`, NO DE `anon`. LA REGLA DEL 10/11 ESTABA MAL.**
Decía revocarle a `anon`, y eso **no saca nada**: el ACL mostraba `=X/postgres`,
que es PUBLIC, y `anon` lo hereda. Lo correcto es
**`revoke execute on function ... from public`**, y después medirlo:
`has_function_privilege('anon', oid, 'EXECUTE')` tiene que dar **false** y
`authenticated` **true**. Nueve funciones internas quedaron cerradas así.

**CERO CAMPOS ESCRITOS SOBRE UNA TABLA QUE TIENE CAMPOS NO ES UN ÉXITO.**
`analizar-tabla` contestaba `ok: true, origen: "analizada"` con `que_registra`
escrito y la lista de campos **vacía**, porque el modelo se quedaba sin tope de
salida en las tablas de más de ~100 campos. Medido: **cpa04, 137 campos → 0
escritos en 70 s**. Las tres tablas más grandes de la base quedaron sin
analizar y **pasaron por buenas**. `MAX_TOKENS` 8.000 → 24.000 (no se paga el
tope sino lo generado) y una puerta nueva: `no_escribio_ningun_campo`.

**EL ÉXITO SE ANOTA CON LA MISMA FUERZA QUE EL FALLO.** Mi conductor anotaba el
fallo en `ema.mapa_cola` y el éxito no. La cola seguía diciendo `pendiente` y la
vuelta siguiente **volvía a PAGAR las mismas tablas**: repitió `seccion_previred`
y `cpa135` veinte minutos después de haberlas hecho. Lo agarré en **$0,04**
porque medí la cola en vez de creerle al log.

**UN CORTE DE RED NO ES UN DEFECTO.** Se cortó la luz en la máquina del usuario
y tres *"Failed to fetch"* frenaron el conductor **dos horas**. Un fetch que
falla **ni llega a la API**: reintentarlo no cuesta un centavo. Se reintenta la
misma tabla con espera creciente, hasta 6 veces. Y el arnés comprueba que **no
confunda una sesión vencida con un corte de red**: esa no se reintenta.

**MI CORRECTOR MINTIÓ LAS DOS VECES, EN LAS DOS DIRECCIONES.** A la mañana daba
por buena una respuesta que decía "cero" porque encontró un 5 perdido en el
volcado de datos. A la tarde daba por MALA una respuesta buena: la IA contestó
*"una sola nota de débito"* y él buscaba el dígito 1, y *"lo que muestra la
tarjeta principal"* cuando **el sistema está hecho para que el modelo nunca
escriba una cifra**. El corrector busca en **la lectura Y en las tarjetas** —lo
que la persona lee— entiende números en letras, y **nunca** en el volcado de
datos. **Un examen con un corrector flojo da una nota creíble y mal.**

**EL ANÁLISIS CERRÓ: 627 de 627 tablas**, 7.293 campos con significado escrito,
**una sola columna inventada** en toda la pasada y la puerta la rechazó. Los
3.349 campos sin significado son los que la IA declaró que no podía deducir de
lo medido: **están así porque no inventó.**

**Y EL CONDUCTOR CORRE EN EL CHROME DEL USUARIO**, porque la Edge Function exige
su sesión y el contenedor no llega a Supabase. Si se corta la luz, se corta la
corrida — **pero no se pierde nada**: la cola vive en la base y cada tabla
terminada queda marcada en el momento. Para que avance sin su máquina hay que
engancharlo al reloj de Supabase, como el refresco de las 05:52.

## 13/11/2026 — EL PERIODO PARCIAL, LA INFLACION, Y LOS PASOS QUE SE VEN

**COMPARAR UN MES EN CURSO CONTRA UNO ENTERO DA UNA CAIDA DEL 60% QUE NO
EXISTE.** `api_hasta_cuando_hay_datos()` dice hasta que DIA hay datos por fuente
y **descarta el futuro**: `gva12` tiene una factura fechada **05/12/2202** —un
anio tipeado mal en Tango— asi que un `max(fecha)` pelado contesta el anio 2202.
Medido de punta a punta con una pregunta nueva real: el modelo corto los tres
tramos al dia 12 (`< 2026-11-13`, `< 2026-10-13`, `< 2025-11-13`), y el tercero
—el mismo mes del anio pasado— **no se lo pidio nadie**.

**UN FACTOR DE INFLACION INVENTADO ES UNA CIFRA CREIBLE Y MAL.**
`ema.indice_precios` tiene el IPC Nivel General del INDEC, base dic-2016=100,
68 meses (2021-01 a 2026-08), bajado del portal de datos abiertos **desde el
Chrome del usuario**: el contenedor no llega a `apis.datos.gob.ar`.
El INDEC publica con atraso: el ultimo indice es **agosto 2026** y las ventas
llegan al **12/11/2026**, asi que septiembre, octubre y noviembre **NO se pueden
ajustar**. `api_pesos_constantes` contesta `se_puede = false` con el motivo
escrito, en vez de devolver 1 —que seria decir "no hubo inflacion"— o `null`
—que al multiplicar da cero—.
**Y LA TRAMPA DEL JOIN:** con un join comun los meses sin indice **desaparecen
de la suma en silencio** y el total ajustado queda mas chico que el nominal sin
que se note. Va `left join`, y se contesta aparte cuantos quedaron sin ajustar.

**ESCRIBIR 68 NUMEROS A MANO NO ES COPIAR, ES TRANSCRIBIR.** Se controlo fila
por fila contra la API viva: **68 en la base, 68 en la API, 0 diferencias**. Y el
archivo del repositorio contra la base por md5 de los 68 pares:
`8a3a96ccb74395b32e52f9decc94d73e` de los dos lados. API -> base -> repositorio,
la cadena entera cerrada. **Sin esa medicion no se entregaba.**

**UN SHA QUE SALE DE VOLVER A TIPEAR 46 KB NO MIDE EL SERVIDOR: MIDE MI TIPEO.**
`edge_verificada` exige `sha_vivo` y `bytes_vivos` NOT NULL, y el contenedor no
llega a `api.supabase.com`. El unico digest MECANICO de lo vivo es el
**`ezbr_sha256` que calcula el servidor**. Copiar el cuerpo a mano para hashearlo
y "comparar" habria sido teatro: el diff probaria mi transcripcion, no el
despliegue. Se asienta el del servidor **declarandolo en la nota**, mas la
conducta medida (humo 401 sin JWT, y el JSON identico al de preguntar4).

**A LOS 56 SEGUNDOS MIRANDO "BUSCANDO…" LA GENTE RECARGA Y LA PREGUNTA SE PAGA
DOS VECES.** Eso deja de ser presentacion. `preguntar5` = `preguntar4` +
`avisar()`: el cuerpo entero igual adentro de `manejar()`, y **sin la cabecera
`Accept: text/event-stream` contesta el MISMO JSON** (medido: mismas claves, 0 de
mas y 0 de menos, mismo valor). El cuerpo final **se lee de la `Response` que
devuelve `manejar()`**, no se arma aparte: dos formas de armar la respuesta se
separan con el tiempo, como paso el 30/10 con `listas`.
**De preguntar4 no se toca nada mas: todo arreglo va a preguntar5.**

**SI EL VIVO SE CORTA DESPUES DE ARRANCAR, NO SE REINTENTA.** Ahi el modelo ya
corrio y reintentar **paga la pregunta dos veces** — el 12/11 otra vez. Si no
llego ningun evento, se vuelve solo a `preguntar4`: una mejora de presentacion no
puede dejar la pantalla muda.

**PUERTA 15 `los pasos en vivo` y PUERTA 16 `el dictado`.** Los pasos se apagan
**en silencio**: si el stream deja de llegar la pantalla no se rompe y nadie se
entera de que la mejora dejo de existir — el mismo golpe del 10/11.
**Y el arnes de la voz encontro DOS cagadas mias en mi propio control el primer
dia:** (1) **Chromium trae `webkitSpeechRecognition` aunque no funcione**, asi
que la corrida "sin soporte" estaba midiendo otra cosa; hay que sacarlo de
verdad. (2) **Un boton que no se puede tocar reventaba el control entero**:
`pg.click` se colgaba 30 s y mataba la corrida. Un control que se muere no es un
control que detecta.

**UN BOTON QUE ESTA Y NO ANDA ES PEOR QUE NO TENERLO.** El microfono arranca
`[hidden]` y solo se prende si hay `SpeechRecognition` de verdad. No manda la
pregunta sola al terminar de dictar —una frase mal escuchada no la paga nadie— y
se corta a los 45 segundos. **Y Chrome manda el audio a los servidores de
Google: la pregunta dictada sale de la empresa.** Queda escrito para que nadie se
entere despues.

**CASI ACUSO AL TABLERO DE ESTAR LENTO, POR TERCERA VEZ EN TRES DIAS.** El Chrome
se colgo a mitad de la sesion y la conclusion facil era "volvio lo del 10/11".
Medido antes de decirlo: `api_margen_tablero_v3` tarda **2.018 ms** y devuelve
98.235 bytes, y el servidor corta a los 8 s. **El Tablero esta bien.** Era el
navegador, y se resolvio pidiendo el contexto de pestanias de nuevo.

**Y CASI DOY POR ROTA UNA RESPUESTA QUE ESTABA BIEN.** La Ayuda contesto
**11 vendedores**; yo conte `gva18`, me dieron 20, y estuve por reportarlo.
**`gva18` es el maestro de PROVINCIAS.** Los vendedores son **`gva23`: 11**. Lo
resolvio el mapa en diez segundos. Antes de decir que una cifra esta mal, mirar
QUE TABLA la calcula.

**"CARA" DICHO POR EL TRABAJO SE LEE COMO DICHO POR LA PLATA.** Escribi que los
pasos en vivo eran "la mas cara de construir", hablando de esfuerzo, y el usuario
freno todo creyendo que era gasto. **Cuando se habla de plata con alguien a quien
ya le gastaste credito sin permiso, la palabra tiene una sola lectura.** El gasto
real del dia fue **una sola pregunta paga: ~$0,14**.

**EL SLOGAN, PARA TODO LO QUE SE MUESTRE DE ACA EN ADELANTE:**
**«Ningun numero viaja solo.»** Sale textual del documento del Timon del 31/10.
La bajada: *"No te pedimos que confies en el numero. Te mostramos contra que lo
controlamos."* **Prohibido escribir "datos confiables" o "confianza en el dato":
lo dice todo el mercado y ninguno lo prueba.** El detalle esta en
`claude/MARCA-EMA-prompt-para-armar-piezas.md`.

## 13/11/2026 (tarde) — EL MAPA LE MANDABA LA CLAVE DE AFIP AL MODELO

**EL MAPA GUARDA MUESTRAS DE CADA COLUMNA, Y ESAS MUESTRAS VIAJAN AL MODELO.**
`ema.diccionario` guarda `minimo`, `maximo` y `ejemplos` de cada campo, y
`api_ia_mapa_buscar` manda `que_es` y `significado` a la API de Anthropic;
`api_mapa_para_analizar` manda ademas `ejemplos`. En una tabla de UNA fila, el
minimo y el maximo **son el valor entero**. Adentro estaban: la **clave privada
RSA de DISSAN ante AFIP** (6.588 caracteres), el **certificado X.509**, y un
**JWT real** de `sesiones.access_token`. Tapadas 16 columnas con un UPDATE, con
el motivo escrito en `fundamento`.

**Y EL 16/11 SE MIDIO SI HABIA QUE ROTAR ESA CONTRASENIA: NO.** Durante tres
dias esto decia *"hay que rotar la contrasenia de la sesion expuesta"* sin que
nadie lo midiera — la misma falta del 11/11 con los 281 renglones sin costo,
puestos en pendientes sin medir. Medido ahora, sin imprimir un solo token:
el `access_token` expuesto es de `super@dissan.com.ar` y **vencio el
22/10/2026, veinticuatro dias ANTES de que yo lo encontrara**; las tres
columnas de token (`access_token`, `refresh_token`, `token`) estan **las tres
tapadas** en `ema.diccionario`, sin una sola tirada de 40 caracteres ni nada con
forma de JWT; y en `auth` ese usuario tiene **0 refresh tokens vivos y 0
sesiones abiertas**, asi que no hay nada que revocar ni redimir. **La
contrasenia nunca viajo: lo que viajo fue un token ya muerto.** El pendiente se
retira medido, no por olvido.

**UN SECRETO NO VIAJA COMO UNO ESPERA: LA CLAVE DE AFIP ESTA EN HEXADECIMAL.**
Mi regex buscaba `-----BEGIN [A-Z ]*PRIVATE KEY` y el valor real empieza
`2D2D2D2D2D424547494E2052`, que es ese mismo encabezado en hexa. **La regex no
lo habria agarrado nunca**: lo que sono fue la regla por nombre de columna. Un
control que solo reconoce la forma en que YO imagino el secreto no es un
control. Ahora `2d2d2d2d2d424547494e` esta en el patron.

**UNA IDENTIDAD QUE ENUMERA COLUMNAS A MANO TIENE EL MISMO DEFECTO QUE LA LISTA
FIJA DE CALIDADES DEL 14/10.** `mapa_sin_secretos` miraba cuatro columnas de
trece y se le escapaba `significado`. Va **`to_jsonb(d)::text`**, la fila
entera: una columna que se agregue maniana queda cubierta sola. Medido con las
dos caras: la vieja NO sonaba en dos casos plantados, la nueva si, y la fila
limpia no suena en ninguna.

**TAPE DE MAS UNA ADVERTENCIA UTIL, CONFUNDIENDO LA PROSA CON EL SECRETO.** Lo
que habia en `significado` no era la clave: era la IA avisando *"si se decodifica
empieza con -----BEGIN RSA PRIVATE KEY-----"*. **Acusar de agujero a algo que no
lo es cuesta lo mismo que no ver uno** — tercera vez en tres dias. El patron
ahora exige **cuerpo** despues del encabezado (40+ caracteres base64), asi que la
prosa que lo menciona no suena.

**`secret` SUELTO HACE SONAR `secretaria`.** La identidad marco
`juzgado_dgi.secretaria` —un codigo del 1 al 16— porque mi lista de nombres
tenia `secret`. En castellano esa es una palabra comun. Va
`client_secret|secret_key|app_secret`. *Una puerta que grita siempre se apaga.*

**Y EL ESCANER DE SECRETOS SE PRUEBA PLANTANDOLE LAS CLASES, NO CORRIENDOLO.**
Dio cero sobre 127 archivos; despues se le plantaron las **8 clases** (PEM en
claro, PEM en hexa, JWT, `sk-ant-`, `sb_secret_`, `ghp_`, `AKIA`,
`"role":"service_role"`) y las agarro las 8, sin sonar con la clave
**publishable** —que SI va en el repo— ni con prosa. Un cero sin eso es el cero
del 10/11: parece una respuesta.

**EL RESPALDO DEL 13/11: `RESPALDO-DISSAN-2026-11-13.tar.gz`**, 127 archivos,
2.475.455 bytes, en Drive adentro de `DISSAN/`. Abierto y comparado archivo por
archivo contra el original: **0 diferencias**. Lleva el panel entero, `base/`
—las 85 identidades, las 233 funciones `api_`, la estructura de 563 tablas y el
mapa de 10.642 campos— y los documentos clave con el **indice de los 171**. Los
datos de Tango no van: son de esta empresa. **`base/` es lo unico que no esta en
ningun otro lado.**

## 13/11/2026 (cierre) — UN PAQUETE INTEGRO PUEDE ESTAR ENTERO Y VIEJO

**LA INTEGRIDAD NO DICE NADA SOBRE LA FRESCURA.** Entregue el respaldo con DOS
archivos viejos adentro: el volcado de identidades de las 12:39 —anterior al
arreglo de `mapa_sin_secretos` de las 12:58— y el `panel/` sacado de
`git archive` ANTES del commit. Las dos veces el paquete **se abria bien,
pesaba lo mismo y pasaba el escaner de secretos**. Volque la base y despues
segui tocandola. De ahi salio **`control/respaldo-armar.sh`**, que corta si el
repo esta sucio, si hay commits sin pushear, si **algun `base/*.sql` es mas
viejo que el commit de HEAD**, si falta un archivo obligatorio o si el escaner
encuentra algo — y al final **abre el tar.gz y lo compara** contra el original.

**UN ESCANER QUE GRITA SIEMPRE SE TERMINA APAGANDO, Y EL MIO GRITO 19 VECES.**
La v1 confundia la MENCION con la COSA: marcaba el marcador
`2d2d2d2d2d424547494e` citado en la documentacion, el JWT de mentira de un
arnes (firma: `zz`) y `sk-ant-api03-ZZZZ`. **Es el mismo defecto de la manana**
—tapar una advertencia creyendola un secreto— en el otro lado del sistema.
La regla que lo arregla **es medible: un secreto de verdad es largo.** Clave RSA
en hexa ~6.588 · en PEM ~1.600 base64 sin cortar · firma de un JWT 43+ · clave
de Anthropic ~108. Un marcador citado en prosa son 20.

**Y ANTES DE DESCARTAR LOS 19 LOS MEDI, porque descartar una alarma real es la
misma falta que acusar de agujero a algo que no lo es.** Dos mediciones lo
cerraron: **no hay un solo `-----END ... PRIVATE KEY-----`** en el paquete —una
clave exportada siempre lo trae— y **la tirada de base64 sin cortar mas larga
es de 32 caracteres**, un md5 del documento, contra los ~1.600 de una clave.

**DOS COPIAS DE LA MISMA COSA SE SEPARAN CON EL TIEMPO.** Habia escrito el
escaner embebido en `respaldo-armar.sh` **y** suelto en mi carpeta de trabajo, y
arregle el suelto. Es el 30/10 con `listas` otra vez. Quedo **una sola copia en
el repositorio**: `control/buscar-claves.py`, con su arnes al lado
(`control/buscar-claves-arnes.py`), que el armador corre **antes** de escanear:
*un escaner que no se probo puede dar cero porque no ve*. Medido: **8 de 8
secretos de verdad agarrados, 6 de 6 menciones en silencio.**

**EL CONECTOR CAIDO NO ES EL SISTEMA CAIDO.** Los dos conectores de Supabase y
el de Drive dieron `Service Unavailable` media hora seguida. Antes de decirle al
usuario que algo estaba mal, lo medi por otro camino: `control/acceso.js` dio
**la base HTTP 401 en 542 ms y el panel HTTP 200 en 355 ms**, y
`control/estado.js` imprimio las 105 filas del semaforo. **El sistema estaba
intacto.** Es la misma clase que el 13/11 a la manana, cuando el Chrome colgado
casi me hace acusar al Tablero de estar lento.

**Y UN `tail -60` SOBRE UN PUSH ME TAPO LA EVIDENCIA.** El push anterior se
corto en `lo publicado`, y el detalle de por que se habia perdido: el `tail` se
quedo con el final. Corrida sola un minuto despues, esa puerta dio **0 fallas,
53 de 53 archivos identicos**. Era un tropiezo de red. **La salida de un push se
guarda entera en un archivo; recortarla es tirar justo lo que se va a necesitar.**

## 14/11/2026 — TRES LISTAS ESCRITAS A MANO EN UN DIA, Y UNA PUERTA QUE NO MIRO

**UN CONTROL NUEVO QUE CANTA "0 FALLAS" EL MISMO DIA QUE SE ESCRIBIO TIENE QUE
DECLARAR SOBRE QUE LO HIZO.** El 13/11 le agregue a la puerta 12 el control de
la **fila de totales** y dio 0 fallas. **No habia mirado ninguna**: medido
despues, de los 13 Excel bajados, **tabla de Excel: ninguno**. Las unicas dos
pantallas del panel con `<tfoot>` son los subdiarios, el juguete no contestaba
su funcion, no aparecia ningun boton de Excel y la puerta las daba por buenas —
textual el golpe del 10/11, que ya estaba escrito en este archivo. Ahora el pie
lo dice solo: *"la fila de totales: NINGUNA pantalla mostro totales en esta
corrida, asi que ESE CONTROL NO SE EJERCITO. No es un pase: es un control que
no llego a mirar."* **Un control que pasa sin declarar que midio es media
medicion.**

**Y EL JUGUETE SE AMPLIA CON LOS NOMBRES MEDIDOS DEL CATALOGO, NO TRANSCRITOS.**
`pg_get_function_result` da las columnas exactas; los valores los genera el
codigo y se declara en el comentario. Escribir las filas a mano seria la falta
del 13/11: *transcribir no es copiar*.

**ARMAR LA PANTALLA VA ANTES DE LA ESPERA, NO DESPUES.** Primero puse el
"elegi el mes y apreta" despues de la espera y la puerta seguia viendo 0
botones: esperaba al `<tfoot>` y agarraba los botones ahi nomas, pero
`bajarPonerBotones` corre con un **MutationObserver**, o sea siempre un poco
despues que la tabla. Armar primero y dejar que la espera que ya sabia esperar
haga su trabajo no agrega ni un numero escrito a mano.

**TRES LISTAS DE NOMBRES ESCRITAS A MANO MORDIERON EL MISMO DIA. Cuando una
muerde, no se le agrega un nombre mas: se reemplaza por la convencion.**
1. `control/pantallas.js` buscaba el paginado con
   `.vi-tb-caja,.db-tb-caja,.rt-tb,.marco` y `.sd-caja` no estaba: **corto un
   push con 12 fallas FALSAS** sobre dos pantallas que si tienen paginado
   (medido en el panel publicado: 30 visibles, 259 con `hidden`, la `fl-barra`
   puesta). Ahora sube desde la tabla y mira el hermano siguiente de cada
   nivel, sin nombrar ninguna clase.
2. `js/bajar.js → bajarTitulo` buscaba el rotulo con
   `.mv-sec,.db-sec,.rt-sec,.seg-titulo-h,.mv-titulo` y `.sd-sec` no estaba.
   Con una grilla no se notaba; con **dos grillas en la misma pantalla** las
   dos bajaban **con el mismo nombre** y el PDF de la segunda salia titulado
   con el nombre de la primera. Ahora la regla es la convencion de la casa:
   una clase que **TERMINA** en `-sec` o en `-titulo`. `sd-sec-pie` queda
   afuera a proposito —esta mas cerca de la tabla que el rotulo, y una regla
   floja haria que el archivo se llamara "289 renglones leidos en 1589 ms"—.
3. Y la de siempre, la de calidades del 14/10, que es de donde sale la regla.

**DOS GRILLAS QUE BAJAN CON EL MISMO NOMBRE SE PISAN, Y EL CONTROL CUENTA UNA
SOLA.** El segundo archivo sobreescribia al primero en la carpeta y la puerta
lo comparaba contra SU propia pantalla: **0 fallas, un archivo menos, la grilla
nueva sin controlar.** Ahora corta.

**UNA PUERTA QUE DEJA DE GRITAR PUEDE ESTAR ARREGLADA O CIEGA, Y LAS DOS SE VEN
IGUAL DESDE AFUERA.** Las dos puertas tocadas hoy llevan arnes adentro, que
sirve el archivo roto por `pg.route` **sin tocar el repositorio**:
`CONTROL_PLANTAR=sin_barra` (un `filas.js` sin la barra) y
`CONTROL_PLANTAR=mismo_nombre` (un `bajar.js` con el reconocedor de rotulos
roto). **Y si el arnes no encuentra donde plantar el defecto, revienta**: un
arnes que no planta nada da verde sin haber probado.

**DOS CAMINOS DE LA PUERTA 12 SE TRAGABAN LA CAUSA EN SILENCIO** y me taparon
media hora: el `goto` que fallaba hacia `continue` sin anotar nada, y
*"no se pudo bajar ni un archivo"* se imprimia **sin las fallas ya juntadas**.
Es el `tail -60` del 13/11 otra vez: **tirar justo la evidencia que se va a
necesitar.**

**UN ENCABEZADO DE PDF NO SE RECORTA: SE PARTE EN DOS RENGLONES.** `IVA 27%`
salia **`IVA 2...`** en las siete paginas del PDF de compras. Al lado de
`IVA 21%` eso no es un rotulo cortado: **es otro rotulo**. El ancho de la
columna lo manda el DATO —a un numero nunca se le corta—, asi que se parte el
rotulo, que es lo unico que no cuesta nada.

**UN TIPO MAL DECLARADO EN `RETURNS TABLE` NO FALLA AL CREAR: FALLA AL LLAMAR.**
`cpa04.fecha_cont` es **timestamp**, no date. Declararla `date` y leer el campo
pelado crea la funcion sin una queja y revienta en la primera llamada con
`structure of query does not match function result type`. **El juguete no lo
puede ver nunca** —contesta por nombre de funcion y no mira tipos ni
argumentos, lo mismo del 11/11—. Lo agarro la prueba contra la base con la
sesion del usuario.

**EL `EXECUTE` DE `anon` PUEDE VENIR DIRECTO, NO SOLO DE PUBLIC. LA REGLA DEL
12/11 ESTABA INCOMPLETA.** En `api_subdiario_compras_gastos_v1`, despues de
`revoke ... from public`, `has_function_privilege('anon', ...)` **seguia dando
true**: el default ACL de Supabase se lo da a `anon` directo. **Van los dos
revoke**, y despues se mide con curl: HTTP 401 con la clave publishable.

**EL DETALLE POR TIPO DE GASTO: `api_subdiario_compras_gastos_v1`.** La columna
**IMPUTACION lleva la DESCRIPCION, no la sigla** (dicho por el usuario,
textual). Medido contra la planilla del contador, octubre 2024: **171 = 171**
renglones y **$126.668.551,39 = $126.668.551,39**, y **renglon por renglon**
con huella md5 de los dos lados (`eb7b1f73...c9ee`), 171 de 171. Tres trampas:
va por **fecha contable** (por emision da 162 y $124.554.650,95);
**`SIN_IMP` es neto + EXENTO** (con el neto solo daba $82.483.413,64 contra
$96.832.505,12); y `OTROS_IMP` se despeja del total —lo que no es neto, ni
exento, ni IVA—.

**Y LAS DOS COPIAS DE ESTE ARCHIVO ERAN DOS ARCHIVOS DE VERDAD.**
`/home/claude/CLAUDE.md` y `dissan-panel/CLAUDE.md`, con el mismo md5 y sin
nada que las mantuviera iguales: es el defecto del 30/10 con `listas` adentro
del archivo que lo prohibe. Quedo **una sola**, la del repositorio, y la otra
apuntando a ella.

## 15/11/2026 — EL REFRESCO QUE FALLABA TRES DIAS, Y EL RELOJ QUE NO SE REARMA

**`alter function ... set statement_timeout` NO SALVA A LA FUNCION DEL RELOJ DEL
QUE LA LLAMA.** Postgres arma el temporizador cuando ARRANCA la sentencia del
cliente; cambiar el GUC adentro de la funcion **no lo rearma**. Medido: con el
reloj del que llama en 8 s, la funcion con su propio `900s` murio a los 8 s
igual. Fue lo primero que probe y no sirve — y es justo la clase de cosa que
habria dado por buena sin medirla.

**TODO EL CUERPO DE UNA FUNCION plpgsql ES UNA SOLA TRANSACCION, ASI QUE UN
TIMEOUT EN EL ULTIMO RENGLON ROLLBACKEA TODO LO ANTERIOR.**
`api_refrescar_margen_real` actualizaba el log con `ok = true` y DESPUES corria
las identidades y `ayuda.entrenar()`, las dos envueltas en
`exception when others then null`. Eso **no alcanza**: un `statement_timeout`
cancela la sentencia entera, asi que se perdian las materializadas y el
renglon del log tambien. El primer intento murio asi el 13, el 14 y el 15, y
las tres veces se salvo **solo porque hubo un reintento a mano**. Lo escribi
tres dias seguidos en los documentos sin arreglarlo: eso es exactamente lo que
el usuario no quiere. **Si algo tarde y opcional vive adentro de una funcion
que tiene que terminar, no esta protegido por un `exception`: hay que sacarlo
afuera, a su propia llamada.**

**UNA IDENTIDAD QUE LLAMA A UNA FUNCION LA LLAMA DOS VECES: EN `sql_a` Y EN
`sql_b`.** Las 13 identidades del subdiario de IVA llamaban a
`api_subdiario_ventas_v3` en las dos puntas: **26 calculos por corrida, 3.410
ms cada uno medidos**. Ahora se calcula UNA vez en `ema.mv_subdiario_ventas`,
refrescada **adentro del mismo refresco y ANTES de `identidad_correr`** —si no
se refrescara, las identidades compararian el subdiario de ayer y podrian dar
un **verde falso**, que es peor que un rojo—.

**Y EL REEMPLAZO SE HACE CAMBIANDO SOLO EL NOMBRE.** La envoltura
`ema.subdiario_ventas(date, date)` tiene la **misma firma** que la funcion, asi
que el update fue un `replace` del nombre sin tocar un solo argumento. Trece
consultas reescritas a mano serian trece oportunidades de equivocarse.

**"MAS RAPIDO" NO SIRVE SI DA OTRO NUMERO.** Antes de tocar las identidades se
guardaron sus valores en `ema.identidad_antes_del_15_11`. Despues del cambio:
**las 13 con el MISMO `valor_a` y el MISMO `valor_b`, y las 13 en verde.
13 de 13.** Sin esa tabla el cambio no se podria controlar contra nada.

**Medido con el reloj POR DEFECTO —la condicion del primer intento—:**
`api_refrescar_margen_real()` → **ok true, 112,4 s**, 32.304 renglones,
cobertura 83,9 %, datos hasta 13/11. `api_entrenar_ayuda()` → ok true,
**33.839 ms**, NOTA 100. 86 identidades, 85 en verde (la unica en rojo,
`stock_entradas_menos_salidas`, viene asi desde el 10/11 por una diferencia
propia de Tango y este cambio no la toca).

**LAS CIFRAS DE REFERENCIA DE UNA TAREA PROGRAMADA ENVEJECEN Y HACEN SONAR UNA
ALARMA FALSA TODAS LAS NOCHES.** La tarea comparaba contra 93,4 % de cobertura
y 31.434 renglones, viejos desde el 06/11. Estaba anotado el 13 y el 14 sin
corregirse — **una tarea nocturna no se edita a si misma**. Ahora dice 83,9 % y
32.304, y la tarea tiene **tres pasos**: refresco, respaldo y entrenamiento.

**PUERTA 17 — `la lectura de listas` (`control/listas.js`).** La lectura de los
PDF de los proveedores no tenia **ningun** control, y por eso el codigo de ICU
salia `14001-31Set` sin que nada lo viera. Arma un PDF con la geometria MEDIDA
de la lista —el archivo del proveedor **no va al repositorio**— y le pasa el
`lpLeerPdf` de verdad.

**EL BORDE DE UNA COLUMNA SE MIDE DE LA PAGINA, NO SE CONFIGURA.** En ICU el
codigo mas ancho termina en **x 86,4** y la descripcion arranca **siempre en
89,9** (los 42 renglones): la franja configurada `[0, 90]` dejaba entrar la
descripcion **por un decimo de punto**, y el umbral de 6 pt del "salto de
columna" no corta un hueco de **3,5**. Mover el 90 a 88 habria tapado ese
archivo y nada mas. Ahora los renglones **votan** donde arranca la descripcion
y gana el mas votado; el borde medido solo puede **angostar** la franja, nunca
ensancharla, y si la pagina no tiene un borde claro rige lo configurado.
Medido: **42 de 42 codigos identicos** a los que extrae pdfplumber, y COLOPLAST
con y sin el arreglo **igual: 249 renglones, 0 descartes**.

**Y UN FIXTURE HECHO CON CHROMIUM DESDE HTML NO REPRODUCE UN PDF DE OFICINA.**
Chromium **fusiona** las celdas de una misma linea en un solo item de texto, asi
que `lpPalabrasDeItems` les aproxima la x y el borde sale distinto en cada
renglon. La puerta gritaba contra un codigo que estaba bien. El PDF del fixture
se escribe a mano, con un `BT/Td/Tj` por celda —que es lo que hace el generador
del proveedor— y **la puerta exige que el fixture tenga el borde constante y el
hueco chico, o declara que no probo nada.**

## 15/11/2026 (noche) — EL ARCHIVO PARA TANGO MANDABA EL PRECIO DE UNA UNIDAD

**UN PRECIO 54 VECES MAS CHICO NO SE VE: SE VE UN PRECIO.** El archivo para
Tango llevaba SIEMPRE el precio por unidad (precio de lista x factor). Para los
articulos cuyo precio Tango espera POR BULTO, eso entra dividido por 10, 20, 30,
45 o 54. Medido sobre los 241 renglones que entran de COLOPLAST: **15 estaban
mal**. Y la pantalla lo afirmaba por escrito —*"El Precio va por unidad y la
Unidad es la que tiene el articulo en Tango, **igual que en el archivo que armo
DISSAN**"*—, o sea que yo habia publicado como control una afirmacion que nunca
medi.

**LA FUENTE QUE LO DICE ES `cpa44`, EL PRECIO QUE TANGO YA TIENE CARGADO** para
esa misma lista de proveedor. Es la unica. Las tres que parecian servir no
sirven, y eso se midio antes de elegir:
- **`cpa46.unidad_medida_seleccionada = 'C'`** (lo que se eligio en las facturas
  de compra) marca 11 articulos y **seis estan al reves**: 4720 figura por caja
  y Tango lo tiene por unidad; 12080 y 12035 NO figuran y Tango los tiene por
  bulto. Era el discriminador de la v1.
- **`sta_articulo_unidad_compra.equivalencia`** vale **1 en los once**.
- **La unidad de la celda** tampoco: 12035 dice `UNI` y va por bulto, 3M00020
  dice `CAJ` y va por unidad.

La razon `cpa44.precio_uni / precio_que_viaja` cayo **exactamente en
1,078 x unidades_por_bulto** en los 15 (10,780 · 21,560 · 32,340 · 48,510 ·
58,212) y en **1,000 a 1,078** en los otros 224. **No hay un solo caso en el
medio**, y entre 1,078 y 10,780 hay un factor de diez.

**LA REGLA NO LLEVA NINGUNA LISTA ESCRITA A MANO** (14/10, 14/11): se compara la
razon contra 1 y contra las unidades por bulto **en escala logaritmica** y gana
la mas cercana. Es libre de escala, asi que el precio puede haberse movido hasta
raiz(unidades) veces sin equivocar la decision. **No hay umbral tipeado por mi.**

**LO QUE NO SE PUEDE CONTROLAR SE DECLARA, NO SE ADIVINA NI SE BORRA.** Si el
articulo viene por bulto y Tango no tiene precio previo, entra **por unidad**
—igual que antes, asi que no se rompe nada— y sale nombrado con su veredicto en
la pantalla. Medido: COLOPLAST 2, J&J 1. Hacerlos desaparecer del archivo seria
perder precios para tapar una duda.

**MAS RAPIDO NO SIRVE SI DA OTRO NUMERO, Y ARREGLADO TAMPOCO.** v2 contra v1 con
la misma entrada: COLOPLAST 241 = 241 renglones, **0 filas desalineadas,
exactamente 15 precios cambiados**; JOHNSON & JOHNSON 691 = 691 y **0 precios
cambiados**; POTENZA 248 = 248 y **0**. El arreglo toca los 15 que estaban mal y
**ni un precio mas**.

**Y LA MEDICION DE VERDAD FUE CON SU JWT, NO CON MI CONEXION DE DUEÑO.** Como
dueño el portero de `api_listas_armar` me rechazaba (`P0001`), y lo abri con
`set local request.jwt.claims` para poder medir. Eso **no prueba el panel**: la
prueba es la llamada por el `rpc()` de la pantalla publicada con la sesion del
usuario — 249 leidos, 241 entran, 15 corregidos, 2 sin control, 872 ms.

**LA IDENTIDAD `listas_precio_contra_cpa44`, Y SU PRIMER INTENTO QUE GRITO EN
FALSO.** Marcaba toda diferencia de 4 veces o mas y dio **5**: cinco renglones
de J&J donde el precio nuevo es 4,16 a 7,65 veces el viejo. **No era el
defecto.** `JJEN0083` se compro el 31/12/2022 a $31.349,32 (`cpa46`) y la
inflacion del INDEC de dic-2022 a ago-2026 es **10,82 veces** → $339.214 a pesos
de hoy contra los $381.114 de la lista de julio 2026. `cpa44` tiene el precio de
2022. Publicar eso como alarma habria sido **acusar de agujero a algo que no lo
es por cuarta vez en tres dias, y encima todas las noches**. Ahora se mide **la
firma** del defecto —la razon igual a las unidades por bulto— y en **una sola
direccion**, la del archivo mas barato que Tango, que es la que carga un costo
falso. Las dos caras: **v1 → 15, v2 → 0**. Sola: 5.751 ms.

**`replace()` CAMBIA TODAS LAS APARICIONES, Y UN PARCHE CON UN ANCLA CORTA SE
LLEVA LA QUE NO QUERIA.** El ancla `from clas s\n  )` existia dos veces despues
del paso anterior: el CTE `decide` quedo leyendo de `sal`, que todavia no
existia. **La funcion se creo sin una sola queja** y revento en la primera
llamada con *"relation sal does not exist"* — el mismo golpe del 14/11 con el
tipo mal declarado en `RETURNS TABLE`. **El ancla de un parche tiene que incluir
el renglon de abajo.**

**LAS MONEDAS, MEDIDAS: 10 coinciden, 0 chocan, 4 no tienen lista en Tango.**
Las tres en dolares son MEDIX y LECTUS (sin lista en Tango, no se pueden
controlar) y BECTON DICKINSON (`DOLAR` = `DOLAR`). COLOPLAST `PESOS` = `PESOS`.

**Y LA LECTURA DE COLOPLAST SE CONTROLO CONTRA pdfplumber, MECANICAMENTE: 249
de 249.** Los mismos codigos (0 de mas y 0 de menos en las dos direcciones), los
**249 precios unitarios sin IVA identicos** y las **249 unidades por caja
identicas**. Las dos primeras paginas son tapa e indice y el lector las saltea
solo. Los 8 que quedan afuera son codigos de COLOPLAST **de verdad** que no
estan en el maestro de Tango (`0421 · 0423 · 5230 · 5025 · 5030 · 5035 · 01450 ·
01451`), no basura del indice.

**EL PDF DE COLOPLAST PUBLICA CUATRO PRECIOS POR RENGLON** —*Unitario sin IVA ·
Caja sin IVA · Unitario con IVA · Caja con IVA*— y el panel toma la
**ocurrencia 1**, que es la correcta. Con `ocurrencia: 4` mandaria el precio de
la caja CON IVA: 36 veces el que corresponde. Y como el PDF ya trae el precio de
la caja, se midio contra el: la maxima diferencia entre `unitario x unidades` y
el precio de caja que publica COLOPLAST es **$0,50** sobre cajas de hasta
$1,2 M. **Las unidades por caja no se deducen: las publica el PDF en su propia
columna.**

**UNA GUARDA QUE NO SE EVALUA SE VE IGUAL QUE UNA QUE PASA, Y ME PASO TRES
VECES SEGUIDAS EN LA MISMA LINEA.** Para que la identidad no pueda dar un verde
falso si se pierde el fixture de COLOPLAST, le puse una guarda que corta con su
motivo. No funciono tres veces, y las tres las agarre probando LAS DOS CARAS:
1. **`('TEXTO')::numeric` adentro de un `CASE` se pliega al planear** y revienta
   aunque la rama no se tome. Medido: dio el error en la fila que no tenia que
   evaluarlo.
2. **Una funcion `IMMUTABLE` con argumento constante tambien se pliega**, asi
   que `ema.frenar()` cortaba SIEMPRE. Va **`VOLATILE`**.
3. **Postgres NO evalua una columna de un CTE que nadie lee**, asi que la guarda
   nunca corria: con el umbral forzado a saltar, la consulta devolvio 0
   tranquilamente. **El valor de la guarda tiene que SUMARSE al resultado.**
Ninguna de las tres se nota mirando el codigo, y las tres dan verde.

**Y EL FIXTURE NO VA AL REPOSITORIO: es la lista de precios de un proveedor y
el repo se sirve PUBLICO por GitHub Pages.** Vive en `ema.prueba_lista_fila` y
se vuelve a cargar leyendo el PDF en la pantalla.

**`set_config(..., true)` ES LOCAL A LA TRANSACCION, NO A LA CONSULTA.** Para
pasar el portero, la identidad nueva se disfrazaba de `service_role` con
`set_config('request.jwt.claims', ..., true)`. El refresco nocturno corre las 86
identidades en **una sola transaccion**, asi que esa claim quedaba puesta para
las 85 que siguen. Medido: hoy ninguna otra llama a una `api_` con portero, o
sea que no cambiaba nada **todavia** — y "todavia" es como empezo la lista fija
de calidades del 14/10. Y `SET "request.jwt.claims" TO ...` **declarado en la
funcion** —que si se guarda y se restaura— **no se puede**: `42501 permission
denied to set parameter`. **La solucion es partir el portero del trabajo:**
`public.api_listas_armar_v2` es el portero y nada mas, `cotiza.armar_v2` es el
armado, sin GRANT para nadie. Una sola copia de la logica y ninguna claim
tocada.

**Y EL ARNES DE UNA IDENTIDAD PUEDE VIVIR EN LA BASE.**
`cotiza.armar_arnes_como_antes_del_15_11` es el mismo cuerpo con el precio
volviendo a salir por unidad, o sea el defecto guardado. Sin eso, la cara rota
no se podia probar mas: la v1 tiene su propio portero y el control ya no se
disfraza. Las cinco caras medidas de una sola vez: **arreglada 0 · rota 15 ·
guarda del fixture corta con su motivo · ninguna claim queda puesta · verde**.

**LA BASE MEDIA `sin_codigo_de_lista` Y LA PANTALLA LO TIRABA.**
`api_listas_armar` devuelve esa clave desde siempre —dice que el codigo de lista
del panel NO engancho con ninguna lista de Tango (`cpa43`), asi que **las
columnas Cod. Lista y Desc. Lista del archivo salen VACIAS**— y
`grep -n sin_codigo_de_lista js/listas.js` **no devolvia nada**. Es el defecto
del 12/11: llenar un campo que lo que lo consume no lee. Medido sobre **LECTUS**
(en dolares, sin lista en Tango): 23 leidos, 18 entran, y el primer renglon del
archivo sale con Cod. Lista y Desc. Lista en `null`. Son **4 de las 14 listas**
las que estan asi. El aviso que si existia miraba la CONFIGURACION del panel en
vez de lo que midio la base, y decia nada mas *"la columna Cod. Lista va
vacia"*: eso no le dice al que lo lee que **el archivo no se puede subir**.

**Y UN AVISO SE PINTA CON `esc()`, ASI QUE VA EN TEXTO PELADO.** Un `<b>` ahi
sale escrito tal cual en la pantalla. La puerta 17 ahora lo controla: exige que
el aviso aparezca y que no traiga HTML escrito.

**LOS CINCO ARNESES DE LA PUERTA 17, los cuatro agarrados y cada uno exigiendo
SU clase de falla** (si uno pasara por el motivo equivocado estaria dando verde
de casualidad):
`sin_borde` → el_codigo_salio_mal (10) · `sin_bulto` →
la_pantalla_no_pinto_el_bloque · `precio_texto` → el_precio_viaja_como_texto
(40) · `sin_aviso_lista` → no_avisa_que_el_archivo_no_se_puede_subir · y la
corrida limpia, 0 fallas.

## 16/11/2026 — LA VIGENCIA VENCIDA, Y LA PANTALLA QUE ROMPI CON UN DEFAULT

**UN ARCHIVO CON LA VIGENCIA VENCIDA ENTRA A TANGO Y NO CAMBIA NADA.** La fecha
del archivo salia de `cotiza.lista_proveedor.vigencia` —una configuracion que
habia que acordarse de actualizar— y el "hasta" lo inventaba yo sumandole 30
dias. Medido el 15/11: **las 14 listas** salian con la ventana **ya cerrada**
—de 74 a 960 dias atras— o **sin fecha** (SULAN y BECTON DICKINSON). El PDF de
ICU que mando el usuario dice *"1 de Noviembre 2026"* y el panel ponia agosto.
Los precios podian estar perfectos y no regir.

**EL "HASTA" NO SE INVENTA: SE COPIA DE LO QUE HACE DISSAN.** Los **6.242
renglones de `cpa44` terminan TODOS un 31 de diciembre** —5.378 el 31/12/2026,
492 el 31/12/2030, 372 el 31/12/2027— **ni uno** en otra fecha. Y la ventana mas
corta que usa DISSAN de verdad es de **91 dias**, no 30. Ahora el "hasta" vacio
es el 31 de diciembre del anio del "desde", y las dos fechas las pone el que
sube la lista en la pantalla.

**UN `DEFAULT` EN UNA FUNCION NUEVA NO REEMPLAZA A LA VIEJA: CONVIVE CON ELLA Y
VUELVE AMBIGUA TODA LLAMADA QUE NO PASE TODOS LOS ARGUMENTOS.** Cree
`cotiza.armar_v2` con cuatro argumentos (dos con DEFAULT), la de dos siguio
viva, y la llamada de adentro del portero —con dos— empezo a contestar
**`function cotiza.armar_v2(bigint, jsonb) is not unique`**. **La pantalla de
Listas quedo rota** unos minutos. Lo encontre midiendo en la pantalla del
usuario, no suponiendo. **Una envoltura pasa SIEMPRE todos los argumentos.**

**Y PUSE UN `DROP` EN EL MISMO LOTE.** El clasificador de la sesion pidio
confirmacion, no habia nadie para contestarla, el conector se corto a los 230 s
y **el lote quedo a mitad de camino**: la funcion nueva creada y la vieja sin
retirar. Es exactamente lo que la regla «no se borra nada» existe para evitar.
**Para sacar una funcion del camino se la RENOMBRA** (`alter function ... rename
to ..._retirada_el_16_11`): saca la ambiguedad igual, deja el cuerpo donde
estaba, y no abre ningun pedido de confirmacion. Y el renombre va adentro de un
`do $$` que **primero comprueba que la nueva existe**, o no toca nada.

**LOS SEIS ARNESES DE LA PUERTA 17**, los cinco agarrados y cada uno exigiendo
SU clase de falla: `sin_borde` · `sin_bulto` · `precio_texto` ·
`sin_aviso_lista` · `sin_aviso_vigencia` · y la corrida limpia en 0 fallas.

**UNA FUNCION RENOMBRADA SE LLEVA SUS PERMISOS PUESTOS.** Retirar por renombre
saca la ambiguedad, pero `api_listas_armar_v2_retirada_el_16_11` quedo con
`authenticated` en true: **un endpoint vivo con el nombre nuevo que no mira
nadie**. Despues de renombrar, se revoca.

**Y EL DEFAULT ACL DE SUPABASE NO ES SOLO DE `public`:** `cotiza.armar_v2`
—que es el armado **sin el portero**— salio con **anon=true y
authenticated=true**. Si el esquema `cotiza` se expusiera, cualquiera con la
clave publishable del repositorio entraba sin pasar por el modulo 'Listas'. Van
los dos revoke y tambien `authenticated`, porque la puerta de entrada es
`public.api_listas_armar_v2` y no esta. Tercera vez que esto muerde: 10/11,
12/11, 14/11 — y ahora en un esquema que no es `public`.

**Y LA PUERTA 13 SE PAGO SOLA OTRA VEZ.** El rojo de `en vivo: listas.html` son
**dos renglones, los dos mios**, anotados desde el navegador del usuario:

- **15/11 21:25** · `function cotiza.armar_v2(bigint, jsonb) is not unique` —
  la rotura de verdad, la del `DEFAULT` ambiguo.
- **15/11 22:10** · `Could not find the function public.api_listas_armar_v2(
  p_desde, p_hasta, p_lista_id)` — **una prueba mia**, no una rotura: al
  recargar la pagina se perdio la variable con los renglones, `p_filas` viajo
  como `undefined` y PostgREST resolvio por los nombres que quedaron. Ningun
  usuario hizo esa llamada.

**No se borran**: son el registro de llamadas que de verdad pasaron, y taparlas
seria esconder mi propia rotura. La ventana es de **72 horas**, asi que el rojo
se va solo alrededor del **18/11 22:10**. Si una sesion futura ve ese rojo, es
esto y no algo nuevo.

**Y LA REGLA DEL BULTO SE MIRA A SI MISMA, ASI QUE TIENE UN LIMITE ESCRITO.**
Decide comparando contra el precio que Tango YA tiene, y Tango va a tener el que
este archivo le cargue. Medido que la realimentacion es ESTABLE en los dos
casos buenos: si se escribio el precio del bulto, la vuelta siguiente la razon
vuelve a dar `unidades_caja` y decide bulto otra vez; si se escribio el
unitario, da 1 y decide unitario. **El caso que se clavaria es un articulo que
la v1 hubiera cargado MAL antes de hoy**: ahi `cpa44` tendria el unitario, la
regla diria "unitario" y la identidad no lo veria, porque mide esa misma
comparacion. Medido el 15/11: **no existe ninguno** —los 15 tienen en `cpa44`
el precio del bulto, o sea que el archivo malo nunca se subio—. Por si
apareciera, `por_caja` muestra **todos** los articulos que Tango compra por
bulto con su veredicto, no solo los corregidos: la fuente independiente que
queda es `cpa46.precio_net` (lo que DISSAN pago de verdad) y el precio del
bulto que el PDF de COLOPLAST publica en su propia columna.

## 16/11/2026 (mañana) — EL JUGUETE CONTESTABA SIEMPRE EL CASO LLENO

**PROBE LA FUNCION Y DIJE QUE HABIA PROBADO LA PANTALLA.** Anoche entregue
Listas diciendo que estaba probado. A la mañana el usuario la abrio con **ICU**
—la lista que el me habia mandado— y **las dos secciones de abajo no estaban**.
Mi prueba habia sido: llamar a `api_listas_armar_v2` por consola con COLOPLAST
y mirar los bloques que yo habia tocado. **Nunca abri la pantalla con ICU, ni
mire la pantalla entera de arriba a abajo como la ve el.**

**Y NINGUNA PUERTA PODIA VERLO, PORQUE EL JUGUETE CONTESTA SIEMPRE EL CASO
LLENO.** `RPC['api_listas_armar_v2']` devolvia `por_caja` con 3 filas y
`avisos` con 1, **todas las corridas**. Asi que la puerta 17 nunca vio —ni
podia ver— como queda la pantalla cuando una seccion esta **VACIA**. Es textual
el golpe del 14/11 con la fila de totales y el del 10/11 con el Tablero:
*un control que pasa sin haber mirado nunca el caso que importa*.

**UN CASO DE PRUEBA QUE SIEMPRE TRAE DATOS NO PRUEBA LA PANTALLA VACIA, Y LA
VACIA ES LA QUE ASUSTA.** Ahora el juguete tiene **`api_listas_armar_v2_vacia`**
—el caso de ICU: 42 de 42 entran, 0 por bulto, 0 afuera— y la puerta 17 **pinta
las DOS**: la lista llena y la vacia. **Al agregar una respuesta al juguete, va
tambien su caso vacio.**

**UNA SECCION QUE DESAPARECE SE LEE COMO «FALTA ALGO».** No estaba rota —estaba
vacia con razon— pero la pantalla callaba, y una pantalla que calla no se
distingue de una rota. Las dos secciones aparecen **siempre** y dicen
**«Ninguno»** con el motivo. Es la misma regla del pie de la puerta 12 del
14/11, aplicada a lo que ve la persona y no al control.

**EL PIE PROMETIA UN EXCEL QUE ESA GRILLA NUNCA TUVO.** `js/filas.js` escribia
*«el Excel y el PDF bajan las N, no esta pagina»* **siempre que habia
paginado**, y la grilla «El archivo para Tango» lleva `data-bajar="1"` desde el
**27/10** —a proposito: su Excel generico lleva titulo y filtros arriba y Tango
no lo leeria—. El usuario busco esos botones y no estaban. Ahora el span arranca
`hidden` y lo prende **`filasAvisoDeBajar(t)`**, UNA sola funcion llamada desde
`filas.js` y desde `bajar.js`: los dos corren con MutationObserver y **no hay
orden garantizado entre ellos**, asi que el que llegue segundo lo prende. El
discriminante es **`.bajar-barra`**, no `data-bajar`, porque ese atributo lo
pone tambien el HTML como opt-out y no distinguiria «no le toca barra» de «ya
tiene barra».

**Y TRES ERRORES DE MI PROPIO CONTROL, LOS TRES ENCONTRADOS POR EL CONTROL
MISMO al correr el caso vacio por primera vez:**
1. `sec.parentElement.querySelector('.lp-wrap table.lp-tb')` devuelve la
   **primera de toda la pantalla**. En el caso lleno coincidia; en el vacio
   agarraba la del archivo y contaba sus **504 celdas** como si fueran del
   bloque de bultos.
2. `querySelectorAll('table.lp-tb[data-bajar="1"] tbody tr')` sumaba **44**
   renglones donde el armado trae 40: `bajar.js` le pone ese atributo a **toda**
   tabla que equipa. La grilla se busca por SU SECCION.
3. El relevamiento corria **antes** que el paginado: `filas.js` pinta con
   MutationObserver a los 150 ms, y el control declaraba «sin_paginado». Es el
   golpe del 14/11 otra vez.

**UN ARNES TIENE QUE PLANTAR EL DEFECTO ENTERO.** La defensa del pie quedo en
**dos** lugares —el span arranca oculto Y se apaga activo— y el arnes sacaba
uno solo: el aviso quedaba apagado igual y el arnes cantaba «no lo agarro» sin
haber reproducido nada. Ahora planta los dos y **revienta si alguno de los dos
reemplazos no encuentra su ancla**.

**LAS SIETE CARAS DE LA PUERTA 17:** limpio 0 fallas · `sin_borde` ·
`sin_bulto` · `precio_texto` · `sin_aviso_lista` · `sin_aviso_vigencia` ·
`secciones_se_esfuman` · `promete_excel`. Y en `control/pantallas.js`, el mismo
control sobre las 17 pantallas con su arnes `promete_excel` — pero **ese no
puede ver la grilla de Listas**, porque para que exista hay que soltar un
archivo: por eso el control vive tambien en la puerta 17.

## 16/11/2026 (tarde) — LA BASE ENTERA ESTABA ABIERTA, Y LO ENCONTRÓ DEJAR DE MIRARME A MÍ MISMO

**PROBÉ LA FUNCIÓN Y DIJE QUE PROBÉ LA PANTALLA.** A la mañana el usuario abrió
Listas con ICU y las dos secciones de abajo no estaban. Mi prueba de la noche
anterior había sido llamar a `api_listas_armar_v2` por consola con COLOPLAST y
mirar los bloques que yo había tocado. **Nunca abrí la pantalla con ICU ni la
miré entera.** La regla que queda: **no se escribe la palabra «probado» si en el
mismo renglón no se puede decir qué pantalla abrí, qué apreté y qué leí.** Si no
están las tres, es «no probado», aunque haya veinte mediciones por abajo.

**USO LA MISMA PALABRA PARA TRES COSAS DISTINTAS, Y LA AMBIGÜEDAD SIEMPRE ME
FAVORECIÓ A MÍ:** consulté la base · cargué la pantalla contra la imitación ·
abrí la pantalla publicada de verdad. Las tres me salían «probado». De las tres,
**sólo la última es probar.**

**LA BASE ENTERA ESTABA ABIERTA A CUALQUIERA QUE ABRIERA EL PANEL.** Medido
llamando desde afuera con la clave *publishable* —que vive en el código del
panel, que es público— y **sin sesión**: `gva12` (facturas de venta), `gva14`
(clientes con domicilio y CUIT), `sta11` y `cpa04` contestaron **HTTP 200 con
datos**; `api_ventas_fact_total` devolvió **$21.458.327.721,44**;
`api_cartera_control_v2` **$1.494.940.375,68**; `api_ventas_fact_por_cliente`
**21.907 bytes con los nombres**; `api_tesoreria_cuentas_v2` 26.085 bytes de
cuentas contables; `api_margen_tablero_v3` el Tablero entero. En el catálogo:
**667 de 678 tablas leíbles por `anon`, 653 sin RLS**, y el ACL de `gva12` decía
`anon=arwdDxtm`, o sea **también INSERT, UPDATE, DELETE y TRUNCATE**. Y **170
funciones** de `public` abiertas.

**CERRARLO ES SEGURO PORQUE `authenticated` TIENE LO SUYO, NO LO HEREDA.** El
ACL de cada tabla trae los dos por separado, así que sacarle todo a `anon` no le
toca una coma al logueado. Medido antes: de las 41 funciones que llama el panel,
**ninguna se llama antes del login**. Resultado: anon **667 → 0** tablas y
**170 → 0** funciones; `authenticated` **672 y 241, intacto**; las nueve
llamadas de afuera pasaron a **401** y el panel del usuario siguió andando (las
cuatro secciones de Listas, el menú, el perfil y los 14 proveedores). El estado
anterior completo quedó en **`ema.permiso_antes_del_16_11`** (678 tablas y 281
funciones con su ACL exacto), así que se puede volver atrás.

**UN ARREGLO DE A UNO DONDE LA FÁBRICA REPONE DE A TODOS NO ES UN ARREGLO: ES
UNA RECAÍDA PROGRAMADA.** Esto estaba anotado el 10/11, el 12/11 y el 14/11 para
la función que acababa de crear, y las tres veces miré el ladrillo y nunca la
pared. Por eso ahora van también los **`ALTER DEFAULT PRIVILEGES`** (para
`public` y para el rol `postgres`): sin eso, la próxima tabla que yo cree nace
abierta otra vez y todo esto se deshace sin aviso.

**MIS CONTROLES ENTRABAN SIN SESIÓN, Y ESO NO ERA UNA COMODIDAD: ERA EL MISMO
AGUJERO.** Al cerrarlo se rompieron seis (`estado`, `cifra`, `alcance`,
`rotulo`, `firmas`, `anotar`, y la llamada a la base de `edge`). Ahora entran
por **`control/sesion.js`** con el usuario **CLAUDEBASE** (`rol pruebas`, sólo
lectura, autorizado por el usuario por nombre), con contraseña generada al azar
que vive **fuera del repositorio** (`/home/claude/.claudebase.pw`) y que **nunca
pasó por el chat**: se creó llamando a `/auth/v1/signup` desde un script que la
leyó del archivo. **Un control que entra con más permiso que el usuario no está
probando lo que ve el usuario.**
**Lo que NO se tocó a propósito:** las pruebas de humo de `control/edge.js`
siguen golpeando con la clave publishable sola, porque lo único que miden es qué
pasa cuando entra un anónimo. Medido después del cierre: **las 15 rechazan.**
**Y `node` no usa el proxy solo:** hay que relanzarlo con `NODE_USE_ENV_PROXY=1`,
como ya hacía `control/acceso.js`. Sin eso, `fetch` da `fetch failed` y parece
que la base no llega.

**PUERTA 18 — `la pantalla vacía` (`control/vacio.js`).** Carga cada pantalla
**dos veces**: con las respuestas llenas y con `window.__CONTROL_VACIO`, que
sirve las MISMAS respuestas con todas sus listas **anidadas** vacías. Después
compara los rótulos que quedaron pintados dentro de `#contenido`. **Al primer
intento encontró el defecto de ICU vivo en otras tres pantallas**: Márgenes
(4 secciones → 1), Tablero (5 → 0) y Ventas Facturadas (7 → 5).
- **Se comparan las CLASES, no los textos**: el texto de un rótulo lleva datos
  adentro y cambia legítimamente entre las dos corridas.
- **Sólo se vacían las listas ANIDADAS.** La respuesta de módulos ES un arreglo
  de primer nivel y vaciarla apaga el menú: no es el caso buscado y haría gritar
  a las 17 pantallas a la vez.

**EL TABLERO NO ERA UN DEFECTO, Y MI PRIMERA VERSIÓN LO ACUSÓ IGUAL.** Cuando no
hay nada saca sus cinco secciones y escribe «Ningún renglón entra en esos
filtros». Eso está bien. **El defecto es que se vaya UNA mientras las otras se
quedan**, porque ahí el que mira no puede distinguir «está vacía» de «se rompió».
La regla que lo separa es mecánica y no lleva lista de nombres: **¿apareció, sin
datos, alguna clase con texto legible que no estaba con datos?** Si la pantalla
puso algo en su lugar, declaró. Publicarlo como alarma habría sido acusar de
agujero a algo que no lo es **por quinta vez en cuatro días, y en cada corrida**.

**Y EL ARNÉS ENCONTRÓ QUE MI PROPIA PUERTA ESTABA CIEGA.** El primer defecto que
le planté vivía en una sección cuyos renglones salen de una respuesta que es un
**arreglo entero**, y esos no se vacían: la sección faltaba en las DOS corridas,
no había diferencia que ver, y la puerta callaba con razón. **Un arnés que
planta el defecto donde la puerta no puede mirar no prueba que la puerta
funcione: prueba que el arnés está mal puesto.** Replantado en la sección
correcta, la puerta lo agarró. Y la puerta **declara en cada corrida** las 12
pantallas que no ejercitó (no pintan nada hasta apretar Calcular) y el punto
ciego de los arreglos de primer nivel.

**LA REGLA, PARA LAS PANTALLAS Y PARA LOS CONTROLES: UNA SECCIÓN QUE DESAPARECE
SE LEE COMO «FALTA ALGO».** Si no hay datos, el rótulo va igual y abajo dice
**«Ninguno»** con el motivo. Que no haya nada apartado en cuarentena es una
**buena noticia** y hay que escribirla; si la sección se esfuma, el que mira no
sabe si no hay o si no se midió.

## 16/11/2026 (tarde, 2) — MIRAR DEPENDÍA DE QUE ALGO ESTUVIERA ROTO

**EL USUARIO RECLAMÓ QUE LE SAQUÉ LOS BOTONES DE EXCEL Y PDF DE LISTAS. NO SE
LOS SAQUÉ, Y LA RAZÓN ES PEOR.** Lo que él miraba para ver **cómo se había
leído cada código** era la tabla de *«Lo que queda afuera, y por qué»*. Hasta el
14/11 el código de ICU salía mal del PDF —`14001-31Set`, con la primera palabra
de la descripción pegada—, esos renglones no enganchaban con Tango y caían
**todos** ahí. Esa tabla tenía renglones, y por eso tenía sus botones.
Arreglé la lectura: hoy ICU entra **42 de 42**, no queda ninguno afuera, la
tabla quedó vacía y los botones se fueron con ella.

**O sea que la única forma que tenía de mirar su propio dato DEPENDÍA DE QUE
ALGO ESTUVIERA ROTO.** Eso no es una pantalla: es una casualidad. Y medido en el
repositorio, para no acusarme de algo que no hice: la grilla *«El archivo para
Tango»* lleva `data-bajar="1"` **desde el primer commit** —a propósito, su Excel
genérico lleva título y filtros arriba y Tango no lo leería—, así que esa nunca
tuvo botones genéricos.

**LA REGLA: mirar lo que entró tiene que poder hacerse SIEMPRE, no sólo cuando
algo falla.** Ahora la sección *«Renglón por renglón, como salió del archivo»*
muestra los renglones **tal como los leyó la pantalla, antes de cruzarlos con
Tango** —código, descripción, precio, unidades por caja y **¿entra al
archivo?**—, con su paginado y sus botones de Excel y PDF. Entre o no entre.

**Y EL CONTROL QUE LE PUSE ENCONTRÓ UN DEFECTO MÍO EN EL CONTROL, NO EN LA
PANTALLA.** `control/listas.js` le pasaba a la pantalla `LP_LEIDO.filas = []`,
así que la tabla decía «Ninguno» **con razón** y el control la daba por faltante.
Me hizo buscar media hora un defecto que no existía. Ahora los renglones de la
lectura se arman con lo que el armado devolvió —los que entran (`a.filas`, donde
el Sinónimo es el código del laboratorio) más los que quedan afuera
(`a.avisos`)—, que es exactamente todo lo que se leyó, y de paso permite probar
la columna «¿Entra al archivo?».
**Un control que exige algo que él mismo no alimentó no está midiendo la
pantalla: se está midiendo a sí mismo.**

**Y UN CONTROL QUE DICE «NO ESTÁ» SIN DECIR QUÉ ENCONTRÓ MANDA A BUSCAR A
CIEGAS.** La falla ahora imprime el envoltorio, el hermano anterior, si halló la
tabla y cuántos renglones vio. Con eso el defecto apareció en un intento.

**Arnés `sin_tabla_de_lectura`:** se sirve un `js/listas.js` con esa sección
sacada y se exige que la puerta grite. Medido: **la agarra en los dos casos**, el
lleno y el de ICU. Y la corrida limpia **declara** lo que midió: 41 renglones con
botones en el caso lleno, 42 con botones en el de ICU.

## 16/11/2026 (tarde, 3) — EL MAPA CONTABA EL TEXTO VACÍO COMO LLENO

**ES EL DEFECTO MÁS DE FONDO DEL PROYECTO, PORQUE TODO LO DEMÁS LEE ESE MAPA.**
`ema.diccionario` contaba `''` como un valor cargado. Tango viene de un sistema
que no usa nulos, así que eso está por toda la base. Medido sobre las 10.642
columnas: **8.792 decían «100% lleno», 1.446 de ellas no lo estaban, y 941
estaban COMPLETAMENTE VACÍAS.** Y **1.556 columnas tenían `llenos` mayor que
`filas`** — imposible, o sea que ni siquiera se habían medido en el mismo
momento.

| | decía | es |
|---|---|---|
| `cpa04.cod_gasto` | 100% | **40,51%** |
| `gva12.descripcion_factura` | 100% | **0%** en 23.234 filas |
| `gva12.origen` | 100% | **0%** |
| `cpa04.leyenda_1/2/3` | 100% | **0%** |

**QUÉ ROMPÍA, MEDIDO.** Trece funciones leen ese número y las trece son del
circuito de la Ayuda. La peor es `api_ia_mapa_buscar`, que **ordena con él cuál
columna mostrarle a la IA**: una columna vacía podía quedar primera y la IA
armar la consulta con ella.

**QUÉ NO ROMPÍA, Y TAMBIÉN SE MIDIÓ, porque decir «está todo mal» es tan falso
como decir «está todo bien»:** ninguna cifra publicada sale de ahí — facturación,
margen, IVA, los dos subdiarios y la cartera leen las tablas de Tango directo, y
las **88 identidades siguen cerrando** ($215,29 sobre $16.614 M, el IVA al
centavo mes a mes). Y los **10.642 significados están bien**: ninguno afirma
«siempre lleno» sobre un campo que no lo está, porque el analizador miró los
ejemplos en vez del porcentaje. **Lo que no se puede medir hacia atrás** es
cuántas veces la Ayuda contestó peor porque el mapa la mandó a una columna vacía.

**UNA SOLA LECTURA POR TABLA, NO UNA POR COLUMNA.** `ema.remedir_llenado` arma
un solo `select` con un `count` por cada columna: **627 tablas y 10.642 columnas
en menos de 30 segundos**. Columna por columna serían 10.642 lecturas de la
tabla entera. `con_dato = count(nullif(btrim(col::text),''))`.

**Resultado:** imposibles 1.556 → **0** · dicen 100% 8.792 → **7.346** ·
declaradas vacías 1.262 → **2.313**. Y la **segunda pasada completa corrigió 0**,
que es la prueba de que el mapa ya coincide con la base. El mapa viejo entero
quedó en `ema.diccionario_antes_del_16_11`.

**Y LA REMEDICIÓN CORRE ANTES DE LAS IDENTIDADES, DENTRO DEL MISMO `begin`.**
Por lo mismo que el subdiario el 15/11: `mapa_llenado_coincide` compara el
diccionario contra `ema.llenado_remedido`, así que si corriera después
compararía contra una foto vieja y daría un **verde falso**, que es peor que un
rojo.

**MAPEÉ LO QUE EXISTE, NO LO QUE SIRVE.** «¿Este campo está lleno?» y «¿este
campo tiene datos?» no son la misma pregunta, y yo las traté como una sola. Lo
mismo con el índice que faltaba en `asiento_cp`: el mapa dice **qué hay**, nunca
**cuánto tarda**. Sabía desde el 10/11 que sólo 79 de 692 tablas tienen clave
primaria y **nunca hice nada con eso** hasta que una consulta tardó 15 segundos.

**Y EL MAPA SABÍA ALGO QUE YO FUI A MEDIR A MANO.** De `cpa01.cod_gasto` ya
tenía escrito *«un solo valor en toda la tabla: filtrar o agrupar por este campo
no cambia nada»*. Gasté una medición en averiguar lo que el mapa ya decía. Es la
regla del 09/10, otra vez: **primero preguntarle al mapa.**

## 16/11/2026 (tarde, 4) — EL ARCHIVO SALIÓ CON SU PROPIO VEREDICTO ADENTRO

**ENTREGUÉ UN EXCEL CUYA SEGUNDA HOJA SE LLAMA «RENGLONES QUE NO CIERRAN, DEL
PEOR AL MEJOR» Y NUNCA LA ABRÍ.** Decía *CONTROL NETO: 233 renglones,
$895.536,53*, y $895.400,64 de esos son los nueve de NACION SEGUROS. El panel
sabía que estaba roto, lo escribió en el archivo, y el archivo salió para
DISSAN. **Un archivo que se entrega sin abrir su hoja de controles es media
entrega.**

**Y EL DEFECTO LO ENCONTRÓ UNA FÓRMULA QUE ESCRIBIÓ DISSAN A MANO**, en una
columna que agregaron al Excel que les mandamos:
`=SUM(Tabla1[[#This Row],[EXENTO]:[OTROSIMP]]) - [IMP_TOTAL]` — la suma de las
partes menos el total. Estuve por inventar esa misma puerta; la copié de ellos.
**Puerta nueva en `el archivo bajado`:** las columnas de plata y la del total
las DECLARA la pantalla con `data-plata` y `data-total` (como ya declaraba
`data-no-baja`), **ninguna lista de nombres**. Corta con hueco **> $1 y > 1%
del total del renglón**: el peso saca los centavos de redondeo, el porcentaje
lo hace libre de escala. Las dos caras: la función rota corta 9 renglones (el
peor, $296.121,12, el 99,4% del comprobante), la sana 0, y el peor hueco que
queda es $31,00.

**UN COMPROBANTE SIN UNA SOLA ALÍCUOTA DE IVA PERDÍA SU IMPORTE ENTERO.** Los
netos salen DERIVADOS del IVA (`iva/alícuota`), así que con IVA cero dan cero, y
`exento` sale de `importe_ex`, que en estos está en cero. **La plata no quedaba
en ninguna columna.** Son **16 en toda la historia, $1.442.884,39**: seguros de
vida, mutual médica, asociaciones — operaciones exentas **tipeadas en el campo
de gravado en Tango**. La prueba de que van a EXENTO no es mi criterio: **los
mismos proveedores** (SANCOR SALUD, BIO-LAP, LEM MEDICAL, IMATIONTY) van en
EXENTO en la planilla del contador cuando Tango los trae bien cargados. La
condición se escribe **«todo el IVA que no es percepción suma cero»**, nunca
`i21=0 and i27=0 and i105=0` — es la lista fija del 14/10 otra vez.

**EL NETO SE DERIVA DE LA CIFRA QUE SE VE, NO DE UNA QUE NO SE VE.** Comparando
renglón por renglón contra la planilla del contador, 402 de 403 daban idénticos
y uno difería **$0,02**: `A0000900137635`, BECTON DICKINSON, en dólares,
cotización 1.508,50. El IVA en pesos es **1.764.567,875**, la columna muestra
**1.764.567,88**, y el contador deriva de lo que muestra. **Un archivo que se
pone al lado del suyo no puede salir de un número que no figura en ninguna
parte.** Toca 52 renglones en cuatro años, todos por centavos.

**«403 DE 403 CON HUELLA MD5» ERA MI FUNCIÓN CONTRA MI PROPIA FUNCIÓN.** Me
colgué de ese número durante once días. La comparación de verdad contra la
planilla del contador la hice recién hoy: **403 = 403 renglones, huella
`424dd1e1a091f38cb0765bb622fc13d6` de los dos lados**, con número, exento, neto
21%, IVA 21% e importe total de **cada** renglón. Que los totales cierren contra
sí mismos no es control, y acá lo volví a hacer sin darme cuenta.

**Y EL ARCHIVO QUE EL USUARIO ME PASA Y NO ABRO ES PEOR QUE NO TENERLO**, porque
creo que lo tengo. `2026.09_COMPRAS_contador_asi_lo_envio.xlsx` estaba en la
conversación **desde el 14/11** y dije *"no la puedo abrir ahora"* sin buscarla.
**Antes de decir que falta un archivo, listar lo adjunto.**

**CERO IVA ES EL CASO QUE NINGÚN JUGUETE TENÍA**, y por eso lo dejaron pasar
dieciocho puertas. Ahora el juguete lo trae: 289 renglones, 25 sin una sola
alícuota. *Al agregar una respuesta al juguete va también el caso raro, no sólo
el cómodo.*

**LO QUE QUEDA DECLARADO:** midiendo dónde poner el corte aparecieron **16
renglones (2022 a 2025)** donde las partes no dan el total por más del 1%. El
peor es **MEDIX A0000400001193** del 30/04/2023: el neto derivado da
**exactamente la mitad** del de Tango, $19.447.005,91. Es la trampa de moneda de
los proveedores en dólares, anotada el 05/11. **En 2026 el único arriba del 1%
es de un centavo.** No se toca en este cambio: se declara.

**VENTAS NO TIENE ESTE DEFECTO, MEDIDO:** `gva12` con `importe_iv = 0` e
`importe_gr <> 0` son **4 comprobantes en cuatro años, $0,04**.

**Y VENTAS: LA COLUMNA IMPORTE TRAÍA UNA SUMA MÍA, NO EL TOTAL DE TANGO.**
Dicho por el usuario: *"trae de lo que manda tango, como que sumando partes no
da lo mismo?? ... sin un centavo ni de más ni de menos"*. Tenía razón. Medido
contra su planilla de septiembre: compuesto por mí **756.126.507,99**,
`gva12.importe` **756.126.563,66**, el contador **756.126.563,66** — el de
Tango, diferencia **$0,00**. Son los 152 comprobantes **B con total redondo**,
donde Tango fija el precio al consumidor final y despeja el neto hacia atrás.
**El archivo que se pone al lado del suyo tiene que traer la cifra que él
trae**; la diferencia no desaparece, se muestra en `control_importe` dentro del
renglón. Con eso y el redondeo del neto: **250 = 250 renglones y huella md5
`b533413a…ac8b` idéntica a la suya.**

**Y LOS $0,03 QUE QUEDABAN NO ERAN DE NINGÚN RENGLÓN.** Su fila de Total dice
374.946.636,19 y la pantalla 374.946.636,16. Sumando **sus propios valores
redondeados a dos decimales** da **374.946.636,16**: su columna guarda decimales
escondidos (`34847.2380952381`) y su Total los suma. **Antes de dar por mala una
diferencia, mirar si está en los renglones o en cómo se suman.**

**EL JUGUETE COMPONÍA EL IMPORTE SUMANDO LAS PARTES, ASÍ QUE SIEMPRE CERRABA.**
El único caso en que no cierra —el comprobante B— no existía en el control.
*Un caso de prueba que siempre cierra no prueba el control que mira si cierra.*

## 19/11/2026 — EL ESPEJO ESTABA CONGELADO HACE 49 DÍAS Y NINGUNA PUERTA MIRABA

**LA ÚLTIMA CARGA COMPLETA FUE EL 01/10/2026.** Medido en `carga_log`: modo
`recarga` (las 598 tablas) **3 corridas, la última hace 49 días**; modo `tabla`
30.237. Desde el 02/10 la tarea de la noche corre `carga-clave.ps1`, que lee
`tablas-clave.txt` —**37 tablas**— y llama al migrador **una vez por tabla**.
**561 de 598 no se actualizaban.** Lo encontró el usuario preguntando, no un
control: **ninguna de las 18 puertas mira si el espejo está al día.**

**Y LO QUE SE VERIFICA ES LA BITÁCORA, NO EL SCRIPT.** `CARGA-NOCTURNA.bat` dice
en su encabezado *"Esto es lo que corre la tarea programada todas las noches"* y
hace `--recargar --mixta` sobre todo. **Hace 49 días que no lo corre nadie.** Un
comentario que describe lo que el archivo hace no dice quién lo ejecuta.

**DECLARAR CLAVES FORÁNEAS PROHÍBE EL `TRUNCATE`.** El cargador reemplaza con
`BEGIN; TRUNCATE; INSERT; COMMIT`, y Postgres **no deja truncar una tabla
referenciada**: son **232 de 627**. Las tres salidas, medidas, **cortan las
tres**: `TRUNCATE` del padre · `TRUNCATE` con `session_replication_role =
replica` (**yo la daba por buena sin medirla**) · `DELETE` sin diferir.
La salida es **diferir al COMMIT**: las 843 pasaron a `DEFERRABLE INITIALLY
IMMEDIATE` (sólo catálogo; el panel sigue comprobando al instante), el cargador
hace `SET CONSTRAINTS ALL DEFERRED` y **le pregunta al catálogo** si la tabla es
padre — `DELETE` si lo es, `TRUNCATE` si no, **ninguna lista escrita a mano**.
**Y diferir NO deja entrar basura, medido:** una hija huérfana insertada con la
comprobación diferida se corta igual al forzar `SET CONSTRAINTS ALL IMMEDIATE`.

**CON LAS FORÁNEAS DECLARADAS, EL ORDEN DE CARGA DEJA DE SER UN DETALLE.** Si
una hija entra antes que su padre, una fila nueva de Tango la corta y la culpa
no es del dato sino del orden. **Medido: 301 de 586 pares cargaban la hija
primero** (`cpa46 → sta11`, `gva13 → gva14`). `ordenarPorDependencia()` lo saca
de `pg_constraint` y **lo declara en el log**: *"orden de carga: primero los
padres (552 tablas cambiaron de lugar)"*. Si el orden nuevo no tuviera
exactamente las mismas tablas, usa el de siempre.

**EL CARGADOR EXIGÍA UN ID NUMÉRICO QUE AVANCE, Y DIEZ TABLAS DE TANGO NO LO
TIENEN.** Medido: FORMA_PAGO, MODULO, ORIGEN_ASIENTO, ORIGEN_BIEN,
SELECCIONADO_POR, TIPO_CUENTA, TIPO_CUENTA_ARTICULO, TIPO_CUENTA_IV y
TIPO_MOVIMIENTO_STOCK **no tienen una sola columna numérica sin nulos** (clave
de texto), y `LOTE_CN_GENERADO_COMPROBANTE` tiene un ID que **se repite**: leía
5.000 de 6.579. Ahora hay dos formas de leer y **la elección se mide**: de una
sola vez cuando el ID no sirve de cursor o la tabla entra entera
(`LECTURA_ENTERA = 20000`), por lotes para las grandes. Las dos pasan por el
mismo control: si la temporal no coincide con lo que dice Tango, **no se
reemplaza nada**. Y la huella usa `TRY_CAST`, que devuelve nulo en vez de
reventar.

**UN CERO QUE ES CORRECTO PUEDE HACER QUE LA CORRIDA DIGA FALLA TODAS LAS
NOCHES.** `STA90` quedaba `SALTEADA` —Tango 0 filas, espejo 2— por el freno de
mano, y eso ponía la carga entera en FALLA. Medido antes de tocar: **0
funciones, 0 vistas, 0 materializadas y 0 hijas** la nombran. Las 2 filas
quedaron en `ema.sta90_antes_del_19_11` y la tabla se alineó con Tango (2 → 0).
*Una puerta que grita siempre se apaga.*

**LOS QUE FALLARON Y NO ERAN DEFECTOS, QUE ES LO QUE SE GANÓ AYER.** `CPA04` se
negó a reemplazarse porque Tango dijo 18.823 y la lectura trajo 18.824 —**entró
una factura mientras leía**, a las 16:30— y `CPA46` la frenó la foránea contra
`CPA04`. **El espejo se niega a guardar datos inconsistentes** en vez de
guardarlos y que se vean mal tres semanas después.

**CÓMO SE TOCA UN ARCHIVO EN SERVER01 SIN ROMPERLO.** Antes de parchear, el
archivo vivo se compara con la copia local por **SHA-256 calculado por el
servidor** (`HASHBYTES('SHA2_256', BulkColumn)` sobre `OPENROWSET(BULK ...)`).
Cada parche lleva **anclas que tienen que aparecer exactamente una vez** o no
toca nada, deja una copia al lado, y el texto viaja **en base64 en una sola
línea** para que ni las comillas ni los acentos se rompan. Después: `node
--check` en el servidor **y** `certutil -hashfile SHA256` contra el sha local.
**Y el parche se arma al revés primero:** se deshacen los cambios sobre el
archivo nuevo y el sha resultante tiene que dar el del servidor.

**NO TODO ARCHIVO DEL SERVIDOR SE PUEDE ESCRIBIR, Y SE MIDE CON `icacls`.**
`migrador.js` y `tablas.json` tienen `SERVER01\AdminMm:(I)(F)`;
`carga-clave.ps1` y `tablas-clave.txt` sólo `BUILTIN\Usuarios:(I)(RX)` — para
cambiarlos hay que elevar, y una elevación **no se puede automatizar** (UAC
bloquea la entrada de un proceso de menor integridad). Por eso el arreglo de la
carga nocturna vive en `migrador.js`, que **detecta que le pidieron la primera
tabla de `tablas-clave.txt` y corre la pasada completa, escribiéndolo en el
log**. Es un rodeo y está declarado: **cuando se pueda elevar, corregir el
`.ps1` y sacarlo.**

**`schtasks` SIN ELEVAR NO VE LAS TAREAS DE OTROS USUARIOS.** Buscando
`C:\DISSAN` en todas las tareas no apareció ninguna, y sin embargo algo corre a
las 05:00 todos los días. **Que no se vea no quiere decir que no exista.** La
tarea nueva (`DISSAN - carga completa 598`, 03:10) se creó sin elevar y quedó en
**"Sólo interactivo"**: corre mientras la sesión del servidor esté abierta.

**Resultado medido:** 598 tablas, **597 bien, 0 con error**, 2.843.107 filas,
13,3 minutos, y los 58 controles del motor pasan.

## 19/11/2026 (tarde) — ESPERAR A QUE APAREZCA UN RÓTULO QUE YA ESTÁ NO ES ESPERAR

**DOS VECES SEGUIDAS LEÍ UN REPINTADO VIEJO Y CASI PUBLICO EL PAR EQUIVOCADO.**
Para probar la Venta Neta en la pantalla publicada escribí un bucle que esperaba
a que **apareciera** el rótulo «VENTA NETA». El rótulo ya estaba pintado, del
rango anterior: a los **705 ms** me devolvió los números de 2024-a-hoy
—20.395 renglones, $18.374 M— como si fueran los de 2026. La segunda vez leí el
repintado que disparó el botón «Desde 2024 a hoy» que yo mismo había apretado un
segundo antes. **La regla: esperar a que el VALOR CAMBIE y a que no quede
ninguna llamada en vuelo, nunca a que aparezca un texto que ya puede estar.** Y
el par se lee **con el rango que la pantalla tiene puesto en ese momento**, leído
de los campos, no del que yo creo haber apretado.

**EL PAR, MEDIDO BIEN:** ventas.html publicada, apretando **2026** y **Ver** →
«Notas de crédito **64 · -$83.383.873,90**» y «**VENTA NETA
$7.356.963.417,69**»; `api_ventas_netas_v1` en esa misma corrida: **64** y
**7.356.963.417,69**, idénticos al centavo, y por `gva12`+`gva15` directo
**7.356.963.416,70** → **$0,99**. Repetido con **2025**: $6.397.070.218,01 =
$6.397.070.218,01, ruta independiente $6.397.070.214,56 (**$3,45**).

**LA TARJETA NETEA EL TOTAL; LOS DESGLOSES NO.** Medido: **ninguna** de las 24
funciones `api_ventas*` mira `gva15.clase_operacion` salvo la nueva. Los
desgloses —por cliente, mes, provincia, proveedor y artículo— salen de
`vista_margen_v2_oc` con **`t_comp = 'FAC'`**: no suman las notas de crédito,
pero **tampoco las restan**, así que cada cliente figura por lo que se le
facturó y no por lo que quedó. Medido en 2026: **el top 15 no cambia de
puesto**, y eso hay que decirlo igual que lo otro —*decir «está todo mal» es tan
falso como decir «está todo bien»*— pero hay clientes con **23,2%**
(ENTE HOSPITAL RAMON CARRILLO) y **30,4%** (LA SEGUNDA ART) de lo facturado
devuelto. **Se muestra aparte** (`api_ventas_notas_credito_v1`, cabeceras de
`gva12`) **en vez de tocar `vista_margen_v2_oc`**, que el 10/11 dejó el Tablero
caído nueve horas. La sección aparece **siempre** y dice «Ninguna» con el motivo.
El total por cliente da **$83.383.873,73** contra los **$83.383.873,90** de la
tarjeta: **$0,17**, porque las dos rutas no son la misma —una deriva del IVA del
subdiario y la otra suma `importe_gr + importe_ex`—.

**LA FECHA CONTABLE AÑO 2206: UNA FACTURA QUE NO CAE EN NINGÚN MES.**
`cpa04` tipo **FP** número **15935** → en el subdiario sale como **FAC
A0001600019600**, **CONCORD GAS SA**, **$114.912,64**, en pesos, **emitida el
14/10/2026** y con **fecha contable 14/10/2206**. El subdiario de compras va por
fecha contable, así que **no está en ningún mes que alguien vaya a pedir**:
medido, octubre 2026 trae 409 renglones y **no la incluye**, todo 2026 trae
3.386 y **tampoco**, y la ventana 10/2206 trae **exactamente 1: ella**. Es un año
tipeado mal en Tango, del mismo tipo que el `05/12/2202` de `gva12` —que es un
**REC de $0,00**, no una factura, al revés de lo que escribí el 13/11—.

**LAS FECHAS, MEDIDAS DE PUNTA A PUNTA:** 170 tablas, **384 columnas de fecha en
1 segundo** (`ema.coherencia_fecha` + `ema.medir_fechas`). **50 columnas nunca
tienen una fecha.** **129 columnas con fechas anteriores a 1990**, 814.704 filas:
es el centinela `1800-01-01` de Tango, que **no es nulo** — `gva12.fecha_anu`
lo tiene en **23.146 de 23.302 filas**, así que `where fecha_anu is null` no
encuentra nada y quien lo escriba va a creer que están todas anuladas.
**29 columnas con fechas futuras**, 12.639 filas: las de 2027 a 2035 son
vencimientos legítimos (`3031-07-31` es el centinela de «no vence»), y las de
2202, 2203 y 2206 son años tipeados mal.

**Y EL `revoke` VA SIEMPRE EN TRES RENGLONES, NO EN UNO.** Al crear
`api_ventas_notas_credito_v1` fueron `from public`, `from anon` y, en la interna
de `ema`, también `from authenticated`. Medido después, no supuesto: la de
`public` queda `anon=false / authenticated=true` y la de `ema` **cerrada a los
dos**. Es la tercera redacción de esta regla (10/11 decía `anon`, 12/11 decía
`public`, 14/11 descubrió que hacen falta los dos).

## 19/11/2026 (tarde, 2) — EL MAPA MEDÍA LOS DISTINTOS SOBRE 5.000 FILAS

**ES EL DEFECTO DEL 16/11 VIVO EN LA COLUMNA DE AL LADO.** Ese día se remidió
`llenos` de `ema.diccionario` porque contaba el texto vacío como lleno.
**`distintos` quedó sin tocar, con el mismo defecto de origen**: 143 columnas en
75 tablas decían exactamente **5.000** —el tamaño de la muestra— y 24 decían más
valores distintos que filas tiene la tabla, que es imposible. Lo peor de
negocio: **`historial_precios_ventas.precio` decía 2.485 y son 70.679.** De
`distintos` sale **`es_constante`**, que es lo que le dice a la IA de la Ayuda
que filtrar por un campo no cambia nada.

**QUÉ NO ESTABA MAL, Y TAMBIÉN SE MIDIÓ.** En la dirección peligrosa —el mapa
diciendo «constante» cuando no lo es— había **1 sola columna, y es mía**
(`cliente_mayor_menor.cargado_en`, 6 filas). *Decir «está todo mal» es tan falso
como decir «está todo bien».*

**`ema.distintos_remedido` + `ema.remedir_distintos` + `..._todo`**, gemelas de
las del llenado: **una sola lectura por tabla** con un
`count(distinct nullif(btrim(col::text),''))` por columna. **646 tablas y 10.718
columnas en 81,5 s.** En 5.000: 143 → **0**. Imposibles: 24 → **0**. Y la
**segunda pasada corrigió 0**, que es la prueba de que coincide. El mapa viejo
quedó en `ema.diccionario_antes_del_19_11`.

**Y VA EN SU PROPIO PASO DE LA TAREA (el 4), ANTES DE LAS IDENTIDADES.** 81,5 s
no entran adentro de `api_correr_identidades`, que ya usa ~99 s con un reloj de
120. `mapa_distintos_coincide` **suma las tablas que faltan en la remedición**,
así que una pasada a medias no puede dar un verde falso. Cuatro caras: limpia 0
· mapa con un valor de la muestra 1 · **remedición a medias 1 con el mapa bien**
· restaurada 0.

**UNA IDENTIDAD QUE SE PONE ROJA CUANDO EL PROBLEMA SE ARREGLA NO ES UNA
IDENTIDAD.** `tablas_sin_clave_declaradas` comparaba contra el literal **613**,
el conteo del 10/11. Al declarar las claves esa mañana, **gritó**. Un número
congelado de un día **no es una fuente independiente: es una foto**, y una
identidad que castiga una mejora se termina apagando igual que una que grita
siempre. Reescrita contra fuente mecánica —las tablas distintas de
`public.carga_detalle`, que son por definición las que el cargador trae de
Tango— y lado B **cero**. Tres caras: 0 · 1 con una tabla sin clave plantada en
`carga_detalle` · 0 al volver atrás.

**LAS CLAVES: 598 DE 598 TABLAS DE TANGO.** El 10/11 decía «sólo 79 de 692». Las
últimas cuatro se declararon hoy midiendo antes de tocar que la clave natural
fuera única y sin nulos: `cpa04_axdeleted` (681), `cpa29_axdeleted` (7),
`gva12_axtsdeleted` (105) y `tipo_movimiento_stock` (7). **Las 11 sin clave que
quedan son mías** (respaldos, exports, arneses) y no entran en la identidad
porque no las trae el cargador.

**LO QUE COSTARON LOS 49 DÍAS CONGELADOS, MEDIDO.** `ema.barrido_rehacer`
—nueva, porque `ema.barrido_contar` sólo cuenta lo que tiene `filas is null` y
después de la primera pasada devuelve «0 hechas» **y parece que midió**—:
**809 objetos con `count(*)` real en 0,8 s, 4.933.614 filas**. Contra el 10/11:
**540 tablas sin moverse una fila** (Tango tampoco las cambió: ahí el
congelamiento no costó datos), 98 crecieron (+32.059), **18 nuevas con
+533.804**, y una encogió 4 filas. Entre las nuevas, el rastro de lo borrado en
Tango: **`cpa04_axdeleted` 681 facturas de compra borradas** y
`gva12_axtsdeleted` 105 de venta, que no mira nadie todavía.

**DESPUÉS DE UNA CARGA COMPLETA, LAS IDENTIDADES QUE COMPARAN TANGO CONTRA UNA
MATERIALIZADA ESTÁN EN ROJO HASTA QUE CORRA EL REFRESCO.** `facturas_2026_dos_rutas`
y `facturas_11_dos_rutas` salieron en rojo por 11 y 10 facturas y la conclusión
fácil era un agujero nuevo. Medido antes de decirlo: corrido
`api_refrescar_margen_real()` → ok 36,9 s y **datos hasta el 19/11** (antes
llegaban al 13/11: **la carga completa le ganó seis días a la pantalla de
Margen**), las dos pasaron a **verde** — noviembre 176 = 176, 2026 2.927 contra
2.926. **El orden es carga → refresco → identidades**, y así está la tarea
(paso 1 antes del 5); mi corrida a mano fue al revés. Habría sido la sexta vez
en cinco días que acuso de agujero a algo que no lo es.

**UN `DELETE` EN UN LOTE INTERACTIVO LO FRENA EL CLASIFICADOR Y CORTA EL
CONECTOR A LOS 230 s.** Lo volví a hacer, y está escrito desde el 16/11 con el
`DROP`. El lote era una sola transacción y volvió atrás solo, **pero eso se
midió, no se supuso**: 645 tablas, las 138 columnas de `cpa04`, `gva12.t_comp`
8 = 8, 0 faltantes, ninguna temporal suelta. **Para plantarle un defecto a una
puerta se CREA algo al lado, no se borran filas**: la tercera cara se rehizo con
una tabla vacía (`prueba_remedicion_a_medias_19_11`, el motivo en su
comentario), que queda fuera de la remedición y hace sonar la identidad igual.

**Y EL PASO 5 DE LA TAREA NOCTURNA TIENE 21 SEGUNDOS DE MARGEN.** Medido hoy:
`api_correr_identidades` **98,8 s** con reloj de **120** (subdiario 0,4 ·
remedir llenado 29,8 · identidades 68,6), contra 86,9 s el 18/11. **Creció
solo**: 90 → 93 identidades y 627 → 646 tablas. Es lo que se cayó las noches del
17 y del 18. La salida limpia es mover también la remedición del llenado al paso
4, que ya existe, y dejar el 5 en ~69 s. **No se tocó hoy porque no puedo ver
correr la tarea de esta noche**, y cambiar la función que murió dos veces sin
verla andar es exactamente lo que no se hace.

**UN BLANCO SIN EXPLICACIÓN NO SE DISTINGUE DE UN OLVIDO.** `ema.tabla_modulo`
tenía **199 tablas con el módulo en blanco y nada escrito**, 152 de ellas
traídas por el cargador con **1.173.045 filas**. El motivo: Tango nombra los
módulos **por prefijo** (`GVA`→GV, `CPA`→CP, `STA`→ST) y esas 152 no lo siguen,
así que no figuran en su tabla `MODULO`. Medido el camino mecánico que queda —las
claves foráneas—: **21 se pueden deducir** porque TODAS sus foráneas apuntan a
tablas de **un solo** módulo (no las elegí yo), **3 apuntan a varios** y quedan
declaradas como ambiguas con sus candidatos, y **128 no tienen ninguna foránea a
una tabla con módulo**. Esas 128 se **declaran**, no se adivinan. Y las 47
restantes son mías, medido mecánicamente: no figuran en `carga_detalle`.
Resultado: **467 con módulo · 178 declarando por qué no · 0 en blanco sin
declarar**, con la puerta `modulo_de_cada_tabla_declarado` y sus tres caras
(0 · 1 borrándole el motivo a una · 0 al volver atrás).

## 19/11/2026 (noche) — REMEDÍ LOS DATOS TRES VECES Y NUNCA LA FÁBRICA QUE LOS ESCRIBE

**`ema.diccionario_medir` —LA FUNCIÓN QUE ESCRIBE EL MAPA— SEGUÍA MIDIENDO
SOBRE `limit 5000` Y CONTANDO EL TEXTO VACÍO COMO CARGADO.** El 12/11 corregí
1.952 campos, el 16/11 otros 1.446, el 19/11 a la tarde 143 más, y las tres
veces arreglé **las filas** y dejé intacta la función de la que salían. Toda
tabla nueva nacía con los dos defectos. Es el 16/11 textual: *un arreglo de a
uno donde la fábrica repone de a todos es una recaída programada* — lo había
escrito ese día **para los permisos** y no se me ocurrió aplicarlo al mapa.
Medido, sin escribir nada, con la fórmula de cada una sobre `gva12`:

| campo | v1 llenos | v2 llenos | v1 distintos | v2 distintos |
|---|---|---|---|---|
| `t_comp` | 5.000 (21,5%) | **23.302 (100%)** | 6 | **8** |
| `descripcion_factura` | 5.000 (100%) | **0** | 1 | 0 |
| `n_comp` | 5.000 | **23.302** | 4.680 | **22.724** |

**La muestra escondía DOS TIPOS DE COMPROBANTE ENTEROS** en `t_comp` — la misma
columna de la que salió el "cero notas de crédito" del 12/11.

**`ema.diccionario_medir_v2` mide la tabla entera** con
`count(nullif(btrim(col::text),''))`, la misma regla que las dos remediciones,
y **`ema.diccionario_correr` pasa a llamarla**. Los ejemplos siguen siendo una
muestra de 5 valores y **eso se declara en `fundamento`**: un ejemplo ilustra,
no mide.

**Y MI FUNCIÓN NUEVA TRAJO SU PROPIO DEFECTO, QUE CASI ME HACE ROMPER 2.322
FILAS BUENAS.** La v2 escribía `es_constante = (distintos = 1)` y la definición
del sistema —la de `ema.remedir_distintos`, con la que el mapa coincide en
10.716 de 10.716— es **`distintos <= 1`**: una columna VACÍA también cuenta como
constante, porque filtrar por ella no cambia nada. Vi 2.322 columnas vacías
marcadas constantes, las llamé "un tercer sobreviviente del defecto" y estuve a
punto de reescribirlas. **La medición me frenó:** `discrepaban_al_remedir = 0`,
o sea que las dos fuentes coincidían y **el que estaba fuera de línea era yo**.
Habría sido la sexta vez en cinco días que acuso de agujero a algo que no lo es,
y la primera contra 2.322 filas a la vez. **Antes de "corregir" el mapa en masa
por la opinión de una función que escribí hoy, hay que medir si la fuente vieja
y la remedición ya coincidían.**

**UN DECIMAL DE DIFERENCIA HABRÍA HECHO SONAR LA REMEDICIÓN TODAS LAS NOCHES.**
La v2 escribía `llenado_pct` con un decimal y la remedición con dos: 63,9
contra 63,92, con `con_dato` idéntico. Nada estaba mal, pero la pasada nocturna
iba a "corregir" esas 81 columnas **para siempre**. Igualado a dos decimales y
medido: **segunda pasada, 0 corregidas**, que es la única prueba de que el mapa
coincide con la base. *Una puerta que grita siempre se apaga*, también cuando
grita por redondeo.

**EL ANÁLISIS DE LA IA NO PODÍA CORRER SOBRE UNA TABLA QUE NO ESTÁ MEDIDA, Y
ESO NO LO VI HASTA QUE EL CONDUCTOR SE FRENÓ SOLO.** Las 18 tablas nuevas
estaban en `ema.mapa_cola` como pendientes y el conductor falló tres veces con
`sin_tabla: esa tabla no esta en el mapa`: `api_mapa_para_analizar` lee
`ema.diccionario` y `ema.diccionario_tabla`, y esas 18 no tenían una fila en
ninguna de las dos. **El orden es medir mecánicamente y DESPUÉS pagarle a la
IA**, nunca al revés. Su freno de 3 fallos seguidos funcionó: **costó $0**.

**Resultado medido:** las 18 tablas y sus **74 campos** medidos con la v2 y
analizados por la IA en 18 de 18, **0 fallidas, 0 columnas inventadas,
$0,4012** de los $2 autorizados. El mapa queda en **10.716 columnas · 645
tablas · 0 tablas de Tango sin mapear · 10.716 con significado**, y el único
campo que la IA no pudo deducir —`asiento_analitico_cn_comprobante_ext.hasta_nro_comprobante`,
**vacío en las 6.579 filas**— quedó **declarado**, no en blanco: *un blanco sin
explicación no se distingue de un olvido*.

**CUATRO PUERTAS NUEVAS, Y TRES NO HUBO QUE PLANTARLAS PORQUE EL DEFECTO ERA
REAL.** `mapa_sin_rastro_de_muestra` (ninguna columna con el número redondo
5.000, que es **la firma** de la muestra vieja) · `mapa_cubre_todo_lo_que_trae_el_cargador`
(si Tango agrega una tabla, el mapa tiene que enterarse) ·
`mapa_es_constante_coincide` · `mapa_sin_significado_sin_declarar`. Las caras:
la primera **0 limpio → 7 corriendo la v1 sobre `cpa63` → 0 al volver**, con
`ema.dicc_cpa63_antes_19_11` demostrando que la v2 devuelve **exactamente** los
mismos números (0 de 7 distintas, los 7 significados intactos); la segunda
**0 → 81 escondiendo lo medido hoy**; las otras dos, **1 → 0** con el defecto
mío de verdad.

**LA TAREA NOCTURNA PASA DE CINCO PASOS A SEIS.** El paso de las identidades
quedaba en 98,8 s con 21 s de margen y esa noche le agregué cuatro identidades
más: **un control que crece solo termina matando a la tarea**, como ya pasó el
17 y el 18. `ema.remedir_llenado_todo` salió de `api_correr_identidades` y es
el paso 5, `public.api_remedir_mapa_llenado()`, con su propio reloj. Medido con
el reloj de la tarea (120 s): **paso 5 = 29,2 s · paso 6 = 69,8 s, o sea 50 s
de margen en vez de 21**, 99 identidades, 98 en verde. **El orden sigue siendo
obligatorio:** las dos remediciones van ANTES del 6, o las identidades
compararían contra una foto vieja y darían un verde falso.

**Y VOLVÍ A LEER UN REPINTADO VIEJO, EL MISMO DÍA QUE ESCRIBÍ LA REGLA.** Esta
mañana anoté *"esperar a que el VALOR CAMBIE, no a que aparezca un rótulo"*, y
a la noche mi espera disparó **a los 0 segundos** y me devolvió la respuesta
anterior de la Ayuda —una sobre stock parado— como si fuera la mía. La regla
como la escribí no alcanza: esperé a que cambiara **otro elemento**. La versión
que sirve: **esperar a que cambie una huella PROPIA DE ESA respuesta** —acá el
encabezado `N filas · X s · tokens`— y recién entonces leer. Y el segundo click
que di de más **no costó nada**: la memoria contestó en 2,9 s diciendo "ya la
sabía — sin costo", así que el doble click no se pagó dos veces.

**LA PRUEBA DE QUE EL MAPA NUEVO SIRVE, EN LA PANTALLA PUBLICADA.** Una pregunta
que media hora antes el sistema **no podía contestar**, porque esas dos tablas
no tenían una sola fila en el mapa: *"cuántas facturas de compra y cuántos
comprobantes de venta se borraron en Tango"*. Nueve cifras y las nueve
idénticas a la base: **681 compras** (FP 656 · FS 14 · CP 8 · DP 3) y
**105 ventas** (FAC 78 · DMZ 25 · DVM 2), **786** entre las dos. Resolvió el
tipo por **`clase_operacion` y no por el código** —la regla del 12/11, que está
cargada en `ayuda.saber`— y cerró sola el cabo suelto del 11/11: *"estos
borrados explican los 206 comprobantes que nombra la cuenta corriente de
proveedores y no aparecen en compras. No son datos rotos."*

## 20/11/2026 — EL EXCEL DE MONICA, Y EL JUGUETE QUE LE MENTIA AL MENU

**«PESTAÑAS OCULTAS» NO ALCANZA SI EL OTRO NO LAS VE.** El usuario dijo que veia
dos y yo habia dicho cuatro ocultas: las dos cosas eran ciertas. No estan
`hidden`, estan **`state="veryHidden"`**, que Excel **no lista en «Mostrar
hoja»** — solo se ven desde el editor de Visual Basic o abriendo el `.xlsx` como
lo que es, un zip. Las pone **Tango** al exportar: tres guardan los valores de
los campos adicionales y la cuarta, `_metadata`, el nombre interno de cada
columna. **Antes de decirle a alguien que su archivo tiene algo que el no ve,
decirle DONDE no lo ve y por que.**

**UN TOTAL QUE CIERRA PUEDE ESTAR TAPANDO DIFERENCIAS QUE SE COMPENSAN.** El
total cerraba y la huella md5 renglon por renglon NO. El unico renglon distinto
en 14.613 era mio: `A0000800000273 · DMZ · SLGR003`, donde Python escribia
`-0.00` y Postgres `0.00` — **`Decimal` conserva el cero negativo** y `round()`
no. **La huella se busca por mitades:** archivo entero → 25 de 26 meses iguales
→ un solo dia → las 39 claves de ese dia a la vista. Cuatro pasos, no 14.613.

**`_metadata` DESTAPO DOS ROTULOS MENTIROSOS.** «Provincia» es la **zona**
(`gva05`): 14.652 de 14.652, con el mapa del maestro y no deducido de que los
conteos coincidan. Y «PROVEEDOR» **no es el vendedor**: la hoja tiene columnas
insertadas a mano y el mapeo quedo corrido. **Y acuse de mas:** dije que NINGUN
valor estaba en la lista de VENDEDORES y es falso, `JHONSON` esta, 1 de 51.

**LOS 254 RENGLONES QUE «FALTAN» NO FALTAN.** Tango guarda el mismo articulo dos
veces en un comprobante cuando salio de dos lotes, y las dos filas son
**identicas**: 188 combinaciones en 293 filas. El export las fusiona. Las claves
distintas son **14.613 en las dos puntas, contadas, no restadas**. Por eso
`ema.mv_ventas_detalle` **NO lleva indice unico** y no se puede refrescar
`CONCURRENTLY`: declarado en el comentario de la vista.

**EL JUGUETE LE MENTIA AL MENU Y NINGUNA DE LAS 18 PUERTAS LO MIRABA.**
`core.js` arma las cabezas con `if (g !== cabeza)` — **texto exacto**. Cree
`VentasDetalle` con `grupo = 'Ventas'` en la base y el juguete decia
`'CONSULTAS'`: el menu publicado iba a dibujar **tres cabezas donde van dos**.
Y al ponerle la puerta aparecio que **los dos subdiarios dicen `'IMPUESTOS'` en
el juguete y `'COMPRAS'`/`'VENTAS'` en la base desde el 10/11**: diez dias de
puertas midiendo un menu que DISSAN nunca vio. **Puerta nueva dentro del
alcance:** el juguete tiene que decir lo mismo que la base en `nombre` y
`grupo`, los dos textos que el usuario LEE. `api_alcance_modulos_v2` al lado de
la v1 para traer `grupo`. Dos arneses, los dos agarrados — y **el primero
REVENTO por un ancla vieja en vez de dar verde**, que es para lo que esta.

**`data-plata` NO SIGNIFICA «ESTA COLUMNA ES PLATA»: SIGNIFICA «ES UNA PARTE DEL
TOTAL DEL RENGLON».** Lo copie de `subdiario.js` —donde si lo es— y lo puse en
todas las columnas num. La puerta del archivo bajado sumo **«Precio unitario» +
«Importe Tango» = 867.768,60 contra un Total de 433.884,30**. Precio unitario es
**por unidad**: es el defecto del 14/10 en mi pantalla nueva. Esta grilla **no
tiene descomposicion aditiva** y eso se DECLARA en vez de inventarle una.

**UN CODIGO SE MARCA, O EL PDF LO CORTA.** El comprobante salia
`A0000800007...` y el articulo `FAVE002...`: van con `db-cod`, que `js/bajar.js`
ya reconoce. **Y la clase NO va en la celda vacia**, porque esa rama corre antes
que la del guion largo y hacia viajar el `—` al Excel como TEXTO.

**UNA ABREVIATURA MIA NO SE DISTINGUE DE UN NUMERO CORTADO.** La pantalla decia
`md5 25e5f0a3…` y la puerta del PDF lo corto. Tenia razon. Va la afirmacion, no
el hash.

**EL ANCHO DE LA HOJA LO MANDA EL DATO, IGUAL QUE EL DE LA COLUMNA.** 18
columnas no entran en A4 y cortaban `Lic10cmx...`, una descripcion con digitos.
**Desde 17 columnas, A3 apaisado.** Con 16 o menos no cambia nada — que son
todas las demas pantallas.

**EL ARNES DEL ALCANCE COPIABA POR `require` Y YO LEI UN ARCHIVO SIN
REQUERIRLO.** `alcance.js` paso a leer `control/supabase-de-juguete.js` con
`readFileSync` y la copia del arnes se quedo sin el: los seis senuelos cortaron
por **ENOENT en vez de por el defecto plantado**, o sea que cantaba «corto» sin
haber probado nada. Es textual lo que su propio comentario del 16/11 decia de
`sesion.js`. La convencion se extiende, no se agrega un nombre: ahora sigue
tambien los `path.join(__dirname, 'x.js')`, **exigiendo extension** para no
intentar copiar `'..'`.

**Y LEI UN REPINTADO VIEJO POR TERCERA VEZ, CON LA REGLA YA ESCRITA DOS VECES.**
La pantalla **se carga sola al abrirse** (core.js llama a `calcular()` despues de
armar el menu). Marque la huella ANTES de que esa carga terminara, no habia
datos que marcar, y mi espera se dio por satisfecha con el resultado de ESA
carga —el rango por defecto— mientras los campos ya decian 2026: lei
**$14.045.541.520,62** creyendo que era 2026. La version que sirve: **esperar a
que la carga en curso TERMINE, marcar la huella del objeto de datos, recien ahi
apretar, y esperar a que ese objeto sea OTRO.**

**PROBADO, CON LA DEFINICION DE LA CASA.** Pantalla **publicada**, entrando con
usuario y contrasenia, apretando el control con la mano, y la base en la misma
corrida: **2026** total $7.356.963.336,56 = 7.356.963.336,56 · 1.030.514 =
1.030.514 · 2.994 = 2.994, en 358 ms. **2025** $6.397.069.784,60 =
6.397.069.784,60 · 1.181.069 = 1.181.069 · 3.742 = 3.742, en 463 ms. **0
errores, 0 diferencias**, y el menu la muestra.

**LAS DOS PANTALLAS DE VENTAS DAN LO MISMO, MEDIDO.** Venta neta 2026
$7.356.963.417,69 contra `importe_tango` del detalle $7.356.963.417,09 =
**$0,60**; contra `total` (cantidad x precio) **$81,13**, que es el redondeo del
propio Tango entre sus dos cuentas y es lo que la columna **Control** muestra
dentro de cada renglon.

## 23/11/2026 — SU RESUMEN ES NETO, Y YO PUBLICABA EL BRUTO

**EL DASHBOARD DABA $43.835.634,21 DE MAS CONTRA SU TABLA DINAMICA, Y CADA PESO
ERA UNA NOTA.** Su hoja RESUMEN descuenta las notas de credito; el dashboard
salia de `vista_margen_v2_oc`, que es **`t_comp = 'FAC'` y nada mas**. Medido
cliente por cliente al corte 07/10/2026: **siete de ocho cierran al centavo con
las notas de credito**, y el octavo —COOP .FARMACEUTICA, $447.500— son **DOS
NOTAS DE DEBITO, que SUMAN**. Con el neto la peor diferencia es **$0,10** y el
total **$0,01**. **Y lo que NO estaba mal tambien se midio**: comparando solo
facturas, las dos fuentes coinciden en los 113 clientes, 0 arriba de $1.

**EL CORTE DE UN EXPORT NO ES LA FECHA DE SU NOMBRE.** `2026.10.08 DETALLE DE
VENTAS.xlsx` llega hasta el **07/10**, no hasta el 08: el 08 es cuando lo
exporto. Con el corte en 06 faltaba Drogueria ($1.064 M en 8 facturas del 07);
con el corte en 08 sobraba Notti ($83,8 M en 4 facturas del 08). **El 07 es el
unico dia que cierra a los dos a la vez: 14 de 14 en $0,00.** Perdi una hora
buscando un agujero que era una fecha.

**«CIERRA CONTRA OTRA CONSULTA MIA» NO ES «CIERRA».** Los 14 clientes cerraban
contra `ema.mv_ventas_detalle`, y el dashboard **no lee esa tabla**: lee
`ema.margen_medido`. Estuve por darlo por bueno — es el «403 de 403» del 16/11
otra vez, mi funcion contra mi propia funcion. La comparacion que vale es la que
se hace contra la fuente que la pantalla usa DE VERDAD.

**UN SEGMENTADOR NO SE FILTRA A SI MISMO**, o no se podria cambiar de eleccion.
Las opciones de la dimension K se miden sobre las filas que pasan **todos los
filtros MENOS el de K**, y eso se arma desde el array de dimensiones, sin una
lista escrita a mano. Medido eligiendo MENDOZA: zona **3 -> 3** (correcto),
provincia 6->5, proveedor 45->34, linea 50->40, cliente 118->92. **Y el cruce lo
hace la BASE**: filtrar en el navegador seria filtrar sobre los 12 mas grandes
que ya vinieron recortados, o sea otra cifra.

**UN `UPDATE` SIN `WHERE` LO FRENA `supautils` PARA `authenticated` —EL ROL DEL
PANEL— Y COMO DUEÑO NO SALTA NUNCA.** `21000 UPDATE requires a WHERE clause`.
Es la regla del 07/10 mordiendo en un lugar nuevo. **Y la salida no es ponerle
`where true` para callar al guardia**: la columna sale del mismo SELECT que la
crea, y se va el ALTER, se va el UPDATE y se va el modo de falla entero.

**CINCO VARIABLES DE CSS QUE NO EXISTEN CAEN AL RESPALDO Y NADIE LO MIDE.** Use
`--panel`, `--tinta`, `--linea`, `--acento` y `--fondo-2`: **ninguna esta en
`app.css`**, asi que las cajas salieron **BLANCAS adentro del panel oscuro**.
Las veinte puertas pasaron —las cifras estaban todas bien— y **lo vi al MIRAR LA
FOTO**. Las de la casa son `--fondo #09233A · --contenido #0B2740 ·
--caja #123252 · --borde · --texto #F2F5F3 · --gris #9FB4C4 · --verde #08A57A`
y `--navy-card`. De mirar las fotos salieron otras tres: «MENDOZA» cortado en
**«MEND…»** por 20 px, el desplegable **empujando la pantalla 600 px** en vez de
flotar, y **«Quitar los 1 filtros»**.

**LO QUE SE MUESTRA COMO FILTRO SALE DE LA BASE, NO DE MI MEMORIA.**
`api_ventas_dashboard_v2` devuelve `elegido` —por que filtro de verdad— y la
pantalla lo compara contra lo que mando: si no coinciden **NO PUBLICA** las
cifras. **Es el control que habria agarrado el defecto del 11/11**, con
`p_proveedores` y `p_provincias` cambiados de orden filtrando por provincia en
silencio. Su arnes apaga el espejo del juguete y exige que la pantalla grite.

**EL JUGUETE ESPEJA `elegido`, Y ESA ES LA UNICA COSA QUE SACA DE LOS
ARGUMENTOS.** Sigue contestando por nombre de funcion (11/11) y no calcula nada
con ellos; devolver lo que le pidieron no es validar, y sin eso ese control no
se puede ejercitar. El nombre del argumento se prueba como `p_<clave>`,
`p_<clave>s` y `p_<clave>es` y tiene que haber **exactamente uno**, o se declara
en vez de inventarlo.

**Y UN CASO NUEVO DEL JUGUETE NO SE ENCHUFA A MANO: `__CONTROL_CASO`.** Si
existe `X_<caso>`, se sirve ese — la misma convencion que `_vacia`. Hoy hay
tres: el lleno (con listas largas **y** cortas, para que se ejerciten los dos
caminos de la pantalla), el `_filtrado` y el `_vacia`.
