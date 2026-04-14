'use client';

import Link from 'next/link';
import { ArrowLeft, Package, User, CheckCircle, Truck, MapPin } from 'lucide-react';
import { receiveTransfer } from '@/app/actions/transfer';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function TransferDetailClient({ transfer, branchId }: { transfer: any, branchId: string }) {
  const isIncoming = transfer.toBranchId === branchId;
  const isPending = transfer.status === 'IN_TRANSIT';
  const [isProcessing, startTransition] = useTransition();
  const router = useRouter();

  const handleReceive = () => {
    if (!confirm('¿Estás seguro de que deseas recibir este traspaso? El inventario será sumado a tu sucursal.')) return;
    
    startTransition(async () => {
      try {
        await receiveTransfer(transfer.id);
        alert('Traspaso recibido correctamente.');
        router.refresh();
      } catch(err: any) {
        alert(err.message || 'Ocurrió un error');
      }
    });
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
      <Link href="/productos/traspasos" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pulpos-primary)', textDecoration: 'none', marginBottom: '1.5rem', fontWeight: 500 }}>
        <ArrowLeft size={16} /> Volver a Traspasos
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>Traspaso #{transfer.id.substring(0,8).toUpperCase()}</h1>
          <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.95rem' }}>Fecha de creación: {new Date(transfer.createdAt).toLocaleString()}</div>
        </div>
        <div style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold', backgroundColor: transfer.status === 'COMPLETED' ? '#dcfce7' : '#fef9c3', color: transfer.status === 'COMPLETED' ? '#166534' : '#854d0e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {transfer.status === 'COMPLETED' ? <><CheckCircle size={18}/> Completado</> : <><Truck size={18}/> En Tránsito</>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--pulpos-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="#64748b" /> Origen
          </h3>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{transfer.branch?.name || 'Central'}</div>
          <div style={{ color: 'var(--pulpos-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={16}/> Creado por: <span style={{ fontWeight: 500 }}>{transfer.createdBy?.name || 'Sistema'}</span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--pulpos-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="#64748b" /> Destino
          </h3>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{transfer.toBranch?.name || 'Central'}</div>
          <div style={{ color: 'var(--pulpos-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={16}/> Recibido por: <span style={{ fontWeight: 500 }}>{transfer.receivedBy?.name || (isPending ? 'Pendiente' : 'Sistema')}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={20} color="var(--pulpos-primary)" />
            Artículos Traspasados
          </h2>
          {isIncoming && isPending && (
             <button 
                onClick={handleReceive} 
                disabled={isProcessing}
                className="btn-primary" 
                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isProcessing ? 0.7 : 1 }}
             >
               <CheckCircle size={16} /> {isProcessing ? 'Recibiendo...' : 'Recibir Traspaso Físico'}
             </button>
          )}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--pulpos-border)' }}>
              <th style={{ padding: '1rem', color: '#64748b', fontWeight: 500 }}>Producto</th>
              <th style={{ padding: '1rem', color: '#64748b', fontWeight: 500, textAlign: 'center' }}>Cant.</th>
              <th style={{ padding: '1rem', color: '#64748b', fontWeight: 500, textAlign: 'right' }}>Costo Promedio Unitario</th>
              <th style={{ padding: '1rem', color: '#64748b', fontWeight: 500, textAlign: 'right' }}>Costo Total Transferido</th>
            </tr>
          </thead>
          <tbody>
            {transfer.items.map((item: any) => {
              const productName = item.variant ? `${item.product.name} (${item.variant.attribute})` : item.product.name;
              const sku = item.variant?.sku || item.product.sku;
              // If averageCost wasn't saved perfectly we show 0. Or if cost is what we care about, we show cost.
              const costToShow = item.averageCost || item.cost || item.product.cost || 0;
              const totalCost = costToShow * item.quantity;
              
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{productName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>SKU: {sku || 'N/A'}</div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>{item.quantity}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', color: '#0f172a' }}>${costToShow.toFixed(2)}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>${totalCost.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot style={{ backgroundColor: '#f8fafc' }}>
             <tr>
               <td colSpan={3} style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#64748b' }}>Costo Total del Traspaso:</td>
               <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', color: '#0f172a' }}>
                 ${transfer.items.reduce((acc: number, item: any) => acc + ((item.averageCost || item.cost || item.product.cost || 0) * item.quantity), 0).toFixed(2)}
               </td>
             </tr>
          </tfoot>
        </table>
      </div>

    </div>
  );
}
