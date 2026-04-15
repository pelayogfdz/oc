import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getActiveBranch } from "@/app/actions/auth";

export default async function PrintCotizacionPage({ params }: { params: { id: string } }) {
  const branch = await getActiveBranch();
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      customer: true,
      branch: true,
      items: {
        include: { product: true }
      }
    }
  });

  if (!quote) return notFound();

  if (quote.branchId !== branch.id && quote.branchId !== null) {
    return <div>No autorizado para ver esta cotización.</div>;
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
      <div style={{ paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#1e293b' }}>COTIZACIÓN</h1>
          <div style={{ fontSize: '1.2rem', color: '#64748b' }}>Folio: #{quote.id.slice(0, 8).toUpperCase()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: '1rem', color: '#64748b' }}>Fecha de Emisión</div>
           <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{new Date(quote.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      <div style={{ height: '4px', backgroundColor: '#8b5cf6', marginBottom: '2rem' }}></div>

      {/* Customer Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', gap: '2rem' }}>
        <div style={{ flex: 1 }}>
           <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase' }}>Preparado para:</h3>
           <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '1.3rem' }}>{quote.customer?.name || 'Venta al Público en General'}</p>
           {quote.customer?.email && <p style={{ margin: 0, fontSize: '0.9rem' }}>{quote.customer.email}</p>}
           {quote.customer?.phone && <p style={{ margin: 0, fontSize: '0.9rem' }}>Tel: {quote.customer.phone}</p>}
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
           <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase' }}>Emitido por:</h3>
           <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '1.2rem' }}>{quote.branch?.name || 'Sucursal Matriz'}</p>
           <p style={{ margin: 0, fontSize: '0.9rem' }}>Atendido por: {quote.user?.name}</p>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '2rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
            <th style={{ padding: '1rem', color: '#475569' }}>Descripción del Artículo</th>
            <th style={{ padding: '1rem', color: '#475569', textAlign: 'center' }}>Cant.</th>
            <th style={{ padding: '1rem', color: '#475569', textAlign: 'right' }}>Precio Unit.</th>
            <th style={{ padding: '1rem', color: '#475569', textAlign: 'right' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((item, i) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '1rem' }}>
                <div style={{ fontWeight: 'bold' }}>{item.product?.name || 'Desconocido'}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>SKU: {item.product?.sku || '--'}</div>
              </td>
              <td style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ padding: '1rem', textAlign: 'right' }}>${item.price.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
              <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>${(item.price * item.quantity).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4rem' }}>
        <div style={{ width: '300px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b' }}>Subtotal:</span>
              <span>${quote.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', fontWeight: 'bold', fontSize: '1.5rem', color: '#8b5cf6' }}>
              <span>Total Estimado:</span>
              <span>${quote.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
           </div>
        </div>
      </div>

      {/* Footer / Terms */}
      <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#0f172a' }}>Términos y Condiciones</h4>
        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
           <li style={{ marginBottom: '0.25rem' }}>Esta cotización tiene una vigencia de <strong>15 días naturales</strong> a partir de su emisión.</li>
           <li style={{ marginBottom: '0.25rem' }}>Los precios están sujetos a cambios sin previo aviso si el tipo de cambio oficial fluctúa o hay desabasto de importación.</li>
           <li>Para procesar formalmente y apartar inventario, se requiere un anticipo del 50% o la conversión definitiva a Venta generada por nuestros ejecutivos.</li>
        </ul>
      </div>
      
      <div className="no-print" style={{ marginTop: '3rem', textAlign: 'center' }}>
        <button onClick={() => window.close()} style={{ padding: '0.75rem 1.5rem', cursor: 'pointer', background: '#ccc', border: 'none', borderRadius: '4px' }}>Cerrar Ventana</button>
      </div>
    </div>
  );
}
