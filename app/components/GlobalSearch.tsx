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

// Complete system modules & submodules directory for CAANMA
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
    description: 'Listado exhaustivo de transacciones, devoluciones, re-impresiones de tickets y auditoría de egresos.',
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
    name: 'Bandeja de WhatsApp CRM (CRM)',
    path: '/ventas/prospeccion',
    category: 'CRM',
    description: 'Inbox multi-agente sincronizado con WhatsApp web para prospección comercial, CRM y envío directo de folios.',
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
    name: 'Cotizaciones Comerciales',
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
    name: 'Caja Actual y Turnos (Turno)',
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
    name: 'Control de Inventario y Productos',
    path: '/productos',
    category: 'Inventario',
    description: 'Administración de catálogo de productos, existencias, códigos de barras, listas de precios y variantes.',
    keywords: ['productos', 'inventario', 'stock', 'variantes', 'codigo de barras', 'costo', 'precios', 'editar producto'],
    manual: {
      purpose: 'Llevar el control centralizado de los artículos de tu sucursal, costos de adquisición y precios de venta al público.',
      steps: [
        'Accede a Productos desde el menú lateral.',
        'Haz clic en "+ Agregar Producto" para dar de alta un artículo nuevo, definiendo nombre, código de barra y stock inicial.',
        'Si manejas tallas o colores, habilita la opción de "Variantes" para desglosar el stock.',
        'Asigna precios base y asócialos a listas de precios personalizadas si cuentas con clientes mayoristas.'
      ],
      faq: [
        { q: '¿Cómo cargo mi inventario de forma masiva?', a: 'Usa la funcionalidad de Importación en Excel para cargar cientos de productos con existencias y códigos de barra de una sola vez.' },
        { q: '¿Qué es el stock mínimo?', a: 'Es la alerta que avisa al sistema cuando las existencias bajan del límite sugerido, agregando el producto al reporte de compras críticas.' }
      ]
    }
  },
  {
    name: 'Configuración de Impresoras y Tickets',
    path: '/preferencias/impresoras',
    category: 'Preferencias',
    description: 'Ajustes centralizados de hardware: QZ Tray silencioso, anchos de papel (80mm/58mm), impresión automática y certificados.',
    keywords: ['impresora', 'qz tray', 'certificado qz', 'impresion automatica', 'ancho ticket', 'papel termico', 'ip impresora'],
    manual: {
      purpose: 'Unificar toda la configuración de impresión de tickets y etiquetas en un solo lugar seguro e intuitivo.',
      steps: [
        'Navega a Preferencias > Impresoras y Tickets.',
        'Habilita o deshabilita la opción de "Impresión Automática al Cobrar" y define el ancho de papel (80mm/58mm).',
        'Para impresión directa sin advertencias de seguridad, descarga QZ Tray localmente y actívalo.',
        'Pega tu Certificado Público Digital y Clave Privada PEM en el formulario de la parte inferior.',
        'Presiona "Guardar Credenciales" y realiza una "Impresión de Prueba" para verificar la comunicación directa.'
      ],
      faq: [
        { q: '¿Por qué sigue saliendo el popup de QZ Tray?', a: 'Asegúrate de pegar correctamente las credenciales (incluyendo las líneas BEGIN y END del certificado y clave) y de guardar los cambios para habilitar la firma segura.' },
        { q: '¿Cómo imprimo a una impresora de red con IP?', a: 'Escribe la dirección IP física de tu impresora de tickets en el campo "Dirección IP de Impresora en Red" y el sistema le mandará las solicitudes vía socket raw.' }
      ]
    }
  },
  {
    name: 'Consecutivos y Folios',
    path: '/preferencias/folios',
    category: 'Preferencias',
    description: 'Personaliza los prefijos iniciales por sucursal y folia todos tus documentos a partir de la secuencia 1,001.',
    keywords: ['folios', 'consecutivos', 'prefijo', 'serie fiscal', 'consecutivo 1001', 'configurar folios', 'inicializar folios'],
    manual: {
      purpose: 'Estructurar una nomenclatura organizada para las ventas, compras, cotizaciones y traspasos de cada sucursal de tu organización.',
      steps: [
        'Ve a Preferencias > Consecutivos y Folios.',
        'Define el prefijo que identificará tu tienda (ej. "MTZ" para Matriz, "SUC" para Sucursal).',
        'Ingresa el consecutivo inicial sugerido (ej. "1001").',
        'Presiona el botón "Guardar". Puedes aplicar una inicialización masiva retroactiva a toda tu base histórica si lo necesitas.'
      ],
      faq: [
        { q: '¿Los folios son globales o por sucursal?', a: 'Cada sucursal gestiona sus folios y prefijos de forma independiente para evitar duplicados en sistemas multi-tienda.' },
        { q: '¿Puedo reiniciar la secuencia en cero?', a: 'Sí, pero se recomienda mantener una secuencia consecutiva lineal para evitar auditorías confusas.' }
      ]
    }
  },
  {
    name: 'Usuarios y Permisos',
    path: '/preferencias/usuarios',
    category: 'Preferencias',
    description: 'Gestión de personal de la sucursal, contraseñas, roles jerárquicos y permisos de acceso técnico.',
    keywords: ['usuarios', 'empleados', 'permisos', 'roles', 'crear usuario', 'cajeros', 'contraseña', 'acceso sucursales'],
    manual: {
      purpose: 'Controlar de forma segura quién tiene acceso a los diferentes módulos, reportes y privilegios del sistema comercial.',
      steps: [
        'Ve a Preferencias > Usuarios y Roles.',
        'Haz clic en "Crear Nuevo Usuario" y rellena los datos de nombre, email y contraseña inicial.',
        'Define su Rol (ADMIN para permisos completos, USER para limitados).',
        'Activa los permisos específicos del listado (ej. gestionar inventario, ver reportes, autorizar descuentos).',
        'Asigna la sucursal o sucursales autorizadas para su inicio de sesión.'
      ],
      faq: [
        { q: '¿Cómo restrinjo la visibilidad de costos de compra?', a: 'Desmarca el permiso "Ver costos de compra de productos" al configurar el rol del empleado en su perfil de usuario.' },
        { q: '¿Qué es la Visibilidad Global?', a: 'Es un permiso especial para administradores corporativos que les permite alternar entre todas las sucursales con un solo clic.' }
      ]
    }
  },
  {
    name: 'Diseñador de Formatos de Impresión',
    path: '/preferencias/formatos',
    category: 'Preferencias',
    description: 'Personaliza visualmente las plantillas y diseño de tus tickets, facturas fiscales y cotizaciones en PDF.',
    keywords: ['diseño ticket', 'formatos', 'plantilla', 'factura pdf', 'personalizar ticket', 'colores', 'diseñador de formatos'],
    manual: {
      purpose: 'Adaptar el diseño de tus documentos comerciales a la identidad de marca de tu empresa de manera responsiva y flexible.',
      steps: [
        'Ve a Preferencias > Diseñador de Formatos.',
        'Selecciona la pestaña del documento que deseas diseñar: Ticket, Factura o Cotización.',
        'Ajusta parámetros como tamaño de fuente, márgenes, visualización de logotipo, colores de cabecera y columnas visibles.',
        'Usa el visualizador en vivo a la derecha para ver cómo lucirá el ticket físico antes de guardar.'
      ],
      faq: [
        { q: '¿Puedo agregar mi logotipo al ticket de 80mm?', a: 'Sí, asegúrate de subir el logotipo en las Preferencias Generales y activar la casilla "Mostrar logotipo en el encabezado del ticket" en este diseñador.' },
        { q: '¿Cómo incluyo mis términos de garantía?', a: 'Escribe el texto en el campo "Pie del Ticket" de las configuraciones de sucursal para que aparezca automáticamente en la parte inferior.' }
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

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    const searchVal = query.toLowerCase().trim();
    const filtered = SEARCH_DIRECTORY.filter(item => {
      const matchName = item.name.toLowerCase().includes(searchVal);
      const matchDesc = item.description.toLowerCase().includes(searchVal);
      const matchCat = item.category.toLowerCase().includes(searchVal);
      const matchKeywords = item.keywords.some(kw => kw.toLowerCase().includes(searchVal));
      return matchName || matchDesc || matchCat || matchKeywords;
    });
    
    setResults(filtered.slice(0, 6)); // Cap at 6 results for elegance
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#4f46e5', backgroundColor: '#eef2ff', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
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
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
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
