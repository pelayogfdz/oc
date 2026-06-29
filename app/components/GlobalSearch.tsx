'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, BookOpen, Printer, X, FileText, Navigation, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ManualData {
  purpose: string;
  steps: string[];
  faq: { q: string; a: string }[];
}

interface SearchItem {
  name: string;
  path: string;
  category: string;
  description: string;
  keywords: string[];
  manual: ManualData;
}

// Accent / Diacritics normalization utility
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// Complete and exhaustive system modules directory for CAANMA (34 Items)
const SEARCH_DIRECTORY: SearchItem[] = [
  {
    name: 'Punto de Venta (Nueva Venta)',
    path: '/ventas/nueva',
    category: 'Ventas',
    description: 'Registra ventas, elabora cotizaciones comerciales rápidas y gestiona stock en consignación en tiempo real.',
    keywords: ['pos', 'cobrar', 'carrito', 'ventas', 'nueva venta', 'caja', 'descuento', 'articulos', 'pago', 'ticket'],
    manual: {
      purpose: 'Facilitar la captura rápida de ventas, control de caja sincronizado y selección ágil de clientes con acumulación de puntos de fidelidad.',
      steps: [
        'Escanea el código de barras del producto o búscalo manualmente en la barra superior del POS.',
        'Selecciona el cliente del listado para asociar sus puntos e historial de compra.',
        'Haz clic en el botón de Cobrar (o el método equivalente en el panel inferior).',
        'Ingresa el monto recibido, selecciona el método de pago (Efectivo, Tarjeta, Crédito, etc.) y confirma la transacción.',
        'El ticket se imprimirá de manera seamless y silenciosa sin cuadros de diálogo adicionales si QZ Tray está activo.'
      ],
      faq: [
        { q: '¿Cómo cobro con múltiples métodos de pago?', a: 'En el cuadro final de cobro, ingresa el monto recibido en cada método correspondiente; el sistema calculará automáticamente la suma y el cambio.' },
        { q: '¿Cómo aplico un descuento de último minuto?', a: 'En el carrito, puedes hacer clic directamente sobre el precio o porcentaje del artículo y editarlo si tu rol de usuario cuenta con los permisos necesarios.' }
      ]
    }
  },
  {
    name: 'Historial y Bitácora de Ventas',
    path: '/ventas',
    category: 'Ventas',
    description: 'Listado de transacciones del día, devoluciones de caja, re-impresión de tickets y auditorías.',
    keywords: ['historial', 'bitacora', 'ventas pasadas', 'folios', 'reimprimir', 'tickets emitidos', 'ventas del dia'],
    manual: {
      purpose: 'Permitir al administrador y vendedores revisar transacciones anteriores, emitir comprobantes duplicados y aplicar devoluciones con control de inventario.',
      steps: [
        'Ingresa a Ventas en el menú lateral.',
        'Utiliza los filtros de fecha, sucursal, folio o vendedor para acotar la búsqueda.',
        'Haz clic sobre cualquier renglón para abrir la vista detallada de la transacción.',
        'Presiona "Reimprimir Ticket" para emitir un comprobante físico o "Facturar" para enviarla al SAT.'
      ],
      faq: [
        { q: '¿Se puede cancelar una venta completada?', a: 'Sí, a través del módulo de devoluciones o seleccionando la venta en el historial y presionando "Devolución" si el turno de caja aún no ha sido cerrado.' },
        { q: '¿Dónde veo quién realizó la venta?', a: 'En la columna "Sucursal / Vendedor" se detalla el nombre del cajero asignado a ese folio.' }
      ]
    }
  },
  {
    name: 'Bandeja de WhatsApp CRM',
    path: '/ventas/prospeccion',
    category: 'CRM',
    description: 'Inbox multi-agente sincronizado con WhatsApp web para prospección comercial y envío de documentos.',
    keywords: ['whatsapp', 'crm', 'chats', 'mensajes', 'prospectos', 'bandeja whatsapp', 'conversaciones', 'asesor'],
    manual: {
      purpose: 'Centralizar el canal de mensajería instantánea de la sucursal para que los asesores atiendan dudas, registren prospectos y envíen archivos PDF de cotizaciones sin salir de la plataforma.',
      steps: [
        'Ve a la Bandeja WhatsApp desde la sección Ventas en el menú lateral.',
        'Haz clic en el botón "Sync" para descargar los mensajes recientes del servidor de WhatsApp.',
        'Selecciona un chat en la barra izquierda para interactuar en tiempo real.',
        'Asocia el chat a un prospecto del CRM y asígnale una etapa del embudo de ventas.'
      ],
      faq: [
        { q: '¿Cómo envío una cotización directamente por WhatsApp?', a: 'Al ver una cotización en su respectiva bandeja, presiona el botón "Enviar por WhatsApp"; esto inyectará el archivo PDF en el chat seleccionado del prospecto.' },
        { q: '¿Por qué no carga mi QR de conexión?', a: 'Asegúrate de que tu celular tenga internet y de no tener otra pestaña activa con WhatsApp Web abierta en el mismo navegador.' }
      ]
    }
  },
  {
    name: 'CRM de Prospección Comercial',
    path: '/ventas/prospeccion',
    category: 'CRM',
    description: 'Embudo de conversión (pipeline), asignación de prospectos y bitácora de seguimiento comercial.',
    keywords: ['crm', 'prospeccion', 'embudo', 'funnel', 'etapas', 'prospectos nuevos', 'asesores', 'seguimiento'],
    manual: {
      purpose: 'Administrar el embudo de ventas de la empresa y asegurar que cada prospecto reciba seguimiento oportuno por parte de los asesores.',
      steps: [
        'Ingresa al módulo de Prospección en el menú de Ventas.',
        'Visualiza el tablero Kanban con las etapas de tus prospectos (Nuevo, Contactado, Cotizado, Cerrado).',
        'Arrastra una tarjeta a otra columna para actualizar la etapa de venta del prospecto.',
        'Haz clic en un prospecto para añadir notas de seguimiento o programar recordatorios de llamadas.'
      ],
      faq: [
        { q: '¿Cómo asigno un prospecto a un asesor?', a: 'Dentro de la tarjeta de información del prospecto, haz clic en el selector "Asesor" y selecciona el miembro del equipo correspondiente.' },
        { q: '¿Se pueden importar prospectos de Excel?', a: 'Sí, a través de la herramienta de importación masiva en el módulo de clientes, catalogando el origen como Prospecto.' }
      ]
    }
  },
  {
    name: 'Promociones y Descuentos',
    path: '/ventas/promociones',
    category: 'Ventas',
    description: 'Reglas de descuento automático, promociones por volumen, campañas de temporada y cupones.',
    keywords: ['promociones', 'descuentos', '2x1', 'ofertas', 'rebajas', 'campaña', 'cupones', 'descuento automatico'],
    manual: {
      purpose: 'Configurar incentivos comerciales automáticos en el punto de venta para incrementar el ticket promedio de compra.',
      steps: [
        'Entra a Promociones y Descuentos en el menú lateral.',
        'Presiona "+ Nueva Promoción" y define las condiciones (ej. 2x1 en categoría X, o 10% de descuento en la compra de $1,000+).',
        'Define el rango de fechas de validez y las sucursales participantes.',
        'Guarda la promoción. Ésta se aplicará automáticamente en el POS al cumplirse las condiciones del carrito.'
      ],
      faq: [
        { q: '¿Puedo limitar una promoción a un solo cliente?', a: 'Sí, al definir la promoción puedes restringirla a un grupo o segmento específico de clientes (ej. Clientes VIP).' },
        { q: '¿Se pueden acumular dos promociones?', a: 'Por defecto, el sistema aplica la promoción de mayor beneficio para el cliente y bloquea la acumulación, a menos que marques la casilla "Acumulable" al crearla.' }
      ]
    }
  },
  {
    name: 'Devoluciones de Caja',
    path: '/ventas/devoluciones',
    category: 'Ventas',
    description: 'Registro de devoluciones de mercancía por clientes y cancelaciones con re-ingreso automático a inventario.',
    keywords: ['devoluciones', 'cancelaciones', 'regresar producto', 'mermas de caja', 'devolucion ticket'],
    manual: {
      purpose: 'Registrar la devolución de artículos comprados, reintegrar el stock al almacén y gestionar reembolsos de caja.',
      steps: [
        'Ve al módulo de Devoluciones en el menú lateral.',
        'Busca la venta original ingresando el folio del ticket o el nombre del cliente.',
        'Selecciona el o los productos que el cliente desea regresar y especifica el motivo.',
        'Confirma si el dinero se reembolsará en efectivo (afectando la caja actual) o si se generará un saldo a favor en monedero.'
      ],
      faq: [
        { q: '¿Qué pasa si el artículo devuelto está dañado?', a: 'Al procesar la devolución, selecciona el estatus "Dañado/Merma". Esto impedirá que el producto regrese al stock disponible y lo enviará directo a mermas.' },
        { q: '¿Puedo hacer una devolución parcial?', a: 'Sí, puedes seleccionar individualmente las piezas y productos específicos a devolver sin afectar el resto de la venta original.' }
      ]
    }
  },
  {
    name: 'Cotizaciones y Presupuestos',
    path: '/ventas/cotizaciones',
    category: 'Ventas',
    description: 'Generación, edición y conversión de cotizaciones comerciales a ventas con formatos personalizados y previsualización.',
    keywords: ['cotizacion', 'presupuesto', 'cotizaciones', 'editar cotizacion', 'convertir venta', 'previsualizar cotizacion'],
    manual: {
      purpose: 'Elaborar presupuestos profesionales para clientes, almacenarlos cronológicamente y convertirlos en ventas en un solo clic.',
      steps: [
        'En el módulo de Cotizaciones, haz clic en "+ Nueva Cotización" o accede directamente desde el Punto de Venta cambiando el modo a "Cotización".',
        'Agrega los productos y el cliente. El folio se generará automáticamente a partir del 1,001.',
        'Presiona "Guardar". Podrás ver la previsualización al pasar el cursor sobre el número de cotización en el listado.',
        'Usa el botón "Convertir" en la bandeja para transformarla en venta activa.'
      ],
      faq: [
        { q: '¿Las cotizaciones restan inventario?', a: 'No. Una cotización representa un presupuesto sugerido y no descuenta existencias físicas hasta ser convertida en Venta o Remisión.' },
        { q: '¿Puedo editar una cotización ya guardada?', a: 'Sí. A partir del botón "Editar" en la bandeja, puedes modificar productos, cantidades o clientes y volver a guardar.' }
      ]
    }
  },
  {
    name: 'Ventas en Consignación',
    path: '/ventas/consignaciones',
    category: 'Ventas',
    description: 'Control de mercancía entregada en consignación a clientes, cobranza periódica y liquidación de saldos.',
    keywords: ['consignaciones', 'mercancia en consignacion', 'liquidar consigna', 'credito consignacion', 'devolucion stock'],
    manual: {
      purpose: 'Gestionar el inventario prestado a distribuidores o clientes y registrar los cortes periódicos de lo vendido.',
      steps: [
        'Ingresa al módulo de Consignaciones.',
        'Haz clic en "Nueva Consignación", selecciona al cliente y los productos que se le entregarán sin costo inmediato.',
        'El sistema descontará la mercancía del inventario activo y la registrará en la cuenta de consignaciones del cliente.',
        'Para liquidar, abre la consignación activa del cliente, registra cuántas piezas vendió (se cobran) y cuántas devolvió al stock físico.'
      ],
      faq: [
        { q: '¿Cómo cobro el stock vendido de una consignación?', a: 'Al hacer el corte de consignación, selecciona "Liquidar Vendidos" e ingresa el cobro por los métodos de pago habituales de caja.' },
        { q: '¿Se genera una nota de entrega?', a: 'Sí, al guardar la consignación puedes descargar un PDF firmado con la relación de artículos bajo responsabilidad del cliente.' }
      ]
    }
  },
  {
    name: 'Catálogos de Artículos PDF',
    path: '/ventas/catalogos',
    category: 'Ventas',
    description: 'Generación automatizada de catálogos digitales en PDF con imágenes y precios para compartir por WhatsApp.',
    keywords: ['catalogo pdf', 'imprimir catalogo', 'compartir catalogo', 'lista de precios pdf', 'folleto digital'],
    manual: {
      purpose: 'Crear catálogos visuales y profesionales en PDF con tus productos e imágenes para compartirlos fácilmente con tus clientes.',
      steps: [
        'Ve a Catálogos de Artículos en el menú lateral.',
        'Filtra los productos por marcas, categorías o etiquetas que desees incluir.',
        'Selecciona la plantilla visual de tu agrado (ej. Lista de precios simple o Catálogo visual con imágenes grandes).',
        'Presiona "Generar PDF". Podrás enviarlo directamente a tus chats de WhatsApp CRM.'
      ],
      faq: [
        { q: '¿Las imágenes del catálogo se pixelan?', a: 'No, el sistema genera imágenes redimensionadas de alta calidad optimizadas para lectura en teléfonos móviles.' },
        { q: '¿Puedo ocultar los precios en el catálogo?', a: 'Sí, en las opciones de generación puedes desactivar la casilla "Mostrar Precios" para emitir un folleto puramente visual.' }
      ]
    }
  },
  {
    name: 'Caja y Turno Actual',
    path: '/caja/actual',
    category: 'Caja',
    description: 'Control de flujo de caja, arqueos físicos, retiros parciales de efectivo y corte de caja final.',
    keywords: ['caja', 'turno', 'apertura de caja', 'corte de caja', 'arqueo', 'declarar fondo', 'efectivo', 'retiro de caja'],
    manual: {
      purpose: 'Asegurar el control estricto del efectivo en caja y auditar la conciliación entre las ventas registradas y el dinero físico.',
      steps: [
        'Al ingresar por primera vez en el día, define el "Fondo Inicial de Caja" para poder operar.',
        'Durante el turno, registra cualquier egreso o retiro usando la opción "Retiro de Efectivo" para mantener el balance exacto.',
        'Al final del día, presiona "Cerrar Caja". Realiza el arqueo físico contando los billetes y monedas.',
        'El sistema generará el reporte de balance con el desglose exacto de sobrantes o faltantes.'
      ],
      faq: [
        { q: '¿Qué pasa si olvido cerrar caja a medianoche?', a: 'Si la sucursal tiene activo el "Auto Cierre de Caja" en preferencias, el sistema generará y guardará el corte de turno automáticamente a las 12:00 AM.' },
        { q: '¿Cómo imprimo el corte de caja en físico?', a: 'Al confirmar el cierre, presiona "Imprimir Corte" y saldrá un resumen resumido en tu impresora de tickets local.' }
      ]
    }
  },
  {
    name: 'Cortes de Caja Históricos',
    path: '/caja/cortes',
    category: 'Caja',
    description: 'Consulta de cierres de turno anteriores, auditorías de sobrantes/faltantes y conciliación de caja.',
    keywords: ['cortes pasados', 'cierres historicos', 'arqueos de caja', 'conciliaciones', 'auditoria de caja'],
    manual: {
      purpose: 'Consultar y auditar los cierres de caja históricos de la sucursal para revisiones financieras e impositivas.',
      steps: [
        'Accede a Cortes de Caja en la sección Caja en el menú lateral.',
        'Utiliza el calendario para filtrar los turnos cerrados por fecha, cajero o sucursal.',
        'Haz clic sobre un corte específico para revisar el desglose de lo declarado vs. lo vendido por cada método de pago.',
        'Descarga o reimprime el reporte detallado si lo requieres para contabilidad.'
      ],
      faq: [
        { q: '¿Puedo corregir un corte de caja ya cerrado?', a: 'No, por seguridad contable un corte cerrado es inmutable. Si hubo un error en la declaración de efectivo, se debe registrar una nota aclaratoria o ajuste en el sistema.' },
        { q: '¿Qué significa el balance en rojo?', a: 'Significa un faltante de efectivo en caja, lo cual indica que la suma contable reportada es mayor al dinero declarado físicamente.' }
      ]
    }
  },
  {
    name: 'Facturación Fiscal (SAT CFDI 4.0)',
    path: '/facturas',
    category: 'Facturas',
    description: 'Gestión de facturas timbradas con el SAT, cancelación de CFDI, descarga de XML y PDF.',
    keywords: ['facturacion', 'sat', 'cfdi 4.0', 'timbrado', 'xml', 'pdf factura', 'cancelar factura', 'rfc', 'razon social'],
    manual: {
      purpose: 'Cumplir con las obligaciones fiscales timbrando las ventas en facturas CFDI 4.0 directamente con el SAT.',
      steps: [
        'Ve al módulo de Facturas en el menú lateral.',
        'Selecciona una venta no facturada y presiona el botón "Generar Factura".',
        'Verifica el RFC, razón social, régimen fiscal y código postal del cliente.',
        'Selecciona el Uso de CFDI (ej. Gastos en general) y presiona "Timbrar". El XML y PDF se enviarán automáticamente al correo del cliente.'
      ],
      faq: [
        { q: '¿Cómo cancelo una factura con el SAT?', a: 'En el listado de facturas, haz clic sobre la factura timbrada, presiona "Cancelar Factura", selecciona el motivo de cancelación del SAT y confirma la operación.' },
        { q: '¿Puedo hacer una factura global del día?', a: 'Sí, selecciona el módulo Facturas y presiona "Factura Global del Día" para agrupar todas las ventas al público en general.' }
      ]
    }
  },
  {
    name: 'Directorio de Clientes',
    path: '/clientes',
    category: 'Clientes',
    description: 'Registro de datos fiscales de clientes, administración de líneas de crédito, saldos y puntos de lealtad.',
    keywords: ['clientes', 'directorio', 'credito de cliente', 'saldo', 'puntos de lealtad', 'agregar cliente', 'rfc cliente'],
    manual: {
      purpose: 'Llevar la administración completa de los datos de contacto, fiscales, saldo a crédito y monedero de tus compradores.',
      steps: [
        'Ve a Clientes en el menú lateral.',
        'Haz clic en "+ Nuevo Cliente" para capturar nombre, teléfono, dirección y datos de facturación RFC.',
        'Si el cliente tiene autorizado comprar a crédito, define su "Límite de Crédito" y días de tolerancia de pago.',
        'Revisa el balance de sus créditos pendientes o realiza abonos directamente desde su perfil.'
      ],
      faq: [
        { q: '¿Cómo abona un cliente a su cuenta por cobrar?', a: 'Entra al perfil del cliente, presiona "Registrar Abono", escribe la cantidad recibida y el método de pago; el sistema actualizará su deuda al instante.' },
        { q: '¿Cómo veo sus puntos acumulados?', a: 'En su ficha de cliente se muestra el balance actual de sus puntos acumulados por sus compras del programa de lealtad.' }
      ]
    }
  },
  {
    name: 'Inventarios y Productos',
    path: '/productos',
    category: 'Inventario',
    description: 'Administración de existencias, códigos de barras, variantes, precios de venta, costos y mermas.',
    keywords: ['inventarios', 'stock', 'existencias', 'tallas', 'colores', 'costos', 'precios de venta', 'mermas', 'editar stock'],
    manual: {
      purpose: 'Administrar el catálogo de productos de la sucursal, controlando existencias exactas y precios.',
      steps: [
        'Ingresa a Productos en el menú lateral.',
        'Registra artículos nuevos especificando categoría, marca y existencias físicas.',
        'Utiliza variantes para productos con diferentes presentaciones o tallas.',
        'Monitorea el reporte de existencias críticas para prevenir quiebres de stock en tienda.'
      ],
      faq: [
        { q: '¿Cómo imprimo códigos de barras?', a: 'En el listado, haz clic en el icono de etiqueta junto al producto, selecciona la plantilla de código y mándalo a tu impresora Brother QL-800.' },
        { q: '¿Qué es el costo promedio?', a: 'Es el costo calculado automáticamente por el sistema con base en las facturas de compras registradas a tus proveedores.' }
      ]
    }
  },
  {
    name: 'Compras y Proveedores (Gastos)',
    path: '/productos/compras',
    category: 'Compras',
    description: 'Registro de compras de mercancía a proveedores, bitácora de egresos y control de costos de adquisición.',
    keywords: ['compras', 'proveedores', 'gastos', 'egresos', 'facturas proveedor', 'registrar compra', 'cuentas por pagar'],
    manual: {
      purpose: 'Registrar la entrada de stock a través de compras, actualizar costos de inventario y controlar cuentas por pagar a proveedores.',
      steps: [
        'Ve a Compras en la sección Compras y Gastos en el menú lateral.',
        'Presiona "+ Registrar Compra", selecciona el proveedor e ingresa los productos con su respectivo costo de adquisición.',
        'Define si la compra fue al contado (saldrá efectivo de caja o banco) o a crédito.',
        'Confirma y el inventario de la tienda se actualizará automáticamente con las nuevas cantidades ingresadas.'
      ],
      faq: [
        { q: '¿Cómo cargo una factura XML del proveedor?', a: 'Al registrar la compra, arrastra el archivo XML del SAT en la sección "Cargar XML" para rellenar de forma automatizada todos los productos y costos.' },
        { q: '¿Dónde veo los gastos del mes?', a: 'En el módulo de Finanzas o en el listado de Compras/Gastos puedes visualizar el acumulado mensual de egresos de la empresa.' }
      ]
    }
  },
  {
    name: 'Traspasos entre Sucursales',
    path: '/productos/traspasos',
    category: 'Inventario',
    description: 'Envíos y recepciones de mercancía entre almacenes y sucursales con bitácora de tránsito.',
    keywords: ['traspasos', 'mover inventario', 'sucursales', 'enviar mercancia', 'recibir traspaso', 'stock en transito'],
    manual: {
      purpose: 'Controlar de forma segura el envío y recepción de inventario entre distintas sucursales físicas sin pérdidas.',
      steps: [
        'Ve al módulo de Traspasos.',
        'Haz clic en "Nuevo Traspaso", selecciona la sucursal de origen, la sucursal de destino y la lista de artículos a enviar.',
        'Guarda el traspaso; éste cambiará a estatus "En Tránsito" y las piezas se descontarán de la sucursal origen.',
        'Al llegar a la sucursal destino, el encargado debe abrir el folio y presionar "Recibir e Incrementar Inventario".'
      ],
      faq: [
        { q: '¿Qué pasa si hay piezas faltantes en la recepción?', a: 'Al recibir, el encargado puede registrar discrepancias (piezas dañadas o faltantes), las cuales se enviarán a un reporte de auditoría de tránsito.' },
        { q: '¿Cómo imprimo el vale de salida?', a: 'Antes del despacho, haz clic en "Imprimir Vale" en la esquina de la cotización/traspaso para emitir el comprobante físico del chofer.' }
      ]
    }
  },
  {
    name: 'Logística de Envíos y Rutas',
    path: '/logistica',
    category: 'Logística',
    description: 'Planeación de rutas de entrega, asignación de pedidos a choferes y monitoreo de estatus de entrega.',
    keywords: ['logistica', 'rutas', 'envios', 'choferes', 'reparto', 'direcciones de entrega', 'monitoreo de envios'],
    manual: {
      purpose: 'Organizar de forma eficiente las entregas a domicilio, reduciendo costos de traslado y tiempos de respuesta al cliente.',
      steps: [
        'Entra al módulo de Logística en el menú lateral.',
        'Selecciona las ventas con entrega a domicilio pendientes de programar.',
        'Agrupa las entregas geográficamente y asígnalas a una "Ruta de Reparto" con un chofer asignado.',
        'Imprime la hoja de ruta para el chofer. Éste puede actualizar los estatus a "Entregado" o "No localizado" en tiempo real.'
      ],
      faq: [
        { q: '¿Cómo calcula el sistema el orden de paradas?', a: 'La plataforma integra el servicio de Google Maps para sugerir la secuencia óptima de entrega con base en el menor tráfico y distancia.' },
        { q: '¿El cliente recibe alguna alerta?', a: 'Sí, si está configurado en las preferencias de notificaciones, el cliente recibirá un mensaje de WhatsApp cuando su paquete vaya en camino.' }
      ]
    }
  },
  {
    name: 'Recursos Humanos y Asistencias',
    path: '/rh',
    category: 'RH',
    description: 'Reloj checador biométrico/GPS, incidencias de personal, vacaciones y cálculo de prenóminas.',
    keywords: ['rh', 'asistencias', 'reloj checador', 'gps checador', 'retardos', 'nominas', 'incidencias', 'vacaciones'],
    manual: {
      purpose: 'Monitorear la puntualidad, turnos laborales, incidencias de asistencias y prenóminas de todo el personal.',
      steps: [
        'Para registrar entrada, el empleado debe entrar a "Reloj Checador" en Mi Portal, ingresar su clave y confirmar ubicación GPS.',
        'El sistema validará si está dentro del radio permitido de la sucursal y registrará su hora exacta de entrada.',
        'Los administradores pueden revisar incidencias (retardos, faltas justificadas) en el menú de RH.',
        'Genera el cierre de quincena para exportar la prenómina consolidada.'
      ],
      faq: [
        { q: '¿Qué pasa si falla el GPS de un empleado?', a: 'El empleado puede solicitar un ajuste de asistencia manual al administrador, el cual quedará registrado en la bitácora de RH.' },
        { q: '¿Cómo configuro el radio permitido de la sucursal?', a: 'Ve a Preferencias > Sucursales y edita el campo "Radio de geocerca en metros" (por defecto son 50m).' }
      ]
    }
  },
  {
    name: 'Procesos y Producción',
    path: '/procesos',
    category: 'Producción',
    description: 'Gestión de fórmulas de producción, asignación de tareas a colaboradores, mermas de insumos y órdenes de fabricación.',
    keywords: ['procesos', 'formulas', 'insumos', 'tareas', 'colaboradores', 'mermas', 'fabricacion'],
    manual: {
      purpose: 'Controlar los ingredientes de fórmulas, emitir órdenes de producción y asignar tareas recurrentes o únicas a colaboradores.',
      steps: [
        'Accede a Procesos en el menú lateral.',
        'Asigna tareas a tus colaboradores con instrucciones claras. Se les enviará un correo y les aparecerá un pop-up para subir evidencia.',
        'Crea fórmulas de tus productos terminados detallando insumos requeridos.',
        'Genera una "Orden de Producción" para descontar materias primas e incrementar el stock del producto terminado.'
      ],
      faq: [
        { q: '¿Cómo suben los colaboradores la evidencia de sus tareas?', a: 'Al ingresar al sistema, verán una ventana emergente que les requiere subir una fotografía o archivo antes de marcar la tarea como completada.' },
        { q: '¿El sistema calcula el costo unitario de fabricación?', a: 'Sí, sumando los costos de compra actualizados de cada insumo utilizado en la fórmula.' }
      ]
    }
  },
  {
    name: 'E-Commerce / Tienda Online',
    path: '/catalogo',
    category: 'Catálogo',
    description: 'Administración de tu portal web de e-commerce b2c para ventas directas en línea y carrito web.',
    keywords: ['ecommerce', 'tienda online', 'carrito de compras', 'ventas web', 'catalogo digital b2c', 'pedidos en linea'],
    manual: {
      purpose: 'Habilitar un canal de ventas digital 24/7 para que tus clientes consulten productos y realicen pedidos directamente por internet.',
      steps: [
        'Activa la Tienda Online en Preferencias > Catálogo B2C.',
        'Configura los productos que deseas que sean visibles en el portal web marcando la casilla "Visible en Tienda Online".',
        'Los clientes ingresan a la URL de tu sucursal, añaden artículos al carrito y finalizan el pedido.',
        'El pedido llegará instantáneamente a tu panel de ventas pendientes en el POS como un pedido web a procesar.'
      ],
      faq: [
        { q: '¿Sincroniza stock en tiempo real?', a: 'Sí. El stock de la tienda online está directamente enlazado al inventario físico de tu sucursal, previniendo sobreventas de productos agotados.' },
        { q: '¿Cómo cobro las ventas en línea?', a: 'Puedes configurar pagos contra entrega en efectivo/tarjeta o integrar pasarelas de pago digitales desde preferencias.' }
      ]
    }
  },
  {
    name: 'Finanzas y Contabilidad',
    path: '/finanzas',
    category: 'Finanzas',
    description: 'Estado de pérdidas y ganancias, flujo de efectivo contable, egresos corporativos y balances.',
    keywords: ['finanzas', 'ganancias', 'perdidas y ganancias', 'flujo de efectivo', 'contabilidad', 'gastos corporativos', 'utilidad'],
    manual: {
      purpose: 'Monitorear la salud financiera de tu empresa, analizando los márgenes de utilidad reales descontando costos y gastos operativos.',
      steps: [
        'Ve a Finanzas en el menú lateral.',
        'Visualiza el tablero con los ingresos por ventas vs. los egresos por compras de inventario y gastos de sucursal.',
        'Ajusta los filtros de periodo de tiempo (semanal, mensual, anual) o filtra por sucursal específica.',
        'Exporta el reporte detallado para tu contador en formato Excel o PDF.'
      ],
      faq: [
        { q: '¿Se restan los sueldos en la utilidad?', a: 'Sí, las nóminas validadas a través del módulo de Recursos Humanos se descuentan automáticamente del balance de gastos de la empresa.' },
        { q: '¿La facturación fiscal afecta el balance contable?', a: 'El sistema registra contablemente tanto las ventas con remisión/ticket como las facturadas ante el SAT para darte el flujo de efectivo real.' }
      ]
    }
  },
  {
    name: 'Preferencias Generales (Sucursal)',
    path: '/preferencias/general',
    category: 'Preferencias',
    description: 'Configura las reglas fiscales básicas de tu sucursal: tasa de IVA base, logotipo comercial y auto-cierre.',
    keywords: ['preferencias generales', 'iva sucursal', 'cambiar logo', 'auto cierre de caja', 'moneda nativa', 'encabezado ticket'],
    manual: {
      purpose: 'Configurar los datos fiscales transversales, identidad corporativa y comportamiento básico de la sucursal.',
      steps: [
        'Entra a Preferencias > General.',
        'Carga el archivo del Logotipo oficial de tu empresa en formato JPG/PNG.',
        'Define el pie del ticket (ej. políticas de devolución o redes sociales) y el encabezado fiscal (RFC, dirección).',
        'Establece el IVA transversal (por defecto 16.0%) y guarda los cambios.'
      ],
      faq: [
        { q: '¿Dónde se refleja el logotipo cargado?', a: 'Se inyecta automáticamente en tus PDF de cotizaciones, facturas SAT y catálogos en línea.' },
        { q: '¿Qué hace la opción Auto Cierre de Caja?', a: 'Reinicia el turno de caja automáticamente a las 11:59 PM todos los días para cortar transacciones de forma limpia y transparente.' }
      ]
    }
  },
  {
    name: 'Preferencias de Impresoras y Tickets',
    path: '/preferencias/impresoras',
    category: 'Preferencias',
    description: 'Consolida la gestión de hardware de tickets, QZ Tray, firmas criptográficas seguras y anchos de papel.',
    keywords: ['impresora preferencias', 'qz tray', 'firmas qz', 'ticket de prueba', ' receiptWidth', 'ip impresora', 'ip de red'],
    manual: {
      purpose: 'Gestionar todo el hardware de impresión física de tu sucursal en una sola pantalla segura.',
      steps: [
        'Navega a Preferencias > Impresoras.',
        'Define el ancho del papel de tus tickets (80mm o 58mm) y activa o desactiva "Impresión Automática al Cobrar".',
        'Si utilizas QZ Tray, pega tus claves digitales (Certificado y Clave Privada PEM) en el panel criptográfico inferior.',
        'Presiona "Guardar Credenciales" para configurar la firma de sockets en el servidor.',
        'Haz clic en "Imprimir Ticket de Prueba" para confirmar que la comunicación local sea correcta.'
      ],
      faq: [
        { q: '¿Qué pasa si mi impresora es USB?', a: 'Selecciona el controlador de tu impresora USB en el listado de impresoras detectadas por QZ Tray tras iniciar el servicio local.' },
        { q: '¿La IP de red de la impresora es obligatoria?', a: 'No, únicamente se completa si tienes una impresora térmica conectada directo al módem de red por cable ethernet.' }
      ]
    }
  },
  {
    name: 'Preferencias de Sucursales y GPS',
    path: '/preferencias/sucursales',
    category: 'Preferencias',
    description: 'Gestión de sucursales físicas de tu tenant, dirección, geolocalización GPS y radio de geocerca.',
    keywords: ['editar sucursal', 'geocerca', 'coordenadas gps', 'alta de sucursal', 'almacen fisico', 'sucursales'],
    manual: {
      purpose: 'Dar de alta nuevas ubicaciones físicas y configurar coordenadas geográficas para control de asistencia de personal.',
      steps: [
        'Ve a Preferencias > Sucursales.',
        'Haz clic en "Aperturar Nueva Sucursal" e ingresa el nombre y ubicación física.',
        'Para el checador, ingresa la Latitud, Longitud y el Radio de tolerancia en metros.',
        'Presiona "Guardar". Los cajeros y choferes ya podrán iniciar sesión asignados a esta nueva sucursal.'
      ],
      faq: [
        { q: '¿Qué es el radio de geocerca?', a: 'Es la distancia máxima permitida para que el checador de RH acepte el registro de entrada del empleado (ej. 50 metros a la redonda de la sucursal).' },
        { q: '¿Cómo archivo una sucursal inactiva?', a: 'Haz clic en "Archivar" en el listado. Esto mantendrá los históricos financieros a salvo pero la ocultará del menú diario.' }
      ]
    }
  },
  {
    name: 'Preferencias de Usuarios y Roles',
    path: '/preferencias/usuarios',
    category: 'Preferencias',
    description: 'Configura las cuentas de tus cajeros y administradores, asigna permisos de sucursales y accesos técnicos.',
    keywords: ['permisos de usuarios', 'crear cajero', 'privilegios', 'rol administrador', 'clave acceso', 'usuarios sistema'],
    manual: {
      purpose: 'Definir el personal autorizado, contraseñas y permisos exactos a los que cada empleado puede acceder en el sistema.',
      steps: [
        'Ve a Preferencias > Usuarios.',
        'Registra una cuenta de usuario nueva con su dirección de correo y contraseña.',
        'Establece el Rol principal (ADMIN para control total, USER para operativo).',
        'Marca los privilegios específicos que correspondan (ej. permitir ver reportes, autorizar descuentos de POS, etc.).',
        'Asigna las sucursales a las que se les permite iniciar sesión.'
      ],
      faq: [
        { q: '¿Puedo bloquear a un empleado temporalmente?', a: 'Sí, edita el perfil del usuario y desmarca la casilla "Activo" para suspender su inicio de sesión sin borrar su histórico.' },
        { q: '¿Qué es la clave biométrica?', a: 'Es la clave única utilizada para autorizar descuentos críticos en caja en lugar de requerir que el administrador digite su usuario.' }
      ]
    }
  },
  {
    name: 'Preferencias de Diseñador de Formatos',
    path: '/preferencias/formatos',
    category: 'Preferencias',
    description: 'Personaliza los tamaños de tipografía, columnas y elementos visibles en tickets, facturas y cotizaciones.',
    keywords: ['diseño de ticket', 'formatos de ticket', 'personalizar factura', 'visualizar ticket', 'columnas de ticket'],
    manual: {
      purpose: 'Configurar la estética visual de todos tus entregables impresos y digitales para reflejar una identidad de marca unificada.',
      steps: [
        'Ve a Preferencias > Diseñador de Formatos.',
        'Selecciona el formato a editar (ej. Ticket de venta de 80mm).',
        'Habilita o deshabilita los campos opcionales como: Logotipo, Desglose de IVA, Teléfono del cajero, Puntos acumulados, etc.',
        'Revisa el resultado interactivo de la derecha y presiona "Guardar Plantilla".'
      ],
      faq: [
        { q: '¿Cómo cambio los colores del PDF de facturación?', a: 'En la pestaña "Factura PDF", selecciona tu paleta de colores sugerida o ingresa el código de color hexadecimal oficial de tu marca.' },
        { q: '¿Puedo quitar el código QR del ticket?', a: 'Sí, desmarca la casilla "Mostrar código QR de folio al pie del ticket" en este panel.' }
      ]
    }
  },
  {
    name: 'Preferencias de Folios y Consecutivos',
    path: '/preferencias/folios',
    category: 'Preferencias',
    description: 'Configura el folio inicial 1,001 y los prefijos de sucursal para tus ventas, cotizaciones y compras.',
    keywords: ['folios configuracion', 'prefijos sucursal', 'folios iniciales', 'consecutivos folios', 'consecutivo 1001'],
    manual: {
      purpose: 'Personalizar y ordenar la numeración cronológica de las transacciones de cada sucursal de forma independiente.',
      steps: [
        'Ve a Preferencias > Consecutivos y Folios.',
        'Ingresa el prefijo de tu sucursal (ej. "MTZ-" para Matriz).',
        'Define el folio inicial que utilizará el Punto de Venta (sugerido: "1001").',
        'Presiona "Guardar" para activar la secuencia en todas tus nuevas transacciones.'
      ],
      faq: [
        { q: '¿El sistema permite folio duplicado?', a: 'No, la base de datos previene y bloquea folios idénticos de la misma secuencia de sucursal mediante llaves únicas.' },
        { q: '¿Qué es el botón de inicialización masiva?', a: 'Es una herramienta técnica que renombra retrospectivamente todas tus ventas históricas para emparejarlas con el prefijo y secuencia elegida a partir de la pieza 1,001.' }
      ]
    }
  },
  {
    name: 'Preferencias de Comisiones de Vendedores',
    path: '/preferencias/vendedores',
    category: 'Preferencias',
    description: 'Establece las tasas de comisión por vendedor, metas del mes y esquemas de incentivos sobre cobros.',
    keywords: ['comisiones', 'vendedores comision', 'porcentaje comision', 'incentivos ventas', 'metas de venta'],
    manual: {
      purpose: 'Automatizar el cálculo y la asignación de comisiones a los vendedores en base a sus ventas efectivas de caja.',
      steps: [
        'Ve a Preferencias > Vendedores y Comisiones.',
        'Define el esquema base (ej. Comisión fija del 2% sobre el total neto de la venta o comisiones escalonadas).',
        'Asigna las metas de venta mensuales para cada vendedor.',
        'El sistema calculará las comisiones en tiempo real en base a los cobros ingresados y reflejará los resultados en nómina.'
      ],
      faq: [
        { q: '¿La comisión se calcula sobre ventas a crédito?', a: 'Por defecto, el sistema calcula la comisión únicamente cuando el crédito es cobrado efectivamente por el cliente.' },
        { q: '¿Dónde consulto el reporte de comisiones?', a: 'En el módulo de Finanzas o en Reportes de Empleados en el menú lateral.' }
      ]
    }
  },
  {
    name: 'Preferencias de Métodos de Pago',
    path: '/preferencias/metodos',
    category: 'Preferencias',
    description: 'Activa o desactiva métodos de pago en caja: Efectivo, Tarjeta, Crédito, Transferencia y Vales.',
    keywords: ['metodos de pago', 'pagos en caja', 'efectivo tarjeta', 'vales de despensa', 'configurar pagos'],
    manual: {
      purpose: 'Configurar las vías autorizadas que los cajeros pueden seleccionar en la pantalla final de cobro.',
      steps: [
        'Ve a Preferencias > Métodos de Pago.',
        'Activa los interruptores de los métodos de pago aceptados en tus sucursales (ej. Vales de despensa, Transferencia SPEI).',
        'Define si se aplica alguna comisión bancaria al pagar con tarjeta de crédito/débito.',
        'Guarda los cambios. Las opciones se actualizarán inmediatamente en la pantalla de cobro del POS.'
      ],
      faq: [
        { q: '¿Cómo configuro cobros a crédito?', a: 'Activa el interruptor "Venta a Crédito". Únicamente se podrá seleccionar en el POS si el cliente tiene una línea de crédito autorizada y activa.' },
        { q: '¿Se desglosan las comisiones de tarjeta?', a: 'Sí, si configuras un factor de comisión (ej. 3.0% en tarjeta), el POS desglosará el costo en el desglose final del ticket.' }
      ]
    }
  },
  {
    name: 'Preferencias de Cuentas de Bancos',
    path: '/preferencias/bancos',
    category: 'Preferencias',
    description: 'Control de terminales bancarias asignadas a las cajas y registro de cuentas de depósito comercial.',
    keywords: ['cuentas bancarias', 'terminales', 'bancos preferencias', 'cuentas de deposito', 'banco terminal'],
    manual: {
      purpose: 'Llevar el registro exacto de las cuentas y terminales donde se depositan los ingresos electrónicos de la sucursal.',
      steps: [
        'Ve a Preferencias > Cuentas y Bancos.',
        'Haz clic en "Agregar Cuenta Bancaria" y escribe el banco, número de cuenta y CLABE.',
        'Asocia la cuenta bancaria a la Terminal de Tarjetas del punto de venta.',
        'El sistema conciliará de forma automatizada los cortes de tarjeta del POS con tus saldos en banco.'
      ],
      faq: [
        { q: '¿Puedo asociar una terminal a varias cajas?', a: 'Sí, puedes asignar una terminal bancaria física a una o más cajas de la sucursal en este módulo.' },
        { q: '¿Dónde se reflejan las comisiones bancarias?', a: 'En el reporte mensual de egresos financieros en la sección de contabilidad.' }
      ]
    }
  },
  {
    name: 'Preferencias de Notificaciones WhatsApp',
    path: '/preferencias/notificaciones',
    category: 'Preferencias',
    description: 'Mensajes automáticos enviados por WhatsApp: alertas de envío, recordatorios de cobro y avisos de puntos.',
    keywords: ['notificaciones automaticas', 'whatsapp alertas', 'avisos clientes', 'plantillas whatsapp', 'mensajes pos'],
    manual: {
      purpose: 'Automatizar la comunicación directa con tus clientes a través de WhatsApp para mejorar la experiencia de compra y cobranza.',
      steps: [
        'Ve a Preferencias > Notificaciones.',
        'Activa los disparadores automáticos sugeridos (ej. "Enviar ticket digital al cobrar", "Aviso de ruta de reparto en camino").',
        'Personaliza la plantilla de texto de cada mensaje usando variables dinámicas como {cliente}, {folio} y {monto}.',
        'Presiona "Guardar". El sistema enviará los mensajes por detrás a través del CRM sincronizado.'
      ],
      faq: [
        { q: '¿Este servicio tiene costo extra?', a: 'No, el envío automatizado se procesa a través de tu sesión de WhatsApp Web vinculada en el sistema sin costo adicional.' },
        { q: '¿Cómo sé si los mensajes se enviaron con éxito?', a: 'Puedes auditar la bitácora de envíos en el panel de control de WhatsApp CRM en cualquier momento.' }
      ]
    }
  },
  {
    name: 'Preferencias de Configuración de Etiquetas',
    path: '/preferencias/etiquetas',
    category: 'Preferencias',
    description: 'Ajustes visuales para la impresión de etiquetas de códigos de barras (ej. Brother QL-800) y dimensiones.',
    keywords: ['etiquetas configuracion', 'brother ql 800', 'ancho etiqueta', 'codigo barra diseño', 'imprimir stickers'],
    manual: {
      purpose: 'Definir el tamaño de papel de las etiquetas, márgenes y campos a imprimir en tus códigos de barras.',
      steps: [
        'Ve a Preferencias > Etiquetas.',
        'Selecciona el modelo de tu impresora de etiquetas y define las dimensiones del papel (sugerido: 62mm x 20mm).',
        'Elige los campos que se incluirán en el sticker (ej. Código de barra, Precio, Nombre del producto, Categoría).',
        'Presiona "Guardar". Ya podrás imprimir etiquetas directamente desde el listado de productos o recepciones de compras.'
      ],
      faq: [
        { q: '¿Se requiere software Brother instalado?', a: 'Sí, asegúrate de instalar el controlador nativo de la Brother QL-800 en Windows/Mac y tener la impresora conectada antes de mandar a imprimir.' },
        { q: '¿Cómo evito que el código de barras salga cortado?', a: 'En las dimensiones, verifica que el ancho del papel configurado coincida exactamente con el rollo de etiquetas cargado en tu hardware.' }
      ]
    }
  },
  {
    name: 'Preferencias del Motor de Lealtad (Puntos)',
    path: '/preferencias/puntos',
    category: 'Preferencias',
    description: 'Reglas para premiar a tus clientes: factor de puntos por peso comprado, vigencias y reglas de monedero.',
    keywords: ['lealtad', 'puntos configurar', 'fidelizacion', 'monedero electronico', 'reglas de puntos', 'peso por punto'],
    manual: {
      purpose: 'Fidelizar a tus clientes recurrentes premiándolos con un monedero electrónico que los incentiva a regresar a comprar.',
      steps: [
        'Navega a Preferencias > Puntos de Lealtad.',
        'Establece la regla de acumulación (ej. 1 punto por cada $10.00 de compra en efectivo).',
        'Define el valor de canje del punto (ej. 1 punto = $1.00 de saldo a favor en caja).',
        'Establece si los puntos tienen vigencia anual o si se cancelan tras periodos de inactividad.',
        'Guarda los cambios para que el POS los inyecte automáticamente al asociar un cliente.'
      ],
      faq: [
        { q: '¿Se acumulan puntos al pagar a crédito?', a: 'Por defecto, la acumulación se restringe a pagos de contado, pero puedes activar la opción "Acumular puntos en abonos a crédito" si lo consideras adecuado.' },
        { q: '¿Cómo canjea el cliente sus puntos en caja?', a: 'En el POS, al cobrar a un cliente con puntos, selecciona "Pagar con Monedero" e ingresa el monto equivalente en base a su balance.' }
      ]
    }
  },
  {
    name: 'Preferencias de Fabricación y Recetas',
    path: '/preferencias/fabricacion',
    category: 'Preferencias',
    description: 'Configura las reglas para fabricar productos: mermas de insumos toleradas y costos indirectos.',
    keywords: ['fabricacion recetas', 'insumos de produccion', 'costo de fabricacion', 'reglas de recetas', 'mermas toleradas'],
    manual: {
      purpose: 'Establecer los factores matemáticos e insumos predeterminados para la fabricación automatizada de productos compuestos.',
      steps: [
        'Ve a Preferencias > Fabricación.',
        'Define el factor de costo indirecto de manufactura (ej. porcentaje adicional por luz, gas o mano de obra).',
        'Establece las mermas promedio toleradas de ingredientes básicos (Harina, Levadura).',
        'Presiona "Guardar". Los cálculos se aplicarán al emitir órdenes de producción en el módulo de panadería.'
      ],
      faq: [
        { q: '¿Qué es el costo indirecto?', a: 'Es un porcentaje sugerido para amortizar los costos de mano de obra y servicios de la planta en el costo unitario de tu pan o producto final.' },
        { q: '¿El sistema bloquea producciones si no hay insumos?', a: 'Sí, a menos que actives la casilla "Permitir inventario de insumos en negativo" en este panel de configuración.' }
      ]
    }
  }
];

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchItem | null>(null);
  const [activeTab, setActiveTab] = useState<'purpose' | 'steps' | 'faq'>('purpose');
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Diacritic-insensitive Search Logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchVal = normalizeString(query);
    const searchTokens = searchVal.split(/\s+/).filter(Boolean);

    if (searchTokens.length === 0) {
      setResults([]);
      return;
    }

    // Fuzzy matching / Levenshtein distance helper
    const levenshteinDistance = (a: string, b: string): number => {
      const tmp = [];
      for (let i = 0; i <= a.length; i++) tmp.push([i]);
      for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          tmp[i][j] = Math.min(
            tmp[i - 1][j] + 1,
            tmp[i][j - 1] + 1,
            tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
          );
        }
      }
      return tmp[a.length][b.length];
    };

    const isFuzzyMatch = (wordA: string, wordB: string): boolean => {
      if (wordB.includes(wordA) || wordA.includes(wordB)) return true;
      const maxDistance = wordA.length >= 5 ? 2 : 1;
      if (wordA.length >= 3 && wordB.length >= 3) {
        const dist = levenshteinDistance(wordA, wordB);
        if (dist <= maxDistance) return true;
      }
      return false;
    };

    const scored = SEARCH_DIRECTORY.map(item => {
      const nameNorm = normalizeString(item.name);
      const descNorm = normalizeString(item.description);
      const catNorm = normalizeString(item.category);
      const itemTokens = [
        ...nameNorm.split(/\s+/),
        ...descNorm.split(/\s+/),
        ...catNorm.split(/\s+/),
        ...item.keywords.map(normalizeString)
      ].filter(Boolean);

      let matches = 0;
      let score = 0;

      for (const sToken of searchTokens) {
        // Direct match on name (highest priority)
        if (nameNorm.includes(sToken)) {
          score += 10;
          matches++;
          continue;
        }

        // Direct match on keywords
        const directKeywordMatch = item.keywords.some(kw => normalizeString(kw).includes(sToken));
        if (directKeywordMatch) {
          score += 5;
          matches++;
          continue;
        }

        // Direct match on description or category
        if (descNorm.includes(sToken) || catNorm.includes(sToken)) {
          score += 2;
          matches++;
          continue;
        }

        // Fuzzy match
        const hasFuzzy = itemTokens.some(iToken => isFuzzyMatch(sToken, iToken));
        if (hasFuzzy) {
          score += 1;
          matches++;
        }
      }

      return { item, score, matches };
    });

    const filtered = scored
      .filter(entry => entry.matches > 0)
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.item);

    setResults(filtered.slice(0, 8)); // Expanded view list cap
  }, [query]);

  // Dynamic Print PDF Function
  const handlePrint = (item: SearchItem) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Manual de Usuario - ${item.name}</title>
            <style>
              body { 
                font-family: system-ui, -apple-system, sans-serif; 
                padding: 3rem; 
                color: #1e293b; 
                max-width: 800px; 
                margin: 0 auto; 
                line-height: 1.6; 
              }
              .header-container {
                border-bottom: 3px solid #4f46e5;
                padding-bottom: 1rem;
                margin-bottom: 2rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              h1 { 
                color: #4f46e5; 
                margin: 0;
                font-size: 2.2rem; 
                font-weight: 800;
                letter-spacing: -0.03em;
              }
              .meta-badge {
                background-color: #f1f5f9;
                color: #475569;
                padding: 0.35rem 0.75rem;
                border-radius: 9999px;
                font-size: 0.85rem;
                font-weight: 600;
              }
              h2 { 
                color: #1e293b; 
                font-size: 1.4rem; 
                margin-top: 2rem; 
                border-bottom: 1px solid #e2e8f0; 
                padding-bottom: 0.35rem; 
                font-weight: 700;
              }
              p { 
                font-size: 1rem; 
                color: #334155; 
              }
              ul, ol { 
                margin-bottom: 1.5rem; 
                color: #334155; 
                padding-left: 1.5rem;
              }
              li { 
                margin-bottom: 0.65rem; 
              }
              .faq-item { 
                margin-bottom: 1.25rem; 
                background-color: #f8fafc; 
                padding: 1.25rem; 
                border-radius: 8px; 
                border-left: 4px solid #4f46e5; 
              }
              .faq-q { 
                font-weight: 700; 
                color: #1e293b; 
                margin-bottom: 0.35rem; 
              }
              .faq-a { 
                color: #475569; 
              }
              .footer { 
                margin-top: 4rem; 
                text-align: center; 
                font-size: 0.8rem; 
                color: #94a3b8; 
                border-top: 1px solid #e2e8f0; 
                padding-top: 1.5rem; 
              }
            </style>
          </head>
          <body>
            <div class="header-container">
              <h1>Manual de Usuario: ${item.name}</h1>
              <span class="meta-badge">${item.category}</span>
            </div>
            
            <h2>1. Propósito y Explicación del Módulo</h2>
            <p>${item.manual.purpose}</p>
            <p><strong>Descripción corta:</strong> ${item.description}</p>
            
            <h2>2. Guía de Uso Paso a Paso</h2>
            <ol>
              ${item.manual.steps.map(step => `<li>${step}</li>`).join('')}
            </ol>
            
            <h2>3. Preguntas Frecuentes (FAQ)</h2>
            <div>
              ${item.manual.faq.map(f => `
                <div class="faq-item">
                  <div class="faq-q">P: ${f.q}</div>
                  <div class="faq-a">R: ${f.a}</div>
                </div>
              `).join('')}
            </div>
            
            <div class="footer">
              Generado Automáticamente por CAANMA PRO - Manual Técnico Corporativo.
              <br/>© ${new Date().getFullYear()} CAANMA S.A. de C.V. Todos los derechos reservados.
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '280px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Search Input Container */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search 
          size={16} 
          color="#64748b" 
          style={{ position: 'absolute', left: '0.85rem', pointerEvents: 'none' }} 
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Buscar módulo o proceso..."
          style={{
            width: '100%',
            padding: '0.5rem 1rem 0.5rem 2.25rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            borderRadius: '9999px',
            border: '1px solid #e2e8f0',
            outline: 'none',
            backgroundColor: '#f8fafc',
            color: '#1e293b',
            transition: 'all 0.2s ease-in-out',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
          }}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            style={{
              position: 'absolute',
              right: '0.75rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={14} color="#94a3b8" />
          </button>
        )}
      </div>

      {/* Auto-suggest Dropdown */}
      {showDropdown && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 0.5rem)',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          zIndex: 999,
          overflow: 'hidden',
          animation: 'slideDown 0.15s ease-out'
        }}>
          {results.map((item) => (
            <div
              key={item.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #f1f5f9',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                backgroundColor: 'white'
              }}
              onClick={() => {
                router.push(item.path);
                setShowDropdown(false);
                setQuery('');
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#4f46e5', backgroundColor: '#eef2ff', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                    {item.category}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.description}
                </p>
              </div>

              {/* BookOpen Button for User Manual */}
              <button
                type="button"
                title="Abrir Manual de Usuario"
                onClick={(e) => {
                  e.stopPropagation(); // Avoid triggering navigation
                  setSelectedItem(item);
                  setActiveTab('purpose');
                }}
                style={{
                  padding: '0.4rem',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4f46e5',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4f46e5';
                  e.currentTarget.style.backgroundColor = '#eef2ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <BookOpen size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Manual de Usuario Modal */}
      {selectedItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.25s ease'
        }}>
          <div style={{
            width: '90%',
            maxWidth: '650px',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh',
            animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
              color: 'white',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {selectedItem.category}
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0.35rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={20} /> Manual: {selectedItem.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.85,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.85'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs Bar */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              padding: '0.5rem 1.5rem 0 1.5rem',
              gap: '1rem'
            }}>
              <button
                onClick={() => setActiveTab('purpose')}
                style={{
                  padding: '0.75rem 0.5rem',
                  border: 'none',
                  background: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  color: activeTab === 'purpose' ? '#4f46e5' : '#64748b',
                  borderBottom: activeTab === 'purpose' ? '3px solid #4f46e5' : '3px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                📖 Propósito y Uso
              </button>
              <button
                onClick={() => setActiveTab('steps')}
                style={{
                  padding: '0.75rem 0.5rem',
                  border: 'none',
                  background: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  color: activeTab === 'steps' ? '#4f46e5' : '#64748b',
                  borderBottom: activeTab === 'steps' ? '3px solid #4f46e5' : '3px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                ⚡ Guía Paso a Paso
              </button>
              <button
                onClick={() => setActiveTab('faq')}
                style={{
                  padding: '0.75rem 0.5rem',
                  border: 'none',
                  background: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  color: activeTab === 'faq' ? '#4f46e5' : '#64748b',
                  borderBottom: activeTab === 'faq' ? '3px solid #4f46e5' : '3px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                ❓ Preguntas Frecuentes
              </button>
            </div>

            {/* Modal Body Scroll Container */}
            <div style={{
              flex: 1,
              padding: '1.5rem 2rem',
              overflowY: 'auto',
              fontSize: '0.95rem',
              color: '#334155',
              lineHeight: '1.6'
            }}>
              {/* Propósito Tab */}
              {activeTab === 'purpose' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <p style={{ fontSize: '1rem', fontWeight: '500', color: '#1e293b', margin: 0 }}>
                    ¿Para qué sirve este módulo?
                  </p>
                  <p style={{ margin: 0 }}>
                    {selectedItem.manual.purpose}
                  </p>
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    borderRadius: '10px',
                    backgroundColor: '#eef2ff',
                    border: '1px solid #e0e7ff',
                    fontSize: '0.875rem',
                    color: '#3730a3'
                  }}>
                    💡 <strong>Resumen Operativo:</strong> {selectedItem.description}
                  </div>
                </div>
              )}

              {/* Pasos Tab */}
              {activeTab === 'steps' && (
                <div>
                  <p style={{ fontSize: '1rem', fontWeight: '500', color: '#1e293b', marginBottom: '1rem' }}>
                    Flujo de Operación Estándar (Paso a Paso):
                  </p>
                  <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedItem.manual.steps.map((step, idx) => (
                      <li key={idx} style={{ paddingLeft: '0.25rem' }}>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* FAQ Tab */}
              {activeTab === 'faq' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {selectedItem.manual.faq.map((f, idx) => (
                    <div key={idx} style={{
                      backgroundColor: '#f8fafc',
                      padding: '1rem 1.25rem',
                      borderRadius: '8px',
                      borderLeft: '4px solid #3b82f6'
                    }}>
                      <div style={{ fontWeight: '750', color: '#1e293b', marginBottom: '0.35rem' }}>
                        P: {f.q}
                      </div>
                      <div style={{ color: '#475569', fontSize: '0.9rem' }}>
                        R: {f.a}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div style={{
              padding: '1.25rem 2rem',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              {/* Print/Download Button */}
              <button
                onClick={() => handlePrint(selectedItem)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  backgroundColor: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#334155',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#94a3b8';
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <Printer size={16} /> Descargar Manual (PDF)
              </button>

              {/* Direct Navigation Button */}
              <button
                onClick={() => {
                  router.push(selectedItem.path);
                  setSelectedItem(null);
                  setShowDropdown(false);
                  setQuery('');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  backgroundColor: '#4f46e5',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 10px rgba(79, 70, 229, 0.15)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4338ca';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#4f46e5';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                Ingresar al Módulo <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Animations and Keyframes */}
      <style jsx global>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
