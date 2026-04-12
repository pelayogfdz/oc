import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { FileText, Send } from 'lucide-react';
import { stampInvoice } from "@/app/actions/facturacion";

export default async function FacturasVentasPage() {
  const branch = await getActiveBranch();
  
  // Show recent sales that could be invoiced
  const sales = await prisma.sale.findMany({ 
    where: { branchId: branch.id, status: "COMPLETED" },
    include: { customer: true, user: true },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={28} color="#06b6d4" />
            Facturas Timbradas
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>
            Genera y administra los comprobantes fiscales de tus ventas emitidas.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Fecha / Venta</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Cliente Fiscal</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Monto</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale: any) => (
              <tr key={sale.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: '500' }}>#{sale.id.substring(0,8).toUpperCase()}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>{sale.createdAt.toLocaleDateString()} {sale.createdAt.toLocaleTimeString()}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 'bold' }}>{sale.customer?.legalName || sale.customer?.name || 'Público en General'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>RFC: {sale.customer?.taxId || 'XAXX010101000'}</div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>
                  ${sale.total.toFixed(2)}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  {sale.invoiceId ? (
                     <span style={{ color: '#166534', fontWeight: 'bold' }}>Facturado</span>
                  ) : (
                    <form action={async (formData: FormData) => {
                      'use server';
                      await stampInvoice(formData.get('id') as string);
                    }}>
                      <input type="hidden" name="id" value={sale.id} />
                      <button type="submit" style={{ backgroundColor: '#f1f5f9', color: '#06b6d4', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #bae6fd', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Send size={16} /> Timbrar CFDI
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  No hay ventas recientes para facturar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
