import { crudAction } from "@/app/actions/crud";
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { KeyRound, ShieldAlert } from 'lucide-react';

export default async function NuevoIntegracion({ params }: { params: { platform: string } }) {
  const platform = await params.platform;
  
  const saveAction = async (formData: FormData) => {
    'use server';
    formData.append('name', platform); // StoreIntegrations Action expects 'name' as platform code.
    await crudAction('storeIntegration', formData);
    redirect('/integraciones');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Link href="/integraciones" style={{ textDecoration: 'none', color: 'var(--pulpos-text-muted)', fontSize: '1.25rem' }}>← Cancelar Conexión</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Vincular Plataforma: {platform}</h1>
      </div>

      <div style={{ backgroundColor: '#fffbe1', border: '1px solid #fde047', color: '#854d0e', padding: '1rem', borderRadius: '8px', display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-start' }}>
         <ShieldAlert size={24} style={{ flexShrink: 0 }} />
         <div>
            <p style={{ fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>Seguridad del Token API</p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>Para conectar {platform}, debes extraer las credenciales desde tu panel de desarrollador en el Seller Center e introducirlas exactamente como aparecen. Nunca compartas estos secretos.</p>
         </div>
      </div>

      <form action={saveAction} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>App ID / Client ID *</label>
          <input type="text" name="appId" required placeholder="Ej. 1234567890123456" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>Identificador público de tu aplicación o tienda.</p>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Client Secret / API Key *</label>
          <div style={{ position: 'relative' }}>
             <KeyRound size={20} color="#94a3b8" style={{ position: 'absolute', top: '0.9rem', left: '0.75rem' }} />
             <input type="password" name="clientSecret" required placeholder="********************************" style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>La llave secreta que permite a Pulpos escribir en tu cuenta.</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
           <button className="btn-primary" type="submit" style={{ padding: '0.75rem 3rem', fontSize: '1.1rem', backgroundColor: '#10b981' }}>Crear Vínculo Bidireccional</button>
        </div>
      </form>
    </div>
  );
}