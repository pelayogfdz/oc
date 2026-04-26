import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getActiveBranch } from "@/app/actions/auth";

export default async function PrintVentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branch = await getActiveBranch();
  
  const sale = await prisma.sale.findUnique({
    where: { id: id },
    include: {
      user: true,
      customer: true,
      branch: {
        include: { settings: true }
      },
      items: {
        include: { product: true, variant: true }
      }
    }
  });

  if (!sale) return notFound();

  let config: any = {};
  if (sale.branch?.settings?.configJson) {
    try {
      config = JSON.parse(sale.branch.settings.configJson);
    } catch(e) {}
  }
  const ticketConfig = config.formatos_ticket || {};
  const { logoUrl, showProductSKU, showCashierName, footerNotes } = ticketConfig;

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
        {logoUrl && (
          <img src={logoUrl} alt="Logo" style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'contain', margin: '0 auto 1rem auto', display: 'block' }} />
        )}
        {!logoUrl && (
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.25rem 0' }}>{sale.branch?.name || 'SUCURSAL PRINCIPAL'}</h1>
        )}
        <p style={{ margin: '0 0 0.25rem 0' }}>Ticket de Venta</p>
        <p style={{ margin: '0' }}>Folio: <strong>{sale.id.slice(0, 8).toUpperCase()}</strong></p>
        <p style={{ margin: '0.25rem 0 0 0' }}>{new Date(sale.createdAt).toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      {/* Info Vendedor y Cliente */}
      <div style={{ marginBottom: '1rem' }}>
        {showCashierName !== false && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>Le Atendió:</span>
            <strong>{sale.user.name}</strong>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span>Cliente:</span>
          <strong>{sale.customer?.name || 'PUBLICO EN GENERAL'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span>Método Pago:</span>
          <strong>{sale.paymentMethod === 'CASH' ? 'EFECTIVO' : sale.paymentMethod === 'CARD' ? 'TARJETA' : sale.paymentMethod === 'CREDIT' ? 'CRÉDITO' : 'TRANSFERENCIA'}</strong>
        </div>
        {sale.status !== 'COMPLETED' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 'bold', marginTop: '0.5rem' }}>
            <span>ESTADO:</span>
            <span>{sale.status}</span>
          </div>
        )}
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
          {sale.items.map((item) => (
            <tr key={item.id}>
              <td style={{ padding: '0.5rem 0', verticalAlign: 'top' }}>{item.quantity}</td>
              <td style={{ padding: '0.5rem 0', verticalAlign: 'top' }}>
                <div>{item.product?.name || 'Desconocido'}</div>
                {item.variant && <div style={{ fontSize: '0.85em', color: '#666' }}>Var: {item.variant.attribute}</div>}
                {showProductSKU && item.product?.sku && <div style={{ fontSize: '0.85em', color: '#666' }}>SKU: {item.product.sku}</div>}
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
          <span>{sale.items.reduce((sum, item) => sum + item.quantity, 0)} PZA</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #000' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>TOTAL:</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>${sale.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
        </div>
        {sale.cashAmount ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span>Efectivo Recibido:</span>
            <span>${sale.cashAmount.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
          </div>
        ) : null}
        {sale.cashAmount && sale.cashAmount > sale.total ? (
           <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
             <span>Cambio:</span>
             <span>${(sale.cashAmount - sale.total).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
           </div>
        ) : null}
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '11px', color: '#555' }}>
        <p>{footerNotes || '¡Gracias por su compra!'}</p>
        <p>CAANMA PRO v1.0</p>
      </div>

      
      <div className="no-print" style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button onClick={() => window.close()} style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: '#ccc', border: 'none', borderRadius: '4px', fontSize: '12px' }}>Cerrar Ventana</button>
      </div>
    </div>
  );
}
