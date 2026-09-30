import React from 'react';
import { notFound } from 'next/navigation';
import { getBillSummary } from '@/app/actions/restaurantActions';
import { prisma } from '@/lib/prisma';
import CuentaClient from './CuentaClient';

export const dynamic = 'force-dynamic';

export default async function CuentaPage({
  params
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const res = await getBillSummary(orderId);

  if (!res.success || !res.order) {
    notFound();
  }

  // Clientes para asignación de factura si aplica
  const customers = await prisma.customer.findMany({
    where: { branchId: res.order.branchId },
    select: { id: true, name: true, taxId: true },
    orderBy: { name: 'asc' },
    take: 100
  });

  return (
    <CuentaClient
      order={res.order}
      customers={customers}
    />
  );
}
