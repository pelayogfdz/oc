import { Suspense } from 'react';
import PortalClient from './PortalClient';

export default function PortalPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)', fontFamily: 'sans-serif' }}>
        Cargando portal de clientes...
      </div>
    }>
      <PortalClient />
    </Suspense>
  );
}