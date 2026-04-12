import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { Banknote, CheckCircle2, FileText } from 'lucide-react';
import { revalidatePath } from "next/cache";

async function payPurchase(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  await prisma.purchase.update({ where: { id }, data: { status: 'COMPLETED' } });
  revalidatePath('/proveedores/cuentas');
}

export default async function CuentasPorPagarPage() {
  const branch = await getActiveBranch();
  const pendingPurchases = await prisma.purchase.findMany({ 
    where: { branchId: branch.id, status: "PENDING" }, 
    include: { supplier: true, user: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Banknote size={28} color="#ef4444" />
            Cuentas por Pagar (Proveedores)
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>Gestiona los pagos pendientes de tus compras a crédito.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Fecha / Compra</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Proveedor</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Monto Pendiente</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pendingPurchases.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: '500' }}>#{item.id.substring(0,8).toUpperCase()}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>{item.createdAt.toLocaleDateString()}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 'bold' }}>{item.supplier?.name || 'Proveedor General'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>Registró: {item.user?.name}</div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>
                  ${item.total.toFixed(2)}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <form action={payPurchase}>
                    <input type="hidden" name="id" value={item.id} />
                    <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} /> Marcar Pagado
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {pendingPurchases.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  ¡Todo al día! No tienes cuentas por pagar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
