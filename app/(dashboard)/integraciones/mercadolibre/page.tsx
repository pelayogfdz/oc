import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import { saveIntegrationTokens, deleteIntegration } from '@/app/actions/integration';
import { ArrowLeft, Save, Trash2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import MeliCalculator from './Calculator';

export default async function MercadoLibreConfigPage() {
  const branch = await getActiveBranch();
  
  const integration = await prisma.storeIntegration.findUnique({
    where: { branchId_platform: { branchId: branch.id, platform: 'MERCADO_LIBRE' } }
  });

  const externalMaps = await prisma.externalProductMap.count({
    where: { platform: 'MERCADO_LIBRE', product: { branchId: branch.id } }
  });

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/integraciones" style={{ color: 'var(--pulpos-text-muted)', textDecoration: 'none' }}>
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Configuración de Mercado Libre</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Asocia una cuenta mediante Token para sincronizar ventas y catálogo.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.5rem' }}>
          Credenciales de la API
        </h2>
        <form action={saveIntegrationTokens} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="hidden" name="platform" value="MERCADO_LIBRE" />
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>App ID (Opcional si solo usas Token Personal)</label>
            <input 
              type="text" 
              name="appId"
              defaultValue={integration?.appId || ''}
              placeholder="Ej. 1234567890123"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Client Secret (Opcional)</label>
            <input 
              type="text" 
              name="clientSecret"
              defaultValue={integration?.clientSecret || ''}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--pulpos-primary)' }}>Access Token de Producción (Requerido)</label>
            <input 
              type="text" 
              name="accessToken"
              required
              defaultValue={integration?.accessToken || ''}
              placeholder="APP_USR-xxxxxx-xxxxxx-xxxx..."
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '2px solid var(--pulpos-primary)', backgroundColor: '#f0f9ff' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)' }}>Genera este token desde el portal de desarrolladores de Mercado Libre.</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Save size={18} /> {integration ? 'Actualizar Token' : 'Guardar y Conectar'}
            </button>
            {integration && (
               <button formAction={deleteIntegration} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
                 <Trash2 size={18} /> Desconectar
               </button>
            )}
          </div>
        </form>
      </div>

      {integration && (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Sincronización de Catálogo</h2>
            <div style={{ fontWeight: 'bold', color: '#16a34a', backgroundColor: '#dcfce7', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.875rem' }}>
              {externalMaps} productos empatados
            </div>
          </div>
          
          <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '1.5rem' }}>
            Pulpos descargará tus publicaciones activas. Si un SKU coincide con los tuyos, se empatará automáticamente. 
            Las publicaciones nuevas sin SKU en Pulpos se crearán en el inventario.
          </p>

          <form action="/api/mercadolibre/sync" method="POST">
             <button type="submit" className="btn-secondary" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={18} /> Forzar Sincronización Manual Ahora
             </button>
          </form>

          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Instrucciones para Webhooks (Ventas en tiempo real)</h3>
            <p style={{ fontSize: '0.875rem', color: '#475569' }}>
               Para que tu stock se descuente al vender en ML, entra a tu panel de desarrollador en Mercado Libre y en **Notificaciones (Webhooks)** registra esta URL:
            </p>
            <code style={{ display: 'block', backgroundColor: 'black', color: '#a7f3d0', padding: '0.75rem', borderRadius: '4px', marginTop: '0.5rem', fontSize: '0.875rem' }}>
               https://tu-dominio-pulpos.com/api/mercadolibre/webhook
            </code>
          </div>
        </div>
      )}

      {/* Calculator Section */}
      <MeliCalculator />

    </div>
  );
}
