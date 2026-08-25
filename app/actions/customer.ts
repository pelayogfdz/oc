'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getActiveBranch } from './auth';

function cleanTaxId(taxId: string | null | undefined): string | null {
  if (!taxId) return null;
  const cleaned = taxId.toUpperCase().replace(/[\s-]/g, '').trim();
  return cleaned || null;
}

async function validateUniqueTaxId(cleanedTaxId: string | null, excludeCustomerId?: string) {
  if (!cleanedTaxId) return;
  
  const GENERIC_RFCS = ['XAXX010101000', 'XEXX010101000'];
  if (GENERIC_RFCS.includes(cleanedTaxId)) return;

  const existing = await prisma.customer.findFirst({
    where: {
      taxId: cleanedTaxId,
      ...(excludeCustomerId ? { id: { not: excludeCustomerId } } : {})
    }
  });

  if (existing) {
    throw new Error(`Ya existe un cliente registrado con el RFC ${cleanedTaxId} (${existing.name}).`);
  }
}

export interface CustomerCreatePayload {
  name: string;
  phone?: string | null;
  email?: string | null;
  additionalEmails?: string | null;
  street?: string | null;
  exteriorNumber?: string | null;
  interiorNumber?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  taxId?: string | null;
  legalName?: string | null;
  taxRegime?: string | null;
  zipCode?: string | null;
  cfdiUse?: string | null;
  creditLimit?: number;
  creditDays?: number;
  priceList?: string;
}

export async function createCustomerAction(payload: CustomerCreatePayload | FormData) {
  try {
    const branch = await getActiveBranch();
    const targetBranchId = (branch && branch.id && branch.id !== 'GLOBAL') ? branch.id : null;

    let data: CustomerCreatePayload;
    if (payload instanceof FormData) {
      data = {
        name: (payload.get('name') as string)?.trim() || '',
        phone: (payload.get('phone') as string)?.trim() || null,
        email: (payload.get('email') as string)?.trim() || null,
        additionalEmails: (payload.get('additionalEmails') as string)?.trim() || null,
        street: (payload.get('street') as string)?.trim() || null,
        exteriorNumber: (payload.get('exteriorNumber') as string)?.trim() || null,
        interiorNumber: (payload.get('interiorNumber') as string)?.trim() || null,
        neighborhood: (payload.get('neighborhood') as string)?.trim() || null,
        city: (payload.get('city') as string)?.trim() || null,
        state: (payload.get('state') as string)?.trim() || null,
        taxId: (payload.get('taxId') as string)?.trim() || null,
        legalName: (payload.get('legalName') as string)?.trim() || null,
        taxRegime: (payload.get('taxRegime') as string)?.trim() || null,
        zipCode: (payload.get('zipCode') as string)?.trim() || null,
        cfdiUse: (payload.get('cfdiUse') as string)?.trim() || null,
        creditLimit: parseFloat(payload.get('creditLimit') as string) || 0,
        creditDays: parseInt(payload.get('creditDays') as string, 10) || 0,
        priceList: (payload.get('priceList') as string) || 'price',
      };
    } else {
      data = payload;
    }

    const name = data.name?.trim();
    if (!name) {
      return { error: 'El Nombre Comercial o Identificador es obligatorio.' };
    }

    const cleanedTaxId = cleanTaxId(data.taxId);
    if (cleanedTaxId) {
      const GENERIC_RFCS = ['XAXX010101000', 'XEXX010101000'];
      if (!GENERIC_RFCS.includes(cleanedTaxId)) {
        const existing = await prisma.customer.findFirst({
          where: {
            taxId: { equals: cleanedTaxId, mode: 'insensitive' }
          }
        });
        if (existing) {
          return { error: `Ya existe un cliente registrado con el RFC ${cleanedTaxId} (${existing.name}).` };
        }
      }
    }

    const newCustomer = await prisma.customer.create({
      data: {
        name: name,
        email: data.email?.trim() || null,
        additionalEmails: data.additionalEmails?.trim() || null,
        phone: data.phone?.trim() || null,
        street: data.street?.trim() || null,
        exteriorNumber: data.exteriorNumber?.trim() || null,
        interiorNumber: data.interiorNumber?.trim() || null,
        neighborhood: data.neighborhood?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        taxId: cleanedTaxId,
        legalName: data.legalName?.trim() || name,
        taxRegime: data.taxRegime?.trim() || null,
        zipCode: data.zipCode?.trim() || null,
        cfdiUse: data.cfdiUse?.trim() || null,
        creditLimit: typeof data.creditLimit === 'number' ? data.creditLimit : parseFloat(data.creditLimit as any) || 0,
        creditDays: typeof data.creditDays === 'number' ? data.creditDays : parseInt(data.creditDays as any, 10) || 0,
        priceList: data.priceList || 'price',
        branchId: targetBranchId
      }
    });

    revalidatePath('/clientes');
    revalidatePath('/ventas/nueva');
    return { success: true, customer: JSON.parse(JSON.stringify(newCustomer)) };
  } catch (error: any) {
    console.error('Error in createCustomerAction:', error);
    if (error.code === 'P2002') {
      return { error: "El RFC o dato ingresado ya pertenece a otro cliente registrado." };
    }
    return { error: error.message || 'Error al crear el cliente.' };
  }
}

