'use client';
import { useState } from 'react';
import { Calculator as CalcIcon, Percent } from 'lucide-react';

export default function AmazonCalculator() {
  const [cost, setCost] = useState<number>(0);
  const [targetMargin, setTargetMargin] = useState<number>(20); 
  const [logisticCost, setLogisticCost] = useState<number>(85); // FBA Pick and Pack u Logística FBM
  const [commissionRate, setCommissionRate] = useState<number>(0.15); // Amazon Referral fee avg 15%
  const [hasTaxRetention, setHasTaxRetention] = useState<boolean>(true);
  const [suggestedPrice, setSuggestedPrice] = useState<number>(0);

  const calculateVariables = (price: number) => {
    const commission = price * commissionRate;
    const retentions = hasTaxRetention ? price * 0.16 : 0;
    const netIncome = price - (commission + logisticCost + retentions);
    const profit = netIncome - cost; 
    const profitMargin = price > 0 ? (profit / price) * 100 : 0;

    return { commission, retentions, netIncome, profit, profitMargin };
  };

  const autoCalculatePrice = (c: number, targetM: number, logCost: number, commRate: number, ret: boolean) => {
      const retentionRate = ret ? 0.16 : 0;
      let denominator = 1 - commRate - retentionRate - (targetM / 100);
      if (denominator <= 0) {
         setSuggestedPrice(0);
         return;
      }
      setSuggestedPrice((logCost + c) / denominator);
  };

  const handleUpdate = (type: string, val: number | boolean) => {
      let c = cost, m = targetMargin, l = logisticCost, cr = commissionRate, r = hasTaxRetention;
      if (type === 'cost') { c = val as number; setCost(c); }
      if (type === 'margin') { m = val as number; setTargetMargin(m); }
      if (type === 'logistic') { l = val as number; setLogisticCost(l); }
      if (type === 'commission') { cr = val as number; setCommissionRate(cr); }
      if (type === 'retention') { r = val as boolean; setHasTaxRetention(r); }
      autoCalculatePrice(c, m, l, cr, r);
  };

  const sim = calculateVariables(suggestedPrice);

  return (
    <div className="card" style={{ padding: '2rem', border: '2px solid #eab308', backgroundColor: '#fefce8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#ca8a04' }}>
         <CalcIcon size={24} />
         <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Simulador de Utilidad: Amazon FBA/FBM</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '2rem' }}>
        <div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <div>
               <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Costo del Producto ($)</label>
               <input type="number" value={cost} onChange={e => handleUpdate('cost', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
             </div>
             <div>
               <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Margen de Vida Deseado (%)</label>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="number" value={targetMargin} onChange={e => handleUpdate('margin', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                  <Percent size={20} color="#64748b" />
               </div>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
               <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Comisión por Categoría (%)</label>
                  <input type="number" step="0.01" value={commissionRate * 100} onChange={e => handleUpdate('commission', (parseFloat(e.target.value) || 0) / 100)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
               </div>
               <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Costo FBA / Logístico ($)</label>
                  <input type="number" value={logisticCost} onChange={e => handleUpdate('logistic', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
               </div>
             </div>
             <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                   <input type="checkbox" checked={hasTaxRetention} onChange={e => handleUpdate('retention', e.target.checked)} style={{ width: '18px', height: '18px' }} />
                   <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>Retenciones SAT (Aprox 16%)</span>
                </label>
             </div>
           </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #fef08a', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
           <h3 style={{ fontWeight: 'bold', fontSize: '1rem', color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>Precio de Venta Sugerido</h3>
           <div style={{ textAlign: 'center', marginBottom: '2rem' }}><div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#ca8a04' }}>${suggestedPrice > 0 ? suggestedPrice.toFixed(2) : '---'}</div></div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #cbd5e1' }}><span style={{ color: '#64748b' }}>Referral Fee:</span><span style={{ color: '#ef4444' }}>-${sim.commission.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #cbd5e1' }}><span style={{ color: '#64748b' }}>FBA Logística:</span><span style={{ color: '#ef4444' }}>-${logisticCost.toFixed(2)}</span></div>
              {hasTaxRetention && <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #cbd5e1' }}><span style={{ color: '#64748b' }}>Retención SAT:</span><span style={{ color: '#ef4444' }}>-${sim.retentions.toFixed(2)}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px dashed #cbd5e1', paddingTop: '0.5rem' }}><span style={{ color: '#64748b' }}>Costo Inversión:</span><span style={{ color: '#ef4444' }}>-${cost.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', fontWeight: 'bold', fontSize: '1.25rem' }}><span>Utilidad Neta:</span><span style={{ color: '#ca8a04' }}>${suggestedPrice > 0 ? sim.profit.toFixed(2) : '0.00'}</span></div>
           </div>
        </div>
      </div>
    </div>
  );
}
