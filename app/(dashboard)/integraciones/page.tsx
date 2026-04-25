import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { ShoppingBag, ChevronRight, Store, Link as LinkIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default async function IntegracionesPage() {
  const branch = await getActiveBranch();
  const data = await prisma.storeIntegration.findMany({ where: { branchId: branch.id } });

  const platforms = [
    { id: 'MERCADO_LIBRE', name: 'Mercado Libre', icon: '🛒', color: '#ffe600', text: '#333' },
    { id: 'AMAZON', name: 'Amazon Seller', icon: '📦', color: '#ff9900', text: '#fff' },
    { id: 'WALMART', name: 'Walmart Marketplace', icon: '🏪', color: '#0071ce', text: '#fff' },
    { id: 'LIVERPOOL', name: 'Liverpool Partners', icon: '🏬', color: '#e10098', text: '#fff' }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '3rem' }}>
         <h1 style={{ fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
           <Store size={36} color="#8b5cf6" /> Hub de Integraciones (Omnicanal)
         </h1>
         <p style={{ color: 'var(--pulpos-text-muted)' }}>Sincroniza inventarios, pedidos y facturación bidireccionalmente con los gigantes del e-commerce.</p>
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 'bold' }}>Canales Conectados ({data.length})</h2>
      {data.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {data.map(conn => {
            const p = platforms.find(px => px.id === conn.platform) || platforms[0];
            return (
              <div key={conn.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderLeft: `4px solid ${p.color}` }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                   <div style={{ fontSize: '2rem' }}>{p.icon}</div>
                   <div>
                     <p style={{ fontWeight: 'bold', margin: '0 0 0.25rem 0' }}>{p.name}</p>
                     <p style={{ fontSize: '0.75rem', color: '#10b981', margin: 0, fontWeight: 'bold' }}>● CONECTADO CORRECTAMENTE</p>
                   </div>
                 </div>
              </div>
            );
          })}
        </div>
      ) : (
         <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '3rem', border: '1px dashed var(--pulpos-border)' }}>
            <p style={{ color: 'var(--pulpos-text-muted)' }}>Aún no tienes canales de venta externos conectados con tu sucursal.</p>
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
             <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ fontSize: '0.875rem', color: 'var(--pulpos-text-muted)', display: 'grid', gap: '0.5rem' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></div> Carga de Stock</div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></div> Descarga de Ventas</div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></div> Emparejador de SKU</div>
               </div>
               
               <Link href={`/integraciones/${p.id}`} className="btn-primary" style={{ textAlign: 'center', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', width: '100%', marginTop: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                  Conectar Canal <ChevronRight size={16}/>
               </Link>
             </div>
           </div>
         ))}
      </div>
    </div>
  );
}