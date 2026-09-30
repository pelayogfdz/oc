import React from 'react';
import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import ComandasClient from './ComandasClient';

export const dynamic = 'force-dynamic';

export default async function ComandasPage() {
  const activeBranch = await getActiveBranch();
  const branchId = activeBranch?.id !== 'GLOBAL' ? activeBranch?.id : undefined;

  const orders = await prisma.restaurantOrder.findMany({
    where: {
      ...(branchId ? { branchId } : {})
    },
    orderBy: { openedAt: 'desc' },
    take: 100,
    include: {
      table: { select: { id: true, name: true } },
      waiter: { select: { id: true, name: true } },
      sale: { select: { id: true, folio: true } },
      items: {
        where: { status: { not: 'CANCELLED' } },
        include: {
          product: { select: { name: true } }
        }
      }
    }
  });

  return (
    <ComandasClient initialOrders={orders as any} />
  );
}
