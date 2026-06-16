'use server';
import { prisma } from "@/lib/prisma";

export async function searchTicket(ticketId: string) {
  try {
    const sale = await prisma.sale.findFirst({
      where: {
        OR: [
          { id: ticketId },
          { id: { endsWith: ticketId.toLowerCase() } },
          { id: { endsWith: ticketId } }
        ]
      },
      include: { items: { include: { product: true } } }
    });

    if (!sale) return { error: "Ticket no encontrado. Verifica el folio." };
    if (sale.status !== "COMPLETED") return { error: "El ticket no es válido para facturación fiscal." };

    return { sale };
  } catch (error) {
    return { error: "Error de servidor al buscar el ticket." };
  }
}

import { stampInvoice } from "./facturacion";

export async function generateInvoice(ticketId: string, taxData: any) {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: ticketId }
    });

    if (!sale) return { error: "Ticket inválido." };
    if (sale.invoiceId) return { error: "El ticket ya fue facturado." };

    const branch = await prisma.branch.findUnique({
      where: { id: sale.branchId || '' },
      select: { tenantId: true }
    });

    // Find customer by taxId (RFC) in the same tenant (via branches belonging to that tenant)
    let customer = await prisma.customer.findFirst({
      where: {
        taxId: { equals: taxData.rfc, mode: 'insensitive' },
        branch: {
          tenantId: branch?.tenantId || undefined
        }
      }
    });

    if (customer) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: taxData.legalName,
          legalName: taxData.legalName,
          email: taxData.email || customer.email,
          zipCode: taxData.zipCode || customer.zipCode,
          taxRegime: taxData.taxRegime || customer.taxRegime,
          cfdiUse: taxData.cfdiUse || customer.cfdiUse
        }
      });
    } else {
      customer = await prisma.customer.create({
        data: {
          name: taxData.legalName,
          legalName: taxData.legalName,
          taxId: taxData.rfc,
          email: taxData.email,
          zipCode: taxData.zipCode,
          taxRegime: taxData.taxRegime,
          cfdiUse: taxData.cfdiUse,
          branchId: sale.branchId
        }
      });
    }

    // Link customer to sale
    await prisma.sale.update({
       where: { id: ticketId },
       data: { customerId: customer.id }
    });

    // Let the central CFDI function do the heavy lifting
    const facturapiResult = await stampInvoice(ticketId);

    if (!facturapiResult.success) {
      return { error: facturapiResult.error };
    }

    return { success: true, invoiceId: facturapiResult.invoiceId };
  } catch (error: any) {
    return { error: error.message || "Error al facturar." };
  }
}

export async function searchB2BInvoices(rfc: string) {
  try {
    const sales = await prisma.sale.findMany({
      where: {
        customer: {
          taxId: { equals: rfc, mode: 'insensitive' }
        },
        invoiceId: {
          not: null
        }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        total: true,
        invoiceId: true,
        status: true
      }
    });

    if (sales.length === 0) {
      return { error: 'No se encontraron facturas timbradas para el RFC proporcionado.' };
    }

    return { 
      invoices: sales.map(s => ({
        id: s.id,
        date: s.createdAt,
        total: s.total,
        uuid: s.invoiceId,
        status: "Timbrada"
      }))
    };
  } catch (error) {
    return { error: "Error de servidor al buscar facturas B2B." };
  }
}

export async function searchCustomerPortalData(emailOrPhone: string) {
  try {
    const cleanedSearch = emailOrPhone.trim().toLowerCase();
    
    // Find customer by email, phone, or tax ID (RFC)
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: { equals: cleanedSearch, mode: 'insensitive' } },
          { phone: { contains: emailOrPhone.trim() } },
          { taxId: { equals: emailOrPhone.trim(), mode: 'insensitive' } }
        ]
      },
      include: {
        branch: true
      }
    });

    if (!customer) {
      return { error: "Cliente no encontrado. Por favor verifica tu correo, teléfono o RFC registrado." };
    }

    // Fetch transactions
    const loyaltyTransactions = await prisma.loyaltyTransaction.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    // Fetch sales
    const sales = await prisma.sale.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        items: {
          include: {
            product: {
              select: {
                sku: true,
                name: true,
                price: true,
                unit: true
              }
            }
          }
        }
      }
    });

    // Fetch payments
    const payments = await prisma.customerPayment.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Fetch quotes
    const quotes = await prisma.quote.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        items: {
          include: {
            product: {
              select: {
                sku: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Fetch consignments
    const consignments = await prisma.consignment.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        items: {
          include: {
            product: {
              select: {
                sku: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Aggregate Favorite Products (Most Purchased)
    const productFrequency: Record<string, { sku: string; name: string; quantity: number; totalSpent: number }> = {};
    sales.forEach(sale => {
      if (sale.status === 'COMPLETED') {
        sale.items.forEach(item => {
          const prodId = item.productId;
          if (!productFrequency[prodId]) {
            productFrequency[prodId] = {
              sku: item.product?.sku || 'N/A',
              name: item.product?.name || 'Desconocido',
              quantity: 0,
              totalSpent: 0
            };
          }
          productFrequency[prodId].quantity += item.quantity;
          productFrequency[prodId].totalSpent += item.quantity * item.price;
        });
      }
    });

    const favoriteProducts = Object.values(productFrequency)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Fetch Active Promotions in the branch
    const promotions = customer.branchId 
      ? await prisma.promotion.findMany({
          where: { branchId: customer.branchId, active: true },
          take: 5
        })
      : [];

    // Check if Google Wallet is enabled for this branch
    let googleWalletEnabled = false;
    if (customer.branchId) {
      const branchSettings = await prisma.branchSettings.findUnique({
        where: { branchId: customer.branchId }
      });
      if (branchSettings?.configJson) {
        try {
          const config = JSON.parse(branchSettings.configJson);
          if (config?.googleWallet?.enabled) {
            googleWalletEnabled = true;
          }
        } catch (e) {}
      }
    }

    return {
      success: true,
      customer,
      loyaltyTransactions,
      sales,
      payments,
      quotes,
      consignments,
      favoriteProducts,
      promotions,
      googleWalletEnabled
    };
  } catch (error: any) {
    return { error: error.message || "Error de servidor al cargar datos del cliente." };
  }
}

