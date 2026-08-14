# CATEGORÍA 09 — MÓDULOS ESPECIALIZADOS (LOGÍSTICA, PROCESOS, RH)

## Playlist YouTube: `09 — Módulos Especializados`

---

### VIDEO 9.1: Logística de Entregas, Portal de Chofer y Firma Digital

* **Nivel de Dificultad**: Intermedio
* **Duración Estimada**: 06:45
* **Título YouTube**: `CAANMA | Logística de entregas, asignación de rutas y firma del cliente`
* **Playlist**: 09 — Módulos Especializados

#### A. Objetivo
Aprender a gestionar el flujo logístico de repartos (`/logistica`), asignar choferes, monitorear entregas en tiempo real, utilizar la app simplificada para choferes (`/logistica/chofer`) y capturar evidencia fotográfica y firma digital del cliente.

#### B. Prerrequisitos
Permiso `logistica_rutas` y `logistica_chofer`.

#### C. Descripción y Capítulos para YouTube
```markdown
Optimiza tus entregas a domicilio con el control de rutas, monitoreo de choferes y captura de evidencia fotográfica y firma de CAANMA ERP.

CAPÍTULOS:
00:00 Introducción a Logística y Entregas
00:45 Asignación de Pedidos a Choferes y Rutas
02:00 Portal Móvil para Choferes (Mi Ruta)
03:30 Navegación y Mapa de Entrega
04:45 Captura de Evidencia Fotográfica y Firma Digital
05:50 Actualización de Estado a Entregado
06:30 Cierre
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:45** | Cortinilla CAANMA. Transición a `/logistica`. | *"En este tutorial aprenderemos a utilizar el módulo de Logística de CAANMA ERP para administrar rutas de entrega y receptar firmas de conformidad."* |
| **00:45 - 02:00** | Muestra de la tabla de órdenes pendientes de envío. Selección de 3 pedidos y asignación al Chofer `Juan Pérez`. | *"En la central de Logística, seleccionamos las ventas o transferencias pendientes y las asignamos a la ruta de un repartidor específico."* |
| **02:00 - 03:30** | Cambio a vista móvil simulada en `/logistica/chofer`. Muestra la lista de entregas ordenadas por secuencia geográfica. | *"El repartidor ingresa desde su dispositivo móvil a Mi Ruta, donde visualizará sus entregas asignadas, direcciones y datos de contacto."* |
| **03:30 - 04:45** | Clic en una entrega. Se abre la pantalla de confirmación. | *"Al arribar al domicilio del cliente, el chofer selecciona la orden correspondiente."* |
| **04:45 - 05:50** | Se toma fotografía del paquete entregado y se habilita la pantalla táctil para la `Firma del Cliente`. | *"El cliente firma digitalmente en la pantalla del dispositivo y se adjunta una fotografía del paquete como evidencia inalterable."* |
| **05:50 - 06:30** | Clic en "Completar Entrega". En el panel administrativo de `/logistica` el estado cambia a `ENTREGADO` en verde. | *"Al guardar, CAANMA actualiza la orden a estado Entregado en tiempo real en la central administrativa."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:45,000
En este tutorial aprenderemos a utilizar el módulo de Logística de CAANMA ERP.
```

#### F. Indicaciones para Miniatura
* **Texto**: **LOGÍSTICA Y RUTAS DE ENTREGA**
* **Grafismo**: Mapa con ruta GPS + Smartphone con firma digital de recepción.

---

### VIDEO 9.2: Fórmulas de Producción, Insumos y Órdenes de Fabricación

* **Nivel de Dificultad**: Avanzado
* **Duración Estimada**: 07:30
* **Título YouTube**: `CAANMA | Fórmulas de fabricación, consumo de insumos y órdenes de producción`
* **Playlist**: 09 — Módulos Especializados

#### A. Objetivo
Aprender a dar de alta recetas/fórmulas de producción (`/procesos/formulas`), definir materias primas e insumos, lanzar Órdenes de Producción (`/procesos`), descontar insumos y dar de alta el producto terminado en stock.

#### B. Prerrequisitos
Permiso `panaderia_access` o `procesos_formulas`.

#### C. Descripción y Capítulos para YouTube
```markdown
Administra tus procesos de manufactura, ensamble o panadería con el control de recetas, insumos y órdenes de fabricación de CAANMA ERP.

CAPÍTULOS:
00:00 Introducción al Módulo de Procesos y Producción
00:45 Creación de una Receta / Fórmula de Fabricación
02:15 Definición de Insumos y Cantidades Requeridas
03:45 Creación de una Orden de Producción
05:15 Avance de Fases y Consumo Automático de Materia Prima
06:30 Entrada del Producto Terminado al Inventario
07:15 Cierre
```

#### D. Guion de Narración y Secuencia UI paso a paso

| Timestamp | Pantalla / Acción UI (1920x1080) | Narración (Voz en Off) |
| :--- | :--- | :--- |
| **00:00 - 00:45** | Cortinilla CAANMA. Transición a `/procesos/formulas`. | *"En este tutorial aprenderemos a estructurar recetas de fabricación y gestionar órdenes de producción en CAANMA ERP."* |
| **00:45 - 02:15** | Clic en "Nueva Fórmula". Nombre `Pastel de Chocolate 1kg`. Producto final asignado. | *"Ingresamos a Procesos > Fórmulas e Insumos. Creamos una receta definiendo el producto final que se obtendrá al concluir la elaboración."* |
| **02:15 - 03:45** | Agregado de insumos: `Harina 500g`, `Huevo 4 pzas`, `Chocolate 200g`, `Leche 250ml`. | *"Capturamos los insumos o materias primas requeridas con sus cantidades exactas para producir una unidad del producto terminado."* |
| **03:45 - 05:15** | Navegación a `/procesos`. Clic en "Nueva Orden de Producción". Cantidad meta: `50 piezas`. | *"Nos dirigimos a Órdenes de Producción y creamos una nueva orden especificando la cantidad meta a elaborar."* |
| **05:15 - 06:30** | Avance de la orden a estado `EN PROCESO` y posteriormente `FINALIZADO`. | *"Al iniciar la producción, CAANMA descontará automáticamente las materias primas del inventario de insumos."* |
| **06:30 - 07:15** | Muestra de la adición de 50 piezas de `Pastel de Chocolate` al stock disponible en el POS. | *"Al finalizar la orden, las 50 unidades producidas ingresan de inmediato al catálogo de venta de la sucursal. Has dominado el módulo de fabricación en CAANMA."* |

#### E. Subtítulos (.srt)
```srt
1
00:00:00,000 --> 00:00:45,000
En este tutorial aprenderemos a estructurar recetas y gestionar órdenes de producción.
```

#### F. Indicaciones para Miniatura
* **Texto**: **PRODUCCIÓN Y CONTROL DE INSUMOS**
* **Grafismo**: Engranajes de producción + Materias primas transformándose en producto final.
