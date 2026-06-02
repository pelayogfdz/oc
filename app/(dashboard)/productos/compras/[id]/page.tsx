import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getActiveBranch } from "@/app/actions/auth";
import Link from "next/link";
import { Printer, ArrowLeft, ShoppingCart } from "lucide-react";
import PurchaseActionsClient from "./PurchaseActionsClient";

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branch = await getActiveBranch();
  
  if (!id) return notFound();

  const purchase = await prisma.purchase.findUnique({
    where: { id: id },
    include: {
      user: true,
      supplier: true,
      branch: true,
      items: {
        include: { product: true }
      }
    }
  });

  if (!purchase) return notFound();

  // Validate authorization
  if (branch.id !== 'GLOBAL' && branch.id !== purchase.branchId) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #f87171', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>NO AUTORIZADO</h2>
        <p>No tienes permisos para visualizar esta compra en esta sucursal.</p>
      </div>
    );
  }

  const subtotal = purchase.total / 1.16;
  const iva = purchase.total - subtotal;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif', color: 'black' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
         <Link href="/productos/compras" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pulpos-text-muted)', textDecoration: 'none', fontWeight: 'bold' }}>
            <ArrowLeft size={20} /> Volver a Compras
         </Link>
         <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link target="_blank" href={`/productos/compras/${purchase.id}/imprimir`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px' }}>
               <Printer size={20} /> Imprimir Orden
            </Link>
            <PurchaseActionsClient purchaseId={purchase.id} status={purchase.status} />
         </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        {/* Header */}
        <div style={{ paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f1f5f9' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#1e293b' }}>Resumen de Compra</h1>
            <div style={{ fontSize: '1.2rem', color: '#64748b' }}>Folio: #{purchase.folio || purchase.id.slice(0, 8).toUpperCase()}</div>
            <div style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', backgroundColor: purchase.status === 'COMPLETED' ? '#dcfce7' : purchase.status === 'CANCELLED' ? '#fee2e2' : '#fef3c7', color: purchase.status === 'COMPLETED' ? '#166534' : purchase.status === 'CANCELLED' ? '#991b1b' : '#b45309' }}>
              {purchase.status === 'COMPLETED' ? 'Recibido' : purchase.status === 'CANCELLED' ? 'Cancelado' : purchase.status}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
             <div style={{ fontSize: '1rem', color: '#64748b' }}>Fecha de Registro</div>
             <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{new Date(purchase.createdAt).toLocaleString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
             <div style={{ fontSize: '1rem', color: '#64748b', marginTop: '0.5rem' }}>Método de Pago</div>
             <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#0ea5e9' }}>
               {purchase.paymentMethod === 'CASH' ? 'Efectivo' : purchase.paymentMethod === 'CARD' ? 'Tarjeta' : purchase.paymentMethod === 'TRANSFER' ? 'Transferencia' : purchase.paymentMethod === 'CREDIT' ? 'Crédito CxP' : purchase.paymentMethod}
             </div>
          </div>
        </div>

        {/* Supplier & Operación Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', gap: '2rem' }}>
          <div style={{ flex: 1 }}>
             <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase' }}>Proveedor:</h3>
             <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '1.2rem' }}>{purchase.supplier?.name || 'Proveedor General'}</p>
             {purchase.supplier?.taxId && <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>RFC: {purchase.supplier.taxId}</p>}
             {purchase.supplier?.phone && <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>Tel: {purchase.supplier.phone}</p>}
             {purchase.supplier?.email && <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>Email: {purchase.supplier.email}</p>}
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
             <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase' }}>Registrado en:</h3>
             <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '1.2rem' }}>{purchase.branch?.name || 'Bodega Central'}</p>
             <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>Por: {purchase.user?.name}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '2rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
              <th style={{ padding: '1rem', color: '#475569' }}>Artículo</th>
              <th style={{ padding: '1rem', color: '#475569', textAlign: 'center' }}>Cant.</th>
              <th style={{ padding: '1rem', color: '#475569', textAlign: 'right' }}>Costo Unit.</th>
              <th style={{ padding: '1rem', color: '#475569', textAlign: 'right' }}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td data-label="Artículo" style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{item.product?.name || 'Desconocido'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>SKU: {item.product?.sku || '--'}</div>
                </td>
                <td data-label="Cant." style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>{item.quantity}</td>
                <td data-label="Costo Unit." style={{ padding: '1rem', textAlign: 'right', color: '#0f172a' }}>${item.cost.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                <td data-label="Importe" style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>${(item.cost * item.quantity).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, paddingRight: '2rem' }}>
             {purchase.paymentMethod === 'CREDIT' && (
               <div style={{ padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                 <p style={{ margin: 0, fontSize: '0.875rem', color: '#b91c1c', fontWeight: 'bold' }}>Compra a Crédito (CxP):</p>
                 <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', color: '#7f1d1d', fontWeight: 'bold' }}>Deuda Pendiente: ${purchase.balanceDue.toLocaleString('es-MX', {minimumFractionDigits:2})}</p>
                 {purchase.dueDate && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#7f1d1d' }}>Vence el: {new Date(purchase.dueDate).toLocaleDateString('es-MX')}</p>}
               </div>
             )}
          </div>
          <div style={{ width: '300px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Subtotal (sin IVA):</span>
                <span style={{ color: '#0f172a' }}>${subtotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>IVA (16%):</span>
                <span style={{ color: '#0f172a' }}>${iva.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
             </div>
             {purchase.freightCost ? (
               <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>Flete / Envío:</span>
                  <span style={{ color: '#0f172a' }}>+${purchase.freightCost.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
               </div>
             ) : null}
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', fontWeight: 'bold', fontSize: '1.5rem', color: 'var(--pulpos-primary)' }}>
                <span>Total Compra:</span>
                <span>${(purchase.total + (purchase.freightCost || 0)).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
