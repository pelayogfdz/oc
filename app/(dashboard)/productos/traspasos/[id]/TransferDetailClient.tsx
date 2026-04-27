'use client';

import Link from 'next/link';
import { ArrowLeft, Package, User, CheckCircle, Truck, MapPin, ClipboardList, PackageOpen, Inbox } from 'lucide-react';
import { receiveTransfer, approveTransfer, dispatchTransfer } from '@/app/actions/transfer';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TransferDetailClient({ transfer, branchId }: { transfer: any, branchId: string }) {
  const isOrigin = transfer.branchId === branchId; // La sucursal que surte
  const isDestination = transfer.toBranchId === branchId; // La sucursal que recibe/pidió
  
  const [isProcessing, startTransition] = useTransition();
  const router = useRouter();

  // State for dispatching items (when origin is surtiendo)
  const [dispatchQuantities, setDispatchQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    transfer.items.forEach((item: any) => {
      initial[item.id] = item.quantity;
    });
    return initial;
  });

  const handleApprove = () => {
    if (!confirm('¿Aprobar y comenzar preparación de este traspaso?')) return;
    startTransition(async () => {
      try {
        await approveTransfer(transfer.id);
        alert('Traspaso en preparación.');
        router.refresh();
      } catch(err: any) {
        alert(err.message || 'Ocurrió un error');
      }
    });
  };

  const handleDispatch = () => {
    if (!confirm('¿Confirmar envío? Los artículos faltantes generarán una Solicitud de Compra.')) return;
    startTransition(async () => {
      try {
        await dispatchTransfer(transfer.id, dispatchQuantities);
        alert('Traspaso surtido y en camino.');
        router.refresh();
      } catch(err: any) {
        alert(err.message || 'Ocurrió un error');
      }
    });
  };

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

  const phases = [
    { id: 'REQUESTED', label: 'Solicitud', icon: ClipboardList, user: transfer.requestedBy?.name, date: transfer.requestedAt || transfer.createdAt },
    { id: 'CREATED', label: 'Creación', icon: PackageOpen, user: transfer.createdBy?.name, date: null }, // no separate date currently, fallback to UI
    { id: 'DISPATCHED', label: 'Surtido', icon: Truck, user: transfer.dispatchedBy?.name, date: transfer.dispatchedAt },
    { id: 'RECEIVED', label: 'Recepción', icon: Inbox, user: transfer.receivedBy?.name, date: transfer.receivedAt },
  ];

  const getPhaseIndex = (status: string) => {
    switch(status) {
      case 'REQUESTED': return 0;
      case 'CREATED': return 1;
      case 'DISPATCHED': return 2;
      case 'RECEIVED': return 3;
      default: return 0;
    }
  };

  const currentPhaseIdx = getPhaseIndex(transfer.status);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      <Link href="/productos/traspasos" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pulpos-primary)', textDecoration: 'none', marginBottom: '1.5rem', fontWeight: 500 }}>
        <ArrowLeft size={16} /> Volver a Traspasos
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>Traspaso #{transfer.id.substring(0,8).toUpperCase()}</h1>
          <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.95rem' }}>Fecha de solicitud: {new Date(transfer.createdAt).toLocaleString()}</div>
        </div>
        <div style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold', backgroundColor: '#f1f5f9', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Estatus: {transfer.status}
        </div>
      </div>

      {/* Monitor de Estatus (Timeline Tracker) */}
      <div className="card" style={{ marginBottom: '2.5rem', overflow: 'hidden' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1e293b' }}>Monitor de Progreso</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
           {/* Connecting Line */}
           <div style={{ position: 'absolute', top: '24px', left: '10%', right: '10%', height: '4px', backgroundColor: '#e2e8f0', zIndex: 0 }}>
             <div style={{ 
               height: '100%', 
               backgroundColor: 'var(--pulpos-primary)', 
               width: `${(currentPhaseIdx / 3) * 100}%`,
               transition: 'width 0.5s ease'
             }} />
           </div>

           {phases.map((phase, idx) => {
             const isCompleted = idx <= currentPhaseIdx;
             const Icon = phase.icon;
             return (
               <div key={phase.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, width: '25%' }}>
                 <div style={{ 
                    width: '48px', height: '48px', borderRadius: '50%', 
                    backgroundColor: isCompleted ? 'var(--pulpos-primary)' : '#f1f5f9',
                    color: isCompleted ? 'white' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isCompleted ? '0 0 0 4px rgba(79, 70, 229, 0.2)' : '0 0 0 4px white',
                    marginBottom: '0.5rem', transition: 'all 0.3s ease'
                 }}>
                   <Icon size={24} />
                 </div>
                 <div style={{ fontWeight: 'bold', color: isCompleted ? '#0f172a' : '#94a3b8', marginBottom: '0.25rem' }}>{phase.label}</div>
                 {phase.user && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <User size={12} /> {phase.user}
                    </div>
                 )}
                 {phase.date && (
                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                      {new Date(phase.date).toLocaleDateString()}
                    </div>
                 )}
               </div>
             )
           })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--pulpos-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="#64748b" /> Origen (Surte)
          </h3>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{transfer.branch?.name || 'Central'}</div>
          {isOrigin && <span style={{ fontSize: '0.85rem', backgroundColor: '#e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Esta es tu sucursal</span>}
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--pulpos-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="#64748b" /> Destino (Solicita)
          </h3>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{transfer.toBranch?.name || 'Central'}</div>
          {isDestination && <span style={{ fontSize: '0.85rem', backgroundColor: '#e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Esta es tu sucursal</span>}
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={20} color="var(--pulpos-primary)" />
            Artículos {transfer.status === 'REQUESTED' || transfer.status === 'CREATED' ? 'Solicitados' : 'Traspasados'}
          </h2>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {isOrigin && transfer.status === 'REQUESTED' && (
              <button onClick={handleApprove} disabled={isProcessing} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isProcessing ? 0.7 : 1 }}>
                <CheckCircle size={16} /> Aprobar Traspaso
              </button>
            )}
            {isOrigin && transfer.status === 'CREATED' && (
              <button onClick={handleDispatch} disabled={isProcessing} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isProcessing ? 0.7 : 1 }}>
                <Truck size={16} /> Surtir y Enviar
              </button>
            )}
            {isDestination && transfer.status === 'DISPATCHED' && (
              <button onClick={handleReceive} disabled={isProcessing} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isProcessing ? 0.7 : 1 }}>
                <Inbox size={16} /> Recibir Físicamente
              </button>
            )}
          </div>
        </div>
        
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--pulpos-border)' }}>
              <th style={{ padding: '1rem', color: '#64748b', fontWeight: 500 }}>Producto</th>
              <th style={{ padding: '1rem', color: '#64748b', fontWeight: 500, textAlign: 'center' }}>Solicitados</th>
              {isOrigin && transfer.status === 'CREATED' && (
                 <th style={{ padding: '1rem', color: '#64748b', fontWeight: 500, textAlign: 'center' }}>A Surtir</th>
              )}
              {transfer.status === 'DISPATCHED' || transfer.status === 'RECEIVED' ? (
                 <>
                   <th style={{ padding: '1rem', color: '#64748b', fontWeight: 500, textAlign: 'right' }}>Costo Promedio</th>
                   <th style={{ padding: '1rem', color: '#64748b', fontWeight: 500, textAlign: 'right' }}>Total</th>
                 </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {transfer.items.map((item: any) => {
              const productName = item.variant ? `${item.product.name} (${item.variant.attribute})` : item.product.name;
              const sku = item.variant?.sku || item.product.sku;
              const costToShow = item.averageCost || item.cost || item.product.cost || 0;
              const totalCost = costToShow * (transfer.status === 'CREATED' ? dispatchQuantities[item.id] || 0 : item.quantity);
              
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td data-label="Producto" style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{productName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>SKU: {sku || 'N/A'}</div>
                  </td>
                  <td data-label="Solicitados" style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>
                     {/* Solicitados (or dispatched if status > CREATED) */}
                     {transfer.status === 'REQUESTED' || transfer.status === 'CREATED' ? item.quantity : `${item.quantity} (Surtidos)`}
                  </td>
                  
                  {isOrigin && transfer.status === 'CREATED' && (
                     <td data-label="A Surtir" style={{ padding: '1rem', textAlign: 'center' }}>
                       <input 
                         type="number" 
                         min="0"
                         max={item.quantity}
                         value={dispatchQuantities[item.id] ?? item.quantity}
                         onChange={(e) => setDispatchQuantities({...dispatchQuantities, [item.id]: parseInt(e.target.value) || 0})}
                         style={{ width: '80px', padding: '0.5rem', textAlign: 'center', border: '1px solid var(--pulpos-border)', borderRadius: '4px', fontWeight: 'bold' }}
                       />
                       {(item.quantity - (dispatchQuantities[item.id] ?? item.quantity)) > 0 && (
                         <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                            Faltan {item.quantity - (dispatchQuantities[item.id] ?? item.quantity)} -&gt; Compras
                         </div>
                       )}
                     </td>
                  )}

                  {transfer.status === 'DISPATCHED' || transfer.status === 'RECEIVED' ? (
                     <>
                       <td data-label="Costo Promedio" style={{ padding: '1rem', textAlign: 'right', color: '#0f172a' }}>${costToShow.toFixed(2)}</td>
                       <td data-label="Total" style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>${totalCost.toFixed(2)}</td>
                     </>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
          {transfer.status === 'DISPATCHED' || transfer.status === 'RECEIVED' ? (
             <tfoot style={{ backgroundColor: '#f8fafc' }}>
               <tr>
                 <td colSpan={3} style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#64748b' }}>Costo Total Transferido:</td>
                 <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', color: '#0f172a' }}>
                   ${transfer.items.reduce((acc: number, item: any) => acc + ((item.averageCost || item.cost || item.product.cost || 0) * item.quantity), 0).toFixed(2)}
                 </td>
               </tr>
             </tfoot>
          ) : null}
        </table>
      </div>

    </div>
  );
}
