'use client';

import { useState } from 'react';
import { ShoppingCart, AlertCircle, Calendar, CreditCard, ArrowRight, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ComprasTabsClient({ purchases, purchaseRequests }: { purchases: any[], purchaseRequests: any[] }) {
  const [activeTab, setActiveTab] = useState<'COMPRAS' | 'SOLICITUDES'>('COMPRAS');

  return (
    <>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--pulpos-border)', marginBottom: '2rem' }}>
        <button 
           onClick={() => setActiveTab('COMPRAS')}
           style={{ 
             padding: '1rem 2rem', 
             border: 'none', 
             background: 'none',
             fontWeight: 'bold',
             fontSize: '1rem',
             color: activeTab === 'COMPRAS' ? 'var(--pulpos-primary)' : '#64748b',
             borderBottom: activeTab === 'COMPRAS' ? '3px solid var(--pulpos-primary)' : '3px solid transparent',
             cursor: 'pointer',
             display: 'flex', alignItems: 'center', gap: '0.5rem'
           }}
        >
          <ShoppingCart size={18} /> Compras Realizadas ({purchases.length})
        </button>
        <button 
           onClick={() => setActiveTab('SOLICITUDES')}
           style={{ 
             padding: '1rem 2rem', 
             border: 'none', 
             background: 'none',
             fontWeight: 'bold',
             fontSize: '1rem',
             color: activeTab === 'SOLICITUDES' ? '#ea580c' : '#64748b', // Orange for requests
             borderBottom: activeTab === 'SOLICITUDES' ? '3px solid #ea580c' : '3px solid transparent',
             cursor: 'pointer',
             display: 'flex', alignItems: 'center', gap: '0.5rem'
           }}
        >
          <AlertCircle size={18} /> Faltantes por Traspaso ({purchaseRequests.length})
        </button>
      </div>

      {activeTab === 'COMPRAS' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--pulpos-border)' }}>
              <tr>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Fecha</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Proveedor</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Artículos</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Total</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Pago</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                    <ShoppingCart size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                    <p>No has registrado ninguna compra a proveedores aún.</p>
                  </td>
                </tr>
              ) : (
                purchases.map(purchase => (
                  <tr key={purchase.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>#{purchase.id.slice(0, 8)}</td>
                    <td style={{ padding: '1rem' }}>
                      {format(new Date(purchase.createdAt), "d 'de' MMMM, yyyy", { locale: es })}<br/>
                      <span style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)' }}>
                        {format(new Date(purchase.createdAt), "HH:mm")}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                      {purchase.supplier?.name || "Sin Proveedor"}
                    </td>
                    <td style={{ padding: '1rem' }}>{purchase._count.items}</td>
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>
                      ${purchase.total.toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold',
                        backgroundColor: purchase.paymentMethod === 'CREDIT' ? '#fef3c7' : '#e0e7ff',
                        color: purchase.paymentMethod === 'CREDIT' ? '#d97706' : '#4338ca'
                      }}>
                        {purchase.paymentMethod}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{purchase.user.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'SOLICITUDES' && (
         <div className="card" style={{ overflow: 'hidden' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse' }}>
             <thead style={{ backgroundColor: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
               <tr>
                 <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#9a3412' }}>Producto Faltante</th>
                 <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#9a3412' }}>Cant. Requerida</th>
                 <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#9a3412' }}>Origen (Traspaso)</th>
                 <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#9a3412' }}>Fecha Solicitud</th>
                 <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#9a3412' }}>Estado</th>
               </tr>
             </thead>
             <tbody>
               {purchaseRequests.length === 0 ? (
                 <tr>
                   <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                     <CheckCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.2, color: '#16a34a' }} />
                     <p>Todo está surtido. No hay solicitudes de compra pendientes por faltantes en traspasos.</p>
                   </td>
                 </tr>
               ) : (
                 purchaseRequests.map(req => (
                   <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                     <td style={{ padding: '1rem', fontWeight: 'bold', color: '#0f172a' }}>
                        {req.product.name}
                        <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)', fontWeight: 'normal' }}>SKU: {req.product.sku}</div>
                     </td>
                     <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#ea580c' }}>
                        {req.quantity}
                     </td>
                     <td style={{ padding: '1rem' }}>
                        Solicitado por: <span style={{ fontWeight: 500 }}>{req.transfer?.toBranch?.name || 'N/A'}</span>
                        <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)' }}>Traspaso #{req.transferId?.slice(0,8).toUpperCase() || 'N/A'}</div>
                     </td>
                     <td style={{ padding: '1rem', color: '#475569' }}>
                        {format(new Date(req.createdAt), "d MMM, yyyy", { locale: es })}
                     </td>
                     <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold',
                          backgroundColor: req.status === 'ORDERED' ? '#dcfce7' : '#fee2e2',
                          color: req.status === 'ORDERED' ? '#166534' : '#991b1b'
                        }}>
                          {req.status === 'ORDERED' ? 'Ordenado' : 'Faltante'}
                        </span>
                     </td>
                   </tr>
                 ))
               )}
             </tbody>
           </table>
         </div>
      )}
    </>
  );
}
