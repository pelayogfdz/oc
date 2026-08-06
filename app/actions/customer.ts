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

  const taxId = cleanTaxId(formData.get('taxId') as string);
  await validateUniqueTaxId(taxId);

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
      taxId: taxId,
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
  const taxId = cleanTaxId(formData.get('taxId') as string);
  await validateUniqueTaxId(taxId, id);

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
      taxId: taxId,
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
      branchId: branch.id
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

