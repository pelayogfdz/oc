'use client';
import { useState } from 'react';
import { closeSession } from '@/app/actions/caja';
import { useRouter } from 'next/navigation';
import { Calculator, DollarSign, LogOut } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const DENOMINATIONS = [
  { value: 1000, label: 'Billetes de $1,000' },
  { value: 500, label: 'Billetes de $500' },
  { value: 200, label: 'Billetes de $200' },
  { value: 100, label: 'Billetes de $100' },
  { value: 50, label: 'Billetes de $50' },
  { value: 20, label: 'Billetes de $20' },
  { value: 10, label: 'Monedas de $10' },
  { value: 5, label: 'Monedas de $5' },
  { value: 2, label: 'Monedas de $2' },
  { value: 1, label: 'Monedas de $1' },
  { value: 0.5, label: 'Monedas de ¢50' },
];

export default function BlindCutClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'TOTAL' | 'DENOMINATIONS'>('DENOMINATIONS');
  
  // Total string state
  const [declaredTotalInput, setDeclaredTotalInput] = useState('');
  
  // Denominations state
  const [counts, setCounts] = useState<Record<number, number>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCountChange = (value: number, count: string) => {
    const parsed = parseInt(count, 10);
    setCounts(prev => ({ ...prev, [value]: isNaN(parsed) ? 0 : parsed }));
  };

  const calculatedTotal = DENOMINATIONS.reduce((acc, den) => {
    return acc + (den.value * (counts[den.value] || 0));
  }, 0);

  const finalAmount = mode === 'TOTAL' 
     ? parseFloat(declaredTotalInput) || 0 
     : calculatedTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;
    
    const confirmMessage = `Estás a punto de declarar un corte con el total de: ${formatCurrency(finalAmount)}.\n\nAl continuar, la sesión se cerrará y no podrás registrar más movimientos.\n¿Estás de acuerdo?`;
    if (!confirm(confirmMessage)) return;

    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('actualAmount', finalAmount.toString());
      
      await closeSession(formData);
      
      alert('Corte Z realizado exitosamente.');
      router.push('/caja/cortes');
    } catch (err: any) {
      alert("Error cerrando caja: " + err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ padding: '2rem' }}>
       
       {/* Mode Toggle */}
       <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button 
             type="button"
             onClick={() => setMode('DENOMINATIONS')}
             style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', borderRadius: '8px', border: mode === 'DENOMINATIONS' ? '2px solid #8b5cf6' : '1px solid var(--pulpos-border)', backgroundColor: mode === 'DENOMINATIONS' ? '#f5f3ff' : 'white', fontWeight: 'bold', color: mode === 'DENOMINATIONS' ? '#7c3aed' : '#475569', cursor: 'pointer' }}>
             <Calculator size={20} />
             Conteo por Denominación
          </button>
          
          <button 
             type="button"
             onClick={() => setMode('TOTAL')}
             style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', borderRadius: '8px', border: mode === 'TOTAL' ? '2px solid #8b5cf6' : '1px solid var(--pulpos-border)', backgroundColor: mode === 'TOTAL' ? '#f5f3ff' : 'white', fontWeight: 'bold', color: mode === 'TOTAL' ? '#7c3aed' : '#475569', cursor: 'pointer' }}>
             <DollarSign size={20} />
             Ingresar Total Directo
          </button>
       </div>

       <form onSubmit={handleSubmit}>
         
         {mode === 'TOTAL' && (
           <div style={{ marginBottom: '2rem', padding: '2rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed var(--pulpos-border)', textAlign: 'center' }}>
             <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.25rem' }}>Efectivo Total Contado</label>
             <input 
               type="number"
               step="0.01"
               required
               autoFocus
               value={declaredTotalInput}
               onChange={e => setDeclaredTotalInput(e.target.value)}
               placeholder="0.00"
               style={{ width: '50%', padding: '1rem', fontSize: '2rem', textAlign: 'center', borderRadius: '8px', border: '2px solid var(--pulpos-border)' }}
             />
           </div>
         )}

         {mode === 'DENOMINATIONS' && (
           <div style={{ marginBottom: '2rem' }}>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
               {/* Column 1: Bills */}
               <div>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #f1f5f9' }}>Billetes</h3>
                  {DENOMINATIONS.filter(d => d.value >= 20).map(d => (
                    <div key={d.value} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ color: 'var(--pulpos-text-muted)' }}>{d.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                          type="number" 
                          min="0"
                          value={counts[d.value] || ''}
                          onChange={e => handleCountChange(d.value, e.target.value)}
                          placeholder="0"
                          style={{ width: '80px', padding: '0.5rem', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
                        />
                        <span style={{ width: '100px', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                           {formatCurrency((counts[d.value] || 0) * d.value)}
                        </span>
                      </div>
                    </div>
                  ))}
               </div>
               
               {/* Column 2: Coins */}
               <div>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #f1f5f9' }}>Monedas</h3>
                  {DENOMINATIONS.filter(d => d.value < 20).map(d => (
                    <div key={d.value} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ color: 'var(--pulpos-text-muted)' }}>{d.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                          type="number" 
                          min="0"
                          value={counts[d.value] || ''}
                          onChange={e => handleCountChange(d.value, e.target.value)}
                          placeholder="0"
                          style={{ width: '80px', padding: '0.5rem', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
                        />
                        <span style={{ width: '100px', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                           {formatCurrency((counts[d.value] || 0) * d.value)}
                        </span>
                      </div>
                    </div>
                  ))}
               </div>
             </div>
             
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px dashed var(--pulpos-border)' }}>
               <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Total Efectivo Contado:</span>
               <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0f172a' }}>{formatCurrency(calculatedTotal)}</span>
             </div>
           </div>
         )}

         <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
           <button 
             type="button"
             onClick={() => router.push('/caja/actual')}
             style={{ padding: '1rem 2rem', backgroundColor: 'white', color: '#475569', border: '1px solid var(--pulpos-border)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
           >
             Cancelar
           </button>
           <button 
             type="submit"
             disabled={isSubmitting || finalAmount <= 0}
             style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: (isSubmitting || finalAmount <= 0) ? 'not-allowed' : 'pointer', opacity: (isSubmitting || finalAmount <= 0) ? 0.5 : 1 }}
           >
             <LogOut size={20} />
             {isSubmitting ? 'Registrando Cierre...' : 'Finalizar y Cerrar Caja'}
           </button>
         </div>

       </form>
    </div>
  );
}
