import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import { saveIntegrationTokens, deleteIntegration } from '@/app/actions/integration';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import WalmartCalculator from './Calculator';

export default async function WalmartConfigPage() {
  const branch = await getActiveBranch();
  
  const integration: any = await prisma.storeIntegration.findUnique({
    where: { branchId_platform: { branchId: branch.id, platform: 'WALMART' } }
  });

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/integraciones" style={{ color: 'var(--pulpos-text-muted)', textDecoration: 'none' }}>
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Configuración de Walmart</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Mapeo y simulación Marketplace.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.5rem' }}>
          Credenciales de Consola Seller
        </h2>
        <form action={saveIntegrationTokens} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="hidden" name="platform" value="WALMART" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <div>
               <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Client ID</label>
               <input 
                 type="text" name="appId" required defaultValue={integration?.appId || ''}
                 style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
               />
             </div>
             <div>
               <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Client Secret</label>
               <input 
                 type="password" name="clientSecret" required defaultValue={integration?.clientSecret || ''}
                 style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
               />
             </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Save size={18} /> {integration ? 'Actualizar Llaves' : 'Guardar y Conectar'}
            </button>
            {integration && (
               <button formAction={deleteIntegration} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
                 <Trash2 size={18} /> Desconectar
               </button>
            )}
          </div>
        </form>
      </div>

      <WalmartCalculator />
    </div>
  );
}
