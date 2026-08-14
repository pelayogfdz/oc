# CATEGORÍA 08 — FACTURACIÓN CFDI 4.0

## Playlist YouTube: `08 — Facturación Fiscal CFDI 4.0`

---

### VIDEO 8.1: Facturación de Venta Directa en CFDI 4.0 y Descarga de XML/PDF

* **Nivel de Dificultad**: Intermedio
* **Duración Estimada**: 05:45
* **Título YouTube**: `CAANMA | Cómo facturar una venta en CFDI 4.0 y timbrar ante el SAT`
* **Playlist**: 08 — Facturación Fiscal CFDI 4.0

#### A. Objetivo
Aprender a generar y timbrar una factura CFDI 4.0 a partir de un ticket de venta en `/facturas/ventas`, verificar validaciones del SAT y descargar archivos XML y PDF.

#### B. Prerrequisitos
Tener CSD configurados y una venta realizada con datos fiscales de cliente válidos.

#### C. Descripción y Capítulos para YouTube
```markdown
Aprende a timbrar facturas electrónicas CFDI 4.0 en segundos directamente desde las ventas realizadas en CAANMA ERP.

CAPÍTULOS:
00:00 Introducción a Facturación CFDI 4.0
00:40 Acceso al Módulo de Facturación de Ventas
01:30 Selección de la Venta a Facturar
02:45 Confirmación de Datos Fiscales y Uso de CFDI
04:00 Timbrado en Tiempo Real ante el SAT
04:50 Descarga e Impresión de PDF y XML
05:30 Cierre
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:40** | Cortinilla CAANMA. Transición a `/facturas/ventas`. | *"En este tutorial aprenderemos a timbrar facturas electrónicas CFDI 4.0 a partir de las ventas registradas en CAANMA ERP."* |
| **00:40 - 01:30** | Muestra de la lista de ventas pendientes de facturar. Filtro por folio o nombre de cliente. | *"Nos dirigimos a Facturas > Facturación CFDI 4.0. Aquí encontraremos el historial de ventas realizadas en las sucursales."* |
| **01:30 - 02:45** | Clic en el botón "Facturar" al lado de la venta seleccionada. | *"Seleccionamos la venta requerida y hacemos clic en el botón Facturar."* |
| **02:45 - 04:00** | Se revisa el RFC `EKU9003173C9`, Régimen `601`, CP `06000` y Uso CFDI `G03`. Clic en "Generar Factura SAT". | *"Verificamos que el RFC, el Régimen Fiscal y el Código Postal del cliente coincidan exactamente con su Constancia de Situación Fiscal. Seleccionamos el Uso de CFDI."* |
| **04:00 - 04:50** | Animación de carga (1-2 segundos). El sistema regresa el mensaje verde con el Folio Fiscal UUID del SAT. | *"Hacemos clic en Timbrar. CAANMA se conecta con el PAC autorizado y genera el comprobante fiscal timbrado en cuestión de segundos."* |
| **04:50 - 05:30** | Muestra de botones de descarga "Descargar XML" y "Descargar PDF" o "Enviar por Correo". | *"Desde esta misma ventana podemos descargar los archivos XML y PDF oficiales, o enviarlos por correo electrónico al cliente."* |
| **05:30 - 05:45** | Cierre formal. | *"Con esto hemos timbrado exitosamente una factura CFDI 4.0 en CAANMA ERP."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:40,000
En este tutorial aprenderemos a timbrar facturas electrónicas CFDI 4.0.
```

#### F. Indicaciones para Miniatura
* **Texto**: **FACTURACIÓN CFDI 4.0 Y TIMBRADO SAT**
* **Grafismo**: Documento con timbre fiscal SAT + Código QR + XML/PDF.

---

### VIDEO 8.2: Factura Global del Público en General y Complementos de Pago (REP)

* **Nivel de Dificultad**: Avanzado
* **Duración Estimada**: 07:15
* **Título YouTube**: `CAANMA | Cómo generar la Factura Global y Complementos de Pago (REP)`
* **Playlist**: 08 — Facturación Fiscal CFDI 4.0

#### A. Objetivo
Aprender a agrupar tickets no facturados de un periodo (diario, semanal, mensual) para emitir la Factura Global del Público en General (`/facturas/globales`) y emitir Recibos Electrónicos de Pago (`/facturas/complementos`).

#### B. Prerrequisitos
Tener tickets de venta sin facturar y ventas a crédito cobradas en parcialidades.

#### C. Descripción y Capítulos para YouTube
```markdown
Domina los procesos fiscales complejos: emisión de Factura Global del Público en General y timbrado de Complementos de Pago (REP) en CAANMA ERP.

CAPÍTULOS:
00:00 Introducción a Factura Global y REPs
00:45 Módulo de Factura Global
02:00 Selección de Rango de Fechas y Sucursal
03:30 Emisión y Timbrado de la Factura Global
04:45 Módulo de Complementos de Pago (REP)
06:00 Timbrado de REP para Ventas a Crédito
07:00 Cierre
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:45** | Cortinilla CAANMA. Transición a `/facturas/globales`. | *"En este tutorial aprenderemos a generar la Factura Global de ventas al público en general y emitir Complementos de Pago en CAANMA ERP."* |
| **00:45 - 02:00** | Muestra de los filtros: Fecha Inicio, Fecha Fin, Sucursal. Clic en "Consultar Ventas". | *"Ingresamos a Facturas > Factura Global. Seleccionamos el rango de fechas a consolidar (por ejemplo, el corte del día o la semana)."* |
| **02:00 - 03:30** | Se listan todos los tickets del público en general no facturados. Muestra del total acumulado de ventas e impuestos. | *"CAANMA extraerá automáticamente todas las notas de venta que no fueron facturadas de forma individual, desglosando los montos e IVA correspondiente."* |
| **03:30 - 04:45** | Clic en "Generar Factura Global". Timbrado exitoso con RFC Genérico `XAXX010101000`. | *"Confirmamos la emisión. El sistema timbrará la Factura Global bajo el RFC genérico público en general según las disposiciones del SAT."* |
| **04:45 - 06:00** | Navegación a `/facturas/complementos`. Selección de un pago a crédito recibido. | *"Para ventas a crédito liquidadas en parcialidades, nos dirigimos a Complementos de Pago (REP). Seleccionamos el abono registrado al cliente."* |
| **06:00 - 07:00** | Clic en "Timbrar REP". Muestra la descarga del XML del recibo electrónico de pago. | *"Generamos el complemento de pago con la información de la factura origen y la fecha de transferencia. Damos clic en Timbrar. Has dominado los procesos fiscales avanzados en CAANMA."* |
| **07:00 - 07:15** | Cierre. | *"Con esto concluimos la guía de Factura Global y REPs en CAANMA ERP."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:45,000
En este tutorial aprenderemos a generar la Factura Global y Complementos de Pago.
```

#### F. Indicaciones para Miniatura
* **Texto**: **FACTURA GLOBAL Y COMPLEMENTOS DE PAGO**
* **Grafismo**: Cúmulo de tickets consolidados en una Factura Sat + Sello de pago REP.
