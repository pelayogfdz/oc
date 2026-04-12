import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { BarChart3, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function Page() {
  const branch = await getActiveBranch();
  
  // Fake or dynamic query based on module
  const saleItems = await prisma.saleItem.findMany({
    where: { sale: { branchId: branch.id, status: "COMPLETED" } },
    include: { product: true }
  });

  const productStats: Record<string, { name: string, quantity: number, revenue: number }> = {};

  for (const item of saleItems) {
    if (!productStats[item.productId]) {
      productStats[item.productId] = { 
        name: item.product?.name || 'Producto Eliminado', 
        quantity: 0, 
        revenue: 0 
      };
    }
    productStats[item.productId].quantity += item.quantity;
    productStats[item.productId].revenue += (item.quantity * item.price);
  }

  const topProducts = Object.values(productStats)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 50); // Top 50

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <Link href="/reportes" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pulpos-primary)', textDecoration: 'none', marginBottom: '1.5rem', fontWeight: 'bold' }}>
        <ArrowLeft size={18} /> Volver al Hub
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <BarChart3 size={32} color="var(--pulpos-primary)" />
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Productos Estrella</h1>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Ranking</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Producto</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Cantidad Vendida</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Ingreso Generado</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((prod, i) => (
              <tr key={prod.name} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 'bold', color: i < 3 ? '#f59e0b' : 'inherit' }}>#{i + 1}</td>
                <td style={{ padding: '1rem', fontWeight: '500' }}>{prod.name}</td>
                <td style={{ padding: '1rem' }}>{prod.quantity} unds.</td>
                <td style={{ padding: '1rem', fontWeight: 'bold', color: '#10b981' }}>${prod.revenue.toFixed(2)}</td>
              </tr>
            ))}
            {topProducts.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>Sin datos de ventas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
