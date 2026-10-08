import { crudAction } from "@/app/actions/crud";
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { KeyRound, ShieldAlert } from 'lucide-react';
import BackButton from '@/app/components/ui/BackButton';

export default async function NuevoIntegracion({ 
  params,
  searchParams
}: { 
  params: Promise<{ platform: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { platform } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const queryParams = new URLSearchParams();
  for (const [k, v] of Object.entries(resolvedSearchParams)) {
    if (typeof v === 'string') queryParams.set(k, v);
    else if (Array.isArray(v) && v[0]) queryParams.set(k, v[0]);
  }
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  const normalized = (platform || '').toLowerCase().replace(/[-_]/g, '');

  if (normalized.includes('ubereats') || normalized === 'uber') {
    redirect(`/integraciones/ubereats${queryString}`);
  }
  if (normalized.includes('mercadolibre') || normalized === 'meli') {
    redirect(`/integraciones/mercadolibre${queryString}`);
  }
  if (normalized.includes('rappi')) {
    redirect(`/integraciones/rappi${queryString}`);
  }
  if (normalized.includes('amazon')) {
    redirect(`/integraciones/amazon${queryString}`);
  }
  if (normalized.includes('walmart')) {
    redirect(`/integraciones/walmart${queryString}`);
  }
  if (normalized.includes('liverpool')) {
    redirect(`/integraciones/liverpool${queryString}`);
  }
  
  const saveAction = async (formData: FormData) => {
    'use server';
    formData.append('name', platform); // StoreIntegrations Action expects 'name' as platform code.
    await crudAction('storeIntegration', formData);
    redirect('/integraciones');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <BackButton fallbackHref="/integraciones" label="Cancelar Conexión" style={{ fontSize: '1.1rem' }} />
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
          <input type="text" name="appId" required placeholder="Ej. 1234567890123456" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', marginTop: '0.25rem' }}>Identificador público de tu aplicación o tienda.</p>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Client Secret / API Key *</label>
          <div style={{ position: 'relative' }}>
             <KeyRound size={20} color="#94a3b8" style={{ position: 'absolute', top: '0.9rem', left: '0.75rem' }} />
             <input type="password" name="clientSecret" required placeholder="********************************" style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', marginTop: '0.25rem' }}>La llave secreta que permite a Caanma escribir en tu cuenta.</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
           <button className="btn-primary" type="submit" style={{ padding: '0.75rem 3rem', fontSize: '1.1rem', backgroundColor: '#10b981' }}>Crear Vínculo Bidireccional</button>
        </div>
      </form>
    </div>
  );
}