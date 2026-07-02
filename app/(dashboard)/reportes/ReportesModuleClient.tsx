'use client';

import { BarChart3, TrendingUp, Package, Calculator, Users, Clock, ArrowRight, ChefHat } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

import { hasNodeAccess } from '@/app/config/permissions';

export default function ReportesModuleClient({ 
  initialMetrics,
  userPermissions = {},
  userRole = 'USER',
  isSuperAdmin = false
}: { 
  initialMetrics: any;
  userPermissions?: Record<string, boolean>;
  userRole?: string;
  isSuperAdmin?: boolean;
}) {
  const reports = [
    { title: 'Resumen de Ventas', icon: <TrendingUp size={24} color="#16a34a" />, description: 'Ventas totales, devoluciones y tickets promedio.', route: '/reportes/ventas-desglose', requiredPermission: 'report_sales_breakdown' },
    { title: 'Ventas por Producto', icon: <Package size={24} color="#0ea5e9" />, description: 'Análisis detallado de ventas a nivel producto.', route: '/reportes/top-productos', requiredPermission: 'report_sales_by_product' },
    { title: 'Utilidad', icon: <Calculator size={24} color="#d946ef" />, description: 'Márgenes de ganancia y rentabilidad.', route: '/reportes/general', requiredPermission: 'report_utility' },
    { title: 'Impuestos', icon: <BarChart3 size={24} color="#f59e0b" />, description: 'Desglose de IVA, retenciones y otros impuestos.', route: '/reportes/facturacion', requiredPermission: 'report_taxes' },
    { title: 'Top Productos', icon: <TrendingUp size={24} color="#8b5cf6" />, description: 'Tus artículos más vendidos y rentables.', route: '/reportes/top-productos', requiredPermission: 'report_top_products' },
    { title: 'Top Clientes', icon: <Users size={24} color="#ef4444" />, description: 'Mejores compradores y su historial.', route: '/reportes/top-clientes', requiredPermission: 'report_top_clients' },
    { title: 'Top Categorías', icon: <Package size={24} color="#10b981" />, description: 'Categorías que más ingresos generan.', route: '/reportes/top-categorias', requiredPermission: 'report_top_categories' },
    { title: 'Ventas por Vendedor', icon: <Users size={24} color="#3b82f6" />, description: 'Rendimiento y comisiones por cajero/vendedor.', route: '/reportes/ventas-por-vendedor', requiredPermission: 'report_sales_by_seller' },
    { title: 'Comisiones de Vendedores', icon: <Calculator size={24} color="#10b981" />, description: 'Liquidaciones de bonos y comisiones ganadas por tu equipo.', route: '/reportes/comisiones', requiredPermission: 'report_seller_commissions' },
    { title: 'Inventario Valorizado', icon: <Package size={24} color="#6366f1" />, description: 'Valor total de tu mercancía a costo y precio venta.', route: '/reportes/inventario-valorizado', requiredPermission: 'report_valued_inventory' },
    { title: 'Costos y Precios', icon: <Package size={24} color="#8b5cf6" />, description: 'Listado de artículos con su costo, precio de venta (por lista seleccionable) y margen de utilidad.', route: '/reportes/costos-precios', requiredPermission: 'report_costs_prices' },
    { title: 'Reporte de Resurtido', icon: <Package size={24} color="#10b981" />, description: 'Sugerencias de compra basadas en promedio de ventas y stock.', route: '/reportes/resurtido', requiredPermission: 'report_replenishment' },
    { title: 'Reporte de Insumos', icon: <ChefHat size={24} color="#8b5cf6" />, description: 'Sugerencia de compra de materias primas basada en recetas de productos vendidos.', route: '/reportes/insumos', requiredPermission: 'report_supplies' },
    { title: 'Reporte de Producción', icon: <ChefHat size={24} color="#f59e0b" />, description: 'Sugerencias de fabricación basadas en ritmo de ventas y stock.', route: '/reportes/produccion', requiredPermission: 'report_production' },
    { title: 'Bitácora de Inventario', icon: <Clock size={24} color="#8b5cf6" />, description: 'Movimientos, ajustes, entradas y salidas.', route: '/reportes/bitacora-inventario', requiredPermission: 'report_inventory_log' },
    { title: 'Consignaciones', icon: <Package size={24} color="#6366f1" />, description: 'Rendimiento y cobros de productos prestados a clientes.', route: '/reportes/consignaciones', requiredPermission: 'report_consignments' },
    { title: 'Gastos', icon: <Calculator size={24} color="#ef4444" />, description: 'Registro y análisis de egresos operativos.', route: '/productos/gastos', requiredPermission: 'report_expenses' },
    { title: 'Corte de Caja', icon: <Calculator size={24} color="#d946ef" />, description: 'Auditoría de ingresos, egresos y control de efectivo.', route: '/caja/actual', requiredPermission: 'report_cash_cut' },
    { title: 'Reporte de Turnos', icon: <Clock size={24} color="#8b5cf6" />, description: 'Aperturas y cierres por cajero, bitácora de anomalías.', route: '/caja/cortes', requiredPermission: 'report_shifts' },
    { title: 'Rendimiento de Tareas', icon: <Clock size={24} color="#8b5cf6" />, description: 'Rendimiento de tareas, cumplimientos, retrasos e inasistencias por empleado.', route: '/reportes/tareas', requiredPermission: 'report_tasks' },
  ];

  const visibleReports = reports.filter(report => 
    hasNodeAccess(userPermissions, report.requiredPermission, isSuperAdmin, userRole)
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
       <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Centro de Reportes</h1>
          <p style={{ color: 'var(--caanma-text-muted)' }}>Mide el rendimiento de tus sucursales y toma decisiones basadas en datos.</p>
       </div>

       {/* Resumen Rapido */}
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
             <h3 style={{ fontSize: '0.9rem', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>Ventas del Día</h3>
             <div style={{ fontSize: '2rem', fontWeight: '900', color: '#16a34a' }}>{formatCurrency(initialMetrics.ventasDelDia)}</div>
             <div style={{ fontSize: '0.85rem', color: '#16a34a', marginTop: '0.5rem', fontWeight: 'bold' }}>Hoy</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
             <h3 style={{ fontSize: '0.9rem', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>Tickets Emitidos</h3>
             <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--caanma-text)' }}>{initialMetrics.ticketsEmitidos}</div>
             <div style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', marginTop: '0.5rem', fontWeight: 'bold' }}>
               Ticket prom. {initialMetrics.ticketsEmitidos > 0 ? formatCurrency(initialMetrics.ventasDelDia / initialMetrics.ticketsEmitidos) : formatCurrency(0)}
             </div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
             <h3 style={{ fontSize: '0.9rem', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>Valor de Inventario</h3>
             <div style={{ fontSize: '2rem', fontWeight: '900', color: '#0ea5e9' }}>{formatCurrency(initialMetrics.valorInventario)}</div>
             <div style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', marginTop: '0.5rem' }}>Calculado a Precio Costo</div>
          </div>
       </div>

       <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Todos los Reportes</h2>
       
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
           {visibleReports.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--caanma-text-muted)', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed var(--caanma-border)', width: '100%', gridColumn: '1 / -1', fontWeight: '500' }}>
                 No tienes permisos asignados para visualizar reportes en este momento.
              </div>
           ) : (
              visibleReports.map((report, idx) => (
                 <Link href={report.route} key={idx} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', height: '100%', transition: 'all 0.2s', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                         onMouseOver={e => e.currentTarget.style.borderColor = 'var(--caanma-primary)'}
                         onMouseOut={e => e.currentTarget.style.borderColor = 'var(--caanma-border)'}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                          <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '10px' }}>
                            {report.icon}
                          </div>
                          <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{report.title}</h3>
                       </div>
                       <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.9rem', flex: 1, marginBottom: '1.5rem' }}>
                          {report.description}
                       </p>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--caanma-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                          Pulsar para ver <ArrowRight size={16} />
                       </div>
                    </div>
                 </Link>
              ))
           )}
        </div>
    </div>
  );
}
