import { prisma } from '@/lib/prisma';
import { getActiveBranch, getActiveUser } from '@/app/actions/auth';
import BackButton from '@/app/components/ui/BackButton';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import UberEatsClient from './UberEatsClient';

interface UberEatsPageProps {
  searchParams?: Promise<{ branchId?: string; tab?: string }>;
}

export default async function UberEatsConfigPage({ searchParams }: UberEatsPageProps) {
  const branch = await getActiveBranch();
  const user = await getActiveUser();

  if (user?.tenantId && user.tenantId !== '0d246cea-0220-4328-92b0-8a1387ce6a6d') {
    redirect('/integraciones');
  }

  const isGlobal = !branch || branch.id === 'GLOBAL';
  const safeBranch = branch || { id: 'GLOBAL', name: 'Todas las Sucursales' };

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedBranchId = resolvedSearchParams.branchId;
  const requestedTab = resolvedSearchParams.tab;

  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const webhookUrl = `${protocol}://${host}/api/ubereats/webhook`;

  // Fetch all integrations for the tenant (supporting UBER_EATS, uber_eats, ubereats)
  const allIntegrations = await prisma.storeIntegration.findMany({
    where: {
      platform: { in: ['UBER_EATS', 'uber_eats', 'ubereats'] },
      ...(user?.tenantId ? { branch: { tenantId: user.tenantId } } : {})
    },
    include: { branch: true },
    orderBy: { branch: { name: 'asc' } }
  });

  // Default integration: requested branch, current branch or first available
  let integration = requestedBranchId
    ? allIntegrations.find(i => i.branchId === requestedBranchId) || null
    : (!isGlobal && branch
        ? allIntegrations.find(i => i.branchId === branch.id) || null
        : (allIntegrations[0] || null));

  // Get tenant branches for store ID mapping
  const tenantBranches = user?.tenantId
    ? await prisma.branch.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      })
    : [{ id: safeBranch.id, name: safeBranch.name }];

  // Fetch mapped products
  const rawMapped = await prisma.externalProductMap.findMany({
    where: {
      platform: { in: ['UBER_EATS', 'uber_eats', 'ubereats'] },
      product: isGlobal
        ? (user?.tenantId ? { branch: { tenantId: user.tenantId } } : {})
        : (branch ? { branchId: branch.id } : {})
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          stock: true
        }
      }
    },
    orderBy: { lastSync: 'desc' }
  });

  const mappedProducts = rawMapped.map(m => ({
    id: m.id,
    externalId: m.externalId,
    syncStatus: m.syncStatus,
    lastSync: m.lastSync.toISOString(),
    product: m.product
  }));

  // Fetch available products to map
  const availableProducts = await prisma.product.findMany({
    where: isGlobal
      ? (user?.tenantId ? { branch: { tenantId: user.tenantId } } : {})
      : (branch ? { branchId: branch.id } : {}),
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      stock: true
    },
    orderBy: { name: 'asc' },
    take: 300
  });

  // Fetch recent Uber Eats orders for this tenant
  const recentOrdersRaw = await prisma.sale.findMany({
    where: {
      ...(isGlobal
        ? (user?.tenantId ? { branch: { tenantId: user.tenantId } } : {})
        : (branch ? { branchId: branch.id } : {})),
      notes: { contains: 'Uber' }
    },
    include: {
      branch: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 30
  });

  const recentOrders = recentOrdersRaw.map(o => ({
    id: o.id,
    folio: o.folio || `UBER-${o.id.substring(0, 6)}`,
    total: o.total,
    createdAt: o.createdAt.toISOString(),
    branchName: o.branch?.name || 'Sucursal',
    customerName: o.customer?.name || 'Cliente Uber Eats',
    customerPhone: o.customer?.phone || null,
    notes: o.notes || '',
    itemsCount: o.items.reduce((s, it) => s + it.quantity, 0),
    items: o.items.map(it => ({
      id: it.id,
      name: it.product?.name || 'Producto',
      quantity: it.quantity,
      price: it.price
    }))
  }));

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <BackButton fallbackHref="/integraciones" label="" iconSize={24} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <span style={{ fontSize: '1.75rem' }}>🛵</span> Integración Oficial de Uber Eats
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a',
              borderRadius: '999px',
              padding: '0.25rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: '700'
            }}>
              🍰 Cliente: {user?.tenant?.name || 'Pizca de Azúcar'} (100% Independiente)
            </span>
          </div>
          <p style={{ color: 'var(--caanma-text-muted)', margin: '0.35rem 0 0 0' }}>
            Sincroniza pedidos en tiempo real vía Webhooks y actualiza la disponibilidad de existencias de tu menú automáticamente.
          </p>
        </div>
      </div>

      <UberEatsClient
        integration={integration}
        allIntegrations={allIntegrations}
        branch={safeBranch}
        tenantBranches={tenantBranches}
        mappedProducts={mappedProducts}
        availableProducts={availableProducts}
        recentOrders={recentOrders}
        webhookUrl={webhookUrl}
        isGlobal={isGlobal}
        initialBranchId={requestedBranchId || integration?.branchId || undefined}
        initialTab={requestedTab as any}
      />
    </div>
  );
}
