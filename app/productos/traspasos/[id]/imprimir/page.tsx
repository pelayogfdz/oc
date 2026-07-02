export const dynamic = 'force-dynamic';

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
                {transfer.branch?.tenant?.name || 'EMPRESA PRINCIPAL'}
              </h1>
            )}
            <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
              <strong>DOCUMENTO DE CONTROL INTERNO</strong><br/>
              Sucursal Emisora: {transfer.branch?.name || 'Bodega Central'}<br/>
              {transfer.branch?.location && <>{transfer.branch.location.replace(/\\n/g, ', ')}<br/></>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <div className="title-box" style={{ width: '100%', boxSizing: 'border-box' }}>
              <h2 className="title-text">Remisión Traspaso</h2>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#334155', marginTop: '0.25rem' }}>
              Folio: #{transfer.folio || "TR-" + transfer.id.slice(0, 8).toUpperCase()}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Fecha Emisión: {new Date(transfer.createdAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid', borderColor: transfer.status === 'COMPLETED' ? '#16a34a' : transfer.status === 'IN_TRANSIT' ? '#eab308' : '#cbd5e1', color: transfer.status === 'COMPLETED' ? '#16a34a' : transfer.status === 'IN_TRANSIT' ? '#ca8a04' : '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
              ESTADO: {transfer.status === 'COMPLETED' ? 'COMPLETADO' : transfer.status === 'IN_TRANSIT' ? 'EN TRÁNSITO' : transfer.status}
            </div>
          </div>
        </div>

        {/* Origin / Dest Info Grid */}
        <div className="info-grid">
          <div className="info-card">
            <div className="data-label">SUCURSAL ORIGEN (SALIDA)</div>
            <div className="data-value">
              {transfer.branch?.name || 'Bodega Central'}
            </div>
            {transfer.branch?.location && <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem' }}>{transfer.branch.location.replace(/\\n/g, ', ')}</div>}
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.35rem' }}>
              <strong>Enviado por:</strong> {transfer.createdBy?.name || 'N/A'}
            </div>
          </div>
          
          <div className="info-card">
            <div className="data-label">SUCURSAL DESTINO (ENTRADA)</div>
            <div className="data-value">
              {transfer.toBranch?.name || 'N/A'}
            </div>
            {transfer.toBranch?.location && <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem' }}>{transfer.toBranch.location.replace(/\\n/g, ', ')}</div>}
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.35rem' }}>
              <strong>Recibido por:</strong> {transfer.receivedBy?.name || 'Pendiente de Recepción'}
            </div>
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
        <div style={{ marginTop: '4rem', paddingBottom: '1rem' }}>
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
