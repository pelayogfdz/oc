'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createVariant(formData: FormData) {
  const productId = formData.get('productId') as string;
  const attribute = formData.get('attribute') as string;
  const sku = formData.get('sku') as string;
  const barcode = formData.get('barcode') as string;
  const priceVal = formData.get('price') ? Number(formData.get('price')) : null;
  const wholesalePriceVal = formData.get('wholesalePrice') ? Number(formData.get('wholesalePrice')) : null;
  const specialPriceVal = formData.get('specialPrice') ? Number(formData.get('specialPrice')) : null;
  const costVal = formData.get('cost') ? Number(formData.get('cost')) : null;
  
  if (!productId || !attribute) throw new Error("Atributo requerido");

  await prisma.productVariant.create({
    data: {
      productId,
      attribute,
      sku: sku || null,
      barcode: barcode || null,
      price: priceVal,
      wholesalePrice: wholesalePriceVal,
      specialPrice: specialPriceVal,
      cost: costVal
    }
  });

  revalidatePath(`/productos/${productId}`);
}

export async function updateVariant(formData: FormData) {
  const id = formData.get('variantId') as string;
  const productId = formData.get('productId') as string;
  const attribute = formData.get('attribute') as string;
  const sku = formData.get('sku') as string;
  const barcode = formData.get('barcode') as string;
  const priceVal = formData.get('price') ? Number(formData.get('price')) : null;
  const wholesalePriceVal = formData.get('wholesalePrice') ? Number(formData.get('wholesalePrice')) : null;
  const specialPriceVal = formData.get('specialPrice') ? Number(formData.get('specialPrice')) : null;
  const costVal = formData.get('cost') ? Number(formData.get('cost')) : null;
  const stockVal = formData.get('stock') ? Number(formData.get('stock')) : 0;

  if (!id || !productId || !attribute) throw new Error("ID, Product ID y Atributo son requeridos");

  await prisma.productVariant.update({
    where: { id },
    data: {
      attribute,
      sku: sku || null,
      barcode: barcode || null,
      price: priceVal,
      wholesalePrice: wholesalePriceVal,
      specialPrice: specialPriceVal,
      cost: costVal,
      stock: stockVal
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
