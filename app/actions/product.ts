'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession, getActiveBranch } from '@/app/actions/auth';

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
  const hasTraceability = formData.get('hasTraceability') === 'true';
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

  // Find tenantId for branchId
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { tenantId: true }
  });
  const tenantId = branch?.tenantId;
  const isTargetTenant = tenantId === '8b52cbcd-c956-4717-a1bd-02e57386aaa2' || tenantId === 'db5d3949-f8dd-41f6-9627-90374d55d044';
  
  let showInWeb = true;
  const showInWebVal = formData.get('showInWeb');
  if (showInWebVal !== null) {
    showInWeb = showInWebVal === 'true';
  } else {
    // Default fallback
    showInWeb = !(isService && isTargetTenant);
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
      expirationDate,
      hasTraceability,
      // @ts-ignore
      showInWeb
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

  // Propagate common details to sibling products in other branches
  const fieldsToPropagate = {
    name,
    barcode,
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
    satKey,
    satUnit,
    expirationDate,
    hasTraceability,
    showInWeb
  };

  await prisma.product.updateMany({
    where: {
      sku: sku,
      id: { not: product.id }
    },
    // @ts-ignore
    data: fieldsToPropagate
  });

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

    const showInWeb = formData.get('showInWeb');
    if (showInWeb !== null) {
      data.showInWeb = showInWeb === 'true';
    }

    const hasTraceability = formData.get('hasTraceability');
    if (hasTraceability !== null) {
      data.hasTraceability = hasTraceability === 'true';
    }

    // Get current product details before update (to find siblings by old SKU)
    const currentProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { sku: true }
    });

    if (Object.keys(data).length > 0) {
      await prisma.product.update({
        where: { id: productId },
        // @ts-ignore
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

      // Propagate common details to sibling products in other branches
      if (currentProduct && currentProduct.sku) {
        // Exclude stock, minStock, branchId, supplierId, id from propagation
        const fieldsToPropagate = { ...data };
        delete fieldsToPropagate.stock;
        delete fieldsToPropagate.minStock;
        delete fieldsToPropagate.branchId;
        delete fieldsToPropagate.supplierId;

        if (Object.keys(fieldsToPropagate).length > 0) {
          await prisma.product.updateMany({
            where: {
              sku: currentProduct.sku,
              id: { not: productId }
            },
            // @ts-ignore
            data: fieldsToPropagate
          });
        }
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
  const isGlobal = branchId === 'GLOBAL';
  let branchCondition: any;

  if (isGlobal) {
    const session = await getSession();
    const activeBranch = await getActiveBranch();
    if (!activeBranch) return [];
    const tenantId = session?.tenantId || activeBranch.tenantId;
    if (!tenantId) return [];

    const tenantBranches = await prisma.branch.findMany({
      where: { tenantId, isActive: true },
      select: { id: true }
    });
    const tenantBranchIds = tenantBranches.map(b => b.id);
    branchCondition = { in: tenantBranchIds };
  } else {
    branchCondition = branchId;
  }

  let products = [];
  if (!query || query.trim() === '') {
    products = await prisma.product.findMany({
      where: { branchId: branchCondition, isActive: true },
      include: { variants: true, prices: true },
      orderBy: { name: 'asc' },
      ...(!isGlobal ? { take: 100 } : {})
    });
  } else {
    const words = query.trim().split(/\s+/).filter(w => w.length > 0);
    const searchConditions = words.map(word => ({
      OR: [
        { name: { contains: word, mode: 'insensitive' as const } },
        { description: { contains: word, mode: 'insensitive' as const } },
        { sku: { contains: word, mode: 'insensitive' as const } },
        { barcode: { contains: word, mode: 'insensitive' as const } }
      ]
    }));

    products = await prisma.product.findMany({
      where: {
        branchId: branchCondition,
        isActive: true,
        AND: searchConditions
      },
      include: { variants: true, prices: true },
      orderBy: { name: 'asc' },
      ...(!isGlobal ? { take: 100 } : {})
    });
  }

  if (isGlobal) {
    const mergedMap = new Map<string, any>();
    products.forEach(prod => {
      const key = ((prod.sku && prod.sku.trim() !== "")
        ? prod.sku.trim()
        : (prod.barcode && prod.barcode.trim() !== "")
          ? prod.barcode.trim()
          : prod.name.trim()).toUpperCase();

      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key);
        existing.stock += prod.stock;
        
        if (prod.variants && prod.variants.length > 0) {
          if (!existing.variants) existing.variants = [];
          prod.variants.forEach((v: any) => {
            const extVar = existing.variants.find((ev: any) => ev.attribute === v.attribute);
            if (extVar) {
              extVar.stock += v.stock;
            } else {
              existing.variants.push({ ...v });
            }
          });
        }
      } else {
        mergedMap.set(key, {
          ...prod,
          variants: prod.variants ? prod.variants.map((v: any) => ({ ...v })) : []
        });
      }
    });

    return Array.from(mergedMap.values()).slice(0, 100);
  }

  return products;
}

export async function deleteProduct(productId: string) {
  try {
    // Para forzar la eliminación, primero borramos el historial de movimientos y dependencias 
    // que puedan causar errores de Foreign Key (Restrict o falta de Cascade).
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar dependencias directas e indirectas que impiden borrar el producto
      await tx.inventoryMovement.deleteMany({ where: { productId } });
      await tx.saleItem.deleteMany({ where: { productId } });
      await tx.quoteItem.deleteMany({ where: { productId } });
      await tx.transferItem.deleteMany({ where: { productId } });
      await tx.purchaseItem.deleteMany({ where: { productId } });
      
      // Borrar de otras recetas donde este producto se use como ingrediente
      await tx.recipeIngredient.deleteMany({ where: { productId } });
      
      // Borrar la receta propia del producto y sus órdenes de producción (si tiene)
      const recipe = await tx.recipe.findUnique({ where: { productId } });
      if (recipe) {
        await tx.productionOrder.deleteMany({ where: { recipeId: recipe.id } });
        await tx.recipe.delete({ where: { id: recipe.id } });
      }

      await tx.fuelTraceability.deleteMany({ where: { productId } });
      await tx.purchaseOrderItem.deleteMany({ where: { productId } });
      await tx.consignmentItem.deleteMany({ where: { productId } });

      // 2. Finalmente borrar el producto
      await tx.product.delete({ where: { id: productId } });
    });
  } catch(e) {
    console.error("Error eliminando producto:", e);
    throw e;
  }
  revalidatePath('/productos');
}
