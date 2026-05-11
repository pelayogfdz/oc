import React from 'react';
import FabricacionClient from './FabricacionClient';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function FabricacionPage() {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  if (!session?.userId) redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { id: session.userId as string },
    select: { tenantId: true }
  });

  if (!user?.tenantId) redirect('/');

  const processes = await prisma.manufacturingProcess.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { order: 'asc' }
  });

  const recipes = await prisma.recipe.findMany({
    where: { tenantId: user.tenantId },
    include: {
      product: true,
      ingredients: {
        include: {
          product: true
        }
      }
    }
  });

  const branches = await prisma.branch.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true }
  });
  const branchIds = branches.map(b => b.id);

  // Solo cargar insumos y productos finales (los que pueden tener receta o ser ingredientes)
  const products = await prisma.product.findMany({
    where: { branchId: { in: branchIds }, isActive: true },
    select: { id: true, name: true, sku: true, stock: true }
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--pulpos-text)' }}>
        Configuración de Fabricación
      </h1>
      <FabricacionClient 
        initialProcesses={processes} 
        initialRecipes={recipes} 
        products={products}
      />
    </div>
  );
}
