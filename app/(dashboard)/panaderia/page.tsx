import React from 'react';
import PanaderiaClient from './PanaderiaClient';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function PanaderiaPage() {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  if (!session?.userId) redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { id: session.userId as string },
    select: { tenantId: true, branchId: true }
  });

  if (!user?.tenantId || !user?.branchId) redirect('/');

  const processes = await prisma.manufacturingProcess.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { order: 'asc' }
  });

  const recipes = await prisma.recipe.findMany({
    where: { tenantId: user.tenantId },
    include: {
      product: true
    }
  });

  const orders = await prisma.productionOrder.findMany({
    where: { branchId: user.branchId },
    include: {
      recipe: {
        include: {
          product: true,
          ingredients: {
            include: {
              product: true
            }
          }
        }
      },
      currentProcess: true,
      user: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--pulpos-text)' }}>
        Panel de Producción (Panadería)
      </h1>
      <PanaderiaClient 
        processes={processes} 
        recipes={recipes} 
        initialOrders={orders} 
      />
    </div>
  );
}
