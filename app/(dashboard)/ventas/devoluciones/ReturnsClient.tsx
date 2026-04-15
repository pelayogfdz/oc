'use client';

import { useState } from 'react';
import { Search, RotateCcw, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { createSaleReturn } from '@/app/actions/returns';

export default function ReturnsClient({ initialSales }: { initialSales: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  
  const [refundMethod, setRefundMethod] = useState('CASH');
  const [satFolio, setSatFolio] = useState('');
  const [reason, setReason] = useState('');

  const [isPending, setIsPending] = useState(false);

  const filteredSales = initialSales.filter(s => 
    s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.customer && s.customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenSale = (sale: any) => {
    setSelectedSale(sale);
    setReturnQuantities({});
    setRefundMethod('CASH');
    setSatFolio('');
    setReason('');
  };

  const getReturnedCount = (item: any) => {
    if (!item.returns) return 0;
    return item.returns.reduce((sum: number, r: any) => sum + r.quantity, 0);
  };

  const handleReturnQuantityChange = (itemId: string, maxAllowed: number, val: string) => {
    let q = parseInt(val, 10);
    if (isNaN(q)) q = 0;
    if (q < 0) q = 0;
    if (q > maxAllowed) q = maxAllowed;

    setReturnQuantities(prev => ({
      ...prev,
      [itemId]: q
    }));
  };

  const calculateTotalRefund = () => {
    if (!selectedSale) return 0;
    let total = 0;
    selectedSale.items.forEach((item: any) => {
      const q = returnQuantities[item.id] || 0;
      total += q * item.price;
    });
    return total;
  };

  const processReturn = async () => {
    if (!selectedSale) return;
    
    const itemsToReturn = selectedSale.items.filter((i: any) => returnQuantities[i.id] > 0).map((i: any) => ({
      saleItemId: i.id,
      productId: i.productId,
      quantity: returnQuantities[i.id],
      refundPrice: i.price
    }));

    if (itemsToReturn.length === 0) {
      alert("Debes seleccionar al menos un artículo para devolver.");
      return;
    }

    if (refundMethod === 'STORE_CREDIT' && !selectedSale.customer) {
      alert("No se puede abonar a Saldo a Favor porque la venta no tiene un cliente asignado.");
      return;
    }

    if (!confirm('¿Confirma que desea procesar esta devolución? Esta acción ajustará el inventario.')) return;

    setIsPending(true);
    try {
      await createSaleReturn(
        selectedSale.id,
        itemsToReturn,
        refundMethod,
        reason || 'Devolución de mercancía',
        satFolio
      );
      
      alert('Devolución procesada correctamente.');
      setSelectedSale(null);
      // Wait for revalidation or just let UI naturally refresh (Next.js server action revalidates path automatically)

    } catch (err: any) {
      alert("Error al procesar: " + err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--pulpos-text-muted)' }} size={20} />
            <input 
              type="text" 
              placeholder="Buscar por ID de Venta o Cliente..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '1.5rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: '#f8fafc' }}>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>ID Venta</th>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>Fecha</th>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>Cliente</th>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map(sale => (
              <tr key={sale.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                 <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{sale.id.slice(0, 8)}</td>
                 <td style={{ padding: '1rem' }}>{new Date(sale.createdAt).toLocaleString()}</td>
                 <td style={{ padding: '1rem' }}>{sale.customer ? sale.customer.name : <span style={{color: '#94a3b8'}}>Mostrador (Sin cliente)</span>}</td>
                 <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>${sale.total.toFixed(2)}</td>
                 <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button 
                      onClick={() => handleOpenSale(sale)}
                      style={{ padding: '0.4rem 0.8rem', backgroundColor: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                    >
                      Ver Opciones
                    </button>
                 </td>
              </tr>
            ))}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>No se encontraron ventas para devolver.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedSale && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
             
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>
               <div>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RotateCcw size={24} color="#3b82f6" /> Gestionar Devolución
                  </h2>
                  <div style={{ fontSize: '0.9rem', color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>
                     Venta: {selectedSale.id} — {new Date(selectedSale.createdAt).toLocaleString()}
                  </div>
               </div>
               <button onClick={() => setSelectedSale(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '2rem', color: '#94a3b8' }}>&times;</button>
             </div>

             <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>Artículos de la Venta</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', fontSize: '0.85rem', color: '#475569' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Producto</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Precio U.</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Vendidos</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ya Devueltos</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Válidos</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>A Devolver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items.map((item: any) => {
                      const returned = getReturnedCount(item);
                      const maxAllowed = item.quantity - returned;
                      const currentQ = returnQuantities[item.id] || 0;

                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                           <td style={{ padding: '0.75rem', fontWeight: '500' }}>{item.product.name}</td>
                           <td style={{ padding: '0.75rem', textAlign: 'right' }}>${item.price.toFixed(2)}</td>
                           <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.quantity}</td>
                           <td style={{ padding: '0.75rem', textAlign: 'center', color: '#ef4444' }}>{returned}</td>
                           <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>{maxAllowed}</td>
                           <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                             <input 
                               type="number"
                               min="0"
                               max={maxAllowed}
                               value={currentQ === 0 ? '' : currentQ}
                               onChange={e => handleReturnQuantityChange(item.id, maxAllowed, e.target.value)}
                               disabled={maxAllowed === 0}
                               style={{ width: '60px', padding: '0.25rem', textAlign: 'center', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                               placeholder="0"
                             />
                           </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <div>
                   <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>Detalles del Reembolso</h3>
                   
                   <div style={{ marginBottom: '1rem' }}>
                     <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#334155' }}>Método de Reembolso</label>
                     <select 
                       value={refundMethod}
                       onChange={e => setRefundMethod(e.target.value)}
                       style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                     >
                       <option value="CASH">Restitución / Resta de Caja</option>
                       {selectedSale.customer && <option value="STORE_CREDIT">Saldo a Favor ({selectedSale.customer.name})</option>}
                     </select>
                     {!selectedSale.customer && (
                       <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                         <AlertTriangle size={12} /> Cliente no asignado, Saldo a Favor deshabilitado
                       </div>
                     )}
                   </div>

                   <div style={{ marginBottom: '1rem' }}>
                     <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#334155' }}>Folio Nota Crédito SAT (Opcional)</label>
                     <input 
                       type="text"
                       value={satFolio}
                       onChange={e => setSatFolio(e.target.value)}
                       placeholder="E.g. NC-4019"
                       style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                     />
                   </div>

                   <div>
                     <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#334155' }}>Motivo</label>
                     <textarea 
                       value={reason}
                       onChange={e => setReason(e.target.value)}
                       placeholder="Producto en mal estado, error en compra..."
                       style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical', minHeight: '60px' }}
                     />
                   </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                   <div style={{ fontSize: '1rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Total a Reembolsar</div>
                   <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#0f172a' }}>
                     ${calculateTotalRefund().toFixed(2)}
                   </div>

                   <button 
                     onClick={processReturn}
                     disabled={isPending || calculateTotalRefund() === 0}
                     style={{ 
                       marginTop: '2rem',
                       width: '100%', 
                       padding: '1rem', 
                       backgroundColor: calculateTotalRefund() > 0 ? '#10b981' : '#94a3b8', 
                       color: 'white', 
                       border: 'none', 
                       borderRadius: '8px', 
                       fontWeight: 'bold',
                       fontSize: '1.1rem',
                       cursor: calculateTotalRefund() > 0 ? 'pointer' : 'not-allowed',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: '0.5rem',
                       transition: 'all 0.2s'
                     }}
                   >
                     {isPending ? 'Procesando...' : <><CheckCircle size={20} /> Ejecutar Devolución</>}
                   </button>
                </div>
             </div>

          </div>
        </div>
      )}
    </>
  );
}
