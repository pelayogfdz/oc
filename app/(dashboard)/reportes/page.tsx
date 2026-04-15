import Link from 'next/link';
import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, getBranchFilter } from "@/lib/utils";
import { BarChart3, TrendingUp, Package, History, DollarSign, Users, Award, TrendingDown, BookOpen, Clock } from 'lucide-react';

export default async function ReportesHubPage() {
  const branch = await getActiveBranch();
  
  // KPI Rapidos
  const sales = await prisma.sale.findMany({ where: { ...getBranchFilter(branch), status: 'COMPLETED' }, include: { items: { include: { product: true } } } });
  const gastos = await prisma.expense.findMany({ where: getBranchFilter(branch) });
  
  const totalSales = sales.reduce((acc, sale) => acc + sale.total, 0);
  const totalCost = sales.reduce((acc, sale) => acc + sale.items.reduce((s, i) => s + ((i.product?.cost || 0) * i.quantity), 0), 0);
  const grossProfit = totalSales - totalCost;
  const totalGastos = gastos.reduce((acc, g) => acc + g.amount, 0);

  const reportCards = [
    { title: "Ventas y Utilidad Bruta", icon: <TrendingUp size={24} color="#10b981" />, desc: "Análisis de ingresos facturados y margen de ganancia por periodos.", path: "/reportes/ventas" },
    { title: "Ventas por Empleado", icon: <Users size={24} color="#3b82f6" />, desc: "Mide el rendimiento individual de cajeros y asesores de venta.", path: "/reportes/empleados" },
    { title: "Productos Estrella", icon: <Award size={24} color="#f59e0b" />, desc: "Top productos más vendidos y los que generan más utilidad.", path: "/reportes/productos" },
    { title: "Flujo de Gastos / OpEx", icon: <TrendingDown size={24} color="#ef4444" />, desc: "Desglose de gastos administrativos (renta, nómina, servicios).", path: "/reportes/gastos" },
    { title: "Valoración de Inventario", icon: <Package size={24} color="#8b5cf6" />, desc: "Capital actual congelado en tus almacenes a costo y precio retail.", path: "/reportes/inventario" },
    { title: "Cobertura de Inventario", icon: <Clock size={24} color="#ec4899" />, desc: "Antigüedad del stock y ritmo de ventas para pronosticar vida útil.", path: "/reportes/antiguedad" },
    { title: "Estados de Cuenta", icon: <BookOpen size={24} color="#64748b" />, desc: "Análisis de deudores, cuentas por cobrar y líneas de crédito B2B.", path: "/reportes/cartera" },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '0.75rem' }}>
        <BarChart3 size={32} color="var(--pulpos-primary)" />
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Centro de Reportes</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>INGRESOS POR VENTAS</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalSales)}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--pulpos-primary)' }}>
          <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>UTILIDAD BRUTA (Gross Profit)</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>{formatCurrency(grossProfit)}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>GASTOS ADM. (OpEx)</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(totalGastos)}</div>
        </div>
      </div>
      
      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Explorador de Inteligencia de Negocio</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {reportCards.map(report => (
          <Link href={report.path} key={report.path} style={{ textDecoration: 'none', display: 'block' }}>
            <div className="card" style={{ height: '100%', padding: '1.5rem', transition: 'box-shadow 0.2s, border-color 0.2s', cursor: 'pointer', border: '2px solid transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <div style={{ backgroundColor: '#f1f5f9', padding: '0.75rem', borderRadius: '50%' }}>
                  {report.icon}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--pulpos-text)' }}>{report.title}</h3>
              </div>
              <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {report.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
