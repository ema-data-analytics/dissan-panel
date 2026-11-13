# PENDIENTE — subir el respaldo al Drive de DISSAN
**Anotado el 13/11/2026 12:05 (hora de Mendoza).**

## La carpeta, dicha por Aníbal

```
https://drive.google.com/drive/folders/1TGEkcXF70y-mYNbKTt7XMs5i1_umXTWB
```

**id de la carpeta: `1TGEkcXF70y-mYNbKTt7XMs5i1_umXTWB`**

Es el Drive de **DISSAN**, distinto del que se venía usando
(`DISSAN/` = `1IemN0jEzlHivtxm4_Z9X464DitZWo4jL`, en la cuenta
`claude_dissan@dissan.com.ar`), que se está quedando sin espacio: **quedan
20 GB**.

---

## POR QUE NO SE HIZO EN EL MOMENTO

**El conector de Google Drive estaba caído**, junto con los dos de Supabase, el
puente a la computadora del usuario y los demás. El error, textual y repetido:

```
502 Bad gateway  —  dialing https://api.anthropic.com/.../mcp
"the origin web server returned an invalid or incomplete response to Cloudflare"
```

**No era un problema de acceso ni de permisos:** a las 13:06 UTC de ese mismo día
se había subido `RESPALDO-DISSAN-2026-11-13.tar.gz` a Drive con ese mismo
conector, 2.475.455 bytes confirmados del otro lado. Lo que se cayó fue la
pasarela de MCP, y se cayeron **todos los conectores a la vez**.

Y el sistema de DISSAN estaba **intacto**, medido por otro camino en esa misma
corrida: la base HTTP 200 en 494 ms con sus 105 filas de semáforo, el panel
HTTP 200 en 329 ms. **El conector caído no es el sistema caído.**

---

## QUE HAY QUE HACER CUANDO VUELVA

1. **Subir a esa carpeta** el paquete del día:
   `RESPALDO-DISSAN-2026-11-13.zip` — 133 archivos · ~2,6 MB.
   Armado con `control/respaldo-armar.sh`, **sin saltear ninguna de sus puertas**.

2. **Antes de armarlo, rehacer cinco volcados de `base/`**, que quedaron
   anteriores al último commit y por eso el armador corta:
   `02-funciones-ema-ayuda-motor-y-vistas.sql` · `03-estructura-de-todas-las-tablas.sql` ·
   `04-el-conocimiento-del-proyecto.sql` · `05-el-mapa-10642-campos.sql` ·
   `06-edge-functions-desplegadas.md`.
   (`01-identidades-y-funciones-api.sql` ya se rehizo: **85 identidades**, las
   234 funciones `api_` intactas. Se pudo porque `api_respaldo_identidades`
   contesta por PostgREST con la clave *publishable*, que no pasa por MCP.)

3. **Medir qué ocupa el espacio en el Drive viejo y pasarle la lista a Aníbal
   ANTES de sacar nada.** No se borra nada por mi cuenta: la regla del proyecto
   es *no se borra nada*, y un respaldo borrado por error no se recupera.

---

## LO QUE VA A CADA DRIVE, Y POR QUE

| | dónde va | por qué |
|---|---|---|
| **Los datos de DISSAN** — `DISSAN_EXPORT_COMPLETO`, `DISSAN_DUPLICADOS`, `DISSAN_lote*.zip` | el Drive de DISSAN | son de ellos, y son lo que pesa |
| **El sistema de EMA** — panel, `base/`, documentos (2,6 MB) | el Drive de EMA | `base/` tiene el SQL de las 85 identidades, las 16 puertas y el método: es de Aníbal, no del cliente. Si se corta la relación, no puede quedar del otro lado |

**[Especulando, hay que medirlo]:** los `DISSAN_lote*.zip` y
`DISSAN_EXPORT_COMPLETO` fueron la **fuente de la migración**. Esos datos ya
están vivos en Supabase y controlados por las identidades —la facturación
cierra contra la contabilidad de DISSAN por **$215,84 sobre $16.411 millones**—,
así que son una copia de algo que ya existe en otro lado. **Eso se mide antes de
decirlo, y aun así se mueve, no se borra.**
