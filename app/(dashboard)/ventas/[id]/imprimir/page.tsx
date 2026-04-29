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
        include: { settings: true, tenant: true }
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
  const facturaConfig = config.formatos_factura || {};
  const { logoUrl, primaryColor = '#8b5cf6', showProductSKU, footerNotes, showTaxBreakdown } = facturaConfig;

  // Auto-print script
  const printScript = `
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    }
  `;

  const subtotal = sale.total / 1.16;
  const iva = sale.total - subtotal;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 1.5cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .no-print { display: none !important; }
        }
        body { font-family: 'Inter', system-ui, sans-serif; background: #f1f5f9; margin: 0; padding: 2rem 0; color: #1e293b; }
        .a4-container { width: 21cm; min-height: 29.7cm; margin: 0 auto; background: white; padding: 2cm; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); position: relative; }
        .header-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; margin-bottom: 2rem; border-bottom: 3px solid ${primaryColor}; padding-bottom: 1.5rem; }
        .invoice-title { font-size: 2.5rem; font-weight: 900; color: ${primaryColor}; margin: 0 0 0.5rem 0; text-transform: uppercase; }
        .info-card { background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
        .data-label { font-size: 0.75rem; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 0.25rem; }
        .data-value { font-size: 0.95rem; font-weight: 500; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-size: 0.9rem; }
        .items-table th { background-color: ${primaryColor}; color: white; padding: 0.75rem; text-align: left; font-weight: 600; }
        .items-table td { padding: 0.75rem; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .items-table tr:nth-child(even) td { background-color: #f8fafc; }
        .totals-box { width: 300px; margin-left: auto; background: #f8fafc; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.95rem; }
        .total-final { display: flex; justify-content: space-between; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 2px solid #cbd5e1; font-size: 1.25rem; font-weight: bold; color: ${primaryColor}; }
        .qr-section { margin-top: 2rem; display: flex; align-items: center; gap: 1rem; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px dashed #cbd5e1; }
      `}} />
      <script dangerouslySetInnerHTML={{ __html: printScript }} />
      
      <div className="a4-container">
        {/* Header */}
        <div className="header-grid">
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ maxHeight: '80px', objectFit: 'contain', marginBottom: '1rem' }} />
            ) : (
              <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0 0 1rem 0', color: '#0f172a' }}>
                {sale.branch?.tenant?.name || 'SUCURSAL PRINCIPAL'}
              </h1>
            )}
            <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
              <strong>{sale.branch?.name}</strong><br/>
              {sale.branch?.settings?.address && <>{sale.branch.settings.address.replace(/\\n/g, ', ')}<br/></>}
              {sale.branch?.settings?.phone && <>Tel: {sale.branch.settings.phone}</>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 className="invoice-title">NOTA DE VENTA</h2>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#334155' }}>
              Folio: #{sale.id.slice(0, 8).toUpperCase()}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.5rem' }}>
              Fecha: {new Date(sale.createdAt).toLocaleString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="info-grid">
          <div className="info-card">
            <div className="data-label">Cliente</div>
            <div className="data-value" style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>
              {sale.customer?.name || 'Público en General'}
            </div>
            {sale.customer?.taxId && <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>RFC: {sale.customer.taxId}</div>}
            {sale.customer?.email && <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{sale.customer.email}</div>}
            {sale.customer?.phone && <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Tel: {sale.customer.phone}</div>}
          </div>
          <div className="info-card">
            <div className="data-label">Detalles de la Operación</div>
            <table style={{ width: '100%', fontSize: '0.9rem' }}>
              <tbody>
                <tr><td style={{ color: '#64748b', padding: '0.2rem 0' }}>Método de Pago:</td><td style={{ fontWeight: '600', textAlign: 'right' }}>{sale.paymentMethod === 'CASH' ? 'Efectivo' : sale.paymentMethod === 'CARD' ? 'Tarjeta' : sale.paymentMethod === 'CREDIT' ? 'Crédito' : sale.paymentMethod}</td></tr>
                <tr><td style={{ color: '#64748b', padding: '0.2rem 0' }}>Vendedor:</td><td style={{ fontWeight: '600', textAlign: 'right' }}>{sale.user?.name}</td></tr>
                <tr><td style={{ color: '#64748b', padding: '0.2rem 0' }}>Caja:</td><td style={{ fontWeight: '600', textAlign: 'right' }}>Principal</td></tr>
                <tr><td style={{ color: '#64748b', padding: '0.2rem 0' }}>Estatus:</td><td style={{ fontWeight: 'bold', textAlign: 'right', color: sale.status === 'COMPLETED' ? '#16a34a' : '#dc2626' }}>{sale.status}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Items Table */}
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Cant</th>
              <th>Descripción</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Precio U.</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 'bold', textAlign: 'center' }}>{item.quantity}</td>
                <td>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.product?.name || 'Desconocido'}</div>
                  {item.variant && <div style={{ fontSize: '0.85em', color: '#64748b', marginTop: '0.1rem' }}>Var: {item.variant.attribute}</div>}
                  {showProductSKU && item.product?.sku && <div style={{ fontSize: '0.85em', color: '#64748b', marginTop: '0.1rem' }}>SKU: {item.product.sku}</div>}
                </td>
                <td style={{ textAlign: 'right' }}>${item.price.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                <td style={{ textAlign: 'right', fontWeight: '600' }}>${(item.price * item.quantity).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="totals-box">
          {showTaxBreakdown ? (
            <>
              <div className="total-row"><span>Subtotal:</span><span>${subtotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
              <div className="total-row"><span>IVA (16%):</span><span>${iva.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
            </>
          ) : (
            <div className="total-row"><span>Subtotal:</span><span>${sale.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
          )}
          
          <div className="total-final">
            <span>TOTAL:</span>
            <span>${sale.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
          </div>
          
          {sale.cashAmount ? (
            <div style={{ marginTop: '1rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem' }}>
              <div className="total-row" style={{ fontSize: '0.85rem', color: '#64748b' }}><span>Efectivo Recibido:</span><span>${sale.cashAmount.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
              {sale.cashAmount > sale.total && (
                <div className="total-row" style={{ fontSize: '0.85rem', color: '#64748b' }}><span>Cambio:</span><span>${(sale.cashAmount - sale.total).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer & QR */}
        <div style={{ position: 'absolute', bottom: '2cm', left: '2cm', right: '2cm' }}>
          <div className="qr-section">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://clientes.pulpos.com?ticketId=${sale.id.slice(0, 8)}`} alt="QR Code" style={{ width: '80px', height: '80px' }} />
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#0f172a', fontSize: '1rem' }}>¿Requieres Factura Electrónica?</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                Escanea el código QR o ingresa a <strong>clientes.pulpos.com</strong> con tu folio:<br/>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: primaryColor, letterSpacing: '1px' }}>{sale.id.slice(0, 8).toUpperCase()}</span>
              </p>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <p style={{ marginBottom: '0.25rem' }}>{footerNotes || '¡Gracias por su compra!'}</p>
            <p>Este documento es una representación impresa de una nota de venta interna.<br/>Generado por CAANMA PRO</p>
          </div>
        </div>

      </div>

      {/* Action Buttons (No print) */}
      <div className="no-print" style={{ textAlign: 'center', marginTop: '2rem', paddingBottom: '2rem' }}>
        <button onClick={() => window.print()} style={{ padding: '0.75rem 2rem', cursor: 'pointer', background: primaryColor, color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', marginRight: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          Imprimir Nota
        </button>
        <button onClick={() => window.close()} style={{ padding: '0.75rem 2rem', cursor: 'pointer', background: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold' }}>
          Cerrar Ventana
        </button>
      </div>
    </>
  );
}
