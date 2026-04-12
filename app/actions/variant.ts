'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createVariant(formData: FormData) {
  const productId = formData.get('productId') as string;
  const attribute = formData.get('attribute') as string;
  const sku = formData.get('sku') as string;
  
  if (!productId || !attribute) throw new Error("Atributo requerido");

  await prisma.productVariant.create({
    data: {
      productId,
      attribute,
      sku: sku || undefined
    }
  });

  revalidatePath(`/productos/${productId}`);
}

export async function deleteVariant(formData: FormData) {
  const id = formData.get('variantId') as string;
  const productId = formData.get('productId') as string;
  
  await prisma.productVariant.delete({ where: { id } });
  revalidatePath(`/productos/${productId}`);
}
