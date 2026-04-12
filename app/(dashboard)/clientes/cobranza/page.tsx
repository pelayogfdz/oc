import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { HandCoins, UserCircle } from 'lucide-react';
import { revalidatePath } from "next/cache";

async function payQuota(formData: FormData) {
  'use server';
  // Simulate a payment or do nothing actually for mock
  revalidatePath('/clientes/cobranza');
}

export default async function CarterayCobranzaPage() {
  const branch = await getActiveBranch();
  
  const customers = await prisma.customer.findMany({ 
    where: { branchId: branch.id, creditLimit: { gt: 0 } }, 
    include: { sales: true }
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <HandCoins size={28} color="#6366f1" />
            Cartera y Cobranza
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>Visualiza qué clientes tienen línea de crédito y administra sus saldos.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Cliente</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Límite de Crédito</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c: any) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UserCircle size={18} color="var(--pulpos-text-muted)" />
                    {c.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>{c.phone || c.email || 'Sin datos de contacto'}</div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#6366f1' }}>
                  ${c.creditLimit.toFixed(2)}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <form action={payQuota}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <HandCoins size={16} /> Registrar Abono
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  <HandCoins size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  Ningún cliente tiene línea de crédito activa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
