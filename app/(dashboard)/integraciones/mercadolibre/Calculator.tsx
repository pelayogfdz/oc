'use client';
import { useState, useEffect } from 'react';
import { Calculator as CalcIcon, Percent, Save, Store } from 'lucide-react';
import { saveMeliPricingConfig } from '@/app/actions/integration';

interface Branch {
  id: string;
  name: string;
}

interface MeliCalculatorProps {
  branches: Branch[];
  initialConfig?: {
    targetMargin?: number;
    shippingCost?: number;
    listingType?: number;
    hasTaxRetention?: boolean;
    satRetentionPct?: number;
    stockBranchIds?: string[];
    mainSaleBranchId?: string;
  };
}

export default function MeliCalculator({ branches, initialConfig }: MeliCalculatorProps) {
  const [cost, setCost] = useState<number>(0);
  const [targetMargin, setTargetMargin] = useState<number>(initialConfig?.targetMargin ?? 20); // 20% utilidad esperada
  const [shippingCost, setShippingCost] = useState<number>(initialConfig?.shippingCost ?? 115); // Envío estándar de MELI
  const [listingType, setListingType] = useState<number>(initialConfig?.listingType ?? 0.15); // Clásica ~15%, Premium ~19%
  // Default to false for tax retention (SAT options eliminated)
  const [hasTaxRetention, setHasTaxRetention] = useState<boolean>(initialConfig?.hasTaxRetention ?? false); 
  const [satRetentionPct, setSatRetentionPct] = useState<number>(initialConfig?.satRetentionPct ?? 0); 
  
  // Lista de sucursales seleccionadas para el inventario publicado. Default to all branches if not configured
  const [stockBranchIds, setStockBranchIds] = useState<string[]>(
    initialConfig?.stockBranchIds && initialConfig.stockBranchIds.length > 0
      ? initialConfig.stockBranchIds
      : branches.map(b => b.id)
  );
  // Sucursal principal donde caen las ventas
  const [mainSaleBranchId, setMainSaleBranchId] = useState<string>(initialConfig?.mainSaleBranchId ?? (branches[0]?.id || ''));

  const [suggestedPrice, setSuggestedPrice] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const calculateVariables = (price: number) => {
    const commission = price * listingType;
    let retentions = 0;
    
    if (hasTaxRetention) {
       retentions = price * (satRetentionPct / 100);
    }
    
    const ivaSale = price * 0.16;

    const netIncome = price - (commission + shippingCost + retentions);
    const profit = netIncome - cost; // Ganancia de bolsillo
    const profitMargin = price > 0 ? (profit / price) * 100 : 0;

    return { commission, retentions, ivaSale, netIncome, profit, profitMargin };
  };

  const autoCalculatePrice = (c: number, targetM: number, ship: number, lType: number, ret: boolean, retPct: number) => {
      const retentionRate = ret ? (retPct / 100) : 0;
      let denominator = 1 - lType - retentionRate - (targetM / 100);
      
      if (denominator <= 0) {
         setSuggestedPrice(0);
         return;
      }

      const p = (ship + c) / denominator;
      setSuggestedPrice(p);
  };

  // Recalcular precio sugerido al cambiar dependencias
  useEffect(() => {
    autoCalculatePrice(cost, targetMargin, shippingCost, listingType, hasTaxRetention, satRetentionPct);
  }, [cost, targetMargin, shippingCost, listingType, hasTaxRetention, satRetentionPct]);

  const handleBranchCheckboxChange = (branchId: string, checked: boolean) => {
    if (checked) {
      setStockBranchIds(prev => [...prev, branchId]);
    } else {
      if (stockBranchIds.length > 1) {
        setStockBranchIds(prev => prev.filter(id => id !== branchId));
      } else {
        alert("Debes seleccionar al menos una sucursal para sincronizar tu inventario.");
      }
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append('targetMargin', String(targetMargin));
      fd.append('shippingCost', String(shippingCost));
      fd.append('listingType', String(listingType));
      fd.append('hasTaxRetention', String(hasTaxRetention));
      fd.append('satRetentionPct', String(satRetentionPct));
      fd.append('stockBranchIds', JSON.stringify(stockBranchIds));
      fd.append('mainSaleBranchId', mainSaleBranchId);

      await saveMeliPricingConfig(fd);
      alert("Configuración avanzada de Mercado Libre guardada con éxito en tu sucursal.");
    } catch (e: any) {
      alert("Error al guardar la configuración: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const sim = calculateVariables(suggestedPrice);

  return (
    <div className="card" style={{ padding: '2rem', marginTop: '2rem', border: '2px solid var(--caanma-primary)', backgroundColor: '#fffbf0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
           <CalcIcon size={24} color="#f59e0b" />
           <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: 'var(--caanma-text)' }}>Configuración de Ventas y Margen: Mercado Libre</h2>
        </div>
        <button 
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="btn-primary" 
          style={{ padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isSaving ? 0.7 : 1, backgroundColor: '#f59e0b', borderColor: '#d97706' }}
        >
          <Save size={16} />
          {isSaving ? 'Guardando...' : 'Guardar Meta de Margen'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Left Side: Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
           
           {/* Sección de Precio y Utilidades */}
           <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--caanma-border)' }}>
             <h3 style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.75rem', color: '#d97706', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.25rem' }}>🎯 Simulador de Utilidad</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div>
                 <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Costo del Producto ($)</label>
                 <input 
                   type="number" 
                   value={cost === 0 ? '' : cost} 
                   placeholder="Ej. 150"
                   onChange={e => setCost(parseFloat(e.target.value) || 0)} 
                   style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #ccc' }} 
                 />
               </div>
               
               <div>
                 <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Margen de Ganancia Libre (% deseado)</label>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      type="number" 
                      value={targetMargin} 
                      onChange={e => setTargetMargin(parseFloat(e.target.value) || 0)} 
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #ccc' }} 
                    />
                    <Percent size={20} color="#64748b" />
                 </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                 <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Tipo de Publicación</label>
                    <select 
                      value={listingType} 
                      onChange={e => setListingType(parseFloat(e.target.value))}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                      <option value={0.15}>Clásica (~15%)</option>
                      <option value={0.19}>Premium (~19%)</option>
                    </select>
                 </div>
                 <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Costo Fijo Envío ($)</label>
                    <input 
                      type="number" 
                      value={shippingCost} 
                      onChange={e => setShippingCost(parseFloat(e.target.value) || 0)} 
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #ccc' }} 
                    />
                 </div>
               </div>
             </div>
           </div>

           {/* Sección de Logística e Inventario */}
           <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--caanma-border)' }}>
             <h3 style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.75rem', color: '#d97706', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.25rem' }}>📦 Logística e Inventario</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               
               {/* Suma de Stock */}
               <div>
                 <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                   Sucursales para Sincronizar Inventario (Suma de Stock):
                 </label>
                 <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#f8fafc' }}>
                   {branches.map(b => (
                     <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                       <input 
                         type="checkbox"
                         checked={stockBranchIds.includes(b.id)}
                         onChange={e => handleBranchCheckboxChange(b.id, e.target.checked)}
                       />
                       <span>{b.name}</span>
                     </label>
                   ))}
                 </div>
                 <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', display: 'block', marginTop: '0.25rem' }}>
                   El total disponible en Mercado Libre será la suma del stock de estas tiendas.
                 </span>
               </div>

               {/* Sucursal Principal destino */}
               <div>
                 <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                   Sucursal Principal para Descargar Ventas:
                 </label>
                 <select 
                   value={mainSaleBranchId}
                   onChange={e => setMainSaleBranchId(e.target.value)}
                   style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white' }}
                 >
                   {branches.map(b => (
                     <option key={b.id} value={b.id}>{b.name}</option>
                   ))}
                 </select>
                 <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', display: 'block', marginTop: '0.25rem' }}>
                   Todas las ventas de Mercado Libre se registrarán bajo el inventario y caja de esta sucursal.
                 </span>
               </div>

             </div>
           </div>

        </div>

        {/* Right Side: Results */}
        <div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '2px dashed #f59e0b', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', position: 'sticky', top: '1rem' }}>
             <h3 style={{ fontWeight: 'bold', fontSize: '1rem', color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>Precio de Venta Sugerido (Mercado Libre)</h3>
             
             <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#d97706' }}>
                   ${suggestedPrice > 0 ? suggestedPrice.toFixed(2) : '---'}
                </div>
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #cbd5e1' }}>
                   <span style={{ color: '#64748b' }}>Comisión Mercado Libre:</span>
                   <span style={{ color: '#ef4444' }}>-${sim.commission.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #cbd5e1' }}>
                   <span style={{ color: '#64748b' }}>Costo de Envío (Flete):</span>
                   <span style={{ color: '#ef4444' }}>-${shippingCost.toFixed(2)}</span>
                </div>
                {hasTaxRetention && (
                   <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #cbd5e1' }}>
                      <span style={{ color: '#64748b' }}>Retención Impuestos SAT ({satRetentionPct}%):</span>
                      <span style={{ color: '#ef4444' }}>-${sim.retentions.toFixed(2)}</span>
                   </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #cbd5e1', paddingTop: '0.5rem' }}>
                   <span style={{ color: '#64748b' }}>Costo Local Inversión:</span>
                   <span style={{ color: '#ef4444' }}>-${cost.toFixed(2)}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', fontWeight: 'bold', fontSize: '1.25rem' }}>
                   <span>Utilidad Neta (Al Bolsillo):</span>
                   <span style={{ color: '#16a34a' }}>${suggestedPrice > 0 ? sim.profit.toFixed(2) : '0.00'}</span>
                </div>
                <div style={{ textAlign: 'right', color: '#16a34a', fontWeight: 'bold', fontSize: '0.9rem' }}>
                   ({sim.profitMargin.toFixed(1)}% margen real de venta)
                </div>

                <div style={{ marginTop: '1.5rem', padding: '0.75rem', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', fontSize: '0.8rem', color: '#b45309', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <Store size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    Al guardar, este precio recomendado se registrará automáticamente en tu lista de precios <strong>"Mercado Libre"</strong> en Caanma para todos tus productos.
                  </div>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
