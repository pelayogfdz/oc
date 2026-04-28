'use client';

import { useState, useEffect } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { saveMercadoPagoCard } from '@/app/actions/subscription';
import { CreditCard, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function SubscriptionClient({ initialData }: { initialData: any }) {
  const { tenant, userCount, mpPublicKey } = initialData;
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Usuarios Activos</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--pulpos-text)' }}>{userCount}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Créditos de Regalo</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>${tenant.giftCredits?.toFixed(2) || '0.00'}</p>
        </div>
      </div>

      {/* Payment Method Section */}
      <section style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)', position: 'relative' }}>
        
        {tenant.mpCardId ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle2 size={48} color="#16a34a" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Método de Pago Activo</h2>
            <p style={{ color: 'var(--pulpos-text-muted)' }}>Tu tarjeta está registrada de forma segura para los cobros mensuales.</p>
          </div>
        ) : !mpPublicKey ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <AlertTriangle size={48} color="#f59e0b" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Sistema No Disponible</h2>
            <p style={{ color: 'var(--pulpos-text-muted)' }}>El administrador del sistema aún no ha configurado el procesador de pagos.</p>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} color="#16a34a" /> 
              Registrar Tarjeta para Cobros
            </h2>
            <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              Al ingresar tu tarjeta, se realizarán cobros automáticos al finalizar cada mes basados en tu cantidad de usuarios. Tus datos están protegidos por Mercado Pago.
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
                    Procesando y guardando tarjeta...
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
                        theme: 'default', // or 'dark'
                      }
                    }
                  }}
                />
              </div>
            )}
          </>
        )}
      </section>

    </div>
  );
}
