'use client';

import { BarChart3, TrendingUp, Package, Calculator, Users, Clock, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function ReportesModuleClient({ initialMetrics }: { initialMetrics: any }) {
  const reports = [
    { title: 'Resumen de Ventas', icon: <TrendingUp size={24} color="#16a34a" />, description: 'Ventas totales, devoluciones y tickets promedio.', route: '/reportes/ventas-desglose' },
    { title: 'Ventas por Producto', icon: <Package size={24} color="#0ea5e9" />, description: 'Análisis detallado de ventas a nivel producto.', route: '/reportes/ventas-por-producto' },
    { title: 'Utilidad', icon: <Calculator size={24} color="#d946ef" />, description: 'Márgenes de ganancia y rentabilidad.', route: '/reportes/utilidad' },
    { title: 'Impuestos', icon: <BarChart3 size={24} color="#f59e0b" />, description: 'Desglose de IVA, retenciones y otros impuestos.', route: '/reportes/impuestos' },
    { title: 'Top Productos', icon: <TrendingUp size={24} color="#8b5cf6" />, description: 'Tus artículos más vendidos y rentables.', route: '/reportes/top-productos' },
    { title: 'Top Clientes', icon: <Users size={24} color="#ef4444" />, description: 'Mejores compradores y su historial.', route: '/reportes/top-clientes' },
    { title: 'Top Categorías', icon: <Package size={24} color="#10b981" />, description: 'Categorías que más ingresos generan.', route: '/reportes/top-categorias' },
    { title: 'Ventas por Vendedor', icon: <Users size={24} color="#3b82f6" />, description: 'Rendimiento y comisiones por cajero/vendedor.', route: '/reportes/ventas-por-vendedor' },
    { title: 'Inventario Valorizado', icon: <Package size={24} color="#6366f1" />, description: 'Valor total de tu mercancía a costo y precio venta.', route: '/reportes/inventario-valorizado' },
    { title: 'Bitácora de Inventario', icon: <Clock size={24} color="#8b5cf6" />, description: 'Movimientos, ajustes, entradas y salidas.', route: '/reportes/bitacora-inventario' },
    { title: 'Gastos', icon: <Calculator size={24} color="#ef4444" />, description: 'Registro y análisis de egresos operativos.', route: '/reportes/gastos' },
    { title: 'Corte de Caja', icon: <Calculator size={24} color="#d946ef" />, description: 'Auditoría de ingresos, egresos y control de efectivo.', route: '/caja/actual' },
    { title: 'Reporte de Turnos', icon: <Clock size={24} color="#8b5cf6" />, description: 'Aperturas y cierres por cajero, bitácora de anomalías.', route: '/caja/cortes' },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
       <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Centro de Reportes</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Mide el rendimiento de tus sucursales y toma decisiones basadas en datos.</p>
       </div>

       {/* Resumen Rapido */}
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
             <h3 style={{ fontSize: '0.9rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>Ventas del Día</h3>
             <div style={{ fontSize: '2rem', fontWeight: '900', color: '#16a34a' }}>{formatCurrency(initialMetrics.ventasDelDia)}</div>
             <div style={{ fontSize: '0.85rem', color: '#16a34a', marginTop: '0.5rem', fontWeight: 'bold' }}>Hoy</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
             <h3 style={{ fontSize: '0.9rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>Tickets Emitidos</h3>
             <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--pulpos-text)' }}>{initialMetrics.ticketsEmitidos}</div>
             <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', marginTop: '0.5rem', fontWeight: 'bold' }}>
               Ticket prom. {initialMetrics.ticketsEmitidos > 0 ? formatCurrency(initialMetrics.ventasDelDia / initialMetrics.ticketsEmitidos) : formatCurrency(0)}
             </div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
             <h3 style={{ fontSize: '0.9rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>Valor de Inventario</h3>
             <div style={{ fontSize: '2rem', fontWeight: '900', color: '#0ea5e9' }}>{formatCurrency(initialMetrics.valorInventario)}</div>
             <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', marginTop: '0.5rem' }}>Calculado a Precio Costo</div>
          </div>
       </div>

       <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Todos los Reportes</h2>
       
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {reports.map((report, idx) => (
             <Link href={report.route} key={idx} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)', height: '100%', transition: 'all 0.2s', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                     onMouseOver={e => e.currentTarget.style.borderColor = 'var(--pulpos-primary)'}
                     onMouseOut={e => e.currentTarget.style.borderColor = 'var(--pulpos-border)'}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '10px' }}>
                        {report.icon}
                      </div>
                      <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{report.title}</h3>
                   </div>
                   <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.9rem', flex: 1, marginBottom: '1.5rem' }}>
                      {report.description}
                   </p>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--pulpos-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      Pulsar para ver <ArrowRight size={16} />
                   </div>
                </div>
             </Link>
          ))}
       </div>
    </div>
  );
}
