'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createProduct(prevState: any, formData: FormData) {
  try {
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
  const allowProduction = formData.get('allowProduction') === 'true';
  const isProductionInput = formData.get('isProductionInput') === 'true';
  const isService = formData.get('isService') === 'true';
  const unit = formData.get('unit') as string || 'Pza';
  const satKey = (formData.get('satKey') as string) || null;
  const satUnit = (formData.get('satUnit') as string) || null;
  const expirationDateStr = formData.get('expirationDate') as string;
  const expirationDate = isService ? null : (expirationDateStr ? new Date(expirationDateStr) : null);
  
  const hasVariants = formData.get('hasVariants') === '1';
  let variants: any[] = [];
  try {
    if (hasVariants) {
      variants = JSON.parse(formData.get('variantsJson') as string);
    }
  } catch (e) {
    console.error("Failed to parse variants", e);
  }

  const hasBatches = formData.get('hasBatches') === '1';
  let batches: any[] = [];
  try {
    if (hasBatches) {
      batches = JSON.parse(formData.get('batchesJson') as string);
    }
  } catch (e) {
    console.error("Failed to parse batches", e);
  }

  let stock = 0;
  if (isService) {
    stock = 0;
  } else if (hasVariants) {
    stock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  } else if (hasBatches) {
    stock = batches.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);
  } else {
    stock = parseInt(formData.get('stock') as string, 10) || 0;
  }
  
  const minStock = isService ? 0 : (parseInt(formData.get('minStock') as string, 10) || 0);
  const supplierId = (formData.get('supplierId') as string) || null;
  
  if (!sku || !name || !branchId) {
     return { error: "Faltan campos obligatorios (SKU, Nombre o Sucursal)." };
  }

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
      allowProduction,
      isProductionInput,
      isService,
      unit,
      stock,
      minStock,
      supplierId,
      satKey,
      satUnit,
      expirationDate
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

  if (hasBatches && batches.length > 0) {
    for (const b of batches) {
      if (b.batchNumber && b.expirationDate) {
        const batch = await prisma.productBatch.create({
          data: {
            productId: product.id,
            batchNumber: b.batchNumber,
            expirationDate: new Date(b.expirationDate),
            stock: Number(b.stock) || 0,
            cost: cost
          }
        });
        
        if (batch.stock > 0) {
          await prisma.inventoryMovement.create({
            data: {
              productId: product.id,
              batchId: batch.id,
              type: 'IN',
              quantity: batch.stock,
              reason: 'Stock Inicial (Lote)',
            }
          });
        }
      }
    }
  }

  if (stock > 0 && !hasBatches) {
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

  } catch (error: any) {
    console.error("Error creating product:", error);
    return { error: "Error al crear el producto. Verifique si el SKU ya existe." };
  }

  revalidatePath('/productos');
  redirect('/productos');
}

export async function updateProduct(productId: string, formData: FormData) {
  try {
    const sku = formData.get('sku');
    const name = formData.get('name');

    if (sku !== null && !sku) return;
    if (name !== null && !name) return;

    const data: any = {};
    if (sku !== null) data.sku = sku as string;
    if (name !== null) data.name = name as string;
    
    const barcode = formData.get('barcode');
    if (barcode !== null) data.barcode = (barcode as string) || null;

    const description = formData.get('description');
    if (description !== null) data.description = (description as string) || null;

    const price = formData.get('price');
    if (price !== null) data.price = parseFloat(price as string) || 0;

    const cost = formData.get('cost');
    if (cost !== null) data.cost = parseFloat(cost as string) || 0;

    const taxRate = formData.get('taxRate');
    if (taxRate !== null) data.taxRate = parseFloat(taxRate as string) || 16.0;

    const category = formData.get('category');
    if (category !== null) data.category = (category as string) || null;

    const brand = formData.get('brand');
    if (brand !== null) data.brand = (brand as string) || null;

    const imageUrl = formData.get('imageUrl');
    if (imageUrl !== null) data.imageUrl = (imageUrl as string) || null;

    const youtubeUrl = formData.get('youtubeUrl');
    if (youtubeUrl !== null) data.youtubeUrl = (youtubeUrl as string) || null;

    const isActive = formData.get('isActive');
    if (isActive !== null) data.isActive = isActive !== 'false';

    const allowProduction = formData.get('allowProduction');
    if (allowProduction !== null) data.allowProduction = allowProduction === 'true';

    const isProductionInput = formData.get('isProductionInput');
    if (isProductionInput !== null) data.isProductionInput = isProductionInput === 'true';

    const isService = formData.get('isService');
    if (isService !== null) data.isService = isService === 'true';

    const unit = formData.get('unit');
    if (unit !== null) data.unit = (unit as string) || 'Pza';

    const minStock = formData.get('minStock');
    if (minStock !== null) {
      data.minStock = data.isService ? 0 : (parseInt(minStock as string, 10) || 0);
    }

    const supplierId = formData.get('supplierId');
    if (supplierId !== null) data.supplierId = (supplierId as string) || null;

    const satKey = formData.get('satKey');
    if (satKey !== null) data.satKey = (satKey as string) || null;

    const satUnit = formData.get('satUnit');
    if (satUnit !== null) data.satUnit = (satUnit as string) || null;

    const expirationDateStr = formData.get('expirationDate');
    if (expirationDateStr !== null) {
      data.expirationDate = data.isService ? null : ((expirationDateStr as string) ? new Date(expirationDateStr as string) : null);
    }

    if (data.isService) {
      data.stock = 0;
    }

    if (Object.keys(data).length > 0) {
      await prisma.product.update({
        where: { id: productId },
        data
      });

      if (data.isService) {
        await prisma.productVariant.updateMany({
          where: { productId },
          data: { stock: 0 }
        });
        await prisma.productBatch.updateMany({
          where: { productId },
          data: { stock: 0 }
        });
      }
    }

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
  } catch (error) {
    console.error("Error updating product:", error);
    throw new Error("No se pudieron guardar los cambios. Verifique si el SKU ya existe en esta sucursal.");
  }
  redirect('/productos');
}

export async function searchProducts(query: string, branchId: string) {
  if (!query || query.trim() === '') {
    return await prisma.product.findMany({
      where: { branchId, isActive: true },
      include: { variants: true, prices: true },
      orderBy: { name: 'asc' },
      take: 100
    });
  }

  // Búsqueda desordenada: dividir por espacios y requerir que todas las palabras coincidan en algún campo
  const words = query.trim().split(/\s+/).filter(w => w.length > 0);
  
  const searchConditions = words.map(word => ({
    OR: [
      { name: { contains: word, mode: 'insensitive' as const } },
      { description: { contains: word, mode: 'insensitive' as const } },
      { sku: { contains: word, mode: 'insensitive' as const } },
      { barcode: { contains: word, mode: 'insensitive' as const } }
    ]
  }));

  return await prisma.product.findMany({
    where: {
      branchId,
      isActive: true,
      AND: searchConditions
    },
    include: { variants: true, prices: true },
    orderBy: { name: 'asc' },
    take: 100
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
