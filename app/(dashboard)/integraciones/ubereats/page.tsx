import { prisma } from '@/lib/prisma';
import { getActiveBranch, getActiveUser } from '@/app/actions/auth';
import BackButton from '@/app/components/ui/BackButton';
import { headers } from 'next/headers';
import UberEatsClient from './UberEatsClient';

export default async function UberEatsConfigPage() {
  const branch = await getActiveBranch();
  const user = await getActiveUser();

  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const webhookUrl = `${protocol}://${host}/api/ubereats/webhook`;

  // Fetch integration for this branch
  let integration = await prisma.storeIntegration.findUnique({
    where: { branchId_platform: { branchId: branch.id, platform: 'UBER_EATS' } }
  });

  // Fallback: check if another branch in the same tenant has UBER_EATS credentials
  if (!integration && user?.tenantId) {
    const tenantIntegration = await prisma.storeIntegration.findFirst({
      where: {
        platform: 'UBER_EATS',
        branch: { tenantId: user.tenantId }
      }
    });
    if (tenantIntegration) {
      integration = tenantIntegration;
    }
  }

  // Get tenant branches for store ID mapping
  const tenantBranches = user?.tenantId
    ? await prisma.branch.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      })
    : [{ id: branch.id, name: branch.name }];

  // Fetch mapped products for this branch
  const rawMapped = await prisma.externalProductMap.findMany({
    where: {
      platform: 'UBER_EATS',
      product: { branchId: branch.id }
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
    where: { branchId: branch.id },
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

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <BackButton fallbackHref="/integraciones" label="" iconSize={24} />
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🛵</span> Integración Oficial de Uber Eats
          </h1>
          <p style={{ color: 'var(--caanma-text-muted)' }}>
            Sincroniza pedidos en tiempo real vía Webhooks y actualiza la disponibilidad de existencias de tu menú automáticamente.
          </p>
        </div>
      </div>

      <UberEatsClient
        integration={integration}
        branch={branch}
        tenantBranches={tenantBranches}
        mappedProducts={mappedProducts}
        availableProducts={availableProducts}
        webhookUrl={webhookUrl}
      />
    </div>
  );
}
