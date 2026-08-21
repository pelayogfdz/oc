'use server';

import { prisma } from "@/lib/prisma";
import { getActiveBranch } from "./auth";

export async function syncBasicCatalogs() {
  const branch = await getActiveBranch();
  const branchId = branch?.id || '';
  const tenantId = branch?.tenantId || '';

  const tenantBranches = await prisma.branch.findMany({ where: { tenantId, isActive: true } });
  const branchIds = tenantBranches.map(b => b.id);

  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { branchId: null },
        { branchId: '' },
        { branchId: { in: branchIds } }
      ]
    }
  });
  const suppliers = await prisma.supplier.findMany();
  
  let settingsDb = null;
  if (branchId && branchId !== 'GLOBAL') {
    settingsDb = await prisma.branchSettings.findUnique({ where: { branchId } });
  }
  if (!settingsDb && branchIds.length > 0) {
    settingsDb = await prisma.branchSettings.findFirst({
      where: { branchId: { in: branchIds } }
    });
  }
  
  const totalProducts = await prisma.product.count({ 
    where: { branchId: { in: branchIds }, isActive: true } 
  });
  
  // Fetch active users in the tenant for offline Kiosk Mode
  const users = await prisma.user.findMany({
    where: { 
      tenantId,
      branchId: { not: null }
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      faceDescriptor: true,
      webauthnCredentialId: true,
      webauthnPublicKey: true,
      branchId: true,
      permissions: true,
      customRole: {
        select: {
          permissions: true
        }
      }
    }
  });

  let recentSales: any[] = [];
  if (branchId && branchId !== 'GLOBAL') {
    const salesDb = await prisma.sale.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
      take: 150,
      include: {
        user: true,
        customer: true,
        branch: true,
        items: {
          include: { product: true, variant: true }
        }
      }
    });
    recentSales = salesDb.map(s => ({
      id: s.id,
      folio: s.folio,
      createdAt: s.createdAt.toISOString(),
      userId: s.userId,
      userName: s.user?.name || null,
      branchId: s.branchId,
      branchName: s.branch?.name || null,
      total: s.total,
      status: s.status,
      paymentMethod: s.paymentMethod,
      invoiceId: s.invoiceId,
      invoiceFolio: s.invoiceFolio,
      cancellationStatus: s.cancellationStatus,
      notes: s.notes,
      customerId: s.customerId,
      customerName: s.customer?.name || null,
      items: s.items.map(item => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        productName: item.product?.name || 'Producto',
        productSku: item.product?.sku || null,
        productBarcode: item.product?.barcode || null,
        variantAttribute: item.variant?.attribute || null
      }))
    }));
  }

  return { customers, suppliers, branches: tenantBranches, settings: settingsDb, totalProducts, users, recentSales };
}

export async function syncProductsPage(page: number, limit: number) {
  const branch = await getActiveBranch();
  if (!branch) return [];
  const tenantId = branch.tenantId;
  
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true }
  });
  const branchIds = tenantBranches.map(b => b.id);
  
  const skip = (page - 1) * limit;
  const products = await prisma.product.findMany({
    where: { branchId: { in: branchIds }, isActive: true },
    include: { variants: true, prices: true },
    orderBy: { id: 'asc' },
    skip,
    take: limit,
  });

  return products.map(product => {
    if (product.imageUrl) {
      if (product.imageUrl.includes('.svg') || product.imageUrl.includes('placeholder')) {
        product.imageUrl = null;
      } else if (product.imageUrl.startsWith('data:')) {
        product.imageUrl = `https://caanma.com/api/catalog/image?id=${product.id}`;
      }
    }
    return product;
  });
}

export async function syncAllCatalogs() {
  const branch = await getActiveBranch();
  const branchId = branch?.id || '';
  const tenantId = branch?.tenantId || '';

  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true }
  });
  const branchIds = tenantBranches.map(b => b.id);

  // 1. Productos
  const products = await prisma.product.findMany({
    where: { branchId: { in: branchIds }, isActive: true },
    include: { variants: true, prices: true },
    take: 1000
  });

  const mappedProducts = products.map(product => {
    if (product.imageUrl && product.imageUrl.startsWith('data:')) {
      product.imageUrl = `https://caanma.com/api/catalog/image?id=${product.id}`;
    }
    return product;
  });

  // 2. Clientes
  const customers = await prisma.customer.findMany();

  // 3. Proveedores
  const suppliers = await prisma.supplier.findMany();

  // 4. Sucursales
  const branches = await prisma.branch.findMany({
    where: { tenantId, isActive: true }
  });

  // 5. Settings (solo de la sucursal activa)
  const settingsDb = await prisma.branchSettings.findUnique({
    where: { branchId }
  });

  return {
    products: mappedProducts,
    customers,
    suppliers,
    branches,
    settings: settingsDb
  };
}
