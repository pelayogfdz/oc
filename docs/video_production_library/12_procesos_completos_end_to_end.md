# CATEGORÍA 12 — VIDEOS DE PROCESOS COMPLETOS (FLUJOS INTEGRALES END-TO-END)

## Playlist YouTube: `12 — Procesos Completos End-to-End`

---

### VIDEO 12.1: Proceso Completo de Compra (Proveedor → Recepción → Kardex → CxP → Pago)

* **Nivel de Dificultad**: Proceso Completo (Masterclass)
* **Duración Estimada**: 13:45
* **Título YouTube**: `CAANMA | Flujo Completo de Compras: De la orden al pago a proveedor`
* **Playlist**: 12 — Procesos Completos End-to-End

#### A. Objetivo
Demostrar en un solo flujo continuo cómo se interconectan todos los módulos de aprovisionamiento: Alta de Proveedor, Pedido con Sugerido, Recepción de Mercancía con Fletes, Incremento de Kardex, Generación de CxP y Liquidación de Factura.

#### B. Prerrequisitos
Acceso administrativo a Compras, Inventario y Cuentas por Pagar.

#### C. Descripción y Capítulos para YouTube
```markdown
Masterclass del proceso completo de abastecimiento en CAANMA ERP: desde la relación con el proveedor hasta el ajuste contable y pago final.

CAPÍTULOS:
00:00 Introducción al Flujo Completo de Compras
00:50 Paso 1: Alta y Verificación del Proveedor
02:15 Paso 2: Generación del Pedido de Resurtido Sugerido
04:30 Paso 3: Recepción de Mercancía y Prorrateo de Flete
07:15 Paso 4: Verificación del Impacto Automático en Kardex
09:00 Paso 5: Control de Deuda en Cuentas por Pagar (CxP)
11:30 Paso 6: Emisión del Pago al Proveedor y Comprobante
13:15 Conclusión y Resumen Operativo
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:50** | Cortinilla CAANMA. Muestra del diagrama de flujo completo en pantalla. | *"Bienvenido a esta capacitación integral sobre el ciclo completo de compras en CAANMA ERP. En este video conectaremos todos los pasos de abastecimiento, desde el pedido hasta el pago final."* |
| **00:50 - 02:15** | Navegación a `/proveedores`. Verificación del proveedor `Distribuidora Central S.A.`. | *"Comenzamos en el Directorio de Proveedores, confirmando que la empresa cuente con datos de contacto y días de crédito configurados."* |
| **02:15 - 04:30** | Navegación a `/productos/pedidos/nuevo`. Carga del sugerido de productos por debajo del mínimo. | *"En el módulo de Pedidos, seleccionamos al proveedor e impulsamos la sugerencia de stock. CAANMA identifica los productos en punto de reorden y prepara la solicitud de compra."* |
| **04:30 - 07:15** | Navegación a `/productos/compras`. Recepción de la compra `FA-98452`, prorrateo de `$500.00` de flete. | *"Una vez que el camión arriba a tu almacén, ingresamos a Compras para recepcionar la factura. Capturamos los fletes logísticos para que el sistema ajuste el costo promedio real de inventario."* |
| **07:15 - 09:00** | Navegación a `/reportes/bitacora-inventario`. Muestra de las entradas exactas reflejadas en Kardex. | *"Verificamos el Kardex de inventario: las existencias se han incrementado de forma inmediata y el precio de costo ha sido actualizado."* |
| **09:00 - 11:30** | Navegación a `/proveedores/cuentas`. Muestra de la nueva factura pendiente en el balance del proveedor. | *"Paralelamente, la compra generó automáticamente una obligación de pago en Cuentas por Pagar respetando la fecha de vencimiento acordada."* |
| **11:30 - 13:15** | Registro del pago parcial/total a la cuenta del proveedor. Impresión del comprobante de egreso. | *"Finalmente, procedemos a registrar el egreso bancario para liquidar la factura. El saldo insoluto del proveedor se actualiza a cero."* |
| **13:15 - 13:45** | Cierre con esquema final completado. | *"Has completado con éxito la capacitación del ciclo integral de compras en CAANMA ERP."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:50,000
Bienvenido a esta capacitación integral sobre el ciclo completo de compras en CAANMA ERP.
```

