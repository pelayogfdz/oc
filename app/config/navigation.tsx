import React from 'react';
import { 
  Home, Users, Tag, Package, Calculator, ArrowRightLeft, 
  BarChart3, Settings, Truck, PackageCheck,
  ChevronDown, ChevronUp, PlusCircle, Headset, Banknote, 
  FileText, Library, BookOpen, UserCircle, Briefcase, HandCoins, X, Sparkles, ShoppingCart
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
  { title: 'Asistente IA (Alina)', path: '/ia', icon: <Sparkles size={20} className="text-purple-500" />, badge: 'Gemini' },
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
    title: 'Caja', icon: <Briefcase size={20} />, 
    items: [
      { name: 'Apertura y Corte de Caja', path: '/caja/actual' },
      { name: 'Histórico de Cortes', path: '/caja/cortes' },
    ]
  },
  { 
    title: 'Facturación', icon: <FileText size={20} />, 
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
    ]
  },
  { 
    title: 'Inventario y Productos', icon: <Tag size={20} />, 
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
      { name: 'Pedidos', path: '/productos/pedidos' },
      { name: 'Registro de Gastos', path: '/productos/gastos' },
      { name: 'Directorio de Proveedores', path: '/proveedores' },
      { name: 'Cuentas por Pagar (CxP)', path: '/proveedores/cuentas', badge: 'Pasivos' },
    ]
  },
  { 
    title: 'Ventas Online', icon: <Library size={20} />, badge: 'Enlace',
    items: [
      { name: 'Integraciones (Mercado Libre/Amazon)', path: '/integraciones' },
      { name: 'Catálogo E-commerce B2C', path: '/catalogo' },
    ]
  },
  { title: 'Finanzas', path: '/conciliacion', icon: <HandCoins size={20} /> },
  { title: 'Reportes y BI', path: '/reportes', icon: <BarChart3 size={20} /> },
];

export const footerNodes: MenuNode[] = [
  { title: 'Preferencias', path: '/preferencias', icon: <Settings size={20} /> },
];
