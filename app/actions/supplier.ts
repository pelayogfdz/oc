'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getActiveBranch } from './auth';

export async function createSupplier(formData: FormData) {
  const branch = await getActiveBranch();
  
  await prisma.supplier.create({
    data: {
      name: formData.get('name') as string,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      street: (formData.get('street') as string) || null,
      exteriorNumber: (formData.get('exteriorNumber') as string) || null,
      interiorNumber: (formData.get('interiorNumber') as string) || null,
      neighborhood: (formData.get('neighborhood') as string) || null,
      city: (formData.get('city') as string) || null,
      state: (formData.get('state') as string) || null,
      taxId: (formData.get('taxId') as string) || null,
      legalName: (formData.get('legalName') as string) || null,
      taxRegime: (formData.get('taxRegime') as string) || null,
      zipCode: (formData.get('zipCode') as string) || null,
      cfdiUse: (formData.get('cfdiUse') as string) || null,
      creditLimit: parseFloat(formData.get('creditLimit') as string) || 0,
      creditDays: parseInt(formData.get('creditDays') as string, 10) || 0,
      branchId: branch.id
    }
  });

  revalidatePath('/proveedores');
  revalidatePath('/productos/compras/nuevo');
  redirect('/proveedores');
}

export async function updateSupplier(id: string, data: any) {
  await prisma.supplier.update({
    where: { id },
    data: { 
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      street: data.street || null,
      exteriorNumber: data.exteriorNumber || null,
      interiorNumber: data.interiorNumber || null,
      neighborhood: data.neighborhood || null,
      city: data.city || null,
      state: data.state || null,
      taxId: data.taxId || null,
      legalName: data.legalName || null,
      taxRegime: data.taxRegime || null,
      zipCode: data.zipCode || null,
      cfdiUse: data.cfdiUse || null,
      creditLimit: parseFloat(data.creditLimit) || 0,
      creditDays: parseInt(data.creditDays, 10) || 0,
      additionalEmails: data.additionalEmails || null,
    }
  });

  revalidatePath('/proveedores');
  return { success: true };
}
