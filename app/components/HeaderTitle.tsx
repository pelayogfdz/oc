'use client';

import { usePathname } from 'next/navigation';

const routeMap: Record<string, string> = {
  '/': 'Inicio',
  '/ventas': 'Historial de Ventas',
  '/ventas/nueva': 'Punto de Venta',
  '/ventas/cotizaciones': 'Cotizaciones a Clientes',
  '/ventas/cotizaciones/nueva': 'Nueva Cotización',
  '/ventas/devoluciones/nuevo': 'Procesar Devolución',
  '/ventas/promociones': 'Promociones',
  '/ventas/promociones/nuevo': 'Nueva Promoción',
  '/productos': 'Productos e Inventario',
  '/productos/nuevo': 'Crear Producto',
  '/productos/ajustes/nuevo': 'Ajustes Manuales de Inventario',
  '/productos/gastos': 'Gastos',
  '/productos/traspasos': 'Traspasos',
  '/productos/traspasos/solicitar': 'Solicitar Traspaso',
  '/productos/traspasos/salida': 'Enviar Traspaso',
  '/clientes': 'Directorio de Clientes',
  '/clientes/nuevo': 'Crear Cliente',
  '/clientes/portal': 'Portal de Clientes',
  '/rh': 'Recursos Humanos',
  '/rh/empleados': 'Empleados',
  '/rh/empleados/nuevo': 'Nuevo Empleado',
  '/rh/nomina': 'Nómina',
  '/rh/asistencia': 'Asistencia',
  '/rh/monitoreo': 'Monitoreo de Asistencia',
  '/rh/reportes': 'Reportes de RH',
  '/rh/tramites': 'Trámites y Solicitudes',
  '/reportes': 'Reportes Generales',
  '/reportes/ventas-desglose': 'Reporte de Ventas Detalladas',
  '/reportes/asistencia': 'Reporte de Asistencia',
  '/reportes/corte': 'Corte de Caja',
  '/mi-portal': 'Mi Portal',
  '/ajustes': 'Configuración',
};

export default function HeaderTitle() {
  const pathname = usePathname() || '';
  
  let title = '';
  
  if (routeMap[pathname]) {
    title = routeMap[pathname];
  } else {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const baseRoute = '/' + segments[0];
      if (segments[0] === 'ventas' && segments.length === 2) title = 'Resumen de Venta';
      else if (segments[0] === 'ventas' && segments.includes('imprimir-cotizacion')) title = 'Imprimir Cotización';
      else if (segments[0] === 'ventas' && segments.includes('imprimir')) title = 'Imprimir Venta';
      else if (segments[0] === 'productos' && segments.length === 2) title = 'Detalle de Producto';
      else if (segments[0] === 'productos' && segments[1] === 'traspasos' && segments.length === 3) title = 'Detalle de Traspaso';
      else if (segments[0] === 'clientes' && segments.length === 2) title = 'Detalle de Cliente';
      else if (segments[0] === 'rh' && segments[1] === 'empleados' && segments.length === 3) title = 'Detalle de Empleado';
      
      if (!title) {
        title = routeMap[baseRoute] || 'Punto de Venta';
      }
    } else {
      title = 'Punto de Venta';
    }
  }

  if (!title) return null;

  return (
    <h1 style={{ 
      fontSize: '1.25rem', 
      fontWeight: '600', 
      margin: 0, 
      color: 'var(--pulpos-text)',
      display: 'none', // By default hidden on mobile to save space, or maybe show it? The user said "en ese espacio", which is the desktop space. 
      // Let's use a class to manage visibility or just show it inline
    }} className="header-module-title">
      {title}
    </h1>
  );
}
