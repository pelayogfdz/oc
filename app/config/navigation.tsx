import React from 'react';
import { 
  Home, Tag, Package, Calculator, ArrowRightLeft, 
  Settings, UserCircle, ShoppingCart, Banknote, FileText,
  Sparkles, MonitorSmartphone, Landmark, BarChart3, Inbox
} from 'lucide-react';

export type MenuItem = {
  name: string;
  path: string;
  badge?: string;
};

export type MenuNode = {
  title: string;
  path?: string; // If it's a direct link
  icon?: React.ReactNode;
  badge?: string;
  items?: MenuItem[]; // If it's a dropdown
};

export const navStructure: MenuNode[] = [
  { title: 'IA', path: '/ia', icon: <Sparkles size={20} /> },
  { 
    title: 'Ventas', icon: <Banknote size={20} />, 
    items: [
      { name: 'Historial de Ventas', path: '/ventas' },
      { name: 'Promociones y Descuentos', path: '/ventas/promociones' },
      { name: 'Devoluciones', path: '/ventas/devoluciones' },
      { name: 'Cotizaciones', path: '/ventas/cotizaciones' },
    ]
  },
  { 
    title: 'Caja', icon: <Calculator size={20} />, 
    items: [
      { name: 'Apertura y Corte de Caja', path: '/caja/actual' },
      { name: 'Histórico de Cortes', path: '/caja/cortes' },
      { name: 'Cortes y Cajas Generales', path: '/preferencias/cajas' },
    ]
  },
  { 
    title: 'Facturas', icon: <FileText size={20} />, 
    items: [
      { name: 'Facturación CFDI 4.0', path: '/facturas/ventas' },
      { name: 'Factura Global (Público en General)', path: '/facturas/globales' },
      { name: 'Complementos de Pago (REP)', path: '/facturas/complementos', badge: 'REP' },
    ]
  },
  { 
    title: 'Clientes', icon: <UserCircle size={20} />, 
    items: [
      { name: 'Directorio de Clientes', path: '/clientes' },
      { name: 'Cobranza (CxC)', path: '/clientes/cobranza', badge: 'Pendientes' },
      { name: 'Portal de Autofacturación', path: '/clientes/portal' },
      { name: 'Portal de Clientes B2B', path: '/clientes/b2b' },
    ]
  },
  { 
    title: 'Productos', icon: <Tag size={20} />, 
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
    title: 'Compras y Gastos', icon: <ShoppingCart size={20} />, 
    items: [
      { name: 'Órdenes de Compra', path: '/productos/compras' },
      { name: 'Pedidos a Proveedores', path: '/productos/pedidos' },
      { name: 'Registro de Gastos', path: '/productos/gastos' },
      { name: 'Directorio de Proveedores', path: '/proveedores' },
      { name: 'Cuentas por Pagar (CxP)', path: '/proveedores/cuentas', badge: 'Pasivos' },
    ]
  },
  { 
    title: 'Ventas Online', icon: <MonitorSmartphone size={20} />, 
    items: [
      { name: 'Tu Catálogo en Línea B2C', path: '/catalogo', badge: 'Nuevo' },
      { name: 'Integraciones (Mercado Libre/Amazon)', path: '/integraciones' },
      { name: 'Órdenes Web', path: '/catalogo/ordenes' },
    ]
  },
  { 
    title: 'Finanzas', icon: <Landmark size={20} />, 
    items: [
      { name: 'Conciliación Bancaria', path: '/finanzas/conciliacion' },
      { name: 'Cobranza (CxC)', path: '/clientes/cobranza', badge: 'Ingresos' },
      { name: 'Cuentas por Pagar (CxP)', path: '/proveedores/cuentas', badge: 'Egresos' },
    ]
  },
  { 
    title: 'Reportes', icon: <BarChart3 size={20} />, 
    items: [
      { name: 'Panel de Reportes', path: '/reportes' },
    ]
  }
];

export const footerNodes: MenuNode[] = [
  { title: 'Preferencias', path: '/preferencias', icon: <Settings size={20} /> },
];

