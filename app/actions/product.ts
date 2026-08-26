'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession, getActiveBranch, getActiveUser } from '@/app/actions/auth';
import { getMergedUserPermissions } from './permissions';
import { hasNodeAccess } from '@/app/config/permissions';
import fs from 'fs';
import path from 'path';

function saveProductImageToFile(productId: string, barcode: string | null | undefined, sku: string | null | undefined, imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  const cleanImage = imageUrl.trim();
  if (!cleanImage) return null;

  if (cleanImage === 'placeholder' || cleanImage === '/placeholder.svg' || cleanImage.endsWith('/placeholders/default.png')) {
    return null;
  }

  if (cleanImage.startsWith('data:image/')) {
    try {
      const match = cleanImage.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const filenameBase = ((barcode || '').trim() || (sku || '').trim() || productId).replace(/[^a-zA-Z0-9-_]/g, '');
        if (filenameBase) {
          const filename = `${filenameBase}.${ext}`;
          const publicDir = path.join(process.cwd(), 'public', 'img', 'products');
          if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
          }
          const filePath = path.join(publicDir, filename);
          fs.writeFileSync(filePath, buffer);
        }
      }
    } catch (e) {}
    return cleanImage;
  }
  return cleanImage;
}

export async function createProduct(prevState: any, formData: FormData) {
  let activeUser = null;
  try {
    activeUser = await getActiveUser();
  } catch (e) {}
  try {
    const branchId = formData.get('branchId') as string;
    const sku = formData.get('sku') as string;
    const barcode = (formData.get('barcode') as string) || null;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const location = (formData.get('location') as string) || null;
    
    const price = parseFloat(formData.get('price') as string) || 0;
    const cost = parseFloat(formData.get('cost') as string) || 0;
    const taxRateRaw = parseFloat(formData.get('taxRate') as string);
    const taxRate = isNaN(taxRateRaw) ? 16.0 : taxRateRaw;
    const taxType = (formData.get('taxType') as string) || 'IVA';
    const iepsRate = parseFloat(formData.get('iepsRate') as string) || 0.0;
  
  const category = formData.get('category') as string;
  const brand = formData.get('brand') as string;
  const imageUrlRaw = formData.get('imageUrl') as string;
  const tempId = Math.random().toString(36).substring(7);
  const imageUrl = saveProductImageToFile(tempId, barcode, sku, imageUrlRaw) || '';
  const youtubeUrl = formData.get('youtubeUrl') as string;
  const isActive = formData.get('isActive') !== 'false';
  const allowProduction = formData.getAll('allowProduction').includes('true');
  const isProductionInput = formData.getAll('isProductionInput').includes('true');
  const isService = formData.getAll('isService').includes('true');
  const hasTraceability = formData.getAll('hasTraceability').includes('true');
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

  // Cross-match check to prevent duplicates in the same branch
  if (barcode) {
    const existingDuplicate = await prisma.product.findFirst({
      where: {
        branchId,
        OR: [
          { barcode },
          { sku: barcode }
        ]
      }
    });
    if (existingDuplicate) {
      return { error: `Ya existe un producto con el código de barras o SKU "${barcode}" (${existingDuplicate.name}) en esta sucursal.` };
    }
  }

  const existingDuplicateSku = await prisma.product.findFirst({
    where: {
      branchId,
      barcode: sku
    }
  });
  if (existingDuplicateSku) {
    return { error: `Ya existe un producto con el código de barras "${sku}" (${existingDuplicateSku.name}) en esta sucursal.` };
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
    showInWeb = formData.getAll('showInWeb').includes('true');
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
      taxType,
      iepsRate,
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
      location,
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
            stock: Number(v.stock) || 0,
            price: v.price !== undefined && v.price !== null && v.price !== '' ? Number(v.price) : null,
            cost: v.cost !== undefined && v.cost !== null && v.cost !== '' ? Number(v.cost) : null
          }
        });
      }
    }
  }

  // Log product creation movement in Kardex
  await prisma.inventoryMovement.create({
    data: {
      productId: product.id,
      type: 'IN',
      quantity: 0,
      reason: 'Creación de Producto',
      userId: activeUser?.id || null
    }
  });

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
              userId: activeUser?.id || null
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
        userId: activeUser?.id || null
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

  if (tenantId) {
    const siblingBranches = await prisma.branch.findMany({
      where: {
        tenantId,
        id: { not: branchId },
        isActive: true
      },
      select: { id: true }
    });
    const siblingBranchIds = siblingBranches.map(b => b.id);

    if (siblingBranches.length > 0) {
      const existingSiblings = await prisma.product.findMany({
        where: {
          sku: sku,
          branchId: { in: siblingBranchIds }
        },
        select: { branchId: true }
      });
      const existingBranchIds = new Set(existingSiblings.map(s => s.branchId));

      for (const sibBranch of siblingBranches) {
        if (!existingBranchIds.has(sibBranch.id)) {
          const sibProduct = await prisma.product.create({
            data: {
              branchId: sibBranch.id,
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
              stock: 0,
              minStock: 0,
              supplierId: null,
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
                    productId: sibProduct.id,
                    attribute: v.attribute,
                    sku: v.sku,
                    stock: 0,
                    price: v.price !== undefined && v.price !== null && v.price !== '' ? Number(v.price) : null,
                    cost: v.cost !== undefined && v.cost !== null && v.cost !== '' ? Number(v.cost) : null
                  }
                });
              }
            }
          }
        }
      }

      // Propagate common details to sibling products in other branches OF THE SAME TENANT
      if (siblingBranchIds.length > 0) {
        await prisma.product.updateMany({
          where: {
            sku: sku,
            branchId: { in: siblingBranchIds },
            id: { not: product.id }
          },
          // @ts-ignore
          data: fieldsToPropagate
        });
      }
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
    console.log(`[DEBUG] updateProduct called for ${productId}`);
    console.log(`[DEBUG] form keys:`, Array.from(formData.keys()));
    const sku = formData.get('sku');
    const name = formData.get('name');
    const price = formData.get('price');
    console.log(`[DEBUG] received sku: ${sku}, name: ${name}, price: ${price}`);

    const currentProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { sku: true, price: true, branchId: true, cost: true, barcode: true }
    });
    if (!currentProduct) return;

    if (sku !== null && !sku) {
      console.log(`[DEBUG] early return because sku is empty`);
      return;
    }
    if (name !== null && !name) {
      console.log(`[DEBUG] early return because name is empty`);
      return;
    }

    const data: any = {};
    if (sku !== null) data.sku = sku as string;
    if (name !== null) data.name = name as string;
    
    const barcode = formData.get('barcode');
    if (barcode !== null) data.barcode = (barcode as string) || null;

    const description = formData.get('description');
    if (description !== null) data.description = (description as string) || null;

    const location = formData.get('location');
    if (location !== null) data.location = (location as string) || null;

    if (price !== null) data.price = parseFloat(price as string) || 0;

    const cost = formData.get('cost');
    if (cost !== null) {
      const parsedCost = parseFloat(cost as string) || 0;
      data.cost = parsedCost;
      data.averageCost = parsedCost;
    }

    const taxRate = formData.get('taxRate');
    if (taxRate !== null) {
      const parsedTax = parseFloat(taxRate as string);
      data.taxRate = isNaN(parsedTax) ? 16.0 : parsedTax;
    }

    const taxType = formData.get('taxType');
    if (taxType !== null) data.taxType = (taxType as string) || 'IVA';

    const iepsRate = formData.get('iepsRate');
    if (iepsRate !== null) data.iepsRate = parseFloat(iepsRate as string) || 0.0;

    const category = formData.get('category');
    if (category !== null) data.category = (category as string) || null;

    const brand = formData.get('brand');
    if (brand !== null) data.brand = (brand as string) || null;

    const imageUrl = formData.get('imageUrl');
    if (imageUrl !== null) {
      const barcodeVal = barcode !== null ? (barcode as string) : (currentProduct.barcode || null);
      const skuVal = sku !== null ? (sku as string) : (currentProduct.sku || null);
      data.imageUrl = saveProductImageToFile(productId, barcodeVal, skuVal, imageUrl as string);
    }

    const youtubeUrl = formData.get('youtubeUrl');
    if (youtubeUrl !== null) data.youtubeUrl = (youtubeUrl as string) || null;

    const isActive = formData.get('isActive');
    if (isActive !== null) data.isActive = isActive !== 'false';

    const allowProduction = formData.get('allowProduction');
    if (allowProduction !== null) data.allowProduction = allowProduction === 'true';

    const isProductionInput = formData.get('isProductionInput');
    if (isProductionInput !== null) data.isProductionInput = isProductionInput === 'true';

    const isService = formData.get('isService');
    if (isService !== null) data.isService = formData.getAll('isService').includes('true');

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
      data.showInWeb = formData.getAll('showInWeb').includes('true');
    }

    const hasTraceability = formData.get('hasTraceability');
    if (hasTraceability !== null) {
      data.hasTraceability = formData.getAll('hasTraceability').includes('true');
    }



    // Cross-match check to prevent duplicates in the same branch during update
    const newBarcode = data.barcode;
    const newSku = data.sku;

    if (newBarcode) {
      const existingDuplicate = await prisma.product.findFirst({
        where: {
          branchId: currentProduct.branchId,
          id: { not: productId },
          OR: [
            { barcode: newBarcode },
            { sku: newBarcode }
          ]
        }
      });
      if (existingDuplicate) {
        throw new Error(`Ya existe un producto con el código de barras o SKU "${newBarcode}" (${existingDuplicate.name}) en esta sucursal.`);
      }
    }

    if (newSku) {
      const existingDuplicateSku = await prisma.product.findFirst({
        where: {
          branchId: currentProduct.branchId,
          id: { not: productId },
          barcode: newSku
        }
      });
      if (existingDuplicateSku) {
        throw new Error(`Ya existe un producto con el código de barras "${newSku}" (${existingDuplicateSku.name}) en esta sucursal.`);
      }
    }

    if (Object.keys(data).length > 0) {
      const updatedProduct = await prisma.product.update({
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

      // Propagate common details to sibling products in other branches OF THE SAME TENANT
      if (currentProduct && currentProduct.sku) {
        const activeBranch = await getActiveBranch();
        const tenantId = activeBranch?.tenantId;
        if (tenantId) {
          const tenantBranches = await prisma.branch.findMany({
            where: { tenantId, isActive: true },
            select: { id: true }
          });
          const siblingBranchIds = tenantBranches.map(b => b.id);

          // Log price changes if public price is modified
          if (data.price !== undefined && currentProduct.price !== data.price) {
            const affectedProducts = await prisma.product.findMany({
              where: {
                sku: currentProduct.sku,
                branchId: { in: siblingBranchIds }
              },
              select: { id: true, branchId: true, price: true }
            });

            for (const p of affectedProducts) {
              if (p.price !== data.price) {
                await prisma.priceChangeLog.create({
                  data: {
                    productId: p.id,
                    oldPrice: p.price,
                    newPrice: data.price,
                    branchId: p.branchId
                  }
                });
              }
            }
          }

          if (siblingBranchIds.length > 0) {
            // Exclude stock, minStock, branchId, supplierId, id from propagation
            const fieldsToPropagate = { ...data };
            delete fieldsToPropagate.stock;
            delete fieldsToPropagate.minStock;
            delete fieldsToPropagate.branchId;
            delete fieldsToPropagate.supplierId;

            // 1. Find branches that already have the product with the OLD SKU
            const siblingsByOldSku = await prisma.product.findMany({
              where: {
                sku: currentProduct.sku,
                branchId: { in: siblingBranchIds },
                id: { not: productId }
              },
              select: { id: true, branchId: true }
            });
            const branchesWithOldSku = new Set(siblingsByOldSku.map(s => s.branchId));

            // 2. Find branches that already have a product with the NEW SKU
            const siblingsByNewSku = await prisma.product.findMany({
              where: {
                sku: updatedProduct.sku,
                branchId: { in: siblingBranchIds },
                id: { not: productId }
              },
              select: { id: true, branchId: true }
            });
            const branchesWithNewSku = new Set(siblingsByNewSku.map(s => s.branchId));

            // 3. Create missing products only in branches that have NEITHER the old SKU nor the new SKU
            for (const bId of siblingBranchIds) {
              if (bId !== updatedProduct.branchId && !branchesWithOldSku.has(bId) && !branchesWithNewSku.has(bId)) {
                await prisma.product.create({
                  data: {
                    branchId: bId,
                    sku: updatedProduct.sku,
                    barcode: updatedProduct.barcode,
                    name: updatedProduct.name,
                    description: updatedProduct.description,
                    price: updatedProduct.price,
                    cost: updatedProduct.cost,
                    taxRate: updatedProduct.taxRate,
                    taxType: updatedProduct.taxType,
                    iepsRate: updatedProduct.iepsRate,
                    brand: updatedProduct.brand,
                    imageUrl: updatedProduct.imageUrl,
                    youtubeUrl: updatedProduct.youtubeUrl,
                    isActive: updatedProduct.isActive,
                    allowProduction: updatedProduct.allowProduction,
                    isProductionInput: updatedProduct.isProductionInput,
                    isService: updatedProduct.isService,
                    unit: updatedProduct.unit,
                    stock: 0,
                    minStock: 0,
                    supplierId: null,
                    satKey: updatedProduct.satKey,
                    satUnit: updatedProduct.satUnit,
                    expirationDate: updatedProduct.expirationDate,
                    hasTraceability: updatedProduct.hasTraceability,
                    // @ts-ignore
                    showInWeb: updatedProduct.showInWeb
                  }
                });
              }
            }

            // 4. Update the products that have the OLD SKU in other branches to the NEW SKU and fields
            if (Object.keys(fieldsToPropagate).length > 0 && siblingsByOldSku.length > 0) {
              await prisma.product.updateMany({
                where: {
                  sku: currentProduct.sku,
                  branchId: { in: siblingBranchIds },
                  id: { not: productId }
                },
                // @ts-ignore
                data: fieldsToPropagate
              });
            }
          }
        }
      }
    }

    // Upsert dynamic prices & propagate to all tenant sibling branches
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

          // Fetch current price list name & product SKU/branch to sync to all sibling branches of the tenant
          const priceListObj = await prisma.priceList.findUnique({
            where: { id: priceListId },
            select: { name: true, branchId: true }
          });

          const currentProd = await prisma.product.findUnique({
            where: { id: productId },
            select: { sku: true, branchId: true }
          });

          if (priceListObj?.name && currentProd?.sku && currentProd.branchId) {
            const currentBranch = await prisma.branch.findUnique({
              where: { id: currentProd.branchId },
              select: { tenantId: true }
            });

            if (currentBranch?.tenantId) {
              const tenantBranches = await prisma.branch.findMany({
                where: { tenantId: currentBranch.tenantId },
                select: { id: true }
              });

              const siblingBranchIds = tenantBranches.map(b => b.id);
              const siblingProducts = await prisma.product.findMany({
                where: {
                  sku: currentProd.sku,
                  branchId: { in: siblingBranchIds },
                  id: { not: productId }
                },
                select: { id: true, branchId: true }
              });

              for (const siblingProd of siblingProducts) {
                let targetPriceList = await prisma.priceList.findFirst({
                  where: {
                    branchId: siblingProd.branchId,
                    name: { equals: priceListObj.name, mode: 'insensitive' }
                  }
                });

                if (!targetPriceList) {
                  targetPriceList = await prisma.priceList.create({
                    data: {
                      branchId: siblingProd.branchId,
                      name: priceListObj.name
                    }
                  });
                }

                await prisma.productPrice.upsert({
                  where: {
                    productId_priceListId: {
                      productId: siblingProd.id,
                      priceListId: targetPriceList.id
                    }
                  },
                  create: {
                    productId: siblingProd.id,
                    priceListId: targetPriceList.id,
                    price: listPrice
                  },
                  update: {
                    price: listPrice
                  }
                });
              }
            }
          }

          if (priceListObj && priceListObj.name.toLowerCase() === 'mercado libre') {
            const maps = await prisma.externalProductMap.findMany({
              where: { productId, platform: 'MERCADO_LIBRE' }
            });

            for (const map of maps) {
              const productCost = currentProduct.cost || 0;
              const comisionMeli = map.comisionMeli || 0;
              const envioMeli = map.envioMeli || 0;
              const retencionMeli = map.retencionMeli || 0;
              const margenDinero = listPrice - productCost - comisionMeli - envioMeli - retencionMeli;
              const margenPorcentaje = listPrice > 0 ? (margenDinero / listPrice) * 100 : 0;

              // Update local map price and margins
              await prisma.externalProductMap.update({
                where: { id: map.id },
                data: {
                  precioMeli: listPrice,
                  margenDinero,
                  margenPorcentaje,
                  lastSync: new Date()
                }
              });

              // Push the new price to Mercado Libre API in real-time
              const { getOrRefreshMeliToken, fetchMeliWithRetry } = await import('@/app/utils/meliToken');
              const token = await getOrRefreshMeliToken(priceListObj.branchId);
              if (token) {
                try {
                  const response = await fetchMeliWithRetry(`https://api.mercadolibre.com/items/${map.externalId}`, {
                    method: 'PUT',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ price: listPrice })
                  });
                  if (!response.ok) {
                    const errBody = await response.json().catch(() => ({}));
                    console.error(`[MELI PRICE SYNC BACK] Error pushing price to ML for ${map.externalId}:`, errBody);
                  } else {
                    console.log(`[MELI PRICE SYNC BACK] Price successfully pushed to ML for ${map.externalId}: ${listPrice}`);
                  }
                } catch (e) {
                  console.error(`[MELI PRICE SYNC BACK] Network error pushing price to ML:`, e);
                }
              }
            }
          }
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

