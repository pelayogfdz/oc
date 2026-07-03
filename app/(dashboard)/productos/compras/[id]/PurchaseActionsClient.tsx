'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Mail, Send, X, Check } from 'lucide-react';
import { cancelPurchase, sendPurchaseByEmail } from '@/app/actions/purchase';

interface PurchaseActionsClientProps {
  purchaseId: string;
  status: string;
  supplierEmail?: string | null;
  supplierName?: string | null;
}

export default function PurchaseActionsClient({
  purchaseId,
  status,
  supplierEmail,
  supplierName
}: PurchaseActionsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState(supplierEmail || '');
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCancel = () => {
    if (!confirm('¿ESTÁS SEGURO DE CANCELAR ESTA COMPRA? Se deducirá el stock del inventario, se descontarán los lotes y se revertirá la deuda con el proveedor.')) return;

    startTransition(async () => {
      try {
        await cancelPurchase(purchaseId);
        alert('Compra cancelada exitosamente.');
        router.refresh();
      } catch (err: any) {
        alert(err.message || 'Error al cancelar la compra.');
      }
    });
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSending(true);
    setErrorMsg('');
    try {
      const res = await sendPurchaseByEmail(purchaseId, email);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
        }, 2200);
      } else {
        setErrorMsg(res.error || 'Ocurrió un error al enviar el correo.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      {/* Send by Email Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="btn-secondary"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.5rem',
          borderRadius: '4px',
          backgroundColor: '#fef08a',
          color: '#854d0e',
          border: '1px solid #fef08a',
          cursor: 'pointer',
          fontWeight: 'bold',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#fde047';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#fef08a';
        }}
      >
        <Mail size={18} />
        Enviar al Proveedor
      </button>

      {/* Cancel Button */}
      {status === 'COMPLETED' && (
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="btn-danger"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            opacity: isPending ? 0.7 : 1
          }}
        >
          <AlertTriangle size={18} />
          {isPending ? 'Cancelando...' : 'Cancelar Compra'}
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            border: '1px solid #e2e8f0',
            position: 'relative'
          }}>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>
              Enviar Orden de Compra
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: '#64748b', lineHeight: '1.4' }}>
              Se generará un PDF de la orden de compra y se enviará al proveedor <strong>{supplierName || 'General'}</strong>.
            </p>

            {success ? (
              <div style={{
                backgroundColor: '#dcfce7',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '1.5rem',
                textAlign: 'center',
                color: '#15803d',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem'
              }}>
                <Check size={40} style={{ color: '#16a34a' }} />
                <span style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>¡Correo enviado con éxito!</span>
                <span style={{ fontSize: '0.85rem', color: '#166534' }}>El proveedor recibirá el archivo PDF adjunto.</span>
              </div>
            ) : (
              <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="provider-email" style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>
                    Correo Electrónico del Proveedor:
                  </label>
                  <input
                    id="provider-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@proveedor.com"
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.95rem',
                      outline: 'none',
                      color: 'black'
                    }}
                  />
                </div>

                {errorMsg && (
                  <div style={{ fontSize: '0.85rem', color: '#b91c1c', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    ❌ {errorMsg}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    style={{
                      padding: '0.6rem 1.2rem',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSending || !email}
                    style={{
                      padding: '0.6rem 1.2rem',
                      backgroundColor: '#0ea5e9',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      opacity: (isSending || !email) ? 0.7 : 1
                    }}
                  >
                    <Send size={16} />
                    {isSending ? 'Enviando...' : 'Enviar Correo'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
