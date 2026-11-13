# RESPALDO DEL PROYECTO DISSAN — 13/11/2026

**Para qué es este archivo.** Para levantar el proyecto entero en otra sesión,
otra máquina u otro proyecto de Claude, sin depender de la memoria de nadie.
Dice **qué hay, dónde vive, cómo se prueba y qué falta**.

**Lo primero que hay que leer no es esto: es `CLAUDE.md`**, que está en la raíz
del repositorio y tiene las reglas. Esto es el inventario.

**Acá no hay ni una clave.** Dice dónde vive cada una. Es regla del proyecto:
*ningún vale, token ni clave se escribe en un archivo del repositorio, aunque
venza en tres horas.*

---

## 1. LOS DOS COMANDOS CON LOS QUE ARRANCA CADA SESIÓN

```bash
node control/acceso.js                      # ¿puedo probar? mide la base, el panel
                                            # publicado, y exige control/acceso-medido.json
                                            # de ESTA sesión
```
```sql
select * from api_estado_del_sistema();     # ¿está probado? un renglón por control
```

`api_estado_del_sistema()` devuelve **verde** (pasó hace menos de 24 h), **ámbar**
(pasó pero la medición está vieja) y **rojo** (falló, o **nunca se midió**). Hoy:
**98 verdes · 1 ámbar · 0 rojos** sobre 99 renglones.

**Si la medición está en ámbar o en rojo, la primera palabra es NO.**

---

## 2. DÓNDE VIVE CADA COSA

| Qué | Dónde |
|---|---|
| **El panel** | repositorio `ema-data-analytics/dissan-panel` → **https://ema-data-analytics.github.io/dissan-panel/** · se publica con `git push` y listo |
| **La base** | Supabase, proyecto **`hwgfmpvszdohnzqtwscw`** |
| **Las Edge Functions** | `edge/<slug>/index.ts` en el repo, desplegadas en ese mismo proyecto |
| **Los controles** | `control/*.js` y `control/*.py`, enganchados en `.githooks/pre-push` |
| **El historial día por día** | los ~168 documentos del Project de claude.ai, no en el repo |
| **Apps Script** | **muerto**. No se usa más. Si algo lo menciona, es historia |

**Credenciales, dónde viven (nunca en el repo):**
- `ANTHROPIC_API_KEY` → **sólo** en Supabase Secrets. Si la ofrecen por chat, se rechaza.
- La clave **publishable** de Supabase sí está en el repo: es pública por diseño.
- La **`service_role` NUNCA entra al repo**; si aparece, se saca y se rota.
- El tope de gasto real es el **límite mensual de la Console** (platform.claude.com →
  Límites de gasto). Todo tope que viva en la base se puede subir desde la base.

---

## 3. EL INVENTARIO, MEDIDO HOY

| | |
|---|---|
| Tablas en `public` | **627** |
| Vistas en `public` | **39** |
| Funciones `api_*` | **233** |
| Objetos en el esquema `ema` | **58** · 28 funciones |
| Objetos en el esquema `ayuda` | **47** |
| **Identidades activas** | **84** |
| **Puertas de publicación** | **16** |
| Módulos (`modulos`) | 23, **15 activos** |
| Perfiles de usuario | 4 |
| **Tablas con significado escrito** | **627 de 627** |
| Pantallas HTML | 17 |
| Edge Functions | 15 |
| Tamaño del repo (sin `.git`) | 3,5 MB |

### Las pantallas
`ayuda · bitacora · cartera · compras · hilo · index · informe · listas ·
pregunta · pruebas · seguridad · stock · subdiario-compras · subdiario-ventas ·
tablero · tesoreria · ventas`

### Las Edge Functions
`analizar-tabla · ayuda · bajar · carga-temporal · diag-clave · excel · leer ·
listas · preguntar · preguntar2 · preguntar3 · preguntar4 · **preguntar5** ·
probe-pdf · usuarios`

**La que atiende hoy es `preguntar5`.** `preguntar4` queda congelada como red de
seguridad: si el stream falla, `ayuda.js` vuelve sola a ella. De `preguntar4`
para atrás **no se toca nada**: todo arreglo va a `preguntar5`.

---

## 4. LAS 16 PUERTAS

