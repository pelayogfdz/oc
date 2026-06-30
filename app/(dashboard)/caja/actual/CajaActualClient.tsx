'use client';

import { useState } from 'react';
import { openSession, closeSession, addMovement } from '@/app/actions/caja';
import { formatCurrency } from '@/lib/utils';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';
import { 
  Calculator, 
  ArrowDownRight, 
  ArrowUpRight, 
  Ban, 
  CheckCircle,
  Banknote, 
  CreditCard, 
  Send, 
  ShieldAlert, 
  QrCode, 
  Receipt 
} from 'lucide-react';

const denominations = [
  { value: 1000, label: 'Billete $1000', isBill: true },
  { value: 500, label: 'Billete $500', isBill: true },
  { value: 200, label: 'Billete $200', isBill: true },
  { value: 100, label: 'Billete $100', isBill: true },
  { value: 50, label: 'Billete $50', isBill: true },
  { value: 20, label: 'Billete/Moneda $20', isBill: true },
  { value: 10, label: 'Moneda $10', isBill: false },
  { value: 5, label: 'Moneda $5', isBill: false },
  { value: 2, label: 'Moneda $2', isBill: false },
  { value: 1, label: 'Moneda $1', isBill: false },
  { value: 0.5, label: 'Moneda $0.50', isBill: false },
];

