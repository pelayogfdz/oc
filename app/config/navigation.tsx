import React from 'react';
import { 
  Home, Tag, Package, Calculator, ArrowRightLeft, 
  Settings, UserCircle, ShoppingCart, Banknote, FileText
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
  { title: 'Inicio', path: '/', icon: <Home size={20} /> },
  { 
    title: 'Ventas', icon: <Banknote size={20} />, 
    items: [
      { name: 'Historial de Ventas', path: '/ventas' },
    ]
  },
  { 
    title: 'Facturación', icon: <FileText size={20} />, 
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
    title: 'Inventario y Productos', icon: <Tag size={20} />, 
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
  }
];

export const footerNodes: MenuNode[] = [
  { title: 'Preferencias', path: '/preferencias', icon: <Settings size={20} /> },
];