export async function searchProducts(
  query: string,
  branchId: string,
  options?: {
    category?: string;
    status?: string;
    stock?: string;
    image?: string;
    brand?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
) {
  const isGlobal = branchId === 'GLOBAL';
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

  let branchCondition: any;
  if (isGlobal) {
    branchCondition = { in: tenantBranchIds };
  } else {
    branchCondition = branchId;
  }

  // Construir condiciones adicionales de filtros
  const extraConditions: any[] = [];

  // Por defecto, filtramos solo productos activos, a menos que el usuario indique lo contrario
  let isActiveCondition: any = { isActive: true };
  if (options && options.status) {
    if (options.status === 'ACTIVE') {
      isActiveCondition = { isActive: true };
    } else if (options.status === 'INACTIVE') {
      isActiveCondition = { isActive: false };
    } else if (options.status === 'ALL') {
      isActiveCondition = {}; // no agregar filtro para traer activos e inactivos
    }
  }
  extraConditions.push(isActiveCondition);

  if (options) {
    if (options.category && options.category !== 'ALL') {
      extraConditions.push({ category: options.category });
    }

    if (options.stock) {
      if (options.stock === 'IN_STOCK') {
        extraConditions.push({ stock: { gt: 0 }, isService: false });
      } else if (options.stock === 'OUT_OF_STOCK') {
        extraConditions.push({ stock: { lte: 0 }, isService: false });
      } else if (options.stock === 'LOW_STOCK') {
        // Para LOW_STOCK aproximamos con stock <= 5, el cliente terminará de filtrar
        extraConditions.push({ stock: { lte: 5 }, isService: false });
      }
    }

    if (options.image) {
      if (options.image === 'WITH_IMAGE') {
        extraConditions.push({
          AND: [
            { imageUrl: { not: null } },
            { imageUrl: { not: '' } },
            { NOT: { imageUrl: { contains: '.svg', mode: 'insensitive' } } },
            { NOT: { imageUrl: { contains: 'placeholder', mode: 'insensitive' } } }
          ]
        });
      } else if (options.image === 'WITHOUT_IMAGE') {
        extraConditions.push({
          OR: [
            { imageUrl: null },
            { imageUrl: '' },
            { imageUrl: { contains: '.svg', mode: 'insensitive' } },
            { imageUrl: { contains: 'placeholder', mode: 'insensitive' } }
          ]
        });
      }
    }

    if (options.brand && options.brand !== 'ALL') {
      extraConditions.push({ brand: options.brand });
    }

    if (options.type) {
      if (options.type === 'PRODUCT') {
        extraConditions.push({ isService: false });
      } else if (options.type === 'SERVICE') {
        extraConditions.push({ isService: true });
      }
    }
  }

  // Configurar ordenación nativa
  let orderByCondition: any = { name: 'asc' };
  if (options?.sortBy && options?.sortOrder) {
    const field = options.sortBy;
    const order = options.sortOrder;
    if (field === 'name' || field === 'sku' || field === 'price' || field === 'stock' || field === 'createdAt') {
      orderByCondition = { [field]: order };
    }
  }

  const limitCount = isGlobal ? 300 * Math.max(1, tenantBranchIds.length) : 300;

  let products = [];
  if (!query || query.trim() === '') {
    products = await prisma.product.findMany({
      where: { 
        branchId: branchCondition, 
        AND: extraConditions
      },
      include: { variants: true, prices: true, branch: { select: { id: true, name: true } }, externalMaps: true },
      orderBy: orderByCondition,
      take: limitCount
    });
  } else {
    const words = query.trim().split(/\s+/).filter(w => w.length > 0);
    const searchConditions = words.map(word => ({
      OR: [
        { name: { contains: word, mode: 'insensitive' as const } },
        { sku: { contains: word, mode: 'insensitive' as const } },
        { barcode: { contains: word, mode: 'insensitive' as const } },
        { variants: { some: { sku: { contains: word, mode: 'insensitive' as const } } } },
        { variants: { some: { barcode: { contains: word, mode: 'insensitive' as const } } } }
      ]
    }));

    products = await prisma.product.findMany({
      where: {
        branchId: branchCondition,
        AND: [...searchConditions, ...extraConditions]
      },
      include: { variants: true, prices: true, branch: { select: { id: true, name: true } }, externalMaps: true },
      orderBy: orderByCondition,
      take: limitCount
    });
  }

  // Extract unique identifiers to fetch cross-branch stock only for these products
  const productSkus = products.map(p => p.sku).filter((sku): sku is string => typeof sku === 'string' && sku.trim() !== '');
  const productBarcodes = products.map(p => p.barcode).filter((barcode): barcode is string => typeof barcode === 'string' && barcode.trim() !== '');
  const productNames = products.map(p => p.name).filter((name): name is string => typeof name === 'string' && name.trim() !== '');

  const otherBranchStocks = await prisma.product.findMany({
    where: {
      branchId: { in: tenantBranchIds },
      isActive: true,
      OR: [
        { sku: { in: productSkus } },
        { barcode: { in: productBarcodes } },
        { name: { in: productNames } }
      ]
    },
    select: { id: true, sku: true, barcode: true, name: true, stock: true, branchId: true, branch: { select: { name: true } } }
  });

  // Build lookup maps of sku, barcode, and name to list of branch stock objects
  const otherBranchSkuMap = new Map<string, any[]>();
  const otherBranchBarcodeMap = new Map<string, any[]>();
  const otherBranchNameMap = new Map<string, any[]>();

  otherBranchStocks.forEach(prod => {
    if (prod.stock <= 0) return;

    const bsItem = {
      productId: prod.id,
      branchId: prod.branchId,
      branchName: prod.branch?.name || 'Desconocida',
      stock: prod.stock
    };

    if (prod.sku && prod.sku.trim() !== '') {
      const skuKey = prod.sku.trim().toUpperCase();
      if (!otherBranchSkuMap.has(skuKey)) otherBranchSkuMap.set(skuKey, []);
      otherBranchSkuMap.get(skuKey)!.push(bsItem);
    }
    if (prod.barcode && prod.barcode.trim() !== '') {
      const barcodeKey = prod.barcode.trim().toUpperCase();
      if (!otherBranchBarcodeMap.has(barcodeKey)) otherBranchBarcodeMap.set(barcodeKey, []);
      otherBranchBarcodeMap.get(barcodeKey)!.push(bsItem);
    }
    if (prod.name && prod.name.trim() !== '') {
      const nameKey = prod.name.trim().toUpperCase();
      if (!otherBranchNameMap.has(nameKey)) otherBranchNameMap.set(nameKey, []);
      otherBranchNameMap.get(nameKey)!.push(bsItem);
    }
  });

  // Helper function to resolve branch stocks for a given product
  const getBranchStocksForProduct = (prod: any) => {
    const matchedProductsMap = new Map<string, any>(); // Map productId -> bsItem to avoid counting the same product record twice

    if (prod.sku && prod.sku.trim() !== '') {
      const skuKey = prod.sku.trim().toUpperCase();
      const skuMatches = otherBranchSkuMap.get(skuKey);
      if (skuMatches) {
        skuMatches.forEach(m => matchedProductsMap.set(m.productId, m));
      }
    }
    if (prod.barcode && prod.barcode.trim() !== '') {
      const barcodeKey = prod.barcode.trim().toUpperCase();
      const barcodeMatches = otherBranchBarcodeMap.get(barcodeKey);
      if (barcodeMatches) {
        barcodeMatches.forEach(m => matchedProductsMap.set(m.productId, m));
      }
    }
    // Only fall back to name match if we have no SKU and no barcode
    const hasSkuOrBarcode = (prod.sku && prod.sku.trim() !== '') || (prod.barcode && prod.barcode.trim() !== '');
    if (!hasSkuOrBarcode && prod.name && prod.name.trim() !== '') {
      const nameKey = prod.name.trim().toUpperCase();
      const nameMatches = otherBranchNameMap.get(nameKey);
      if (nameMatches) {
        nameMatches.forEach(m => matchedProductsMap.set(m.productId, m));
      }
    }

    // Now group the unique matched products by branchId to sum up stock
    const branchMerged = new Map<string, { branchId: string; branchName: string; stock: number }>();
    matchedProductsMap.forEach(item => {
      // Exclude current branch if not GLOBAL
      if (branchId !== 'GLOBAL' && item.branchId === branchId) return;

      const existing = branchMerged.get(item.branchId);
      if (existing) {
        existing.stock += item.stock;
      } else {
        branchMerged.set(item.branchId, {
          branchId: item.branchId,
          branchName: item.branchName,
          stock: item.stock
        });
      }
    });

    return Array.from(branchMerged.values());
  };

  if (isGlobal) {
    const mergedMap = new Map<string, any>();
    products.forEach(prod => {
      const codeKey = ((prod.sku && prod.sku.trim() !== "")
        ? prod.sku.trim()
        : (prod.barcode && prod.barcode.trim() !== "")
          ? prod.barcode.trim()
          : prod.id).toUpperCase();
      const key = `${prod.name.trim().toUpperCase()}_${codeKey}`;

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

        if (prod.externalMaps && prod.externalMaps.length > 0) {
          if (!existing.externalMaps) existing.externalMaps = [];
          prod.externalMaps.forEach((em: any) => {
            if (!existing.externalMaps.some((x: any) => x.id === em.id)) {
              existing.externalMaps.push({ ...em });
            }
          });
        }
      } else {
        mergedMap.set(key, {
          ...prod,
          variants: prod.variants ? prod.variants.map((v: any) => ({ ...v })) : [],
          externalMaps: prod.externalMaps ? prod.externalMaps.map((em: any) => ({ ...em })) : []
        });
      }
    });

    const mergedList = Array.from(mergedMap.values()).map(prod => {
      return {
        ...prod,
        branchStocks: getBranchStocksForProduct(prod)
      };
    });
    await enrichProductsWithTenantExternalMaps(mergedList, tenantBranchIds);
    return mergedList;
  }

  // If specific branch is selected, filter matching tenant products to only display those belonging to this branch
  const localProducts = products.filter(p => p.branchId === branchId);
  const localList = localProducts.map(prod => {
    return {
      ...prod,
      branchStocks: getBranchStocksForProduct(prod)
    };
  });
  await enrichProductsWithTenantExternalMaps(localList, tenantBranchIds);
  return localList;
}

