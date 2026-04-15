import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getActiveBranch } from "@/app/actions/auth";

export default async function PrintTransferPage({ params }: { params: { id: string } }) {
  const branch = await getActiveBranch();
  const transfer = await prisma.transfer.findUnique({
    where: { id: params.id },
    include: {
      branch: true,
      toBranch: true,
      createdBy: true,
      receivedBy: true,
      items: {
        include: { product: true }
      }
    }
  });

  if (!transfer) return notFound();

  // Basic authorization: user must be part of either origin or destination branch
  if (branch.id !== transfer.branchId && branch.id !== transfer.toBranchId) {
    return <div>No autorizado para ver este traspaso.</div>;
  }

  // Auto-print script
  const printScript = `
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    }
  `;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', color: 'black', padding: '2rem' }}>
      <script dangerouslySetInnerHTML={{ __html: printScript }} />
      
      {/* Header Membretado */}
      <div style={{ borderBottom: '2px solid black', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>REMISIÓN DE TRASPASO</h1>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Folio: #{transfer.id.slice(0, 8).toUpperCase()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: '1rem' }}>Fecha de Emisión:</div>
           <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{new Date(transfer.createdAt).toLocaleString('es-MX')}</div>
           <div style={{ marginTop: '0.5rem', display: 'inline-block', padding: '0.2rem 0.5rem', border: '1px solid black', fontWeight: 'bold', textTransform: 'uppercase' }}>
             ESTADO: {transfer.status === 'COMPLETED' ? 'COMPLETADO' : transfer.status === 'IN_TRANSIT' ? 'EN TRÁNSITO' : transfer.status}
           </div>
        </div>
      </div>

      {/* Origin / Dest Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', gap: '2rem' }}>
        <div style={{ flex: 1, padding: '1rem', border: '1px solid #ccc' }}>
           <h3 style={{ margin: '0 0 0.5rem 0', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>SUCURSAL ORIGEN (SALIDA)</h3>
           <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '1.2rem' }}>{transfer.branch?.name || 'Bodega Central'}</p>
           <p style={{ margin: 0, fontSize: '0.9rem' }}>Autorizado por: {transfer.createdBy?.name || 'N/A'}</p>
        </div>
        <div style={{ flex: 1, padding: '1rem', border: '1px solid #ccc' }}>
           <h3 style={{ margin: '0 0 0.5rem 0', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>SUCURSAL DESTINO (ENTRADA)</h3>
           <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '1.2rem' }}>{transfer.toBranch?.name || 'N/A'}</p>
           <p style={{ margin: 0, fontSize: '0.9rem' }}>Recibido por: {transfer.receivedBy?.name || 'Pendiente'}</p>
        </div>
      </div>

      {/* Items Table */}
      <h3 style={{ marginBottom: '1rem' }}>Detalle de Artículos</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '3rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid black', backgroundColor: '#f9f9f9' }}>
            <th style={{ padding: '0.75rem', width: '60px' }}>Cant.</th>
            <th style={{ padding: '0.75rem', width: '120px' }}>SKU/Código</th>
            <th style={{ padding: '0.75rem' }}>Descripción del Artículo</th>
          </tr>
        </thead>
        <tbody>
          {transfer.items.map((item, i) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #ccc' }}>
              <td style={{ padding: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{item.product?.sku || '--'}</td>
              <td style={{ padding: '0.75rem' }}>{item.product?.name || 'Desconocido'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '4rem', paddingTop: '2rem' }}>
        <div style={{ textAlign: 'center', width: '250px' }}>
          <div style={{ borderBottom: '1px solid black', marginBottom: '0.5rem', height: '40px' }}></div>
          <div style={{ fontWeight: 'bold' }}>Firma de Entrega</div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>({transfer.branch?.name || 'Bodega Central'})</div>
        </div>
        <div style={{ textAlign: 'center', width: '250px' }}>
          <div style={{ borderBottom: '1px solid black', marginBottom: '0.5rem', height: '40px' }}></div>
          <div style={{ fontWeight: 'bold' }}>Firma de Recepción</div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>({transfer.toBranch?.name || 'Destino'})</div>
        </div>
      </div>
      
      <div className="no-print" style={{ marginTop: '3rem', textAlign: 'center' }}>
        <button onClick={() => window.close()} style={{ padding: '0.75rem 1.5rem', cursor: 'pointer', background: '#ccc', border: 'none', borderRadius: '4px' }}>Cerrar Ventana</button>
      </div>
    </div>
  );
}