#### F. Indicaciones para Miniatura
* **Texto**: **PROCESO COMPLETO DE COMPRAS (MASTERCLASS)**
* **Grafismo**: Diagrama circular conectando Pedido -> Almacén -> Kardex -> Factura -> Pago.

---

### VIDEO 12.2: Proceso Completo de Venta (Cotización → POS → Stock → Cobro → CFDI 4.0)

* **Nivel de Dificultad**: Proceso Completo (Masterclass)
* **Duración Estimada**: 14:15
* **Título YouTube**: `CAANMA | Flujo Completo de Ventas: De la Cotización a la Factura CFDI 4.0`
* **Playlist**: 12 — Procesos Completos End-to-End

#### A. Objetivo
Demostrar la trazabilidad comercial completa: Creación de Cotización en PDF, Conversión a Venta en POS, Descuento Automático de Stock, Cobro Mixto y Timbrado Fiscal CFDI 4.0.

#### B. Prerrequisitos
Tener caja abierta, cliente registrado y folios de facturación activos.

#### C. Descripción y Capítulos para YouTube
```markdown
Aprende a ejecutar la cadena de ventas completa en CAANMA ERP: propón cotizaciones, cobra en terminal y timbra facturas SAT sin duplicar procesos.

CAPÍTULOS:
00:00 Introducción al Flujo Completo de Ventas
00:50 Paso 1: Elaboración de Cotización Comercial
03:00 Paso 2: Conversión Directa a Venta en POS
05:15 Paso 3: Descuento Automático de Inventario
07:00 Paso 4: Procesamiento de Cobro Mixto en Caja
09:30 Paso 5: Timbrado de Factura Fiscal CFDI 4.0
12:15 Paso 6: Verificación en Arqueo de Caja y Cobranza
13:45 Conclusión
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:50** | Cortinilla CAANMA. Diagrama de flujo de venta en pantalla. | *"Bienvenido a la guía maestra del proceso comercial en CAANMA ERP. En este video recorreremos cada etapa del ciclo de venta, desde la cotización inicial hasta la facturación timbrada ante el SAT."* |
| **00:50 - 03:00** | Navegación a `/ventas/cotizaciones`. Creación de cotización para `Comercializadora del Centro`. | *"Iniciamos elaborando una propuesta comercial en el módulo de Cotizaciones, especificando condiciones de entrega y precios especiales."* |
| **03:00 - 05:15** | Clic en "Convertir a Venta". La orden se abre en `/ventas/nueva` (`POSClient.tsx`). | *"Cuando el cliente aprueba la propuesta, hacemos clic en Convertir a Venta. Todos los artículos y precios se transfieren automáticamente al Punto de Venta."* |
| **05:15 - 07:00** | Muestra de la reducción de existencias en el catálogo de productos. | *"En este instante, el sistema aparta y descuenta las existencias físicas del almacén correspondientes a los artículos de la venta."* |
| **07:00 - 09:30** | Procesamiento del cobro en caja: `$500.00` efectivo + `$1,500.00` transferencia. | *"En la pantalla de cobro seleccionamos las formas de pago acordadas y procesamos la transacción en la caja activa."* |
| **09:30 - 12:15** | Clic en "Facturar Venta". Generación y timbrado de la factura CFDI 4.0 en `/facturas/ventas`. | *"Desde el resumen de la transacción hacemos clic en Facturar. CAANMA valida los datos fiscales del cliente y timbra la factura electrónica CFDI 4.0 emitiendo los archivos PDF y XML."* |
| **12:15 - 13:45** | Muestra del reporte de arqueo de caja con el dinero acumulado y la venta registrada en el historial. | *"Revisamos el informe de caja: el efectivo y la transferencia han quedado contabilizados de forma transparente para el cierre de turno."* |
| **13:45 - 14:15** | Cierre formal. | *"Has completado el entrenamiento del flujo comercial completo en CAANMA ERP."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:50,000
Bienvenido a la guía maestra del proceso comercial en CAANMA ERP.
```

#### F. Indicaciones para Miniatura
* **Texto**: **PROCESO COMPLETO DE VENTAS (MASTERCLASS)**
* **Grafismo**: Cotización -> POS -> Ticket -> Timbre SAT CFDI 4.0.
