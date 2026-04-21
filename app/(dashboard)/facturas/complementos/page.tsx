import * as Icons from 'lucide-react';

export default function PlaceholderPage() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', padding: '4rem 1rem' }}>
      <Icons.Wrench size={64} color="var(--pulpos-primary)" style={{ margin: '0 auto 1.5rem', opacity: 0.5 }} />
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#0f172a' }}>Módulo en Construcción</h1>
      <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>
        Estamos trabajando para traerte esta nueva funcionalidad muy pronto. Por favor regresa más tarde para descubrir las novedades.
      </p>
    </div>
  );
}
