import { prisma } from '@/lib/prisma';
import { getActiveBranch, getActiveUser, getTenantBranches } from '@/app/actions/auth';
import { saveIntegrationTokens, deleteIntegration } from '@/app/actions/integration';
import { ArrowLeft, Save, Trash2, RefreshCw, ExternalLink, Info } from 'lucide-react';
import Link from 'next/link';
import MeliCalculator from './Calculator';
import MeliQuestions from './MeliQuestions';
import { headers } from 'next/headers';
import MeliCatalogTable from './MeliCatalogTable';

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    success?: string;
    search?: string;
  }>;
}

export default async function MercadoLibreConfigPage({ searchParams }: PageProps) {
  const branch = await getActiveBranch();
  const user = await getActiveUser();
  if (!user || !user.tenantId) {
    throw new Error('Tenant context missing. Authorization violation.');
  }

  const resolvedSearchParams = await searchParams;
  const activeTab = resolvedSearchParams.tab || 'config';
  const search = resolvedSearchParams.search || '';
  
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/mercadolibre/callback`;

  // Obtener todas las sucursales del tenant
  const tenantBranchesList = await prisma.branch.findMany({
    where: { tenantId: user.tenantId, isActive: true },
    select: { id: true }
  });
  const tenantBranchIds = tenantBranchesList.map(b => b.id);

  let integration = await prisma.storeIntegration.findUnique({
    where: { branchId_platform: { branchId: branch.id, platform: 'MERCADO_LIBRE' } }
  });

  console.log('[MELI PAGE] Resolved branch:', branch.id, branch.name);
  console.log('[MELI PAGE] Initial integration:', integration ? { id: integration.id, appId: integration.appId } : 'NULL');

  // Si la sucursal actual no está conectada pero el tenant tiene una integración activa en alguna sucursal
  if (!integration) {
    const tenantIntegration = await prisma.storeIntegration.findFirst({
      where: {
        platform: 'MERCADO_LIBRE',
        branchId: { in: tenantBranchIds }
      }
    });
    console.log('[MELI PAGE] Tenant integration fallback check:', tenantIntegration ? { id: tenantIntegration.id, appId: tenantIntegration.appId } : 'NULL');
    if (tenantIntegration) {
      integration = tenantIntegration;
    }
  }

  // 1. Obtener todas las vinculaciones activas para el tenant (todas las sucursales)
  const linkedMaps = await prisma.externalProductMap.findMany({
    where: { 
      platform: 'MERCADO_LIBRE', 
      product: { 
        branchId: { in: tenantBranchIds },
        isActive: true
      } 
    },
    include: { product: true }
  });

  // 2. Obtener productos no vinculados (limitado o según búsqueda para evitar error P2035)
  const unlinkedProducts = await prisma.product.findMany({
    where: {
      branchId: { in: tenantBranchIds },
      isActive: true,
      externalMaps: {
        none: { platform: 'MERCADO_LIBRE' }
      },
      OR: search ? [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ] : undefined
    },
    take: search ? 500 : 150, // Más amplio si están buscando activamente
    orderBy: { name: 'asc' }
  });

  // 3. Unificar ambas listas
  const catalogList = [
    ...linkedMaps.map(map => ({
      id: map.id,
      productId: map.productId,
      platform: 'MERCADO_LIBRE',
      externalId: map.externalId,
      syncStatus: map.syncStatus || 'active',
      precioMeli: map.precioMeli,
      comisionMeli: map.comisionMeli || 0,
      envioMeli: map.envioMeli || 0,
      retencionMeli: map.retencionMeli || 0,
      margenDinero: map.margenDinero,
      margenPorcentaje: map.margenPorcentaje,
      isFixedPrice: !!map.isFixedPrice,
      product: map.product
    })),
    ...unlinkedProducts.map(p => ({
      id: `unlinked-${p.id}`,
      productId: p.id,
      platform: 'MERCADO_LIBRE',
      externalId: '',
      syncStatus: 'unlinked',
      precioMeli: null,
      comisionMeli: 0,
      envioMeli: 0,
      retencionMeli: 0,
      margenDinero: null,
      margenPorcentaje: null,
      isFixedPrice: false,
      product: p
    }))
  ];

  const branches = await getTenantBranches(user.tenantId);

  // Extraer configuración de margen desde metadatos
  let targetMargin = 20;
  let shippingCost = 115;
  let listingType = 0.15;
  let hasTaxRetention = true;
  let satRetentionPct = 10.5;
  let stockBranchIds: string[] = [];
  let mainSaleBranchId = branch.id;
  
  if (integration?.metadata) {
    try {
      const meta = JSON.parse(integration.metadata);
      if (meta.targetMargin !== undefined) targetMargin = Number(meta.targetMargin);
      if (meta.shippingCost !== undefined) shippingCost = Number(meta.shippingCost);
      if (meta.listingType !== undefined) listingType = Number(meta.listingType);
      if (meta.hasTaxRetention !== undefined) hasTaxRetention = Boolean(meta.hasTaxRetention);
      if (meta.satRetentionPct !== undefined) satRetentionPct = Number(meta.satRetentionPct);
      if (meta.stockBranchIds !== undefined) stockBranchIds = meta.stockBranchIds;
      if (meta.mainSaleBranchId !== undefined) mainSaleBranchId = String(meta.mainSaleBranchId);
    } catch {}
  }

  const calculateSuggestedPrice = (cost: number) => {
    const retentionRate = hasTaxRetention ? (satRetentionPct / 100) : 0;
    const denominator = 1 - listingType - retentionRate - (targetMargin / 100);
    if (denominator <= 0) return 0;
    return (shippingCost + cost) / denominator;
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/integraciones" style={{ color: 'var(--caanma-text-muted)', textDecoration: 'none' }}>
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Panel de Mercado Libre</h1>
          <p style={{ color: 'var(--caanma-text-muted)' }}>Administra tu sincronización, margen de ganancias, publicaciones y preguntas de clientes.</p>
        </div>
      </div>

      {resolvedSearchParams.success === 'connected' && (
        <div className="card" style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', marginBottom: '2rem', fontWeight: 'bold' }}>
          ¡Cuenta de Mercado Libre conectada y vinculada por OAuth 2.0 exitosamente!
        </div>
      )}

      {/* Tabs Navigation */}
      {integration && (
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--caanma-border)', marginBottom: '2rem', overflowX: 'auto' }}>
          <Link 
            href="?tab=config" 
            style={{ 
              padding: '0.75rem 1rem', 
              color: activeTab === 'config' ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)', 
              fontWeight: 'bold', 
              textDecoration: 'none',
              borderBottom: activeTab === 'config' ? '3px solid var(--caanma-primary)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            ⚙️ Configuración y Margen
          </Link>
          <Link 
            href="?tab=catalogo" 
            style={{ 
              padding: '0.75rem 1rem', 
              color: activeTab === 'catalogo' ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)', 
              fontWeight: 'bold', 
              textDecoration: 'none',
              borderBottom: activeTab === 'catalogo' ? '3px solid var(--caanma-primary)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            📦 Catálogo Vinculado ({catalogList.filter(c => c.syncStatus !== 'unlinked').length})
          </Link>
          <Link 
            href="?tab=preguntas" 
            style={{ 
              padding: '0.75rem 1rem', 
              color: activeTab === 'preguntas' ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)', 
              fontWeight: 'bold', 
              textDecoration: 'none',
              borderBottom: activeTab === 'preguntas' ? '3px solid var(--caanma-primary)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            💬 Preguntas de Clientes
          </Link>
        </div>
      )}

      {/* Tab: Configuración y Margen */}
      {activeTab === 'config' && (
        <div>
          <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>
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
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Client Secret (Opcional)</label>
                <input 
                  type="text" 
                  name="clientSecret"
                  defaultValue={integration?.clientSecret || ''}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--caanma-primary)' }}>Access Token de Producción (Requerido)</label>
                <input 
                  type="text" 
                  name="accessToken"
                  required
                  defaultValue={integration?.accessToken || ''}
                  placeholder="APP_USR-xxxxxx-xxxxxx-xxxx..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '2px solid var(--caanma-primary)', backgroundColor: '#f0f9ff' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--caanma-text-muted)' }}>Genera este token desde el portal de desarrolladores de Mercado Libre.</span>
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

            {integration?.appId && integration?.clientSecret && (
              <div style={{ marginTop: '1.5rem', padding: '1.25rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#166534', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>🔌 Flujo de Autorización OAuth 2.0</span>
                  {integration.accessToken && (
                    <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: '#16a34a', color: 'white', fontWeight: 'bold', marginLeft: '0.5rem' }}>
                      CONECTADO
                    </span>
                  )}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#1e3f20', marginBottom: '1rem' }}>
                  Para que Caanma pueda renovar tus tokens automáticamente de por vida, haz clic en el siguiente botón para iniciar el proceso de vinculación oficial con Mercado Libre.
                </p>
                <a 
                  href={`https://auth.mercadolibre.com.mx/authorization?response_type=code&client_id=${integration.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${branch.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#16a34a',
                    color: 'white',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  🔄 Vincular con Mercado Libre ahora
                </a>
              </div>
            )}
          </div>

          <MeliCalculator 
             branches={branches}
             initialConfig={{ 
               targetMargin, 
               shippingCost, 
               listingType, 
               hasTaxRetention,
               satRetentionPct,
               stockBranchIds,
               mainSaleBranchId
             }} 
           />
        </div>
      )}

      {/* Tab: Catálogo Vinculado */}
      {activeTab === 'catalogo' && integration && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Sincronización de Catálogo</h2>
              <div style={{ fontWeight: 'bold', color: '#16a34a', backgroundColor: '#dcfce7', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.875rem' }}>
                {catalogList.filter(c => c.syncStatus !== 'unlinked').length} productos empatados
              </div>
            </div>
            
            <p style={{ color: 'var(--caanma-text-muted)', marginBottom: '1.5rem' }}>
              Caanma descarga tus publicaciones activas. Si un SKU coincide con los tuyos, se empata automáticamente. 
              Las publicaciones nuevas sin SKU en Caanma se crearán en el inventario.
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
                 https://caanma.com/api/mercadolibre/webhooks
              </code>
            </div>
          </div>

          {/* Tabla de Productos Vinculados */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Listado de Vinculaciones, Costos y Precios Editables</h2>
            </div>

            {/* Buscador de productos locales para vincular */}
            <form action="" method="GET" style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem' }}>
              <input type="hidden" name="tab" value="catalogo" />
              <input 
                type="text" 
                name="search" 
                placeholder="Buscar producto en Caanma para publicar / vincular (nombre o SKU)..." 
                defaultValue={search}
                style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', fontSize: '0.875rem' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1.5rem', fontWeight: 'bold' }}>Buscar</button>
              {search && (
                <Link href="?tab=catalogo" className="btn-secondary" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontWeight: 'bold' }}>
                  Limpiar
                </Link>
              )}
            </form>
            
            {catalogList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--caanma-text-muted)' }}>
                No tienes productos en Caanma actualmente.
              </div>
            ) : (
              <MeliCatalogTable initialMaps={catalogList} />
            )}
          </div>
        </div>
      )}

      {/* Tab: Centro de Preguntas */}
      {activeTab === 'preguntas' && integration && (
        <MeliQuestions />
      )}
    </div>
  );
}
