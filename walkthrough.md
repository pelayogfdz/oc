# Resumen de Cambios Completados

Hemos implementado, corregido y desplegado de forma exitosa todos los cambios solicitados por el usuario.

---

## 1. Solución al Error de Timbrado Facturapi ("folio" is not allowed)
* **Identificación del Problema**: Al intentar emitir una factura al SAT desde el Punto de Venta o el modal de facturación, se generaba el error: `"folio" is not allowed`.
* **Causa**: El payload enviado al API de Facturapi utilizaba la propiedad `folio` para establecer el número de la venta. Sin embargo, Facturapi no acepta la llave `folio` en su esquema de creación de facturas (provocando un error de validación Joi en sus servidores), sino que utiliza la llave **`folio_number`**.
* **Solución**:
  * Modificamos [facturacion.ts](file:///c:/Users/barca2/.gemini/antigravity/playground/drifting-magnetosphere/pulpos_clone/app/actions/facturacion.ts) para mapear correctamente la propiedad `folio_number` en el payload de creación de facturas individuales e invoices globales.
  * Robustecimos la lectura del folio de respuesta de Facturapi para leer `invoice.folio_number || invoice.folio` indistintamente para evitar que se guarde vacío en la base de datos local.
* **Resultado**: Las facturas individuales y globales ahora se timbran correctamente en Facturapi sin arrojar el error de validación.

---

## 2. Solución al Cambio de Clientes para Gonzalo Bocanegra y Otros
* **Identificación del Problema**: En las vistas de **Nueva Cotización** y **Nueva Consignación**, no se estaba consultando el usuario activo ni pasando sus permisos al componente `POSClient`. Por lo tanto, el sistema asumía un rol sin permisos (`{}`), bloqueando a Gonzalo Bocanegra (y a otros usuarios que no fueran administradores directos) de la posibilidad de cambiar de cliente.
* **Solución**:
  * Modificamos [page.tsx (Cotizaciones)](file:///c:/Users/barca2/.gemini/antigravity/playground/drifting-magnetosphere/pulpos_clone/app/(dashboard)/ventas/cotizaciones/nueva/page.tsx) and [page.tsx (Consignaciones)](file:///c:/Users/barca2/.gemini/antigravity/playground/drifting-magnetosphere/pulpos_clone/app/(dashboard)/ventas/consignaciones/nueva/page.tsx) para consultar al usuario activo con `getActiveUser()` y procesar sus permisos basados en su rol custom.
  * Pasamos `userPermissions`, `userRole` e `isSuperAdmin` as props to `POSClient`.
* **Resultado**: Gonzalo Bocanegra y todos los demás cajeros o líderes secundarios ahora pueden cambiar de cliente libremente en Ventas, Cotizaciones y Consignaciones.

---

## 3. Optimización del Proceso de Sincronización del Catálogo Offline
* **Identificación del Problema**: Al intentar actualizar el catálogo offline en el Punto de Venta, el sistema arrojaba el error rojo: `"Error al actualizar catálogos. Se mantiene la versión local anterior."`.
* **Causa**: La acción de servidor `syncBasicCatalogs` and `syncProductsPage` consultaba y devolvía el catálogo de productos de **todas las sucursales** e inquilinos en lote, lo que obligaba a descargar un catálogo masivo de más de **144,800 productos** y **15,400 clientes** de forma secuencial. Esto causaba agotamiento de memoria, payload excesivo y excedía el límite de ejecución (timeout de 10s) en Netlify.
* **Solución**:
  * Modificamos [sync.ts](file:///c:/Users/barca2/.gemini/antigravity/playground/drifting-magnetosphere/pulpos_clone/app/actions/sync.ts) para que la sincronización sea **exclusiva de la sucursal activa** (`branchId`), consultando únicamente los productos de la sucursal actual (ej. 6,655 productos en *El Marques* en lugar de 144k de todo el sistema) y filtrando los clientes a los globales y de la sucursal actual.
* **Resultado**: La carga de sincronización se redujo **22 veces**, previniendo de raíz cualquier timeout en el servidor o caída en el navegador, haciendo que la sincronización offline se complete en solo unos segundos.

---

## 4. Visualización de SKU y Código de Barras
* **Carrito de Ventas/Cotizaciones**: Modificado `POSClient.tsx` para mostrar el SKU y el código de barras/EAN debajo del nombre de cada artículo en el ticket.
* **Buscador del Punto de Venta (Dropdown)**: Agregado el código de barras junto al SKU en la lista de resultados de búsqueda del POS (ej. `SKU: 7501697000067 | Código: 7501697000067`).
* **Nota de Venta Impresa (PDF)**: Modificada para forzar la visualización de SKU y código de barras debajo del nombre en `imprimir/page.tsx`.
* **Ticket de Venta Impreso (PDF)**: Modificada para mostrar SKU y EAN en una línea compacta inferior en `imprimir-ticket/page.tsx`.

---

## 5. Diseño Premium y Corrección de Overflow en Impresión de Traspasos y Compras
* **Identificación del Problema**: Las vistas de impresión/exportación a PDF de **Remisión de Traspaso** y **Orden de Compra** no tenían aplicados los estilos premium de CAANMA, y presentaban problemas de maquetación y corte por altura de página.
* **Solución**:
  * Modificamos [app/productos/traspasos/[id]/imprimir/page.tsx](file:///c:/Users/barca2/.gemini/antigravity/playground/drifting-magnetosphere/pulpos_clone/app/productos/traspasos/[id]/imprimir/page.tsx) para aplicar el sistema de diseño premium, incluyendo la estructura de `.title-box` en el encabezado, tarjetas de información estilizadas con detalles completos de sucursal de origen/destino, y protección de impresión de página `@media print`.
  * Modificamos [app/productos/compras/[id]/imprimir/page.tsx](file:///c:/Users/barca2/.gemini/antigravity/playground/drifting-magnetosphere/pulpos_clone/app/productos/compras/[id]/imprimir/page.tsx) de forma similar, incorporando el `.title-box` para Orden de Compra y organizando los datos del proveedor y de la operación en tarjetas compactas y limpias.
  * Forzamos el renderizado dinámico (`export const dynamic = 'force-dynamic'`) en ambas páginas para garantizar que muestren siempre la información más reciente de la base de datos.
* **Resultado**: Las remisiones de traspasos y las órdenes de compras se imprimen o exportan a PDF con un diseño profesional y premium, y con el formato de página perfectamente ajustado sin cortes ni desbordamientos.

---

## 6. Solución al Problema de Factura a "Público en General" y Corrección para Agustín Paulin Mendoza (Folio SAT SAN-1040)
* **Identificación del Problema**: El cliente "AGUSTIN PAULIN MENDOZA" (ID `65584c35-8a92-42f5-bc60-8c7860d9835a`) no tenía su RFC (`taxId`) ni Código Postal (`zipCode`) configurados en su perfil de base de datos de producción (`neondb_officecity`). Como el Punto de Venta no validaba la ausencia de estos datos al emitir factura, la venta se guardó con datos de facturación vacíos y el backend de timbrado cayó en la cláusula de fallback a "PÚBLICO EN GENERAL" (RFC genérico `XAXX010101000` y CP `01000`) en Facturapi.
* **Acciones Correctivas Ejecutadas**:
  1. **Cancelación**: Se canceló exitosamente la factura incorrecta `6a46905f046cbe81f82e4ef8` en Facturapi con el motivo de cancelación SAT `"02" (Comprobante emitido con errores sin relación)`.
  2. **Actualización de Perfil**: Se actualizaron en base de datos de producción los campos fiscales de Agustín Paulin Mendoza con los datos reales (`taxId: PAMA6308285V5`, `zipCode: 76000`).
  3. **Re-timbrado Exitoso**: Se emitió una nueva factura (`ID: 6a4cf8a48ef2d4e7655074ec`) vinculando el RFC y Razón Social correctos de Agustín Paulin Mendoza, quedando vinculada al folio `SAN-1040`.
* **Prevención a Futuro (POS y Servidor)**:
  * **Punto de Venta (`POSClient.tsx`)**: Se implementó una validación en el modal de checkout para impedir que el usuario confirme un pago con la opción "Emitir Factura" seleccionada si el RFC (12-13 caracteres), Razón Social o el Código Postal (5 dígitos) están vacíos o tienen un formato incorrecto. También se muestra un aviso de advertencia en color rojo informando el motivo del bloqueo.
  * **Servidor (`facturacion.ts`)**: Se robusteció la función `stampInvoice` para arrojar un error explícito si se intenta facturar a un cliente que carece de RFC (`taxId`), evitando fallbacks silenciosos a Público en General.

---

## 7. Corrección en Listas de Precios para Cotizaciones y Consignaciones
* **Identificación del Problema**: En las pantallas de **Nueva Cotización** y **Nueva Consignación**, el selector de "Listas de Precios" solo mostraba "Normal (Público General)" y omitía las demás listas configuradas (como Mayoreo, Especial o listas personalizadas dinámicas).
* **Causa**: Al instanciar el componente `<POSClient>` en las vistas de cotización (`ventas/cotizaciones/nueva/page.tsx`) y consignación (`ventas/consignaciones/nueva/page.tsx`), no se realizaba la consulta a la base de datos de las listas de precios activas (`prisma.priceList`) ni se parseaba la configuración general de ventas (`ventasConfig`). Por lo tanto, no se pasaban los props correspondientes al componente de Punto de Venta. Adicionalmente, el query de obtención de productos no incluía las relaciones `prices` y `variants`, necesarias para resolver dinámicamente los precios según la lista activa.
* **Solución**:
  * Modificamos la consulta del servidor en las páginas de cotización y consignación para incluir la relación `{ prices: true, variants: true }` al cargar productos.
  * Agregamos la consulta de `prisma.priceList.findMany` para la sucursal activa y el procesamiento de la configuración de ventas `ventasConfig`.
  * Pasamos correctamente los props `dynamicPriceLists` and `ventasConfig` al componente `<POSClient>`.
* **Resultado**: Las listas de precios secundarias (Mayoreo, Especial, etc.) ahora se cargan y permiten ser cambiadas de manera correcta tanto en la creación de Cotizaciones como de Consignaciones.

---

## 8. Habilitación de Ventas a Crédito y Visualización de Alertas de Límite en el POS
* **Identificación del Problema**: Al intentar realizar una venta en la caja del Punto de Venta, no aparecía la opción de pago "Crédito Cta." en el modal de checkout para clientes registrados como **OLIVIA BARRERA MONTIEL**.
* **Causa**: El Punto de Venta (`POSClient.tsx`) ocultaba por completo la opción "Crédito Cta." en el selector de métodos de pago si el cliente seleccionado tenía un límite de crédito de `$0.00` en la base de datos. Esto causaba confusión en los cajeros al no ver el botón y asumir una falla del sistema, en lugar de saber que era por falta de línea de crédito.
* **Solución**:
  * **Visibilidad del Método de Pago**: Modificamos `POSClient.tsx` para mostrar siempre la opción de "Crédito Cta." para cualquier cliente registrado (no anónimo / Público en General) cuando el método de crédito esté habilitado a nivel global en la configuración de la sucursal.
  * **Alertas e Información Fiscal**: Si el cliente seleccionado tiene un límite de crédito de `$0.00`, ahora el modal de checkout muestra una alerta en rojo: `"⚠️ El cliente no tiene una línea de crédito autorizada (Límite: $0.00). Configura su límite en la sección de Clientes."` y deshabilita de forma proactiva el botón "Confirmar Pago".
  * **Validación de Límites en Cliente**: Si el cliente excede su límite disponible, también se muestra una advertencia en rojo y se bloquea el botón "Confirmar Pago" en el navegador para evitar errores en el servidor.
* **Resultado**: El flujo de venta a crédito es transparente, mostrando advertencias claras e impidiendo registrar créditos no autorizados antes de enviar la petición al servidor.

---

## 9. Registro de Límite de Crédito en Producción para Olivia Barrera Montiel
* **Acción Realizada**: Actualizamos directamente en la base de datos de producción (`neondb`) el registro de la clienta `OLIVIA BARRERA MONTIEL` (ID `01b99184-5b3f-4972-8497-ee3cff1b5ec1`), asignándole un **Límite de Crédito de $100,000.00** con un plazo de **30 días**.
* **Resultado**: Olivia Barrera Montiel ahora tiene habilitado el crédito en caja por hasta $100,000.00 de manera inmediata.

---

## 10. Mapeo de Métodos de Pago SAT en Facturación (Tarjeta y Transferencia)
* **Identificación del Problema**: En la factura timbrada para las ventas pagadas con Tarjeta (como `SAN-1046` y `SAN-1051`), la forma de pago en el PDF del SAT se emitía incorrectamente como `"01 Efectivo"`.
* **Causa**: La función `stampInvoice` en [facturacion.ts](file:///c:/Users/barca2/.gemini/antigravity/playground/drifting-magnetosphere/pulpos_clone/app/actions/facturacion.ts) solo mapeaba a Facturapi la forma de pago `"99" (Por definir)` si la venta era a crédito (`CREDIT`). Para cualquier otro método, no realizaba mapeo y caía en el valor predeterminado `"01" (Efectivo)`.
* **Solución**:
  * Modificamos `stampInvoice` para normalizar el método de pago registrado en el POS y enviarlo correctamente al SAT:
    * Si es **CARD** (o incluye "tarjeta") -> Forma de pago **"04"** (Tarjeta de crédito / débito).
    * Si es **TRANSFER** (o incluye "transferencia" / "SPEI") -> Forma de pago **"03"** (Transferencia electrónica).
    * Si es **CASH** -> Forma de pago **"01"** (Efectivo).
  * Aplicamos la misma robustez y normalización en la función `stampMultipleSalesInvoice` para facturas globales o de ventas múltiples.
* **Resultado**: Las facturas de ventas individuales ahora heredan y timbran el método de pago correspondiente del POS.

---

## 11. Solución al Conflicto de Guardado de Abonos (Branch 'GLOBAL')
* **Identificación del Problema**: Cuando los usuarios ingresaban a la pestaña `"Cobranza y Abonos"` de un cliente estando en la vista general `"Todas las Sucursales"`, al intentar consolidar o registrar un abono, el sistema arrojaba un error rojo: `Foreign key constraint violated: 'CustomerPayment_branchId_fkey'`.
* **Causa**: Al realizar el pago desde la vista de todas las sucursales, la sucursal activa devuelta por el servidor es `'GLOBAL'` (un ID virtual no existente físicamente en la tabla `Branch` de la base de datos). Al intentar insertar un registro en la tabla `CustomerPayment` vinculando `branchId: 'GLOBAL'`, la base de datos lanzaba una violación de clave foránea.
* **Solución**:
  * Modificamos la función `addCustomerPaymentBatch` en [customerPayment.ts](file:///c:/Users/barca2/.gemini/antigravity/playground/drifting-magnetosphere/pulpos_clone/app/actions/customerPayment.ts):
    * Si el usuario se encuentra en la vista de sucursal `'GLOBAL'`, el sistema detecta de forma automática y asocia el pago a la sucursal física de la venta (`sale.branchId`), a la sucursal asignada del cliente (`customer.branchId`) o, en su defecto, a la primera sucursal física activa del inquilino (tenant).
    * Adaptamos de forma análoga la función de reversión y borrado `deleteCustomerPayment`.
* **Resultado**: Los abonos se registran y eliminan correctamente sin importar si el usuario tiene seleccionada una sucursal específica o la vista global.

---

## 12. Cancelación y Re-emisión Correcta de Facturas (SAN-1046 y SAN-1051)
* **Acciones Ejecutadas en Producción**:
  1. **SAN-1046 (GALVA RACKS DE MEXICO)**:
     * Cancelamos la factura incorrecta `6a46ce983c49adca98e42bf9` (mencionaba forma de pago Efectivo) en Facturapi bajo el motivo SAT `"02" (Comprobante emitido con errores sin relación)`.
     * Emitimos y timbramos la nueva factura **`6a46e8f53c49adca98eb1740`** con la forma de pago correcta **`04 Tarjeta de crédito`** y vinculada al folio `SAN-1046`.
     * Actualizamos la base de datos para referenciar el nuevo ID y folio fiscal.
  2. **SAN-1051 (MANUFACTURAS KALTEX)**:
     * Cancelamos la factura incorrecta `6a46e20d3c49adca98e960c6` (mencionaba forma de pago Efectivo) en Facturapi bajo el motivo SAT `"02"`.
     * Emitimos y timbramos la nueva factura **`6a46e8fa5b9520751d10daf5`** con la forma de pago correcta **`04 Tarjeta de crédito`** y vinculada al folio `SAN-1051`.
     * Sincronizamos la base de datos con los nuevos folios correctos.
* **Resultado**: Las facturas de ambos clientes ya muestran de forma correcta la forma de pago **Tarjeta** en el portal del SAT y en sus representaciones impresas.

---

## 13. Habilitación de Ventas a Crédito en Todas las Sucursales (Office City)
* **Acciones Ejecutadas**:
  * Actualizamos las configuraciones de las 14 sucursales del cliente en la base de datos de producción (`neondb_officecity`).
  * Para cada una de las sucursales, nos aseguramos de que el método `"CREDIT"` esté registrado y habilitado por defecto dentro del objeto `metodos` en el `configJson`.
  * Modificamos el estado inicial de la preferencia de métodos de pago en [PaymentMethodsConfigClient.tsx](file:///c:/Users/barca2/.gemini/antigravity/playground/drifting-magnetosphere/pulpos_clone/app/(dashboard)/preferencias/metodos/PaymentMethodsConfigClient.tsx) para incluir `"CREDIT"` por defecto para futuras sucursales.
* **Resultado**: La venta a crédito ahora está totalmente activa y disponible en las 14 sucursales del sistema de forma uniforme e inmediata.

---

## 14. Despliegue y Validación
* **Compilación**: El proyecto compila limpiamente sin errores de TypeScript (`npx tsc --noEmit` exitoso).
* **Despliegue a Producción**: Los cambios han sido subidos y desplegados a producción en la instancia de AWS Lightsail reconstruyendo la imagen Docker limpia y liberando memoria swap.

---

## 15. Corrección de Impuestos en Compras y Edición (Exento/Ninguno)
* **Identificación del Problema**: Al registrar productos sin IVA (Exentos, 0%), el sistema recalculaba e imponía un IVA del 16% automáticamente tanto en Compras como en el Punto de Venta.
* **Causas Identificadas y Soluciones**:
  1. **Servidor (Acciones de Producto)**: El guardado e importado de productos utilizaba un chequeo falsy (`parseFloat(val) || 16.0`) que convertía `0` (Exento) de vuelta en `16.0`. Se corrigió en [product.ts](file:///c:/Users/barca2/.gemini/antigravity/playground/drifting-magnetosphere/pulpos_clone/app/actions/product.ts) e [import.ts](file:///c:/Users/barca2/.gemini/antigravity/playground/drifting-magnetosphere/pulpos_clone/app/actions/import.ts) usando comprobaciones `isNaN` estrictas.
  2. **Vistas de Compra (`CrearCompraForm.tsx` y `EditarCompraForm.tsx`)**: Las vistas calculaban impuestos en bloque sobre el total final aplicando multiplicaciones directas por `0.16` o divisiones por `1.16`. Se rediseñó para calcular subtotal, IVA e IEPS de forma granular y dinámica por cada producto individual del carrito.
  3. **Queries de Productos en Compras (`page.tsx`)**: Los listados de productos en `/compras/nuevo/page.tsx` y `/compras/[id]/editar/page.tsx` omitían `taxRate`, `taxType`, y `iepsRate` de los campos seleccionados, provocando que el cliente de React usara valores predeterminados. Se agregaron estos campos a los selectores de Prisma.
  4. **Detalle de Compra y Exportación a PDF (`page.tsx` y `purchasePdf.ts`)**: Se sustituyó la lógica de desglose rígida (`/ 1.16`) por bucles dinámicos a nivel de ítem. Se implementó una lógica de retrocompatibilidad que compara el total esperado con el total real guardado en la base de datos: si difieren por más de $0.05 (compras antiguas), el sistema cae automáticamente en el cálculo histórico para no romper facturas anteriores.
* **Resultado**: Los productos marcados como Exentos (0% de IVA) se calculan y guardan con impuestos de $0.00 tanto en el Punto de Venta como en la sección de Compras y PDFs.

---

## 16. Módulo de Permisos de WhatsApp y CRM
* **Requerimiento**: Poder asignar permisos individuales a los usuarios para el uso de WhatsApp y CRM, de forma que solo les aparezca el módulo de Kanban (Prospección), la Bandeja de WhatsApp (Inbox) y/o el Widget flotante a quienes se les decida asignar.
* **Solución e Implementación**:
  1. **Configuración de Permisos (`permissions.ts`)**: Agregamos un nuevo módulo de permisos llamado `WhatsApp y CRM` (`whatsapp`) con tres subgrupos diferenciados:
     * **Bandeja y Chat (`whatsapp_chat`)**: Permisos para acceder a la bandeja (`whatsapp_bandeja`) y ver el widget flotante (`whatsapp_widget`).
     * **Prospección y CRM (`whatsapp_kanban_crm`)**: Permiso para ver el tablero Kanban (`whatsapp_kanban`).
     * **Configuración (`whatsapp_admin_config`)**: Permiso para gestionar la conexión y escaneo QR de WhatsApp (`whatsapp_config`).
  2. **Menú de Navegación (`navigation.tsx`)**: Reemplazamos el requisito anterior (`pos_access`) por los nuevos permisos específicos para cada enlace del menú lateral:
     * *Bandeja WhatsApp* -> requiere `whatsapp_bandeja`
     * *Conexión WhatsApp* -> requiere `whatsapp_config`
     * *Prospección (CRM)* -> requiere `whatsapp_kanban`
  3. **Seguridad y Guards en Páginas**: Implementamos la verificación de permisos en el lado del servidor para las tres rutas principales:
     * `/ventas/whatsapp/page.tsx`
     * `/ventas/prospeccion/page.tsx`
     * `/configuracion/whatsapp/page.tsx`
     * Si un usuario intenta ingresar manualmente escribiendo la URL sin contar con el permiso asignado, el servidor lo redirige automáticamente a la página de inicio (`/`).
  4. **Widget Flotante de WhatsApp (`layout.tsx`)**: Protegimos el renderizado del componente `<FloatingWhatsappWidget />` en el layout del dashboard. Ahora solo se renderiza si el usuario cuenta con el permiso `whatsapp_widget` (o es un superusuario/administrador).
* **Resultado**: El administrador ahora puede habilitar o deshabilitar de forma independiente la bandeja, el tablero kanban y el widget flotante a cualquier usuario desde la pantalla de edición de usuarios en preferencias.

---

## 17. Gestión de Estatus de Solicitudes y Carga a Pedidos de Proveedor
* **Requerimiento**: Permitir cambiar el estatus de las solicitudes de compra (de `Pendiente` a `Solicitado a Proveedor` y `Recibido`) desde la pantalla de solicitudes y poder cargar solicitudes directamente a un pedido pre-llenando sus artículos.
* **Solución e Implementación**:
  1. **Acciones de Servidor (`purchaseRequest.ts`)**: Implementamos la lógica de actualización individual `updatePurchaseRequestStatus` y las acciones en lote `batchUpdatePurchaseRequestStatus` y `batchDeletePurchaseRequests`.
  2. **Control de Estatus y Selección en Lista de Solicitudes (`SolicitudesClient.tsx`)**:
     * Sustituimos la etiqueta de estado estática por un elemento `<select>` interactivo y estilizado para cambiar el estatus en una sola interacción (Pendiente, Solicitado, Recibido).
     * Agregamos checkboxes de selección de fila y selección múltiple global.
     * Diseñamos una barra flotante de acciones masivas cuando hay elementos seleccionados, permitiendo: Cargar a pedido con proveedor, marcar lote como Solicitado, marcar lote como Recibido, o eliminar lote de forma conjunta.
     * Añadimos un botón individual "Cargar a Pedido" en cada fila para facilitar el flujo uno a uno.
  3. **Carga en Nuevo Pedido (`page.tsx` y `CrearPedidoForm.tsx`)**:
     * Habilitamos que la página `/productos/pedidos/nuevo` lea los parámetros de búsqueda `requestId` y `requestIds`.
     * El servidor busca automáticamente esas solicitudes y mapea sus productos y cantidades correspondientes en un arreglo pre-cargado.
     * El formulario `CrearPedidoForm` inicializa los artículos del pedido pre-llenándolos con las solicitudes indicadas, permitiendo que el usuario guarde el pedido a proveedor sin tener que digitar los ítems manualmente.
* **Resultado**: Los directivos e inspectores de compras ahora pueden gestionar, cambiar el estatus y cargar masiva o individualmente las solicitudes de compras a sus pedidos con proveedores con un solo clic.

---

## 18. Configuración Global de Correo Saliente (SMTP)
* **Requerimiento**: Solucionar el error `SMTP credentials not configured` que impedía enviar tickets de venta por correo electrónico a los clientes.
* **Solución**:
  * Identificamos que las credenciales SMTP de Zoho (`soporte@caanma.com`) estaban configuradas en las variables de entorno de Netlify pero no en el servidor de producción AWS Lightsail.
  * Agregamos y configuramos las variables SMTP correspondientes en el archivo `/home/ubuntu/oc/.env` del servidor Lightsail:
    * `SMTP_HOST="smtp.zoho.com"`
    * `SMTP_PORT="465"`
    * `SMTP_USER="soporte@caanma.com"`
    * `SMTP_PASS="Queretaro00."`
  * Reiniciamos el contenedor de Docker (`caanma-app`) para que Next.js cargue y utilice las nuevas variables de entorno en tiempo de ejecución.
* **Resultado**: El envío de correos salientes queda habilitado de forma global en producción. Las ventas, cotizaciones y facturas electrónicas ahora se envían de forma exitosa mediante la cuenta `soporte@caanma.com` (a menos que una sucursal configure una cuenta de correo SMTP personalizada propia en su panel de preferencias).

---

## 19. Corrección de Enlaces Públicos (Cotizaciones y Facturas Compartidas)
* **Requerimiento**: Solucionar el problema por el cual los clientes no podían abrir los enlaces de cotizaciones compartidos por WhatsApp, y resolver el problema por el cual las facturas adjuntas no se podían abrir (o se descargaban corruptas).
* **Soluciones Aplicadas**:
  1. **Acceso Sin Sesión a Cotizaciones y Ventas (`prisma.ts`):**
     * **Problema:** Al no estar autenticados, los clientes que hacían clic en los enlaces de cotizaciones o notas de venta no tenían una cookie de sesión activa. La capa multitenant de Prisma caía al cliente de base de datos *master* (que no contiene las cotizaciones/ventas de las sucursales), retornando un error `404 Not Found`.
     * **Corrección:** Implementamos las funciones utilitarias `resolveClientForQuote` y mejoramos `resolveClientForSale` en [prisma.ts](file:///c:/Users/barca2/.gemini/antigravity/playground/drifting-magnetosphere/pulpos_clone/lib/prisma.ts) para realizar búsquedas seguras en todas las bases de datos de inquilinos (tenants). 
     * **Integración:** Actualizamos los archivos de carga del cliente:
       * [/ventas/detalle/[id]/imprimir-cotizacion/page.tsx](file:///c:/Users/barca2/.gemini/antigravity/playground/drifting-magnetosphere/pulpos_clone/app/ventas/detalle/[id]/imprimir-cotizacion/page.tsx)
       * [/ventas/detalle/[id]/imprimir/page.tsx](file:///c:/Users/barca2/.gemini/antigravity/playground/drifting-magnetosphere/pulpos_clone/app/ventas/detalle/[id]/imprimir/page.tsx)
       * [/ventas/detalle/[id]/imprimir-ticket/page.tsx](file:///c:/Users/barca2/.gemini/antigravity/playground/drifting-magnetosphere/pulpos_clone/app/ventas/detalle/[id]/imprimir-ticket/page.tsx)
       * Ahora estas páginas públicas resuelven el inquilino correcto y muestran la cotización o venta de manera instantánea a los clientes sin pedirles iniciar sesión.
  2. **Acceso Público a Descarga de Facturas (`middleware.ts`):**
     * **Problema:** El enlace de descarga `/api/facturacion/download?invoiceId=...` enviado por WhatsApp a los clientes externos estaba bloqueado por el middleware de seguridad. Al intentar abrirlo, el cliente era redirigido a `/login`. La descarga recibía el código HTML de la página de inicio de sesión en lugar del archivo binario del PDF de Facturapi, resultando en un archivo PDF corrupto que no se podía abrir.
     * **Corrección:** Agregamos el endpoint `/api/facturacion/download` a la lista de rutas públicas (`publicRoutes`) en el middleware de autenticación [middleware.ts](file:///c:/Users/barca2/.gemini/antigravity/playground/drifting-magnetosphere/pulpos_clone/middleware.ts).
     * **Resultado:** Los clientes que reciban sus enlaces de factura por WhatsApp podrán descargarlos directamente en formato PDF o XML binario y abrirlos perfectamente en cualquier dispositivo.
  3. **Habilitación y Carga de SMTP en Producción (Docker):**
     * Detuvimos y recreamos el contenedor de producción (`docker compose down && docker compose up -d`) para forzar la carga correcta de las variables SMTP definidas en el archivo `.env` del host. Verificamos mediante pruebas en la consola de Node que las credenciales de `soporte@caanma.com` ahora se resuelven y los correos electrónicos se envían adjuntando los buffers binarios del PDF y XML descargados de Facturapi en perfectas condiciones.


