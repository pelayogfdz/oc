import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getActiveBranch } from "@/app/actions/auth";

export default async function PrintPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branch = await getActiveBranch();
  
  const purchase = await prisma.purchase.findUnique({
    where: { id: id },
    include: {
      branch: {
        include: { settings: true, tenant: true }
      },
      supplier: true,
      user: true,
      items: {
        include: { product: true }
      }
    }
  });

  if (!purchase) return notFound();

  // Basic authorization: user must be part of branch
  if (branch.id !== purchase.branchId) {
    return <div>No autorizado para ver esta compra.</div>;
  }

  let config: any = {};
  if (purchase.branch?.settings?.configJson) {
    try {
      config = JSON.parse(purchase.branch.settings.configJson);
    } catch(e) {}
  }
  
  const facturaConfig = config.formatos_factura || {};
  const { logoUrl, primaryColor = '#eab308', footerNotes, showTaxBreakdown } = facturaConfig;

  // Auto-print script
  const printScript = `
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    }
  `;

  const subtotal = purchase.total / 1.16;
  const iva = purchase.total - subtotal;

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
        .invoice-title { font-size: 2.2rem; font-weight: 900; color: ${primaryColor}; margin: 0 0 0.5rem 0; text-transform: uppercase; line-height: 1.1; }
        .info-card { background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
        .data-label { font-size: 0.75rem; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 0.25rem; }
        .data-value { font-size: 0.95rem; font-weight: 500; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-size: 0.9rem; }
        .items-table th { background-color: ${primaryColor}; color: white; padding: 0.75rem; text-align: left; font-weight: 600; }
        .items-table td { padding: 0.75rem; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
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
                {purchase.branch?.tenant?.name || 'EMPRESA PRINCIPAL'}
              </h1>
            )}
            <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
              <strong>DOCUMENTO INTERNO</strong><br/>
              Sucursal Receptora: {purchase.branch?.name || 'Bodega Central'}<br/>
              {purchase.branch?.location && <>{purchase.branch.location.replace(/\\n/g, ', ')}<br/></>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 className="invoice-title">ORDEN DE COMPRA</h2>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#334155' }}>
              Folio: #OC-{purchase.id.slice(0, 8).toUpperCase()}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.5rem' }}>
              Fecha Emisión: {new Date(purchase.createdAt).toLocaleString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid', borderColor: purchase.status === 'COMPLETED' ? '#16a34a' : purchase.status === 'PENDING' ? '#eab308' : '#cbd5e1', color: purchase.status === 'COMPLETED' ? '#16a34a' : purchase.status === 'PENDING' ? '#ca8a04' : '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
              ESTADO: {purchase.status === 'COMPLETED' ? 'RECIBIDO' : purchase.status === 'PENDING' ? 'PENDIENTE' : purchase.status}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="info-grid">
          <div className="info-card">
            <div className="data-label">DATOS DEL PROVEEDOR</div>
            <div className="data-value" style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>
              {purchase.supplier?.name || 'Proveedor General'}
            </div>
            {purchase.supplier?.taxId && <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>RFC: {purchase.supplier.taxId}</div>}
            {purchase.supplier?.email && <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{purchase.supplier.email}</div>}
            {purchase.supplier?.phone && <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Tel: {purchase.supplier.phone}</div>}
          </div>
          
          <div className="info-card">
            <div className="data-label">DATOS DE LA OPERACIÓN</div>
            <table style={{ width: '100%', fontSize: '0.9rem' }}>
              <tbody>
                <tr><td style={{ color: '#64748b', padding: '0.2rem 0' }}>Registrado por:</td><td style={{ fontWeight: '600', textAlign: 'right' }}>{purchase.user?.name || 'N/A'}</td></tr>
                <tr><td style={{ color: '#64748b', padding: '0.2rem 0' }}>Referencia:</td><td style={{ fontWeight: '600', textAlign: 'right' }}>{purchase.id.slice(0, 8)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Items Table */}
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: '60px', textAlign: 'center' }}>Cant</th>
              <th style={{ width: '120px' }}>Código/SKU</th>
              <th>Descripción del Artículo</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Costo U.</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '1.1rem' }}>{item.quantity}</td>
                <td style={{ fontFamily: 'monospace', color: '#475569' }}>{item.product?.sku || '--'}</td>
                <td style={{ fontWeight: '500', color: '#1e293b' }}>{item.product?.name || 'Desconocido'}</td>
                <td style={{ textAlign: 'right' }}>${item.cost.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                <td style={{ textAlign: 'right', fontWeight: '600' }}>${(item.cost * item.quantity).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
              </tr>
            ))}
            {purchase.items.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No hay artículos registrados en esta compra.
                </td>
              </tr>
            )}
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
            <div className="total-row"><span>Subtotal:</span><span>${purchase.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
          )}
          
          <div className="total-final">
            <span>TOTAL:</span>
            <span>${purchase.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
          </div>
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '4rem', paddingTop: '2rem' }}>
          <div style={{ textAlign: 'center', width: '250px' }}>
            <div style={{ borderBottom: '2px solid #cbd5e1', marginBottom: '0.5rem', height: '40px' }}></div>
            <div style={{ fontWeight: 'bold', color: '#1e293b' }}>Firma de Revisión (Sistema)</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>({purchase.user?.name || 'Bodega Central'})</div>
          </div>
          <div style={{ textAlign: 'center', width: '250px' }}>
            <div style={{ borderBottom: '2px solid #cbd5e1', marginBottom: '0.5rem', height: '40px' }}></div>
            <div style={{ fontWeight: 'bold', color: '#1e293b' }}>Firma Proveedor / Repartidor</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>({purchase.supplier?.name || 'Proveedor'})</div>
          </div>
        </div>

        {/* Footer & QR */}
        <div style={{ position: 'absolute', bottom: '2cm', left: '2cm', right: '2cm' }}>
          <div className="qr-section">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://clientes.pulpos.com?compraId=${purchase.id.slice(0, 8)}`} alt="QR Code" style={{ width: '80px', height: '80px' }} />
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#0f172a', fontSize: '1rem' }}>Verificación Interna</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                Escanea el código QR o ingresa a <strong>clientes.pulpos.com</strong> con el folio:<br/>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: primaryColor, letterSpacing: '1px' }}>OC-{purchase.id.slice(0, 8).toUpperCase()}</span>
              </p>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <p style={{ marginBottom: '0.25rem' }}>{footerNotes || 'Documento exclusivo para control interno de inventario.'}</p>
            <p>Generado por CAANMA PRO</p>
          </div>
        </div>

      </div>

      {/* Action Buttons (No print) */}
      <div className="no-print" style={{ textAlign: 'center', marginTop: '2rem', paddingBottom: '2rem' }}>
        <button onClick={() => window.print()} style={{ padding: '0.75rem 2rem', cursor: 'pointer', background: primaryColor, color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', marginRight: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          Imprimir Orden
        </button>
        <button onClick={() => window.close()} style={{ padding: '0.75rem 2rem', cursor: 'pointer', background: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold' }}>
          Cerrar Ventana
        </button>
      </div>
    </>
  );
}
