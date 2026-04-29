'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch } from './auth';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';

export async function updateBranchSettings(formData: FormData) {
  let branch = await getActiveBranch();
  if (!branch) throw new Error("No branch active");
  if (branch.id === 'GLOBAL') {
    const realBranch = await prisma.branch.findFirst({ where: { isActive: true } });
    if (!realBranch) throw new Error("No real branch exists to store settings");
    branch = realBranch;
  }
  
  const ticketHeader = formData.get('ticketHeader') as string;
  const ticketFooter = formData.get('ticketFooter') as string;
  const taxIVA = parseFloat(formData.get('taxIVA') as string) || 16.0;
  const currencySymbol = formData.get('currencySymbol') as string || '$';
  const autoCloseCash = formData.get('autoCloseCash') === 'true';
  const useCustomCFDI = formData.get('useCustomCFDI') === 'true';

  await prisma.branchSettings.upsert({
    where: { branchId: branch.id },
    update: {
      ticketHeader,
      ticketFooter,
      taxIVA,
      currencySymbol,
      autoCloseCash,
      useCustomCFDI
    },
    create: {
      branchId: branch.id,
      ticketHeader,
      ticketFooter,
      taxIVA,
      currencySymbol,
      autoCloseCash,
      useCustomCFDI
    }
  });

  revalidatePath('/preferencias', 'layout');
  revalidatePath('/ventas/nueva');
}

export async function getBranchSettings() {
  let branch = await getActiveBranch();
  if (!branch) throw new Error("No branch active");
  if (branch.id === 'GLOBAL') {
    const realBranch = await prisma.branch.findFirst({ where: { isActive: true } });
    if (!realBranch) throw new Error("No real branch exists to store settings");
    branch = realBranch;
  }

  let settings = await prisma.branchSettings.findUnique({
    where: { branchId: branch.id }
  });

  if (!settings) {
    settings = await prisma.branchSettings.create({
      data: { branchId: branch.id }
    });
  }

  return settings;
}

export async function getTenantSettings() {
  const branch = await getActiveBranch();
  if (!branch || !branch.tenantId) {
    return { decimals: 2 };
  }
  
  const getCachedTenant = unstable_cache(
    async () => prisma.tenant.findUnique({
      where: { id: branch.tenantId! } // asserted by the if check
    }),
    [`tenant-${branch.tenantId}`],
    { tags: [`tenant-${branch.tenantId}`] }
  );

  const tenant = await getCachedTenant();
  
  return tenant || { decimals: 2 };
}

export async function updateTenantSettings(formData: FormData) {
  const branch = await getActiveBranch();
  if (!branch || !branch.tenantId) throw new Error("No tenant active");

  const decimals = parseInt(formData.get('decimals') as string) || 2;

  await prisma.tenant.update({
    where: { id: branch.tenantId },
    data: { decimals }
  });

  revalidateTag(`tenant-${branch.tenantId}`);
  revalidatePath('/', 'layout');
}

export async function updateAdvancedConfig(moduleKey: string, formData: FormData) {
  let branch = await getActiveBranch();
  if (!branch) throw new Error("No branch active");
  if (branch.id === 'GLOBAL') {
    const realBranch = await prisma.branch.findFirst({ where: { isActive: true } });
    if (!realBranch) throw new Error("No real branch exists to store settings");
    branch = realBranch;
  }

  let settings = await prisma.branchSettings.findUnique({ where: { branchId: branch.id } });
  
  if (!settings) {
    settings = await prisma.branchSettings.create({ data: { branchId: branch.id } });
  }

  let currentJson: Record<string, any> = {};
  if (settings.configJson) {
    try {
      const parsed = JSON.parse(settings.configJson);
      if (parsed && typeof parsed === 'object') {
        currentJson = parsed;
      }
    } catch (e) {
      console.error("Error parsing configJson:", e);
    }
  }

  const updates: Record<string, any> = {};
  
  formData.forEach((value, key) => {
    if (!key.startsWith('$ACTION_ID_')) {
      updates[key] = value;
    }
  });

  currentJson[moduleKey] = { ...currentJson[moduleKey], ...updates };

  await prisma.branchSettings.update({
    where: { branchId: branch.id },
    data: { configJson: JSON.stringify(currentJson) }
  });

  revalidatePath('/preferencias', 'layout');
}

export async function updateAdvancedJSONConfig(moduleKey: string, payload: any) {
  let branch = await getActiveBranch();
  if (!branch) throw new Error("No branch active");
  if (branch.id === 'GLOBAL') {
    const realBranch = await prisma.branch.findFirst({ where: { isActive: true } });
    if (!realBranch) throw new Error("No real branch exists to store settings");
    branch = realBranch;
  }

  let settings = await prisma.branchSettings.findUnique({ where: { branchId: branch.id } });
  
  if (!settings) Object.assign(settings = {} as any, { configJson: "{}" });

  let currentJson: any = {};
  if (settings?.configJson) {
    try {
      currentJson = JSON.parse(settings.configJson);
    } catch (e) {}
  }

  currentJson[moduleKey] = payload;

  await prisma.branchSettings.upsert({
    where: { branchId: branch.id },
    update: { configJson: JSON.stringify(currentJson) },
    create: { branchId: branch.id, configJson: JSON.stringify(currentJson) }
  });

  revalidatePath('/preferencias', 'layout');
}
