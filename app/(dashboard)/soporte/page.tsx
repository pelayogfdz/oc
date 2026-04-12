import { Construction } from 'lucide-react';

export default function ContactarxaxSoportePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
      <Construction size={64} style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--pulpos-text)', marginBottom: '1rem' }}>Módulo En Construcción</h1>
      <p style={{ fontSize: '1.25rem', maxWidth: '600px' }}>
        El módulo de <strong>Contactar a Soporte</strong> se encuentra en diseño técnico. 
      </p>
    </div>
  );
}
