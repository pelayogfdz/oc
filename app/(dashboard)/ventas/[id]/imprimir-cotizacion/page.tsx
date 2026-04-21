import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getActiveBranch } from "@/app/actions/auth";

export default async function ImprimirCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branch = await getActiveBranch();
  
  const quote = await prisma.quote.findUnique({
    where: { id: id },
    include: {
      user: true,
      customer: true,
      branch: true,
      items: {
        include: { product: true }
      }
    }
  });

  if (!quote) return notFound();

  // Auto-print script
  const printScript = `
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    }
  `;

  return (
    <div style={{ maxWidth: '350px', margin: '0 auto', fontFamily: 'monospace', color: 'black', padding: '1rem', fontSize: '13px' }}>
      <script dangerouslySetInnerHTML={{ __html: printScript }} />
      
      {/* Ticket Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px dashed #ccc' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.25rem 0' }}>{quote.branch?.name || branch.name || 'SUCURSAL PRINCIPAL'}</h1>
        <p style={{ margin: '0 0 0.25rem 0' }}>Cotización Comercial</p>
        <p style={{ margin: '0' }}>Folio: <strong>COT-{quote.id.slice(0, 8).toUpperCase()}</strong></p>
        <p style={{ margin: '0.25rem 0 0 0' }}>{new Date(quote.createdAt).toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      {/* Info Vendedor y Cliente */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span>Le Atendió:</span>
          <strong>{quote.user.name}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span>Cliente:</span>
          <strong>{quote.customer?.name || 'PUBLICO EN GENERAL'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span>Vigencia:</span>
          <strong>15 días hábiles</strong>
        </div>
      </div>

      <div style={{ borderBottom: '1px dashed #ccc', marginBottom: '1rem' }}></div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '1rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ paddingBottom: '0.5rem', fontWeight: 'bold' }}>Cant</th>
            <th style={{ paddingBottom: '0.5rem', fontWeight: 'bold' }}>Descripción</th>
            <th style={{ paddingBottom: '0.5rem', fontWeight: 'bold', textAlign: 'right' }}>Importe</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((item) => (
            <tr key={item.id}>
              <td style={{ padding: '0.5rem 0', verticalAlign: 'top' }}>{item.quantity}</td>
              <td style={{ padding: '0.5rem 0', verticalAlign: 'top' }}>
                <div>{item.product?.name || 'Desconocido'}</div>
              </td>
              <td style={{ padding: '0.5rem 0', verticalAlign: 'top', textAlign: 'right' }}>
                ${(item.price * item.quantity).toLocaleString('es-MX', {minimumFractionDigits: 2})}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderBottom: '1px dashed #ccc', marginBottom: '1rem' }}></div>

      {/* Totals */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span>ARTÍCULOS:</span>
          <span>{quote.items.reduce((sum, item) => sum + item.quantity, 0)} PZA</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #000' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>TOTAL:</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>${quote.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '11px', color: '#555' }}>
        <p>Precios sujetos a cambios sin previo aviso.</p>
        <p>CAANMA PRO v1.0</p>
      </div>

      
      <div className="no-print" style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button onClick={() => window.close()} style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: '#ccc', border: 'none', borderRadius: '4px', fontSize: '12px' }}>Cerrar Ventana</button>
      </div>
    </div>
  );
}
