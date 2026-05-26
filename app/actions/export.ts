'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch } from './auth';

export async function exportProductsAction(selectedIds?: string[]) {
  const branch = await getActiveBranch();
  if (!branch) {
    throw new Error('No se encontró una sucursal activa.');
  }

  // Si selectedIds está definido y no está vacío, filtrar por ellos. Si no, traer todos de la sucursal.
  const whereClause: any = { branchId: branch.id };
  if (selectedIds && selectedIds.length > 0) {
    whereClause.id = { in: selectedIds };
  }

  const products = await prisma.product.findMany({
    where: whereClause,
    include: {
      batches: true,
      supplier: true,
    },
    orderBy: { name: 'asc' },
  });

  // Estructurar filas para exportación
  const rows: any[] = [];

  for (const p of products) {
    const baseObj = {
      sku: p.sku || '',
      barcode: p.barcode || '',
      name: p.name || '',
      description: p.description || '',
      price: p.price || 0,
      wholesalePrice: p.wholesalePrice || '',
      specialPrice: p.specialPrice || '',
      cost: p.cost || 0,
      taxRate: p.taxRate || 16.0,
      category: p.category || '',
      brand: p.brand || '',
      unit: p.unit || 'Pza',
      stock: p.stock || 0,
      minStock: p.minStock || 0,
      satKey: p.satKey || '',
      satUnit: p.satUnit || '',
      isActive: p.isActive ? 'true' : 'false',
      supplierName: p.supplier?.name || '',
      expirationDate: p.expirationDate ? p.expirationDate.toISOString().slice(0, 10) : '',
    };

    if (p.batches && p.batches.length > 0) {
      for (const b of p.batches) {
        rows.push({
          ...baseObj,
          stock: b.stock,
          cost: b.cost,
          batchNumber: b.batchNumber || '',
          expirationDate: b.expirationDate ? b.expirationDate.toISOString().slice(0, 10) : '',
        });
      }
    } else {
      rows.push({
        ...baseObj,
        batchNumber: '',
        expirationDate: baseObj.expirationDate,
      });
    }
  }

  return rows;
}
