export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintActions from "@/app/components/PrintActions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    select: { folio: true }
  });
  const displayFolio = quote?.folio || id.slice(0, 8).toUpperCase();
  return {
    title: `Cotizacion_${displayFolio}`,
  };
}

// Helper function to truncate product description to max 20 words
function getShortDescription(text: string | null): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= 20) return text;
  return words.slice(0, 20).join(' ') + '...';
}

export default async function ImprimirCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const quote = await prisma.quote.findUnique({
    where: { id: id },
    include: {
      user: true,
      customer: true,
      branch: {
        include: { settings: true, tenant: true }
      },
      items: {
        include: { product: true }
      }
    }
  });

  if (!quote) return notFound();

  let config: any = {};
  if (quote.branch?.settings?.configJson) {
    try {
      config = JSON.parse(quote.branch.settings.configJson);
    } catch(e) {}
  }
  
  const globalLogoUrl = config.global?.logoUrl || '';
  const cotizacionConfig = config.formatos_cotizacion || {};
  const logoUrl = cotizacionConfig.logoUrl || globalLogoUrl;
  const primaryColor = cotizacionConfig.primaryColor || '#0ea5e9'; // Elegant CAANMA Cyan / Sky Blue

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

  // Calculations for dynamic original prices, discounts and totals
  let totalSinDescuento = 0;
  let totalDescuentos = 0;

  const processedItems = quote.items.map(item => {
    const originalPrice = item.product?.price || item.price;
    const finalPrice = item.price;
    const discountPerUnit = originalPrice - finalPrice;
    
    totalSinDescuento += originalPrice * item.quantity;
    totalDescuentos += (discountPerUnit > 0 ? discountPerUnit : 0) * item.quantity;

    return {
      ...item,
      originalPrice,
      finalPrice,
      discountPerUnit
    };
  });

  const quoteIdUpper = quote.folio || quote.id.slice(0, 8).toUpperCase();

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
        
        /* Header styling matching reference */
        .header-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; margin-bottom: 1.5rem; border-bottom: 2px solid ${primaryColor}; padding-bottom: 1.5rem; }
        .title-box { background-color: ${primaryColor}; padding: 1.25rem 2rem; border-radius: 8px; text-align: center; display: flex; align-items: center; justify-content: center; height: fit-content; color: white; }
        .title-text { margin: 0; font-size: 1.4rem; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }
        
        .business-info { margin-top: 1rem; font-size: 0.85rem; line-height: 1.5; color: #475569; }
        .business-name { font-size: 1.25rem; font-weight: 800; color: #0f172a; display: block; margin-bottom: 0.25rem; text-transform: uppercase; }
        
        /* Info Grid */
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; margin-top: 1.5rem; }
        .info-card { background: #f8fafc; padding: 1.25rem; border-radius: 8px; border: 1px solid #e2e8f0; }
        .data-label { font-size: 0.75rem; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem; }
        .data-value { font-size: 1.05rem; font-weight: bold; color: #0f172a; margin-bottom: 0.35rem; }
        
        /* Items Table */
        .items-table { width: 100%; border-collapse: collapse; margin-top: 2rem; font-size: 0.9rem; }
        .items-table th { background-color: #f8fafc; border-top: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; padding: 0.75rem 0.5rem; text-align: left; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5px; }
        .items-table td { padding: 1rem 0.5rem; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        
        /* Product column flex layout */
        .prod-cell { display: flex; gap: 1rem; align-items: flex-start; }
        .prod-img { width: 52px; height: 52px; border-radius: 6px; object-fit: contain; border: 1px solid #e2e8f0; background-color: #f8fafc; flex-shrink: 0; }
        .prod-img-placeholder { width: 52px; height: 52px; border-radius: 6px; background-color: #f1f5f9; border: 1px solid #e2e8f0; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 0.75rem; }
        .prod-name { font-size: 0.9rem; font-weight: 700; color: #0f172a; margin: 0 0 0.15rem 0; text-transform: uppercase; line-height: 1.3; }
        .prod-meta { font-size: 0.75rem; color: #64748b; font-family: monospace; }
        
        .discount-badge {
          display: inline-flex;
          align-items: center;
          background-color: #dcfce7;
          color: #15803d;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          margin-top: 0.25rem;
          width: fit-content;
          border: 1px solid #bbf7d0;
        }
        
        /* Price styling */
        .original-price { text-decoration: line-through; color: #94a3b8; font-size: 0.85rem; margin-right: 0.4rem; }
        .final-price { font-weight: 700; color: #1e293b; }
        
        /* Totals section matching reference */
        .totals-box { width: 320px; margin-left: auto; margin-top: 2rem; border-top: 1px solid #cbd5e1; padding-top: 1rem; font-size: 0.95rem; }
        .total-row { display: flex; justify-content: space-between; padding: 0.35rem 0; color: #475569; }
        .total-row.discount-row { color: #dc2626; font-weight: 500; }
        .total-final { display: flex; justify-content: space-between; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 2px solid #1e293b; font-size: 1.25rem; font-weight: 800; color: #0f172a; }
        
        /* Footer QR Box matching reference */
        .qr-box { border-radius: 8px; border: 1px solid #cbd5e1; padding: 1.25rem; display: flex; align-items: center; gap: 1.5rem; margin-top: 4rem; background-color: #white; }
        .qr-img { width: 72px; height: 72px; flex-shrink: 0; }
        .qr-title { margin: 0 0 0.25rem 0; color: #0f172a; font-size: 0.95rem; font-weight: 800; }
        .qr-text { margin: 0; color: #475569; font-size: 0.85rem; line-height: 1.4; }
      `}} />
      <script dangerouslySetInnerHTML={{ __html: printScript }} />
      
      <div className="letter-container">
        {/* Header Grid */}
        <div className="header-grid">
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain', marginBottom: '0.5rem' }} />
            ) : (
              <span className="business-name">{quote.branch?.tenant?.name || 'PETQRO'}</span>
            )}
            <div className="business-info">
              <strong className="business-name">{quote.branch?.tenant?.name || 'PETQRO'}</strong>
              Sucursal {quote.branch?.name || 'Principal'}<br/>
              {quote.branch?.location ? quote.branch.location.replace(/\\n/g, ', ') : 'Fray junípero serra km 7, Querétaro, México'}<br/>
              {quote.branch?.tenant?.name ? `contacto@${quote.branch.tenant.name.toLowerCase().replace(/\s+/g, '')}.com` : 'ventas@petqro.com'}
            </div>
          </div>
          <div>
            <div className="title-box">
              <h2 className="title-text">Cotización</h2>
            </div>
          </div>
        </div>

        {/* Info Grid with Client and Doc details */}
        {(() => {
          const clientAddress = [
            quote.customer?.street,
            [quote.customer?.exteriorNumber, quote.customer?.interiorNumber].filter(Boolean).join(' '),
            quote.customer?.neighborhood,
            quote.customer?.city,
            quote.customer?.state,
            quote.customer?.zipCode
          ].filter(Boolean).join(', ');

          return (
            <div className="info-grid">
              <div className="info-card">
                <div className="data-label">Cotizado a:</div>
                <div className="data-value">
                  {quote.customer?.legalName || quote.customer?.name || 'Público en General'}
                </div>
                {quote.customer?.taxId && <div><strong style={{ fontSize: '0.8rem', color: '#64748b' }}>RFC:</strong> <span style={{ fontSize: '0.85rem' }}>{quote.customer.taxId}</span></div>}
                {quote.customer?.taxRegime && <div><strong style={{ fontSize: '0.8rem', color: '#64748b' }}>Régimen:</strong> <span style={{ fontSize: '0.85rem' }}>{quote.customer.taxRegime}</span></div>}
                {clientAddress && <div style={{ marginTop: '0.25rem' }}><strong style={{ fontSize: '0.8rem', color: '#64748b' }}>Dirección:</strong> <span style={{ fontSize: '0.85rem', lineHeight: '1.4', display: 'inline-block' }}>{clientAddress}</span></div>}
                {quote.customer?.email && <div><strong style={{ fontSize: '0.8rem', color: '#64748b' }}>Email:</strong> <span style={{ fontSize: '0.85rem' }}>{quote.customer.email}</span></div>}
                {quote.customer?.phone && <div><strong style={{ fontSize: '0.8rem', color: '#64748b' }}>Teléfono:</strong> <span style={{ fontSize: '0.85rem' }}>{quote.customer.phone}</span></div>}
              </div>
              <div className="info-card">
                <div className="data-label">Detalles del Documento:</div>
                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ color: '#64748b', padding: '0.35rem 0', fontWeight: '500' }}>Folio Cotización:</td>
                      <td style={{ fontWeight: '700', textAlign: 'right', color: '#0f172a' }}>#{quoteIdUpper}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#64748b', padding: '0.35rem 0', fontWeight: '500' }}>Fecha Emisión:</td>
                      <td style={{ fontWeight: '600', textAlign: 'right' }}>
                        {new Date(quote.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: '#64748b', padding: '0.35rem 0', fontWeight: '500' }}>Validez hasta:</td>
                      <td style={{ fontWeight: '600', textAlign: 'right', color: '#b91c1c' }}>
                        {new Date(new Date(quote.createdAt).getTime() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })} (15 días)
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: '#64748b', padding: '0.35rem 0', fontWeight: '500' }}>Elaboró:</td>
                      <td style={{ fontWeight: '600', textAlign: 'right' }}>{quote.user?.name || 'Sistema'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Items Table */}
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: '50%' }}>Producto</th>
              <th style={{ width: '15%', textAlign: 'center' }}>Cantidad</th>
              <th style={{ width: '18%', textAlign: 'right' }}>Precio Unitario</th>
              <th style={{ width: '17%', textAlign: 'right' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {processedItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="prod-cell">
                    {item.product?.imageUrl ? (
                      <img src={item.product.imageUrl} alt={item.product.name} className="prod-img" />
                    ) : (
                      <div className="prod-img-placeholder">PET</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <h3 className="prod-name">{item.product?.name || 'Artículo'}</h3>
                      <span className="prod-meta">
                        SKU: {item.product?.sku || '--'}
                        {item.product?.barcode ? ` | EAN: ${item.product.barcode}` : ''}
                      </span>
                      
                      {/* Discount Badge if applicable */}
                      {item.discountPerUnit > 0 && (
                        <span className="discount-badge">
                          -${item.discountPerUnit.toFixed(2)} de Descuento
                        </span>
                      )}
                      
                      {/* Short Description (max 20 words) */}
                      {item.product?.description && (
                        <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', lineHeight: '1.4' }}>
                          {getShortDescription(item.product.description)}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: '500', color: '#1e293b' }}>
                  {item.quantity} {item.product?.unit || 'unidad'}
                </td>
                <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                  {item.discountPerUnit > 0 ? (
                    <>
                      <span className="original-price">${item.originalPrice.toFixed(2)}</span>
                      <span className="final-price">${item.finalPrice.toFixed(2)}</span>
                    </>
                  ) : (
                    <span className="final-price">${item.finalPrice.toFixed(2)}</span>
                  )}
                </td>
                <td style={{ textAlign: 'right', fontWeight: '700', color: '#0f172a', verticalAlign: 'top' }}>
                  ${(item.finalPrice * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="totals-box">
          <div className="total-row">
            <span>Subtotal</span>
            <span>${totalSinDescuento.toFixed(2)}</span>
          </div>
          <div className="total-row discount-row">
            <span>Descuentos</span>
            <span>-${totalDescuentos.toFixed(2)}</span>
          </div>
          <div className="total-final">
            <span>Total</span>
            <span>${quote.total.toFixed(2)}</span>
          </div>
          <div className="total-row" style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', marginTop: '0.25rem' }}>
            <span>IVA 16% Incluido</span>
            <span>${(quote.total - (quote.total / 1.16)).toFixed(2)}</span>
          </div>
        </div>

        {/* Footer QR Box matching reference */}
         <div className="qr-box">
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://caanma.com/clientes/portal?cotizacionId=${quote.id.slice(0, 8)}`} alt="QR Code" className="qr-img" />
          <div>
            <h4 className="qr-title">Escanea para Ver tu Cotización, Solicitar Cambios o Aprobarla</h4>
            <p className="qr-text">
              o ingresa a: <strong style={{ color: primaryColor }}>caanma.com/clientes/portal</strong><br/>
              Código del ticket: <strong>{quoteIdUpper}</strong>
            </p>
          </div>
        </div>

      </div>

      {/* Action Buttons (No print) */}
      <PrintActions primaryColor={primaryColor} printLabel="Imprimir Cotización" />
    </>
  );
}
