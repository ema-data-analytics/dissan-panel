-- ============================================================================
-- 13/11/2026 — EL MAPA LE MANDABA LA CLAVE PRIVADA DE AFIP AL MODELO
-- ============================================================================
--
-- QUE PASO
-- --------
-- `ema.diccionario` guarda muestras medidas de cada columna de la base
-- (`minimo`, `maximo`, `ejemplos`) y lo que la IA escribio sobre ella
-- (`que_es`, `significado`).
--
-- `api_ia_mapa_buscar` manda `que_es` + `significado` a la API de Anthropic.
-- `api_mapa_para_analizar` manda ademas `ejemplos`.
--
-- En una tabla de UNA fila, el minimo y el maximo SON el valor entero. Asi que
-- adentro del mapa estaban, y viajaban:
--   * public.certificado_afip.clave_privada  -> la clave privada RSA de DISSAN
--                                               ante AFIP (6.588 caracteres)
--   * public.certificado_afip.certificado    -> el certificado X.509
--   * public.sesiones.access_token           -> un JWT real de un usuario
--
-- PENDIENTE PARA EL USUARIO: rotar la contrasenia de la sesion expuesta.
--
-- ============================================================================
-- PARTE 1 — TAPAR LAS MUESTRAS DE LAS COLUMNAS SECRETAS
-- ============================================================================
-- No se borra nada: se reemplaza la muestra por un rotulo, y el motivo queda
-- escrito en `fundamento`. La MEDICION (llenos, distintos, tipo) no se toca:
-- esa no es secreta y es la que hace util al mapa.

update ema.diccionario
   set minimo   = case when minimo   is null then null else '(tapado: columna secreta)' end,
       maximo   = case when maximo   is null then null else '(tapado: columna secreta)' end,
       ejemplos = case when ejemplos is null then null else '(tapado: columna secreta)' end,
       que_es   = regexp_replace(que_es, '\(.*\)', '(tapado: columna secreta)'),
       fundamento = coalesce(fundamento,'') ||
         ' | 13/11/2026: las muestras de esta columna se taparon. Guardaba un valor'
         ' secreto de verdad y api_ia_mapa_buscar manda que_es al modelo.'
 where (esquema, tabla, columna) in (
         ('public','sesiones','access_token'),
         ('public','sesiones','refresh_token'),
         ('public','sesiones','token'),
         ('public','certificado_afip','clave_privada'),
         ('public','certificado_afip','nombre_clave_privada'),
         ('public','gva16','clave_mail'),
         ('public','gva16','pop3_clave'),
         ('public','gva16','oauth2_refresh_token_mail'),
         ('public','gva14','clave_is'),
         ('public','gva71','clave'),
         ('public','sta90','clave90'))
    or (esquema='public' and tabla='parametro_email'
        and columna ~* '(clave_|oauth2_refresh_token)');

-- El certificado X.509 se me paso en la primera pasada: lo encontro la identidad
-- despues de ensenarle a reconocer el hexadecimal.
update ema.diccionario
   set minimo      = case when minimo   is null then null else '(tapado: columna secreta)' end,
       maximo      = case when maximo   is null then null else '(tapado: columna secreta)' end,
       ejemplos    = case when ejemplos is null then null else '(tapado: columna secreta)' end,
       que_es      = 'CONSTANTE DE VERDAD: un solo valor. (tapado: columna secreta)',
       significado = 'DATO SENSIBLE: es el certificado X.509 de DISSAN ante AFIP, guardado'
                     ' como texto PEM pasado a hexadecimal. NO se expone, NO se copia a'
                     ' reportes ni a consultas, y NO sirve para analisis. Las muestras'
                     ' estan tapadas a proposito desde el 13/11/2026.'
 where esquema='public' and tabla='certificado_afip' and columna='certificado';

-- Y la correccion de lo que tape de mas: lo que habia en `significado` de
-- clave_privada NO era la clave, era la ADVERTENCIA que escribio la IA citando
-- el encabezado PEM. Tapar una advertencia util es peor que no tener control.
update ema.diccionario
   set significado = 'DATO SENSIBLE: es la clave privada RSA de DISSAN ante AFIP, guardada'
                     ' como texto PEM pasado a hexadecimal (6.588 caracteres hexa).'
                     ' Decodificada es un PEM de clave privada RSA completo. NO se expone,'
                     ' NO se copia a reportes ni a consultas, y NO sirve para analisis.'
                     ' Las muestras estan tapadas a proposito desde el 13/11/2026.'
 where esquema='public' and tabla='certificado_afip' and columna='clave_privada';

