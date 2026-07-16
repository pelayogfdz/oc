'use client';

import { useState, useEffect } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { saveMercadoPagoCard, processManualPayment } from '@/app/actions/subscription';
import { CreditCard, ShieldCheck, CheckCircle2, AlertTriangle, CreditCard as CardIcon, RefreshCw } from 'lucide-react';

interface DiscountResult {
  discountPercent: number;
  seasonName: string | null;
}

function getSubscriptionDiscount(): DiscountResult {
  const today = new Date();
  const month = today.getMonth(); // 0-indexed: Jan is 0, Dec is 11
  const date = today.getDate();

  // Reyes: Jan 1 to Jan 7
  if (month === 0 && date >= 1 && date <= 7) {
    return { discountPercent: 50, seasonName: 'Reyes Magos' };
  }
  // Dia del Amor (Valentine's): Feb 10 to Feb 16
  if (month === 1 && date >= 10 && date <= 16) {
    return { discountPercent: 50, seasonName: 'Día del Amor y la Amistad' };
  }
  // Semana Santa: March 20 to April 10
  if ((month === 2 && date >= 20) || (month === 3 && date <= 10)) {
    return { discountPercent: 50, seasonName: 'Semana Santa' };
  }
  // Dia de la Madre (Mother's Day): May 5 to May 12
  if (month === 4 && date >= 5 && date <= 12) {
    return { discountPercent: 50, seasonName: 'Día de la Madre' };
  }
  // Dia del Padre (Father's Day): June 10 to June 22
  if (month === 5 && date >= 10 && date <= 22) {
    return { discountPercent: 50, seasonName: 'Día del Padre' };
  }
  // 15 de Septiembre (Fiestas Patrias): Sept 10 to Sept 17
  if (month === 8 && date >= 10 && date <= 17) {
    return { discountPercent: 50, seasonName: 'Fiestas Patrias (15 de Septiembre)' };
  }
  // 20 de Noviembre (Revolución Mexicana): Nov 15 to Nov 22
  if (month === 10 && date >= 15 && date <= 22) {
    return { discountPercent: 50, seasonName: 'Revolución Mexicana (20 de Noviembre)' };
  }
  // Navidad (Christmas): Dec 15 to Dec 31
  if (month === 11 && date >= 15) {
    return { discountPercent: 50, seasonName: 'Navidad' };
  }

  // Default annual discount is 30%
  return { discountPercent: 30, seasonName: null };
}

