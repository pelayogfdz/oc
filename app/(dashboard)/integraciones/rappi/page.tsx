import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import { saveIntegrationTokens, deleteIntegration } from '@/app/actions/integration';
import { ArrowLeft, Save, Trash2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default async function RappiConfigPage() {
  const branch = await getActiveBranch();
  
  const integration = await prisma.storeIntegration.findUnique({
    where: { branchId_platform: { branchId: branch.id, platform: 'RAPPI' } }
  });

  const externalMaps = await prisma.externalProductMap.count({
    where: { platform: 'RAPPI', product: { branchId: branch.id } }
  });

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/integraciones" style={{ color: 'var(--caanma-text-muted)', textDecoration: 'none' }}>
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Configuración de Rappi</h1>
          <p style={{ color: 'var(--caanma-text-muted)' }}>Asocia una cuenta mediante credenciales API para sincronizar inventario de tu menú y pedidos.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>
          Credenciales de la API
        </h2>
        <form action={saveIntegrationTokens} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="hidden" name="platform" value="RAPPI" />
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Client ID / Store ID *</label>
            <input 
              type="text" 
              name="appId"
              required
              defaultValue={integration?.appId || ''}
              placeholder="Ej. store_id_rappi_54321"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>API Key / Client Secret *</label>
            <input 
              type="password" 
              name="clientSecret"
              required
              defaultValue={integration?.clientSecret || ''}
              placeholder="********************************"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Access Token / Webhook Token (Opcional)</label>
            <input 
              type="text" 
              name="accessToken"
              defaultValue={integration?.accessToken || ''}
              placeholder="Ej. rappi_auth_token_string"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#FF441F', border: 'none' }}>
              <Save size={18} /> {integration ? 'Actualizar Credenciales' : 'Guardar y Conectar'}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Sincronización de Catálogo e Inventario</h2>
            <div style={{ fontWeight: 'bold', color: '#FF441F', backgroundColor: '#fff5f2', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.875rem' }}>
              {externalMaps} productos empatados
            </div>
          </div>
          
          <p style={{ color: 'var(--caanma-text-muted)', marginBottom: '1.5rem' }}>
            Caanma sincronizará tus existencias con Rappi. Si el SKU de tu producto local coincide con el SKU en el catálogo de Rappi, los niveles de inventario se mantendrán al día en tiempo real.
          </p>

          <form action="/api/rappi/sync" method="POST">
             <button type="submit" className="btn-secondary" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={18} /> Forzar Sincronización Manual Ahora
             </button>
          </form>

          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Webhook para Pedidos en Tiempo Real (Rappi)</h3>
            <p style={{ fontSize: '0.875rem', color: '#475569' }}>
               Para recibir notificaciones automáticas e instantáneas de ventas de Rappi y descontar del inventario al momento, registra la siguiente URL de Webhook en el portal de partners de Rappi:
            </p>
            <code style={{ display: 'block', backgroundColor: 'black', color: '#a7f3d0', padding: '0.75rem', borderRadius: '4px', marginTop: '0.5rem', fontSize: '0.875rem' }}>
               https://tu-dominio-caanma.com/api/rappi/webhook
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
