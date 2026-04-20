'use client';

import { useState } from 'react';
import { Search, FileText, Download, UserCircle, Briefcase, ChevronRight, CheckCircle2 } from 'lucide-react';
import { searchTicket, searchB2BInvoices } from '@/app/actions/portal';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function PortalClient() {
  const [tab, setTab] = useState<'b2c' | 'b2b'>('b2c');
  const [ticketId, setTicketId] = useState('');
  const [rfc, setRfc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // B2C State
  const [sale, setSale] = useState<any>(null);
  
  // B2B State
  const [invoices, setInvoices] = useState<any[]>([]);
  const [b2bSearched, setB2bSearched] = useState(false);

  const handleSearchB2C = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId.trim()) return;
    setError('');
    setLoading(true);
    const result = await searchTicket(ticketId.trim());
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.sale) {
      setSale(result.sale);
    }
  };

  const handleSearchB2B = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfc.trim()) return;
    setError('');
    setLoading(true);
    
    const result = await searchB2BInvoices(rfc.trim());
    setLoading(false);

    if (result.error) {
       setError(result.error);
    } else if (result.invoices) {
       setInvoices(result.invoices);
       setB2bSearched(true);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '4rem auto', fontFamily: 'var(--font-geist-sans)' }}>
      
      {/* Header Premium */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
         <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '20px', backgroundColor: 'var(--pulpos-primary)', marginBottom: '1.5rem', boxShadow: '0 10px 25px -5px rgba(22, 163, 74, 0.4)' }}>
           <FileText color="white" size={40} />
         </div>
         <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--pulpos-text)', letterSpacing: '-1px' }}>
           Portal CAANMA
         </h1>
         <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '1.1rem', maxWidth: '500px', margin: '0.5rem auto' }}>
           Centro de autofacturación y descarga de comprobantes fiscales para nuestros clientes.
         </p>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--pulpos-border)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--pulpos-border)' }}>
          <button 
            onClick={() => { setTab('b2c'); setError(''); setSale(null); }}
            style={{ flex: 1, padding: '1.5rem', backgroundColor: tab === 'b2c' ? 'white' : '#f8fafc', border: 'none', borderBottom: tab === 'b2c' ? '3px solid var(--pulpos-primary)' : '3px solid transparent', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center', color: tab === 'b2c' ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)' }}
          >
            <UserCircle size={24} /> Facturar un Ticket
          </button>
          <button 
             onClick={() => { setTab('b2b'); setError(''); setB2bSearched(false); }}
             style={{ flex: 1, padding: '1.5rem', backgroundColor: tab === 'b2b' ? 'white' : '#f8fafc', border: 'none', borderBottom: tab === 'b2b' ? '3px solid var(--pulpos-primary)' : '3px solid transparent', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center', color: tab === 'b2b' ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)' }}
          >
            <Briefcase size={24} /> Soy Cliente Mayorista (B2B)
          </button>
        </div>

        <div style={{ padding: '3rem' }}>
          {tab === 'b2c' ? (
             <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
                {!sale ? (
                  <>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Identifica tu compra</h2>
                    <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '2rem' }}>
                      Ingresa el folio de la venta que aparece en la parte inferior de tu ticket impreso.
                    </p>
                    <form onSubmit={handleSearchB2C} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <input 
                        type="text" 
                        value={ticketId}
                        onChange={e => setTicketId(e.target.value)}
                        placeholder="Ej. A4F2C9" 
                        required
                        style={{ padding: '1.25rem', borderRadius: '8px', border: '2px solid var(--pulpos-border)', fontSize: '1.5rem', textAlign: 'center', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }} 
                      />
                      <button disabled={loading} type="submit" className="btn-primary" style={{ padding: '1rem', fontSize: '1.1rem', borderRadius: '8px', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                        {loading ? 'Buscando...' : <><Search size={20} /> Buscar Ticket</>}
                      </button>
                      {error && <div style={{ color: '#ef4444', fontWeight: 'bold' }}>{error}</div>}
                    </form>
                  </>
                ) : (
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontWeight: 'bold', fontSize: '1.25rem', marginBottom: '1rem', justifyContent: 'center' }}>
                      <CheckCircle2 size={28} /> Ticket Encontrado
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px dashed var(--pulpos-border)', marginBottom: '2rem' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ color: 'var(--pulpos-text-muted)' }}>Folio:</span>
                          <span style={{ fontWeight: 'bold' }}>{sale.id.slice(-6).toUpperCase()}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ color: 'var(--pulpos-text-muted)' }}>Fecha:</span>
                          <span style={{ fontWeight: 'bold' }}>{new Date(sale.createdAt).toLocaleDateString()}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--pulpos-border)' }}>
                          <span>Total:</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--pulpos-text)' }}>{formatCurrency(sale.total)}</span>
                       </div>
                    </div>
                    <button className="btn-primary" style={{ width: '100%', padding: '1rem', borderRadius: '8px', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      Ingresar Datos Fiscales <ChevronRight size={20} />
                    </button>
                  </div>
                )}
             </div>
          ) : (
             <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                {!b2bSearched ? (
                  <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Accede a tus Facturas</h2>
                    <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '2rem' }}>
                      Ingresa tu RFC asociado a tu cuenta de cliente mayorista para ver tu historial de CFDI.
                    </p>
                    <form onSubmit={handleSearchB2B} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <input 
                        type="text" 
                        value={rfc}
                        onChange={e => setRfc(e.target.value.toUpperCase())}
                        placeholder="RFC (Ej. XAXX010101000)" 
                        required
                        style={{ padding: '1.25rem', borderRadius: '8px', border: '2px solid var(--pulpos-border)', fontSize: '1.5rem', textAlign: 'center', fontWeight: 'bold', letterSpacing: '2px' }} 
                      />
                      <button disabled={loading} type="submit" className="btn-primary" style={{ padding: '1rem', fontSize: '1.1rem', borderRadius: '8px', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                        {loading ? 'Cargando portal...' : 'Ingresar al Portal'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Historial Fiscal</h2>
                    <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '2rem' }}>RFC: <strong>{rfc}</strong></p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {invoices.map((inv) => (
                        <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--pulpos-border)', borderRadius: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Factura {inv.id}</div>
                            <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>{new Date(inv.date).toLocaleDateString()} • UUID: {inv.uuid}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                             <div style={{ fontWeight: 'bold', color: 'var(--pulpos-text)' }}>{formatCurrency(inv.total)}</div>
                             <div style={{ display: 'flex', gap: '0.5rem' }}>
                               <button style={{ padding: '0.5rem', backgroundColor: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }} title="Descargar PDF">
                                  <Download size={16} /> PDF
                               </button>
                               <button style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }} title="Descargar XML">
                                  <Download size={16} /> XML
                               </button>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button onClick={() => setB2bSearched(false)} style={{ background: 'none', border: 'none', color: 'var(--pulpos-primary)', fontWeight: 'bold', textDecoration: 'underline', marginTop: '2rem', cursor: 'pointer' }}>
                      Salir del portal
                    </button>
                  </div>
                )}
             </div>
          )}
        </div>
      </div>
      
      <div style={{ textAlign: 'center', marginTop: '3rem' }}>
         <Link href="/login" style={{ color: 'var(--pulpos-text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
           ← Volver al login para empleados
         </Link>
      </div>
    </div>
  );
}
