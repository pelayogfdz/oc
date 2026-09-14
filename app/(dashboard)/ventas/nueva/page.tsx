import { Suspense } from 'react';
import { getActiveBranch, getActiveUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { getBranchSettings } from "@/app/actions/settings";
import POSPageClient from "./POSPageClient";
import { getCurrentSession } from "@/app/actions/caja";
import { getTenantSuppliers } from "@/app/actions/supplier";
import { hasPermission } from '@/app/config/permissions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NuevaVentaPage({ searchParams }: { searchParams: any }) {
  const branch = await getActiveBranch();
  const user = await getActiveUser();
  
  if (!user) {
    redirect('/login?open=true');
  }

  if (branch?.id === 'GLOBAL') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #f87171', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>VISTA GLOBAL ACTIVA</h2>
        <p>No se puede utilizar el Punto de Venta en modo "Todas las Sucursales".<br/>Por favor, selecciona una sucursal específica en el selector de arriba para poder registrar una venta.</p>
      </div>
    );
  }
  
  const branchId = branch?.id || '';
  const tenantId = user.tenantId || branch?.tenantId || '';

  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true }
  });
  const tenantBranchIds = tenantBranches.map(b => b.id);

  const [
    products,
    customers,
    promotions,
    allPriceLists,
    pendingQuotes,
    session,
    settings,
    suppliers,
    drivers
  ] = await Promise.all([
    prisma.product.findMany({
      where: { branchId, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        price: true,
        cost: true,
        stock: true,
        category: true,
        brand: true,
        imageUrl: true,
        wholesalePrice: true,
        specialPrice: true,
        isService: true,
        variants: {
          select: {
            id: true,
            sku: true,
            barcode: true,
            attribute: true,
            price: true,
            stock: true
          }
        },
        prices: {
          select: {
            priceListId: true,
            price: true
          }
        }
      },
      orderBy: { name: 'asc' },
      take: 40
    }),
    prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        street: true,
        exteriorNumber: true,
        storeCredit: true,
        priceList: true,
        taxId: true
      },
      orderBy: { name: 'asc' },
      take: 50
    }),
    prisma.promotion.findMany({
      where: { branchId, active: true }
    }),
    prisma.priceList.findMany({
      orderBy: { name: 'asc' }
    }),
    prisma.quote.findMany({
      where: { branchId, status: 'PENDING' },
      select: {
        id: true,
        folio: true,
        total: true,
        createdAt: true,
        customer: { select: { name: true } },
        items: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    getCurrentSession(false),
    getBranchSettings(),
    getTenantSuppliers(),
    prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        branchId: branchId && branchId !== 'GLOBAL' ? branchId : undefined
      },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' }
    })
  ]);

  const priceListsMap = new Map();
  if (branchId && branchId !== 'GLOBAL') {
    for (const pl of allPriceLists) {
      if (pl.branchId === branchId) {
        priceListsMap.set(pl.name, pl);
      }
    }
  }
  for (const pl of allPriceLists) {
    if (!priceListsMap.has(pl.name)) {
      priceListsMap.set(pl.name, pl);
    }
  }
  const dynamicPriceLists = Array.from(priceListsMap.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));
  let ticketConfig: any = {};
  let metodosConfig = {};
  let ventasConfig: any = {};
  let impresorasConfig = {};
  let qzCert = '';
  if (settings.configJson) {
    try {
      const parsed = JSON.parse(settings.configJson);
      ticketConfig = parsed.tickets || {};
      ticketConfig.globalLogo = parsed.global?.logoUrl || '';
      metodosConfig = parsed.metodos || {};
      ventasConfig = parsed.ventas || {};
      impresorasConfig = parsed.impresoras || {};
      qzCert = parsed.qz?.certificate || '';
    } catch(e) {}
  }

  // Fallback: If no logo is configured on this branch, try to fetch the logo from any sibling branch settings of the same tenant
  if (!ticketConfig.globalLogo && branch?.tenantId) {
    const siblingSettings = await prisma.branchSettings.findFirst({
      where: {
        branch: {
          tenantId: branch.tenantId
        }
      },
      select: { configJson: true }
    });
    if (siblingSettings?.configJson) {
      try {
        const parsed = JSON.parse(siblingSettings.configJson);
        ticketConfig.globalLogo = parsed.global?.logoUrl || '';
      } catch (e) {}
    }
  }

  // Fallback branch name and location if not explicitly set in ticket configurator
  if (!ticketConfig.storeName && branch) {
    ticketConfig.storeName = branch.name;
  }
  if (!ticketConfig.address && branch?.location) {
    ticketConfig.address = branch.location;
  }

  let userPermissions: Record<string, boolean> = {};
  let userRole = 'USER';
  let isSuperAdmin = false;
  if (user) {
    userRole = user.role;
    isSuperAdmin = user.email?.toLowerCase() === 'pelayogfdz@gmail.com';
    const rolePermissions = (user as any).customRole?.permissions;
    const userPermissionsRaw = user.permissions;
    const mergedList: string[] = [];

    if (rolePermissions) {
      try {
        const parsed = JSON.parse(rolePermissions);
        if (Array.isArray(parsed)) mergedList.push(...parsed);
        else Object.keys(parsed).forEach((k) => { if (parsed[k]) mergedList.push(k); });
      } catch (e) {}
    }

    if (userPermissionsRaw) {
      try {
        const parsed = JSON.parse(userPermissionsRaw);
        if (Array.isArray(parsed)) mergedList.push(...parsed);
        else Object.keys(parsed).forEach((k) => { if (parsed[k]) mergedList.push(k); });
      } catch (e) {}
    }

    if (mergedList.length > 0) {
      try {
        const tempPermissions: Record<string, boolean> = {};
        mergedList.forEach((p: string) => tempPermissions[p] = true);

        Object.keys(tempPermissions).forEach(p => {
          if (hasPermission(tempPermissions, p)) {
            userPermissions[p] = true;
          }
        });
      } catch (e) {}
    }
  }

  return (
    <POSPageClient
      products={products}
      customers={customers}
      suppliers={suppliers}
      promotions={promotions}
      dynamicPriceLists={dynamicPriceLists}
      allPriceLists={allPriceLists}
      pendingQuotes={pendingQuotes}
      session={session}
      branchId={branchId}
      branchName={branch?.name || ''}
      ticketConfig={ticketConfig}
      metodosConfig={metodosConfig}
      ventasConfig={ventasConfig}
      impresorasConfig={impresorasConfig}
      qzCert={qzCert}
      userPermissions={userPermissions}
      userRole={userRole}
      isSuperAdmin={isSuperAdmin}
      drivers={drivers}
    />
  );
}
