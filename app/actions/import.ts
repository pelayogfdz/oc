'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch } from './auth';

export async function importProducts(records: any[]) {
  const branch = await getActiveBranch();
  if (!branch) {
    throw new Error('No se encontró una sucursal activa.');
  }
  
  if (!records || records.length === 0) {
    throw new Error('El archivo CSV está vacío o es inválido');
  }

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

    // Parse Supplier by Name or ID
    let supplierId = row.supplierId?.trim() || null;
    if (!supplierId && row.supplierName?.trim()) {
      const supName = row.supplierName.trim();
      const existingSupplier = await prisma.supplier.findFirst({
        where: { branchId: branch.id, name: { equals: supName, mode: 'insensitive' } }
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

    // Check if Product exists
    const existing = await prisma.product.findFirst({
      where: { sku, branchId: branch.id }
    });

    let productObj;

    if (existing) {
      // Update existing product
      productObj = await prisma.product.update({
        where: { id: existing.id },
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
          minStock,
          satKey,
          satUnit,
          isActive,
          supplierId,
          expirationDate: expirationDate || undefined
        }
      });

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
            reason: 'Actualización por Importación CSV'
          }
        });
      }
      updatedCount++;
    } else {
      // Create new product
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
          expirationDate
        }
      });
      
      if (!batchNumber && stock > 0) {
        await prisma.inventoryMovement.create({
          data: {
            productId: productObj.id,
            type: 'IN',
            quantity: stock,
            reason: 'Importación CSV Inicial'
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
              reason: 'Actualización de Stock Lote por Importación CSV'
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
            reason: 'Importación CSV Inicial (Lote)'
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
