import { prisma } from '@/lib/prisma';

export const GENERIC_CUSTOMER_NAME = 'PUBLICO EN GENERAL';
export const GENERIC_CUSTOMER_RFC = 'XAXX010101000';
export const GENERIC_CUSTOMER_REGIME = '616';
export const GENERIC_CUSTOMER_CFDI_USE = 'S01';
export const GENERIC_CUSTOMER_ZIP = '76000';

export function isGenericCustomerName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.toUpperCase().trim();
  return (
    n === 'PUBLICO GENERAL' ||
    n === 'PÚBLICO GENERAL' ||
    n === 'PUBLICO EN GENERAL' ||
    n === 'PÚBLICO EN GENERAL' ||
    n === 'VENTAS PUBLICO EN GENERAL' ||
    n === 'VENTAS AL PUBLICO EN GENERAL' ||
    n === 'VENTA AL PUBLICO EN GENERAL' ||
    n === 'CLIENTE MOSTRADOR' ||
    n === 'MOSTRADOR'
  );
}

export function isGenericCustomer(customer: { name?: string | null; taxId?: string | null } | null | undefined): boolean {
  if (!customer) return false;
  if (customer.taxId && customer.taxId.toUpperCase().trim() === GENERIC_CUSTOMER_RFC) {
    return true;
  }
  return isGenericCustomerName(customer.name);
}

export async function getOrCreateGenericCustomer(dbOrTx: any = prisma) {
  let genericCustomer = await dbOrTx.customer.findFirst({
    where: {
      OR: [
        { taxId: GENERIC_CUSTOMER_RFC },
        { name: { equals: GENERIC_CUSTOMER_NAME, mode: 'insensitive' } },
        { name: { equals: 'Público en General', mode: 'insensitive' } },
        { name: { equals: 'Público General', mode: 'insensitive' } }
      ]
    }
  });

  if (!genericCustomer) {
    genericCustomer = await dbOrTx.customer.create({
      data: {
        name: GENERIC_CUSTOMER_NAME,
        legalName: GENERIC_CUSTOMER_NAME,
        taxId: GENERIC_CUSTOMER_RFC,
        taxRegime: GENERIC_CUSTOMER_REGIME,
        cfdiUse: GENERIC_CUSTOMER_CFDI_USE,
        zipCode: GENERIC_CUSTOMER_ZIP,
        branchId: null
      }
    });
  } else if (
    genericCustomer.name !== GENERIC_CUSTOMER_NAME ||
    genericCustomer.taxId !== GENERIC_CUSTOMER_RFC ||
    genericCustomer.branchId !== null
  ) {
    // Ensure canonical consistency
    genericCustomer = await dbOrTx.customer.update({
      where: { id: genericCustomer.id },
      data: {
        name: GENERIC_CUSTOMER_NAME,
        legalName: GENERIC_CUSTOMER_NAME,
        taxId: GENERIC_CUSTOMER_RFC,
        taxRegime: genericCustomer.taxRegime || GENERIC_CUSTOMER_REGIME,
        cfdiUse: genericCustomer.cfdiUse || GENERIC_CUSTOMER_CFDI_USE,
        branchId: null
      }
    });
  }

  return genericCustomer;
}
