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
    ]
  },
  { 
    title: 'Caja', icon: <Calculator size={20} />, 
    items: [
      { name: 'Cortes y Cajas', path: '/preferencias/cajas' },
    ]
  },
  { 
    title: 'Facturas', icon: <FileText size={20} />, 
    items: [
      { name: 'Facturación CFDI 4.0', path: '/facturas/ventas' },
      { name: 'Factura Global (Público en General)', path: '/facturas/globales' },
    ]
  },
  { 
    title: 'Clientes', icon: <UserCircle size={20} />, 
    items: [
      { name: 'Directorio de Clientes', path: '/clientes' },
      { name: 'Portal de Autofacturación', path: '/clientes/portal' },
    ]
  },
  { 
    title: 'Productos', icon: <Tag size={20} />, 
    items: [
      { name: 'Catálogo de Productos', path: '/productos' },
      { name: 'Traspasos entre Sucursales', path: '/productos/traspasos' },
    ]
  },
  { 
    title: 'Compras y Gastos', icon: <ShoppingCart size={20} />, 
    items: [
      { name: 'Pedidos a Proveedores', path: '/productos/pedidos' },
    ]
  },
  { 
    title: 'Ventas Online', icon: <MonitorSmartphone size={20} />, 
    items: [
      { name: 'Tu Catálogo en Línea B2C', path: '/catalogo', badge: 'Nuevo' },
      { name: 'Órdenes Web', path: '/catalogo/ordenes' },
    ]
  },
  { 
    title: 'Finanzas', icon: <Landmark size={20} />, 
    items: [
      { name: 'Conciliación Bancaria', path: '/finanzas/conciliacion' },
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