Están en `.githooks/pre-push` y se enchufan solas con `control/enchufar.js`.
**Para subir algo roto hay que escribir `--no-verify` a mano.**
Cada una se anota en `ema.control_corrida` con la hora, el commit y qué midió.

| # | Puerta | Archivo | Qué mira |
|---|---|---|---|
| 1 | el acceso | `control/acceso.js` | que se pueda probar, y exige la medición de ESTA sesión |
| 2 | lo publicado | `control/publicado.js` | baja cada archivo de github.io y lo compara por SHA-256 contra `origin/main` |
| 3 | su control del control | `control/publicado-senuelos.js` | 6 defectos plantados en commits de mentira hechos con plumbing |
| 4 | el alcance | `control/alcance.js` | las pantallas contra la tabla `modulos` |
| 5 | su control del control | `control/alcance-senuelos.js` | 6 defectos de alcance plantados en una copia del árbol |
| 6 | las edge functions | `control/edge.js` | que cada `edge/<slug>/index.ts` tenga su fila verificada y el sha coincida |
| 7 | los rótulos | `control/rotulo.js` | que ningún control muestre un código en vez de un nombre |
| 8 | las cifras publicadas | `control/cifra.js` | vuelve a correr contra la base las cifras que se publicaron |
| 9 | el control del archivo | `control/archivo-senuelos.py` | 18 defectos plantados en un .xlsx armado con el mismo código del panel |
| 10 | el control del pdf | `control/pdf-senuelos.js` | 8 defectos plantados en un PDF armado con el mismo código |
| 11 | las pantallas | `control/pantallas.js` | abre las 17 con el Supabase de juguete y aprieta los botones |
| 12 | el archivo bajado | `control/archivo.js` | abre los Excel y PDF con openpyxl y compara celda por celda contra la pantalla |
| 13 | el aviso en vivo | `control/envivo.js` | que el panel siga avisando cuando una llamada tarda o falla |
| 14 | las firmas | `control/firmas.js` | manda a PostgREST de verdad las firmas que usa el panel |
| 15 | **los pasos en vivo** | `control/vivo.js` | que los pasos se pinten de a uno, y los dos frenos del stream |
| 16 | **el dictado** | `control/voz.js` | el botón del micrófono y sus tres frenos |

**El reloj, aparte de la puerta:** `node control/todos.js` corre las 16 en el
orden del pre-push y deja el estado fresco. Con `--desatendido` se usa en una
corrida sin nadie: ahí el control de acceso **declara** que el navegador y el
puente no se midieron, en vez de poner un rojo falso.

**Tardan ~21 minutos.** Si se corre en segundo plano, el límite de tiempo tiene
que ser holgado: el 12/11 le puse 10 minutos y lo mataron a mitad de camino.

**NO SE EDITA UN SCRIPT DE BASH MIENTRAS SE ESTÁ EJECUTANDO.** Bash lo lee por
tramos a medida que avanza.

---

## 5. LAS 84 IDENTIDADES

`ema.identidad` · `ema.identidad_corrida` · `ema.identidad_correr(p_clave)`.
Cada una compara una cifra contra **otra fuente que no es la que la calcula**.
Corren solas en `api_refrescar_margen_real` y salen en `api_estado_del_sistema()`
con los rojos arriba.

**Para agregar una:** insertar `clave`, `nombre`, `pregunta`, `fuente_a`,
`fuente_b`, `sql_a`, `sql_b`, `tolerancia`, `unidad` y **`periodo`**
(`'historico' | 'anio' | 'mes:MM' | 'ninguno'`). El período **se declara**, no se
adivina del texto.

**Si una va a estar siempre en roja por una razón conocida, NO se da de alta:**
se declara. *Una puerta que grita siempre se termina apagando.*

### Cómo se reparten

| Período | Cuántas | Qué miden |
|---|---|---|
| `mes:01` … `mes:11` | **55** | 5 por mes: ventas contra la contabilidad, facturas, clientes, notas de crédito e IVA |
| `anio` | 5 | facturación contra contabilidad, facturas, clientes, N/C y proveedores, por dos rutas |
| `historico` | 8 | IVA de compras por tres fuentes, IVA de ventas, subdiarios, facturas sin contabilizar |
| `ninguno` | 16 | cartera de clientes y proveedores, stock, costo, tesorería, listas, el índice IPC, el DER |

### Las que más valen para mostrar

