'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch } from './auth';
import { revalidatePath } from 'next/cache';

export async function saveIntegrationTokens(formData: FormData) {
  const branch = await getActiveBranch();
  const platform = formData.get('platform') as string;
  const appId = formData.get('appId') as string;
  const clientSecret = formData.get('clientSecret') as string;
  const accessToken = formData.get('accessToken') as string;
  
  if (!platform || (!appId && !accessToken)) throw new Error("Faltan datos obligatorios");

  const existing = await prisma.storeIntegration.findUnique({
    where: { branchId_platform: { branchId: branch.id, platform } }
  });

  if (existing) {
    await prisma.storeIntegration.update({
      where: { id: existing.id },
      data: { appId, clientSecret, accessToken }
    });
  } else {
    await prisma.storeIntegration.create({
      data: { branchId: branch.id, platform, appId, clientSecret, accessToken }
    });
  }

  revalidatePath('/integraciones');
  revalidatePath(`/integraciones/${platform.toLowerCase()}`);
}

export async function deleteIntegration(formData: FormData) {
  const branch = await getActiveBranch();
  const platform = formData.get('platform') as string;
  
  const existing = await prisma.storeIntegration.findUnique({
    where: { branchId_platform: { branchId: branch.id, platform } }
  });

  if (existing) {
    await prisma.storeIntegration.delete({
      where: { id: existing.id }
    });
  }

  revalidatePath('/integraciones');
  revalidatePath(`/integraciones/${platform.toLowerCase()}`);
}
