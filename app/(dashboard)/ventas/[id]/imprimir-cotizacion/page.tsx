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
      branch: {
        include: { settings: true }
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
  const cotizacionConfig = config.formatos_cotizacion || {};
  const { logoUrl, primaryColor = '#3b82f6', showProductImages, showProductSKU, footerNotes } = cotizacionConfig;

  // Auto-print script
  const printScript = `
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    }
  `;

  return (
    <div style={{ maxWidth: '210mm', minHeight: '297mm', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', padding: '40px', backgroundColor: 'white' }}>
      <script dangerouslySetInnerHTML={{ __html: printScript }} />
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white; margin: 0; padding: 0; }
          .no-print { display: none !important; }
        }
      `}} />
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', borderBottom: `2px solid ${primaryColor}`, paddingBottom: '1.5rem' }}>
        <div>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ maxWidth: '250px', maxHeight: '100px', objectFit: 'contain' }} />
          ) : (
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0', color: primaryColor }}>{quote.branch?.name || branch.name || 'EMPRESA'}</h1>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#475569' }}>COTIZACIÓN</h2>
          <p style={{ margin: '0', fontSize: '1rem' }}>Folio: <strong>COT-{quote.id.slice(0, 8).toUpperCase()}</strong></p>
          <p style={{ margin: '0', fontSize: '0.9rem', color: '#64748b' }}>Fecha: {new Date(quote.createdAt).toLocaleDateString('es-MX')}</p>
          <p style={{ margin: '0', fontSize: '0.9rem', color: '#64748b' }}>Vigencia: 15 días</p>
        </div>
      </div>

      {/* Info Vendedor y Cliente */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: primaryColor }}>PREPARADO PARA:</h3>
          <p style={{ margin: '0', fontSize: '1rem', fontWeight: '500' }}>{quote.customer?.name || 'PÚBLICO EN GENERAL'}</p>
          {quote.customer?.email && <p style={{ margin: '0', fontSize: '0.9rem', color: '#64748b' }}>{quote.customer.email}</p>}
          {quote.customer?.phone && <p style={{ margin: '0', fontSize: '0.9rem', color: '#64748b' }}>{quote.customer.phone}</p>}
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: primaryColor }}>PREPARADO POR:</h3>
          <p style={{ margin: '0', fontSize: '1rem', fontWeight: '500' }}>{quote.user.name}</p>
          <p style={{ margin: '0', fontSize: '0.9rem', color: '#64748b' }}>{quote.user.email}</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '2rem' }}>
        <thead>
          <tr style={{ backgroundColor: primaryColor, color: 'white' }}>
            {showProductImages && <th style={{ padding: '0.75rem', width: '60px' }}>Img</th>}
            <th style={{ padding: '0.75rem' }}>Descripción</th>
            <th style={{ padding: '0.75rem', textAlign: 'center' }}>Cant</th>
            <th style={{ padding: '0.75rem', textAlign: 'right' }}>Precio Unit.</th>
            <th style={{ padding: '0.75rem', textAlign: 'right' }}>Importe</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((item, index) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? '#f8fafc' : 'white' }}>
              {showProductImages && (
                <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>
                  {item.product?.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}></div>
                  )}
                </td>
              )}
              <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>
                <div style={{ fontWeight: '500' }}>{item.product?.name || 'Desconocido'}</div>
                {showProductSKU && item.product?.sku && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>SKU: {item.product.sku}</div>}
              </td>
              <td style={{ padding: '0.75rem', verticalAlign: 'middle', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ padding: '0.75rem', verticalAlign: 'middle', textAlign: 'right' }}>
                \${item.price.toLocaleString('es-MX', {minimumFractionDigits: 2})}
              </td>
              <td style={{ padding: '0.75rem', verticalAlign: 'middle', textAlign: 'right', fontWeight: '500' }}>
                \${(item.price * item.quantity).toLocaleString('es-MX', {minimumFractionDigits: 2})}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3rem' }}>
        <div style={{ width: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ color: '#64748b' }}>Subtotal:</span>
            <span>\${quote.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', color: primaryColor, fontWeight: 'bold', fontSize: '1.25rem' }}>
            <span>TOTAL:</span>
            <span>\${quote.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
          </div>
        </div>
      </div>

      {/* Footer Notes */}
      <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#64748b' }}>
        <p style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>Términos y Condiciones:</p>
        <p style={{ whiteSpace: 'pre-wrap' }}>{footerNotes || 'Precios sujetos a cambios sin previo aviso.\\nEsta cotización es válida únicamente por el periodo de vigencia indicado.'}</p>
      </div>

      <div className="no-print" style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button onClick={() => window.close()} style={{ padding: '0.75rem 1.5rem', cursor: 'pointer', background: '#e2e8f0', color: '#1e293b', fontWeight: 'bold', border: 'none', borderRadius: '4px', fontSize: '14px' }}>
          Cerrar Ventana
        </button>
      </div>
    </div>
  );
}