export async function deleteProduct(productId: string) {
  const permData = await getMergedUserPermissions();
  const userPermissions = permData.permissions || {};
  const isSuperAdmin = permData.success ? permData.isSuperAdmin : false;
  const userRole = permData.success ? permData.role : 'USER';

  if (!hasNodeAccess(userPermissions, 'inv_delete', isSuperAdmin, userRole)) {
    throw new Error('No tienes permisos para eliminar productos.');
  }

  try {
    const productToDelete = await prisma.product.findUnique({
      where: { id: productId },
      select: { sku: true, branchId: true }
    });

    if (!productToDelete) return;

    // Obtener la sucursal para determinar el tenantId
    const branch = await prisma.branch.findUnique({
      where: { id: productToDelete.branchId },
      select: { tenantId: true }
    });

    const tenantId = branch?.tenantId;

    if (tenantId && productToDelete.sku) {
      // Encontrar todos los productos con el mismo SKU en las sucursales del tenant
      const siblingBranches = await prisma.branch.findMany({
        where: { tenantId, isActive: true },
        select: { id: true }
      });
      const siblingBranchIds = siblingBranches.map(b => b.id);

      const productsToClear = await prisma.product.findMany({
        where: {
          sku: productToDelete.sku,
          branchId: { in: siblingBranchIds }
        },
        select: { id: true }
      });

      const productIdsToClear = productsToClear.map(p => p.id);

      // Check if any of these products have historical transactions
      const hasHistory = await prisma.$transaction(async (tx) => {
        const saleCount = await tx.saleItem.count({ where: { productId: { in: productIdsToClear } } });
        if (saleCount > 0) return true;

        const consignmentCount = await tx.consignmentItem.count({ where: { productId: { in: productIdsToClear } } });
        if (consignmentCount > 0) return true;

        const purchaseCount = await tx.purchaseItem.count({ where: { productId: { in: productIdsToClear } } });
        if (purchaseCount > 0) return true;

        const transferCount = await tx.transferItem.count({ where: { productId: { in: productIdsToClear } } });
        if (transferCount > 0) return true;

        const quoteCount = await tx.quoteItem.count({ where: { productId: { in: productIdsToClear } } });
        if (quoteCount > 0) return true;

        return false;
      });

      if (hasHistory) {
        throw new Error('Este producto tiene historial de transacciones (ventas, cotizaciones, compras, consignaciones o traspasos) y no puede ser eliminado permanentemente. Te recomendamos desactivarlo (marcarlo como inactivo) desde la edición del producto para conservar el historial contable.');
      }

      // Eliminar dependencias y productos en lote
      await prisma.$transaction(async (tx) => {
        await tx.quoteItem.deleteMany({ where: { productId: { in: productIdsToClear } } });
        await tx.recipeIngredient.deleteMany({ where: { productId: { in: productIdsToClear } } });
        
        const recipes = await tx.recipe.findMany({ where: { productId: { in: productIdsToClear } } });
        if (recipes.length > 0) {
          const recipeIds = recipes.map(r => r.id);
          await tx.productionOrder.deleteMany({ where: { recipeId: { in: recipeIds } } });
          await tx.recipe.deleteMany({ where: { id: { in: recipeIds } } });
        }

        await tx.product.deleteMany({ where: { id: { in: productIdsToClear } } });
      });
    } else {
      // Check if product has historical transactions
      const hasHistory = await prisma.$transaction(async (tx) => {
        const saleCount = await tx.saleItem.count({ where: { productId } });
        if (saleCount > 0) return true;

        const consignmentCount = await tx.consignmentItem.count({ where: { productId } });
        if (consignmentCount > 0) return true;

        const purchaseCount = await tx.purchaseItem.count({ where: { productId } });
        if (purchaseCount > 0) return true;

        const transferCount = await tx.transferItem.count({ where: { productId } });
        if (transferCount > 0) return true;

        const quoteCount = await tx.quoteItem.count({ where: { productId } });
        if (quoteCount > 0) return true;

        return false;
      });

      if (hasHistory) {
        throw new Error('Este producto tiene historial de transacciones (ventas, cotizaciones, compras, consignaciones o traspasos) y no puede ser eliminado permanentemente. Te recomendamos desactivarlo (marcarlo como inactivo) desde la edición del producto para conservar el historial contable.');
      }

      // Eliminar solo el producto individual si no hay SKU o tenant
      await prisma.$transaction(async (tx) => {
        await tx.quoteItem.deleteMany({ where: { productId } });
        await tx.recipeIngredient.deleteMany({ where: { productId } });
        
        const recipe = await tx.recipe.findUnique({ where: { productId } });
        if (recipe) {
          await tx.productionOrder.deleteMany({ where: { recipeId: recipe.id } });
          await tx.recipe.delete({ where: { id: recipe.id } });
        }

        await tx.product.delete({ where: { id: productId } });
      });
    }
  } catch(e) {
    console.error("Error eliminando producto:", e);
    throw e;
  }
  revalidatePath('/productos');
}

