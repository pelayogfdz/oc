
'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getActiveBranch, getActiveUser } from './auth';

export async function crudAction(entity: string, formData: FormData) {
  const branch = await getActiveBranch();
  const user = await getActiveUser();
  const data: any = { branchId: branch.id };
  
  const numericKeys = new Set([
    'creditLimit',
    'creditDays',
    'quantity',
    'value',
    'creditBalance',
    'storeCredit',
    'pointsBalance'
  ]);

  formData.forEach((value, key) => {
    if (key !== 'entity' && !key.startsWith('$ACTION_ID')) {
       // Convert numbers only if the key is known to be numeric
       if (numericKeys.has(key)) {
          data[key] = (value !== '' && !isNaN(value as any)) ? Number(value) : undefined;
       } else {
          data[key] = value;
       }
    }
  });

  try {
     if (entity === 'supplier') {
        const { id, branch: _, priceList: __, ...supplierData } = data;
        
        // Check if supplier already exists under this tenant by name or RFC (taxId)
        const existing = await prisma.supplier.findFirst({
           where: {
              branch: {
                 tenantId: branch.tenantId
              },
              OR: [
                 { name: { equals: supplierData.name, mode: 'insensitive' as const } },
                 ...(supplierData.taxId ? [{ taxId: { equals: supplierData.taxId, mode: 'insensitive' as const } }] : [])
              ]
           }
        });
        
        if (existing) {
           throw new Error(`El proveedor "${supplierData.name}" o RFC "${supplierData.taxId || ''}" ya existe en este comercio.`);
        }

        await prisma.supplier.create({ data: supplierData });
     } else if (entity === 'customer') {
        await prisma.customer.create({ data: { name: data.name, taxId: data.taxId, phone: data.phone, creditLimit: data.creditLimit, branchId: branch.id }});
     } else if (entity === 'promotion') {
        await prisma.promotion.create({ data: { name: data.name, type: typeof data.type === 'string' ? data.type : 'PERCENTAGE', value: Number(data.value) || 0, metadata: data.metadata, branchId: branch.id }});
     } else if (entity === 'transfer') {
        await prisma.transfer.create({ data: { branchId: branch.id, toBranchId: branch.id, status: 'IN_TRANSIT' }});
     } else if (entity === 'inventoryMovement') {
        // Find existing product first
        const p = await prisma.product.findFirst({ where: { branchId: branch.id }});
        if (p) await prisma.inventoryMovement.create({ data: { productId: p.id, type: 'ADJUSTMENT', quantity: data.quantity || 1, reason: data.reason || 'Ajuste manual', userId: user.id }});
     } else if (entity === 'saleRefund') {
        await prisma.sale.updateMany({ where: { id: data.id }, data: { status: 'REFUNDED' }});
     } else if (entity === 'storeIntegration') {
        await prisma.storeIntegration.create({ data: { branchId: branch.id, platform: data.name || 'MERCADO_LIBRE' }});
     } else if (entity === 'cashSessionCut') {
        await prisma.cashSession.updateMany({ where: { branchId: branch.id, status: 'OPEN' }, data: { status: 'CLOSED', closedAt: new Date() }});
     }
  } catch (err) {
     console.error(err);
     throw err;
  }

  // Generic revalidation
  revalidatePath('/', 'layout');
}

export async function deleteEntity(entity: string, id: string) {
  try {
    if (entity === 'supplier') await prisma.supplier.delete({ where: { id }});
    if (entity === 'customer') await prisma.customer.delete({ where: { id }});
    if (entity === 'promotion') await prisma.promotion.delete({ where: { id }});
    if (entity === 'transfer') await prisma.transfer.delete({ where: { id }});
    if (entity === 'storeIntegration') await prisma.storeIntegration.delete({ where: { id }});
  } catch (err) { }
  revalidatePath('/', 'layout');
}
