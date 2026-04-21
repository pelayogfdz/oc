'use client';

import { useState } from 'react';
import { openSession, closeSession, addMovement } from '@/app/actions/caja';
import { formatCurrency } from '@/lib/utils';
import { Calculator, ArrowDownRight, ArrowUpRight, Ban, CheckCircle } from 'lucide-react';

export default function CajaActualClient({ initialSession, branchName, userName }: { initialSession: any, branchName: string, userName: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States
  const [initialAmount, setInitialAmount] = useState('0');
  
  // Modals state
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'IN'|'OUT'>('IN');
  const [movAmount, setMovAmount] = useState('');
  const [movReason, setMovReason] = useState('');

  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [actualAmount, setActualAmount] = useState('');

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('initialAmount', initialAmount);
      await openSession(fd);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('sessionId', initialSession.id);
      fd.append('type', movementType);
      fd.append('amount', movAmount);
      fd.append('reason', movReason);
      await addMovement(fd);
      setIsMovementModalOpen(false);
      setMovAmount('');
      setMovReason('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('sessionId', initialSession.id);
      fd.append('actualAmount', actualAmount);
      await closeSession(fd);
      setIsCloseModalOpen(false);
      setActualAmount('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // If no session is active, show the Apertura screen
  if (!initialSession) {
    return (
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)', textAlign: 'center' }}>
        <Calculator size={48} color="#d946ef" style={{ margin: '0 auto 1.5rem auto' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>No tienes una Caja Abierta</h2>
        <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '2rem' }}>Apertura tu turno ingresando el fondo de caja fijo (morralla) inicial en efectivo para {branchName}.</p>
        
        {error && <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}
        
        <form onSubmit={handleOpenSession} style={{ maxWidth: '300px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
             <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Efectivo Inicial ($)</label>
             <input 
               type="number" 
               step="0.01"
               required 
               value={initialAmount} 
               onChange={e => setInitialAmount(e.target.value)} 
               style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1.25rem', textAlign: 'center', fontWeight: 'bold' }} 
             />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '1rem', backgroundColor: '#d946ef', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
             {loading ? 'Abriendo Turno...' : 'Abrir Turno'}
          </button>
        </form>
      </div>
    );
  }

  // Calculate live expected cash
  const cashSales = initialSession.sales?.filter((s:any) => s.paymentMethod === 'CASH') || [];
  const mixtoSales = initialSession.sales?.filter((s:any) => s.paymentMethod === 'MIXTO') || [];
  const totalSalesCash = cashSales.reduce((acc: number, sale: any) => acc + sale.total, 0);
  const totalSalesMixtoCash = mixtoSales.reduce((acc: number, sale: any) => acc + (sale.cashAmount || 0), 0);
  
  const totalIn = initialSession.movements?.filter((m:any) => m.type === 'IN').reduce((acc: number, m:any) => acc + m.amount, 0) || 0;
  const totalOut = initialSession.movements?.filter((m:any) => m.type === 'OUT').reduce((acc: number, m:any) => acc + m.amount, 0) || 0;

  const expectedAmount = initialSession.initialAmount + totalSalesCash + totalSalesMixtoCash + totalIn - totalOut;

  return (
    <div>
       {error && <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}

       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
             <h3 style={{ fontSize: '0.9rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>Fondo Inicial</h3>
             <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--pulpos-text)' }}>{formatCurrency(initialSession.initialAmount)}</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
             <h3 style={{ fontSize: '0.9rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>Ventas de Efectivo</h3>
             <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#16a34a' }}>+ {formatCurrency(totalSalesCash + totalSalesMixtoCash)}</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
             <h3 style={{ fontSize: '0.9rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>Ingresos Extra</h3>
             <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0ea5e9' }}>+ {formatCurrency(totalIn)}</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
             <h3 style={{ fontSize: '0.9rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>Retiros/Egresos</h3>
             <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ef4444' }}>- {formatCurrency(totalOut)}</div>
          </div>
       </div>

       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fdf4ff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #f0abfc', marginBottom: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#a21caf', fontWeight: 'bold', marginBottom: '0.5rem' }}>Efectivo TOTAL Esperado en Caja</h3>
            <p style={{ color: '#86198f', fontSize: '0.9rem' }}>Este es el dinero que deberías tener físicamente al cerrar.</p>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#a21caf' }}>
             {formatCurrency(expectedAmount)}
          </div>
       </div>

       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '3rem' }}>
          <button onClick={() => { setMovementType('IN'); setIsMovementModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#f0f9ff', color: '#0369a1', padding: '1rem', border: '1px dashed #7dd3fc', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
             <ArrowUpRight size={20} /> Registrar Entrada de Dinero
          </button>
          <button onClick={() => { setMovementType('OUT'); setIsMovementModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#fef2f2', color: '#b91c1c', padding: '1rem', border: '1px dashed #fca5a5', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
             <ArrowDownRight size={20} /> Registrar Salida / Retiro
          </button>
       </div>

       <div style={{ borderTop: '1px solid var(--pulpos-border)', paddingTop: '2rem', textAlign: 'center' }}>
          <button onClick={() => setIsCloseModalOpen(true)} style={{ backgroundColor: '#ef4444', color: 'white', padding: '1rem 3rem', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.25rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.4)' }}>
             <CheckCircle size={24} /> Realizar Corte de Caja (Turno Ciego)
          </button>
          <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '1rem', fontSize: '0.9rem' }}>Una vez realizado, el turno terminará y se registrarán diferencias.</p>
       </div>

       {/* Movement Modal */}
       {isMovementModalOpen && (
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
               <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: movementType === 'IN' ? '#0369a1' : '#b91c1c' }}>
                  {movementType === 'IN' ? 'Entrada Extra de Efectivo' : 'Retiro / Egreso de Efectivo'}
               </h3>
               <form onSubmit={handleAddMovement}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Monto ($)</label>
                    <input type="number" step="0.01" required value={movAmount} onChange={e => setMovAmount(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }} />
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Motivo / Concepto</label>
                    <input type="text" required value={movReason} onChange={e => setMovReason(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }} placeholder="Ej. Pago Agua, Flete, Recarga..." />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                     <button type="button" onClick={() => setIsMovementModalOpen(false)} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                     <button type="submit" disabled={loading} style={{ flex: 1, padding: '0.75rem', backgroundColor: movementType === 'IN' ? '#0ea5e9' : '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>Guardar</button>
                  </div>
               </form>
            </div>
         </div>
       )}

       {/* Close Session Modal */}
       {isCloseModalOpen && (
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
               <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#a21caf' }}>Declarar Conteo Físico</h3>
               <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                 Para proceder al corte, cuente los billetes y monedas que hay físicamente en la caja e ingrese la cantidad real. Las diferencias serán reportadas a gerencia.
               </p>
               <form onSubmit={handleCloseSession}>
                  <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Efectivo Total Real ($)</label>
                    <input type="number" step="0.01" required value={actualAmount} onChange={e => setActualAmount(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #d946ef', fontSize: '1.5rem', textAlign: 'center', fontWeight: 'bold' }} placeholder="0.00" />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                     <button type="button" onClick={() => setIsCloseModalOpen(false)} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                     <button type="submit" disabled={loading} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#d946ef', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
                        {loading ? 'Procesando Corte...' : 'Hecho, Cerrar Caja'}
                     </button>
                  </div>
               </form>
            </div>
         </div>
       )}

    </div>
  );
}
