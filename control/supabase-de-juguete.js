/* supabase-js DE JUGUETE para el control local, con respuestas de la MISMA
   FORMA que las de la base (traidas de la base el 28/10, filtro SAN JUAN
   01/08–27/10/2026). El contenedor no llega al CDN ni a Supabase, asi que esto
   es lo que permite cargar la pantalla en un navegador de verdad ANTES de
   subirla. No reemplaza la prueba en pantalla contra la base: agarra lo que
   mas repeti — un pintar() que corre y no escribe, un id que no existe, una
   declaracion repetida, un SyntaxError. */
(function(){
  /* lo que el servidor de verdad deja pasar por consulta */
  var TOPE_SERVIDOR = 1000;
  var RESUMEN = {"desde":"2026-08-01","hasta":"2026-10-27","total":{"clientes":3,"unidades":4972,"articulos":36,"facturado":24250699.43,"renglones":72,"comprobantes":28},"avisos":{"plata_sin_proveedor":40810901.02,"renglones_sin_proveedor":12,"renglones_sin_prov_consig":1,"plata_sin_prov_consig":661033.06,"plata_prefijo_contra_fiscal_mal":1678489232.84,"clientes_prefijo_contra_zona_mal":1,"renglones_prefijo_contra_zona_ok":72,"renglones_prefijo_contra_zona_mal":43,"clientes_prefijo_contra_fiscal_mal":37},"metodo":"Facturacion: renglones de factura de venta (t_comp = FAC), neto sin IVA, de vista_margen_v2_oc.","por_mes":[{"mes":"2026-08","anio":2026,"mes_nro":8,"facturado":15960270.57,"comprobantes":15},{"mes":"2026-09","anio":2026,"mes_nro":9,"facturado":5003108.45,"comprobantes":6},{"mes":"2026-10","anio":2026,"mes_nro":10,"facturado":3287320.41,"comprobantes":7}],"por_anio":[{"anio":2026,"clientes":3,"facturado":24250699.43,"renglones":72,"comprobantes":28}],"por_cliente":[{"f2024":0,"f2025":0,"f2026":13731678.24,"ultima":"2026-10-26","cliente":"COFARMEN LTDA. (San Juan)","primera":"2026-08-03","facturado":13731678.24,"provincia":"SAN JUAN","renglones":62,"cod_client":"SJ0014","comprobantes":22,"provincia_fiscal":"SAN JUAN"},{"f2024":0,"f2025":0,"f2026":7295600,"ultima":"2026-08-20","cliente":"LEM MEDICAL SRL","primera":"2026-08-20","facturado":7295600,"provincia":"SAN JUAN","renglones":2,"cod_client":"SJ0017","comprobantes":2,"provincia_fiscal":"CAPITAL FEDERAL"},{"f2024":0,"f2025":0,"f2026":3223421.19,"ultima":"2026-10-13","cliente":"SANATORIO ARGENTINO S.R.L.","primera":"2026-08-07","facturado":3223421.19,"provincia":"SAN JUAN","renglones":8,"cod_client":"SJ0011","comprobantes":4,"provincia_fiscal":"SAN JUAN"}],"por_proveedor":[{"f2024":0,"f2025":0,"f2026":7295600,"articulos":1,"facturado":7295600,"proveedor":"IMATIONTY SA","renglones":2,"comprobantes":2,"cod_proveedor":"1110"},{"f2024":0,"f2025":0,"f2026":6520437.96,"articulos":11,"facturado":6520437.96,"proveedor":"3M ARGENTINA SACIFIA","renglones":26,"comprobantes":9,"cod_proveedor":"112"},{"f2024":0,"f2025":0,"f2026":5872038.38,"articulos":10,"facturado":5872038.38,"proveedor":"COLOPLAST DE ARGENTINA S A","renglones":23,"comprobantes":12,"cod_proveedor":"111"},{"f2024":0,"f2025":0,"f2026":2487272.73,"articulos":4,"facturado":2487272.73,"proveedor":"BECTON DICKINSON ARGENTINA S R L","renglones":5,"comprobantes":3,"cod_proveedor":"115"},{"f2024":0,"f2025":0,"f2026":1730722.26,"articulos":8,"facturado":1730722.26,"proveedor":"LABORATORIO GAVAMAX S.A.","renglones":14,"comprobantes":8,"cod_proveedor":"00151"},{"f2024":0,"f2025":0,"f2026":344628.1,"articulos":2,"facturado":344628.1,"proveedor":"SULAN S.A.","renglones":2,"comprobantes":1,"cod_proveedor":"00218"},{"f2024":0,"f2025":0,"f2026":40810901.02,"articulos":12,"facturado":40810901.02,"proveedor":"SIN PROVEEDOR EN EL SINONIMO","renglones":12,"comprobantes":9,"cod_proveedor":"(sin proveedor)"}],"por_provincia":[{"clientes":3,"facturado":24250699.43,"provincia":"SAN JUAN","renglones":72,"comprobantes":28}],"clientes_distintos":3,"por_provincia_anio":[{"anio":2026,"facturado":24250699.43,"provincia":"SAN JUAN"}],"por_provincia_fiscal":[{"clientes":2,"facturado":16955099.43,"renglones":70,"provincia_fiscal":"SAN JUAN"},{"clientes":1,"facturado":7295600,"renglones":2,"provincia_fiscal":"CAPITAL FEDERAL"}]};

  var DETALLE = [{"fecha":"2026-10-26","cliente":"COFARMEN LTDA. (San Juan)","articulo":"Confeel 33120 Hidroc. 20x20","cantidad":15,"vendedor":"MENDOZA S/V","facturado":336725.55,"localidad":"SAN JUAN","proveedor":"COLOPLAST DE ARGENTINA S A","provincia":"SAN JUAN","cod_articu":"COLO0209","cod_client":"SJ0014","comprobante":"FAC A0000800007921","cod_proveedor":"111","precio_unitario":22448.37,"provincia_fiscal":"SAN JUAN"},{"fecha":"2026-10-26","cliente":"COFARMEN LTDA. (San Juan)","articulo":"Biatain 3710 alginato10x10","cantidad":30,"vendedor":"MENDOZA S/V","facturado":230919.6,"localidad":"SAN JUAN","proveedor":"COLOPLAST DE ARGENTINA S A","provincia":"SAN JUAN","cod_articu":"COLO0232","cod_client":"SJ0014","comprobante":"FAC A0000800007921","cod_proveedor":"111","precio_unitario":7697.32,"provincia_fiscal":"SAN JUAN"},{"fecha":"2026-10-26","cliente":"COFARMEN LTDA. (San Juan)","articulo":"CA31 Sond nasog. L105cm-D2.3m","cantidad":10,"vendedor":"MENDOZA S/V","facturado":14057,"localidad":"SAN JUAN","proveedor":"LABORATORIO GAVAMAX S.A.","provincia":"SAN JUAN","cod_articu":"GAVA0047","cod_client":"SJ0014","comprobante":"FAC A0000800007921","cod_proveedor":"00151","precio_unitario":1405.7,"provincia_fiscal":"SAN JUAN"},{"fecha":"2026-10-20","cliente":"COFARMEN LTDA. (San Juan)","articulo":"Brava 2650 Pasta c/ alcohol","cantidad":3,"vendedor":"MENDOZA S/V","facturado":98900.13,"localidad":"SAN JUAN","proveedor":"COLOPLAST DE ARGENTINA S A","provincia":"SAN JUAN","cod_articu":"COLO0142","cod_client":"SJ0014","comprobante":"FAC A0000800007898","cod_proveedor":"111","precio_unitario":32966.71,"provincia_fiscal":"SAN JUAN"},{"fecha":"2026-10-15","cliente":"COFARMEN LTDA. (San Juan)","articulo":"Confeel 33120 Hidroc. 20x20","cantidad":10,"vendedor":"MENDOZA S/V","facturado":224483.7,"localidad":"SAN JUAN","proveedor":"COLOPLAST DE ARGENTINA S A","provincia":"SAN JUAN","cod_articu":"COLO0209","cod_client":"SJ0014","comprobante":"FAC A0000800007865","cod_proveedor":"111","precio_unitario":22448.37,"provincia_fiscal":"SAN JUAN"},{"fecha":"2026-10-15","cliente":"COFARMEN LTDA. (San Juan)","articulo":"CA33 Sonda nasog. L45cm-D2.0mm","cantidad":20,"vendedor":"MENDOZA S/V","facturado":24675,"localidad":"SAN JUAN","proveedor":"LABORATORIO GAVAMAX S.A.","provincia":"SAN JUAN","cod_articu":"GAVA0046","cod_client":"SJ0014","comprobante":"FAC A0000800007865","cod_proveedor":"00151","precio_unitario":1233.75,"provincia_fiscal":"SAN JUAN"}];

  var OPCIONES = { desde:'2024-01-01', hasta:'2026-10-27',
    provincias:['MENDOZA','SAN JUAN','SAN LUIS'],
    clientes:[{cod:'SL0011',nombre:'DROGUERIA CENTRAL',provincia:'SAN LUIS',facturado:2581653928.03},
              {cod:'SJ0014',nombre:'COFARMEN LTDA. (San Juan)',provincia:'SAN JUAN',facturado:13731678.24},
              {cod:'MZ0366',nombre:'I.N.S.S.J.P UGL 26 Mendoza',provincia:'MENDOZA',facturado:598786313.25}],
    proveedores:[{cod:'00143',nombre:'JOHNSON & JOHNSON Medical SA',facturado:3782011587.47},
                 {cod:'111',nombre:'COLOPLAST DE ARGENTINA S A',facturado:3702551121.25}] };

  var CONTROL = { desde:'2024-01-01', hasta:'2026-10-27', facturas:10001, en_los_dos:9258,
    contable:15003517657.96, sistema:15009073398.47, diferencia:-5555740.51,
    iguales_al_peso:9024, dentro_del_1_pct:9254, facturas_sin_asiento:743,
    plata_sin_asiento:3184022830.59, facturas_sin_renglones:4,
    cuentas:'Cuentas 411001 Ventas Gravadas y 411002 Ventas Exentas de la contabilidad de DISSAN.' };

  /* 02/11: el menu paso a ser un ARBOL (cabeza + submenu), asi que el juguete
     tiene que devolver `grupo` como lo devuelve api_mis_modulos_v2. Si el
     juguete se queda con la forma vieja, el control mide una pantalla que no
     es la que se publica — que es exactamente lo que un juguete no puede
     hacer. Incluye una en construccion a proposito, para que el control vea
     el renglon apagado tambien. */
  var MODULOS = [{clave:'Dashboard',nombre:'Tablero General',grupo:null},
                 {clave:'Ayuda',nombre:'Ayuda Inteligente',grupo:null},
                 {clave:'Cotizador',nombre:'Cotizador (en desarrollo)',grupo:null},
                 {clave:'MargenDeVentas',nombre:'Márgenes de Ventas Reales (Pedidos – OC)',grupo:'CONSULTAS'},
                 {clave:'Ventas',nombre:'Ventas Facturadas y Costos (Detalle - Filtros)',grupo:'CONSULTAS'},
                 /* 20/11/2026. En la base de verdad este modulo esta apagado para
                    todos menos `pruebas` -eso lo decide `modulos`, no esto-; aca
                    tiene que estar para poder PROBAR la pantalla. Es el mismo
                    motivo por el que estan los dos subdiarios: sin el, el portero
                    la tapa y la puerta la mide como "abre limpia" sin haber
                    pintado nunca una grilla. */
                 {clave:'VentasDetalle',nombre:'Detalle de Ventas',grupo:'CONSULTAS'},
                 /* LOS DOS DEL SUBDIARIO, agregados el 10/11/2026.
                    No estaban, asi que el portero tapaba las dos pantallas y la
                    puerta de pantallas las media como "abren limpias" sin haber
                    pintado nunca una grilla. Estan apagadas para dissan y super
                    en la base de verdad -eso lo decide `modulos`, no esto-; aca
                    tienen que estar para poder PROBARLAS. */
                 /* EL GRUPO SALE DE LA BASE, NO DE LO QUE ME PAREZCA.
                    Hasta el 20/11 los dos decian 'IMPUESTOS' aca y en `modulos`
                    dicen 'COMPRAS' y 'VENTAS'. core.js arma las cabezas del menu
                    con comparacion EXACTA de texto, asi que durante diez dias las
                    18 puertas midieron un menu con una cabeza IMPUESTOS que DISSAN
                    nunca vio. Lo encontro la puerta del alcance al comparar el
                    juguete contra la base; antes no lo miraba nadie. */
                 {clave:'SubdiarioCompras',nombre:'Subdiario de IVA — Compras',grupo:'COMPRAS'},
                 {clave:'SubdiarioVentas',nombre:'Subdiario de IVA — Ventas',grupo:'VENTAS'},
                 {clave:'Listas',nombre:'Listas de Precios Proveedores',grupo:'COMPRAS'},
                 {clave:'Informe',nombre:'Informe de Base Verificada',grupo:'HERRAMIENTAS DE CONTROL'},
                 {clave:'Hilo',nombre:'Hilo Conductor',grupo:'HERRAMIENTAS DE CONTROL'},
                 {clave:'Bitacora',nombre:'Bitácora',grupo:'HERRAMIENTAS DE CONTROL'},
                 {clave:'Agenda',nombre:'Agenda de Control',grupo:'HERRAMIENTAS DE CONTROL'},
                 {clave:'Seguridad',nombre:'Usuarios y Permisos',grupo:'HERRAMIENTAS DE CONTROL'},
                 {clave:'Pruebas',nombre:'Pruebas',grupo:'HERRAMIENTAS DE CONTROL'}];

  /* traidos de la base el 28/10, filtro SAN JUAN 01/08-27/10/2026: hay filas CON
     costo, filas SIN costo con dos motivos distintos, y una con pedido y OC */
  var INFORME = [{"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 2, "articulo": "Confeel 33120 Hidroc. 20x20", "cantidad": 15, "vendedor": "MENDOZA S/V", "facturado": 336725.55, "localidad": "SAN JUAN", "n_partida": "10692011", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0209", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-0", "costo_total": 224483.73, "margen_pesos": 112241.82, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 14965.582, "n_orden_compra": null, "precio_unitario": 22448.37, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 1, "articulo": "Biatain 3710 alginato10x10", "cantidad": 30, "vendedor": "MENDOZA S/V", "facturado": 230919.6, "localidad": "SAN JUAN", "n_partida": "W00080033", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0232", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-0", "costo_total": 153946.32, "margen_pesos": 76973.28, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 5131.544, "n_orden_compra": null, "precio_unitario": 7697.32, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 3, "articulo": "CA31 Sond nasog. L105cm-D2.3m", "cantidad": 10, "vendedor": "MENDOZA S/V", "facturado": 14057, "localidad": "SAN JUAN", "n_partida": "25/121570", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0047", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007921-0", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "00151", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 1405.7, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "Se compra por caja y falta el factor de envase: el costo saldria multiplicado"}, {"fecha": "2026-10-13", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 1, "articulo": "Nexiva 22GA Dual Port", "cantidad": 18, "vendedor": "MENDOZA S/V", "facturado": 229923.97, "localidad": "CIUDAD", "n_partida": "5329057", "proveedor": "BECTON DICKINSON ARGENTINA S R L", "provincia": "SAN JUAN", "cod_articu": "BD00047", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007853-0", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "115", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 12773.553719, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "El costo es menor al 5% del precio de venta: no es un costo, es un error de carga"}, {"fecha": "2026-10-02", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 3, "articulo": "Equipo Macrog.s/ag TK14", "cantidad": 874, "vendedor": "MENDOZA S/V", "facturado": 391520.36, "localidad": "CIUDAD", "n_partida": "2209TK01", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0078", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": 51.18, "markup_pct": 104.85, "nro_pedido": 14709, "comprobante": "FAC A0000800007823-0", "costo_total": 191129.16, "margen_pesos": 200391.2, "metodo_costo": "orden de compra del pedido", "cod_proveedor": "00151", "costo_unitario": 218.6832, "n_orden_compra": "0000000005367", "precio_unitario": 447.963801, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 2, "articulo": "Confeel 33120 Hidroc. 20x20", "cantidad": 15, "vendedor": "MENDOZA S/V", "facturado": 336725.55, "localidad": "SAN JUAN", "n_partida": "10692011", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0209", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-1", "costo_total": 224483.73, "margen_pesos": 112241.82, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 14965.582, "n_orden_compra": null, "precio_unitario": 22448.37, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 1, "articulo": "Biatain 3710 alginato10x10", "cantidad": 30, "vendedor": "MENDOZA S/V", "facturado": 230919.6, "localidad": "SAN JUAN", "n_partida": "W00080033", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0232", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-1", "costo_total": 153946.32, "margen_pesos": 76973.28, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 5131.544, "n_orden_compra": null, "precio_unitario": 7697.32, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 3, "articulo": "CA31 Sond nasog. L105cm-D2.3m", "cantidad": 10, "vendedor": "MENDOZA S/V", "facturado": 14057, "localidad": "SAN JUAN", "n_partida": "25/121570", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0047", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007921-1", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "00151", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 1405.7, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "Se compra por caja y falta el factor de envase: el costo saldria multiplicado"}, {"fecha": "2026-10-13", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 1, "articulo": "Nexiva 22GA Dual Port", "cantidad": 18, "vendedor": "MENDOZA S/V", "facturado": 229923.97, "localidad": "CIUDAD", "n_partida": "5329057", "proveedor": "BECTON DICKINSON ARGENTINA S R L", "provincia": "SAN JUAN", "cod_articu": "BD00047", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007853-1", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "115", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 12773.553719, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "El costo es menor al 5% del precio de venta: no es un costo, es un error de carga"}, {"fecha": "2026-10-02", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 3, "articulo": "Equipo Macrog.s/ag TK14", "cantidad": 874, "vendedor": "MENDOZA S/V", "facturado": 391520.36, "localidad": "CIUDAD", "n_partida": "2209TK01", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0078", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": 51.18, "markup_pct": 104.85, "nro_pedido": 14709, "comprobante": "FAC A0000800007823-1", "costo_total": 191129.16, "margen_pesos": 200391.2, "metodo_costo": "orden de compra del pedido", "cod_proveedor": "00151", "costo_unitario": 218.6832, "n_orden_compra": "0000000005367", "precio_unitario": 447.963801, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 2, "articulo": "Confeel 33120 Hidroc. 20x20", "cantidad": 15, "vendedor": "MENDOZA S/V", "facturado": 336725.55, "localidad": "SAN JUAN", "n_partida": "10692011", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0209", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-2", "costo_total": 224483.73, "margen_pesos": 112241.82, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 14965.582, "n_orden_compra": null, "precio_unitario": 22448.37, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 1, "articulo": "Biatain 3710 alginato10x10", "cantidad": 30, "vendedor": "MENDOZA S/V", "facturado": 230919.6, "localidad": "SAN JUAN", "n_partida": "W00080033", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0232", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-2", "costo_total": 153946.32, "margen_pesos": 76973.28, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 5131.544, "n_orden_compra": null, "precio_unitario": 7697.32, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 3, "articulo": "CA31 Sond nasog. L105cm-D2.3m", "cantidad": 10, "vendedor": "MENDOZA S/V", "facturado": 14057, "localidad": "SAN JUAN", "n_partida": "25/121570", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0047", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007921-2", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "00151", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 1405.7, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "Se compra por caja y falta el factor de envase: el costo saldria multiplicado"}, {"fecha": "2026-10-13", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 1, "articulo": "Nexiva 22GA Dual Port", "cantidad": 18, "vendedor": "MENDOZA S/V", "facturado": 229923.97, "localidad": "CIUDAD", "n_partida": "5329057", "proveedor": "BECTON DICKINSON ARGENTINA S R L", "provincia": "SAN JUAN", "cod_articu": "BD00047", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007853-2", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "115", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 12773.553719, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "El costo es menor al 5% del precio de venta: no es un costo, es un error de carga"}, {"fecha": "2026-10-02", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 3, "articulo": "Equipo Macrog.s/ag TK14", "cantidad": 874, "vendedor": "MENDOZA S/V", "facturado": 391520.36, "localidad": "CIUDAD", "n_partida": "2209TK01", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0078", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": 51.18, "markup_pct": 104.85, "nro_pedido": 14709, "comprobante": "FAC A0000800007823-2", "costo_total": 191129.16, "margen_pesos": 200391.2, "metodo_costo": "orden de compra del pedido", "cod_proveedor": "00151", "costo_unitario": 218.6832, "n_orden_compra": "0000000005367", "precio_unitario": 447.963801, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 2, "articulo": "Confeel 33120 Hidroc. 20x20", "cantidad": 15, "vendedor": "MENDOZA S/V", "facturado": 336725.55, "localidad": "SAN JUAN", "n_partida": "10692011", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0209", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-3", "costo_total": 224483.73, "margen_pesos": 112241.82, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 14965.582, "n_orden_compra": null, "precio_unitario": 22448.37, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 1, "articulo": "Biatain 3710 alginato10x10", "cantidad": 30, "vendedor": "MENDOZA S/V", "facturado": 230919.6, "localidad": "SAN JUAN", "n_partida": "W00080033", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0232", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-3", "costo_total": 153946.32, "margen_pesos": 76973.28, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 5131.544, "n_orden_compra": null, "precio_unitario": 7697.32, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 3, "articulo": "CA31 Sond nasog. L105cm-D2.3m", "cantidad": 10, "vendedor": "MENDOZA S/V", "facturado": 14057, "localidad": "SAN JUAN", "n_partida": "25/121570", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0047", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007921-3", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "00151", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 1405.7, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "Se compra por caja y falta el factor de envase: el costo saldria multiplicado"}, {"fecha": "2026-10-13", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 1, "articulo": "Nexiva 22GA Dual Port", "cantidad": 18, "vendedor": "MENDOZA S/V", "facturado": 229923.97, "localidad": "CIUDAD", "n_partida": "5329057", "proveedor": "BECTON DICKINSON ARGENTINA S R L", "provincia": "SAN JUAN", "cod_articu": "BD00047", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007853-3", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "115", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 12773.553719, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "El costo es menor al 5% del precio de venta: no es un costo, es un error de carga"}, {"fecha": "2026-10-02", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 3, "articulo": "Equipo Macrog.s/ag TK14", "cantidad": 874, "vendedor": "MENDOZA S/V", "facturado": 391520.36, "localidad": "CIUDAD", "n_partida": "2209TK01", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0078", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": 51.18, "markup_pct": 104.85, "nro_pedido": 14709, "comprobante": "FAC A0000800007823-3", "costo_total": 191129.16, "margen_pesos": 200391.2, "metodo_costo": "orden de compra del pedido", "cod_proveedor": "00151", "costo_unitario": 218.6832, "n_orden_compra": "0000000005367", "precio_unitario": 447.963801, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 2, "articulo": "Confeel 33120 Hidroc. 20x20", "cantidad": 15, "vendedor": "MENDOZA S/V", "facturado": 336725.55, "localidad": "SAN JUAN", "n_partida": "10692011", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0209", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-4", "costo_total": 224483.73, "margen_pesos": 112241.82, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 14965.582, "n_orden_compra": null, "precio_unitario": 22448.37, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 1, "articulo": "Biatain 3710 alginato10x10", "cantidad": 30, "vendedor": "MENDOZA S/V", "facturado": 230919.6, "localidad": "SAN JUAN", "n_partida": "W00080033", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0232", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-4", "costo_total": 153946.32, "margen_pesos": 76973.28, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 5131.544, "n_orden_compra": null, "precio_unitario": 7697.32, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 3, "articulo": "CA31 Sond nasog. L105cm-D2.3m", "cantidad": 10, "vendedor": "MENDOZA S/V", "facturado": 14057, "localidad": "SAN JUAN", "n_partida": "25/121570", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0047", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007921-4", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "00151", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 1405.7, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "Se compra por caja y falta el factor de envase: el costo saldria multiplicado"}, {"fecha": "2026-10-13", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 1, "articulo": "Nexiva 22GA Dual Port", "cantidad": 18, "vendedor": "MENDOZA S/V", "facturado": 229923.97, "localidad": "CIUDAD", "n_partida": "5329057", "proveedor": "BECTON DICKINSON ARGENTINA S R L", "provincia": "SAN JUAN", "cod_articu": "BD00047", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007853-4", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "115", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 12773.553719, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "El costo es menor al 5% del precio de venta: no es un costo, es un error de carga"}, {"fecha": "2026-10-02", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 3, "articulo": "Equipo Macrog.s/ag TK14", "cantidad": 874, "vendedor": "MENDOZA S/V", "facturado": 391520.36, "localidad": "CIUDAD", "n_partida": "2209TK01", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0078", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": 51.18, "markup_pct": 104.85, "nro_pedido": 14709, "comprobante": "FAC A0000800007823-4", "costo_total": 191129.16, "margen_pesos": 200391.2, "metodo_costo": "orden de compra del pedido", "cod_proveedor": "00151", "costo_unitario": 218.6832, "n_orden_compra": "0000000005367", "precio_unitario": 447.963801, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 2, "articulo": "Confeel 33120 Hidroc. 20x20", "cantidad": 15, "vendedor": "MENDOZA S/V", "facturado": 336725.55, "localidad": "SAN JUAN", "n_partida": "10692011", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0209", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-5", "costo_total": 224483.73, "margen_pesos": 112241.82, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 14965.582, "n_orden_compra": null, "precio_unitario": 22448.37, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 1, "articulo": "Biatain 3710 alginato10x10", "cantidad": 30, "vendedor": "MENDOZA S/V", "facturado": 230919.6, "localidad": "SAN JUAN", "n_partida": "W00080033", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0232", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-5", "costo_total": 153946.32, "margen_pesos": 76973.28, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 5131.544, "n_orden_compra": null, "precio_unitario": 7697.32, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 3, "articulo": "CA31 Sond nasog. L105cm-D2.3m", "cantidad": 10, "vendedor": "MENDOZA S/V", "facturado": 14057, "localidad": "SAN JUAN", "n_partida": "25/121570", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0047", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007921-5", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "00151", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 1405.7, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "Se compra por caja y falta el factor de envase: el costo saldria multiplicado"}, {"fecha": "2026-10-13", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 1, "articulo": "Nexiva 22GA Dual Port", "cantidad": 18, "vendedor": "MENDOZA S/V", "facturado": 229923.97, "localidad": "CIUDAD", "n_partida": "5329057", "proveedor": "BECTON DICKINSON ARGENTINA S R L", "provincia": "SAN JUAN", "cod_articu": "BD00047", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007853-5", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "115", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 12773.553719, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "El costo es menor al 5% del precio de venta: no es un costo, es un error de carga"}, {"fecha": "2026-10-02", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 3, "articulo": "Equipo Macrog.s/ag TK14", "cantidad": 874, "vendedor": "MENDOZA S/V", "facturado": 391520.36, "localidad": "CIUDAD", "n_partida": "2209TK01", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0078", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": 51.18, "markup_pct": 104.85, "nro_pedido": 14709, "comprobante": "FAC A0000800007823-5", "costo_total": 191129.16, "margen_pesos": 200391.2, "metodo_costo": "orden de compra del pedido", "cod_proveedor": "00151", "costo_unitario": 218.6832, "n_orden_compra": "0000000005367", "precio_unitario": 447.963801, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 2, "articulo": "Confeel 33120 Hidroc. 20x20", "cantidad": 15, "vendedor": "MENDOZA S/V", "facturado": 336725.55, "localidad": "SAN JUAN", "n_partida": "10692011", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0209", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-6", "costo_total": 224483.73, "margen_pesos": 112241.82, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 14965.582, "n_orden_compra": null, "precio_unitario": 22448.37, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 1, "articulo": "Biatain 3710 alginato10x10", "cantidad": 30, "vendedor": "MENDOZA S/V", "facturado": 230919.6, "localidad": "SAN JUAN", "n_partida": "W00080033", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0232", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-6", "costo_total": 153946.32, "margen_pesos": 76973.28, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 5131.544, "n_orden_compra": null, "precio_unitario": 7697.32, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 3, "articulo": "CA31 Sond nasog. L105cm-D2.3m", "cantidad": 10, "vendedor": "MENDOZA S/V", "facturado": 14057, "localidad": "SAN JUAN", "n_partida": "25/121570", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0047", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007921-6", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "00151", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 1405.7, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "Se compra por caja y falta el factor de envase: el costo saldria multiplicado"}, {"fecha": "2026-10-13", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 1, "articulo": "Nexiva 22GA Dual Port", "cantidad": 18, "vendedor": "MENDOZA S/V", "facturado": 229923.97, "localidad": "CIUDAD", "n_partida": "5329057", "proveedor": "BECTON DICKINSON ARGENTINA S R L", "provincia": "SAN JUAN", "cod_articu": "BD00047", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007853-6", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "115", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 12773.553719, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "El costo es menor al 5% del precio de venta: no es un costo, es un error de carga"}, {"fecha": "2026-10-02", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 3, "articulo": "Equipo Macrog.s/ag TK14", "cantidad": 874, "vendedor": "MENDOZA S/V", "facturado": 391520.36, "localidad": "CIUDAD", "n_partida": "2209TK01", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0078", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": 51.18, "markup_pct": 104.85, "nro_pedido": 14709, "comprobante": "FAC A0000800007823-6", "costo_total": 191129.16, "margen_pesos": 200391.2, "metodo_costo": "orden de compra del pedido", "cod_proveedor": "00151", "costo_unitario": 218.6832, "n_orden_compra": "0000000005367", "precio_unitario": 447.963801, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 2, "articulo": "Confeel 33120 Hidroc. 20x20", "cantidad": 15, "vendedor": "MENDOZA S/V", "facturado": 336725.55, "localidad": "SAN JUAN", "n_partida": "10692011", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0209", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-7", "costo_total": 224483.73, "margen_pesos": 112241.82, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 14965.582, "n_orden_compra": null, "precio_unitario": 22448.37, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 1, "articulo": "Biatain 3710 alginato10x10", "cantidad": 30, "vendedor": "MENDOZA S/V", "facturado": 230919.6, "localidad": "SAN JUAN", "n_partida": "W00080033", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0232", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-7", "costo_total": 153946.32, "margen_pesos": 76973.28, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 5131.544, "n_orden_compra": null, "precio_unitario": 7697.32, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 3, "articulo": "CA31 Sond nasog. L105cm-D2.3m", "cantidad": 10, "vendedor": "MENDOZA S/V", "facturado": 14057, "localidad": "SAN JUAN", "n_partida": "25/121570", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0047", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007921-7", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "00151", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 1405.7, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "Se compra por caja y falta el factor de envase: el costo saldria multiplicado"}, {"fecha": "2026-10-13", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 1, "articulo": "Nexiva 22GA Dual Port", "cantidad": 18, "vendedor": "MENDOZA S/V", "facturado": 229923.97, "localidad": "CIUDAD", "n_partida": "5329057", "proveedor": "BECTON DICKINSON ARGENTINA S R L", "provincia": "SAN JUAN", "cod_articu": "BD00047", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007853-7", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "115", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 12773.553719, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "El costo es menor al 5% del precio de venta: no es un costo, es un error de carga"}, {"fecha": "2026-10-02", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 3, "articulo": "Equipo Macrog.s/ag TK14", "cantidad": 874, "vendedor": "MENDOZA S/V", "facturado": 391520.36, "localidad": "CIUDAD", "n_partida": "2209TK01", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0078", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": 51.18, "markup_pct": 104.85, "nro_pedido": 14709, "comprobante": "FAC A0000800007823-7", "costo_total": 191129.16, "margen_pesos": 200391.2, "metodo_costo": "orden de compra del pedido", "cod_proveedor": "00151", "costo_unitario": 218.6832, "n_orden_compra": "0000000005367", "precio_unitario": 447.963801, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 2, "articulo": "Confeel 33120 Hidroc. 20x20", "cantidad": 15, "vendedor": "MENDOZA S/V", "facturado": 336725.55, "localidad": "SAN JUAN", "n_partida": "10692011", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0209", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-8", "costo_total": 224483.73, "margen_pesos": 112241.82, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 14965.582, "n_orden_compra": null, "precio_unitario": 22448.37, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 1, "articulo": "Biatain 3710 alginato10x10", "cantidad": 30, "vendedor": "MENDOZA S/V", "facturado": 230919.6, "localidad": "SAN JUAN", "n_partida": "W00080033", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0232", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-8", "costo_total": 153946.32, "margen_pesos": 76973.28, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 5131.544, "n_orden_compra": null, "precio_unitario": 7697.32, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 3, "articulo": "CA31 Sond nasog. L105cm-D2.3m", "cantidad": 10, "vendedor": "MENDOZA S/V", "facturado": 14057, "localidad": "SAN JUAN", "n_partida": "25/121570", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0047", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007921-8", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "00151", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 1405.7, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "Se compra por caja y falta el factor de envase: el costo saldria multiplicado"}, {"fecha": "2026-10-13", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 1, "articulo": "Nexiva 22GA Dual Port", "cantidad": 18, "vendedor": "MENDOZA S/V", "facturado": 229923.97, "localidad": "CIUDAD", "n_partida": "5329057", "proveedor": "BECTON DICKINSON ARGENTINA S R L", "provincia": "SAN JUAN", "cod_articu": "BD00047", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007853-8", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "115", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 12773.553719, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "El costo es menor al 5% del precio de venta: no es un costo, es un error de carga"}, {"fecha": "2026-10-02", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 3, "articulo": "Equipo Macrog.s/ag TK14", "cantidad": 874, "vendedor": "MENDOZA S/V", "facturado": 391520.36, "localidad": "CIUDAD", "n_partida": "2209TK01", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0078", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": 51.18, "markup_pct": 104.85, "nro_pedido": 14709, "comprobante": "FAC A0000800007823-8", "costo_total": 191129.16, "margen_pesos": 200391.2, "metodo_costo": "orden de compra del pedido", "cod_proveedor": "00151", "costo_unitario": 218.6832, "n_orden_compra": "0000000005367", "precio_unitario": 447.963801, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 2, "articulo": "Confeel 33120 Hidroc. 20x20", "cantidad": 15, "vendedor": "MENDOZA S/V", "facturado": 336725.55, "localidad": "SAN JUAN", "n_partida": "10692011", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0209", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-9", "costo_total": 224483.73, "margen_pesos": 112241.82, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 14965.582, "n_orden_compra": null, "precio_unitario": 22448.37, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 1, "articulo": "Biatain 3710 alginato10x10", "cantidad": 30, "vendedor": "MENDOZA S/V", "facturado": 230919.6, "localidad": "SAN JUAN", "n_partida": "W00080033", "proveedor": "COLOPLAST DE ARGENTINA S A", "provincia": "SAN JUAN", "cod_articu": "COLO0232", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": 33.33, "markup_pct": 50, "nro_pedido": null, "comprobante": "FAC A0000800007921-9", "costo_total": 153946.32, "margen_pesos": 76973.28, "metodo_costo": "lote", "cod_proveedor": "111", "costo_unitario": 5131.544, "n_orden_compra": null, "precio_unitario": 7697.32, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}, {"fecha": "2026-10-26", "cliente": "COFARMEN LTDA. (San Juan)", "renglon": 3, "articulo": "CA31 Sond nasog. L105cm-D2.3m", "cantidad": 10, "vendedor": "MENDOZA S/V", "facturado": 14057, "localidad": "SAN JUAN", "n_partida": "25/121570", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0047", "cod_client": "SJ0014", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007921-9", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "00151", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 1405.7, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "Se compra por caja y falta el factor de envase: el costo saldria multiplicado"}, {"fecha": "2026-10-13", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 1, "articulo": "Nexiva 22GA Dual Port", "cantidad": 18, "vendedor": "MENDOZA S/V", "facturado": 229923.97, "localidad": "CIUDAD", "n_partida": "5329057", "proveedor": "BECTON DICKINSON ARGENTINA S R L", "provincia": "SAN JUAN", "cod_articu": "BD00047", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": null, "markup_pct": null, "nro_pedido": null, "comprobante": "FAC A0000800007853-9", "costo_total": null, "margen_pesos": null, "metodo_costo": null, "cod_proveedor": "115", "costo_unitario": null, "n_orden_compra": null, "precio_unitario": 12773.553719, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": "El costo es menor al 5% del precio de venta: no es un costo, es un error de carga"}, {"fecha": "2026-10-02", "cliente": "SANATORIO ARGENTINO S.R.L.", "renglon": 3, "articulo": "Equipo Macrog.s/ag TK14", "cantidad": 874, "vendedor": "MENDOZA S/V", "facturado": 391520.36, "localidad": "CIUDAD", "n_partida": "2209TK01", "proveedor": "LABORATORIO GAVAMAX S.A.", "provincia": "SAN JUAN", "cod_articu": "GAVA0078", "cod_client": "SJ0011", "cod_vended": "01", "margen_pct": 51.18, "markup_pct": 104.85, "nro_pedido": 14709, "comprobante": "FAC A0000800007823-9", "costo_total": 191129.16, "margen_pesos": 200391.2, "metodo_costo": "orden de compra del pedido", "cod_proveedor": "00151", "costo_unitario": 218.6832, "n_orden_compra": "0000000005367", "precio_unitario": 447.963801, "provincia_fiscal": "SAN JUAN", "por_que_sin_costo": null}];

  var PORMES = [{"mes": "08/2026", "anio": 2026, "costo": 4321764.97, "mes_nro": 8, "facturado": 15960270.57, "renglones": 36, "margen_pct": 31.05, "markup_pct": 45.03, "comprobantes": 15, "margen_pesos": 1945940.27, "cobertura_pct": 39.27, "venta_con_costo": 6267705.21, "renglones_con_costo": 29}, {"mes": "09/2026", "anio": 2026, "costo": 3235767.11, "mes_nro": 9, "facturado": 5003108.45, "renglones": 22, "margen_pct": 34.4, "markup_pct": 52.43, "comprobantes": 6, "margen_pesos": 1696572.86, "cobertura_pct": 98.59, "venta_con_costo": 4932339.95, "renglones_con_costo": 20}, {"mes": "10/2026", "anio": 2026, "costo": 1297859.03, "mes_nro": 10, "facturado": 3287320.41, "renglones": 14, "margen_pct": 34.16, "markup_pct": 51.88, "comprobantes": 7, "margen_pesos": 673374.01, "cobertura_pct": 59.96, "venta_con_costo": 1971233.04, "renglones_con_costo": 8}];

  var BITACORA = [{"cuando": "2026-10-28T16:40:00+00:00", "fecha": "28/10/2026", "hora": "13:40", "quien": "claude", "tipo": "accion", "titulo": "Creada la bitacora: ema.bitacora, ema.anotar, api_bitacora y api_bitacora_resumen", "detalle": "Con los modulos Bitacora y Agenda para el rol pruebas. La funcion de anotacion rechaza cualquier cosa que parezca una contrasena o una clave de API.", "objeto": "ema.bitacora"}, {"cuando": "2026-10-28T16:35:00+00:00", "fecha": "28/10/2026", "hora": "13:35", "quien": "usuario", "tipo": "pedido", "titulo": "Agregá la agenda al usuario anibal, poder bajar a PDF, y una bitácora en la base", "detalle": "Textual: no quiero perder mas el hilo de nada, fecha, hora, y lo que hacemos exacto.", "objeto": null}, {"cuando": "2026-10-28T16:32:00+00:00", "fecha": "28/10/2026", "hora": "13:32", "quien": "claude", "tipo": "error", "titulo": "ERROR REAL: cree el usuario con SQL directo y quedo mal armado", "detalle": "Cuatro columnas en NULL que el Auth lee como cadena y le faltaba la fila en auth.identities: los que andan tienen 1, el mio 0.", "objeto": "auth.users · auth.identities"}, {"cuando": "2026-10-28T15:28:00+00:00", "fecha": "28/10/2026", "hora": "12:28", "quien": "claude", "tipo": "error", "titulo": "ERROR REAL: las funciones nuevas publicaban un costo de un cuarto de centavo", "detalle": "id 70098, COLO0138, 1 unidad a 95.231,40 con costo 0,0025: 100% de margen. Medibles 4.459 a 4.043.", "objeto": "api_ventas_fact_informe"}, {"cuando": "2026-10-28T15:32:00+00:00", "fecha": "28/10/2026", "hora": "12:32", "quien": "claude", "tipo": "entrega", "titulo": "Pantalla de Ventas con el diseno del informe del usuario, subida", "detalle": "11 filtros, 7 grillas con Excel y PDF, 30 filas en pantalla y 50 en el archivo bajado.", "objeto": "commit 1d2deb2"}, {"cuando": "2026-10-28T13:38:00+00:00", "fecha": "28/10/2026", "hora": "10:38", "quien": "usuario", "tipo": "pedido", "titulo": "Ya mandé los HTML: ¿qué es ahora?", "detalle": null, "objeto": null}, {"cuando": "2026-10-28T14:25:00+00:00", "fecha": "28/10/2026", "hora": "11:25", "quien": "claude", "tipo": "medicion", "titulo": "Barrido de la clase entera, no del defecto del dia", "detalle": "52 funciones con limite y 17 vistas con la llave del renglon: 15 limpias, 2 con defecto.", "objeto": null}, {"cuando": "2026-10-28T14:40:00+00:00", "fecha": "28/10/2026", "hora": "11:40", "quien": "claude", "tipo": "decision", "titulo": "Las reglas escritas no frenan nada: las cinco clases pasan a ser una consulta", "detalle": "control_defectos_conocidos() devuelve una fila por objeto que falla.", "objeto": "control_defectos_conocidos"}];

  var BITRES = {"anotaciones": 42, "dias": 1, "primera": "28/10/2026 10:38", "ultima": "28/10/2026 13:40", "por_tipo": [{"tipo": "pedido", "cuantas": 17}, {"tipo": "accion", "cuantas": 9}, {"tipo": "error", "cuantas": 6}, {"tipo": "medicion", "cuantas": 5}, {"tipo": "decision", "cuantas": 2}, {"tipo": "entrega", "cuantas": 2}, {"tipo": "respuesta", "cuantas": 1}], "por_dia": [{"dia": "28/10", "cuantas": 42}]};

  /* EL TABLERO Y MARGEN DE VENTAS. Agregado el 10/11/2026.
     HASTA HOY EL JUGUETE NO TENIA ESTA FUNCION, asi que las dos pantallas que
     la leen -tablero.html e index.html- pintaban su cartel de error y el
     control las daba por buenas: nunca se probaron CON DATOS. El 10/11 las dos
     estuvieron caidas en produccion por un timeout y ninguna puerta lo vio.
     Respuesta traida de la base ese dia, 2026-01-01 a 2026-12-31, las cuatro
     calidades firmes. Si se agrega un campo al resumen, se agrega aca o el
     control no puede ver que la pantalla lo pinta como undefined. */
  var TABLERO = {"desde":"2026-01-01","hasta":"2026-12-31","metodo":"Costo de la ORDEN DE COMPRA que Compras asocia al pedido de venta (numero de pedido en observaciones del renglon de la OC); donde no hay OC, costo por identificacion de lote o PEPS con restriccion de fecha. Nunca una compra posterior a la venta. Costo >= 4x el precio, o menor al 5% del precio, se aparta y no se suma. La factura se liga a su renglon de pedido por gva107: 91,6% de los renglones, con el articulo coincidiendo en 28.909 de 28.909.","actualizado":{"ok":true,"horas":9,"cuando":"10/11/2026 05:53","segundos":32.2},"resumen":{"costo":2816585940,"medidos":4257,"perdida":16341928,"articulos":46,"facturado":4359520935,"margen_pct":35.4,"denominador":"El margen se mide sobre lo que DISSAN compra y stockea. La consignacion (sta11.stock=false, en la vista es_producto=false: el proveedor deja el material y DISSAN no lo compra) no tiene costo de compra y queda afuera.","bajo_costo_n":130,"con_prueba_n":4219,"cuarentena_n":243,"margen_bruto":1542934996,"cobertura_pct":98.1,"cuarentena_caja":228,"cuarentena_cero":14,"facturado_total":4441857795,"consignacion_pct":32.4,"cuarentena_monto":190176,"renglones_totales":4500,"consignacion_monto":2285716252,"cuarentena_absurdo":1,"facturado_universo":7051595064,"margen_sobre_costo":54.8,"perdida_con_prueba":16283965,"renglones_universo":5358,"consignacion_renglones":576,"stock_propio_sin_costo":41389664,"cobertura_sobre_todo_pct":61.8},"calidad":[{"venta":2374948969,"calidad":"A. lote exacto","apartados":211,"pct_venta":53.5,"renglones":2178,"margen_pct":37.9},{"venta":2055443896,"calidad":"A. orden de compra del pedido","apartados":24,"pct_venta":46.3,"renglones":2276,"margen_pct":32.4},{"venta":6477503,"calidad":"A. peps","apartados":6,"pct_venta":0.1,"renglones":22,"margen_pct":57.7},{"venta":4987428,"calidad":"A. ultimo costo reciente","apartados":2,"pct_venta":0.1,"renglones":24,"margen_pct":35.6}],"por_cliente":[{"pct":35.9,"ventas":8,"cliente":"HOSPITAL CENTRAL","perdida":5867399},{"pct":16.3,"ventas":12,"cliente":"HOSPITAL TEODORO SCHESTAKOW","perdida":2658361},{"pct":9.3,"ventas":16,"cliente":"O.S.E.P.","perdida":1525752},{"pct":9.1,"ventas":20,"cliente":"OSDE  Org.de Serv.Dir.Empr.","perdida":1481315}],"por_mes":[{"n":457,"mes":"2026-01","vacio":false,"margen":28.8,"perdida":5276262},{"n":264,"mes":"2026-02","vacio":false,"margen":35.4,"perdida":1241046},{"n":439,"mes":"2026-03","vacio":false,"margen":33.8,"perdida":1417554},{"n":405,"mes":"2026-04","vacio":false,"margen":38.6,"perdida":161611},{"n":360,"mes":"2026-05","vacio":false,"margen":34.1,"perdida":268971},{"n":482,"mes":"2026-06","vacio":false,"margen":35.1,"perdida":1101722},{"n":400,"mes":"2026-07","vacio":false,"margen":34.9,"perdida":1057345},{"n":419,"mes":"2026-08","vacio":false,"margen":35.7,"perdida":1406680},{"n":347,"mes":"2026-09","vacio":false,"margen":33.8,"perdida":1399951},{"n":509,"mes":"2026-10","vacio":false,"margen":37.8,"perdida":1977173},{"n":175,"mes":"2026-11","vacio":false,"margen":32,"perdida":1033613}],"peores":[{"costo":474804,"fecha":"06/01/26","metodo":"orden_compra_pedido","perdio":2001017,"prueba":true,"vendio":363636,"cliente":"HOSPITAL CENTRAL","detalle":"Harmonic ACE 36mm  HAR36","partida":"A98K28","articulo":"JENER0021","cantidad":18,"costo_viejo":0},{"costo":474804,"fecha":"06/01/26","metodo":"orden_compra_pedido","perdio":1445179,"prueba":true,"vendio":363636,"cliente":"HOSPITAL CENTRAL","detalle":"Harmonic ACE 36mm  HAR36","partida":"A98A2M","articulo":"JENER0021","cantidad":13,"costo_viejo":0},{"costo":10896,"fecha":"05/06/26","metodo":"orden_compra_pedido","perdio":939227,"prueba":true,"vendio":3939,"cliente":"O.S.E.P.","detalle":"Sensura 11045 2p/cv Light 70","partida":"10776297","articulo":"COLO0063","cantidad":135,"costo_viejo":8191}],"mejores":[{"gano":70173575,"costo":2598980,"fecha":"07/10/26","margen":47.37,"metodo":"lote_exacto","vendio":4938099,"cliente":"DROGUERIA CENTRAL","detalle":"Picc intracran.1104B","articulo":"ESERVI0001","cantidad":30},{"gano":35590103,"costo":7939,"fecha":"07/10/26","margen":35.91,"metodo":"lote_exacto","vendio":12388,"cliente":"DROGUERIA CENTRAL","detalle":"Nexiva 20GA Dual Port","articulo":"BD00048","cantidad":8000},{"gano":35125358,"costo":7997,"fecha":"07/10/26","margen":35.44,"metodo":"lote_exacto","vendio":12388,"cliente":"DROGUERIA CENTRAL","detalle":"Nexiva 24GA Dual Port","articulo":"BD00046","cantidad":8000}],"cuarentena":[{"costo":2216,"fecha":"07/04/26","veces":1,"metodo":"lote_exacto","motivo":"comprado por caja, falta la equivalencia caja-unidad en Tango","vendio":1570,"cliente":"SANATORIO ARGENTINO S.R.L.","detalle":"CA67 Can. aspirac L2m-D9.5mm","partida":"23/117461","articulo":"GAVA0050","dice_perder":155090},{"costo":2216,"fecha":"13/02/26","veces":1,"metodo":"lote_exacto","motivo":"comprado por caja, falta la equivalencia caja-unidad en Tango","vendio":1727,"cliente":"MUTUAL CLINICA SANTA ROSA","detalle":"CA67 Can. aspirac L2m-D9.5mm","partida":"23/117461","articulo":"GAVA0050","dice_perder":24459},{"costo":650,"fecha":"05/05/26","veces":5,"metodo":"lote_exacto","motivo":"costo 5 veces el precio","vendio":119,"cliente":"FINAMED S.A.","detalle":"Suction Mini (125ml)","partida":"200125","articulo":"PCB002","dice_perder":10627}],"listas":{"zonas":["MENDOZA","SAN JUAN","SAN LUIS"],"clientes":[" FARMACIA QUINTANA SCS","ALEM SALUD S.R.L.( Biomed )","ALVAREZ DIAZ MARIA FLORENCIA","AMPES","AMPLITUD SALUD SOCIEDAD ANONIMA"],"articulos":["3M00016 — Tegaderm 1629 20x30cm","3M00017 — Tegaderm 1624 6x7cm","3M00018 — Tegaderm 1626 10x12cm","3M00019 — Tegaderm 1627 10x25cm","3M00024 — Durapore 1538-1 2,5cm x 9m"],"calidades":["A. lote exacto","A. orden de compra del pedido","A. peps","A. ultimo costo reciente","B. costo de mas de 180 dias","B. lote exacto con capa estimada","C. sin costo"],"provincias":["BUENOS AIRES","CAPITAL FEDERAL","CORDOBA","Mza","SAN JUAN","SAN LUIS","SANTA FE"],"talonarios":["FACTURAS ELECTRONICAS A","FACTURAS ELECTRONICAS A MiPyme","FACTURAS ELECTRONICAS B","MULTIPROPOSITO B ELECTRONICA"],"vendedores":["COLO","DISSAN S.R.L","GUERRA","MENDOZA S/V","TRAUMA"],"localidades":["BARRIO CENTRO NORTE","BARRIO GUEMES","BERAZATEGUI","C.A.B.A.","CAPITAL"]}};

  var RPC = {
    api_margen_tablero_v3: TABLERO,
    api_mis_modulos: MODULOS,
    api_mis_modulos_v2: MODULOS,
    /* v3 agrega `puede_entrar`: el estado del medio, ver sin entrar.
       El juguete devuelve uno de cada clase para que el control vea las
       tres: enlace, 'sin acceso' y 'en desarrollo'. */
    /* v4 agrega `aviso`: el cartel que ve el que NO puede entrar, que sale
       de la fila del modulo y no es el mismo para todos. */
    api_mis_modulos_v4: MODULOS.map(function(m){
      var o = {clave:m.clave, nombre:m.nombre, grupo:m.grupo};
      o.puede_entrar = (m.clave !== 'Bitacora' && m.clave !== 'Cotizador');
      /* los tres textos que de verdad hay en la base: el que esta hecho y
         espera, el que no existe todavia, y el que no le corresponde. */
      o.aviso = o.puede_entrar ? null
        : (m.clave === 'Bitacora'
            ? 'Todavía no tenés acceso a este módulo. Está pronto a activarse.'
            : m.clave === 'Cotizador'
            ? 'En desarrollo: todavía no está hecho.'
            : 'No tenés acceso a este módulo. Tu usuario no lo permite.');
      return o;
    }),
    api_mis_modulos_v3: MODULOS.map(function(m){
      var o = {clave:m.clave, nombre:m.nombre, grupo:m.grupo};
      o.puede_entrar = (m.clave !== 'Bitacora' && m.clave !== 'Cotizador');
      return o;
    }),
    api_mi_perfil: [{nombre:'ANIBAL', email:'super@dissan.com.ar', rol:'pruebas'}],
    api_ventas_fact_resumen: RESUMEN,
    api_ventas_fact_detalle: DETALLE,
    api_ventas_fact_opciones: OPCIONES,
    api_ventas_fact_control: CONTROL,
    api_bitacora: BITACORA,
    api_bitacora_resumen: BITRES,
    api_ventas_fact_informe: INFORME,
    api_ventas_fact_por_mes_v2: PORMES,
    /* Las _json devuelven lo MISMO en una sola fila: el 10/11 la pantalla paso
       a pedirlas asi para no reejecutar la funcion una vez por pagina. El
       juguete las sirve con los mismos datos, porque si no el control veria
       la pantalla vacia y la daria por buena. */
    api_ventas_fact_informe_json: INFORME,
    api_ventas_fact_por_mes_v2_json: PORMES,

    /* LA VENTA NETA.                                            19/11/2026
       Los valores son los MEDIDOS en la base ese dia para 2026: facturas
       2.927 por 7.439.851.057,69, notas de credito 64 por -83.383.873,90,
       notas de debito 3 por 496.233,90, neto 7.356.963.417,69. Las dos rutas
       independientes dieron 0,99 de diferencia.
       Hasta ese dia la pantalla publicaba SOLO las facturas: 82,9 millones de
       mas contra Tango. */
    api_ventas_netas_v1: [{
      comprobantes: 2994, facturas: 2927, facturas_neto: 7439851057.69,
      notas_credito: 64, notas_credito_neto: -83383873.90,
      notas_debito: 3, notas_debito_neto: 496233.90,
      otros: 0, otros_neto: 0,
      neto: 7356963417.69, clientes: 113,
      desde: '2026-01-01', hasta: '2026-12-31',
      lectura: 'Venta neta sin IVA: facturas mas notas de debito MENOS notas de credito.'
    }],

    /* LAS NOTAS DE CREDITO, POR CLIENTE.                        19/11/2026
       Valores MEDIDOS en la base ese dia para 2026 (los cinco clientes que
       mas devolvieron, de 32 con nota de credito). HOSPITAL ITALO PERRUPATO
       y ENTE HOSPITAL RAMON CARRILLO estan a proposito: el segundo devolvio
       el 23,2% de lo que se le facturo, que es el caso que la pantalla tiene
       que marcar. */
    api_ventas_notas_credito_v1: [
      { cod_client:'00000090', cliente:'HOSPITAL CENTRAL', notas:4,
        nc_monto:20764000.00, facturas:260, facturado:1394022727.96,
        pct_sobre_facturado:1.49 },
      { cod_client:'00000731', cliente:'ENTE HOSPITAL RAMON CARRILLO O. P.', notas:5,
        nc_monto:11601960.87, facturas:41, facturado:50063638.48,
        pct_sobre_facturado:23.17 },
      { cod_client:'00000001', cliente:'PARTICULAR', notas:11,
        nc_monto:9598128.07, facturas:318, facturado:124991763.68,
        pct_sobre_facturado:7.68 },
      { cod_client:'00000214', cliente:'HOSPITAL ITALO PERRUPATO', notas:3,
        nc_monto:7692796.69, facturas:52, facturado:172550213.54,
        pct_sobre_facturado:4.46 },
      { cod_client:'00000502', cliente:'LA SEGUNDA ASEG.RIESGO DE TRAB.SA', notas:2,
        nc_monto:5400100.00, facturas:19, facturado:17788465.32,
        pct_sobre_facturado:30.36 }
    ]
  };

  /* Y SU CASO VACIO: el periodo sin una sola nota de credito. La seccion
     tiene que seguir estando y decir «Ninguna» con el motivo. */
  RPC['api_ventas_notas_credito_v1_vacia'] = [];

  /* EL CASO SIN NINGUNA NOTA DE CREDITO, que es el que asusta.  19/11/2026
     Al agregar una respuesta al juguete va tambien su caso vacio: si no, el
     control nunca ve como queda la pantalla cuando una seccion no tiene nada,
     y la vacia es la que se lee como "falta algo" (16/11/2026). */
  RPC['api_ventas_netas_v1_vacia'] = [{
    comprobantes: 120, facturas: 120, facturas_neto: 51000000,
    notas_credito: 0, notas_credito_neto: 0,
    notas_debito: 0, notas_debito_neto: 0,
    otros: 0, otros_neto: 0,
    neto: 51000000, clientes: 9,
    desde: '2026-01-01', hasta: '2026-12-31',
    lectura: 'Venta neta sin IVA: facturas mas notas de debito MENOS notas de credito.'
  }];

  /* ===================================================================
     EL DETALLE DE VENTAS — 20/11/2026
     ===================================================================
     Devuelve un OBJETO, no un arreglo: el juguete ya lo contempla
     (`if (!Array.isArray(d))`).

     Los numeros del resumen son los MEDIDOS en la base ese dia para la
     ventana del Excel que exporta Tango (02/09/2024 a 07/10/2026), y las
     filas son filas REALES, copiadas de ema.mv_ventas_detalle. No se
     inventa ninguna: una cifra escrita a mano en el juguete hace que el
     control de cifras mida mi tipeo.

     LAS CUATRO CLASES QUE TIENEN QUE ESTAR, porque son las que la
     pantalla declara y ninguna otra respuesta del juguete las trae:
       1. una FACTURA comun;
       2. EL MISMO ARTICULO DOS VECES en un comprobante, identico en
          precio y cantidad -B0000800002071 COLO0208, medido: es por lo
          que el Excel muestra 14.652 renglones donde Tango tiene 14.906-;
       3. una NOTA DE CREDITO, que va en NEGATIVO;
       4. una fila con sinonimo, linea, sublinea y vendedor NULOS, que es
          lo que rompe una pantalla que da por hecho que siempre hay. */
  RPC['api_ventas_detalle_v1'] = {
    ok: true, ms: 72, agrupado: false, traidos: 5, limite: 2000,
    resumen: {
      renglones_tango: 14906, claves: 14613, comprobantes: 7503,
      clientes: 164, articulos: 1119,
      cantidad: 2337926, total: 14045541520.62,
      importe_tango: 14045542044.94, control_importe: -524.32,
      notas_credito: 491, nc_importe: -689817979.40,
      desde: '2024-09-02', hasta: '2026-10-07'
    },
    filas: [
      { fecha:'2026-10-07', mes:10, anio:2026, cod_zona:'2', zona:'MENDOZA',
        t_comp:'FAC', clase_operacion:'F', n_comp:'A0000800007837',
        cod_client:'MZ0072', razon_social:'HOSPITALES PRIVADOS DE MENDOZA SA',
        cod_articu:'JBIOS0015', descripcion:'Surgiflo Hemost Matrix MS0010',
        sinonimo:'MS0010', cantidad:1, precio_unitario:433884.2975,
        total:433884.2975, importe_tango:433884.30, control_importe:-0.0025,
        proveedor:'JOHNSON', vendedor:'JHONSON', linea:'BIO', sublinea:'SURGIFLO',
        entidad:'PRIVADO', tipo_cliente:'HOSPITAL', renglones_fusionados:1 },
      { fecha:'2023-11-08', mes:11, anio:2023, cod_zona:'1', zona:'SAN LUIS',
        t_comp:'FAC', clase_operacion:'F', n_comp:'B0000800002071',
        cod_client:'SL0011', razon_social:'DROGUERIA CENTRAL',
        cod_articu:'COLO0208', descripcion:'Confeel 33115 Hidroc 15x15',
        sinonimo:'33115', cantidad:350, precio_unitario:1211.5867769,
        total:424055.371915, importe_tango:424055.37, control_importe:0.001915,
        proveedor:'COLOPLAST', vendedor:'COLOPLAST1', linea:'HERIDAS', sublinea:'CONFEEL',
        entidad:'PUBLICO', tipo_cliente:'OTROS', renglones_fusionados:1 },
      { fecha:'2023-11-08', mes:11, anio:2023, cod_zona:'1', zona:'SAN LUIS',
        t_comp:'FAC', clase_operacion:'F', n_comp:'B0000800002071',
        cod_client:'SL0011', razon_social:'DROGUERIA CENTRAL',
        cod_articu:'COLO0208', descripcion:'Confeel 33115 Hidroc 15x15',
        sinonimo:'33115', cantidad:350, precio_unitario:1211.5867769,
        total:424055.371915, importe_tango:424055.37, control_importe:0.001915,
        proveedor:'COLOPLAST', vendedor:'COLOPLAST1', linea:'HERIDAS', sublinea:'CONFEEL',
        entidad:'PUBLICO', tipo_cliente:'OTROS', renglones_fusionados:1 },
      { fecha:'2026-11-16', mes:11, anio:2026, cod_zona:'2', zona:'MENDOZA',
        t_comp:'DVM', clase_operacion:'NC', n_comp:'B0000800000253',
        cod_client:'MZ0368', razon_social:'HOSPITAL TEODORO SCHESTAKOW',
        cod_articu:'FAVE00260', descripcion:'AYEP ven.enyes. G/R Lic10cmx4m',
        sinonimo:'1LAR410', cantidad:-150, precio_unitario:1357.0247934,
        total:-203553.71901, importe_tango:-203552.48, control_importe:-1.23901,
        proveedor:'POTENZA', vendedor:null, linea:'AYEP', sublinea:null,
        entidad:'PUBLICO', tipo_cliente:'HOSPITAL', renglones_fusionados:1 },
      { fecha:'2026-10-27', mes:10, anio:2026, cod_zona:'2', zona:'MENDOZA',
        t_comp:'N/D', clase_operacion:'ND', n_comp:'B0000800000005',
        cod_client:'MZ0051', razon_social:'HOSP ENFERMEROS ARGENTINOS GRAL ALVEAR',
        cod_articu:'SLGR002', descripcion:'Mercaderia Gravada San Luis',
        sinonimo:null, cantidad:108, precio_unitario:451.2396694,
        total:48733.8842952, importe_tango:48733.88, control_importe:0.0042952,
        proveedor:'DISSAN', vendedor:null, linea:null, sublinea:null,
        entidad:'PUBLICO', tipo_cliente:'HOSPITAL', renglones_fusionados:1 }
    ]
  };

  /* Y SU CASO VACIO, que es el que asusta: la pantalla tiene que seguir
     mostrando sus secciones y decir «Ninguno» con el motivo, no esfumarse
     (16/11/2026). Sin esto el control nunca mira el caso que importa. */
  RPC['api_ventas_detalle_v1_vacia'] = {
    ok: true, ms: 1, agrupado: false, traidos: 0, limite: 2000,
    resumen: {
      renglones_tango: 0, claves: 0, comprobantes: 0, clientes: 0, articulos: 0,
      cantidad: 0, total: 0, importe_tango: 0, control_importe: 0,
      notas_credito: 0, nc_importe: 0, desde: null, hasta: null
    },
    filas: []
  };

  window.__LLAMADAS = [];

  /* FIXTURES DEL CONTROL — 29/10/2026.
     Para que el control pueda VER el recorte hay que darle algo mas grande
     que el tope. Dos cosas:
       1. `__prueba_tope__`: 2.500 filas minimas, para probar el puente
          `rpcTodo` solo, sin depender de ninguna pantalla.
       2. el detalle de Ventas inflado a 2.500 renglones, para probarlo
          de punta a punta: la grilla tiene que mostrar los 2.500 y el
          Excel tiene que bajarlos.
     Sin esto el juguete tenia 50 filas y jamas podia pasar el tope. */
  /* 5.108 = los renglones REALES de 2026 que devuelve la base. El juguete
     tiene que ser tan grande como la realidad, o el control no prueba nada. */
  var TOPE_PRUEBA = 5108;
  RPC['__prueba_tope__'] = (function(){
    var a = [];
    for (var i = 0; i < TOPE_PRUEBA; i++) a.push({ n: i });
    return a;
  })();
  if (Array.isArray(RPC['api_ventas_fact_informe']) && RPC['api_ventas_fact_informe'].length){
    var base = RPC['api_ventas_fact_informe'], inflado = [];
    for (var k = 0; k < TOPE_PRUEBA; k++){
      var f = {}, o = base[k % base.length];
      for (var c in o) if (Object.prototype.hasOwnProperty.call(o, c)) f[c] = o[c];
      f.renglon = k + 1;
      inflado.push(f);
    }
    RPC['api_ventas_fact_informe'] = inflado;
  }

  /* LOS DOS SUBDIARIOS — EL JUGUETE NO LOS TENIA.            14/11/2026
     Y por eso la puerta 12 paso hoy con 0 fallas SIN HABER MIRADO UNA SOLA
     FILA DE TOTALES: las dos unicas pantallas del panel que tienen <tfoot>
     son estas, el juguete no contestaba su funcion, la pantalla pintaba su
     cartel de error, no aparecia ningun boton de Excel, y la puerta las dio
     por buenas. Es textual el golpe del 10/11 -el Tablero nueve horas caido
     con doce puertas alrededor- y esta escrito en CLAUDE.md: "Si agregas un
     campo al resumen, agregalo tambien al juguete, o el control no puede ver
     que la pantalla lo pinta como undefined".

     DE DONDE SALEN ESTAS FILAS, PARA QUE NADIE LAS CONFUNDA CON DATOS. Los
     NOMBRES de las columnas son los medidos en el catalogo de la base hoy
     (pg_get_function_result de api_subdiario_compras_v3 y _ventas_v4): 23 y
     18 columnas, esos nombres y no otros. Los VALORES los genera este codigo
     -no son de DISSAN y no se transcribieron a mano, que es la falta del
     13/11-. Lo que tienen que cumplir es lo unico que el control mira: que la
     columna sea del tipo que la pantalla espera, que haya plata en todas las
     numericas para que el total no de cero, y que los controles den distinto
     de cero en algunos renglones para que las tarjetas no queden todas en
     verde por falta de datos. La cantidad de renglones es la real de octubre
     2024 medida contra la base: 289 en compras. */
  var SD_COLS_COMPRAS = ['exento','neto_21','neto_27','neto_105','iva_21','iva_27',
    'iva_105','perc_iva_3','perc_ib_mza','perc_ib_sl','imp_debitos','imp_creditos',
    'sircreb','otros_imp'];
  var SD_COLS_VENTAS  = ['exento','neto_21','neto_105','iva_21','iva_105',
    'perc_iibb_sl','perc_iibb_mza'];

  function sdRedondo(n){ return Math.round(n * 100) / 100; }

  RPC['api_subdiario_compras_v3'] = (function(){
    var a = [], i;
    for (i = 0; i < 289; i++){
      var f = { fecha: '2024-10-' + String((i % 28) + 1).padStart(2,'0'),
                proveedor: 'PROVEEDOR DE PRUEBA ' + (i % 37),
                cuit: '30-' + String(10000000 + i * 7919).slice(0,8) + '-' + (i % 10),
                tipo: (i % 23 === 0) ? 'N/C' : 'FAC',
                numero: 'A' + String(1 + (i % 9)).padStart(4,'0')
                      + String(100000 + i * 13).slice(0,10) };
      for (var c = 0; c < SD_COLS_COMPRAS.length; c++) f[SD_COLS_COMPRAS[c]] = 0;
      var neto = sdRedondo(1000 + (i * 7919) % 2800000 + (i % 100) / 100);
      if (i % 11 === 0){ f.neto_105 = neto; f.iva_105 = sdRedondo(neto * 0.105); }
      else if (i % 17 === 0){ f.exento = neto; }
      else { f.neto_21 = neto; f.iva_21 = sdRedondo(neto * 0.21); }
      if (i % 29 === 0) f.perc_ib_mza = sdRedondo(neto * 0.015);
      if (i % 31 === 0) f.perc_iva_3  = sdRedondo(neto * 0.03);
      if (i % 41 === 0) f.sircreb     = sdRedondo(neto * 0.005);
      f.imp_total = sdRedondo(f.exento + f.neto_21 + f.neto_27 + f.neto_105
                            + f.iva_21 + f.iva_27 + f.iva_105
                            + f.perc_iva_3 + f.perc_ib_mza + f.perc_ib_sl
                            + f.imp_debitos + f.imp_creditos + f.sircreb + f.otros_imp);
      if (f.tipo === 'N/C'){
        for (var d = 0; d < SD_COLS_COMPRAS.length; d++)
          f[SD_COLS_COMPRAS[d]] = sdRedondo(-f[SD_COLS_COMPRAS[d]]);
        f.imp_total = sdRedondo(-f.imp_total);
      }
      f.control_iva   = 0;
      f.control_total = (i % 53 === 0) ? 0.01 : 0;      /* alguno que grite */
      f.control_neto  = (i % 7  === 0) ? -0.02 : 0;     /* la deriva explicada */
      a.push(f);
    }
    return a;
  })();

  /* LA v4: EL SUBDIARIO CON LA IMPUTACION ADENTRO.               16/11/2026
     Pedido por DISSAN: la imputacion EN el subdiario y no en un reporte
     aparte. La v4 devuelve lo mismo que la v3 mas `imputacion` y
     `imputacion_de_donde`, asi que el juguete la arma DE la v3 y le agrega
     las dos: si maniana cambia el subdiario, cambian las dos juntas y no se
     separan con el tiempo (30/10).
     LAS TRES PROCEDENCIAS MEDIDAS EN LA BASE, en esta proporcion, para que el
     control vea las tres y no solo la comoda: tipo de gasto · cuenta del
     asiento · sin contabilizar. */
  RPC['api_subdiario_compras_v4'] = (function(){
    var G = ['AGUA','LIMPIEZA','FLETES','PAPELERIA','ENERGIA ELECTRICA'];
    var C = ['Mercadería Gravada','Combustibles y Lubricantes','Estacionamiento',
             'Comidas','Refrigerios al Personal'];
    return RPC['api_subdiario_compras_v3'].map(function(f, i){
      var o = {}, k;
      for (k in f) if (Object.prototype.hasOwnProperty.call(f, k)) o[k] = f[k];
      /* LAS DOS COLUMNAS NO DICEN LO MISMO: `de_donde` es la FUENTE, y si no
         hay imputacion no hay fuente, asi que va «—». La primera version
         repetia «sin contabilizar» en las dos y se veia como ruido apenas
         abri la pantalla. */
      if (i % 13 === 0){ o.imputacion = 'sin contabilizar'; o.imputacion_de_donde = '—'; }
      else if (i % 5 === 0){ o.imputacion = C[i % C.length];
                             o.imputacion_de_donde = 'cuenta del asiento'; }
      else { o.imputacion = G[i % G.length]; o.imputacion_de_donde = 'tipo de gasto'; }
      return o;
    });
  })();
  /* Y SU CASO VACIO, que es la regla desde hoy: al agregar una respuesta al
     juguete va tambien la vacia, o el control nunca ve la pantalla sin datos
     -que es la que asusta-. */
  RPC['api_subdiario_compras_v4_vacia'] = [];

  /* LA v5: EL COMPROBANTE SIN NADA DE IVA VA ENTERO A EXENTO.    16/11/2026
     Se arma DE la v4 -una sola copia, 30/10- y le PLANTA el caso que el
     juguete nunca habia tenido y que por eso ninguna puerta podia ver: un
     comprobante exento mal tipeado en Tango, con los tres netos y los tres
     IVA en cero y toda la plata en EXENTO. Sin esta fila el control pasa sin
     haber mirado nunca el renglon que origino el arreglo -es el golpe del
     10/11 con el Tablero y el del 14/11 con la fila de totales-.
     control_neto y control_total van en CERO en esa fila, que es justamente
     lo que el arreglo tiene que lograr. */
  RPC['api_subdiario_compras_v5'] = (function(){
    return RPC['api_subdiario_compras_v4'].map(function(f, i){
      var o = {}, k;
      for (k in f) if (Object.prototype.hasOwnProperty.call(f, k)) o[k] = f[k];
      if (i % 29 === 0){
        o.exento = sdRedondo(o.neto_21 + o.neto_27 + o.neto_105 + o.exento
                             + o.iva_21 + o.iva_27 + o.iva_105);
        o.neto_21 = 0; o.neto_27 = 0; o.neto_105 = 0;
        o.iva_21  = 0; o.iva_27  = 0; o.iva_105  = 0;
        o.imp_total = sdRedondo(o.exento + o.perc_iva_3 + o.perc_ib_mza + o.perc_ib_sl
                                + o.imp_debitos + o.imp_creditos + o.sircreb + o.otros_imp);
        o.control_iva = 0; o.control_total = 0; o.control_neto = 0;
      }
      return o;
    });
  })();
  RPC['api_subdiario_compras_v5_vacia'] = [];

  /* el detalle por tipo de gasto, misma regla: nombres medidos del catalogo,
     valores generados. 171 = los renglones reales de octubre 2024. */
  RPC['api_subdiario_compras_gastos_v1'] = (function(){
    var G = ['AGUA','LIMPIEZA','FLETES','PAPELERIA','ENERGIA ELECTRICA','TELEFONIA',
             'HONORARIOS PROFESIONALES','MANTENIMIENTO DE RODADOS','SEGUROS','ALQUILERES'];
    var a = [], i;
    for (i = 0; i < 171; i++){
      var sin = sdRedondo(2000 + (i * 5209) % 1900000 + (i % 100) / 100);
      var iva = sdRedondo(sin * 0.21);
      var otr = (i % 6 === 0) ? sdRedondo(sin * 0.02) : 0;
      a.push({ imputacion: G[i % G.length],
               fecha: '2024-10-' + String((i % 28) + 1).padStart(2,'0'),
               tipo: (i % 21 === 0) ? 'N/C' : 'FAC',
               numero: 'A' + String(1 + (i % 7)).padStart(4,'0')
                     + String(300000 + i * 19).slice(0,10),
               n_interno: String(8000 + i),
               cod_pro: String(100 + (i % 83)),
               razon_social: 'PROVEEDOR DE PRUEBA ' + (i % 83),
               sin_imp: sin, iva: iva, otros_imp: otr,
               tot_gral: sdRedondo(sin + iva + otr) });
    }
    return a;
  })();

  RPC['api_subdiario_ventas_v4'] = (function(){
    var a = [], i;
    var JUR = ['MENDOZA','SAN JUAN','SAN LUIS','BUENOS AIRES'];
    for (i = 0; i < 250; i++){
      var f = { fecha: '2024-10-' + String((i % 28) + 1).padStart(2,'0'),
                jurisdiccion: JUR[i % JUR.length],
                mayor_menor: (i % 9 === 0) ? 'Menor' : 'Mayor',
                cliente: 'CLIENTE DE PRUEBA ' + (i % 29),
                cuit: '30-' + String(20000000 + i * 6007).slice(0,8) + '-' + (i % 10),
                tipo: (i % 19 === 0) ? 'DVM' : 'FAC',
                comprobante: String(1 + (i % 5)).padStart(4,'0')
                           + String(200000 + i * 17).slice(0,8) };
      for (var c = 0; c < SD_COLS_VENTAS.length; c++) f[SD_COLS_VENTAS[c]] = 0;
      var neto = sdRedondo(5000 + (i * 6007) % 4200000 + (i % 100) / 100);
      if (i % 13 === 0){ f.neto_105 = neto; f.iva_105 = sdRedondo(neto * 0.105); }
      else { f.neto_21 = neto; f.iva_21 = sdRedondo(neto * 0.21); }
      if (i % 23 === 0) f.perc_iibb_mza = sdRedondo(neto * 0.02);
      if (i % 37 === 0) f.perc_iibb_sl  = sdRedondo(neto * 0.01);
      f.importe = sdRedondo(f.exento + f.neto_21 + f.neto_105 + f.iva_21 + f.iva_105
                          + f.perc_iibb_sl + f.perc_iibb_mza);
      if (f.tipo === 'DVM'){
        for (var d = 0; d < SD_COLS_VENTAS.length; d++)
          f[SD_COLS_VENTAS[d]] = sdRedondo(-f[SD_COLS_VENTAS[d]]);
        f.importe = sdRedondo(-f.importe);
      }
      f.control_iva     = 0;
      f.control_importe = (i % 5 === 0) ? 0.03 : 0;     /* los B redondos */
      f.control_neto    = (i % 6 === 0) ? -0.01 : 0;
      a.push(f);
    }
    return a;
  })();

  /* LA v5 DE VENTAS: EL IMPORTE ES EL TOTAL PROPIO DE TANGO.     16/11/2026
     Se arma DE la v4 -una sola copia, 30/10- y le PLANTA el caso que el
     juguete no tenia: el comprobante B con total REDONDO, donde las partes
     NO vuelven a dar el total porque Tango fija el precio al consumidor
     final y despeja el neto hacia atras. Hasta hoy el juguete componia el
     importe sumando las partes, asi que SIEMPRE cerraba y el control nunca
     veia el unico caso en que no cierra.
     El desvio va de pocos pesos a proposito: tiene que quedar MUY por debajo
     del corte de la puerta (hueco > $1 Y > 1% del renglon). Medido sobre la
     base real, el peor de 2026 es 0,0062% del comprobante. */
  RPC['api_subdiario_ventas_v5'] = (function(){
    return RPC['api_subdiario_ventas_v4'].map(function(f, i){
      var o = {}, k;
      for (k in f) if (Object.prototype.hasOwnProperty.call(f, k)) o[k] = f[k];
      if (i % 5 === 0){
        var desvio = sdRedondo(((i % 7) + 1) * 1.37);
        o.importe = sdRedondo(o.importe - desvio);
        o.control_importe = desvio;
      }
      return o;
    });
  })();
  RPC['api_subdiario_ventas_v5_vacia'] = [];

  /* api_listas_armar_v2 — el armado del archivo para Tango.      15/11/2026
     POR QUE EXISTE. Hasta hoy el juguete NO contestaba ninguna funcion de
     listas.html, asi que el bloque "Los articulos que vienen por bulto" no lo
     pintaba ninguna puerta: es textual el golpe del 10/11 —una pantalla que
     ninguna puerta abre CON DATOS no esta controlada— y el del 14/11 con la
     fila de totales. Si maniana alguien le cambia el nombre a una clave del
     resumen, la pantalla pinta `undefined` y nadie se entera.
     Las CLAVES salen medidas de la funcion viva (su salida leida el 15/11 con
     la sesion del usuario); los VALORES los genera este codigo, y queda
     declarado aca: transcribir no es copiar (13/11).
     Las tres ramas del bloque, a proposito, una por renglon: uno que Tango
     tiene POR BULTO (el precio se corrige), uno SIN precio previo (viaja por
     unidad y se declara sin control) y uno normal por unidad. */
  /* EL CASO VACIO, QUE NINGUNA PUERTA HABIA VISTO NUNCA.        16/11/2026
     POR QUE EXISTE. El juguete contestaba SIEMPRE el caso lleno —por_caja con
     3 filas y avisos con 1— asi que la puerta 17 jamas vio como queda la
     pantalla cuando una seccion esta VACIA. El 16/11 el usuario abrio Listas
     con ICU (42 de 42 entran, 0 por bulto, 0 afuera), las dos secciones se
     esfumaron, y pregunto que le habia sacado. No le habia sacado nada: la
     pantalla callaba. Es textual el golpe del 14/11 con la fila de totales —un
     control que pasa sin haber mirado nunca el caso que importa— y el del
     10/11. Con CONTROL_LISTA=vacia el juguete contesta el caso de ICU. */
  RPC['api_listas_armar_v2_vacia'] = (function(){
    var enc = ['Cód. Artículo','Descripción artículo','Descripción adicional artículo',
               'Sinónimo','Cód. Lista','Desc. Lista','Moneda','Unidad','Precio','Bonif.',
               'Fecha vigencia desde','Fecha vigencia hasta'];
    var VIG = '01/11/2026', HASTA = '31/12/2026', filas = [], i;
    for (i = 0; i < 42; i++){
      filas.push(['ICU' + String(1000 + i), 'Set Primario de juguete ' + i, 'ICU MEDICAL',
                  String(14000 + i), '8', 'ICU MEDICAL', 'PESOS', 'UNI',
                  sdRedondo(900 + (i * 4567) % 60000), 0, VIG, HASTA]);
    }
    return {
      ok: true,
      lista: { id: 9, proveedor: 'ICU MEDICAL', cuit: '30-71168743-9', codigo_lista: '8',
               desc_lista: 'ICU MEDICAL', moneda: 'PESOS', moneda_tango: 'PESOS',
               vigencia: VIG, vigencia_hasta: HASTA, regla: 'precio de lista',
               tipo_regla: 'directo', factor: 1 },
      encabezado: enc,
      filas: filas,
      avisos: [],       /* 0 afuera */
      por_caja: [],     /* 0 por bulto */
      resumen: { leidas: filas.length, entran: filas.length, afuera: 0,
                 por_caja_que_entran: 0, corregidos_por_bulto: 0,
                 por_bulto_sin_control: 0, dif_costo_contra_la_lectura: 0,
                 sin_codigo_de_lista: false, vigencia_ya_vencida: false,
                 dias_vencida: 0, regla_pendiente: false },
      por_que_queda_afuera: {}
    };
  })();

  RPC['api_listas_armar_v2'] = (function(){
    var enc = ['Cód. Artículo','Descripción artículo','Descripción adicional artículo',
               'Sinónimo','Cód. Lista','Desc. Lista','Moneda','Unidad','Precio','Bonif.',
               'Fecha vigencia desde','Fecha vigencia hasta'];
    var FACTOR = 0.72, VIG = '01/07/2026', HASTA = '31/07/2026';
    var filas = [], pc = [], i, precioUnidad, uBulto, art, sin;
    for (i = 0; i < 40; i++){
      art = 'JUG' + String(1000 + i);
      sin = String(10000 + i * 7);
      precioUnidad = sdRedondo((1500 + (i * 6007) % 90000) * FACTOR);
      uBulto = (i % 7 === 0) ? 30 : ((i % 5 === 0) ? 10 : 1);
      var porBulto = (i === 0), sinControl = (i === 5);
      var viaja = porBulto ? sdRedondo(precioUnidad * uBulto) : precioUnidad;
      filas.push([art, 'Articulo de juguete ' + i, null, sin, '4', 'COLOPLAST', 'PESOS',
                  (uBulto > 1 ? 'CAJ' : 'UNI'), viaja, 0, VIG, HASTA]);
      if (porBulto || sinControl || (uBulto > 1 && i === 10)){
        pc.push({ cod_articulo: art, sinonimo: sin, unidad: (uBulto > 1 ? 'CAJ' : 'UNI'),
                  unidades_caja: uBulto, precio_unidad: precioUnidad,
                  precio_caja: sdRedondo(precioUnidad * uBulto),
                  precio_que_viaja: viaja,
                  precio_prev: sinControl ? null : sdRedondo(viaja * 1.078),
                  va_por_bulto: porBulto,
                  veredicto: porBulto
                    ? 'Tango lo tiene POR BULTO: viaja el precio del bulto'
                    : (sinControl
                        ? 'sin precio previo en Tango: viaja por unidad, SIN CONTROLAR'
                        : 'Tango lo tiene por unidad: viaja el precio por unidad') });
      }
    }
    return {
      ok: true,
      lista: { id: 6, proveedor: 'COLOPLAST', cuit: '30-69161838-9', codigo_lista: '4',
               desc_lista: 'COLOPLAST', moneda: 'PESOS', moneda_tango: 'PESOS',
               vigencia: VIG, vigencia_hasta: HASTA,
               regla: 'precio minorista unitario sin IVA menos 28%',
               tipo_regla: 'descuento', factor: FACTOR },
      encabezado: enc,
      filas: filas,
      avisos: [{ cod_proveedor: '99999', descripcion: 'Uno que no esta en Tango',
                 precio_lista: 1234.5, cod_articulo: null, porque: 'sin alta en Tango' }],
      por_caja: pc,
      resumen: { leidas: filas.length + 1, entran: filas.length, afuera: 1,
                 por_caja_que_entran: pc.length,
                 corregidos_por_bulto: pc.filter(function(x){ return x.va_por_bulto; }).length,
                 por_bulto_sin_control: pc.filter(function(x){ return x.precio_prev === null; }).length,
                 dif_costo_contra_la_lectura: 0,
                 /* en true a proposito: es la unica forma de que alguna puerta
                    pinte el aviso de "este archivo no se puede subir todavia".
                    Medido sobre LECTUS, que esta en dolares y no tiene lista en
                    Tango: 23 leidos, 18 entran, Cod. Lista en null. 15/11/2026 */
                 sin_codigo_de_lista: true,
                 /* vencida a proposito, por lo mismo: medido el 15/11, las 14
                    listas configuradas salian con la ventana ya cerrada —de 74
                    a 960 dias atras— porque la fecha vivia en una
                    configuracion que nadie movia. Un precio cargado fuera de
                    su ventana entra y no rige. */
                 vigencia_ya_vencida: true, dias_vencida: 108,
                 regla_pendiente: false },
      por_que_queda_afuera: { 'sin alta en Tango': 1 }
    };
  })();

  /* LAS CLAVES, MEDIDAS Y NO ESCRITAS A MANO.                    16/11/2026
     Para que un control pueda decir "probe estas N respuestas" sin que yo
     tipee la lista -la falta del 14/10 con las calidades, la del 14/11 con
     las tres listas de clases-. */
  window.__RPC_CLAVES = Object.keys(RPC);

  /* ================= EL CASO VACIO =================            16/11/2026
     HOY el usuario abrio Listas con ICU y las dos secciones de abajo NO
     ESTABAN. El armado traia `por_caja` y `avisos` vacios y la pantalla, en
     vez de decir "Ninguno", no pintaba nada: una seccion que desaparece se
     lee como "falta algo", y una pantalla que calla no se distingue de una
     rota.

     NINGUN CONTROL PUDO VERLO NUNCA, y esa es la parte grave: este archivo
     contestaba SIEMPRE el caso lleno, porque las respuestas las escribi yo
     y escribi la que me imaginaba. Es textual el golpe del 10/11 con el
     Tablero -nueve horas caido con doce controles alrededor- y el del 14/11
     con la fila de totales. Un control que nunca vio el caso que importa no
     esta midiendo: esta acompaniando.

     Con `window.__CONTROL_VACIO` puesto ANTES de que cargue la pantalla, se
     sirven las MISMAS respuestas con todas sus listas ANIDADAS vacias.

     POR QUE SOLO LAS ANIDADAS, y esto se penso y no salio solo: la respuesta
     de modulos ES un arreglo de primer nivel, y vaciarla apaga el menu
     entero. Eso no es el caso que se busca -no puede pasar: sin modulos no
     se entra a la pantalla- y haria gritar a las 17 pantallas a la vez. Una
     puerta que grita siempre se apaga.
     Asi no queda NINGUNA lista de nombres escrita por mi: lo que se vacia
     sale de la FORMA de la respuesta, no de mi criterio. */
  if (window.__CONTROL_VACIO){
    var vaciarAnidadas = function(v){
      if (Array.isArray(v)) return v.map(function(x){ return vaciarAnidadas(x); });
      if (v && typeof v === 'object'){
        var o = {};
        for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)){
          o[k] = Array.isArray(v[k]) ? [] : vaciarAnidadas(v[k]);
        }
        return o;
      }
      return v;
    };
    for (var cl in RPC) if (Object.prototype.hasOwnProperty.call(RPC, cl)){
      RPC[cl] = vaciarAnidadas(RPC[cl]);
    }

    /* Y EL CASO VACIO ESCRITO A MANO LE GANA AL AUTOMATICO.      19/11/2026
       Vaciar las listas ANIDADAS no alcanza para una respuesta que es UNA
       fila de numeros: api_ventas_netas_v1 devuelve
       {facturas, notas_credito, neto, ...} sin ninguna lista adentro, asi que
       "sin datos" quedaba IDENTICO a "con datos" y el control de la pantalla
       vacia la daba por buena sin haber visto nada. Es el golpe del 16/11 con
       Listas, en otra forma.
       La regla es una convencion, no una lista mia: si existe `X_vacia`, esa
       manda. Asi los casos vacios que ya estaban escritos -los subdiarios,
       listas- por fin se ejercitan. */
    var vaciasEscritas = 0;
    for (var cv in RPC) if (Object.prototype.hasOwnProperty.call(RPC, cv)){
      if (/_vacia$/.test(cv)) continue;
      if (Object.prototype.hasOwnProperty.call(RPC, cv + '_vacia')){
        RPC[cv] = RPC[cv + '_vacia'];
        vaciasEscritas++;
      }
    }
    window.__RPC_VACIAS_ESCRITAS = vaciasEscritas;
    window.__RPC_VACIADAS = Object.keys(RPC).length;
  }

  window.supabase = {
    createClient: function(){
      return {
        auth: {
          getSession: function(){
            return Promise.resolve({ data:{ session:{ access_token:'token-de-juguete' } } });
          },
          getUser: function(){
            return Promise.resolve({ data:{ user:{ email:'super@dissan.com.ar' } } });
          },
          signInWithPassword: function(){ return Promise.resolve({ error:null }); },
          signOut: function(){ return Promise.resolve({}); },
          onAuthStateChange: function(){ return { data:{ subscription:{ unsubscribe:function(){} } } }; }
        },
        /* EL JUGUETE AHORA CORTA EN 1.000, COMO EL SERVIDOR DE VERDAD.
           29/10/2026. El "Max rows" de la API de Supabase viene en 1.000 y
           recorta cualquier consulta que devuelva filas, sin error y sin
           aviso. El juguete no lo hacia, asi que el control nunca podia ver
           el defecto que encontro DISSAN: pidio 2026 entero en Ventas y en
           pantalla faltaba ENERO, porque de 5.108 renglones llegaban 1.000.
           Un juguete mas amable que la realidad no sirve de control. */
        rpc: function(fn, args){
          window.__LLAMADAS.push({ fn:fn, args:args });
          if (!(fn in RPC)){
            return Promise.resolve({ data:null, error:{ message:'funcion de juguete sin respuesta: ' + fn } });
          }
          var d = RPC[fn];
          var pedir = function(desde, hasta){
            if (!Array.isArray(d)) return Promise.resolve({ data:d, error:null });
            var a = desde || 0;
            var b = (hasta === undefined || hasta === null) ? d.length - 1 : hasta;
            if (b - a + 1 > TOPE_SERVIDOR) b = a + TOPE_SERVIDOR - 1;   /* el corte, igual que el real */
            return Promise.resolve({ data: d.slice(a, b + 1), error:null });
          };
          var p = pedir(0, TOPE_SERVIDOR - 1);
          p.range = function(a, b){ return pedir(a, b); };
          p.then = function(ok, mal){
            return pedir(0, TOPE_SERVIDOR - 1).then(ok, mal);
          };
          return p;
        }
      };
    }
  };
})();
