import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { FileText, Plus, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import Link from 'next/link';

export default async function Page() {
  const branch = await getActiveBranch();
  
  if (!branch) {
    return <div>No branch active.</div>;
  }

  // Fetch only adjustments
  const data = await prisma.inventoryMovement.findMany({ 
    where: { 
      product: { branchId: branch.id },
      type: "ADJUSTMENT"
    }, 
    include: { 
      product: true,
      user: true // Fetching user who made the adjustment
    }, 
    take: 50, 
    orderBy: { createdAt: "desc" } 
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 0.5rem 0' }}>
            <FileText size={28} color="#2563eb" />
            Bitácora de Ajustes Manuales
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', margin: 0 }}>
            Historial de alteraciones de stock hechas directamente o mediante conteos.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/productos/auditorias" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', backgroundColor: 'white' }}>
            Ir a Auditorías (Físico)
          </Link>
          <Link href="/productos/ajustes/nuevo" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Plus size={18} /> Forzar Ajuste Directo
          </Link>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--pulpos-border)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--pulpos-border)' }}>
            <tr>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem' }}>Fecha</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem' }}>Producto</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem' }}>Impacto</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem' }}>Motivo</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem' }}>Hecho Por</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item: any) => {
              const isPositive = item.quantity > 0;
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#475569' }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', backgroundColor: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Package size={16} color="#94a3b8" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{item.product?.name || 'Stock'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>SKU: {item.product?.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.25rem', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '12px', 
                      backgroundColor: isPositive ? '#dcfce7' : '#fee2e2', 
                      color: isPositive ? '#166534' : '#991b1b', 
                      fontSize: '0.85rem' 
                    }}>
                      {isPositive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                      {isPositive ? '+' : ''}{item.quantity}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#334155' }}>
                    {item.reason}
                  </td>
                  <td style={{ padding: '1rem' }}>
                     <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#0f172a' }}>
                        {item.user?.name || 'Sistema'}
                     </div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>
                        {item.user?.email || 'N/A'}
                     </div>
                  </td>
                </tr>
              )
            })}
            
            {data.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  La bitácora de ajustes manuales está vacía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
