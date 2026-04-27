'use client';

import { usePathname } from 'next/navigation';

type RouteInfo = { title: string; subtitle?: string };

const routeMap: Record<string, RouteInfo> = {
  '/': { title: 'Inicio', subtitle: 'Panel de control principal' },
  '/ventas': { title: 'Historial de Ventas', subtitle: 'Módulo de ventas y cortes de caja' },
  '/ventas/nueva': { title: 'Punto de Venta', subtitle: 'Registrar nueva venta' },
  '/ventas/cotizaciones': { title: 'Cotizaciones', subtitle: 'Cotizaciones a Clientes' },
  '/ventas/cotizaciones/nueva': { title: 'Nueva Cotización', subtitle: 'Crear cotización para cliente' },
  '/ventas/devoluciones/nuevo': { title: 'Devoluciones', subtitle: 'Procesar Devolución' },
  '/ventas/promociones': { title: 'Promociones', subtitle: 'Gestión de promociones y descuentos' },
  '/ventas/promociones/nuevo': { title: 'Nueva Promoción', subtitle: 'Crear promoción' },
  '/productos': { title: 'Inventario', subtitle: 'Productos e Inventario' },
  '/productos/nuevo': { title: 'Crear Producto', subtitle: 'Añadir al catálogo' },
  '/productos/ajustes/nuevo': { title: 'Ajuste de Inventario', subtitle: 'Ajustes Manuales de Inventario' },
  '/productos/gastos': { title: 'Gastos', subtitle: 'Registro de gastos' },
  '/productos/compras': { title: 'Compras', subtitle: 'Compras de mercancía' },
  '/productos/compras/nuevo': { title: 'Nueva Compra', subtitle: 'Registrar entrada de mercancía' },
  '/productos/solicitudes': { title: 'Solicitudes', subtitle: 'Solicitudes de mercancía' },
  '/productos/solicitudes/nueva': { title: 'Nueva Solicitud', subtitle: 'Crear solicitud' },
  '/productos/traspasos': { title: 'Traspasos', subtitle: 'Movimientos entre sucursales' },
  '/productos/traspasos/solicitar': { title: 'Solicitar Traspaso', subtitle: 'Pedir mercancía' },
  '/productos/traspasos/salida': { title: 'Enviar Traspaso', subtitle: 'Salida de mercancía' },
  '/clientes': { title: 'Clientes', subtitle: 'Directorio de Clientes' },
  '/clientes/nuevo': { title: 'Crear Cliente', subtitle: 'Añadir al directorio' },
  '/clientes/portal': { title: 'Portal de Clientes', subtitle: 'Acceso para clientes' },
  '/rh': { title: 'Recursos Humanos', subtitle: 'Gestión del personal' },
  '/rh/empleados': { title: 'Empleados', subtitle: 'Directorio de personal' },
  '/rh/empleados/nuevo': { title: 'Nuevo Empleado', subtitle: 'Alta de personal' },
  '/rh/nomina': { title: 'Nómina', subtitle: 'Gestión de nómina' },
  '/rh/asistencia': { title: 'Asistencia', subtitle: 'Registro de asistencia' },
  '/rh/monitoreo': { title: 'Monitoreo', subtitle: 'Monitoreo de Asistencia' },
  '/rh/reportes': { title: 'Reportes RH', subtitle: 'Reportes de Recursos Humanos' },
  '/rh/tramites': { title: 'Trámites', subtitle: 'Trámites y Solicitudes' },
  '/reportes': { title: 'Reportes', subtitle: 'Reportes Generales' },
  '/reportes/ventas-desglose': { title: 'Desglose de Ventas', subtitle: 'Reporte de Ventas Detalladas' },
  '/reportes/asistencia': { title: 'Reporte Asistencia', subtitle: 'Asistencia del personal' },
  '/reportes/corte': { title: 'Corte de Caja', subtitle: 'Corte financiero' },
  '/mi-portal': { title: 'Mi Portal', subtitle: 'Información personal' },
  '/ajustes': { title: 'Configuración', subtitle: 'Ajustes del sistema' },
  '/preferencias/general': { title: 'Preferencias', subtitle: 'Generales' },
  '/preferencias/etiquetas': { title: 'Preferencias', subtitle: 'Etiquetas de Productos' },
};

export default function HeaderTitle() {
  const pathname = usePathname() || '';
  
  let info: RouteInfo = { title: '' };
  
  if (routeMap[pathname]) {
    info = routeMap[pathname];
  } else {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const baseRoute = '/' + segments[0];
      if (segments[0] === 'ventas' && segments.length === 2) info = { title: 'Resumen de Venta' };
      else if (segments[0] === 'ventas' && segments.includes('imprimir-cotizacion')) info = { title: 'Imprimir Cotización' };
      else if (segments[0] === 'ventas' && segments.includes('imprimir')) info = { title: 'Imprimir Venta' };
      else if (segments[0] === 'productos' && segments.length === 2) info = { title: 'Detalle de Producto' };
      else if (segments[0] === 'productos' && segments[1] === 'traspasos' && segments.length === 3) info = { title: 'Detalle de Traspaso' };
      else if (segments[0] === 'clientes' && segments.length === 2) info = { title: 'Detalle de Cliente' };
      else if (segments[0] === 'rh' && segments[1] === 'empleados' && segments.length === 3) info = { title: 'Detalle de Empleado' };
      
      if (!info.title) {
        info = routeMap[baseRoute] || { title: 'Pulpos Clone' };
      }
    } else {
      info = { title: 'Pulpos Clone' };
    }
  }

  if (!info.title) return null;

  return (
    <div className="header-module-title-container" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <h1 style={{ 
        fontSize: '1.25rem', 
        fontWeight: '700', 
        margin: 0, 
        color: 'var(--pulpos-text)',
      }} className="header-module-title">
        {info.title}
      </h1>
      {info.subtitle && (
        <span className="header-module-subtitle" style={{
          fontSize: '0.875rem',
          color: 'var(--pulpos-text-muted)',
          fontWeight: '400',
          borderLeft: '1px solid var(--pulpos-border)',
          paddingLeft: '0.75rem',
          display: 'none' // Hidden on mobile, shown via CSS on desktop
        }}>
          {info.subtitle}
        </span>
      )}
    </div>
  );
}