- `ventas_vs_contabilidad` — la facturación del sistema contra la contabilidad de
  DISSAN. **Lo más fuerte que tiene el proyecto.**
- `cartera_proveedores_cierra` — **999 de 999**. Dos trampas: el signo está al
  revés que en clientes, y la compra al contado no entra a la cuenta corriente
  **pero su nota de crédito sí**.
- `stock_propio_cierra` — **4.441 de 4.441**, artículo por artículo.
- `iva_compras_vs_cpa63` — el IVA por **tres** fuentes distintas.
- `indice_precios_sin_huecos` / `indice_precios_al_dia` — cuidan el IPC.

---

## 6. LO QUE RIGE SOBRE EL COSTO Y EL MARGEN

- **La cifra que se publica sale de `api_margen_tablero_v3`**, que lee
  `vista_margen_v2_oc`. Costo = la **OC del pedido** si hay, el **lote** si no.
- **Se llama con parámetros con nombre** (`p_desde =>`, `p_calidad =>`), nunca
  posicionalmente: `p_solo_productos` tiene DEFAULT true y pasarle `null` cambia
  el resultado entero.
- **Las cuatro calidades van por nombre** en la constante `CALIDAD_FIRME`. Una
  lista vacía NO significa "todas": la función la lee como "sólo las A".
  `['A. orden de compra del pedido','A. lote exacto','A. peps','A. ultimo costo reciente']`
- **La cuarentena va entera**: costo ≥ $1, costo ≥ 5% del precio del renglón,
  costo < 4× el precio, y el artículo no en `articulos_comprados_por_caja` sin
  factor de envase.
- **Jamás un costo de una compra posterior a la venta.**
- **`sta12` está abandonado** y `gva53.prec_ulc_l` se copia de ahí: **todo informe
  que lea ese campo miente**.
- **La consignación (`sta11.stock = false`) es el 39% de lo facturado** y queda
  afuera de casi todas las mediciones. Antes de publicar un porcentaje, decir
  sobre qué denominador.

### Rendimiento, medido
- `api_margen_tablero_v3`: **2.018 ms**, 98.235 bytes. El servidor corta a los 8 s.
- **Una función SQL `SECURITY DEFINER` no se puede meter en la consulta que la
  llama**, así que Postgres le cachea un plan que puede ser basura. Medido sobre
  el mismo cuerpo: **54.000 ms** como función sql · **3.419 ms** con `EXECUTE`
  dinámico · **191 ms** con valores literales. Si una `api_` tarda de más,
  pasarla a plpgsql con `EXECUTE ... USING`.

---

## 7. LA AYUDA INTELIGENTE

**El circuito:** `preguntar5` → el modelo con 4 herramientas (`consultar_base`,
`buscar_en_el_mapa`, `ver_columnas`, `contestar`) → las cifras las saca **el
servidor** del bloque `resumen` que calcula la base en SQL sobre todas las filas.
**Ninguna cifra la escribe el modelo.**

**Las dos memorias, las dos retirables:**
- `ayuda.armado_guardado` — el armado entero (título, lectura, bloques, tarjetas).
  Repetir la pregunta vuelve a correr **sus** consultas: los datos siempre de
  ahora, nunca una foto vieja.
- `ayuda.lectura_guardada` — la lectura escrita.

Las dos tienen `activa` + `retirada_por_que`. **Si se agrega memoria a algo, en
el mismo movimiento hay que poder retirar lo que guardó.**

**El control de cifras:** `api_ia_control_cifra` (v7). Cuatro veredictos:
`coincide` · `no_coincide` · `no_cubierta` · `no_se_pudo`. **Si una cifra sale
`no_coincide`, la respuesta NO SE MEMORIZA.**

**El costo, medido:** $0,0474 por llamada · **$0,1375 por pregunta nueva** ·
**$0 por pregunta repetida**. Uso real de DISSAN: ~4 preguntas por día ≈ **$8/mes**.

**La inflación:** `ema.indice_precios` (IPC INDEC, 68 meses) +
`api_pesos_constantes` + `vista_indice_precios`. **Los meses que el INDEC todavía
no publicó no se estiman: se declara que no se pueden ajustar.**

**El período parcial:** `api_hasta_cuando_hay_datos()`, que **descarta las fechas
futuras** (hay una factura fechada en el año 2202).

---

