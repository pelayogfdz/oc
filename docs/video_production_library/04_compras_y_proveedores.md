# CATEGORÍA 04 — COMPRAS Y PROVEEDORES

## Playlist YouTube: `04 — Compras y Proveedores`

---

### VIDEO 4.1: Cómo Registrar un Proveedor y Crear una Orden de Compra

* **Nivel de Dificultad**: Intermedio
* **Duración Estimada**: 06:15
* **Título YouTube**: `CAANMA | Cómo registrar proveedores y generar órdenes de compra`
* **Playlist**: 04 — Compras y Proveedores

#### A. Objetivo
Aprender a dar de alta un proveedor en el directorio, establecer plazo/días de crédito y generar un pedido/orden de compra con sugerido automático.

#### B. Prerrequisitos
Permiso `purchases_suppliers` y `purchases_orders`.

#### C. Descripción y Capítulos para YouTube
```markdown
Gestiona a tus proveedores y automatiza tus pedidos de resurtido con el módulo de compras de CAANMA ERP.

CAPÍTULOS:
00:00 Introducción a Compras y Proveedores
00:40 Alta de Proveedor en el Directorio
02:00 Configuración de Días y Límite de Crédito
03:15 Creación de Pedido / Orden de Compra Sugerida
04:45 Envío de Orden en PDF al Proveedor
05:50 Resumen y Siguientes Pasos
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:40** | Cortinilla CAANMA. Transición a `/proveedores`. | *"En este tutorial aprenderemos a registrar un nuevo proveedor y generar pedidos de resurtido en CAANMA ERP."* |
| **00:40 - 02:00** | Clic en "Nuevo Proveedor". Llenado: Nombre `Distribuidora Central S.A.`, RFC `DCE900101XYZ`, Teléfono `555-123-4567`. | *"Accedemos al Directorio de Proveedores y hacemos clic en Nuevo Proveedor. Capturamos la razón social, datos de contacto y RFC."* |
| **02:00 - 03:15** | Captura de Crédito `$100,000.00`, Días de Crédito `30 días`. | *"En las condiciones comerciales indicamos los días de crédito otorgados y el límite autorizado para el control de cuentas por pagar."* |
| **03:15 - 04:45** | Navegación a `/productos/pedidos/nuevo`. Selección del proveedor. Clic en "Cargar Sugerido de Stock Mínimo". | *"Nos dirigimos a Compras > Nuevo Pedido. Seleccionamos al proveedor y damos clic en Cargar Sugerido. CAANMA analizará los mínimos de inventario y agregará automáticamente los productos faltantes."* |
| **04:45 - 05:50** | Clic en "Guardar Pedido". Muestra la vista previa en PDF con el formato corporativo. | *"Guardamos la orden de compra. Desde aquí podemos descargar el documento en PDF o enviarlo por correo directamente al proveedor."* |
| **05:50 - 06:15** | Cierre con pantalla de confirmación. | *"Hemos registrado al proveedor y creado una orden de compra en CAANMA ERP."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:40,000
En este tutorial aprenderemos a registrar un proveedor y generar pedidos en CAANMA.
```

#### F. Indicaciones para Miniatura
* **Texto**: **REGISTRO DE COMPRAS Y PROVEEDORES**
* **Grafismo**: Orden de compra en portapapeles + Proveedor de carga.

---

### VIDEO 4.2: Cómo Registrar una Compra, Recibir Mercancía y Prorratear Fletes

* **Nivel de Dificultad**: Intermedio / Avanzado
* **Duración Estimada**: 07:30
* **Título YouTube**: `CAANMA | Cómo ingresar una compra, actualizar existencias y prorratear fletes`
* **Playlist**: 04 — Compras y Proveedores

#### A. Objetivo
Aprender a recepcionar una compra directa de mercancía, prorratear gastos de envío en los costos unitarios, actualizar el Kardex y generar la cuenta por pagar (CxP).

#### B. Prerrequisitos
Tener al menos un proveedor y productos registrados.

#### C. Descripción y Capítulos para YouTube
```markdown
Tutorial paso a paso para dar de alta una compra recibida, prorratear costos logísticos en tus productos y actualizar el inventario promedio.

CAPÍTULOS:
00:00 Introducción a la Recepción de Compras
00:45 Creación de Nueva Compra en Sistema
01:45 Selección de Proveedor y Folio de Factura
03:00 Captura de Productos, Cantidades y Costos Unitarios
04:30 Prorrateo de Flete / Gastos de Envío
06:00 Verificación del Impacto en Kardex y CxP
07:10 Cierre
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:45** | Cortinilla CAANMA. Transición a `/productos/compras`. | *"En este tutorial aprenderemos a ingresar una compra recibida a tu inventario, calculando el costo promedio e integrando fletes o gastos de envío."* |
| **00:45 - 01:45** | Clic en "Nueva Compra". | *"Ingresamos a Compras y hacemos clic en el botón Nueva Compra."* |
| **01:45 - 03:00** | Selección de Proveedor `Distribuidora Central`, Folio Factura Proveedor `FA-98452`. | *"Seleccionamos al proveedor emisor y capturamos el folio fiscal o número de factura que acompaña a la mercancía."* |
| **03:00 - 04:30** | Se agregan 100 piezas de `ACE-500` a `$35.00` c/u. Total mercancía `$3,500.00`. | *"Agregamos las partidas indicando la cantidad recibida y el costo unitario de compra."* |
| **04:30 - 06:00** | En el campo `Flete / Gastos de Envío` se ingresa `$350.00`. Zoom al recalculo automático de costo unitario incrementado a `$38.50`. | *"Si la compra generó un gasto de flete, capturamos el monto en el apartado de gastos logísticos. CAANMA prorrateará el flete proporcionalmente entre todas las piezas, ajustando el nuevo costo real de inventario."* |
| **06:00 - 07:10** | Clic en "Guardar Compra". Muestra la entrada en Kardex (`/reportes/bitacora-inventario`) y la deuda reflejada en CxP (`/proveedores/cuentas`). | *"Guardamos el documento. Como podemos comprobar, las existencias del producto aumentaron en 100 unidades y la factura quedó registrada en Cuentas por Pagar al proveedor."* |
| **07:10 - 07:30** | Cierre formal. | *"Con esto hemos completado el registro de una compra en CAANMA ERP."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:45,000
En este tutorial aprenderemos a ingresar una compra recibida a tu inventario.
```

#### F. Indicaciones para Miniatura
* **Texto**: **REGISTRA COMPRAS Y FLETES**
* **Grafismo**: Entrada de caja a almacén + Calculadora de prorrateo de costos.
