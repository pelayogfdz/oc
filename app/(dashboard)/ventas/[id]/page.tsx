import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getActiveBranch } from "@/app/actions/auth";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";

export default async function VentaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branch = await getActiveBranch();
  
  const sale = await prisma.sale.findUnique({
    where: { id: id },
    include: {
      user: true,
      customer: true,
      branch: true,
      items: {
        include: { product: true, variant: true }
      }
    }
  });

  if (!sale) return notFound();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', color: 'black' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
         <Link href="/ventas" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pulpos-text-muted)', textDecoration: 'none', fontWeight: 'bold' }}>
            <ArrowLeft size={20} /> Volver a Ventas
         </Link>
         <Link target="_blank" href={`/ventas/${sale.id}/imprimir`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px' }}>
            <Printer size={20} /> Imprimir Comprobante
         </Link>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        {/* Header Membretado */}
        <div style={{ paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f1f5f9' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#1e293b' }}>Resumen de Venta</h1>
            <div style={{ fontSize: '1.2rem', color: '#64748b' }}>Folio: #{sale.id.slice(0, 8).toUpperCase()}</div>
            <div style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', backgroundColor: sale.status === 'COMPLETED' ? '#dcfce7' : '#fee2e2', color: sale.status === 'COMPLETED' ? '#166534' : '#991b1b' }}>
              {sale.status === 'COMPLETED' ? 'Venta Concluida' : 'Cancelada / Devuelta'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
             <div style={{ fontSize: '1rem', color: '#64748b' }}>Fecha de Emisión</div>
             <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{new Date(sale.createdAt).toLocaleString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
             <div style={{ fontSize: '1rem', color: '#64748b', marginTop: '0.5rem' }}>Método de Pago</div>
             <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#0ea5e9' }}>
               {sale.paymentMethod === 'CASH' ? 'Efectivo' : sale.paymentMethod === 'CARD' ? 'Tarjeta' : sale.paymentMethod === 'TRANSFER' ? 'Transferencia' : sale.paymentMethod}
             </div>
          </div>
        </div>

        {/* Customer Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', gap: '2rem' }}>
          <div style={{ flex: 1 }}>
             <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase' }}>Cliente:</h3>
             <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '1.2rem' }}>{sale.customer?.name || 'Venta al Público en General'}</p>
             {sale.customer?.email && <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>{sale.customer.email}</p>}
             {sale.customer?.phone && <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>Tel: {sale.customer.phone}</p>}
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
             <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase' }}>Emitido por:</h3>
             <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '1.2rem' }}>{sale.branch?.name || 'Sucursal Matriz'}</p>
             <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>Atendido por: {sale.user?.name}</p>
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
            {sale.items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{item.product?.name || 'Desconocido'}</div>
                  {item.variant && <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Var: {item.variant.attribute}</div>}
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>SKU: {item.product?.sku || '--'}</div>
                </td>
                <td style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>{item.quantity}</td>
                <td style={{ padding: '1rem', textAlign: 'right', color: '#0f172a' }}>${item.price.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>${(item.price * item.quantity).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, paddingRight: '2rem' }}>
             {sale.notes && (
               <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                 <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', fontWeight: 'bold' }}>Notas del Ticket:</p>
                 <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#0f172a' }}>{sale.notes}</p>
               </div>
             )}
          </div>
          <div style={{ width: '300px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '1.1rem' }}>Subtotal:</span>
                <span style={{ fontSize: '1.1rem', color: '#0f172a' }}>${sale.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', fontWeight: 'bold', fontSize: '1.5rem', color: '#0ea5e9' }}>
                <span>Pago Total:</span>
                <span>${sale.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
