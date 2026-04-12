'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch } from './auth';

export async function createPromotion(formData: FormData) {
  const branch = await getActiveBranch();
  
  await prisma.promotion.create({
    data: {
      name: formData.get('name') as string,
      type: formData.get('type') as string, // PERCENTAGE, FIXED_DISCOUNT
      value: parseFloat(formData.get('value') as string) || 0,
      active: formData.get('active') === 'on',
      branchId: branch.id
    }
  });

  revalidatePath('/ventas/promociones');
  revalidatePath('/ventas/nueva'); // Update POS immediately
}

export async function togglePromotion(id: string, active: boolean) {
  await prisma.promotion.update({
    where: { id },
    data: { active }
  });
  revalidatePath('/ventas/promociones');
  revalidatePath('/ventas/nueva');
}

export async function deletePromotion(id: string) {
  await prisma.promotion.delete({ where: { id } });
  revalidatePath('/ventas/promociones');
  revalidatePath('/ventas/nueva');
}