## 8. CÓMO LEVANTARLO EN OTRO LADO, PASO A PASO

1. **Clonar** `ema-data-analytics/dissan-panel`.
2. **Leer `CLAUDE.md`.** No es opcional: son las reglas que costaron los golpes.
3. `git config core.hooksPath .githooks` — o correr cualquier control, que lo
   enchufa solo. **Esto se desarma en cada clon nuevo**, y por eso el pre-push
   estuvo tres días sin correr sin que nadie se enterara.
4. `npm` no hace falta para el panel (es HTML estático). Para los controles sí:
   Playwright con Chromium, y `openpyxl` para el control del archivo.
5. **Las Edge Functions se despliegan desde `edge/<slug>/index.ts`.** Después de
   cada deploy hay que **asentar su fila en `edge_verificada`** o la puerta 6
   corta el push: *no verificada no es limpia*.
6. **`ANTHROPIC_API_KEY` va en Supabase Secrets**, nunca en el repo.
7. Correr `node control/todos.js` y mirar `api_estado_del_sistema()`.

### Lo que NO está en el repo y hay que rehacer aparte
- **Los ~168 documentos** del día por día: están en el Project de claude.ai.
- **El contenido de la base**: 627 tablas migradas de Tango. El respaldo del
  esquema sube a Drive todas las noches, enganchado al refresco de las **05:52**.
- **Las claves.**

---

## 9. LAS TRAMPAS QUE MÁS CARO SALIERON

Están todas en `CLAUDE.md` con su fecha. Las que hay que saber antes de tocar nada:

1. **Un arreglo desplegado que no entra al repositorio se pierde en el siguiente
   despliegue.** (30/10, `listas`)
2. **El juguete contesta por nombre de función y nunca mira los argumentos.**
   Una firma mal dejó `ventas.html` rota toda la noche con 13 puertas en verde.
3. **Cero es la respuesta más peligrosa que hay, porque parece buena.** Un
   `not in (select …)` con un nulo adentro devuelve vacío en silencio: no eran
   cero facturas sin contabilizar, eran **$4.842 millones**.
4. **El permiso viene de `PUBLIC`, no de `anon`.** `revoke ... from anon` **no
   saca nada**. Va `revoke execute on function ... from public`, y después se
   mide con `has_function_privilege`.
5. **Un `return` solo en su renglón devuelve `undefined`.** JavaScript le inserta
   el punto y coma. Dejó los 13 Excel del panel sin abrir.
   `grep -rn "^\s*return\s*$" js/` no debe devolver nada.
6. **El `insert` va solo, la comprobación aparte.** Una prueba que termina en
   `RAISE` dentro del mismo lote que el `CREATE` se lleva puesto el `CREATE`.
7. **Un 5xx no es "te dejó pasar": es que no arrancó.**
8. **Un ítem de grilla o de flex no baja de su contenido sin `min-width:0`.**
9. **`[hidden]{display:none !important}` es la primera regla de `app.css`.**
10. **Si cambiás `app.css` o `core.js`, subí el `?v=` de TODOS los HTML.**
11. **No se usan `alert`, `confirm` ni `prompt`:** bloquean la pestaña y la
    automatización deja de responder.
12. **`gva12.t_comp = 'N/C'` devuelve cero y parece una respuesta.** Las notas de
    crédito de verdad son DVM, DMZ, DVS, DMS y CTO. La regla es
    `gva15.clase_operacion = 'NC'`.
13. **El IVA se distingue por `cod_impues` vacío, no por `cod_alicuo`.** El 21%
    viene con 1 pero el 10,5% viene con 3.
14. **Antes de buscar una relación, preguntarle al mapa**
    (`motor.der_arista`, 256.002 aristas medidas).
15. **Un sha que sale de volver a tipear el archivo no mide el servidor: mide mi
    tipeo.**

---

## 10. LA MARCA

**Slogan: «Ningún número viaja solo.»**
Bajada: *No te pedimos que confíes en el número. Te mostramos contra qué lo
controlamos.*

El detalle —dónde va cada frase, las cifras de prueba, los colores, y las
palabras prohibidas— está en `claude/MARCA-EMA-prompt-para-armar-piezas.md`.

---

*Escrito el 13/11/2026. Toda cifra de este archivo salió de una medición hecha
ese día contra la base o el repositorio, no de la memoria.*