export default function SubscriptionClient({ initialData }: { initialData: any }) {
  const { tenant, userCount, mpPublicKey, basePrice, userPrice } = initialData;
  const [isSaving, setIsSaving] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showCardForm, setShowCardForm] = useState(!tenant.mpCardId);
  const [billingPeriod, setBillingPeriod] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  // Calcular montos
  const actualBasePrice = tenant.customBasePrice !== null ? tenant.customBasePrice : basePrice;
  const actualUserPrice = tenant.customUserPrice !== null ? tenant.customUserPrice : userPrice;
  
  const monthlyTotal = actualBasePrice + (userCount * actualUserPrice);
  
  const discount = getSubscriptionDiscount();
  const annualTotalRaw = monthlyTotal * 12;
  const annualTotalDiscounted = annualTotalRaw * (1 - discount.discountPercent / 100);
  
  // Decide which amount applies
  const selectedPeriodAmount = billingPeriod === 'MONTHLY' ? monthlyTotal : annualTotalDiscounted;
  
  // Gift credits subtraction
  const amountToPay = Math.max(0, selectedPeriodAmount - (tenant.giftCredits || 0));

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
        <CreditCard size={28} color="var(--caanma-primary)" />
        Mi Suscripción
      </h1>
      <p style={{ color: 'var(--caanma-text-muted)', marginBottom: '2rem' }}>
        Gestiona el método de pago automático para el uso del sistema CAANMA PRO.
      </p>

      {/* Billing Period Selector */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: '#f1f5f9', padding: '0.35rem', borderRadius: '9999px', display: 'inline-flex', gap: '0.25rem', border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setBillingPeriod('MONTHLY')}
            style={{
              padding: '0.6rem 1.75rem',
              borderRadius: '9999px',
              border: 'none',
              backgroundColor: billingPeriod === 'MONTHLY' ? 'white' : 'transparent',
              color: billingPeriod === 'MONTHLY' ? 'var(--caanma-text)' : '#64748b',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: billingPeriod === 'MONTHLY' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Pago Mensual
          </button>
          <button
            onClick={() => setBillingPeriod('ANNUAL')}
            style={{
              padding: '0.6rem 1.75rem',
              borderRadius: '9999px',
              border: 'none',
              backgroundColor: billingPeriod === 'ANNUAL' ? 'white' : 'transparent',
              color: billingPeriod === 'ANNUAL' ? 'var(--caanma-text)' : '#64748b',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: billingPeriod === 'ANNUAL' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>Pago Anual</span>
            <span style={{
              fontSize: '0.75rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              fontWeight: 'bold',
              background: discount.seasonName ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : '#22c55e',
              color: 'white'
            }}>
              {discount.seasonName ? `-${discount.discountPercent}% OFF` : `-${discount.discountPercent}%`}
            </span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>Usuarios Activos</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--caanma-text)' }}>{userCount}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>Créditos de Regalo</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>${tenant.giftCredits?.toFixed(2) || '0.00'}</p>
        </div>
        <div style={{ backgroundColor: billingPeriod === 'MONTHLY' ? '#f0f9ff' : '#faf5ff', padding: '1.5rem', borderRadius: '12px', border: billingPeriod === 'MONTHLY' ? '1px solid #bae6fd' : '1px solid #e9d5ff' }}>
          <h3 style={{ fontSize: '0.9rem', color: billingPeriod === 'MONTHLY' ? '#0369a1' : '#6b21a8', marginBottom: '0.5rem' }}>
            {billingPeriod === 'MONTHLY' ? 'Monto a Pagar Mensual' : 'Monto Anual (con Descuento)'}
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: billingPeriod === 'MONTHLY' ? '#0284c7' : '#7e22ce' }}>${amountToPay.toFixed(2)}</p>
        </div>
      </div>

      {/* Payment Method Section */}
      <section style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', position: 'relative' }}>
        
        {!mpPublicKey ? (
          <div style={{ textDecoration: 'center', padding: '2rem 0' }}>
            <AlertTriangle size={48} color="#f59e0b" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Sistema No Disponible</h2>
            <p style={{ color: 'var(--caanma-text-muted)' }}>El administrador del sistema aún no ha configurado el procesador de pagos.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            
            {/* Main Action Area */}
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', color: amountToPay > 0 ? '#b91c1c' : '#16a34a' }}>
                  {amountToPay > 0 ? 'Pago Pendiente' : 'Suscripción al Día'}
                </h2>
                <p style={{ color: 'var(--caanma-text-muted)', marginBottom: '1.5rem' }}>
                  {amountToPay > 0 
                    ? `Tienes un saldo pendiente de $${amountToPay.toFixed(2)} MXN.`
                    : 'No tienes pagos pendientes por el momento. ¡Gracias por usar CAANMA PRO!'}
                </p>
              </div>

              {/* Annual Plan Detail */}
              {billingPeriod === 'ANNUAL' && (
                <div style={{
                  maxWidth: '500px',
                  margin: '0 auto 1.5rem auto',
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f5f3ff, #faf5ff)',
                  border: '1px solid #ddd6fe',
                  textAlign: 'left'
                }}>
                  <h4 style={{ fontWeight: 'bold', color: '#5b21b6', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {discount.seasonName ? '🔥 ¡Temporada Especial Activa!' : '✨ Beneficios del Pago Anual'}
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', color: '#4c1d95', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {discount.seasonName ? (
                      <li>Descuento Especial del <strong>{discount.discountPercent}%</strong> por la temporada de <strong>{discount.seasonName}</strong>.</li>
                    ) : (
                      <li>Ahorra un <strong>{discount.discountPercent}%</strong> en comparación al pago mes a mes.</li>
                    )}
                    <li>Precio regular anual: <span style={{ textDecoration: 'line-through' }}>${(monthlyTotal * 12).toFixed(2)} MXN</span></li>
                    <li>Precio con descuento: <strong>${annualTotalDiscounted.toFixed(2)} MXN</strong></li>
                    <li>Ahorro neto: <strong style={{ color: '#16a34a' }}>${((monthlyTotal * 12) - annualTotalDiscounted).toFixed(2)} MXN</strong></li>
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={async () => {
                    if (!tenant.mpCardId) {
                      alert('Para realizar el pago, primero debes Guardar los Datos de tu Tarjeta de forma segura en la sección inferior.');
                      setShowCardForm(true);
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
                    backgroundColor: (isPaying || amountToPay <= 0) ? '#e2e8f0' : 'var(--caanma-primary)',
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

            <hr style={{ border: 'none', borderTop: '1px dashed var(--caanma-border)' }} />

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
                <div style={{ marginTop: '2rem', padding: '2rem', border: '1px solid var(--caanma-border)', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldCheck size={24} color="#0284c7" /> 
                      Guardar datos en Mercado Pago
                    </h2>
                  </div>
                  <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.95rem', marginBottom: '2rem' }}>
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
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--caanma-primary)' }}>
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
