import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { BarChart3, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function Page() {
  const branch = await getActiveBranch();
  
  // Fake or dynamic query based on module
  const products = await prisma.product.findMany({ 
    where: { branchId: branch.id, isActive: true },
    orderBy: { name: 'asc' }
  });

  const totalCostValue = products.reduce((acc, p) => acc + ((p.cost || 0) * (p.stock || 0)), 0);
  const totalRetailValue = products.reduce((acc, p) => acc + ((p.price || 0) * (p.stock || 0)), 0);
  const potentialProfit = totalRetailValue - totalCostValue;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <Link href="/reportes" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pulpos-primary)', textDecoration: 'none', marginBottom: '1.5rem', fontWeight: 'bold' }}>
        <ArrowLeft size={18} /> Volver al Hub
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <BarChart3 size={32} color="var(--pulpos-primary)" />
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Valoración de Inventario</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.5rem' }}>CAPITAL CONGELADO (COSTO)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#ef4444' }}>${totalCostValue.toFixed(2)}</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', marginTop: '0.5rem' }}>Lo que costó el inventario actual.</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.5rem' }}>VALOR AL MENUDEO (VENTA)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#10b981' }}>${totalRetailValue.toFixed(2)}</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', marginTop: '0.5rem' }}>Lo que valdría si se vende todo hoy.</p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.5rem' }}>UTILIDAD POTENCIAL</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>${potentialProfit.toFixed(2)}</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', marginTop: '0.5rem' }}>Ganancia latente del stock actual.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Producto</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Stock Actual</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Costo Unitario</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Capital (Costo)</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const capital = (p.cost || 0) * (p.stock || 0);
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>{p.name} {p.sku ? `(${p.sku})` : ''}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: (p.stock || 0) <= 0 ? '#ef4444' : 'inherit' }}>{p.stock}</td>
                  <td style={{ padding: '1rem' }}>${(p.cost || 0).toFixed(2)}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: '#ef4444' }}>${capital.toFixed(2)}</td>
                </tr>
              )
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>No hay productos activos en inventario.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
