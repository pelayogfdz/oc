'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveBranch } from './auth';

export async function importProducts(records: any[]) {
  const branch = await getActiveBranch();
  
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

    // Check if Product exists
    const existing = await prisma.product.findFirst({
      where: { sku, branchId: branch.id }
    });

    if (existing) {
      // If it exists, we update the prices and metadata (we do NOT blindly overwrite stock unless specified, but for an initial import standard, maybe we just increment or overwrite? Let's overwrite for parity with raw CSV).
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          name, price, cost, stock, barcode,
          wholesalePrice, specialPrice
        }
      });
      // Register Kardex if stock changed
      if (stock !== existing.stock) {
        const diff = stock - existing.stock;
        await prisma.inventoryMovement.create({
          data: {
            productId: existing.id,
            type: diff > 0 ? 'IN' : 'OUT',
            quantity: diff,
            reason: 'Actualización por Importación CSV'
          }
        });
      }
      updatedCount++;
    } else {
      // Create new
      const newProduct = await prisma.product.create({
        data: {
          branchId: branch.id,
          sku,
          barcode,
          name,
          price,
          cost,
          stock,
          wholesalePrice,
          specialPrice,
          isActive: true
        }
      });
      
      if (stock > 0) {
        await prisma.inventoryMovement.create({
          data: {
            productId: newProduct.id,
            type: 'IN',
            quantity: stock,
            reason: 'Importación CSV Inicial'
          }
        });
      }
      importedCount++;
    }
  }

  revalidatePath('/productos');
  revalidatePath('/ventas/nueva');

  return { importedCount, updatedCount };
}
