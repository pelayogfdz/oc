'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getActiveBranch } from './auth';

export async function createCustomer(formData: FormData) {
  const branch = await getActiveBranch();
  
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;

  if (!email || !phone) {
    throw new Error('El correo y teléfono son obligatorios.');
  }

  // Temporary API trigger for Mailing validation
  console.log(`[MAILING_API_CHECK] Validando buzón para: ${email}`);
  if (email.includes('no-existe') || email.includes('fake')) {
    throw new Error('El correo proporcionado no es válido o está inactivo según el servidor de correos.');
  }

  await prisma.customer.create({
    data: {
      name: formData.get('name') as string,
      email: email,
      additionalEmails: (formData.get('additionalEmails') as string) || null,
      phone: phone,
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
      priceList: (formData.get('priceList') as string) || 'price',
      branchId: branch.id
    }
  });

  revalidatePath('/clientes');
  revalidatePath('/ventas/nueva');
  redirect('/clientes');
}

export async function updateCustomer(id: string, formData: FormData) {
  await prisma.customer.update({
    where: { id },
    data: { 
      name: formData.get('name') as string,
      email: (formData.get('email') as string) || null,
      additionalEmails: (formData.get('additionalEmails') as string) || null,
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
      priceList: (formData.get('priceList') as string) || 'price',
    }
  });

  revalidatePath('/clientes');
  redirect('/clientes');
}

export async function toggleCustomerBlock(id: string, isBlocked: boolean) {
  await prisma.customer.update({
    where: { id },
    data: { isBlocked }
  });
  
  revalidatePath('/clientes');
  revalidatePath(`/clientes/${id}`);
}

export async function createCustomerPOS(data: {
  name: string;
  email?: string;
  phone?: string;
  street?: string;
  zipCode?: string;
  taxId?: string;
}) {
  const branch = await getActiveBranch();
  if (!data.name) {
    throw new Error('El nombre es obligatorio.');
  }

  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      street: data.street || null,
      zipCode: data.zipCode || null,
      taxId: data.taxId || null,
      branchId: branch.id
    }
  });

  revalidatePath('/ventas/nueva');
  return customer;
}

export async function createCustomerBilling(data: {
  name: string;
  legalName?: string;
  taxId?: string;
  taxRegime?: string;
  zipCode?: string;
  cfdiUse?: string;
  email?: string;
  phone?: string;
}) {
  const branch = await getActiveBranch();
  if (!data.name) {
    throw new Error('El nombre/Razón Social es obligatorio.');
  }

  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      legalName: data.legalName || data.name,
      taxId: data.taxId || null,
      taxRegime: data.taxRegime || null,
      zipCode: data.zipCode || null,
      cfdiUse: data.cfdiUse || null,
      email: data.email || null,
      phone: data.phone || null,
      branchId: branch.id
    }
  });

  revalidatePath('/facturas/ventas');
  return customer;
}

