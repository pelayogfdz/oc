import React from 'react';
import { 
  Home, Tag, Package, Calculator, ArrowRightLeft, 
  Settings, UserCircle, ShoppingCart, Banknote, FileText,
  Sparkles, MonitorSmartphone, Landmark, BarChart3, Inbox, Briefcase, Truck, ChefHat, ClipboardList,
  PlusCircle, Users, Clock
} from 'lucide-react';

export type MenuItem = {
  name: string;
  path: string;
  badge?: string;
  desktopOnly?: boolean;
};

export type MenuNode = {
  title: string;
  path?: string; // If it's a direct link
  icon?: React.ReactNode;
  badge?: string;
  items?: MenuItem[]; // If it's a dropdown
  desktopOnly?: boolean;
  requiredPermission?: string | string[]; // Permission ID(s) needed to show
  hasDividerAfter?: boolean; // If a divider should be rendered after this node
};

export const navStructure: MenuNode[] = [
  // Grupo 1
  { 
    title: 'Nueva Venta', 
    path: '/ventas/nueva', 
    icon: <PlusCircle size={20} />,
    requiredPermission: ['pos_access']
  },
  { 
    title: 'Productos', icon: <Tag size={20} />, 
    requiredPermission: ['inv_view', 'inv_edit', 'inv_adjust', 'inv_transfer'],
    items: [
      { name: 'Catálogo de Productos', path: '/productos' },
      { name: 'Actualización Masiva de Precios', path: '/productos/precios-masivos', badge: 'Precios' },
      { name: 'Costos y Proveedores', path: '/productos/costos-proveedor', badge: 'Costos' },
      { name: 'Traspasos entre Sucursales', path: '/productos/traspasos' },
      { name: 'Ajustes de Inventario', path: '/productos/ajustes' },
      { name: 'Toma Física de Inventario', path: '/productos/auditorias' },
    ]
  },
  { 
    title: 'Clientes', icon: <Users size={20} />,
    requiredPermission: ['admin_customers_view'],
    items: [
      { name: 'Directorio de Clientes', path: '/clientes' },
      { name: 'Portal B2B', path: '/clientes/b2b' }
    ]
  },
  { 
    title: 'Ventas', icon: <Banknote size={20} />, 
    requiredPermission: ['pos_access', 'pos_discount', 'pos_cancel', 'pos_returns'],
    items: [
      { name: 'Historial de Ventas', path: '/ventas' },
      { name: 'Bandeja WhatsApp', path: '/ventas/whatsapp', badge: 'Admin', desktopOnly: true },
      { name: 'Conexión WhatsApp', path: '/configuracion/whatsapp', badge: 'CRM', desktopOnly: true },
      { name: 'Prospección (CRM)', path: '/ventas/prospeccion', badge: 'Kanban', desktopOnly: true },
      { name: 'Promociones y Descuentos', path: '/ventas/promociones' },
      { name: 'Devoluciones', path: '/ventas/devoluciones' },
      { name: 'Cotizaciones', path: '/ventas/cotizaciones' },
      { name: 'Consignaciones', path: '/ventas/consignaciones' },
      { name: 'Catálogos de Artículos', path: '/ventas/catalogos' },
      { name: 'Citas y Calendario', path: '/ventas/citas', badge: 'CRM' },
    ]
  },
  { 
    title: 'Facturas', icon: <FileText size={20} />, 
    requiredPermission: ['pos_access', 'admin_reports_access'],
    items: [
      { name: 'Facturación CFDI 4.0', path: '/facturas/ventas' },
      { name: 'Factura Global (Público en General)', path: '/facturas/globales' },
      { name: 'Complementos de Pago (REP)', path: '/facturas/complementos', badge: 'REP' },
    ]
  },
  { 
    title: 'Compras y gastos', icon: <ShoppingCart size={20} />, 
    requiredPermission: ['admin_purchases_access'],
    items: [
      { name: 'Compras', path: '/productos/compras' },
      { name: 'Solicitudes', path: '/productos/solicitudes', badge: 'Nuevo' },
      { name: 'Pedidos a Proveedores', path: '/productos/pedidos' },
      { name: 'Registro de Gastos', path: '/productos/gastos' },
      { name: 'Directorio de Proveedores', path: '/proveedores' },
      { name: 'Control de Caducidades', path: '/productos/caducidades', badge: 'Alertas' },
    ]
  },
  { 
    title: 'Caja', icon: <Calculator size={20} />, 
    requiredPermission: ['cash_open_close', 'cash_movements', 'cash_audit'],
    items: [
      { name: 'Apertura y Corte de Caja', path: '/caja/actual' },
      { name: 'Histórico de Cortes', path: '/caja/cortes' },
      { name: 'Cortes y Cajas Generales', path: '/preferencias/cajas' },
    ],
    hasDividerAfter: true
  },

  // Grupo 2
  { 
    title: 'Logística', icon: <Truck size={20} />, 
    requiredPermission: ['logistica_access'],
    items: [
      { name: 'Entregas y Rutas', path: '/logistica', badge: 'Nuevo' },
      { name: 'Mi Ruta (Chofer)', path: '/logistica/chofer' },
    ]
  },
  { 
    title: 'Procesos', icon: <ClipboardList size={20} />, 
    requiredPermission: ['panaderia_access'],
    items: [
      { name: 'Tareas', path: '/procesos/tareas' },
      { name: 'Órdenes de Producción', path: '/procesos', badge: 'Activas' },
      { name: 'Fórmulas e Insumos', path: '/procesos/formulas' },
    ]
  },
  { 
    title: 'Recursos Humanos', icon: <Briefcase size={20} />, 
    requiredPermission: ['admin_reports_access'],
    items: [
      { name: 'Monitoreo de Asistencia', path: '/rh/monitoreo' },
      { name: 'Calendario de Incidencias', path: '/rh/calendario' },
      { name: 'Reportes Históricos', path: '/rh/reportes' },
      { name: 'Ubicaciones GPS', path: '/rh/ubicaciones', badge: 'Nuevo' },
      { name: 'Trámites y Avisos', path: '/rh/tramites' },
      { name: 'Cálculo de Nómina', path: '/rh/nomina', badge: 'Nuevo' },
    ]
  },
  { 
    title: 'Finanzas', icon: <Landmark size={20} />, 
    requiredPermission: ['admin_reports_access'],
    items: [
      { name: 'Conciliación Bancaria', path: '/finanzas/conciliacion' },
      { name: 'Cuentas por Cobrar (CxC)', path: '/clientes/cobranza', badge: 'Activos' },
      { name: 'Cuentas por Pagar (CxP)', path: '/proveedores/cuentas', badge: 'Pasivos' },
    ]
  },
  { 
    title: 'Ventas Online', icon: <MonitorSmartphone size={20} />, 
    requiredPermission: ['sys_integrations'],
    items: [
      { name: 'Tu Catálogo en Línea B2C', path: '/catalogo', badge: 'Nuevo' },
      { name: 'Portal de Clientes B2B', path: '/clientes/b2b' },
      { name: 'Portal de Autofacturación', path: '/clientes/portal' },
      { name: 'Integraciones (Mercado Libre/Amazon)', path: '/integraciones' },
      { name: 'Órdenes Web', path: '/catalogo/ordenes' },
    ]
  },
  { 
    title: 'Reportes', icon: <BarChart3 size={20} />, 
    requiredPermission: ['admin_reports_access'],
    items: [
      { name: 'Panel de Reportes', path: '/reportes' },
      { name: 'Reporte de Producción', path: '/reportes/produccion' },
      { name: 'Facturación CFDI 4.0', path: '/reportes/facturacion', badge: 'Nuevo' },
      { name: 'Desempeño de Consignaciones', path: '/reportes/consignaciones', badge: 'Nuevo' },
    ],
    hasDividerAfter: true
  },

  // Grupo 3
  { 
    title: 'Mi Portal', path: '/mi-portal', icon: <UserCircle size={20} /> 
  },
  { 
    title: 'Asistencia', path: '/rh/kiosko', icon: <Clock size={20} />,
    requiredPermission: ['admin_reports_access']
  },
  { 
    title: 'Preferencias', path: '/preferencias/general', icon: <Settings size={20} />, 
    requiredPermission: ['sys_settings_access', 'sys_users'] 
  }
];

export const footerNodes: MenuNode[] = [];
