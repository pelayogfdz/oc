'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Send, 
  Search, 
  Plus, 
  MessageCircle, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  Download, 
  ExternalLink,
  Mail 
} from 'lucide-react';
import { sendCreditNoteEmailAction } from '@/app/actions/creditNote';

export default function NotasCreditoClient({ initialCreditNotes }: { initialCreditNotes: any[] }) {
  const [creditNotes, setCreditNotes] = useState<any[]>(initialCreditNotes);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TIMBRADA' | 'LOCAL'>('ALL');

  // Email modal states
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const filteredNotes = creditNotes.filter(note => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (note.id || '').toLowerCase().includes(q) ||
      (note.satCreditNote || '').toLowerCase().includes(q) ||
      (note.reason || '').toLowerCase().includes(q) ||
      (note.sale?.folio || '').toLowerCase().includes(q) ||
      (note.sale?.customer?.name || '').toLowerCase().includes(q) ||
      (note.sale?.customer?.legalName || '').toLowerCase().includes(q) ||
      (note.sale?.customer?.taxId || '').toLowerCase().includes(q)
    );

    const isTimbrada = note.satCreditNote && note.satCreditNote !== 'LOCAL';
    const matchesStatus = 
      statusFilter === 'ALL' ||
      (statusFilter === 'TIMBRADA' && isTimbrada) ||
      (statusFilter === 'LOCAL' && !isTimbrada);

    return matchesSearch && matchesStatus;
  });

  const handleOpenEmailModal = (note: any) => {
    setSelectedNote(note);
    setTargetEmail(note.sale?.customer?.email || '');
    setEmailFeedback(null);
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!targetEmail.trim() || !selectedNote) return;
    setIsSendingEmail(true);
    setEmailFeedback(null);

    try {
      const res = await sendCreditNoteEmailAction(selectedNote.id, targetEmail.trim());
      if (res.success) {
        setEmailFeedback({ success: true, message: 'Correo enviado exitosamente con PDF y XML adjuntos.' });
        setTimeout(() => {
          setIsEmailModalOpen(false);
        }, 1800);
      } else {
        setEmailFeedback({ success: false, message: res.error || 'Error al enviar correo.' });
      }
    } catch (err: any) {
      setEmailFeedback({ success: false, message: err.message || 'Error de conexión.' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleShareWhatsApp = (note: any) => {
    const customerPhone = note.sale?.customer?.phone?.replace(/\D/g, '') || '';
    const folio = note.sale?.folio || note.saleId?.slice(0, 8);
    const amountStr = note.totalRefund.toFixed(2);
    let msg = `Hola ${note.sale?.customer?.name || ''}, te compartimos tu Nota de Crédito por $${amountStr} MXN aplicada a tu compra #${folio}.`;
    if (note.satCreditNote && note.satCreditNote !== 'LOCAL') {
      msg += ` Folio Fiscal UUID: ${note.satCreditNote}. Puedes descargar tu PDF oficial aquí: https://api.facturapi.com/v1/invoices/${note.satCreditNote}/pdf`;
    }
    const url = customerPhone
      ? `https://wa.me/${customerPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'var(--font-geist-sans)' }}>
      {/* Top Header Card */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
            Notas de Crédito (CFDI Egreso)
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
            Historial de devoluciones, bonificaciones y comprobantes fiscales tipo Egreso (E) timbrados ante el SAT.
          </p>
        </div>

        <Link
          href="/ventas/devoluciones/nuevo"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            backgroundColor: '#f43f5e',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            textDecoration: 'none',
            boxShadow: '0 2px 4px rgba(244, 63, 94, 0.2)'
          }}
        >
          <Plus size={18} />
          + Nueva Nota de Crédito
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'white', padding: '1rem', borderRadius: '10px', border: '1px solid var(--caanma-border)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '0.7rem' }} />
          <input
            type="text"
            placeholder="Buscar por cliente, RFC, folio o UUID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.25rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { key: 'ALL', label: 'Todas' },
            { key: 'TIMBRADA', label: 'Timbradas SAT (CFDI)' },
            { key: 'LOCAL', label: 'Administrativas' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key as any)}
              style={{
                padding: '0.55rem 0.9rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: statusFilter === f.key ? '#f43f5e' : '#cbd5e1',
                backgroundColor: statusFilter === f.key ? '#fff1f2' : 'white',
                color: statusFilter === f.key ? '#e11d48' : '#475569',
                fontSize: '0.85rem',
                fontWeight: statusFilter === f.key ? 'bold' : 'normal',
                cursor: 'pointer'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid var(--caanma-border)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Folio / UUID</th>
                <th style={{ padding: '0.85rem 1rem' }}>Venta Afectada</th>
                <th style={{ padding: '0.85rem 1rem' }}>Cliente</th>
                <th style={{ padding: '0.85rem 1rem' }}>Fecha</th>
                <th style={{ padding: '0.85rem 1rem' }}>Modalidad</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Estado</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    No se encontraron notas de crédito registradas.
                  </td>
                </tr>
              ) : (
                filteredNotes.map((note) => {
                  const isTimbrada = note.satCreditNote && note.satCreditNote !== 'LOCAL';
                  const isDevolucion = note.items && note.items.length > 0;
                  const pdfUrl = isTimbrada ? `https://api.facturapi.com/v1/invoices/${note.satCreditNote}/pdf` : null;
                  const xmlUrl = isTimbrada ? `https://api.facturapi.com/v1/invoices/${note.satCreditNote}/xml` : null;

                  return (
                    <tr key={note.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isTimbrada ? (
                          <div>
                            <span style={{ fontWeight: 'bold', color: '#0f172a', display: 'block' }}>
                              NCR-{note.satCreditNote.slice(0, 8).toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                              {note.satCreditNote}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span style={{ fontWeight: 'bold', color: '#64748b', display: 'block' }}>
                              NCR-LOCAL
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                              #{note.id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <Link
                          href={`/ventas/detalle/${note.saleId}`}
                          style={{
                            color: '#2563eb',
                            textDecoration: 'none',
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          #{note.sale?.folio || note.saleId.slice(0, 8)}
                          <ExternalLink size={12} />
                        </Link>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: '500', color: '#0f172a' }}>
                          {note.sale?.customer?.legalName || note.sale?.customer?.name || 'Público en General'}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          RFC: {note.sale?.customer?.taxId || 'XAXX010101000'}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.85rem' }}>
                        {new Date(note.createdAt).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            backgroundColor: isDevolucion ? '#f0fdf4' : '#eff6ff',
                            color: isDevolucion ? '#166534' : '#1e40af',
                            border: `1px solid ${isDevolucion ? '#bbf7d0' : '#bfdbfe'}`
                          }}
                        >
                          {isDevolucion ? 'Devolución Física' : 'Bonificación'}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>
                        ${note.totalRefund.toFixed(2)}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {isTimbrada ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              backgroundColor: '#dcfce7',
                              color: '#15803d'
                            }}
                          >
                            <CheckCircle2 size={13} />
                            CFDI 4.0
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              backgroundColor: '#fef3c7',
                              color: '#b45309'
                            }}
                          >
                            <AlertCircle size={13} />
                            Administrativa
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          {pdfUrl && (
                            <a
                              href={pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Descargar PDF"
                              style={{
                                padding: '0.4rem',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: 'white',
                                color: '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                textDecoration: 'none'
                              }}
                            >
                              <FileText size={15} />
                            </a>
                          )}

                          {xmlUrl && (
                            <a
                              href={xmlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Descargar XML"
                              style={{
                                padding: '0.4rem',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: 'white',
                                color: '#0f172a',
                                display: 'flex',
                                alignItems: 'center',
                                textDecoration: 'none'
                              }}
                            >
                              <Download size={15} />
                            </a>
                          )}

                          <button
                            onClick={() => handleOpenEmailModal(note)}
                            title="Enviar por Correo"
                            style={{
                              padding: '0.4rem',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: 'white',
                              color: '#2563eb',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Mail size={15} />
                          </button>

                          <button
                            onClick={() => handleShareWhatsApp(note)}
                            title="Compartir por WhatsApp"
                            style={{
                              padding: '0.4rem',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: 'white',
                              color: '#16a34a',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <MessageCircle size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Email Sending */}
      {isEmailModalOpen && selectedNote && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '1.75rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
                Enviar Nota de Crédito por Correo
              </h3>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Se enviará el comprobante de Nota de Crédito por <strong>${selectedNote.totalRefund.toFixed(2)} MXN</strong> con los archivos PDF y XML adjuntos.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>
                Correo Electrónico Destino:
              </label>
              <input
                type="email"
                value={targetEmail}
                onChange={e => setTargetEmail(e.target.value)}
                placeholder="cliente@ejemplo.com"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>

            {emailFeedback && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  backgroundColor: emailFeedback.success ? '#dcfce7' : '#fee2e2',
                  color: emailFeedback.success ? '#166534' : '#991b1b',
                  border: `1px solid ${emailFeedback.success ? '#86efac' : '#fca5a5'}`
                }}
              >
                {emailFeedback.message}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: 'white',
                  color: '#475569',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isSendingEmail || !targetEmail.trim()}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: isSendingEmail || !targetEmail.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem'
                }}
              >
                {isSendingEmail ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {isSendingEmail ? 'Enviando...' : 'Enviar Comprobante'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
