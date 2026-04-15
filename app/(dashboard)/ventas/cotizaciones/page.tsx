import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import ConvertButton from "./ConvertButton";

export default async function CotizacionesPage() {
  const branch = await getActiveBranch();
  const quotes = await prisma.quote.findMany({
    where: { branchId: branch.id },
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      customer: true,
      items: { include: { product: true } }
    }
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Cotizaciones a Clientes</h1>
        <Link href="/ventas/cotizaciones/nueva" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.5rem 1.5rem' }}>
          <Plus size={18} /> Nueva Cotización
        </Link>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>ID Cotización</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Fecha</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Cliente</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Creado por</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Total</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Estado</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--pulpos-text-muted)', textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(quote => (
                <tr key={quote.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>#{quote.id.slice(0, 8).toUpperCase()}</td>
                  <td style={{ padding: '1rem', color: 'var(--pulpos-text-muted)' }}>
                    {new Date(quote.createdAt).toLocaleString('es-MX')}
                  </td>
                  <td style={{ padding: '1rem' }}>{quote.customer?.name || 'Público en General'}</td>
                  <td style={{ padding: '1rem' }}>{quote.user.name}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>
                    ${quote.total.toFixed(2)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {quote.status === 'PENDING' ? (
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', backgroundColor: '#fef9c3', color: '#854d0e', borderRadius: '12px' }}>PENDIENTE</span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '12px' }}>CONVERTIDA A VENTA</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Link href={`/ventas/cotizaciones/${quote.id}/imprimir`} target="_blank" style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem', border: '1px solid #8b5cf6', backgroundColor: '#f5f3ff', color: '#7c3aed', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}>
                      Imprimir PDF
                    </Link>
                    {quote.status === 'PENDING' && (
                      <ConvertButton quoteId={quote.id} />
                    )}
                  </td>
                </tr>
              ))}
              {quotes.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                    No hay cotizaciones registradas. Crea tu primera cotización en la parte superior.
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
