# CATEGORÍA 03 — CATÁLOGO DE PRODUCTOS E INVENTARIOS

## Playlist YouTube: `03 — Productos e Inventarios`

---

### VIDEO 3.1: Cómo Crear un Producto Simple y Configurar Claves SAT

* **Nivel de Dificultad**: Básico / Intermedio
* **Duración Estimada**: 05:45
* **Título YouTube**: `CAANMA | Cómo dar de alta un producto y asignar clave SAT`
* **Playlist**: 03 — Productos e Inventarios

#### A. Objetivo
Aprender a registrar un producto simple en el catálogo, asignar SKU, Código de Barras, Categoría, Marca, Precios, Existencias y Claves del Catálogo SAT (`SatKey` y `SatUnit`).

#### B. Prerrequisitos
Permiso `inv_edit` activo.

#### C. Descripción y Capítulos para YouTube
```markdown
Tutorial completo para crear un producto en CAANMA ERP, definir sus costos y precios, e ingresar las claves del SAT para su facturación.

CAPÍTULOS:
00:00 Introducción a Creación de Productos
00:40 Acceso al Catálogo de Productos
01:15 Captura de Nombre, SKU y Código de Barras
02:30 Configuración de Costo, Precio Público y Mayoreo
03:45 Autocompletado de Clave SAT y Unidad SAT
04:50 Asignación de Stock Inicial y Ubicación
05:25 Resultado en el Inventario
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:40** | Cortinilla CAANMA. Transición a `/productos`. | *"En este tutorial aprenderemos a registrar un producto en el catálogo de CAANMA y configurar sus parámetros comerciales y fiscales."* |
| **00:40 - 01:15** | Clic en el botón verde "Nuevo Producto" (`/productos/nuevo`). | *"Ingresamos al módulo de Productos y hacemos clic en Nuevo Producto."* |
| **01:15 - 02:30** | Llenado de campos: SKU `ACE-500`, Código de Barras `7501234567890`, Nombre `Aceite Multiusos 500ml`. | *"Capturamos el SKU o código interno de control, escaneamos o ingresamos el código de barras y escribimos el nombre descriptivo del artículo."* |
| **02:30 - 03:45** | Captura de Costo `$35.00`, Precio Público `$55.00`, Precio Mayoreo `$48.00`, IVA `16%`. | *"En el apartado de Precios, ingresamos el costo de compra sin IVA, el precio público de venta y opcionalmente un precio de mayoreo. CAANMA calculará la utilidad automáticamente."* |
| **03:45 - 04:50** | Uso de los componentes `SatKeyAutocomplete` y `SatUnitAutocomplete`. Búsqueda de "15121500" y "H87". | *"Para asegurar la validez fiscal en tus facturas, utilizamos el buscador integrado para asignar la Clave SAT del producto y su unidad de medida como Pieza H87."* |
| **04:50 - 05:25** | Captura de Stock Inicial `50`, Mínimo `10`, Ubicación `Pasillo 3 - Anaquel B`. | *"Indicamos la existencia física inicial con la que arranca el producto en este almacén y definimos su ubicación física."* |
| **05:25 - 05:45** | Clic en "Guardar Producto". El producto aparece listado en la tabla principal de `/productos`. | *"Hacemos clic en Guardar. El producto ha sido dado de alta correctamente y está listo para ser vendido en el POS o facturado."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:40,000
En este tutorial aprenderemos a registrar un producto en el catálogo de CAANMA.
```

#### F. Indicaciones para Miniatura
* **Texto**: **CREAR PRODUCTO Y CLAVE SAT**
* **Grafismo**: Caja de producto 3D + Código de Barras + Sello Fiscal SAT.

---

### VIDEO 3.2: Cómo Realizar un Traspaso de Mercancía entre Sucursales

* **Nivel de Dificultad**: Intermedio
* **Duración Estimada**: 06:30
* **Título YouTube**: `CAANMA | Cómo hacer un traspaso de inventario entre sucursales`
* **Playlist**: 03 — Productos e Inventarios

#### A. Objetivo
Aprender el flujo completo de transferencia de stock entre sucursales: solicitud, despacho con captura de evidencia fotográfica, recepción y actualización automática de Kardex.

#### B. Prerrequisitos
Tener al menos 2 sucursales registradas y existencia de productos en la sucursal de origen.

#### C. Descripción y Capítulos para YouTube
```markdown
Controla el movimiento de mercancía entre tus sucursales con el sistema de traspasos respaldado por firma y evidencia fotográfica en CAANMA ERP.

CAPÍTULOS:
00:00 Introducción a Traspasos de Inventario
00:45 Creación de Nueva Solicitud de Traspaso
02:00 Selección de Sucursal Origen y Destino
03:15 Selección de Productos y Cantidades
04:30 Despacho de Mercancía y Carga de Evidencia
05:45 Recepción en Sucursal Destino y Ajuste de Kardex
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:45** | Cortinilla CAANMA. Transición a `/productos/traspasos`. | *"En este tutorial aprenderemos a realizar un traspaso de mercancía entre sucursales en CAANMA ERP."* |
| **00:45 - 02:00** | Clic en "Nuevo Traspaso" (`/productos/traspasos/nuevo`). | *"Accedemos a Productos > Traspasos entre Sucursales y seleccionamos Nuevo Traspaso."* |
| **02:00 - 03:15** | Selección de Origen `Matriz Centro`, Destino `Sucursal Norte`. | *"Indicamos la sucursal que enviará los artículos y la sucursal receptora que incrementará su inventario."* |
| **03:15 - 04:30** | Se agregan 20 unidades del producto `ACE-500`. | *"Buscamos los productos requeridos e indicamos la cantidad exacta a enviar. El sistema valida que exista stock disponible en origen."* |
| **04:30 - 05:45** | Clic en "Despachar". Muestra la opción de adjuntar fotografía de evidencia del paquete. | *"Al despachar la orden, podemos adjuntar una fotografía del paquete embalado o guía de transporte como comprobante visual."* |
| **05:45 - 06:30** | El usuario receptor entra a la orden y da clic en "Confirmar Recepción". Muestra la actualización instantánea del stock en ambas sucursales. | *"La sucursal destino revisa la mercancía física y confirma la recepción. En este instante, CAANMA descuenta el stock de origen y lo acredita en la sucursal de destino."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:45,000
En este tutorial aprenderemos a realizar un traspaso de mercancía entre sucursales.
```

#### F. Indicaciones para Miniatura
* **Texto**: **TRASPASOS ENTRE SUCURSALES**
* **Grafismo**: Camión de transporte conectando dos tiendas/almacenes.
