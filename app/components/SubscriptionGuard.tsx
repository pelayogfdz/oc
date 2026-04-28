'use client';

import { usePathname } from 'next/navigation';
import { ShieldAlert, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function SubscriptionGuard({ 
  children, 
  status, 
  role 
}: { 
  children: React.ReactNode; 
  status: string; 
  role: string;
}) {
  const pathname = usePathname();

  // Allow Super Admins to bypass
  const isSuperAdmin = role === 'SYSADMIN';

  // If status is not PAST_DUE or if the user is a super admin, allow access
  if (status !== 'PAST_DUE' || isSuperAdmin) {
    return <>{children}</>;
  }

  // If status is PAST_DUE, allow them to view the subscription page to pay
  if (pathname.includes('/preferencias/subscripcion')) {
    return <>{children}</>;
  }

  // Otherwise, block access
  const isAdmin = role === 'ADMIN';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#fef2f2', color: '#991b1b', textAlign: 'center', padding: '2rem' }}>
      <ShieldAlert size={64} style={{ marginBottom: '1.5rem' }} />
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Acceso Suspendido</h1>
      
      {isAdmin ? (
        <>
          <p style={{ fontSize: '1.2rem', maxWidth: '600px', marginBottom: '2rem' }}>
            El pago de la suscripción de tu organización no pudo ser procesado o está vencido. 
            Para reanudar el servicio, por favor actualiza tu método de pago.
          </p>
          <Link href="/preferencias/subscripcion" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', backgroundColor: '#dc2626', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem' }}>
            <CreditCard size={20} /> Ir a Pagar Suscripción
          </Link>
        </>
      ) : (
        <p style={{ fontSize: '1.2rem', maxWidth: '600px' }}>
          El acceso a la plataforma está temporalmente suspendido por falta de pago. 
          Por favor, comunícate con el administrador de tu empresa para solucionarlo.
        </p>
      )}
    </div>
  );
}
