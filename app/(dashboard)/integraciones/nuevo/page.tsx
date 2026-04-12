import { crudAction } from "@/app/actions/crud";
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default function Nuevo() {
  const saveAction = async (formData: FormData) => {
    'use server';
    await crudAction('storeIntegration', formData);
    redirect('/integraciones');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Link href="/integraciones" style={{ textDecoration: 'none', color: 'var(--pulpos-text-muted)', fontSize: '1.25rem' }}>← Volver</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Ingresar Registro / Integraciones (API)</h1>
      </div>
      <form action={saveAction} className="card" style={{ padding: '2rem' }}>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Plataforma (Ej. MercadoLibre)</label>
          <input type="text" name="name" required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
        </div>
     
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>API Key</label>
          <input type="text" name="key" required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
        </div>
     
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn-primary" style={{ backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}>Guardar</button>
        </div>
      </form>
    </div>
  );
}
