import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getActiveBranch } from "@/app/actions/auth";
import PrintActions from "@/app/components/PrintActions";

export default async function PrintTransferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branch = await getActiveBranch();
  if (!branch) return notFound();
  
  const transfer = await prisma.transfer.findUnique({
    where: { id: id },
    include: {
      branch: {
        include: { settings: true, tenant: true }
      },
      toBranch: true,
      createdBy: true,
      receivedBy: true,
      items: {
        include: { product: true }
      }
    }
  });

  if (!transfer) return notFound();

  // Ensure the transfer belongs to the user's tenant
  const transferTenantId = transfer.branch?.tenantId || transfer.toBranch?.tenantId;
  if (transferTenantId !== branch.tenantId) {
    return notFound();
  }

  // Basic authorization: user must be part of either origin or destination branch, or be a global user
  if (branch.id !== 'GLOBAL' && branch.id !== transfer.branchId && branch.id !== transfer.toBranchId) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #f87171', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>ACCESO NO AUTORIZADO</h2>
        <p>No tienes permisos para ver o imprimir este traspaso.</p>
      </div>
    );
  }

  let config: any = {};
  if (transfer.branch?.settings?.configJson) {
    try {
      config = JSON.parse(transfer.branch.settings.configJson);
    } catch(e) {}
  }
  
  const globalLogoUrl = config.global?.logoUrl || '';
  const facturaConfig = config.formatos_factura || {};
  const logoUrl = facturaConfig.logoUrl || globalLogoUrl;
  const { primaryColor = '#4f46e5', footerNotes } = facturaConfig;

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
                {transfer.branch?.tenant?.name || 'EMPRESA PRINCIPAL'}
              </h1>
            )}
            <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
              <strong>DOCUMENTO INTERNO</strong><br/>
              Emisión desde: {transfer.branch?.name || 'Bodega Central'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 className="invoice-title">REMISIÓN DE TRASPASO</h2>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#334155' }}>
              Folio: #{transfer.folio || "TR-" + transfer.id.slice(0, 8).toUpperCase()}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.5rem' }}>
              Fecha Emisión: {new Date(transfer.createdAt).toLocaleString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid', borderColor: transfer.status === 'COMPLETED' ? '#16a34a' : transfer.status === 'IN_TRANSIT' ? '#eab308' : '#cbd5e1', color: transfer.status === 'COMPLETED' ? '#16a34a' : transfer.status === 'IN_TRANSIT' ? '#ca8a04' : '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
              ESTADO: {transfer.status === 'COMPLETED' ? 'COMPLETADO' : transfer.status === 'IN_TRANSIT' ? 'EN TRÁNSITO' : transfer.status}
            </div>
          </div>
        </div>

        {/* Origin / Dest Info Grid */}
        <div className="info-grid">
          <div className="info-card">
            <div className="data-label">SUCURSAL ORIGEN (SALIDA)</div>
            <div className="data-value" style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>
              {transfer.branch?.name || 'Bodega Central'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>Autorizado / Enviado por:</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{transfer.createdBy?.name || 'N/A'}</div>
          </div>
          
          <div className="info-card">
            <div className="data-label">SUCURSAL DESTINO (ENTRADA)</div>
            <div className="data-value" style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>
              {transfer.toBranch?.name || 'N/A'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>Recibido por:</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{transfer.receivedBy?.name || 'Pendiente de Recepción'}</div>
          </div>
        </div>

        {/* Items Table */}
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: '60px', textAlign: 'center' }}>Cant</th>
              <th style={{ width: '120px' }}>Código/SKU</th>
              <th>Descripción del Artículo</th>
            </tr>
          </thead>
          <tbody>
            {transfer.items.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '1.1rem' }}>{item.quantity}</td>
                <td style={{ fontFamily: 'monospace', color: '#475569' }}>{item.product?.sku || '--'}</td>
                <td style={{ fontWeight: '500', color: '#1e293b' }}>{item.product?.name || 'Desconocido'}</td>
              </tr>
            ))}
            {transfer.items.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No hay artículos en este traspaso.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals Box for Quantity */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold', color: primaryColor }}>
              <span>Total Artículos:</span>
              <span>{transfer.items.reduce((acc, curr) => acc + curr.quantity, 0)} PZA</span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '4rem', paddingTop: '2rem' }}>
          <div style={{ textAlign: 'center', width: '250px' }}>
            <div style={{ borderBottom: '2px solid #cbd5e1', marginBottom: '0.5rem', height: '40px' }}></div>
            <div style={{ fontWeight: 'bold', color: '#1e293b' }}>Firma de Entrega</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>({transfer.branch?.name || 'Bodega Central'})</div>
          </div>
          <div style={{ textAlign: 'center', width: '250px' }}>
            <div style={{ borderBottom: '2px solid #cbd5e1', marginBottom: '0.5rem', height: '40px' }}></div>
            <div style={{ fontWeight: 'bold', color: '#1e293b' }}>Firma de Recepción</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>({transfer.toBranch?.name || 'Destino'})</div>
          </div>
        </div>

        {/* Footer & QR */}
        <div style={{ position: 'absolute', bottom: '2cm', left: '2cm', right: '2cm' }}>
          <div className="qr-section">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://caanma.com/clientes/portal?traspasoId=${transfer.id.slice(0, 8)}`} alt="QR Code" style={{ width: '80px', height: '80px' }} />
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#0f172a', fontSize: '1rem' }}>Verificación Interna</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                Escanea el código QR o ingresa a <strong>caanma.com/clientes/portal</strong> con el folio:<br/>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: primaryColor, letterSpacing: '1px' }}>{transfer.folio || "TR-" + transfer.id.slice(0, 8).toUpperCase()}</span>
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
      <PrintActions
        primaryColor={primaryColor}
        printLabel="Imprimir Traspaso"
        extraButton={
          <a href={`/productos/traspasos/${transfer.id}/etiqueta`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', textDecoration: 'none', padding: '0.75rem 2rem', cursor: 'pointer', background: '#e2e8f0', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', marginRight: '1rem' }}>
            Imprimir Etiqueta Logística
          </a>
        }
      />
    </>
  );
}
