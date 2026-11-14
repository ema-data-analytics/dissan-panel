-- ============================================================================
-- DETALLE DE COMPROBANTES POR TIPO DE GASTO — la columna IMPUTACION
-- 14/11/2026 · pedido por DISSAN
-- ============================================================================
-- Es la pestania "detalle de comp. por tipo de gastos" del archivo que arma el
-- contador (COMPRAS_ARCHIVO_BASE.xlsx, hoja DETALLE COMP x TIPO). Lo unico que
-- cambia contra la suya: el tipo de gasto va en una columna llamada IMPUTACION
-- y lleva la DESCRIPCION, no la sigla. Dicho por el usuario, textual:
-- "VA LA DESCRIPCION, NO UNA SIGLA". El codigo (AGU, LIM) no viaja.
--
-- LO MEDIDO, octubre 2024, contra la planilla del contador:
--   renglones  171       = 171
--   SIN_IMP    96.832.505,12 = 96.832.505,12
--   IVA        17.383.712,53 = 17.383.712,53
--   OTROS_IMP  12.452.333,74 = 12.452.333,74
--   TOT_GRAL  126.668.551,39 = 126.668.551,39
-- Y renglon por renglon, no por el total: huella md5 de los 171 renglones con
-- (numero, sin_imp, iva, otros, total), calculada de los dos lados —
-- eb7b1f73cc42a8f980efea26bec5c9ee— 171 de 171.
--
-- TRES TRAMPAS, las tres medidas:
--   1. VA POR FECHA CONTABLE. Por fecha_emis da 162 renglones y
--      $124.554.650,95: adentro hay facturas emitidas antes y registradas en
--      octubre.
--   2. SIN_IMP NO ES importe_ne. Con el neto solo daba $82.483.413,64 contra
--      sus $96.832.505,12. La diferencia, $14.349.091,48, es importe_ex: el
--      EXENTO. SIN_IMP = neto + exento.
--   3. fecha_cont ES timestamp, NO date. La primera version declaraba
--      `fecha date` y leia el campo pelado: Postgres NO se queja al CREARLA,
--      revienta al LLAMARLA con "structure of query does not match function
--      result type". El juguete del control no lo puede ver —contesta por
--      nombre de funcion— y lo agarro la prueba contra la base con la sesion
--      del usuario. Misma clase que la firma rota del 10/11 que dejo
--      ventas.html caida toda la noche.
--
-- EL PORTERO: el mismo de api_subdiario_compras_v3, copiado textual. Esconder
-- el modulo del menu no es apagarlo.
-- ============================================================================

create or replace function public.api_subdiario_compras_gastos_v1(
  p_desde date default null, p_hasta date default null)
returns table(fecha date, imputacion text, tipo text, numero text, n_interno text,
              cod_pro text, razon_social text,
              sin_imp numeric, iva numeric, otros_imp numeric, tot_gral numeric)
language plpgsql stable security definer set search_path to 'public'
as $f$
begin
  if coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') <> 'service_role'
     and not exists (select 1 from public.api_mis_modulos() m where m.clave = 'SubdiarioCompras') then
    raise exception 'Este usuario no tiene el subdiario de IVA de compras.';
  end if;

  return query
  select c.fecha_cont::date,
         btrim(coalesce(g.desc_gasto, '')),
         btrim(coalesce(c.t_comp, '')),
         btrim(coalesce(c.n_comp, '')),
         btrim(coalesce(to_char(c.ncomp_in_c, 'FM999999999999'), '')),
         btrim(coalesce(c.cod_provee, '')),
         btrim(coalesce(p.nom_provee, '')),
         round(coalesce(c.importe_ne,0) + coalesce(c.importe_ex,0), 2),
         round(coalesce(c.imp_iva1,0)+coalesce(c.imp_iva2,0)+coalesce(c.imp_iva3,0)
              +coalesce(c.imp_iva4,0)+coalesce(c.imp_iva5,0), 2),
         round(coalesce(c.importe_to,0)
              -(coalesce(c.importe_ne,0)+coalesce(c.importe_ex,0))
              -(coalesce(c.imp_iva1,0)+coalesce(c.imp_iva2,0)+coalesce(c.imp_iva3,0)
               +coalesce(c.imp_iva4,0)+coalesce(c.imp_iva5,0)), 2),
         round(coalesce(c.importe_to,0), 2)
  from public.cpa04 c
  left join public.cpa01 p on btrim(p.cod_provee) = btrim(c.cod_provee)
  left join public.cpa70 g on btrim(g.cod_gasto)  = btrim(c.cod_gasto)
  where c.cod_gasto is not null and btrim(c.cod_gasto) <> ''
    and (p_desde is null or c.fecha_cont::date >= p_desde)
    and (p_hasta is null or c.fecha_cont::date <= p_hasta)
  order by btrim(coalesce(g.desc_gasto,'')), c.fecha_cont, btrim(coalesce(c.n_comp,''));
end
$f$;

-- LOS PERMISOS, Y POR QUE VAN LOS DOS REVOKE.                  medido el 14/11
-- El 12/11 quedo escrito que el EXECUTE viene de PUBLIC. En esta funcion NO
-- alcanzo: despues de `revoke ... from public`, has_function_privilege('anon')
-- seguia dando TRUE, porque el default ACL de Supabase se lo da a anon
-- DIRECTO. Van los dos, y despues se mide — con curl, no suponiendo.
revoke execute on function public.api_subdiario_compras_gastos_v1(date,date) from public;
revoke execute on function public.api_subdiario_compras_gastos_v1(date,date) from anon;
grant  execute on function public.api_subdiario_compras_gastos_v1(date,date) to authenticated;

-- medido: acl {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--         has_function_privilege('anon', ...)          = false
--         has_function_privilege('authenticated', ...) = true
--         curl con la clave publishable del repo       = HTTP 401 permission denied
