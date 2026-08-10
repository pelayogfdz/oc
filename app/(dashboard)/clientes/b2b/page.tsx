import { Suspense } from 'react';
import PortalClient from '@/app/clientes/portal/PortalClient';

export default function Page() {
  return (
    <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--caanma-border)' }}>
      <Suspense fallback={
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--caanma-text-muted)', fontFamily: 'sans-serif' }}>
          Cargando portal...
        </div>
      }>
        <PortalClient defaultTab="loyalty" />
      </Suspense>
    </div>
  );
}