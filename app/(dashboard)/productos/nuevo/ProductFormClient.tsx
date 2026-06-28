'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Image as ImageIcon, Plus, Trash2, Camera, X } from 'lucide-react';
import { createProduct } from "@/app/actions/product";
import { useFormState } from 'react-dom';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';
import ProductFinanceSection from '../ProductFinanceSection';
import ProductImageSection from '../ProductImageSection';
import SatKeyAutocomplete from "@/app/components/SatKeyAutocomplete";
import SatUnitAutocomplete from "@/app/components/SatUnitAutocomplete";


const initialState = {
  error: '',
  success: false
};

export default function ProductFormClient({ cloneProduct, suppliers, priceLists, branchId, tenantId, categories = [] }: any) {
  const { isOnline, pushOfflineProduct } = useOfflineSync();
  const [state, formAction] = useFormState(createProduct, initialState);
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<{ attribute: string, stock: number, sku: string }[]>([]);
  const [hasBatches, setHasBatches] = useState(false);
  const [batches, setBatches] = useState<{ batchNumber: string, expirationDate: string, stock: number }[]>([]);
  const [isService, setIsService] = useState(cloneProduct?.isService || false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryValue, setCategoryValue] = useState(cloneProduct?.category || '');

  const isTargetTenant = tenantId === '8b52cbcd-c956-4717-a1bd-02e57386aaa2' || tenantId === 'db5d3949-f8dd-41f6-9627-90374d55d044';
  const initialShowInWeb = cloneProduct 
    ? (cloneProduct.showInWeb !== undefined ? cloneProduct.showInWeb : true)
    : (isService && isTargetTenant ? false : true);
  const [showInWeb, setShowInWeb] = useState(initialShowInWeb);
  


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

  const handleAddBatch = () => {
    setBatches([...batches, { batchNumber: '', expirationDate: '', stock: 0 }]);
  };

  const handleRemoveBatch = (index: number) => {
    setBatches(batches.filter((_, i) => i !== index));
  };

  const handleBatchChange = (index: number, field: string, value: string | number) => {
    const newBatches = [...batches];
    (newBatches[index] as any)[field] = value;
    setBatches(newBatches);
  };

  return (
    <form action={formAction} onSubmit={(e) => {
      if (!isOnline) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const productParams: any = {};
        formData.forEach((value, key) => {
          productParams[key] = value;
        });
        
        // Push to offline queue
        pushOfflineProduct(productParams);
        
        // Programmatic Navigation to List
        window.location.href = '/productos';
      }
    }}>
      <input type="hidden" name="branchId" value={branchId} />
      <input type="hidden" name="variantsJson" value={JSON.stringify(variants)} />
      <input type="hidden" name="hasVariants" value={hasVariants ? "1" : "0"} />
      <input type="hidden" name="batchesJson" value={JSON.stringify(batches)} />
      <input type="hidden" name="hasBatches" value={hasBatches ? "1" : "0"} />
      
      {/* Imagen */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>Multimedia del Producto</h2>
        <ProductImageSection 
          initialImageUrl={cloneProduct?.imageUrl || ''}
          initialYoutubeUrl={cloneProduct?.youtubeUrl || ''}
          showYoutubeEmbed={false}
          stateError={state?.error}
        />
      </div>

      {/* Identificación */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>Identificación</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nombre del Producto *</label>
            <input type="text" name="name" defaultValue={cloneProduct ? `${cloneProduct.name} (Copia)` : ''} required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Categoría / Departamento</label>
            <input type="hidden" name="category" value={categoryValue} />
            {!isCreatingCategory ? (
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <select 
                  value={categoryValue} 
                  onChange={e => setCategoryValue(e.target.value)}
                  style={{ flexGrow: 1, padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: 'white' }}
                >
                  <option value="">-- Seleccionar Categoría --</option>
                  {categories.map((cat: string) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button 
                  type="button" 
                  onClick={() => setIsCreatingCategory(true)}
                  style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--caanma-primary, #4f46e5)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Crear Nueva Categoría"
                >
                  <Plus size={18} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <input 
                  type="text" 
                  value={categoryValue} 
                  onChange={e => setCategoryValue(e.target.value)}
                  placeholder="Escribe la nueva categoría..." 
                  autoFocus
                  style={{ flexGrow: 1, padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} 
                />
                <button 
                  type="button" 
                  onClick={() => {
                    setIsCreatingCategory(false);
                  }}
                  style={{ padding: '0.75rem 1rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Cancelar / Seleccionar de la lista"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Marca</label>
            <input type="text" name="brand" defaultValue={cloneProduct?.brand || ''} placeholder="Ej. Coca Cola, BIC..." style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>SKU Base (Código Interno) *</label>
            <input type="text" name="sku" defaultValue="" required placeholder="Nuevo SKU" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Código de Barras</label>
            <input type="text" name="barcode" defaultValue="" placeholder="(Opcional)" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '0.5rem', marginBottom: '0.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid var(--caanma-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="hidden" name="allowProduction" value="false" />
              <input 
                type="checkbox" 
                id="allowProduction"
                name="allowProduction" 
                value="true"
                defaultChecked={cloneProduct?.allowProduction || false} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
              />
              <label htmlFor="allowProduction" style={{ fontWeight: '500', cursor: 'pointer', fontSize: '0.95rem' }}>
                🟢 Permitir Producir (Se puede fabricar con una fórmula)
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="hidden" name="isProductionInput" value="false" />
              <input 
                type="checkbox" 
                id="isProductionInput"
                name="isProductionInput" 
                value="true"
                defaultChecked={cloneProduct?.isProductionInput || false} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
              />
              <label htmlFor="isProductionInput" style={{ fontWeight: '500', cursor: 'pointer', fontSize: '0.95rem' }}>
                🧪 Insumo para Producción (Se puede usar como ingrediente)
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="hidden" name="isService" value="false" />
              <input 
                type="checkbox" 
                id="isService"
                name="isService" 
                value="true"
                checked={isService} 
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsService(checked);
                  if (isTargetTenant) {
                    setShowInWeb(!checked);
                  }
                }}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
              />
              <label htmlFor="isService" style={{ fontWeight: '500', cursor: 'pointer', fontSize: '0.95rem' }}>
                🛠️ Es un Servicio (No lleva stock y siempre disponible)
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="hidden" name="showInWeb" value="false" />
              <input 
                type="checkbox" 
                id="showInWeb"
                name="showInWeb" 
                value="true"
                checked={showInWeb} 
                onChange={(e) => setShowInWeb(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
              />
              <label htmlFor="showInWeb" style={{ fontWeight: '500', cursor: 'pointer', fontSize: '0.95rem' }}>
                🌐 Mostrar en Web (Sincronizar vía Token)
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="hidden" name="hasTraceability" value="false" />
              <input 
                type="checkbox" 
                id="hasTraceability"
                name="hasTraceability" 
                value="true"
                defaultChecked={cloneProduct?.hasTraceability || false} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
              />
              <label htmlFor="hasTraceability" style={{ fontWeight: '500', cursor: 'pointer', fontSize: '0.95rem' }}>
                ⛽ Trazabilidad de Combustible
              </label>
            </div>
          </div>
           <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '4px', border: '1px dashed #22c55e', gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#166534' }}>Clave de Producto SAT (Product Key)</label>
              <SatKeyAutocomplete defaultValue={cloneProduct?.satKey || ''} name="satKey" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#166534' }}>Clave de Unidad SAT (Unit Key)</label>
              <SatUnitAutocomplete defaultValue={cloneProduct?.satUnit || ''} name="satUnit" />
            </div>
            <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: '0.85rem', color: '#166534' }}>* Estos campos son requeridos para facturar ventas de este artículo.</p>
          </div>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Descripción</label>
          <textarea name="description" defaultValue={cloneProduct?.description || ''} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', fontFamily: 'inherit' }}></textarea>
        </div>
      </div>

      {/* Finanzas y Precios */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>Finanzas y Precios</h2>
        <ProductFinanceSection 
          initialCost={parseFloat(cloneProduct?.cost || "0")}
          initialPrice={parseFloat(cloneProduct?.price || "0")}
          initialTaxRate={parseFloat(cloneProduct?.taxRate || "16.0")}
          initialWholesalePrice={cloneProduct?.wholesalePrice}
          initialSpecialPrice={cloneProduct?.specialPrice}
          priceLists={priceLists}
          initialPrices={cloneProduct?.prices}
        />
      </div>

      {/* Variantes Selector */}
      {!isService && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Variantes Dinámicas</h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={hasVariants} onChange={(e) => { setHasVariants(e.target.checked); if(e.target.checked && variants.length === 0) handleAddVariant(); }} style={{ width: '20px', height: '20px' }} />
              <span style={{ fontWeight: '500' }}>El producto tiene colores, tallas, etc.</span>
            </label>
          </div>

          {hasVariants && (
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <table className="responsive-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '1rem' }}>
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
                        <input type="text" value={v.attribute} onChange={e => handleVariantChange(index, 'attribute', e.target.value)} required placeholder="Rojo XL" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input type="text" value={v.sku} onChange={e => handleVariantChange(index, 'sku', e.target.value)} required placeholder="SKU-ROJO-XL" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input type="number" value={v.stock} onChange={e => handleVariantChange(index, 'stock', Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
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
      )}

      {/* Lotes Selector */}
      {!isService && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Gestión de Lotes (Opcional)</h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={hasBatches} onChange={(e) => { setHasBatches(e.target.checked); if(e.target.checked && batches.length === 0) handleAddBatch(); }} style={{ width: '20px', height: '20px' }} />
              <span style={{ fontWeight: '500' }}>El producto usa lotes y caducidad</span>
            </label>
          </div>

          {hasBatches && (
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <table className="responsive-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.5rem', borderBottom: '1px solid #cbd5e1' }}>Número de Lote</th>
                    <th style={{ padding: '0.5rem', borderBottom: '1px solid #cbd5e1' }}>Fecha de Caducidad</th>
                    <th style={{ padding: '0.5rem', borderBottom: '1px solid #cbd5e1' }}>Stock Inicial del Lote</th>
                    <th style={{ padding: '0.5rem', borderBottom: '1px solid #cbd5e1', width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b, index) => (
                    <tr key={index}>
                      <td style={{ padding: '0.5rem' }}>
                        <input type="text" value={b.batchNumber} onChange={e => handleBatchChange(index, 'batchNumber', e.target.value)} placeholder="Ej. LOTE-001" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input type="date" value={b.expirationDate} onChange={e => handleBatchChange(index, 'expirationDate', e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input type="number" value={b.stock} onChange={e => handleBatchChange(index, 'stock', Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <button type="button" onClick={() => handleRemoveBatch(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={20}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={handleAddBatch} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'white', border: '1px dashed #94a3b8', borderRadius: '4px', fontWeight: '500', cursor: 'pointer', color: '#475569' }}>
                 <Plus size={16} /> Añadir Lote
              </button>
            </div>
          )}
        </div>
      )}

      {/* Inventario Físico / Configuración de Servicio */}
      {isService ? (
        <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>Configuración del Servicio</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
            <input type="hidden" name="stock" value="0" />
            <input type="hidden" name="minStock" value="0" />
            <input type="hidden" name="expirationDate" value="" />
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Unidad de Medida</label>
              <select name="unit" defaultValue={cloneProduct?.unit || "Servicio"} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: 'white' }}>
                <option value="Servicio">Servicio</option>
                <option value="Pza">Pieza (Pza)</option>
                <option value="Horas">Horas</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Proveedor Sugerido</label>
              <select name="supplierId" defaultValue={cloneProduct?.supplierId || ""} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: 'white' }}>
                <option value="">-- PÚBLICO / NINGUNO --</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Estado</label>
              <select name="isActive" defaultValue={cloneProduct ? (cloneProduct.isActive ? "true" : "false") : "true"} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: 'white' }}>
                <option value="true">🟢 Activo</option>
                <option value="false">🔴 Inactivo</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        (!hasVariants && !hasBatches) && (
          <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>Inventario Físico Global</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Stock Inicial</label>
                <input type="number" name="stock" defaultValue={cloneProduct?.stock || "0"} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Stock Mínimo</label>
                <input type="number" name="minStock" defaultValue={cloneProduct?.minStock || "0"} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Unidad de Medida</label>
                <select name="unit" defaultValue={cloneProduct?.unit || "Pza"} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: 'white' }}>
                  <option value="Pza">Pieza (Pza)</option>
                  <option value="Kg">Kilogramos (Kg)</option>
                  <option value="Lt">Litros (Lt)</option>
                  <option value="Caja">Caja</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Proveedor Sugerido</label>
                <select name="supplierId" defaultValue={cloneProduct?.supplierId || ""} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: 'white' }}>
                  <option value="">-- PÚBLICO / NINGUNO --</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Estado</label>
                <select name="isActive" defaultValue={cloneProduct ? (cloneProduct.isActive ? "true" : "false") : "true"} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: 'white' }}>
                  <option value="true">🟢 Activo</option>
                  <option value="false">🔴 Inactivo</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Fecha de Caducidad</label>
                <input type="date" name="expirationDate" defaultValue={cloneProduct?.expirationDate ? new Date(cloneProduct.expirationDate).toISOString().slice(0, 10) : ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
              </div>
            </div>
          </div>
        )
      )}

      {hasVariants && !isService && (
        <input type="hidden" name="minStock" value={cloneProduct?.minStock || "0"} />
      )}
      {hasVariants && !isService && (
        <input type="hidden" name="unit" value={cloneProduct?.unit || "Pza"} />
      )}
      {hasVariants && !isService && (
        <input type="hidden" name="supplierId" value={cloneProduct?.supplierId || ""} />
      )}
      {hasVariants && !isService && (
        <input type="hidden" name="isActive" value="true" />
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <Link href="/productos" style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--caanma-border)', borderRadius: '4px', textDecoration: 'none', color: 'var(--caanma-text)', fontWeight: 'bold' }}>
          Cancelar
        </Link>
        <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2.5rem', fontSize: '1.1rem' }}>
          Guardar Producto
        </button>
      </div>
    </form>
  );
}