export async function createCustomer(formData: FormData) {
  const res = await createCustomerAction(formData);
  if (res.error) {
    throw new Error(res.error);
  }
  revalidatePath('/clientes');
  revalidatePath('/ventas/nueva');
  redirect('/clientes');
}

export interface CustomerUpdatePayload {
  name: string;
  phone?: string | null;
  email?: string | null;
  additionalEmails?: string | null;
  street?: string | null;
  exteriorNumber?: string | null;
  interiorNumber?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  taxId?: string | null;
  legalName?: string | null;
  taxRegime?: string | null;
  zipCode?: string | null;
  cfdiUse?: string | null;
  creditLimit?: number;
  creditDays?: number;
  priceList?: string;
}

export async function updateCustomerAction(id: string, payload: CustomerUpdatePayload | FormData) {
  try {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return { error: "Cliente no encontrado." };
    }

    const isGenericPublic = 
      customer.name.toLowerCase().includes('publico') && 
      customer.name.toLowerCase().includes('general');

    if (isGenericPublic) {
      return { error: "No se permite modificar el cliente genérico de Público en General." };
    }

    let data: CustomerUpdatePayload;
    if (payload instanceof FormData) {
      data = {
        name: (payload.get('name') as string)?.trim() || '',
        phone: (payload.get('phone') as string)?.trim() || null,
        email: (payload.get('email') as string)?.trim() || null,
        additionalEmails: (payload.get('additionalEmails') as string)?.trim() || null,
        street: (payload.get('street') as string)?.trim() || null,
        exteriorNumber: (payload.get('exteriorNumber') as string)?.trim() || null,
        interiorNumber: (payload.get('interiorNumber') as string)?.trim() || null,
        neighborhood: (payload.get('neighborhood') as string)?.trim() || null,
        city: (payload.get('city') as string)?.trim() || null,
        state: (payload.get('state') as string)?.trim() || null,
        taxId: (payload.get('taxId') as string)?.trim() || null,
        legalName: (payload.get('legalName') as string)?.trim() || null,
        taxRegime: (payload.get('taxRegime') as string)?.trim() || null,
        zipCode: (payload.get('zipCode') as string)?.trim() || null,
        cfdiUse: (payload.get('cfdiUse') as string)?.trim() || null,
        creditLimit: parseFloat(payload.get('creditLimit') as string) || 0,
        creditDays: parseInt(payload.get('creditDays') as string, 10) || 0,
        priceList: (payload.get('priceList') as string) || 'price',
      };
    } else {
      data = payload;
    }

    const name = data.name?.trim();
    if (!name) {
      return { error: "El Nombre Comercial o Identificador es obligatorio." };
    }

    const cleanedTaxId = cleanTaxId(data.taxId);
    if (cleanedTaxId) {
      const GENERIC_RFCS = ['XAXX010101000', 'XEXX010101000'];
      if (!GENERIC_RFCS.includes(cleanedTaxId)) {
        const existing = await prisma.customer.findFirst({
          where: {
            taxId: { equals: cleanedTaxId, mode: 'insensitive' },
            id: { not: id }
          }
        });
        if (existing) {
          return { error: `Ya existe otro cliente registrado con el RFC ${cleanedTaxId} (${existing.name}).` };
        }
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: { 
        name: name,
        email: data.email?.trim() || null,
        additionalEmails: data.additionalEmails?.trim() || null,
        phone: data.phone?.trim() || null,
        street: data.street?.trim() || null,
        exteriorNumber: data.exteriorNumber?.trim() || null,
        interiorNumber: data.interiorNumber?.trim() || null,
        neighborhood: data.neighborhood?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        taxId: cleanedTaxId,
        legalName: data.legalName?.trim() || null,
        taxRegime: data.taxRegime?.trim() || null,
        zipCode: data.zipCode?.trim() || null,
        cfdiUse: data.cfdiUse?.trim() || null,
        creditLimit: typeof data.creditLimit === 'number' ? data.creditLimit : parseFloat(data.creditLimit as any) || 0,
        creditDays: typeof data.creditDays === 'number' ? data.creditDays : parseInt(data.creditDays as any, 10) || 0,
        priceList: data.priceList || 'price',
      }
    });

    revalidatePath('/clientes');
    revalidatePath(`/clientes/${id}`);
    revalidatePath(`/clientes/${id}/editar`);
    return { success: true, customer: JSON.parse(JSON.stringify(updatedCustomer)) };
  } catch (error: any) {
    console.error('Error in updateCustomerAction:', error);
    if (error.code === 'P2002') {
      return { error: "El RFC o dato ingresado ya pertenece a otro cliente registrado." };
    }
    return { error: error.message || "Error al guardar los datos del cliente." };
  }
}

