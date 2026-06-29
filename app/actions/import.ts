'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function importProducts(records: any[]) {
  const branch = await getActiveBranch();
  if (!branch) {
    throw new Error('No se encontró una sucursal activa.');
  }
  const user = await getActiveUser();
  
  if (!records || records.length === 0) {
    throw new Error('El archivo CSV está vacío o es inválido');
  }

  // Fetch sister branches of the same tenant to propagate updates
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId: branch.tenantId, id: { not: branch.id } },
    select: { id: true }
  });
  const sisterBranchIds = tenantBranches.map(b => b.id);

  let importedCount = 0;
  let updatedCount = 0;

  for (const row of records) {
    // Required fields mapping
    const sku = row.sku?.trim();
    if (!sku) continue; 
    
    const name = row.name?.trim() || 'Sin Nombre';
    const price = parseFloat(row.price) || 0;
    const cost = parseFloat(row.cost) || 0;
    const stock = parseInt(row.stock) || 0;
    const barcode = row.barcode?.trim() || null;
    const wholesalePrice = parseFloat(row.wholesalePrice) || null;
    const specialPrice = parseFloat(row.specialPrice) || null;

    // Extra fields
    const description = row.description?.trim() || null;
    const taxRate = parseFloat(row.taxRate) || 16.0;
    const category = row.category?.trim() || 'General';
    const brand = row.brand?.trim() || 'Genérica';
    const imageUrl = row.imageUrl?.trim() || null;
    const youtubeUrl = row.youtubeUrl?.trim() || null;
    const unit = row.unit?.trim() || 'Pza';
    const minStock = parseInt(row.minStock) || 0;
    const satKey = row.satKey?.trim() || null;
    const satUnit = row.satUnit?.trim() || null;

    // Parse isActive
    let isActive = true;
    if (row.isActive !== undefined && row.isActive !== null) {
      const activeStr = String(row.isActive).trim().toLowerCase();
      if (activeStr === 'false' || activeStr === 'no' || activeStr === '0' || activeStr === 'inactivo') {
        isActive = false;
      }
    }

    // Parse showInWeb
    let showInWeb: boolean | undefined = undefined;
    const showInWebVal = row.showInWeb !== undefined ? row.showInWeb : (row.mostrarEnWeb !== undefined ? row.mostrarEnWeb : row.mostrar_en_web);
    if (showInWebVal !== undefined && showInWebVal !== null) {
      const showStr = String(showInWebVal).trim().toLowerCase();
      showInWeb = !(showStr === 'false' || showStr === 'no' || showStr === '0' || showStr === 'ocultar' || showStr === 'inactivo');
    }

    // Parse Supplier by Name or ID
    let supplierId = row.supplierId?.trim() || null;
    if (!supplierId && row.supplierName?.trim()) {
      const supName = row.supplierName.trim();
      const existingSupplier = await prisma.supplier.findFirst({
        where: {
          branch: {
            tenantId: branch.tenantId
          },
          name: { equals: supName, mode: 'insensitive' }
        }
      });
      if (existingSupplier) {
        supplierId = existingSupplier.id;
      } else {
        // Create supplier automatically to be user-friendly
        const newSup = await prisma.supplier.create({
          data: { branchId: branch.id, name: supName }
        });
        supplierId = newSup.id;
      }
    }

    // Parse Batch Information (supports multiple aliases)
    const batchNumber = (row.batchNumber || row.lote)?.trim();
    const expirationDateStr = (row.expirationDate || row.caducidad || row.expiration || row.fecha_caducidad)?.trim();

    let expirationDate: Date | null = null;
    if (expirationDateStr) {
      const [day, month, year] = expirationDateStr.split('/');
      if (year && month && day) {
        expirationDate = new Date(`${year.length === 2 ? '20' + year : year}-${month}-${day}`);
      } else {
        expirationDate = new Date(expirationDateStr);
      }
      if (isNaN(expirationDate.getTime())) {
        expirationDate = null;
      }
    }

    // Check if Product exists (by SKU or by Barcode if provided)
    const existing = await prisma.product.findFirst({
      where: {
        OR: [
          { sku },
          ...(barcode ? [
            { barcode },
            { sku: barcode }
          ] : []),
          { barcode: sku }
        ],
        branchId: branch.id
      }
    });

    let productObj;

    if (existing) {
      // Log price changes if public price is modified
      if (existing.price !== price) {
        await prisma.priceChangeLog.create({
          data: {
            productId: existing.id,
            oldPrice: existing.price,
            newPrice: price,
            branchId: branch.id
          }
        });

        // Log for sister branches too
        if (sisterBranchIds.length > 0) {
          const sisterProducts = await prisma.product.findMany({
            where: { sku: existing.sku, branchId: { in: sisterBranchIds } },
            select: { id: true, branchId: true, price: true }
          });
          for (const sp of sisterProducts) {
            if (sp.price !== price) {
              await prisma.priceChangeLog.create({
                data: {
                  productId: sp.id,
                  oldPrice: sp.price,
                  newPrice: price,
                  branchId: sp.branchId
                }
              });
            }
          }
        }
      }

      // Update existing product
      productObj = await prisma.product.update({
        where: { id: existing.id },
        data: {
          sku,
          name,
          price,
          cost,
          barcode,
          wholesalePrice,
          specialPrice,
          description,
          taxRate,
          category,
          brand,
          imageUrl,
          youtubeUrl,
          unit,
          minStock,
          satKey,
          satUnit,
          isActive,
          supplierId,
          expirationDate: expirationDate || undefined,
          // @ts-ignore
          showInWeb: showInWeb !== undefined ? showInWeb : undefined
        }
      });

      // Propagate update to sister branches
      if (sisterBranchIds.length > 0) {
        await prisma.product.updateMany({
          where: { sku: existing.sku, branchId: { in: sisterBranchIds } },
          data: {
            sku,
            name,
            price,
            cost,
            barcode,
            wholesalePrice,
            specialPrice,
            description,
            taxRate,
            category,
            brand,
            imageUrl,
            youtubeUrl,
            unit,
            satKey,
            satUnit,
            isActive,
            // @ts-ignore
            showInWeb: showInWeb !== undefined ? showInWeb : undefined
          }
        });
      }

      // Handle main stock movement if no batches are being imported
      if (!batchNumber && stock !== existing.stock) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { stock }
        });
        const diff = stock - existing.stock;
        await prisma.inventoryMovement.create({
          data: {
            productId: existing.id,
            type: diff > 0 ? 'IN' : 'OUT',
            quantity: Math.abs(diff),
            reason: 'Actualización por Importación CSV',
            userId: user.id
          }
        });
      }
      updatedCount++;
    } else {
      // Create new product in current branch
      productObj = await prisma.product.create({
        data: {
          branchId: branch.id,
          sku,
          barcode,
          name,
          price,
          cost,
          stock: batchNumber ? 0 : stock, // If batches exist, stock will be calculated from batches below
          wholesalePrice,
          specialPrice,
          description,
          taxRate,
          category,
          brand,
          imageUrl,
          youtubeUrl,
          unit,
          minStock,
          satKey,
          satUnit,
          isActive,
          supplierId,
          expirationDate,
          // @ts-ignore
          showInWeb: showInWeb !== undefined ? showInWeb : true
        }
      });

      // Create or update product in sister branches to keep catalogs aligned
      for (const sisterId of sisterBranchIds) {
        const sisterExisting = await prisma.product.findFirst({
          where: { sku, branchId: sisterId }
        });
        if (!sisterExisting) {
          await prisma.product.create({
            data: {
              branchId: sisterId,
              sku,
              barcode,
              name,
              price,
              cost,
              stock: 0, // Stock is branch-specific, default to 0 for sister branches
              wholesalePrice,
              specialPrice,
              description,
              taxRate,
              category,
              brand,
              imageUrl,
              youtubeUrl,
              unit,
              minStock: 0,
              satKey,
              satUnit,
              isActive,
              // @ts-ignore
              showInWeb: showInWeb !== undefined ? showInWeb : true
            }
          });
        } else {
          await prisma.product.update({
            where: { id: sisterExisting.id },
            data: {
              name,
              price,
              cost,
              barcode,
              wholesalePrice,
              specialPrice,
              description,
              taxRate,
              category,
              brand,
              imageUrl,
              youtubeUrl,
              unit,
              satKey,
              satUnit,
              isActive,
              // @ts-ignore
              showInWeb: showInWeb !== undefined ? showInWeb : undefined
            }
          });
        }
      }
      
      if (!batchNumber && stock > 0) {
        await prisma.inventoryMovement.create({
          data: {
            productId: productObj.id,
            type: 'IN',
            quantity: stock,
            reason: 'Importación CSV Inicial',
            userId: user.id
          }
        });
      }
      importedCount++;
    }

    // Process Batch if defined
    if (batchNumber && productObj) {
      const existingBatch = await prisma.productBatch.findFirst({
        where: { productId: productObj.id, batchNumber }
      });

      if (existingBatch) {
        const oldStock = existingBatch.stock;
        await prisma.productBatch.update({
          where: { id: existingBatch.id },
          data: {
            expirationDate,
            stock: stock, // Overwrite batch stock with the one in CSV
            cost: cost
          }
        });
        
        if (stock !== oldStock) {
          const diff = stock - oldStock;
          await prisma.inventoryMovement.create({
            data: {
              productId: productObj.id,
              batchId: existingBatch.id,
              type: diff > 0 ? 'IN' : 'OUT',
              quantity: Math.abs(diff),
              reason: 'Actualización de Stock Lote por Importación CSV',
              userId: user.id
            }
          });
        }
      } else {
        const createdBatch = await prisma.productBatch.create({
          data: {
            productId: productObj.id,
            batchNumber,
            expirationDate,
            stock: stock,
            cost: cost
          }
        });

        await prisma.inventoryMovement.create({
          data: {
            productId: productObj.id,
            batchId: createdBatch.id,
            type: 'IN',
            quantity: stock,
            reason: 'Importación CSV Inicial (Lote)',
            userId: user.id
          }
        });
      }

      // Re-sum all batch stocks to set the main product stock accurately
      const allBatches = await prisma.productBatch.findMany({
        where: { productId: productObj.id }
      });
      const totalBatchStock = allBatches.reduce((sum, b) => sum + b.stock, 0);
      await prisma.product.update({
        where: { id: productObj.id },
        data: { stock: totalBatchStock }
      });
    }
  }

  revalidatePath('/productos');
  revalidatePath('/ventas/nueva');

  return { importedCount, updatedCount };
}
