'use client';

import { useState } from 'react';
import { Search, AlertTriangle, AlertCircle, CheckCircle, Image as ImageIcon } from 'lucide-react';

export default function CaducidadesClient({ initialBatches }: { initialBatches: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const today = new Date();
  
  const getStatus = (expDateStr: string) => {
    const expDate = new Date(expDateStr);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { label: 'Vencido', color: '#ef4444', icon: <AlertCircle size={16} />, bg: '#fef2f2' };
    if (diffDays <= 30) return { label: `Vence en ${diffDays} días`, color: '#f59e0b', icon: <AlertTriangle size={16} />, bg: '#fffbeb' };
    return { label: 'Sano', color: '#10b981', icon: <CheckCircle size={16} />, bg: '#ecfdf5' };
  };

  const filteredBatches = initialBatches.filter(b => 
    b.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.product.sku && b.product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (b.batchNumber && b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="card" style={{ minHeight: '60vh' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flexGrow: 1, maxWidth: '500px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Buscar por producto, SKU o número de lote" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ 
              padding: '0.6rem 1rem 0.6rem 2.5rem', 
              width: '100%', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0', 
              backgroundColor: 'white', 
              fontSize: '0.95rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {filteredBatches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
          <CheckCircle size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <p style={{ fontSize: '1.1rem' }}>No se encontraron lotes con fecha de caducidad registrada.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Lote</th>
                <th>Existencia</th>
                <th>Fecha de Caducidad</th>
                <th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.map((batch) => {
                const status = getStatus(batch.expirationDate);
                return (
                  <tr key={batch.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '32px', backgroundColor: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                          {batch.product.imageUrl ? <img src={batch.product.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={16} color="#94a3b8" />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: '#1e293b' }}>{batch.product.name}</div>
                          {batch.product.sku && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>SKU: {batch.product.sku}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, color: '#475569' }}>{batch.batchNumber || '-'}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 'bold' }}>{batch.stock}</span>
                    </td>
                    <td>
                      {new Date(batch.expirationDate).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                    </td>
                    <td>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem', 
                        backgroundColor: status.bg, color: status.color, 
                        padding: '0.35rem 0.75rem', borderRadius: '9999px', 
                        fontSize: '0.85rem', fontWeight: 600 
                      }}>
                        {status.icon} {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
