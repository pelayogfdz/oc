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
  requiredPermission?: string | string[];
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
      { name: 'Catálogo de Productos', path: '/productos', requiredPermission: ['inv_view'] },
      { name: 'Actualización Masiva de Precios', path: '/productos/precios-masivos', badge: 'Precios', requiredPermission: ['inv_edit'] },
      { name: 'Costos y Proveedores', path: '/productos/costos-proveedor', badge: 'Costos', requiredPermission: ['inv_cost'] },
      { name: 'Traspasos entre Sucursales', path: '/productos/traspasos', requiredPermission: ['inv_transfer'] },
      { name: 'Ajustes de Inventario', path: '/productos/ajustes', requiredPermission: ['inv_adjust'] },
      { name: 'Toma Física de Inventario', path: '/productos/auditorias', requiredPermission: ['inv_adjust'] },
      { name: 'Creador de Catálogos', path: '/ventas/catalogos', requiredPermission: ['inv_view'] },
    ]
  },
  { 
    title: 'Clientes', icon: <Users size={20} />,
    requiredPermission: ['admin_customers_view'],
    items: [
      { name: 'Directorio de Clientes', path: '/clientes', requiredPermission: ['admin_customers_view'] },
      { name: 'Portal B2B', path: '/clientes/b2b', requiredPermission: ['admin_customers_view'] }
    ]
  },
  { 
    title: 'Ventas', icon: <Banknote size={20} />, 
    requiredPermission: ['pos_access', 'pos_discount', 'pos_cancel', 'pos_returns'],
    items: [
      { name: 'Historial de Ventas', path: '/ventas', requiredPermission: ['pos_view_history'] },
      { name: 'Bandeja WhatsApp', path: '/ventas/whatsapp', badge: 'Admin', desktopOnly: true, requiredPermission: ['pos_access'] },
      { name: 'Conexión WhatsApp', path: '/configuracion/whatsapp', badge: 'CRM', desktopOnly: true, requiredPermission: ['pos_access'] },
      { name: 'Prospección (CRM)', path: '/ventas/prospeccion', badge: 'Kanban', desktopOnly: true, requiredPermission: ['pos_access'] },
      { name: 'Promociones y Descuentos', path: '/ventas/promociones', requiredPermission: ['pos_assign_promotions'] },
      { name: 'Devoluciones', path: '/ventas/devoluciones', requiredPermission: ['pos_returns'] },
      { name: 'Cotizaciones', path: '/ventas/cotizaciones', requiredPermission: ['admin_quotes_access'] },
      { name: 'Consignaciones', path: '/ventas/consignaciones', requiredPermission: ['pos_view_history'] },
      { name: 'Citas y Calendario', path: '/ventas/citas', badge: 'CRM', requiredPermission: ['pos_access'] },
    ]
  },
  { 
    title: 'Facturas', icon: <FileText size={20} />, 
    requiredPermission: ['facturacion'],
    items: [
      { name: 'Facturación CFDI 4.0', path: '/facturas/ventas', requiredPermission: ['fact_cfdi_access'] },
      { name: 'Factura Global (Público en General)', path: '/facturas/globales', requiredPermission: ['fact_global_access'] },
      { name: 'Complementos de Pago (REP)', path: '/facturas/complementos', badge: 'REP', requiredPermission: ['fact_rep_access'] },
    ]
  },
  { 
    title: 'Compras y gastos', icon: <ShoppingCart size={20} />, 
    requiredPermission: ['admin_purchases_access'],
    items: [
      { name: 'Compras', path: '/productos/compras', requiredPermission: ['admin_purchases_access'] },
      { name: 'Solicitudes', path: '/productos/solicitudes', badge: 'Nuevo', requiredPermission: ['admin_purchases_access'] },
      { name: 'Pedidos a Proveedores', path: '/productos/pedidos', requiredPermission: ['admin_purchases_access'] },
      { name: 'Nuevo Pedido / Sugerido', path: '/productos/pedidos/nuevo', badge: 'Nuevo', requiredPermission: ['admin_purchases_access'] },
      { name: 'Registro de Gastos', path: '/productos/gastos', requiredPermission: ['admin_purchases_access'] },
      { name: 'Directorio de Proveedores', path: '/proveedores', requiredPermission: ['admin_purchases_access'] },
      { name: 'Control de Caducidades', path: '/productos/caducidades', badge: 'Alertas', requiredPermission: ['admin_purchases_access'] },
    ]
  },
  { 
    title: 'Caja', icon: <Calculator size={20} />, 
    requiredPermission: ['cash_open_close', 'cash_movements', 'cash_audit'],
    items: [
      { name: 'Apertura y Corte de Caja', path: '/caja/actual', requiredPermission: ['cash_open_close'] },
      { name: 'Histórico de Cortes', path: '/caja/cortes', requiredPermission: ['cash_open_close'] },
      { name: 'Cortes y Cajas Generales', path: '/preferencias/cajas', requiredPermission: ['cash_audit'] },
    ]
  },

  // Grupo 2
  { 
    title: 'Logística', icon: <Truck size={20} />, 
    requiredPermission: ['logistica_access'],
    items: [
      { name: 'Entregas y Rutas', path: '/logistica', badge: 'Nuevo', requiredPermission: ['logistica_access'] },
      { name: 'Mi Ruta (Chofer)', path: '/logistica/chofer', requiredPermission: ['logistica_access'] },
      { name: 'Logística de Combustibles', path: '/logistica/combustibles', badge: 'Fletes', requiredPermission: ['logistica_access'] },
    ]
  },
  { 
    title: 'Procesos', icon: <ClipboardList size={20} />, 
    requiredPermission: ['panaderia_access'],
    items: [
      { name: 'Tareas', path: '/procesos/tareas', requiredPermission: ['panaderia_access'] },
      { name: 'Órdenes de Producción', path: '/procesos', badge: 'Activas', requiredPermission: ['panaderia_access'] },
      { name: 'Fórmulas e Insumos', path: '/procesos/formulas', requiredPermission: ['panaderia_access'] },
    ]
  },
  { 
    title: 'Recursos Humanos', icon: <Briefcase size={20} />, 
    requiredPermission: ['rh'],
    items: [
      { name: 'Monitoreo de Asistencia', path: '/rh/monitoreo', requiredPermission: ['rh_monitoreo'] },
      { name: 'Calendario de Incidencias', path: '/rh/calendario', requiredPermission: ['rh_calendario'] },
      { name: 'Reportes Históricos', path: '/rh/reportes', requiredPermission: ['rh_reportes'] },
      { name: 'Ubicaciones GPS', path: '/rh/gps', badge: 'Nuevo', requiredPermission: ['rh_gps'] },
      { name: 'Trámites y Avisos', path: '/rh/tramites', requiredPermission: ['rh_tramites'] },
      { name: 'Cálculo de Nómina', path: '/rh/nomina', badge: 'Nuevo', requiredPermission: ['rh_nomina'] },
    ]
  },
  { 
    title: 'Finanzas', icon: <Landmark size={20} />, 
    requiredPermission: ['finanzas'],
    items: [
      { name: 'Conciliación Bancaria', path: '/finanzas/conciliacion', requiredPermission: ['fin_conciliacion'] },
      { name: 'Cuentas por Cobrar (CxC)', path: '/clientes/cobranza', badge: 'Activos', requiredPermission: ['fin_cxc'] },
      { name: 'Cuentas por Pagar (CxP)', path: '/proveedores/cuentas', badge: 'Pasivos', requiredPermission: ['fin_cxp'] },
    ]
  },
  { 
    title: 'Ventas Online', icon: <MonitorSmartphone size={20} />, 
    requiredPermission: ['ventas_online'],
    items: [
      { name: 'Tu Catálogo en Línea B2C', path: '/catalogo', badge: 'Nuevo', requiredPermission: ['online_b2c'] },
      { name: 'Portal de Clientes B2B', path: '/clientes/b2b', requiredPermission: ['online_b2b'] },
      { name: 'Portal de Autofacturación', path: '/clientes/portal', requiredPermission: ['online_autofact'] },
      { name: 'Integraciones (Mercado Libre/Amazon)', path: '/integraciones', requiredPermission: ['online_integrations'] },
      { name: 'Órdenes Web', path: '/catalogo/ordenes', requiredPermission: ['online_orders'] },
    ]
  },
  { 
    title: 'Reportes', icon: <BarChart3 size={20} />, 
    requiredPermission: ['admin_reports_access'],
    items: [
      { name: 'Panel de Reportes', path: '/reportes', requiredPermission: ['admin_reports_access'] },
      { name: 'Facturación CFDI 4.0', path: '/reportes/facturacion', badge: 'Nuevo', requiredPermission: ['admin_reports_access'] },
      { name: 'Desempeño de Consignaciones', path: '/reportes/consignaciones', badge: 'Nuevo', requiredPermission: ['admin_reports_access'] },
    ],
    hasDividerAfter: true
  },

  // Grupo 3
  { 
    title: 'Mi Portal', path: '/mi-portal', icon: <UserCircle size={20} /> 
  },
  { 
    title: 'Asistencia', path: '/rh/kiosko', icon: <Clock size={20} />,
    requiredPermission: ['kiosko_access']
  },
  { 
    title: 'Preferencias', path: '/preferencias/general', icon: <Settings size={20} />, 
    requiredPermission: ['sys_settings_access', 'sys_users'] 
  }
];

export const footerNodes: MenuNode[] = [];
