'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createProduct(formData: FormData) {
  const branchId = formData.get('branchId') as string;
  const sku = formData.get('sku') as string;
  const barcode = (formData.get('barcode') as string) || null;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  
  const price = parseFloat(formData.get('price') as string) || 0;
  const cost = parseFloat(formData.get('cost') as string) || 0;
  const taxRate = parseFloat(formData.get('taxRate') as string) || 16.0;
  
  const category = formData.get('category') as string;
  const brand = formData.get('brand') as string;
  const imageUrl = formData.get('imageUrl') as string;
  const youtubeUrl = formData.get('youtubeUrl') as string;
  const isActive = formData.get('isActive') !== 'false';
  const unit = formData.get('unit') as string || 'Pza';
  const satKey = (formData.get('satKey') as string) || null;
  const satUnit = (formData.get('satUnit') as string) || null;
  
  const hasVariants = formData.get('hasVariants') === '1';
  let variants: any[] = [];
  try {
    if (hasVariants) {
      variants = JSON.parse(formData.get('variantsJson') as string);
    }
  } catch (e) {
    console.error("Failed to parse variants", e);
  }

  let stock = 0;
  if (hasVariants) {
    stock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  } else {
    stock = parseInt(formData.get('stock') as string, 10) || 0;
  }
  
  const minStock = parseInt(formData.get('minStock') as string, 10) || 0;
  const supplierId = (formData.get('supplierId') as string) || null;
  
  if (!sku || !name || !branchId) return;

  const product = await prisma.product.create({
    data: { 
      branchId,
      sku, 
      barcode,
      name, 
      description,
      price,
      cost,
      taxRate,
      brand,
      imageUrl,
      youtubeUrl,
      isActive,
      unit,
      stock,
      minStock,
      supplierId,
      satKey,
      satUnit
    }
  });

  if (hasVariants && variants.length > 0) {
    for (const v of variants) {
      if (v.attribute && v.sku) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            attribute: v.attribute,
            sku: v.sku,
            stock: Number(v.stock) || 0
          }
        });
      }
    }
  }

  if (stock > 0) {
    await prisma.inventoryMovement.create({
      data: {
        productId: product.id,
        type: 'IN',
        quantity: stock,
        reason: hasVariants ? 'Stock Inicial Variantes' : 'Stock Inicial',
      }
    });
  }
  
  // Guardar Precios Dinámicos (Listas de Precios)
  const priceData: { priceListId: string, price: number }[] = [];
  formData.forEach((value, key) => {
    if (key.startsWith('priceList_')) {
      const priceListId = key.replace('priceList_', '');
      const listPrice = parseFloat(value as string);
      if (!isNaN(listPrice)) {
        priceData.push({ priceListId, price: listPrice });
      }
    }
  });

  if (priceData.length > 0) {
    for (const p of priceData) {
      await prisma.productPrice.create({
        data: {
          productId: product.id,
          priceListId: p.priceListId,
          price: p.price
        }
      });
    }
  }

  revalidatePath('/productos');
  redirect('/productos');
}

export async function updateProduct(productId: string, formData: FormData) {
  const branchId = formData.get('branchId') as string;
  const sku = formData.get('sku') as string;
  const barcode = (formData.get('barcode') as string) || null;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  
  const price = parseFloat(formData.get('price') as string) || 0;
  const cost = parseFloat(formData.get('cost') as string) || 0;
  const taxRate = parseFloat(formData.get('taxRate') as string) || 16.0;
  
  const category = formData.get('category') as string;
  const brand = formData.get('brand') as string;
  const imageUrl = formData.get('imageUrl') as string;
  const youtubeUrl = formData.get('youtubeUrl') as string;
  const isActive = formData.get('isActive') !== 'false';
  const unit = formData.get('unit') as string || 'Pza';
  const satKey = (formData.get('satKey') as string) || null;
  const satUnit = (formData.get('satUnit') as string) || null;
  const minStock = parseInt(formData.get('minStock') as string, 10) || 0;
  const supplierId = (formData.get('supplierId') as string) || null;

  if (!sku || !name || !branchId) return;

  await prisma.product.update({
    where: { id: productId },
    data: {
      sku,
      barcode,
      name,
      description,
      price,
      cost,
      taxRate,
      category,
      brand,
      imageUrl,
      youtubeUrl,
      isActive,
      unit,
      minStock,
      supplierId,
      satKey,
      satUnit
    }
  });

  // Upsert dynamic prices
  const keys = Array.from(formData.keys());
  for (const key of keys) {
    if (key.startsWith('priceList_')) {
      const priceListId = key.replace('priceList_', '');
      const listPrice = parseFloat(formData.get(key) as string);
      if (!isNaN(listPrice)) {
        await prisma.productPrice.upsert({
          where: { 
            productId_priceListId: { productId, priceListId }
          },
          create: { productId, priceListId, price: listPrice },
          update: { price: listPrice }
        });
      }
    }
  }

  revalidatePath(`/productos/${productId}`);
  revalidatePath('/productos');
}

export async function searchProducts(query: string, branchId: string) {
  if (!query || query.trim() === '') {
    // Si la barra está vacía, devuelve los primeros 50
    return await prisma.product.findMany({
      where: { branchId, isActive: true },
      include: { variants: true, prices: true },
      take: 50,
      orderBy: { name: 'asc' }
    });
  }

  // Búsqueda desordenada: dividir por espacios y requerir que todas las palabras coincidan en algún campo
  const words = query.trim().split(/\s+/).filter(w => w.length > 0);
  
  const searchConditions = words.map(word => ({
    OR: [
      { name: { contains: word } },
      { sku: { contains: word } },
      { barcode: { contains: word } }
    ]
  }));

  return await prisma.product.findMany({
    where: {
      branchId,
      isActive: true,
      AND: searchConditions
    },
    include: { variants: true, prices: true },
    take: 50, // Límite seguro aunque haya muchos resultados
    orderBy: { name: 'asc' }
  });
}

export async function deleteProduct(productId: string) {
  try {
    // Para forzar la eliminación, primero borramos el historial de movimientos y dependencias 
    // que puedan causar errores de Foreign Key (Restrict o falta de Cascade).
    await prisma.$transaction([
      prisma.inventoryMovement.deleteMany({ where: { productId } }),
      prisma.saleItem.deleteMany({ where: { productId } }),
      prisma.quoteItem.deleteMany({ where: { productId } }),
      prisma.transferItem.deleteMany({ where: { productId } }),
      prisma.purchaseItem.deleteMany({ where: { productId } }),
      // Dependencias con Cascade se borrarán solas, pero el producto base sí se borrará
      prisma.product.delete({ where: { id: productId } })
    ]);
  } catch(e) {
    console.error("Error eliminando producto:", e);
    throw e;
  }
  revalidatePath('/productos');
}
