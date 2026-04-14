import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import { notFound } from 'next/navigation';
import TransferDetailClient from './TransferDetailClient';

export default async function TransferDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const branch = await getActiveBranch();
  if (!branch) return notFound();

  const transfer = await prisma.transfer.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          product: true,
          variant: true
        }
      },
      createdBy: true,
      receivedBy: true,
      branch: true,
      toBranch: true
    }
  });

  if (!transfer) return notFound();

  return <TransferDetailClient transfer={transfer} branchId={branch.id} />;
}