export async function getPriceChangesInLast24Hours() {
  try {
    const activeBranch = await getActiveBranch();
    if (!activeBranch || activeBranch.id === 'GLOBAL') {
      return [];
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const changes = await prisma.priceChangeLog.findMany({
      where: {
        branchId: activeBranch.id,
        createdAt: {
          gte: twentyFourHoursAgo
        }
      },
      include: {
        product: {
          select: {
            name: true,
            sku: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return changes.map(c => ({
      id: c.id,
      productId: c.productId,
      name: c.product.name,
      sku: c.product.sku,
      oldPrice: c.oldPrice,
      newPrice: c.newPrice,
      createdAt: c.createdAt
    }));
  } catch (error) {
    console.error("Error in getPriceChangesInLast24Hours:", error);
    return [];
  }
}

export async function getProductBranchStocks(params: {
  productId: string;
  sku: string | null;
  barcode: string | null;
  name: string;
  variantId: string | null;
  attribute: string | null;
  currentBranchId: string;
}) {
  const session = await getSession();
  const activeBranch = await getActiveBranch();
  if (!activeBranch) return [];
  const tenantId = session?.tenantId || activeBranch.tenantId;
  if (!tenantId) return [];

  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true }
  });

  let attributeToMatch = params.attribute;
  if (params.variantId && !attributeToMatch) {
    try {
      const dbVar = await prisma.productVariant.findUnique({
        where: { id: params.variantId },
        select: { attribute: true }
      });
      if (dbVar) {
        attributeToMatch = dbVar.attribute;
      }
    } catch (e) {
      console.error("Error resolving variant attribute:", e);
    }
  }

  const orConditions: any[] = [];
  if (params.sku && params.sku.trim() !== '') {
    orConditions.push({ sku: params.sku });
  }
  if (params.barcode && params.barcode.trim() !== '') {
    orConditions.push({ barcode: params.barcode });
  }
  if (orConditions.length === 0) {
    orConditions.push({ name: params.name });
  }

  const products = await prisma.product.findMany({
    where: {
      branchId: { in: tenantBranches.map(b => b.id) },
      isActive: true,
      OR: orConditions
    },
    include: {
      variants: true
    }
  });

  const branchStocks = tenantBranches.map(b => {
    const branchProds = products.filter(p => p.branchId === b.id);
    
    let totalStock = 0;
    if (attributeToMatch) {
      branchProds.forEach(p => {
        const matchingVar = p.variants.find(v => v.attribute.toLowerCase() === attributeToMatch!.toLowerCase());
        if (matchingVar) {
          totalStock += matchingVar.stock;
        }
      });
    } else {
      totalStock = branchProds.reduce((sum, p) => sum + p.stock, 0);
    }

    return {
      branchId: b.id,
      branchName: b.name,
      stock: totalStock,
      isCurrent: b.id === params.currentBranchId
    };
  });

  return branchStocks;
}

export async function getProductCategoriesAndBrands(branchId: string) {
  try {
    const isGlobal = branchId === 'GLOBAL';
    let branchCondition: any = branchId;
    if (isGlobal) {
      const activeBranch = await getActiveBranch();
      if (!activeBranch) return { success: false, categories: [], brands: [] };
      const tenantBranches = await prisma.branch.findMany({
        where: { tenantId: activeBranch.tenantId, isActive: true },
        select: { id: true }
      });
      branchCondition = { in: tenantBranches.map(b => b.id) };
    }

    const [categoriesData, brandsData] = await Promise.all([
      prisma.product.groupBy({
        by: ['category'],
        where: {
          branchId: branchCondition,
          isActive: true,
          category: { not: null }
        }
      }),
      prisma.product.groupBy({
        by: ['brand'],
        where: {
          branchId: branchCondition,
          isActive: true,
          brand: { not: null }
        }
      })
    ]);

    const categories = categoriesData
      .map(c => c.category?.trim())
      .filter((c): c is string => !!c && c !== '')
      .sort((a, b) => a.localeCompare(b));

    const brands = brandsData
      .map(b => b.brand?.trim())
      .filter((b): b is string => !!b && b !== '')
      .sort((a, b) => a.localeCompare(b));

    return {
      success: true,
      categories,
      brands
    };
  } catch (error: any) {
    console.error('Error fetching categories and brands:', error);
    return { success: false, categories: [], brands: [], error: error.message };
  }
}

export async function syncTenantCatalogs(tenantId: string) {
  try {
    // 1. Obtener todas las sucursales activas del tenant
    const branches = await prisma.branch.findMany({
      where: { tenantId, isActive: true },
      select: { id: true }
    });

    if (branches.length <= 1) return { success: true, message: "Solo hay una sucursal, no se requiere sincronización." };

    const branchIds = branches.map(b => b.id);

    // 2. Obtener todos los productos del tenant en estas sucursales
    const allProducts = await prisma.product.findMany({
      where: { branchId: { in: branchIds } },
      include: {
        variants: true,
        prices: true
      }
    });

    // 3. Agrupar productos por SKU
    const productsBySku: Record<string, typeof allProducts> = {};
    for (const p of allProducts) {
      if (!p.sku) continue;
      if (!productsBySku[p.sku]) {
        productsBySku[p.sku] = [];
      }
      productsBySku[p.sku].push(p);
    }

    let createdCount = 0;

    // 4. Asegurar que cada SKU exista en todas las sucursales
    for (const [sku, prods] of Object.entries(productsBySku)) {
      const existingBranchIds = new Set(prods.map(p => p.branchId));
      const missingBranchIds = branchIds.filter(id => !existingBranchIds.has(id));

      if (missingBranchIds.length > 0) {
        // Usar el primer producto encontrado como plantilla/representativo
        const template = prods[0];

        for (const missingBranchId of missingBranchIds) {
          // Crear el producto en la sucursal faltante
          const newProduct = await prisma.product.create({
            data: {
              branchId: missingBranchId,
              sku: template.sku,
              barcode: template.barcode,
              name: template.name,
              description: template.description,
              price: template.price,
              cost: template.cost,
              taxRate: template.taxRate,
              taxType: template.taxType,
              iepsRate: template.iepsRate,
              brand: template.brand,
              imageUrl: template.imageUrl,
              youtubeUrl: template.youtubeUrl,
              isActive: template.isActive,
              allowProduction: template.allowProduction,
              isProductionInput: template.isProductionInput,
              isService: template.isService,
              unit: template.unit,
              stock: 0, // Stock inicial en 0
              minStock: 0,
              supplierId: null,
              satKey: template.satKey,
              satUnit: template.satUnit,
              expirationDate: template.expirationDate,
              location: template.location,
              hasTraceability: template.hasTraceability,
              // @ts-ignore
              showInWeb: template.showInWeb
            }
          });

          // Copiar variantes
          if (template.variants && template.variants.length > 0) {
            for (const v of template.variants) {
              await prisma.productVariant.create({
                data: {
                  productId: newProduct.id,
                  attribute: v.attribute,
                  sku: v.sku,
                  stock: 0,
                  price: v.price,
                  cost: v.cost
                }
              });
            }
          }

          // Copiar precios dinámicos
          if (template.prices && template.prices.length > 0) {
            for (const p of template.prices) {
              await prisma.productPrice.create({
                data: {
                  productId: newProduct.id,
                  priceListId: p.priceListId,
                  price: p.price
                }
              });
            }
          }

          createdCount++;
        }
      }
    }

    console.log(`[CATALOG SYNC] Sincronización finalizada. Creados ${createdCount} productos faltantes en el tenant ${tenantId}.`);
    return { success: true, createdCount };
  } catch (error) {
    console.error("[CATALOG SYNC] Error en syncTenantCatalogs:", error);
    return { success: false, error };
  }
}

export async function syncCatalogAction() {
  const session = await getSession();
  const tenantId = session?.tenantId;
  if (!tenantId) {
    return { success: false, error: 'No autorizado' };
  }
  return await syncTenantCatalogs(tenantId);
}

export async function createProductInline(data: {
  sku: string;
  name: string;
  barcode?: string;
  category?: string;
  brand?: string;
  unit?: string;
  price?: number;
  cost?: number;
  branchId: string;
}) {
  try {
    const { sku, name, barcode, category, brand, unit, price = 0, cost = 0, branchId } = data;

    if (!sku || !name || !branchId) {
      return { error: "Faltan campos obligatorios (SKU, Nombre o Sucursal)." };
    }

    const cleanSku = sku.trim();
    const cleanBarcode = barcode ? barcode.trim() : cleanSku;

    // Duplicates check
    const existing = await prisma.product.findFirst({
      where: {
        branchId,
        OR: [
          { sku: cleanSku },
          { barcode: cleanBarcode }
        ]
      }
    });

    if (existing) {
      return { error: `Ya existe un producto con el SKU o código de barras "${cleanSku}" en esta sucursal.` };
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { tenantId: true }
    });
    const tenantId = branch?.tenantId;

    const product = await prisma.product.create({
      data: {
        branchId,
        sku: cleanSku,
        barcode: cleanBarcode,
        name: name.trim(),
        category: category || 'VARIOS',
        brand: brand || 'GENERICO',
        unit: unit || 'Pieza',
        price,
        cost,
        isActive: true,
        stock: 0,
        minStock: 0
      }
    });

    // Sibling replication
    if (tenantId) {
      const siblingBranches = await prisma.branch.findMany({
        where: {
          tenantId,
          id: { not: branchId },
          isActive: true
        },
        select: { id: true }
      });

      for (const sib of siblingBranches) {
        // Check if exists
        const sibExists = await prisma.product.findFirst({
          where: { sku: cleanSku, branchId: sib.id }
        });
        if (!sibExists) {
          await prisma.product.create({
            data: {
              branchId: sib.id,
              sku: cleanSku,
              barcode: cleanBarcode,
              name: name.trim(),
              category: category || 'VARIOS',
              brand: brand || 'GENERICO',
              unit: unit || 'Pieza',
              price,
              cost,
              isActive: true,
              stock: 0,
              minStock: 0
            }
          });
        }
      }
    }

    return { success: true, product };
  } catch (error: any) {
    console.error("Error in createProductInline:", error);
    return { error: error.message || "Error desconocido al crear producto." };
  }
}

export async function enrichProductsWithTenantExternalMaps(products: any[], tenantBranchIds: string[]) {
  const skus = products.map(p => p.sku).filter((sku): sku is string => typeof sku === 'string' && sku.trim() !== '');
  if (skus.length === 0) return products;

  try {
    const externalMaps = await prisma.externalProductMap.findMany({
      where: {
        product: {
          sku: { in: skus },
          branchId: { in: tenantBranchIds }
        }
      },
      include: {
        product: {
          select: {
            sku: true
          }
        }
      }
    });

    const mapsBySku = new Map<string, any[]>();
    externalMaps.forEach(map => {
      const sku = map.product?.sku?.trim();
      if (sku) {
        if (!mapsBySku.has(sku)) {
          mapsBySku.set(sku, []);
        }
        mapsBySku.get(sku)!.push(map);
      }
    });

    products.forEach(prod => {
      const sku = prod.sku?.trim();
      if (sku && mapsBySku.has(sku)) {
        const tenantMaps = mapsBySku.get(sku)!;
        if (!prod.externalMaps) {
          prod.externalMaps = [];
        }
        tenantMaps.forEach(map => {
          if (!prod.externalMaps.some((em: any) => em.id === map.id)) {
            prod.externalMaps.push(map);
          }
        });
      }
    });
  } catch (e) {
    console.error('Error enriching products with tenant external maps:', e);
  }

  return products;
}

export async function updateProductMedia(productId: string, imageUrl: string, youtubeUrl?: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { sku: true, branchId: true, barcode: true }
    });

    if (!product) {
      return { success: false, error: 'Producto no encontrado.' };
    }

    let cleanImage = saveProductImageToFile(productId, product.barcode, product.sku, imageUrl);
    const cleanYoutube = youtubeUrl ? youtubeUrl.trim() : null;

    // Update target product media
    await prisma.product.update({
      where: { id: productId },
      data: {
        imageUrl: cleanImage,
        youtubeUrl: cleanYoutube
      }
    });

    // Sync media across all tenant branch sibling products with same SKU
    if (product.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: product.branchId },
        select: { tenantId: true }
      });

      if (branch?.tenantId) {
        const tenantBranches = await prisma.branch.findMany({
          where: { tenantId: branch.tenantId },
          select: { id: true }
        });

        if (tenantBranches.length > 0) {
          await prisma.product.updateMany({
            where: {
              sku: product.sku,
              branchId: { in: tenantBranches.map(b => b.id) }
            },
            data: {
              imageUrl: cleanImage,
              youtubeUrl: cleanYoutube
            }
          });
        }
      }
    }

    revalidatePath(`/productos/${productId}`);
    revalidatePath('/productos');
    return { success: true, imageUrl: cleanImage };
  } catch (err: any) {
    console.error('Error in updateProductMedia:', err);
    return { success: false, error: err.message || 'No se pudo guardar la multimedia del producto.' };
  }
}

