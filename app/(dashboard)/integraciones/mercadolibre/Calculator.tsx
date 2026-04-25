'use client';
import { useState } from 'react';
import { Calculator as CalcIcon, Percent } from 'lucide-react';

export default function MeliCalculator() {
  const [cost, setCost] = useState<number>(0);
  const [targetMargin, setTargetMargin] = useState<number>(20); // 20% utilildad esperada
  const [shippingCost, setShippingCost] = useState<number>(115); // Envío estándar de MELI
  const [listingType, setListingType] = useState<number>(0.15); // Clásica ~15%, Premium ~19%
  const [hasTaxRetention, setHasTaxRetention] = useState<boolean>(true); // Retención SAT en plataformas (8% ISR + 8% IVA)
  const [suggestedPrice, setSuggestedPrice] = useState<number>(0);

  const calculateVariables = (price: number) => {
    const commission = price * listingType;
    let retentions = 0;
    
    // Si retienen, usualmente es sobre el precio SIN IVA o sobre el total, 
    // mercadolibre retiene (aprox) 8% de ISR + 8% de IVA = 16% sobre venta
    if (hasTaxRetention) {
       retentions = price * 0.16;
    }
    
    const ivaSale = price * 0.16; // Opcional, pero para tu contabilidad sabes que del precio hay 16% de IVA

    const netIncome = price - (commission + shippingCost + retentions);
    const profit = netIncome - cost; // Ganancia de bolsillo
    const profitMargin = price > 0 ? (profit / price) * 100 : 0;

    return { commission, retentions, ivaSale, netIncome, profit, profitMargin };
  };

  const handleCostChange = (c: number) => {
     setCost(c);
     autoCalculatePrice(c, targetMargin, shippingCost, listingType, hasTaxRetention);
  };

  const handleMarginChange = (m: number) => {
     setTargetMargin(m);
     autoCalculatePrice(cost, m, shippingCost, listingType, hasTaxRetention);
  };

  const autoCalculatePrice = (c: number, targetM: number, ship: number, lType: number, ret: boolean) => {
      // Formula to find Price where Profit/Price = TargetM/100
      // Profit = NetIncome - Cost = Price - (Price*lType + ship + Price*ret) - c
      // Profit = Price*(1 - lType - ret) - ship - c
      // TargetM/100 = Profit / Price
      // Price*(TargetM/100) = Price*(1 - lType - ret) - ship - c
      // Price*(1 - lType - ret - TargetM/100) = ship + c
      // Price = (ship + c) / (1 - lType - (ret ? 0.16 : 0) - TargetM/100)
      
      const retentionRate = ret ? 0.16 : 0;
      let denominator = 1 - lType - retentionRate - (targetM / 100);
      
      if (denominator <= 0) {
         // Margen imposible dada la comisión + retención
         setSuggestedPrice(0);
         return;
      }

      const p = (ship + c) / denominator;
      setSuggestedPrice(p);
  };

  const sim = calculateVariables(suggestedPrice);

  return (
    <div className="card" style={{ padding: '2rem', marginTop: '2rem', border: '2px solid var(--pulpos-primary)', backgroundColor: '#f0fdf4' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--pulpos-primary)' }}>
         <CalcIcon size={24} />
         <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Simulador de Utilidad: Mercado Libre</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '2rem' }}>
        
        {/* Left Side: Inputs */}
        <div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <div>
               <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Costo del Producto ($)</label>
               <input 
                 type="number" 
                 value={cost} 
                 onChange={e => handleCostChange(parseFloat(e.target.value) || 0)} 
                 style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} 
               />
             </div>
             
             <div>
               <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Margen de Ganancia Libre Vida (% deseado)</label>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="number" 
                    value={targetMargin} 
                    onChange={e => handleMarginChange(parseFloat(e.target.value) || 0)} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} 
                  />
                  <Percent size={20} color="#64748b" />
               </div>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
               <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Tipo de Publicación</label>
                  <select 
                    value={listingType} 
                    onChange={e => {
                       const v = parseFloat(e.target.value);
                       setListingType(v);
                       autoCalculatePrice(cost, targetMargin, shippingCost, v, hasTaxRetention);
                    }}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}
                  >
                    <option value={0.15}>Clásica (~15%)</option>
                    <option value={0.19}>Premium (~19%)</option>
                  </select>
               </div>
               <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Costo Fijo Envío ($)</label>
                  <input 
                    type="number" 
                    value={shippingCost} 
                    onChange={e => {
                       const v = parseFloat(e.target.value) || 0;
                       setShippingCost(v);
                       autoCalculatePrice(cost, targetMargin, v, listingType, hasTaxRetention);
                    }} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} 
                  />
               </div>
             </div>

             <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                   <input 
                     type="checkbox" 
                     checked={hasTaxRetention} 
                     onChange={e => {
                        setHasTaxRetention(e.target.checked);
                        autoCalculatePrice(cost, targetMargin, shippingCost, listingType, e.target.checked);
                     }}
                     style={{ width: '18px', height: '18px' }}
                   />
                   <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>Aplicar Retenciones del SAT (16%)</span>
                </label>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '26px' }}>Si vendes con RFC genérico o no estás inscrito adecuadamente.</div>
             </div>
           </div>
        </div>

        {/* Right Side: Results */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #dcfce7', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
           <h3 style={{ fontWeight: 'bold', fontSize: '1rem', color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>Precio de Venta Recomendado</h3>
           
           <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#16a34a' }}>
                 ${suggestedPrice > 0 ? suggestedPrice.toFixed(2) : '---'}
              </div>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #cbd5e1' }}>
                 <span style={{ color: '#64748b' }}>Comisión Mercado Libre:</span>
                 <span style={{ color: '#ef4444' }}>-${sim.commission.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #cbd5e1' }}>
                 <span style={{ color: '#64748b' }}>Costo de Envío:</span>
                 <span style={{ color: '#ef4444' }}>-${shippingCost.toFixed(2)}</span>
              </div>
              {hasTaxRetention && (
                 <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #cbd5e1' }}>
                    <span style={{ color: '#64748b' }}>Retención Impuestos (Aprox):</span>
                    <span style={{ color: '#ef4444' }}>-${sim.retentions.toFixed(2)}</span>
                 </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #cbd5e1', paddingTop: '0.5rem' }}>
                 <span style={{ color: '#64748b' }}>Tu Costo Inversión:</span>
                 <span style={{ color: '#ef4444' }}>-${cost.toFixed(2)}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', fontWeight: 'bold', fontSize: '1.25rem' }}>
                 <span>Utilidad Neta (Al Bolsillo):</span>
                 <span style={{ color: '#16a34a' }}>${suggestedPrice > 0 ? sim.profit.toFixed(2) : '0.00'}</span>
              </div>
              <div style={{ textAlign: 'right', color: '#16a34a', fontWeight: 'bold', fontSize: '0.9rem' }}>
                 ({sim.profitMargin.toFixed(1)}% margen real de venta)
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
