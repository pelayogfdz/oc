import { getActiveBranch } from "@/app/actions/auth";
import { getBranchFilter } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { Clock, ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default async function AntiguedadReportPage() {
  const branch = await getActiveBranch();
  const isGlobal = branch.id === 'GLOBAL';
  
  // Rango de 30 días
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 1. Obtener todos los productos activos de la sucursal actual
  const products = await prisma.product.findMany({ 
    where: { ...getBranchFilter(branch), isActive: true },
    include: { branch: true },
    orderBy: { name: 'asc' }
  });

  // 2. Obtener ventas completadas en los últimos 30 días
  const recentSales = await prisma.sale.findMany({
    where: { 
      ...getBranchFilter(branch), 
      status: 'COMPLETED',
      createdAt: { gte: thirtyDaysAgo }
    },
    include: { items: true }
  });

  // 3. Mapear volumen de venta por producto
  const productSalesMap: Record<string, number> = {};
  recentSales.forEach(sale => {
    sale.items.forEach(item => {
      productSalesMap[item.productId] = (productSalesMap[item.productId] || 0) + item.quantity;
    });
  });

  // Global KPIs
  let totalStagnantCost = 0;
  let stagnantCount = 0;
  let wellStockedCount = 0;

  // Calculamos la tabla para tener las métricas y la ordenamos
  const tableData = products.map(p => {
    const stock = p.stock || 0;
    const cost = p.cost || 0;
    const sales30d = productSalesMap[p.id] || 0;
    const dailyRate = sales30d / 30.0;
    
    let coverageDays = 0;
    let text = '';
    let bgColor = '';
    let textColor = '';

    if (stock <= 0) {
      text = 'Agotado (0 días)';
      bgColor = '#fee2e2';
      textColor = '#ef4444';
    } else if (sales30d === 0) {
      text = 'Estancado (Sin ventas)';
      bgColor = '#ffedd5';
      textColor = '#c2410c'; // Orange dark
      totalStagnantCost += stock * cost;
      stagnantCount++;
    } else {
      coverageDays = stock / dailyRate;
      wellStockedCount++;
      
      if (coverageDays > 30) {
        const months = (coverageDays / 30).toFixed(1);
        text = `${months} meses`;
        bgColor = '#dcfce7';
        textColor = '#166534';
      } else {
        const days = Math.floor(coverageDays);
        text = `${days === 0 ? '< 1' : days} días`;
        
        if (days <= 7) {
          bgColor = '#fef9c3'; // Yellow warning for low stock
          textColor = '#854d0e';
        } else {
          bgColor = '#dcfce7'; // Good
          textColor = '#166534';
        }
      }
    }

    return {
      ...p,
      sales30d,
      dailyRate,
      coverageDays,
      coverageText: text,
      bgColor,
      textColor
    };
  });

  // Ordenar: primero los estancados, luego agotados, luego los que quedan por menor cobertura
  tableData.sort((a, b) => {
    if (a.sales30d === 0 && a.stock > 0 && b.sales30d > 0) return -1;
    if (b.sales30d === 0 && b.stock > 0 && a.sales30d > 0) return 1;
    return a.coverageDays - b.coverageDays;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Link href="/reportes" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pulpos-primary)', textDecoration: 'none', marginBottom: '1.5rem', fontWeight: 'bold' }}>
        <ArrowLeft size={18} /> Volver al Hub
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <Clock size={32} color="var(--pulpos-primary)" />
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Cobertura y Antigüedad de Inventario</h1>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.5rem' }}>DURARÁ CON BASE A TUS ÚLTIMOS 30 DÍAS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#10b981' }}>Análisis Predictivo</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', marginTop: '0.5rem' }}>Basado en el ritmo de venta mensual actual.</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #f97316' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.5rem' }}>ITEMS ESTANCADOS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#f97316' }}>{stagnantCount} productos</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', marginTop: '0.5rem' }}>Capital congelado: <strong>${totalStagnantCost.toLocaleString('es-MX', {minimumFractionDigits:2})}</strong></p>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.5rem' }}>PRODUCTOS CON FLUJO</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#10b981' }}>{wellStockedCount} activos</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', marginTop: '0.5rem' }}>Exhibiendo un ritmo de venta comprobable.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '1.2rem 1rem', borderBottom: '1px solid var(--pulpos-border)', color: 'var(--pulpos-text-muted)' }}>Producto</th>
                <th style={{ padding: '1.2rem 1rem', borderBottom: '1px solid var(--pulpos-border)', color: 'var(--pulpos-text-muted)' }}>Stock Actual</th>
                <th style={{ padding: '1.2rem 1rem', borderBottom: '1px solid var(--pulpos-border)', color: 'var(--pulpos-text-muted)' }}>Vendidos (30d)</th>
                <th style={{ padding: '1.2rem 1rem', borderBottom: '1px solid var(--pulpos-border)', color: 'var(--pulpos-text-muted)' }}>Ritmo Diario</th>
                <th style={{ padding: '1.2rem 1rem', borderBottom: '1px solid var(--pulpos-border)', color: 'var(--pulpos-text-muted)' }}>Cobertura (Tiempo Restante)</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>
                    {p.name} <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{p.sku ? `(${p.sku})` : ''}</span>
                    {isGlobal && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--pulpos-primary)' }}>SUC: {p.branch?.name}</span>}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{p.stock}</td>
                  <td style={{ padding: '1rem' }}>{p.sales30d}</td>
                  <td style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontFamily: 'monospace' }}>
                    {p.dailyRate > 0 ? `${p.dailyRate.toFixed(2)} unds/día` : '--'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      backgroundColor: p.bgColor, 
                      color: p.textColor, 
                      padding: '0.4rem 0.8rem', 
                      borderRadius: '24px', 
                      fontSize: '0.85rem', 
                      fontWeight: 'bold',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      {p.sales30d === 0 && p.stock > 0 && <AlertTriangle size={14} />}
                      {p.coverageText}
                    </span>
                  </td>
                </tr>
              ))}
              {tableData.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                    No hay productos en tu catálogo para reportar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
