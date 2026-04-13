'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { createProduct } from "@/app/actions/product";
import { useFormState } from 'react-dom';

const initialState = {
  error: '',
  success: false
};

export default function ProductFormClient({ cloneProduct, suppliers, priceLists, branchId }: any) {
  const [state, formAction] = useFormState(createProduct, initialState);
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<{ attribute: string, stock: number, sku: string }[]>([]);
  
  // States for margin calculation
  const [cost, setCost] = useState<number>(() => parseFloat(cloneProduct?.cost || "0"));
  const [price, setPrice] = useState<number>(() => parseFloat(cloneProduct?.price || "0"));
  
  const [dynamicPrices, setDynamicPrices] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    if (priceLists && cloneProduct?.prices) {
      priceLists.forEach((pl: any) => {
        const p = cloneProduct.prices.find((cp: any) => cp.priceListId === pl.id);
        if (p) init[pl.id] = parseFloat(p.price) || 0;
      });
    }
    return init;
  });

  const handleAddVariant = () => {
    setVariants([...variants, { attribute: '', stock: 0, sku: '' }]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: string, value: string | number) => {
    const newVariants = [...variants];
    (newVariants[index] as any)[field] = value;
    setVariants(newVariants);
  };

  return (
    <form action={formAction}>
      <input type="hidden" name="branchId" value={branchId} />
      <input type="hidden" name="variantsJson" value={JSON.stringify(variants)} />
      <input type="hidden" name="hasVariants" value={hasVariants ? "1" : "0"} />
      
      {/* Imagen */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <div style={{ width: '100px', height: '100px', backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', overflow: 'hidden' }}>
          {cloneProduct?.imageUrl ? <img src={cloneProduct.imageUrl} style={{width: '100%', height: '100%', objectFit: 'cover'}} alt="thumb"/> : <ImageIcon size={32} />}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Multimedia del Producto</h2>
          <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>Ingresa la URL de la miniatura y opcionalmente un video reseña o instructivo de YouTube.</p>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.85rem' }}>Imagen URL</label>
          <input type="url" name="imageUrl" defaultValue={cloneProduct?.imageUrl || ''} placeholder="https://ejemplo.com/foto.jpg" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', marginBottom: '1rem' }} />
          
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.85rem' }}>YouTube Video URL</label>
          <input type="url" name="youtubeUrl" defaultValue={cloneProduct?.youtubeUrl || ''} placeholder="https://www.youtube.com/watch?v=..." style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
          
          {state?.error && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '6px', fontWeight: 'bold' }}>
               {state.error}
            </div>
          )}
        </div>
      </div>

      {/* Identificación */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.5rem' }}>Identificación</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nombre del Producto *</label>
            <input type="text" name="name" defaultValue={cloneProduct ? `${cloneProduct.name} (Copia)` : ''} required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Categoría / Departamento</label>
            <input type="text" name="category" defaultValue={cloneProduct?.category || ''} placeholder="Ej. Abarrotes, Papelería..." style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Marca</label>
            <input type="text" name="brand" defaultValue={cloneProduct?.brand || ''} placeholder="Ej. Coca Cola, BIC..." style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>SKU Base (Código Interno) *</label>
            <input type="text" name="sku" defaultValue="" required placeholder="Nuevo SKU" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Código de Barras</label>
            <input type="text" name="barcode" defaultValue="" placeholder="(Opcional)" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
          </div>
          <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '4px', border: '1px dashed #22c55e', gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#166534' }}>Clave de Producto SAT (Product Key)</label>
              <input type="text" name="satKey" defaultValue={cloneProduct?.satKey || ''} placeholder="Ej. 01010101" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #bbf7d0' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#166534' }}>Clave de Unidad SAT (Unit Key)</label>
              <input type="text" name="satUnit" defaultValue={cloneProduct?.satUnit || ''} placeholder="Ej. H87" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #bbf7d0' }} />
            </div>
            <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: '0.85rem', color: '#166534' }}>* Estos campos son requeridos para facturar ventas de este artículo.</p>
          </div>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Descripción</label>
          <textarea name="description" defaultValue={cloneProduct?.description || ''} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', fontFamily: 'inherit' }}></textarea>
        </div>
      </div>

      {/* Finanzas y Precios */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.5rem' }}>Finanzas y Precios</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Costo de Compra ($)</label>
            <input type="number" step="0.01" name="cost" value={cost} onChange={(e) => setCost(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Precio Público normal ($) *</label>
            <input type="number" step="0.01" name="price" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: (price - cost) >= 0 ? '#16a34a' : '#dc2626', fontWeight: '500' }}>
              Ganancia: ${(price - cost).toFixed(2)} ({ cost > 0 ? (((price - cost) / cost) * 100).toFixed(1) : (price > 0 ? '100' : '0') }% de utilidad sobre costo / { price > 0 ? (((price - cost) / price) * 100).toFixed(1) : '0'}% margen)
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Impuesto / IVA (%)</label>
            <input type="number" step="0.01" name="taxRate" defaultValue={cloneProduct?.taxRate || "16.0"} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
          </div>
        </div>
        {priceLists.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--pulpos-border)' }}>
              {priceLists.map((pl: any) => {
                const plPrice = dynamicPrices[pl.id] || 0;
                return (
                  <div key={pl.id}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Lista: {pl.name} ($)</label>
                    <input 
                       type="number" 
                       step="0.01" 
                       name={`priceList_${pl.id}`} 
                       value={dynamicPrices[pl.id] === undefined ? '' : dynamicPrices[pl.id]} 
                       onChange={(e) => setDynamicPrices({...dynamicPrices, [pl.id]: parseFloat(e.target.value) || 0})}
                       placeholder="Opcional" 
                       style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} 
                    />
                    {plPrice > 0 && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.80rem', color: (plPrice - cost) >= 0 ? '#16a34a' : '#dc2626', fontWeight: '500' }}>
                        Ganancia: ${(plPrice - cost).toFixed(2)} ({ cost > 0 ? (((plPrice - cost) / cost) * 100).toFixed(1) : '100'}% de utilidad / { (((plPrice - cost) / plPrice) * 100).toFixed(1)}% margen)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
      </div>

      {/* Variantes Selector */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Variantes Dinámicas</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={hasVariants} onChange={(e) => { setHasVariants(e.target.checked); if(e.target.checked && variants.length === 0) handleAddVariant(); }} style={{ width: '20px', height: '20px' }} />
            <span style={{ fontWeight: '500' }}>El producto tiene colores, tallas, etc.</span>
          </label>
        </div>

        {hasVariants && (
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '1rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid #cbd5e1' }}>Atributo (Ej. Talla 27, Rojo)</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid #cbd5e1' }}>SKU Variante</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid #cbd5e1' }}>Stock Inicial</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid #cbd5e1', width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, index) => (
                  <tr key={index}>
                    <td style={{ padding: '0.5rem' }}>
                      <input type="text" value={v.attribute} onChange={e => handleVariantChange(index, 'attribute', e.target.value)} required placeholder="Rojo XL" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input type="text" value={v.sku} onChange={e => handleVariantChange(index, 'sku', e.target.value)} required placeholder="SKU-ROJO-XL" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input type="number" value={v.stock} onChange={e => handleVariantChange(index, 'stock', Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <button type="button" onClick={() => handleRemoveVariant(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={20}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={handleAddVariant} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'white', border: '1px dashed #94a3b8', borderRadius: '4px', fontWeight: '500', cursor: 'pointer', color: '#475569' }}>
               <Plus size={16} /> Añadir Variante
            </button>
          </div>
        )}
      </div>

      {/* Inventario Físico (Solo si NO hay variantes, ya que las variantes tienen su propio stock) */}
      {!hasVariants && (
        <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.5rem' }}>Inventario Físico Global</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Stock Inicial</label>
              <input type="number" name="stock" defaultValue={cloneProduct?.stock || "0"} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Stock Mínimo</label>
              <input type="number" name="minStock" defaultValue={cloneProduct?.minStock || "0"} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Unidad de Medida</label>
              <select name="unit" defaultValue={cloneProduct?.unit || "Pza"} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }}>
                <option value="Pza">Pieza (Pza)</option>
                <option value="Kg">Kilogramos (Kg)</option>
                <option value="Lt">Litros (Lt)</option>
                <option value="Caja">Caja</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Proveedor Sugerido</label>
              <select name="supplierId" defaultValue={cloneProduct?.supplierId || ""} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }}>
                <option value="">-- PÚBLICO / NINGUNO --</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Estado</label>
              <select name="isActive" defaultValue={cloneProduct ? (cloneProduct.isActive ? "true" : "false") : "true"} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }}>
                <option value="true">🟢 Activo</option>
                <option value="false">🔴 Inactivo</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {hasVariants && (
        <input type="hidden" name="minStock" value={cloneProduct?.minStock || "0"} />
      )}
      {hasVariants && (
        <input type="hidden" name="unit" value={cloneProduct?.unit || "Pza"} />
      )}
      {hasVariants && (
        <input type="hidden" name="supplierId" value={cloneProduct?.supplierId || ""} />
      )}
      {hasVariants && (
        <input type="hidden" name="isActive" value="true" />
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <Link href="/productos" style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px', textDecoration: 'none', color: 'var(--pulpos-text)', fontWeight: 'bold' }}>
          Cancelar
        </Link>
        <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2.5rem', fontSize: '1.1rem' }}>
          Guardar Producto
        </button>
      </div>
    </form>
  );
}
