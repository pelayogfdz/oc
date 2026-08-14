# CATEGORÍA 07 — CLIENTES Y CUENTAS POR COBRAR (CxC)

## Playlist YouTube: `07 — Clientes y Cobranza`

---

### VIDEO 7.1: Registro de Clientes y Gestión de Crédito Comercial

* **Nivel de Dificultad**: Básico / Intermedio
* **Duración Estimada**: 05:45
* **Título YouTube**: `CAANMA | Alta de clientes, datos fiscales y límite de crédito`
* **Playlist**: 07 — Clientes y Cobranza

#### A. Objetivo
Aprender a registrar un cliente en el directorio (`/clientes`), capturar su RFC y datos de facturación, asignar listas de precios y definir límites y días de crédito.

#### B. Prerrequisitos
Permiso `admin_customers_view`.

#### C. Descripción y Capítulos para YouTube
```markdown
Administra el expediente de tus clientes, datos de facturación CFDI 4.0 y condiciones de crédito comercial en CAANMA ERP.

CAPÍTULOS:
00:00 Introducción al Directorio de Clientes
00:40 Alta de Nuevo Cliente
01:45 Datos Fiscales CFDI 4.0 (RFC, Régimen y CP)
03:15 Configuración de Límite y Días de Crédito
04:30 Asignación de Lista de Precios Preferencial
05:15 Resumen y Verificación
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:40** | Cortinilla CAANMA. Transición a `/clientes`. | *"En este tutorial aprenderemos a registrar nuevos clientes en CAANMA ERP, configurando sus datos de facturación y plazos de crédito comercial."* |
| **00:40 - 01:45** | Clic en "Nuevo Cliente" (`/clientes/nuevo`). Llenado de Nombre `Comercializadora del Norte S.A. de C.V.`, Teléfono `555-987-6543`, Correo `compras@delnorte.com`. | *"Ingresamos al directorio de Clientes y hacemos clic en Nuevo Cliente. Registramos su nombre comercial, teléfono y correo electrónico."* |
| **01:45 - 03:15** | Captura de datos fiscales: RFC `CNO980512AB3`, Régimen `601`, Uso CFDI `G03 - Gastos en general`, CP `64000`. | *"En la pestaña de Datos Fiscales, ingresamos el RFC, el Régimen Fiscal y el Código Postal requeridos para la emisión de facturas CFDI 4.0."* |
| **03:15 - 04:30** | En la sección de Crédito, se asigna `Límite de Crédito`: `$50,000.00` y `Días de Crédito`: `15 días`. | *"En el apartado de Crédito, podemos autorizar una línea de financiamiento indicando el límite de crédito en dinero y el plazo en días para el vencimiento de facturas."* |
| **04:30 - 05:15** | Selección de Lista de Precios `Mayoreo B2B`. Clic en "Guardar Cliente". | *"Asimismo, asignamos la lista de precios predeterminada para que el Punto de Venta aplique tarifas especiales de forma automática."* |
| **05:15 - 05:45** | Muestra de la ficha del cliente creada exitosamente. | *"Damos clic en Guardar. El cliente ha sido registrado y sus condiciones comerciales han quedado activas en el sistema."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:40,000
En este tutorial aprenderemos a registrar nuevos clientes en CAANMA ERP.
```

#### F. Indicaciones para Miniatura
* **Texto**: **REGISTRO Y CRÉDITO DE CLIENTES**
* **Grafismo**: Expediente digital de cliente + Línea de crédito aprobada.

---

### VIDEO 7.2: Control de Cuentas por Cobrar (CxC) y Registro de Abonos

* **Nivel de Dificultad**: Intermedio
* **Duración Estimada**: 06:15
* **Título YouTube**: `CAANMA | Cómo gestionar la cobranza y registrar abonos de clientes`
* **Playlist**: 07 — Clientes y Cobranza

#### A. Objetivo
Aprender a monitorear la cartera de crédito vencida y por vencer en Cuentas por Cobrar (`/clientes/cobranza`), registrar pagos/abonos de clientes y emitir recibos de pago.

#### B. Prerrequisitos
Tener clientes con ventas a crédito registradas.

#### C. Descripción y Capítulos para YouTube
```markdown
Mantén el control de tu flujo de efectivo gestionando las Cuentas por Cobrar de tus clientes y aplicando abonos en tiempo real con CAANMA ERP.

CAPÍTULOS:
00:00 Introducción a Cuentas por Cobrar (CxC)
00:45 Panel General de Cobranza y Cartera Vencida
02:00 Búsqueda de Estado de Cuenta por Cliente
03:15 Registrar Nuevo Abono o Pago de Cliente
04:45 Aplicación a Venta / Factura Específica
05:30 Generación del Comprobante de Cobro y Cierre
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:45** | Cortinilla CAANMA. Transición a `/clientes/cobranza`. | *"En este tutorial aprenderemos a utilizar el módulo de Cuentas por Cobrar para controlar la cartera de crédito y abonar pagos de clientes."* |
| **00:45 - 02:00** | Muestra del tablero de CxC. Se resaltan los indicadores de *Por Cobrar Total*, *Vencido* y *Por Vencer*. | *"Al ingresar a Cobranza, visualizamos el balance total de crédito otorgado a tus clientes y el desglose de documentos vencidos."* |
| **02:00 - 03:15** | Filtro por el cliente `Comercializadora del Norte`. Muestra las facturas pendientes de cobro. | *"Buscamos al cliente para desplegar su estado de cuenta detallado, mostrando las notas de venta a crédito y sus fechas de vencimiento."* |
| **03:15 - 04:45** | Clic en el botón "Registrar Abono". Captura de Monto `$10,000.00`, Método `Transferencia Bancaria`. | *"Hacemos clic en Registrar Abono. Capturamos el monto pagado por el cliente y seleccionamos el método de pago utilizado."* |
| **04:45 - 05:30** | Selección del documento al que se aplicará el pago. CAANMA recalcula el saldo adeudado. | *"Asignamos el pago a la nota o factura correspondiente. CAANMA actualizará el saldo insoluto y liberará línea de crédito automáticamente."* |
| **05:30 - 06:15** | Clic en "Guardar Abono" e impresión del recibo de cobranza. | *"Confirmamos la operación e imprimimos el comprobante de pago para el cliente. Has gestionado exitosamente la cobranza en CAANMA."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:45,000
En este tutorial aprenderemos a utilizar el módulo de Cuentas por Cobrar.
```

#### F. Indicaciones para Miniatura
* **Texto**: **CONTROL DE COBRANZA Y ABONOS**
* **Grafismo**: Balanza de saldo vencido + Recibo de transferencia con check verde.
