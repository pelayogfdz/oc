'use client';
import { useState, useEffect } from 'react';
import { Search, FileText, CheckCircle, ArrowLeft, Download } from 'lucide-react';
import { searchTicket, generateInvoice } from '@/app/actions/portal';
import { formatCurrency } from '@/lib/utils';

export default function PortalClient() {
  const [step, setStep] = useState(1);
  const [ticketId, setTicketId] = useState('');
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [taxData, setTaxData] = useState({
    rfc: '',
    legalName: '',
    taxRegime: '601',
    zipCode: '',
    cfdiUse: 'G03',
    email: ''
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const qs = new URLSearchParams(window.location.search);
      const tId = qs.get('ticketId');
      if (tId) {
        setTicketId(tId);
        executeSearch(tId);
      }
    }
  }, []);

  const executeSearch = async (term: string) => {
    setError('');
    setLoading(true);
    const result = await searchTicket(term);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.sale) {
      setSale(result.sale);
      setStep(2);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId.trim()) return;
    await executeSearch(ticketId.trim());
  };

  const handleInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await generateInvoice(sale.id, taxData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setStep(3);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '4rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Autofacturación Express</h1>
        <p style={{ color: 'var(--pulpos-text-muted)' }}>Módulo para que tus clientes puedan facturar sus tickets en línea.</p>
      </div>

      {step === 1 && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <FileText size={48} color="#0284c7" style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Identifica tu Ticket</h2>
          <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '2rem' }}>Ingresa el folio de la venta que viene debajo del código de barras de tu ticket.</p>
          
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input 
                type="text" 
                value={ticketId}
                onChange={e => setTicketId(e.target.value)}
                placeholder="Folio de Ticket (Ej. A4F2C9)" 
                required
                style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '2px solid var(--pulpos-border)', fontSize: '1.2rem', textAlign: 'center' }} 
              />
              <button disabled={loading} type="submit" className="btn-primary" style={{ padding: '0 2rem', border: 'none' }}>
                {loading ? '...' : <Search />}
              </button>
            </div>
            {error && <div style={{ color: '#ef4444', fontWeight: 'bold', marginTop: '0.5rem' }}>{error}</div>}
          </form>
        </div>
      )}

      {step === 2 && sale && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
           <div className="card" style={{ padding: '2rem' }}>
              <button 
                type="button"
                onClick={() => setStep(1)}
                style={{ background: 'none', border: 'none', color: 'var(--pulpos-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>
                <ArrowLeft size={16} /> Volver
              </button>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Resumen del Ticket</h3>
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed var(--pulpos-border)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--pulpos-text-muted)' }}>Folio:</span>
                    <span style={{ fontWeight: 'bold' }}>{sale.id.slice(-6).toUpperCase()}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--pulpos-text-muted)' }}>Fecha:</span>
                    <span style={{ fontWeight: 'bold' }}>{new Date(sale.createdAt).toLocaleDateString()}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', marginTop: '1rem', borderTop: '2px solid var(--pulpos-border)', paddingTop: '1rem' }}>
                    <span>Total a Facturar:</span>
                    <span style={{ fontWeight: 'bold', color: '#16a34a' }}>{formatCurrency(sale.total)}</span>
                 </div>
              </div>

              <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Partidas ({sale.items.length})</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                 {sale.items.map((item: any) => (
                   <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--pulpos-border)', fontSize: '0.85rem' }}>
                     <span>{item.quantity}x {item.product.name}</span>
                     <span>{formatCurrency(item.quantity * item.price)}</span>
                   </div>
                 ))}
              </div>
           </div>

           <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Datos Fiscales (Receptor)</h3>
              <form onSubmit={handleInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>RFC *</label>
                  <input type="text" value={taxData.rfc} onChange={e => setTaxData({...taxData, rfc: e.target.value.toUpperCase()})} required placeholder="XAXX010101000" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Razón Social *</label>
                  <input type="text" value={taxData.legalName} onChange={e => setTaxData({...taxData, legalName: e.target.value.toUpperCase()})} required placeholder="TU EMPRESA SA DE CV" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>C.P. Fiscal *</label>
                    <input type="text" value={taxData.zipCode} onChange={e => setTaxData({...taxData, zipCode: e.target.value})} required placeholder="00000" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Régimen Fiscal *</label>
                    <select value={taxData.taxRegime} onChange={e => setTaxData({...taxData, taxRegime: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }}>
                      <option value="601">601 - General Ley Personas Morales</option>
                      <option value="612">612 - Personas Físicas Empresariales</option>
                      <option value="626">626 - RESICO</option>
                      <option value="616">616 - Sin obligaciones fiscales</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Uso de CFDI *</label>
                  <select value={taxData.cfdiUse} onChange={e => setTaxData({...taxData, cfdiUse: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }}>
                    <option value="G03">G03 - Gastos en general</option>
                    <option value="G01">G01 - Adquisición de mercancias</option>
                    <option value="S01">S01 - Sin efectos fiscales</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Correo Electrónico *</label>
                  <input type="email" value={taxData.email} onChange={e => setTaxData({...taxData, email: e.target.value})} required placeholder="correo@empresa.com" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
                </div>
                <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.1rem', backgroundColor: '#0284c7', borderColor: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Procesando CFDI...' : 'Generar Factura (Timbrar)'}
                </button>
                {error && <div style={{ color: '#ef4444', fontWeight: 'bold', marginTop: '0.5rem', textAlign: 'center' }}>{error}</div>}
              </form>
           </div>
        </div>
      )}

      {step === 3 && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto', backgroundColor: '#f0fdf4', border: '2px solid #bbf7d0' }}>
          <CheckCircle size={64} color="#16a34a" style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#166534', marginBottom: '1rem' }}>¡Factura Exitosa!</h2>
          <p style={{ color: '#15803d', marginBottom: '2rem', fontSize: '1.1rem' }}>
            Tu CFDI fue timbrado correctamente y enviado por correo electrónico a: <br/><strong>{taxData.email}</strong>.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
             <button type="button" className="btn-primary" style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Download size={18} /> Descargar PDF
             </button>
             <button type="button" className="btn-primary" style={{ backgroundColor: 'white', color: '#16a34a', border: '2px solid #16a34a', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Download size={18} /> Descargar XML
             </button>
          </div>
          <button type="button" onClick={() => { setStep(1); setTicketId(''); setSale(null); }} style={{ marginTop: '2rem', background: 'none', border: 'none', color: '#16a34a', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer' }}>
             Facturar otro ticket diferente
          </button>
        </div>
      )}
    </div>
  );
}
