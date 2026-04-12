'use client';

import { useState, useEffect } from 'react';
import { Search, Send, Trash, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { searchProducts } from '@/app/actions/product';
import { createTransfer } from '@/app/actions/transfer';

export default function TransferClient({ branchId, branchName, destinationBranches, initialProducts }: { branchId: string, branchName: string, destinationBranches: any[], initialProducts: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [displayedProducts, setDisplayedProducts] = useState<any[]>(initialProducts);
  
  const [reason, setReason] = useState('Resurtido');
  const [toBranchId, setToBranchId] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [isPending, setIsPending] = useState(false);

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
    if (items.find(i => i.id === prod.id)) {
       setItems(items.map(i => i.id === prod.id ? { ...i, transferQty: i.transferQty + 1 } : i));
    } else {
       setItems([{ id: prod.id, name: prod.name, sku: prod.sku, stock: prod.stock, transferQty: 1 }, ...items]);
    }
  };

  const updateQuantity = (id: string, val: string) => {
    const rawVal = parseInt(val, 10);
    const finalVal = isNaN(rawVal) ? 1 : rawVal;
    setItems(items.map(i => i.id === id ? { ...i, transferQty: finalVal } : i));
  };

  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));

  const handleSave = async () => {
    if (items.length === 0) return alert('Debes agregar productos a la bitácora del traspaso');
    if (!toBranchId) return alert('Debes seleccionar una sucursal destino válida');
    
    for (const item of items) {
      if (item.transferQty > item.stock) {
        return alert(`Operación Bloqueada. No puedes enviar ${item.transferQty} piezas de ${item.name} porque solo cuentas con ${item.stock} piezas físicas en ${branchName}.`);
      }
    }

    if (!confirm(`Este traspaso descontará ${items.length} artículos de tu inventario local de forma inmediata. ¿Autorizar?`)) return;
    
    setIsPending(true);
    try {
      const payload = {
        toBranchId,
        reason,
        items: items.map(i => ({
          productId: i.id,
          quantity: i.transferQty
        }))
      };
      await createTransfer(payload);
      alert('¡Traspaso confirmado y ejecutado!');
      setItems([]);
      setReason('');
      setToBranchId('');
    } catch (e: any) {
      alert(e.message || 'Error registrando traspaso');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '2rem', height: 'calc(100vh - 200px)' }}>

      <div className="card" style={{ flex: 2, display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Inventario Local</h2>
          <div style={{ position: 'relative', width: '350px' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--pulpos-text-muted)' }} size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, SKU o código..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', backgroundColor: '#f8fafc', fontWeight: '500' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', overflowY: 'auto', alignContent: 'start', paddingRight: '0.5rem', opacity: isSearching ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          {displayedProducts.map(prod => (
            <button key={prod.id} onClick={() => toggleItem(prod)} style={{ display: 'flex', gap: '1rem', alignItems: 'center', border: '1px solid var(--pulpos-border)', padding: '1rem', borderRadius: '8px', textAlign: 'left', backgroundColor: 'white', cursor: 'pointer', transition: 'box-shadow 0.2s, border-color 0.2s', width: 'calc(50% - 0.25rem)', position: 'relative' } as any}>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexShrink: 0 }}>
                {prod.imageUrl ? <img src={prod.imageUrl} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} /> : <ImageIcon size={20} />}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prod.name}</div>
                <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>SKU: {prod.sku || '--'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: prod.stock > 0 ? '#10b981' : '#ef4444' }}>{prod.stock}</div>
                <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.7rem' }}>Pzas</div>
              </div>
            </button>
          ))}
          {displayedProducts.length === 0 && !isSearching && (
            <div style={{ padding: '4rem', width: '100%', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
              No se encontraron productos en la base de datos local.
            </div>
          )}
          {isSearching && (
             <div style={{ padding: '4rem', width: '100%', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
               Buscando...
             </div>
          )}
        </div>
      </div>

      <div className="card" style={{ flex: 1.2, display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
        
        <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--pulpos-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Origen: <span style={{ color: '#1e293b' }}>{branchName}</span></div>
            <ArrowRight size={20} color="#8b5cf6" />
            <div style={{ flex: 1, marginLeft: '1rem' }}>
              <select value={toBranchId} onChange={e => setToBranchId(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #8b5cf6', backgroundColor: 'white', fontWeight: 'bold', color: '#8b5cf6' }}>
                <option value="">Destino (Elegir...)</option>
                {destinationBranches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo / Referencia" style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginTop: 0, marginBottom: '1rem' }}>Artículos a Enviar</h3>
          {items.length === 0 && <div style={{ color: 'var(--pulpos-text-muted)', textAlign: 'center', marginTop: '2rem' }}>La bitácora está vacía. Selecciona productos a la izquierda.</div>}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--pulpos-border)', borderRadius: '6px', backgroundColor: item.transferQty > item.stock ? '#fef2f2' : 'white' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{item.name}</div>
                  <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.8rem' }}>Stock actual: {item.stock}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '80px' }}>
                    <input 
                      type="number" 
                      value={item.transferQty}
                      min="1"
                      onChange={e => updateQuantity(item.id, e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: item.transferQty > item.stock ? '2px solid #ef4444' : '1px solid var(--pulpos-border)', textAlign: 'center', fontWeight: 'bold' }}
                    />
                  </div>
                  <button onClick={() => removeItem(item.id)} style={{ padding: '0.5rem', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}><Trash size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '1.5rem', borderTop: '2px solid var(--pulpos-border)', backgroundColor: 'white' }}>
          <div style={{ display: 'flex', justifyItems: 'space-between', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            <span style={{flex: 1}}>Total SKUs</span>
            <span style={{ color: 'var(--pulpos-primary)' }}>{items.length}</span>
          </div>
          <button onClick={handleSave} disabled={isPending || items.length === 0} className="btn-primary" style={{ width: '100%', fontSize: '1.1rem', padding: '1rem', opacity: (isPending || items.length === 0) ? 0.5 : 1, display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <Send size={20} />
            {isPending ? 'Enviando...' : 'Confirmar Traspaso'}
          </button>
        </div>

      </div>
    </div>
  );
}
