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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            
            {/* Main Action Area */}
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', color: amountToPay > 0 ? '#b91c1c' : '#16a34a' }}>
                  {amountToPay > 0 ? 'Pago Pendiente' : 'Suscripción al Día'}
                </h2>
                <p style={{ color: 'var(--pulpos-text-muted)' }}>
                  {amountToPay > 0 
                    ? `Tienes un saldo pendiente de $${amountToPay.toFixed(2)} MXN.`
                    : 'No tienes pagos pendientes por el momento. ¡Gracias por usar CAANMA PRO!'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={async () => {
                    if (!tenant.mpCardId) {
                      alert('Para realizar el pago, primero debes Guardar los Datos de tu Tarjeta de forma segura en la sección inferior.');
                      setShowCardForm(true);
                      // Scroll to card form
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                      return;
                    }
                    if (!confirm(`¿Confirmas el pago manual de $${amountToPay.toFixed(2)} MXN a tu tarjeta guardada?`)) return;
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
                    padding: '1rem 2.5rem',
                    backgroundColor: (isPaying || amountToPay <= 0) ? '#e2e8f0' : 'var(--pulpos-primary)',
                    color: (isPaying || amountToPay <= 0) ? '#94a3b8' : 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    cursor: (isPaying || amountToPay <= 0) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    boxShadow: (isPaying || amountToPay <= 0) ? 'none' : '0 4px 14px 0 rgba(0,118,255,0.39)',
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  {isPaying ? <RefreshCw className="animate-spin" size={24} /> : <CardIcon size={24} />}
                  {isPaying ? 'Procesando Pago...' : `Pagar Ahora ($${amountToPay.toFixed(2)})`}
                </button>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px dashed var(--pulpos-border)' }} />

            {/* Card Management Section */}
            <div>
              {tenant.mpCardId ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <CheckCircle2 size={32} color="#16a34a" />
                    <div>
                      <h3 style={{ fontWeight: 'bold', color: '#166534', marginBottom: '0.25rem' }}>Tarjeta Registrada Exitosamente</h3>
                      <p style={{ fontSize: '0.9rem', color: '#15803d' }}>Tus datos están protegidos de forma segura por Mercado Pago.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCardForm(!showCardForm)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'white',
                      color: '#166534',
                      border: '1px solid #86efac',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {showCardForm ? 'Ocultar Formulario' : 'Actualizar Tarjeta'}
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                   <p style={{ color: '#ef4444', fontWeight: 'bold' }}>⚠️ Aún no tienes una tarjeta registrada para tus pagos.</p>
                </div>
              )}

              {showCardForm && (
                <div style={{ marginTop: '2rem', padding: '2rem', border: '1px solid var(--pulpos-border)', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldCheck size={24} color="#0284c7" /> 
                      Guardar datos en Mercado Pago
                    </h2>
                  </div>
                  <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.95rem', marginBottom: '2rem' }}>
                    Registra tu tarjeta para activar los pagos automáticos y facilitar tus pagos manuales. <br/>
                    Se realizará un cargo de validación de $0.10 MXN que será reembolsado inmediatamente.
                  </p>

                  {success ? (
                    <div style={{ textAlign: 'center', color: '#16a34a', fontWeight: 'bold', padding: '2rem', backgroundColor: 'white', borderRadius: '8px' }}>
                      <CheckCircle2 size={48} style={{ margin: '0 auto 1rem' }} />
                      ¡Tarjeta guardada con éxito! La página se actualizará en breve...
                    </div>
                  ) : (
                    <div style={{ position: 'relative', backgroundColor: 'white', padding: '1rem', borderRadius: '8px' }}>
                      {isSaving && (
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--pulpos-primary)' }}>
                          <RefreshCw className="animate-spin" size={24} style={{ marginRight: '0.5rem' }} /> Procesando seguridad...
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
                </div>
              )}
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