-- ============================================================================
-- PARTE 2 — LA IDENTIDAD QUE LO VIGILA
-- ============================================================================
-- TRES DEFECTOS MIOS, LOS TRES MEDIDOS, EN EL PRIMER DIA DE ESTA IDENTIDAD:
--
-- 1. ENUMERABA COLUMNAS A MANO (minimo||maximo||ejemplos||que_es) y se le
--    escapaba `significado`. Es la lista fija de calidades del 14/10 otra vez.
--    -> Va `to_jsonb(d)::text`: la FILA ENTERA. Una columna que se agregue
--       maniana queda cubierta sola.
--
-- 2. BUSCABA `-----BEGIN` Y LA CLAVE VIAJA EN HEXADECIMAL
--    (2D2D2D2D2D424547494E = "-----BEGIN"). No la habria agarrado nunca: lo que
--    sono fue la regla por nombre de columna.
--    -> El hexa esta en el patron.
--
-- 3. SONABA CON PROSA que solo menciona el encabezado, y con `juzgado_dgi.
--    secretaria` porque la lista de nombres tenia `secret` suelto — en
--    castellano esa es una palabra comun.
--    -> El PEM exige CUERPO (40+ base64) despues del encabezado, y los nombres
--       van `client_secret|secret_key|app_secret`.

update ema.identidad
   set sql_a = $q$select count(*)::numeric from ema.diccionario d
    where to_jsonb(d)::text ~* '(-----BEGIN [A-Z ]*PRIVATE KEY-----[^A-Za-z0-9+/]*[A-Za-z0-9+/]{40,}|2d2d2d2d2d424547494e|eyJ[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{10,}|sb_secret_[A-Za-z0-9_-]{10,}|ghp_[A-Za-z0-9]{20,})'
       or ( d.columna ~* '(access_token|refresh_token|clave_privada|clave_mail|pop3_clave|clave90|clave_is|apikey|api_key|password|passwd|client_secret|secret_key|app_secret)'
            and coalesce(nullif(d.minimo  ,'(tapado: columna secreta)'),'')
             || coalesce(nullif(d.maximo  ,'(tapado: columna secreta)'),'')
             || coalesce(nullif(d.ejemplos,'(tapado: columna secreta)'),'') <> '' )$q$,
       pregunta = '¿Hay en ema.diccionario alguna muestra que sea un token, una clave o un'
                  ' certificado DE VERDAD? Mira la FILA ENTERA con to_jsonb, asi una columna'
                  ' nueva queda cubierta sola. Agarra el PEM en claro Y EN HEXADECIMAL (asi'
                  ' viaja la clave de AFIP: 2d2d2d2d2d424547494e = -----BEGIN), y NO suena con'
                  ' prosa que solo menciona el encabezado: el 13/11 tape por eso una'
                  ' advertencia util de la IA.'
 where clave = 'mapa_sin_secretos';

-- ============================================================================
-- EL ARNES — LAS DOS CARAS. CORRER ESTO, NO CONFIAR EN QUE DA VERDE.
-- ============================================================================
-- Siete casos: cuatro que TIENEN que sonar y tres que NO. Si alguno da
-- '*** MAL ***', la identidad esta rota y no sirve de nada que diga verde.

with planta(caso, debe_sonar, texto) as (values
  ('1. clave PEM de verdad, en claro', true,
     'minimo: -----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA7xKq9vZ2mN8pLqRsTuVwXyZ0123456789abcdefgh'),
  ('2. clave PEM de verdad, en HEXA (el caso real de DISSAN)', true,
     'minimo: 2D2D2D2D2D424547494E205253412050524956415445204B45592D2D2D2D2D0A4D494945'),
  ('3. JWT de verdad', true,
     'minimo: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.xx'),
  ('4. clave de la API de Anthropic', true,
     'ejemplos: sk-ant-api03-ZZZZZZZZZZZZZZZZZZZZ'),
  ('5. PROSA que menciona el encabezado', false,
     'DATO SENSIBLE: es la clave privada RSA. Si se decodifica empieza con -----BEGIN RSA PRIVATE KEY-----. No hay que exponerla.'),
  ('6. el texto nuevo del significado', false,
     'DATO SENSIBLE: clave privada RSA de DISSAN ante AFIP, texto PEM pasado a hexadecimal (6.588 caracteres hexa). NO se expone.'),
  ('7. fila comun de un codigo de articulo', false,
     'minimo: 1 maximo: 87247019 que_es: NUMERO, de 0 a 87247019')
)
select caso, debe_sonar,
       texto ~* '(-----BEGIN [A-Z ]*PRIVATE KEY-----[^A-Za-z0-9+/]*[A-Za-z0-9+/]{40,}|2d2d2d2d2d424547494e|eyJ[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{10,}|sb_secret_[A-Za-z0-9_-]{10,}|ghp_[A-Za-z0-9]{20,})' as suena,
       case when (texto ~* '(-----BEGIN [A-Z ]*PRIVATE KEY-----[^A-Za-z0-9+/]*[A-Za-z0-9+/]{40,}|2d2d2d2d2d424547494e|eyJ[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{10,}|sb_secret_[A-Za-z0-9_-]{10,}|ghp_[A-Za-z0-9]{20,})') = debe_sonar
            then 'BIEN' else '*** MAL ***' end as veredicto
  from planta order by caso;
-- Medido el 13/11/2026: 7 de 7 BIEN.

-- Y la identidad de verdad, en una llamada APARTE del update
-- (una prueba que termina en RAISE en el mismo lote se lleva puesto el update):
-- select (ema.identidad_correr('mapa_sin_secretos')).*;
-- Medido el 13/11/2026: verde, 0 contra 0.
