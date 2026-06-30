'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Save, Search, Plus, Minus, ShoppingBag, Edit3, X, ArrowRight, AlertTriangle, FileText, CheckCircle2, Clock } from 'lucide-react';
import { updatePurchaseOrder, deletePurchaseOrder } from '@/app/actions/pedidos';

export default function EditarPedidoForm({ 
  order, 
  products, 
  suppliers 
}: { 
  order: any, 
  products: any[], 
  suppliers: any[] 
}) {
  const router = useRouter();

  // Mode state: false = Read Only (visualize), true = Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Form states
  const [supplierId, setSupplierId] = useState(order.supplierId || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [items, setItems] = useState<any[]>(
    order.items.map((item: any) => ({
      productId: item.productId,
      name: item.product.name,
      sku: item.product.sku,
      barcode: item.product.barcode,
      quantity: item.quantity,
      cost: item.cost,
      imageUrl: item.product.imageUrl
    }))
  );

  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Re-calculate total
  const total = items.reduce((sum: number, item: any) => sum + (item.quantity * item.cost), 0);

  // Available options
  const [availableProducts] = useState(products || []);
  const [availableSuppliers] = useState(suppliers || []);

  const handleAddItem = (product: any) => {
    if (!product || !product.id) return;
    if (items.some((i: any) => i.productId === product.id)) return;
    setItems([...items, { 
      productId: product.id, 
      name: product.name, 
      sku: product.sku,
      barcode: product.barcode,
      quantity: 1, 
      cost: product.cost, 
      imageUrl: product.imageUrl 
    }]);
  };

  const handleUpdateItem = (index: number, field: string, value: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleCancelEditing = () => {
    // Reset to original values
    setSupplierId(order.supplierId || '');
    setNotes(order.notes || '');
    setItems(
      order.items.map((item: any) => ({
        productId: item.productId,
        name: item.product.name,
        sku: item.product.sku,
        barcode: item.product.barcode,
        quantity: item.quantity,
        cost: item.cost,
        imageUrl: item.product.imageUrl
      }))
    );
    setIsEditing(false);
  };

  const handleSaveOrder = async () => {
    if (items.length === 0) return alert('Debes agregar al menos un artículo.');
    setIsSubmitting(true);
    try {
      await updatePurchaseOrder(order.id, supplierId || null, notes || null, items, total);
      alert('Pedido guardado correctamente.');
      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      alert('Error al guardar el pedido: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!confirm('¿Estás completamente seguro de cancelar y eliminar este borrador de pedido?')) return;
    setIsSubmitting(true);
    try {
      await deletePurchaseOrder(order.id);
      alert('Pedido eliminado correctamente.');
      router.push('/productos/pedidos');
      router.refresh();
    } catch (err: any) {
      alert('Error al eliminar el pedido: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = availableProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 0' }}>
      
      {/* MAIN TWO-COLUMN BODY LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: ORDER ITEMS (70% width) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* SEARCH BAR (Only visible in edit mode) */}
          {isEditing && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', width: '100%' }}>
              <div 
                onClick={() => setIsSearchModalOpen(true)}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.65rem 1rem', 
                  borderRadius: '8px', 
                  border: '1px solid #cbd5e1', 
                  backgroundColor: 'white', 
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  userSelect: 'none',
                  flex: 1,
                  height: '40px'
                }}
              >
                <Search size={18} color="#94a3b8" style={{ marginRight: '8px' }} />
                Agregar productos: Buscar por nombre, SKU o código de barras...
              </div>
            </div>
          )}

          {/* ORDER ITEMS LIST */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '400px', border: '1px solid #cbd5e1', borderRadius: '12px', backgroundColor: 'white' }}>
            {items.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', padding: '4rem 1rem' }}>
                <ShoppingBag size={64} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#64748b' }}>El pedido no tiene artículos</div>
                {isEditing && <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#94a3b8' }}>Usa el buscador de arriba para agregar productos.</div>}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {items.map((item: any, idx: number) => (
                  <div key={item.productId} style={{ display: 'grid', gridTemplateColumns: isEditing ? '40px 1fr auto auto auto' : '40px 1fr auto auto', gap: '1.25rem', alignItems: 'center', padding: '1rem', border: '1px solid #f1f5f9', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                    
                    {/* Initials avatar badge */}
                    <div style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontWeight: 'bold', fontSize: '0.8rem', overflow: 'hidden', position: 'relative' }}>
                      <span>{item.name.substring(0, 2).toUpperCase()}</span>
                      {item.imageUrl && !imageErrors[item.productId] && (
                        <img 
                          src={item.imageUrl.replace(/#/g, '%23')} 
                          alt="" 
                          onError={() => setImageErrors(prev => ({ ...prev, [item.productId]: true }))}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      )}
                    </div>

                    {/* Name, SKU and Barcode */}
                    <div style={{ minWidth: '150px', flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#1e293b', wordBreak: 'break-word' }} title={item.name}>
                        {item.name}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                        {item.sku && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                            SKU: {item.sku}
                          </span>
                        )}
                        {item.barcode && item.barcode !== 'N/A' && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                            Código: {item.barcode}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Selector / Display */}
                    <div>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
                            style={{ border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <Minus size={14} color="#64748b" />
                          </button>
                          <input 
                            type="number" 
                            min="1" 
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                            style={{ width: '55px', height: '32px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(idx, 'quantity', item.quantity + 1)}
                            style={{ border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <Plus size={14} color="#64748b" />
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.95rem', color: '#334155', fontWeight: '500', padding: '0 0.5rem' }}>
                          Cantidad: <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{item.quantity}</strong> pzas
                        </div>
                      )}
                    </div>

                    {/* Cost Input / Display */}
                    <div>
                      {isEditing ? (
                        <div style={{ position: 'relative', width: '100px' }}>
                          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#64748b' }}>$</span>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0"
                            value={item.cost} 
                            onChange={(e) => handleUpdateItem(idx, 'cost', parseFloat(e.target.value) || 0)} 
                            style={{ width: '100%', height: '32px', padding: '0 0.5rem 0 1.25rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', textAlign: 'right' }} 
                          />
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.95rem', color: '#334155', textAlign: 'right', minWidth: '80px' }}>
                          Costo: <strong>${item.cost.toFixed(2)}</strong>
                        </div>
                      )}
                    </div>

                    {/* Subtotal & Delete action */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '120px', justifyContent: 'flex-end' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Subtotal</span>
                        <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '0.95rem' }}>
                          ${(item.quantity * item.cost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      {isEditing && (
                        <button 
                          type="button"
                          onClick={() => setItems(items.filter((_: any, i: number) => i !== idx))} 
                          style={{ color: '#ef4444', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          title="Eliminar artículo"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SUMMARY & SUBMIT (30% width) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* STATS & METADATA BOX */}
          <div className="card" style={{ padding: '1.5rem', border: '1px solid #cbd5e1', borderRadius: '12px', backgroundColor: 'white' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              Resumen del Pedido
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: '#475569', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Estado:</span>
                <span style={{ 
                  backgroundColor: order.status === 'RECEIVED' ? '#dcfce7' : '#fef9c3', 
                  color: order.status === 'RECEIVED' ? '#166534' : '#854d0e', 
                  padding: '0.15rem 0.45rem', 
                  borderRadius: '4px', 
                  fontSize: '0.75rem', 
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {order.status === 'RECEIVED' ? 'RECIBIDO' : 'PENDIENTE'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Fecha:</span>
                <span style={{ fontWeight: '500', color: '#1e293b' }}>{new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Sucursal:</span>
                <span style={{ fontWeight: '500', color: '#1e293b' }}>{order.branch?.name || 'Central'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Creado por:</span>
                <span style={{ fontWeight: '500', color: '#1e293b' }}>{order.user?.name || 'Sistema'}</span>
              </div>
            </div>

            {/* SUPPLIER SELECT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Proveedor</label>
              <select 
                value={supplierId} 
                disabled={!isEditing}
                onChange={(e) => setSupplierId(e.target.value)} 
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', backgroundColor: !isEditing ? '#f8fafc' : 'white', cursor: !isEditing ? 'not-allowed' : 'default' }}
              >
                <option value="">-- Público en General / Sin Proveedor --</option>
                {availableSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* ADDITIONAL COMMENTS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Comentarios Adicionales</label>
              <textarea 
                value={notes}
                disabled={!isEditing}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas que se guardarán adjuntas al pedido..."
                rows={4}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', resize: 'none', backgroundColor: !isEditing ? '#f8fafc' : 'white', cursor: !isEditing ? 'not-allowed' : 'default' }}
              />
            </div>

            {/* TOTAL ESTIMATED */}
            <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Estimado</span>
              <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#1e293b', marginTop: '0.25rem' }}>
                ${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* ACTIONS PANEL */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              {/* EDIT BUTTONS */}
              {!isEditing ? (
                <>
                  {order.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--caanma-primary)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      <Edit3 size={18} /> Editar Pedido
                    </button>
                  )}
                  
                  {order.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => router.push(`/productos/compras/nuevo?orderId=${order.id}`)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      <ArrowRight size={18} /> Jalar a Compras
                    </button>
                  )}
                  
                  {order.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={handleDeleteOrder}
                      disabled={isSubmitting}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      <Trash2 size={18} /> Eliminar Pedido
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSaveOrder}
                    disabled={isSubmitting}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    <Save size={18} /> Guardar Cambios
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    <X size={18} /> Cancelar
                  </button>
                </>
              )}

            </div>
          </div>
        </div>

      </div>

      {/* PRODUCT SEARCH MODAL */}
      {isSearchModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div 
            onClick={() => {
              setIsSearchModalOpen(false);
              setSearchTerm('');
            }}
            style={{ position: 'absolute', inset: 0 }}
          />
          <div className="card" style={{ position: 'relative', width: '700px', maxWidth: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', zIndex: 10000 }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>Buscar Artículos</h3>
              <button 
                type="button" 
                onClick={() => {
                  setIsSearchModalOpen(false);
                  setSearchTerm('');
                }} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.25rem', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                autoFocus
                placeholder="Escribe el nombre, SKU o código de barras del producto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.05rem', outline: 'none' }}
              />
            </div>

            {/* Results list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '300px' }}>
              {filteredProducts.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No se encontraron productos coincidentes</div>
              ) : (
                filteredProducts.slice(0, 30).map((p: any) => {
                  const inCart = items.some((i: any) => i.productId === p.id);
                  return (
                    <div 
                      key={p.id}
                      onClick={() => {
                        handleAddItem(p);
                        setSearchTerm('');
                        setIsSearchModalOpen(false);
                      }}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderRadius: '6px',
                        transition: 'background-color 0.15s',
                        backgroundColor: inCart ? '#f8fafc' : 'transparent',
                        opacity: inCart ? 0.6 : 1
                      }}
                      onMouseEnter={e => {
                        if (!inCart) e.currentTarget.style.backgroundColor = '#f1f5f9';
                      }}
                      onMouseLeave={e => {
                        if (!inCart) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                          {p.sku && <span>SKU: {p.sku}</span>}
                          {p.barcode && <span>Código: {p.barcode}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b' }}>${p.cost.toFixed(2)}</span>
                        {inCart ? (
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>Agregado</span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Añadir</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
