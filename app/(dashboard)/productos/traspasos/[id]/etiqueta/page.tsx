import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getActiveBranch } from "@/app/actions/auth";
import { Package, Truck, MapPin, User, Clock, ArrowRight } from "lucide-react";

export default async function PrintTransferLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activeBranch = await getActiveBranch();
  if (!activeBranch) return notFound();

  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include: {
      branch: {
        include: { tenant: true }
      },
      toBranch: true,
      createdBy: true,
      dispatchedBy: true,
      items: {
        include: {
          product: true,
          variant: true
        }
      }
    }
  });

  if (!transfer) return notFound();

  // Validate tenant access
  const transferTenantId = transfer.branch?.tenantId || transfer.toBranch?.tenantId;
  if (transferTenantId !== activeBranch.tenantId) {
    return notFound();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://caanma.com";
  const qrData = `${appUrl}/productos/traspasos/${transfer.id}`;
  const totalItems = transfer.items.reduce((acc, curr) => acc + curr.quantity, 0);

  const printScript = `
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    }
  `;

  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '1.5rem', color: 'black', fontFamily: 'monospace' }}>
      {/* Auto-print script */}
      <script dangerouslySetInnerHTML={{ __html: printScript }} />

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .label-wrapper, .label-wrapper * {
            visibility: visible;
          }
          .label-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            size: auto;
            margin: 0;
          }
        }
      `}} />

      <div className="label-wrapper" style={{ maxWidth: '380px', margin: '0 auto', border: '2px solid black', padding: '1.25rem', boxSizing: 'border-box' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px dashed black', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: 0, letterSpacing: '1px' }}>ETIQUETA DE TRASPASO</h1>
          <p style={{ margin: '0.25rem 0', fontSize: '1.1rem', fontWeight: 'bold' }}>
            FOLIO: #{transfer.folio || "TR-" + transfer.id.slice(0, 8).toUpperCase()}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(qrData)}`} 
              alt="QR Code" 
              style={{ width: '110px', height: '110px' }} 
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.25rem' }}>
            Escanea para ver detalles en la app
          </div>
        </div>

        {/* Route Info */}
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <MapPin size={16} /> <strong>ORIGEN (SALIDA):</strong>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 'bold', paddingLeft: '1.25rem', marginBottom: '0.75rem' }}>
            {transfer.branch?.name || 'Central'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <MapPin size={16} /> <strong>DESTINO (ENTRADA):</strong>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 'bold', paddingLeft: '1.25rem' }}>
            {transfer.toBranch?.name || 'N/A'}
          </div>
        </div>

        {/* Items Section */}
        <div style={{ marginBottom: '1rem', borderTop: '1px solid black', paddingTop: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Package size={16} /> <strong>CONTENIDO ({totalItems} PZS):</strong>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid black' }}>
                <th style={{ textAlign: 'left', paddingBottom: '0.25rem' }}>Cant</th>
                <th style={{ textAlign: 'left', paddingBottom: '0.25rem', paddingLeft: '0.5rem' }}>Artículo</th>
              </tr>
            </thead>
            <tbody>
              {transfer.items.map((item) => {
                const name = item.variant ? `${item.product.name} (${item.variant.attribute})` : item.product.name;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px dashed #eee' }}>
                    <td style={{ fontWeight: 'bold', padding: '0.25rem 0', verticalAlign: 'top', fontSize: '0.95rem' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '0.25rem 0 0.25rem 0.5rem', verticalAlign: 'top' }}>
                      {name}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Dispatch details */}
        <div style={{ marginBottom: '1rem', borderTop: '1px solid black', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <User size={14} /> <span>Preparado por: {transfer.createdBy?.name || 'N/A'}</span>
          </div>
          {transfer.dispatchedBy && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Truck size={14} /> <span>Surtido por: {transfer.dispatchedBy.name}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Clock size={14} /> <span>Fecha: {new Date(transfer.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', borderTop: '2px dashed black', paddingTop: '0.75rem', marginTop: '1rem', fontSize: '0.75rem' }}>
          <div><strong>CAANMA PRO - CONTROL INTERNO</strong></div>
          <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '0.25rem' }}>
            ID Traspaso: {transfer.id}
          </div>
        </div>

      </div>
    </div>
  );
}
