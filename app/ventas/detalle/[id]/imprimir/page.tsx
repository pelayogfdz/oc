export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintActions from "@/app/components/PrintActions";

export default async function PrintVentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
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
      const parsed = JSON.parse(sale.branch.settings.configJson);
      if (parsed && typeof parsed === 'object') {
        config = parsed;
      }
    } catch(e) {}
  }
  const globalLogoUrl = config?.global?.logoUrl || '';
  const facturaConfig = config?.formatos_factura || {};
  const logoUrl = facturaConfig?.logoUrl || globalLogoUrl;
  const { primaryColor = '#8b5cf6', showProductSKU = false, footerNotes = '', showTaxBreakdown = false } = facturaConfig || {};

  // Auto-print script
  const printScript = `
    (function() {
      function doPrint() {
        window.print();
      }
      if (document.readyState === 'complete') {
        setTimeout(doPrint, 500);
      } else {
        window.addEventListener('load', function() {
          setTimeout(doPrint, 500);
        });
      }
    })();
  `;

  const subtotal = (sale.total || 0) / 1.16;
  const iva = (sale.total || 0) - subtotal;


  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: letter portrait; margin: 1cm; }
          html, body { height: auto !important; overflow: visible !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .letter-container { width: 100% !important; max-width: none !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
        }
        body { font-family: 'Inter', system-ui, sans-serif; background: #f1f5f9; margin: 0; padding: 2rem 0; color: #1e293b; }
        .letter-container { width: 21.59cm; min-height: 27.94cm; margin: 0 auto; background: white; padding: 1.5cm; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); position: relative; box-sizing: border-box; }
        .header-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; margin-bottom: 1.5rem; border-bottom: 2px solid ${primaryColor}; padding-bottom: 1.5rem; }
        .title-box { background-color: ${primaryColor}; padding: 1.25rem 2rem; border-radius: 8px; text-align: center; display: flex; align-items: center; justify-content: center; height: fit-content; color: white; }
        .title-text { margin: 0; font-size: 1.25rem; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }
        .info-card { background: #f8fafc; padding: 1.25rem; border-radius: 8px; border: 1px solid #e2e8f0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; margin-top: 1.5rem; }
        .data-label { font-size: 0.75rem; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem; }
        .data-value { font-size: 1.05rem; font-weight: bold; color: #0f172a; margin-bottom: 0.35rem; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-size: 0.9rem; }
        .items-table th { background-color: #f8fafc; border-top: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; padding: 0.75rem 0.5rem; text-align: left; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5px; }
        .items-table td { padding: 0.75rem 0.5rem; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .totals-box { width: 300px; margin-left: auto; background: #f8fafc; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.95rem; }
        .total-final { display: flex; justify-content: space-between; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 2px solid #cbd5e1; font-size: 1.25rem; font-weight: bold; color: ${primaryColor}; }
        .qr-section { margin-top: 2rem; display: flex; align-items: center; gap: 1rem; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px dashed #cbd5e1; }
      `}} />
      <script dangerouslySetInnerHTML={{ __html: printScript }} />
      
      <div className="letter-container">
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
              {sale.branch?.location && <>{sale.branch.location.replace(/\\n/g, ', ')}<br/></>}
            </div>
          </div>
          <div>
            <div className="title-box">
              <h2 className="title-text">Nota de Venta</h2>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="info-grid">
          <div className="info-card">
            <div className="data-label">Cliente</div>
            <div className="data-value">
              {sale.customer?.name || 'Público en General'}
            </div>
            {sale.customer?.taxId && <div><strong style={{ fontSize: '0.8rem', color: '#64748b' }}>RFC:</strong> <span style={{ fontSize: '0.85rem' }}>{sale.customer.taxId}</span></div>}
            {sale.customer?.email && <div><strong style={{ fontSize: '0.8rem', color: '#64748b' }}>Email:</strong> <span style={{ fontSize: '0.85rem' }}>{sale.customer.email}</span></div>}
            {sale.customer?.phone && <div><strong style={{ fontSize: '0.8rem', color: '#64748b' }}>Teléfono:</strong> <span style={{ fontSize: '0.85rem' }}>{sale.customer.phone}</span></div>}
          </div>
          <div className="info-card">
            <div className="data-label">Detalles de la Operación</div>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#64748b', padding: '0.35rem 0', fontWeight: '500' }}>Folio Venta:</td>
                  <td style={{ fontWeight: '700', textAlign: 'right', color: '#0f172a' }}>#{sale.folio || sale.id.slice(0, 8).toUpperCase()}</td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '0.35rem 0', fontWeight: '500' }}>Fecha Venta:</td>
                  <td style={{ fontWeight: '600', textAlign: 'right', color: '#0f172a' }}>
                    {new Date(sale.createdAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '0.35rem 0', fontWeight: '500' }}>Método de Pago:</td>
                  <td style={{ fontWeight: '600', textAlign: 'right', color: '#0f172a' }}>
                    {sale.paymentMethod === 'CASH' ? 'Efectivo' : sale.paymentMethod === 'CARD' ? 'Tarjeta' : sale.paymentMethod === 'CREDIT' ? 'Crédito' : sale.paymentMethod}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '0.35rem 0', fontWeight: '500' }}>Vendedor:</td>
                  <td style={{ fontWeight: '600', textAlign: 'right', color: '#0f172a' }}>{sale.user?.name || 'Sistema'}</td>
                </tr>
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
                  <div style={{ fontSize: '0.85em', color: '#64748b', marginTop: '0.1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {item.product?.sku && <span>SKU: {item.product.sku}</span>}
                    {item.product?.barcode && <span>| Código: {item.product.barcode}</span>}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>${(item.price || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                <td style={{ textAlign: 'right', fontWeight: '600' }}>${((item.price || 0) * (item.quantity || 0)).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="totals-box">
          {showTaxBreakdown ? (
            <>
              <div className="total-row"><span>Subtotal:</span><span>${(subtotal || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
              <div className="total-row"><span>IVA (16%):</span><span>${(iva || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
            </>
          ) : (
            <div className="total-row"><span>Subtotal:</span><span>${(sale.total || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
          )}
          
          <div className="total-final">
            <span>TOTAL:</span>
            <span>${(sale.total || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
          </div>
          
          {sale.cashAmount ? (
            <div style={{ marginTop: '1rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem' }}>
              <div className="total-row" style={{ fontSize: '0.85rem', color: '#64748b' }}><span>Efectivo Recibido:</span><span>${(sale.cashAmount || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
              {sale.cashAmount > sale.total && (
                <div className="total-row" style={{ fontSize: '0.85rem', color: '#64748b' }}><span>Cambio:</span><span>${((sale.cashAmount || 0) - (sale.total || 0)).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer & QR */}
        <div style={{ marginTop: '4rem', paddingBottom: '1rem' }}>
          <div className="qr-section">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`https://caanma.com/clientes/portal?ticketId=${sale.folio || sale.id.slice(0, 8)}`)}`} alt="QR Code" style={{ width: '80px', height: '80px' }} />
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#0f172a', fontSize: '1rem' }}>¿Requieres Factura Electrónica?</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                Escanea el código QR o ingresa a <strong>caanma.com/clientes/portal</strong> con tu folio:<br/>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: primaryColor, letterSpacing: '1px' }}>{sale.folio || sale.id.slice(0, 8).toUpperCase()}</span>
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
      <PrintActions primaryColor={primaryColor} printLabel="Imprimir Nota" />
    </>
  );
}