export async function updateCustomer(id: string, formData: FormData) {
  const res = await updateCustomerAction(id, formData);
  if (res.error) {
    throw new Error(res.error);
  }
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
  const targetBranchId = (branch && branch.id && branch.id !== 'GLOBAL') ? branch.id : null;

  if (!data.name) {
    throw new Error('El nombre es obligatorio.');
  }

  const taxId = cleanTaxId(data.taxId);
  await validateUniqueTaxId(taxId);

  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      street: data.street || null,
      zipCode: data.zipCode || null,
      taxId: taxId,
      branchId: targetBranchId
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
  const targetBranchId = (branch && branch.id && branch.id !== 'GLOBAL') ? branch.id : null;

  if (!data.name) {
    throw new Error('El nombre/Razón Social es obligatorio.');
  }

  const taxId = cleanTaxId(data.taxId);
  await validateUniqueTaxId(taxId);

  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      legalName: data.legalName || data.name,
      taxId: taxId,
      taxRegime: data.taxRegime || null,
      zipCode: data.zipCode || null,
      cfdiUse: data.cfdiUse || null,
      email: data.email || null,
      phone: data.phone || null,
      branchId: targetBranchId
    }
  });

  revalidatePath('/facturas/ventas');
  return customer;
}

export async function sendCustomerAccountStatementEmail(customerId: string, customEmail?: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        branch: {
          include: {
            tenant: true
          }
        }
      }
    });

    if (!customer) {
      throw new Error('Cliente no encontrado');
    }

    const email = customEmail?.trim() || customer.email?.trim();
    if (!email) {
      throw new Error('El cliente no tiene un correo electrónico registrado.');
    }

    // Get all sales for this customer
    const sales = await prisma.sale.findMany({
      where: { customerId },
      orderBy: { createdAt: 'asc' }
    });

    // Resolve branch settings config
    let config: any = {};
    const branchId = customer.branchId;
    if (branchId) {
      const settings = await prisma.branchSettings.findUnique({
        where: { branchId }
      });
      if (settings && settings.configJson) {
        try {
          config = JSON.parse(settings.configJson);
        } catch (e) {}
      }
    }

    // Fallback if no config loaded
    if (!config || !config.formatos_factura) {
      const settings = await prisma.branchSettings.findFirst({
        where: { configJson: { not: null } }
      });
      if (settings && settings.configJson) {
        try {
          const fallbackConfig = JSON.parse(settings.configJson);
          config = { ...fallbackConfig, ...config };
        } catch (e) {}
      }
    }

    // Fallback search for bancos settings
    if (!config.bancos) {
      const allSettings = await prisma.branchSettings.findMany({
        where: { configJson: { not: null } }
      });
      for (const s of allSettings) {
        if (s.configJson) {
          try {
            const parsed = JSON.parse(s.configJson);
            if (parsed.bancos && (parsed.bancos.accounts?.length > 0 || parsed.bancos.bancoPrincipal)) {
              config.bancos = parsed.bancos;
              break;
            }
          } catch (e) {}
        }
      }
    }

    // Dynamic imports to avoid issues
    const { generateAccountStatementPdfBuffer } = await import('@/lib/accountStatementPdf');
    const { sendAccountStatementEmail } = await import('@/lib/mailer');

    // Generate PDF Buffer
    const pdfBuffer = await generateAccountStatementPdfBuffer(customer, sales, config);

    // Send email
    await sendAccountStatementEmail(email, customer, pdfBuffer);

    // Also send to additional emails if registered
    if (customer.additionalEmails) {
      const extraEmails = customer.additionalEmails.split(',').map((e: string) => e.trim()).filter((e: string) => e);
      for (const extraEmail of extraEmails) {
        try {
          await sendAccountStatementEmail(extraEmail, customer, pdfBuffer);
        } catch (e) {
          console.error(`Failed to send statement email to additional email ${extraEmail}:`, e);
        }
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending account statement email:', error);
    return { success: false, error: error.message || 'Error al enviar correo' };
  }
}

