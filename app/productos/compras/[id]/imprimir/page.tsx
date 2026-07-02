export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getActiveBranch } from "@/app/actions/auth";
import PrintActions from "@/app/components/PrintActions";

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
        include: { 
          product: true,
          fuelTraceability: true
        }
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
  
  const globalLogoUrl = config.global?.logoUrl || '';
  const facturaConfig = config.formatos_factura || {};
  const logoUrl = facturaConfig.logoUrl || globalLogoUrl;
  const { primaryColor = '#eab308', footerNotes, showTaxBreakdown } = facturaConfig;

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

  const subtotal = purchase.total / 1.16;
  const iva = purchase.total - subtotal;

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
        .header-grid { display: grid; grid-template-columns: 2fr 1.2fr; gap: 2rem; margin-bottom: 1.5rem; border-bottom: 2px solid ${primaryColor}; padding-bottom: 1.5rem; }
        .title-box { background-color: ${primaryColor}; padding: 1rem 1.5rem; border-radius: 8px; text-align: center; display: flex; align-items: center; justify-content: center; height: fit-content; color: white; }
        .title-text { margin: 0; font-size: 1.1rem; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        .info-card { background: #f8fafc; padding: 1.25rem; border-radius: 8px; border: 1px solid #e2e8f0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; margin-top: 1.5rem; }
        .data-label { font-size: 0.75rem; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem; }
        .data-value { font-size: 1.05rem; font-weight: bold; color: #0f172a; margin-bottom: 0.35rem; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-size: 0.9rem; }
        .items-table th { background-color: #f8fafc; border-top: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; padding: 0.75rem 0.5rem; text-align: left; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5px; }
        .items-table td { padding: 0.75rem 0.5rem; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
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
                {purchase.branch?.tenant?.name || 'EMPRESA PRINCIPAL'}
              </h1>
            )}
            <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
              <strong>DOCUMENTO DE CONTROL INTERNO</strong><br/>
              Sucursal Receptora: {purchase.branch?.name || 'Bodega Central'}<br/>
              {purchase.branch?.location && <>{purchase.branch.location.replace(/\\n/g, ', ')}<br/></>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <div className="title-box" style={{ width: '100%', boxSizing: 'border-box' }}>
              <h2 className="title-text">Orden de Compra</h2>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#334155', marginTop: '0.25rem' }}>
              Folio: #{purchase.folio || "OC-" + purchase.id.slice(0, 8).toUpperCase()}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Fecha Emisión: {new Date(purchase.createdAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid', borderColor: purchase.status === 'COMPLETED' ? '#16a34a' : purchase.status === 'PENDING' ? '#eab308' : '#cbd5e1', color: purchase.status === 'COMPLETED' ? '#16a34a' : purchase.status === 'PENDING' ? '#ca8a04' : '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
              ESTADO: {purchase.status === 'COMPLETED' ? 'RECIBIDO' : purchase.status === 'PENDING' ? 'PENDIENTE' : purchase.status}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="info-grid">
          <div className="info-card">
            <div className="data-label">DATOS DEL PROVEEDOR</div>
            <div className="data-value">
              {purchase.supplier?.name || 'Proveedor General'}
            </div>
            {purchase.supplier?.taxId && <div><strong style={{ fontSize: '0.8rem', color: '#64748b' }}>RFC:</strong> <span style={{ fontSize: '0.85rem' }}>{purchase.supplier.taxId}</span></div>}
            {purchase.supplier?.email && <div><strong style={{ fontSize: '0.8rem', color: '#64748b' }}>Email:</strong> <span style={{ fontSize: '0.85rem' }}>{purchase.supplier.email}</span></div>}
            {purchase.supplier?.phone && <div><strong style={{ fontSize: '0.8rem', color: '#64748b' }}>Teléfono:</strong> <span style={{ fontSize: '0.85rem' }}>{purchase.supplier.phone}</span></div>}
          </div>
          
          <div className="info-card">
            <div className="data-label">DATOS DE LA OPERACIÓN</div>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#64748b', padding: '0.35rem 0', fontWeight: '500' }}>Registrado por:</td>
                  <td style={{ fontWeight: '600', textAlign: 'right', color: '#0f172a' }}>{purchase.user?.name || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '0.35rem 0', fontWeight: '500' }}>Referencia OC:</td>
                  <td style={{ fontWeight: '600', textAlign: 'right', color: '#0f172a' }}>{purchase.folio || purchase.id.slice(0, 8).toUpperCase()}</td>
                </tr>
                {purchase.supplierFolio && (
                  <tr>
                    <td style={{ color: '#64748b', padding: '0.35rem 0', fontWeight: '500' }}>Folio Factura Prov:</td>
                    <td style={{ fontWeight: '700', textAlign: 'right', fontFamily: 'monospace', color: '#0f172a' }}>{purchase.supplierFolio}</td>
                  </tr>
                )}
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
                <td style={{ fontWeight: '500', color: '#1e293b' }}>
                  <div>{item.product?.name || 'Desconocido'}</div>
                  {item.fuelTraceability && (
                    <div style={{ marginTop: '0.4rem', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.75rem', color: '#475569', backgroundColor: '#f8fafc' }}>
                      <span style={{ fontWeight: 'bold', display: 'block', color: '#1e293b', marginBottom: '0.2rem' }}>Trazabilidad de Combustible:</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                        {item.fuelTraceability.pedimento && <div><strong>Pedimento:</strong> {item.fuelTraceability.pedimento}</div>}
                        {item.fuelTraceability.pedimentoDate && <div><strong>Fecha Ped.:</strong> {new Date(item.fuelTraceability.pedimentoDate).toLocaleDateString('es-MX')}</div>}
                        {item.fuelTraceability.density && <div><strong>Densidad:</strong> {item.fuelTraceability.density} kg/m³</div>}
                        {item.fuelTraceability.temperature && <div><strong>Temp:</strong> {item.fuelTraceability.temperature} °C</div>}
                        {item.fuelTraceability.octane && <div><strong>Octanaje:</strong> {item.fuelTraceability.octane}</div>}
                        {item.fuelTraceability.volume20c && <div><strong>Vol. 20°C:</strong> {item.fuelTraceability.volume20c} Lts</div>}
                        {item.fuelTraceability.crePermitSupplier && <div><strong>CRE Prov:</strong> {item.fuelTraceability.crePermitSupplier}</div>}
                        {item.fuelTraceability.crePermitCarrier && <div><strong>CRE Transp:</strong> {item.fuelTraceability.crePermitCarrier}</div>}
                        {item.fuelTraceability.certNumber && <div style={{ gridColumn: 'span 2' }}><strong>Cert. Calidad:</strong> {item.fuelTraceability.certNumber}</div>}
                      </div>
                    </div>
                  )}
                </td>
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
        <div style={{ marginTop: '4rem', paddingBottom: '1rem' }}>
          <div className="qr-section">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://caanma.com/clientes/portal?compraId=${purchase.id.slice(0, 8)}`} alt="QR Code" style={{ width: '80px', height: '80px' }} />
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#0f172a', fontSize: '1rem' }}>Verificación Interna</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                Escanea el código QR o ingresa a <strong>caanma.com/clientes/portal</strong> con el folio:<br/>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: primaryColor, letterSpacing: '1px' }}>{purchase.folio || "OC-" + purchase.id.slice(0, 8).toUpperCase()}</span>
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
      <PrintActions primaryColor={primaryColor} printLabel="Imprimir Orden" />
    </>
  );
}
