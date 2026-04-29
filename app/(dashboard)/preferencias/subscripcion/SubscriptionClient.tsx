'use client';

import { useState, useEffect } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { saveMercadoPagoCard, processManualPayment } from '@/app/actions/subscription';
import { CreditCard, ShieldCheck, CheckCircle2, AlertTriangle, CreditCard as CardIcon, RefreshCw } from 'lucide-react';

export default function SubscriptionClient({ initialData }: { initialData: any }) {
  const { tenant, userCount, mpPublicKey, basePrice, userPrice } = initialData;
  const [isSaving, setIsSaving] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showCardForm, setShowCardForm] = useState(!tenant.mpCardId);

  // Calcular monto a pagar
  const actualBasePrice = tenant.customBasePrice !== null ? tenant.customBasePrice : basePrice;
  const actualUserPrice = tenant.customUserPrice !== null ? tenant.customUserPrice : userPrice;
  const totalAmount = actualBasePrice + (userCount * actualUserPrice);
  const amountToPay = Math.max(0, totalAmount - (tenant.giftCredits || 0));

  useEffect(() => {
    if (mpPublicKey) {
      initMercadoPago(mpPublicKey, { locale: 'es-MX' });
    }
  }, [mpPublicKey]);

  const initialization = {
    amount: 1, // Only for validation purposes of the card
  };

  const onSubmit = async (formData: any) => {
    setIsSaving(true);
    try {
      // The brick returns a token. We send it to our backend to associate it with the tenant's MP Customer
      await saveMercadoPagoCard(formData.token, formData.payment_method_id);
      setSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const onError = async (error: any) => {
    console.log(error);
  };

  const onReady = async () => {
    // Brick is ready
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CreditCard size={28} color="var(--pulpos-primary)" />
        Mi Suscripción
      </h1>
      <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '2rem' }}>
        Gestiona el método de pago automático para el uso del sistema CAANMA PRO.
      </p>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Usuarios Activos</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--pulpos-text)' }}>{userCount}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Créditos de Regalo</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>${tenant.giftCredits?.toFixed(2) || '0.00'}</p>
        </div>
        <div style={{ backgroundColor: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #bae6fd' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#0369a1', marginBottom: '0.5rem' }}>Monto a Pagar Mensual</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0284c7' }}>${amountToPay.toFixed(2)}</p>
        </div>
      </div>

      {/* Payment Method Section */}
      <section style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)', position: 'relative' }}>
        
        {!mpPublicKey ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <AlertTriangle size={48} color="#f59e0b" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Sistema No Disponible</h2>
            <p style={{ color: 'var(--pulpos-text-muted)' }}>El administrador del sistema aún no ha configurado el procesador de pagos.</p>
          </div>
        ) : (
          <>
            {!showCardForm && tenant.mpCardId && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <CheckCircle2 size={48} color="#16a34a" style={{ margin: '0 auto 1rem auto' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Método de Pago Activo</h2>
                <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '2rem' }}>Tu tarjeta está registrada de forma segura para los cobros.</p>
                
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={async () => {
                      if (!confirm(`¿Confirmas el pago manual de $${amountToPay.toFixed(2)} MXN?`)) return;
                      setIsPaying(true);
                      try {
                        await processManualPayment(amountToPay);
                        alert('¡Pago procesado con éxito!');
                        window.location.reload();
                      } catch (e: any) {
                        alert(e.message);
                      } finally {
                        setIsPaying(false);
                      }
                    }}
                    disabled={isPaying || amountToPay <= 0}
                    style={{
                      padding: '0.75rem 2rem',
                      backgroundColor: 'var(--pulpos-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: (isPaying || amountToPay <= 0) ? 'not-allowed' : 'pointer',
                      opacity: (isPaying || amountToPay <= 0) ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {isPaying ? <RefreshCw className="animate-spin" size={20} /> : <CardIcon size={20} />}
                    {isPaying ? 'Procesando...' : `Pagar Ahora ($${amountToPay.toFixed(2)})`}
                  </button>

                  <button
                    onClick={() => setShowCardForm(true)}
                    style={{
                      padding: '0.75rem 2rem',
                      backgroundColor: 'white',
                      color: 'var(--pulpos-text)',
                      border: '1px solid var(--pulpos-border)',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Actualizar Tarjeta
                  </button>
                </div>
              </div>
            )}

            {showCardForm && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={20} color="#16a34a" /> 
                    Guardar Tarjeta de Débito/Crédito
                  </h2>
                  {tenant.mpCardId && (
                    <button onClick={() => setShowCardForm(false)} style={{ color: 'var(--pulpos-text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                      Cancelar
                    </button>
                  )}
                </div>
                <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                  Al guardar tu tarjeta, se realizará una validación temporal de $0.10 MXN que será anulada inmediatamente. Tus datos están protegidos por Mercado Pago.
                </p>

                {success ? (
                  <div style={{ textAlign: 'center', color: '#16a34a', fontWeight: 'bold', padding: '2rem' }}>
                    <CheckCircle2 size={48} style={{ margin: '0 auto 1rem' }} />
                    ¡Tarjeta guardada con éxito!
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    {isSaving && (
                      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        Procesando y validando tarjeta...
                      </div>
                    )}
                    <CardPayment
                      initialization={initialization}
                      onSubmit={onSubmit}
                      onReady={onReady}
                      onError={onError}
                      customization={{
                        paymentMethods: {
                          maxInstallments: 1,
                        },
                        visual: {
                          style: {
                            theme: 'default',
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>

    </div>
  );
}
