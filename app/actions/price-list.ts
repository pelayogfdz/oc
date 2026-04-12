'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch } from './auth';
import { revalidatePath } from 'next/cache';

export async function createPriceList(formData: FormData) {
  const branch = await getActiveBranch();
  const name = formData.get('name') as string;
  
  if (!name) throw new Error("Name is required");

  // Límite de 10 listas máximo solicitado por el usuario
  const count = await prisma.priceList.count({ where: { branchId: branch.id } });
  if (count >= 10) throw new Error("Límite máximo de 10 listas de precios alcanzado.");

  const priceList = await prisma.priceList.create({
    data: {
      name,
      branchId: branch.id
    }
  });

  revalidatePath('/preferencias');
}

export async function updatePriceList(formData: FormData) {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  
  await prisma.priceList.update({
    where: { id },
    data: { name }
  });
  
  revalidatePath('/preferencias');
}

export async function deletePriceList(formData: FormData) {
  const id = formData.get('id') as string;
  
  await prisma.priceList.delete({
    where: { id }
  });
  
  revalidatePath('/preferencias');
}
