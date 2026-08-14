# CATEGORÍA 05 — VENTAS, POS Y COTIZACIONES

## Playlist YouTube: `05 — Ventas y Cotizaciones`

---

### VIDEO 5.1: Operación del Punto de Venta (POS), Escaneo y Cobro Mixto

* **Nivel de Dificultad**: Básico
* **Duración Estimada**: 06:45
* **Título YouTube**: `CAANMA | Cómo hacer una venta en el Punto de Venta (POS)`
* **Playlist**: 05 — Ventas y Cotizaciones

#### A. Objetivo
Dominar la terminal de cobro POS (`POSClient.tsx`), escaneo de código de barras, selección de variante, aplicación de precios especiales, cobro mixto (Efectivo + Tarjeta) e impresión de ticket.

#### B. Prerrequisitos
Tener una caja abierta (`CashSession`) y productos disponibles en la sucursal.

#### C. Descripción y Capítulos para YouTube
```markdown
Aprende a realizar ventas ágiles en el Punto de Venta de CAANMA ERP con cobro en efectivo, tarjeta o mixto e impresión automática de comprobante.

CAPÍTULOS:
00:00 Introducción a la Terminal POS
00:40 Acceso a Nueva Venta (Atajo de Botón Verde)
01:30 Escaneo y Búsqueda de Productos
02:45 Asignación de Cliente y Lista de Precios
04:00 Cobro Mixto: Efectivo y Tarjeta
05:30 Emisión e Impresión de Ticket
06:20 Cierre del Tutorial
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:40** | Cortinilla CAANMA. Transición al botón principal `+ Nueva Venta` (`/ventas/nueva`). | *"En este tutorial aprenderemos a utilizar la Terminal de Punto de Venta de CAANMA ERP para realizar cobros rápidos e imprevistos."* |
| **00:40 - 01:30** | Vista de la interfaz POS. Se resalta el buscador superior y el grid de productos. | *"Al ingresar a Nueva Venta, encontramos la pantalla optimizada para cobro continuo. Podemos escanear un código de barras o teclear en la barra de búsqueda."* |
| **01:30 - 02:45** | Se escanea el producto `ACE-500` (aparecen 2 piezas en la lista). Se busca manualmente "Jabon". | *"Escaneamos el producto o lo seleccionamos manualmente del buscador. El carrito actualizará los totales y calculará los impuestos en tiempo real."* |
| **02:45 - 04:00** | Clic en "Asignar Cliente". Se selecciona a `Comercializadora del Centro`. El precio se ajusta a Mayoreo. | *"Si el cliente está registrado en tu catálogo, al seleccionarlo CAANMA aplicará automáticamente la lista de precios o descuentos que le corresponden."* |
| **04:00 - 05:30** | Clic en el botón "Cobrar". Se selecciona `Pago Mixto`: Efectivo `$100.00` y Tarjeta `$50.00`. Muestra el cálculo de cambio. | *"Hacemos clic en el botón Cobrar. Seleccionamos Pago Mixto, ingresamos la cantidad recibida en efectivo y la diferencia a liquidar con tarjeta bancaria."* |
| **05:30 - 06:20** | Clic en "Finalizar Venta". Muestra el ticket generado y el envío automático por WhatsApp. | *"Finalizamos la venta. CAANMA descuenta los artículos del stock, actualiza el arqueo de caja e imprime o envía el ticket de venta por WhatsApp al cliente."* |
| **06:20 - 06:45** | Cierre formal. | *"Con esto hemos realizado exitosamente una venta en la terminal POS de CAANMA."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:40,000
En este tutorial aprenderemos a utilizar la Terminal de Punto de Venta de CAANMA ERP.
```

#### F. Indicaciones para Miniatura
* **Texto**: **VENTA RÁPIDA EN PUNTO DE VENTA (POS)**
* **Grafismo**: Pantalla de cobro POS + Escáner de código de barras + Ticket saliendo de impresora.

---

### VIDEO 5.2: Creación de Cotizaciones y Conversión Directa a Venta

* **Nivel de Dificultad**: Intermedio
* **Duración Estimada**: 05:30
* **Título YouTube**: `CAANMA | Cómo crear cotizaciones en PDF y convertirlas en ventas`
* **Playlist**: 05 — Ventas y Cotizaciones

#### A. Objetivo
Aprender a elaborar cotizaciones para clientes, agregar observaciones o imágenes de muestra, exportar el documento en PDF y convertir la cotización a Venta/Factura con un solo clic.

#### B. Prerrequisitos
Permiso `admin_quotes_access`.

#### C. Descripción y Capítulos para YouTube
```markdown
Crea propuestas comerciales profesionales en PDF con CAANMA ERP y conviértelas en ventas completas cuando el cliente autorice.

CAPÍTULOS:
00:00 Introducción al Módulo de Cotizaciones
00:45 Creación de una Nueva Cotización
02:00 Selección de Cliente y Productos
03:15 Agregar Observaciones y Descarga de PDF
04:30 Conversión Directa de Cotización a Venta
05:15 Cierre
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:45** | Cortinilla CAANMA. Transición a `/ventas/cotizaciones`. | *"En este tutorial aprenderemos a elaborar cotizaciones formales para tus clientes y convertirlas en ventas en un solo paso."* |
| **00:45 - 02:00** | Clic en "Nueva Cotización". | *"Ingresamos a Ventas > Cotizaciones y hacemos clic en Nueva Cotización."* |
| **02:00 - 03:15** | Selección del cliente `Constructora del Norte` y agregados de 10 piezas de producto. | *"Seleccionamos al cliente destinatario y agregamos las partidas correspondientes con sus precios e impuestos."* |
| **03:15 - 04:30** | Captura de notas en el campo `Observaciones`: *"Precios sujetos a cambio sin previo aviso. Vigencia 15 días."* Clic en "Imprimir / PDF". | *"En el área de observaciones podemos agregar condiciones comerciales o notas técnicas. Al guardar, descargamos la propuesta en PDF con la imagen corporativa de tu empresa."* |
| **04:30 - 05:15** | En el listado de cotizaciones pendientes, clic en la acción "Convertir a Venta". Transición instantánea a la pantalla de cobro con todos los artículos pre-cargados. | *"Cuando el cliente autoriza la propuesta, simplemente damos clic en Convertir a Venta. CAANMA transferirá todos los productos y montos a la terminal de cobro sin necesidad de capturar nuevamente."* |
| **05:15 - 05:30** | Cierre. | *"Has aprendido a emitir y procesar cotizaciones en CAANMA ERP."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:45,000
En este tutorial aprenderemos a elaborar cotizaciones formales para tus clientes.
```

#### F. Indicaciones para Miniatura
* **Texto**: **COTIZACIONES Y CONVERSIÓN A VENTA**
* **Grafismo**: Documento PDF con sello "Aprobado" transformándose en Ticket de venta.