export default function CajaActualClient({ 
  initialSession, 
  branchName, 
  userName,
  metodosConfig
}: { 
  initialSession: any; 
  branchName: string; 
  userName: string;
  metodosConfig: any;
}) {
  const { isOnline } = useOfflineSync();
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
  
  // Detailed closure states
  const [manualCounts, setManualCounts] = useState<Record<string, string>>({});
  const [denomQuantities, setDenomQuantities] = useState<Record<number, string>>({});
  const [showCalculations, setShowCalculations] = useState(false);
  const [notesText, setNotesText] = useState('');

  const handleDenomChange = (val: number, qtyStr: string) => {
    const newQty = qtyStr.replace(/[^0-9]/g, '');
    const updatedQts = {
      ...denomQuantities,
      [val]: newQty
    };
    setDenomQuantities(updatedQts);

    // Sum all denominations
    let sum = 0;
    denominations.forEach(d => {
      const q = parseInt(updatedQts[d.value] || '0') || 0;
      sum += q * d.value;
    });

    // Automatically update the manualCounts['CASH']
    setManualCounts(prev => ({
      ...prev,
      CASH: sum > 0 ? sum.toFixed(2) : ''
    }));
  };

  // -------------------------------------------------------------
  // Mappings for standard IDs to clean Spanish display names
  // -------------------------------------------------------------
  const standardNames: Record<string, string> = {
    CASH: 'Efectivo',
    CARD: 'Tarjeta de Crédito / Débito',
    TRANSFER: 'Transferencia',
    CREDIT: 'Crédito Cta.',
    VALES: 'Vales de despensa'
  };

  // Base methods configured or enabled
  let configMethods: { id: string; name: string }[] = [];
  if (Array.isArray(metodosConfig?.methods) && metodosConfig.methods.length > 0) {
    configMethods = metodosConfig.methods.map((m: any) => ({ id: m.id, name: m.name }));
  } else if (Array.isArray(metodosConfig?.enabledIds) && metodosConfig.enabledIds.length > 0) {
    configMethods = metodosConfig.enabledIds.map((id: string) => ({
      id,
      name: standardNames[id] || id
    }));
  } else {
    // Default fallback
    configMethods = [
      { id: 'CASH', name: 'Efectivo' },
      { id: 'CARD', name: 'Tarjeta de Crédito / Débito' },
      { id: 'TRANSFER', name: 'Transferencia' }
    ];
  }

  // Active sales (ignore cancelled ones)
  const sales = initialSession?.sales || [];
  const activeSales = sales.filter((s: any) => s.status !== 'CANCELLED');

  // Identify all payment methods used in these active sales
  const usedMethodIds = new Set<string>();
  activeSales.forEach((s: any) => {
    if (s.paymentMethod) {
      if (s.paymentMethod === 'MIXTO') {
        usedMethodIds.add('CASH');
        usedMethodIds.add('CARD');
      } else {
        usedMethodIds.add(s.paymentMethod);
      }
    }
  });

  // Create the final unique list of methods
  const finalMethods: { id: string; name: string }[] = [...configMethods];
  usedMethodIds.forEach((id: string) => {
    if (!finalMethods.some(m => m.id === id)) {
      finalMethods.push({
        id,
        name: standardNames[id] || id
      });
    }
  });

  const getMethodIcon = (id: string) => {
    switch (id) {
      case 'CASH':
        return <Banknote size={20} color="#16a34a" />;
      case 'CARD':
        return <CreditCard size={20} color="#0284c7" />;
      case 'TRANSFER':
        return <Send size={20} color="#8b5cf6" />;
      case 'CREDIT':
        return <ShieldAlert size={20} color="#d946ef" />;
      case 'VALES':
        return <QrCode size={20} color="#f59e0b" />;
      default:
        return <Receipt size={20} color="#64748b" />;
    }
  };

  const getExpectedForMethod = (id: string) => {
    if (id === 'CASH') {
      const cashSales = activeSales.filter((s: any) => s.paymentMethod === 'CASH');
      const mixtoSales = activeSales.filter((s: any) => s.paymentMethod === 'MIXTO');
      const totalSalesCash = cashSales.reduce((acc: number, sale: any) => acc + sale.total, 0);
      const totalSalesMixtoCash = mixtoSales.reduce((acc: number, sale: any) => acc + (sale.cashAmount || 0), 0);
      const totalIn = initialSession?.movements?.filter((m: any) => m.type === 'IN').reduce((acc: number, m: any) => acc + m.amount, 0) || 0;
      const totalOut = initialSession?.movements?.filter((m: any) => m.type === 'OUT').reduce((acc: number, m: any) => acc + m.amount, 0) || 0;
      return (initialSession?.initialAmount || 0) + totalSalesCash + totalSalesMixtoCash + totalIn - totalOut;
    } else if (id === 'CARD') {
      const cardSales = activeSales.filter((s: any) => s.paymentMethod === 'CARD');
      const mixtoSales = activeSales.filter((s: any) => s.paymentMethod === 'MIXTO');
      const totalSalesCard = cardSales.reduce((acc: number, sale: any) => acc + sale.total, 0);
      const totalSalesMixtoCard = mixtoSales.reduce((acc: number, sale: any) => acc + (sale.cardAmount || 0), 0);
      return totalSalesCard + totalSalesMixtoCard;
    } else {
      const matchingSales = activeSales.filter((s: any) => s.paymentMethod === id);
      return matchingSales.reduce((acc: number, sale: any) => acc + sale.total, 0);
    }
  };

  const renderDiffBadge = (diff: number) => {
    if (diff < -0.01) {
      return (
        <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-block' }}>
          {formatCurrency(Math.abs(diff))} faltantes
        </span>
      );
    } else if (diff > 0.01) {
      return (
        <span style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-block' }}>
          {formatCurrency(diff)} sobrantes
        </span>
      );
    } else {
      return (
        <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>
          $0.00
        </span>
      );
    }
  };

  const handleCountChange = (id: string, val: string) => {
    setManualCounts(prev => ({
      ...prev,
      [id]: val
    }));
  };

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
      // Calculate totals
      const totalManual = finalMethods.reduce((sum, m) => sum + parseFloat(manualCounts[m.id] || '0'), 0);
      
      const details = finalMethods.map(m => {
        const expected = getExpectedForMethod(m.id);
        const actual = parseFloat(manualCounts[m.id] || '0');
        const difference = actual - expected;
        return {
          id: m.id,
          name: m.name,
          expected,
          actual,
          difference
        };
      });

      const fd = new FormData();
      fd.append('sessionId', initialSession.id);
      fd.append('actualAmount', totalManual.toFixed(2));
      fd.append('notes', notesText.trim());
      fd.append('detailsJson', JSON.stringify(details));

      const res = await closeSession(fd) as any;
      if (res && res.success) {
        setIsCloseModalOpen(false);
        setManualCounts({});
        setDenomQuantities({});
        setShowCalculations(false);
        setNotesText('');
        
        // Open the print view in a new window/tab
        window.open(`/imprimir-corte/${res.id}`, '_blank');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // If no session is active, show the Apertura screen
  if (!initialSession) {
    return (
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', textAlign: 'center' }}>
        <Calculator size={48} color="#d946ef" style={{ margin: '0 auto 1.5rem auto' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>No tienes una Caja Abierta</h2>
        <p style={{ color: 'var(--caanma-text-muted)', marginBottom: '2rem' }}>Apertura tu turno ingresando el fondo de caja fijo (morralla) inicial en efectivo para {branchName}.</p>
        
        {!isOnline && (
          <div style={{ backgroundColor: '#fffbeb', color: '#b45309', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #fcd34d', fontSize: '0.95rem', lineHeight: '1.5', textAlign: 'left' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>⚠️ Modo Offline Activo</div>
            Estás trabajando sin conexión a internet. No es necesario realizar la apertura de caja para registrar ventas offline. Puedes ir directamente al <strong>Punto de Venta</strong> para procesar transacciones; éstas se guardarán en tu dispositivo y se sincronizarán al recuperar la señal.
          </div>
        )}

        {error && <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}
        
        <form onSubmit={handleOpenSession} style={{ maxWidth: '300px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
             <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Efectivo Inicial ($)</label>
             <input 
               type="number" 
               step="0.01"
               required 
               disabled={!isOnline}
               value={initialAmount} 
               onChange={e => setInitialAmount(e.target.value)} 
               style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1.25rem', textAlign: 'center', fontWeight: 'bold', backgroundColor: isOnline ? 'white' : '#f1f5f9' }} 
             />
          </div>
          <button type="submit" disabled={loading || !isOnline} style={{ width: '100%', padding: '1rem', backgroundColor: isOnline ? '#d946ef' : '#cbd5e1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: (loading || !isOnline) ? 'not-allowed' : 'pointer' }}>
             {loading ? 'Abriendo Turno...' : isOnline ? 'Abrir Turno' : 'Apertura deshabilitada offline'}
          </button>
        </form>
      </div>
    );
  }

  // Calculate live expected cash for summary cards
  const cashSales = activeSales.filter((s: any) => s.paymentMethod === 'CASH');
  const mixtoSales = activeSales.filter((s: any) => s.paymentMethod === 'MIXTO');
  const totalSalesCash = cashSales.reduce((acc: number, sale: any) => acc + sale.total, 0);
  const totalSalesMixtoCash = mixtoSales.reduce((acc: number, sale: any) => acc + (sale.cashAmount || 0), 0);
  
  const totalIn = initialSession.movements?.filter((m: any) => m.type === 'IN').reduce((acc: number, m: any) => acc + m.amount, 0) || 0;
  const totalOut = initialSession.movements?.filter((m: any) => m.type === 'OUT').reduce((acc: number, m: any) => acc + m.amount, 0) || 0;

  const expectedCashAmount = initialSession.initialAmount + totalSalesCash + totalSalesMixtoCash + totalIn - totalOut;

  return (
    <div>
       {error && <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}

       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
             <h3 style={{ fontSize: '0.9rem', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>Fondo Inicial</h3>
             <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--caanma-text)' }}>{formatCurrency(initialSession.initialAmount)}</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
             <h3 style={{ fontSize: '0.9rem', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>Ventas de Efectivo</h3>
             <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#16a34a' }}>+ {formatCurrency(totalSalesCash + totalSalesMixtoCash)}</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
             <h3 style={{ fontSize: '0.9rem', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>Ingresos Extra</h3>
             <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0ea5e9' }}>+ {formatCurrency(totalIn)}</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
             <h3 style={{ fontSize: '0.9rem', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>Retiros/Egresos</h3>
             <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ef4444' }}>- {formatCurrency(totalOut)}</div>
          </div>
       </div>

       <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fdf4ff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #f0abfc', marginBottom: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#a21caf', fontWeight: 'bold', marginBottom: '0.5rem' }}>Efectivo TOTAL Esperado en Caja</h3>
            <p style={{ color: '#86198f', fontSize: '0.9rem' }}>Este es el dinero que deberías tener físicamente al cerrar.</p>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#a21caf' }}>
             {formatCurrency(expectedCashAmount)}
          </div>
       </div>

       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
          <button onClick={() => { setMovementType('IN'); setIsMovementModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#f0f9ff', color: '#0369a1', padding: '1rem', border: '1px dashed #7dd3fc', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
             <ArrowUpRight size={20} /> Registrar Entrada de Dinero
          </button>
          <button onClick={() => { setMovementType('OUT'); setIsMovementModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#fef2f2', color: '#b91c1c', padding: '1rem', border: '1px dashed #fca5a5', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
             <ArrowDownRight size={20} /> Registrar Salida / Retiro
          </button>
       </div>

       <div style={{ borderTop: '1px solid var(--caanma-border)', paddingTop: '2rem', textAlign: 'center' }}>
          <button onClick={() => setIsCloseModalOpen(true)} style={{ backgroundColor: '#ef4444', color: 'white', padding: '1rem 3rem', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.25rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.4)' }}>
             <CheckCircle size={24} /> Realizar Corte de Caja (Turno Ciego)
          </button>
          <p style={{ color: 'var(--caanma-text-muted)', marginTop: '1rem', fontSize: '0.9rem' }}>Una vez realizado, el turno terminará y se registrarán diferencias.</p>
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

       {/* Detailed Close Session Modal */}
       {isCloseModalOpen && (
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
               <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1e293b' }}>Corte de Caja</h3>
               <p style={{ color: 'var(--caanma-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                 Haz un recuento manual del efectivo en tu caja y otros métodos de pago y compáralos con el valor registrado en Pulpo.
               </p>

               <form onSubmit={handleCloseSession}>
                  {/* Denominations Calculator */}
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                     <h4 style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.75rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Banknote size={20} color="#16a34a" /> Desglose de Efectivo por Denominación
                     </h4>
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {/* Billetes */}
                        <div>
                           <h5 style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>Billetes</h5>
                           {denominations.filter(d => d.isBill).map(d => (
                              <div key={d.value} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', gap: '0.5rem' }}>
                                 <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#334155', width: '120px' }}>{d.label}</span>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input 
                                       type="number"
                                       min="0"
                                       placeholder="0"
                                       value={denomQuantities[d.value] || ''}
                                       onChange={e => handleDenomChange(d.value, e.target.value)}
                                       style={{ width: '60px', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '0.85rem' }}
                                    />
                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', width: '15px', textAlign: 'center' }}>=</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', width: '70px', textAlign: 'right' }}>
                                       {formatCurrency((parseInt(denomQuantities[d.value] || '0') || 0) * d.value)}
                                    </span>
                                 </div>
                              </div>
                           ))}
                        </div>

                        {/* Monedas */}
                        <div>
                           <h5 style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>Monedas</h5>
                           {denominations.filter(d => !d.isBill).map(d => (
                              <div key={d.value} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', gap: '0.5rem' }}>
                                 <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#334155', width: '120px' }}>{d.label}</span>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input 
                                       type="number"
                                       min="0"
                                       placeholder="0"
                                       value={denomQuantities[d.value] || ''}
                                       onChange={e => handleDenomChange(d.value, e.target.value)}
                                       style={{ width: '60px', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '0.85rem' }}
                                    />
                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', width: '15px', textAlign: 'center' }}>=</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', width: '70px', textAlign: 'right' }}>
                                       {formatCurrency((parseInt(denomQuantities[d.value] || '0') || 0) * d.value)}
                                    </span>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', textAlign: 'right', fontSize: '0.9rem', fontWeight: 'bold', color: '#0f172a' }}>
                        Total Efectivo Desglosado: {formatCurrency(
                           denominations.reduce((sum, d) => sum + (parseInt(denomQuantities[d.value] || '0') || 0) * d.value, 0)
                        )}
                     </div>
                  </div>

                  <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
                     <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                        <thead>
                           <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <th style={{ padding: '0.75rem 1rem' }}>Método de Pago</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', width: '180px' }}>Recuento Manual</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', width: '150px' }}>Total Esperado</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', width: '200px' }}>Diferencia</th>
                           </tr>
                        </thead>
                        <tbody>
                           {finalMethods.map(method => {
                              const expected = getExpectedForMethod(method.id);
                              const manualVal = manualCounts[method.id] || '';
                              const manualNum = parseFloat(manualVal || '0');
                              const diff = manualNum - expected;

                              return (
                                 <tr key={method.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '500', color: '#2d3748' }}>
                                       {getMethodIcon(method.id)}
                                       {method.name}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                       <div style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', width: '120px' }}>
                                          <span style={{ position: 'absolute', left: '10px', color: '#94a3b8', fontSize: '0.95rem' }}>$</span>
                                          <input 
                                             type="number" 
                                             step="0.01" 
                                             value={manualVal} 
                                             onChange={e => handleCountChange(method.id, e.target.value)}
                                             style={{ 
                                                padding: '0.5rem 0.5rem 0.5rem 1.75rem', 
                                                borderRadius: '6px', 
                                                border: '1px solid #cbd5e1', 
                                                width: '100%', 
                                                textAlign: 'right',
                                                fontSize: '0.95rem',
                                                fontWeight: 'bold',
                                                color: '#1e293b'
                                             }}
                                             placeholder="0.00"
                                          />
                                       </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.95rem', color: '#4a5568', fontWeight: '500' }}>
                                       {showCalculations ? formatCurrency(expected) : '---'}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                       {showCalculations ? renderDiffBadge(diff) : <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Pendiente</span>}
                                    </td>
                                 </tr>
                              );
                           })}
                           
                           {/* Total Row */}
                           <tr style={{ borderTop: '2px solid #e2e8f0', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                              <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#1e293b' }}>
                                 <Calculator size={20} color="#1e293b" />
                                 Total
                               </td>
                              <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.95rem', color: '#1e293b' }}>
                                 {formatCurrency(finalMethods.reduce((sum, m) => sum + parseFloat(manualCounts[m.id] || '0'), 0))}
                              </td>
                              <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.95rem', color: '#1e293b' }}>
                                 {showCalculations ? formatCurrency(finalMethods.reduce((sum, m) => sum + getExpectedForMethod(m.id), 0)) : '---'}
                              </td>
                              <td style={{ padding: '1rem', textAlign: 'right' }}>
                                 {showCalculations ? renderDiffBadge(
                                    finalMethods.reduce((sum, m) => sum + parseFloat(manualCounts[m.id] || '0'), 0) -
                                    finalMethods.reduce((sum, m) => sum + getExpectedForMethod(m.id), 0)
                                 ) : '---'}
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>

                  {!showCalculations && (
                     <div style={{ textAlign: 'center', margin: '1.5rem 0', padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.75rem', fontWeight: '500' }}>
                           Ingresa el arqueo de caja (efectivo por denominación y otros métodos de pago) para calcular diferencias.
                        </p>
                        <button 
                           type="button" 
                           onClick={() => setShowCalculations(true)}
                           style={{ 
                              backgroundColor: '#d946ef', 
                              color: 'white', 
                              padding: '0.6rem 2rem', 
                              border: 'none', 
                              borderRadius: '8px', 
                              fontWeight: 'bold', 
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(217, 70, 239, 0.2)'
                           }}
                        >
                           Calcular y Comparar Diferencias
                        </button>
                     </div>
                  )}

                  <div style={{ marginBottom: '2rem' }}>
                     <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#4a5568' }}>Comentarios (opcional)</label>
                     <textarea 
                        value={notesText} 
                        onChange={e => setNotesText(e.target.value)} 
                        style={{ 
                           width: '100%', 
                           padding: '0.75rem', 
                           borderRadius: '8px', 
                           border: '1px solid #cbd5e1', 
                           fontSize: '0.95rem',
                           minHeight: '80px',
                           fontFamily: 'inherit',
                           resize: 'vertical'
                        }} 
                        placeholder="Registra comentarios de este corte"
                     />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                     <button type="button" onClick={() => setIsCloseModalOpen(false)} style={{ padding: '0.75rem 2rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>
                        Cancelar
                     </button>
                     {showCalculations && (
                        <button type="submit" disabled={loading} style={{ padding: '0.75rem 2.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)' }}>
                           {loading ? 'Procesando Corte...' : 'Hecho, Cerrar Caja'}
                        </button>
                     )}
                  </div>
               </form>
            </div>
         </div>
       )}

    </div>
  );
}
