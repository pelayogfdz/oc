'use client';

import { useState, useEffect } from 'react';
import { Search, Save, Trash, Image as ImageIcon, ArrowRightLeft, Package } from 'lucide-react';
import { createInventoryAdjustment } from '@/app/actions/adjustment';
import { searchProducts } from '@/app/actions/product';
import { useRouter } from 'next/navigation';

export default function AdjustmentClient({ branchId, initialProducts }: { branchId: string, initialProducts: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [displayedProducts, setDisplayedProducts] = useState<any[]>(initialProducts);
  
  const [reason, setReason] = useState('Ajuste General');
  const [items, setItems] = useState<any[]>([]);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const delayFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchProducts(searchTerm, branchId);
        setDisplayedProducts(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(delayFn);
  }, [searchTerm, branchId]);

  const toggleItem = (prod: any) => {
    if (items.find(i => i.id === prod.id)) return;
    setItems([{ id: prod.id, name: prod.name, sku: prod.sku, imageUrl: prod.imageUrl, oldStock: prod.stock, newStock: prod.stock }, ...items]);
  };

  const updateNewStock = (id: string, val: string) => {
    const rawVal = parseInt(val, 10);
    const finalVal = isNaN(rawVal) ? 0 : rawVal;
    setItems(items.map(i => i.id === id ? { ...i, newStock: finalVal } : i));
  };

  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));

  const handleSave = async () => {
    if (items.length === 0) return;
    if (!confirm('Este ajuste modificará permanentemente el inventario registrado. ¿Deseas continuar?')) return;
    
    setIsPending(true);
    try {
      const payload = items.map(i => ({
        productId: i.id,
        newStock: i.newStock,
        difference: i.newStock - i.oldStock,
        checkOldStock: i.oldStock
      }));
      await createInventoryAdjustment(payload, reason);
      alert('¡Ajuste de inventario aplicado correctamente!');
      window.location.href = '/productos/ajustes';
    } catch (e: any) {
      alert(e.message || 'Error ajustando inventario');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '2rem', height: 'calc(100vh - 120px)', boxSizing: 'border-box' }}>
      
      {/* Columna Izquierda: Buscador */}
      <div style={{ flex: 1, backgroundColor: 'white', border: '1px solid var(--pulpos-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', backgroundColor: '#f8fafc' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={20} /> Catálogo de Productos
          </h2>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--pulpos-text-muted)' }} size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o código de barras..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '1rem', transition: 'border-color 0.2s', outline: 'none', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', backgroundColor: '#f1f5f9' }}>
          {displayedProducts.length === 0 && !isSearching && (
            <div style={{ textAlign: 'center', color: 'var(--pulpos-text-muted)', padding: '3rem 1rem' }}>
              No se encontraron resultados para "{searchTerm}"
            </div>
          )}
          {isSearching && (
             <div style={{ textAlign: 'center', color: 'var(--pulpos-text-muted)', padding: '3rem 1rem' }}>
               Buscando...
             </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {displayedProducts.map(prod => {
              const isAdded = items.some(i => i.id === prod.id);
              return (
                <button 
                  key={prod.id} 
                  onClick={() => toggleItem(prod)} 
                  disabled={isAdded}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    padding: '0.85rem 1rem', 
                    borderRadius: '8px', 
                    border: '1px solid var(--pulpos-border)', 
                    backgroundColor: isAdded ? '#f8fafc' : 'white', 
                    cursor: isAdded ? 'not-allowed' : 'pointer', 
                    textAlign: 'left',
                    opacity: isAdded ? 0.6 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ width: '40px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexShrink: 0, overflow: 'hidden' }}>
                    {prod.imageUrl ? <img src={prod.imageUrl} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={20} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {prod.name}
                    </div>
                    <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.8rem' }}>
                      SKU: {prod.sku || '--'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: '900', fontSize: '1.1rem', color: prod.stock > 0 ? '#10b981' : '#ef4444' }}>
                      {prod.stock}
                    </div>
                    <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.7rem' }}>En sistema</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Columna Derecha: Manifiesto de Ajuste */}
      <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', backgroundColor: 'white', border: '1px solid var(--pulpos-border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', backgroundColor: '#ffffff', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: 'bold' }}>Manifiesto de Ajuste</h3>
            <p style={{ color: 'var(--pulpos-text-muted)', margin: 0, fontSize: '0.875rem' }}>Los cambios aplicados sobrescribirán el stock actual.</p>
          </div>
          <div style={{ width: '300px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569', fontSize: '0.85rem' }}>Motivo de la Bitácora (Obligatorio)</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} required placeholder="Ej. Merma / Robo / Conteo Físico" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '500' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: items.length === 0 ? '#f8fafc' : 'white' }}>
          {items.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--pulpos-text-muted)', gap: '1rem' }}>
              <ArrowRightLeft size={48} style={{ opacity: 0.2 }} />
              <p style={{ fontSize: '1.1rem' }}>No hay productos en el manifiesto.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--pulpos-border)' }}>Producto</th>
                  <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>Stock Actual</th>
                  <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center', width: '140px' }}>Nuevo Stock</th>
                  <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>Diferencia</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const diff = item.newStock - item.oldStock;
                  const isModified = diff !== 0;
                  
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: isModified ? '#f0fdf4' : 'transparent', transition: 'background-color 0.2s' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{item.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)' }}>{item.sku || 'Sin SKU'}</div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#64748b', fontSize: '1.1rem' }}>
                        {item.oldStock}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <input 
                          type="number" 
                          value={item.newStock}
                          onChange={e => updateNewStock(item.id, e.target.value)}
                          style={{ 
                            width: '100px', 
                            padding: '0.5rem', 
                            borderRadius: '6px', 
                            border: isModified ? '2px solid #22c55e' : '1px solid #cbd5e1', 
                            textAlign: 'center', 
                            fontWeight: 'bold', 
                            fontSize: '1rem',
                            backgroundColor: 'white',
                            boxShadow: isModified ? '0 0 0 2px rgba(34, 197, 94, 0.1)' : 'none',
                            outline: 'none'
                          }}
                        />
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {isModified ? (
                          <span style={{ 
                            display: 'inline-block', 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '12px', 
                            backgroundColor: diff > 0 ? '#dcfce7' : '#fee2e2', 
                            color: diff > 0 ? '#166534' : '#991b1b', 
                            fontWeight: 'bold', 
                            fontSize: '0.85rem' 
                          }}>
                            {diff > 0 ? '+' : ''}{diff}
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>--</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button onClick={() => removeItem(item.id)} style={{ padding: '0.5rem', color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '4px' }} title="Quitar de lista">
                          <Trash size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--pulpos-border)', backgroundColor: '#f8fafc' }}>
          <button 
            onClick={handleSave} 
            disabled={isPending || items.length === 0} 
            className="btn-primary" 
            style={{ 
              width: '100%', 
              fontSize: '1.1rem', 
              padding: '1rem', 
              opacity: (isPending || items.length === 0) ? 0.5 : 1, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 'bold',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Save size={20} />
            {isPending ? 'Procesando Ajuste...' : 'Auditar y Guardar Ajuste'}
          </button>
        </div>

      </div>
    </div>
  );
}
