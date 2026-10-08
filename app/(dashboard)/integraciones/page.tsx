import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { ShoppingBag, ChevronRight, Store, Link as LinkIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default async function IntegracionesPage() {
  const branch = await getActiveBranch();
  const isGlobal = !branch || branch.id === 'GLOBAL';
  const data = await prisma.storeIntegration.findMany({
    where: isGlobal
      ? (branch?.tenantId ? { branch: { tenantId: branch.tenantId } } : {})
      : { branchId: branch.id },
    include: { branch: true },
    orderBy: { createdAt: 'desc' }
  });

  const platforms = [
    { id: 'MERCADO_LIBRE', name: 'Mercado Libre', slug: 'mercadolibre', icon: '🛒', color: '#ffe600', text: '#333' },
    { id: 'UBER_EATS', name: 'Uber Eats', slug: 'ubereats', icon: '🛵', color: '#06C167', text: '#fff' },
    { id: 'RAPPI', name: 'Rappi', slug: 'rappi', icon: '🍊', color: '#FF441F', text: '#fff' },
    { id: 'AMAZON', name: 'Amazon Seller', slug: 'amazon', icon: '📦', color: '#ff9900', text: '#fff' },
    { id: 'WALMART', name: 'Walmart Marketplace', slug: 'walmart', icon: '🏪', color: '#0071ce', text: '#fff' },
    { id: 'LIVERPOOL', name: 'Liverpool Partners', slug: 'liverpool', icon: '🏬', color: '#e10098', text: '#fff' }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '3rem' }}>
         <h1 style={{ fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
           <Store size={36} color="#8b5cf6" /> Hub de Integraciones (Omnicanal)
         </h1>
         <p style={{ color: 'var(--caanma-text-muted)' }}>Sincroniza inventarios, pedidos y facturación bidireccionalmente con los gigantes del e-commerce y delivery.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 'bold' }}>
          Canales Conectados ({data.length})
        </h2>
        {isGlobal && (
          <span style={{ fontSize: '0.8rem', backgroundColor: '#ede9fe', color: '#6d28d9', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: '600' }}>
            Vista Global (Todas las Sucursales)
          </span>
        )}
      </div>

      {data.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {data.map(conn => {
            const rawPlatform = (conn.platform || '').trim();
            const normalized = rawPlatform.toLowerCase().replace(/[-_]/g, '');
            const p = platforms.find(px => {
              const pxNormId = px.id.toLowerCase().replace(/[-_]/g, '');
              const pxNormSlug = px.slug.toLowerCase().replace(/[-_]/g, '');
              return pxNormId === normalized || pxNormSlug === normalized || normalized.includes(pxNormSlug) || pxNormSlug.includes(normalized);
            }) || {
              id: conn.platform,
              name: conn.platform,
              slug: normalized,
              icon: '🔌',
              color: '#8b5cf6',
              text: '#fff'
            };
            const targetUrl = `/integraciones/${p.slug}${conn.branchId ? `?branchId=${conn.branchId}` : ''}`;
            return (
              <div key={conn.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderLeft: `5px solid ${p.color}`, transition: 'transform 0.15s, box-shadow 0.15s' }}>
                 <Link href={targetUrl} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit', width: '100%' }}>
                   <div style={{ fontSize: '2.2rem' }}>{p.icon}</div>
                   <div style={{ flex: 1, minWidth: 0 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                       <p style={{ fontWeight: 'bold', margin: 0, fontSize: '1.05rem' }}>{p.name}</p>
                       {conn.branch?.name && (
                         <span style={{ fontSize: '0.72rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: '600' }}>
                           🏢 {conn.branch.name}
                         </span>
                       )}
                     </div>
                     <p style={{ fontSize: '0.75rem', color: conn.isActive ? '#10b981' : '#ef4444', margin: 0, fontWeight: 'bold' }}>
                       {conn.isActive ? '● CONECTADO CORRECTAMENTE' : '○ DESCONECTADO'}
                     </p>
                   </div>
                   <ChevronRight size={20} color="#94a3b8" />
                 </Link>
              </div>
            );
          })}
        </div>
      ) : (
         <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '3rem', border: '1px dashed var(--caanma-border)' }}>
            <p style={{ color: 'var(--caanma-text-muted)' }}>Aún no tienes canales de venta externos conectados con tu sucursal.</p>
         </div>
      )}

      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 'bold' }}>Catálogo de Disponibles</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
         {platforms.map(p => (
           <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
             <div style={{ backgroundColor: p.color, color: p.text, padding: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>{p.name}</h3>
                  <p style={{ opacity: 0.9, fontSize: '0.85rem', margin: 0 }}>Sincronización en Tiempo Real</p>
                </div>
                <span style={{ fontSize: '2rem' }}>{p.icon}</span>
             </div>
             <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
               <div style={{ fontSize: '0.875rem', color: 'var(--caanma-text-muted)', display: 'grid', gap: '0.5rem' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></div> Carga de Stock y Precios</div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></div> Descarga Automática de Pedidos</div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></div> Alertas Flotantes con Sonido</div>
               </div>
               
               <Link href={`/integraciones/${p.slug}`} className="btn-primary" style={{ textAlign: 'center', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', width: '100%', marginTop: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                  Administrar Canal <ChevronRight size={16}/>
               </Link>
             </div>
           </div>
         ))}
      </div>
    </div>
  );
}