import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import { notFound } from 'next/navigation';
import EditTransferClient from './EditTransferClient';
import { getBranchSettings } from '@/app/actions/settings';

export const dynamic = 'force-dynamic';

export default async function EditTransferPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const branch = await getActiveBranch();
  if (!branch) return notFound();

  // Find the transfer being edited
  const transfer = await prisma.transfer.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          product: {
            include: { variants: true }
          },
          variant: true
        }
      },
      branch: true,
      toBranch: true
    }
  });

  if (!transfer) return notFound();

  // Security: only the destination (requesting) or origin (sending) branch user can edit
  if (branch.id !== 'GLOBAL' && branch.id !== transfer.branchId && branch.id !== transfer.toBranchId) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #f87171', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>NO AUTORIZADO</h2>
        <p>No tienes permisos para editar este traspaso en esta sucursal.</p>
      </div>
    );
  }

  // Prevent editing received or cancelled transfers
  if (transfer.status === 'RECEIVED' || transfer.status === 'CANCELLED') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fffbeb', borderRadius: '12px', color: '#b45309', border: '1px solid #fcd34d', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>TRASPASO NO EDITABLE</h2>
        <p>Este traspaso ya se encuentra en estado: <strong>{transfer.status === 'RECEIVED' ? 'RECIBIDO' : 'CANCELADO'}</strong> y no se puede modificar.</p>
      </div>
    );
  }

  // All branches except the destination branch of the transfer for selector
  const otherBranches = await prisma.branch.findMany({
    where: { 
      tenantId: branch.tenantId,
      NOT: { id: transfer.toBranchId || '' },
      isActive: true
    }
  });

  // Load destination catalog (the products of transfer.toBranchId) so we search products that belong to destination
  const destinationProducts = await prisma.product.findMany({
    where: { 
      branchId: transfer.toBranchId || '',
      isActive: true
    },
    include: { variants: true },
    orderBy: { updatedAt: 'desc' },
    take: 50
  });

  const settings = await getBranchSettings();
  const ventasConfig = settings.configJson ? JSON.parse(settings.configJson)['ventas'] || {} : {};

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <EditTransferClient 
         transfer={transfer}
         otherBranches={otherBranches}
         inventory={destinationProducts}
         ventasConfig={ventasConfig}
         currentBranchId={branch.id}
      />
    </div>
  );
}
