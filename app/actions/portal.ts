'use server';
import { prisma, resolveClientForSale, getAllTenantClients } from "@/lib/prisma";

export async function searchTicket(ticketId: string) {
  try {
    const resolved = await resolveClientForSale(ticketId);
    if (!resolved) return { error: "Ticket no encontrado. Verifica el folio." };

    const { sale } = resolved;
    if (sale.status !== "COMPLETED") return { error: "El ticket no es válido para facturación fiscal." };

    return { sale };
  } catch (error) {
    return { error: "Error de servidor al buscar el ticket." };
  }
}

import { stampInvoice } from "./facturacion";

export async function generateInvoice(ticketId: string, taxData: any) {
  try {
    const resolved = await resolveClientForSale(ticketId);
    if (!resolved) return { error: "Ticket inválido." };

    const { client: db, sale } = resolved;
    if (sale.invoiceId) return { error: "El ticket ya fue facturado." };

    const branch = await db.branch.findUnique({
      where: { id: sale.branchId || '' },
      select: { tenantId: true }
    });

    // Find customer by taxId (RFC) in the same tenant (via branches belonging to that tenant)
    let customer = await db.customer.findFirst({
      where: {
        taxId: { equals: taxData.rfc, mode: 'insensitive' },
        branch: {
          tenantId: branch?.tenantId || undefined
        }
      }
    });

    if (customer) {
      customer = await db.customer.update({
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
      customer = await db.customer.create({
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
    await db.sale.update({
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
    const clients = getAllTenantClients();
    const allInvoices: any[] = [];
    const searchPromises = clients.map(async (client) => {
      try {
        const sales = await client.sale.findMany({
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
        return sales;
      } catch (e) {
        return [];
      }
    });

    const results = await Promise.all(searchPromises);
    for (const sales of results) {
      for (const s of sales) {
        allInvoices.push({
          id: s.id,
          date: s.createdAt,
          total: s.total,
          uuid: s.invoiceId,
          status: "Timbrada"
        });
      }
    }

    if (allInvoices.length === 0) {
      return { error: 'No se encontraron facturas timbradas para el RFC proporcionado.' };
    }

    return { invoices: allInvoices };
  } catch (error) {
    return { error: "Error de servidor al buscar facturas B2B." };
  }
}

export async function searchCustomerPortalData(emailOrPhone: string) {
  try {
    const cleanedSearch = emailOrPhone.trim().toLowerCase();
    const clients = getAllTenantClients();
    let customer = null;
    let db = null;

    for (const client of clients) {
      try {
        const c = await client.customer.findFirst({
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
        if (c) {
          customer = c;
          db = client;
          break;
        }
      } catch (e) {}
    }

    if (!customer || !db) {
      return { error: "Cliente no encontrado. Por favor verifica tu correo, teléfono o RFC registrado." };
    }

    // Fetch transactions
    const loyaltyTransactions = await db.loyaltyTransaction.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    // Fetch sales
    const sales = await db.sale.findMany({
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
    const payments = await db.customerPayment.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Fetch quotes
    const quotes = await db.quote.findMany({
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
    const consignments = await db.consignment.findMany({
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
      ? await db.promotion.findMany({
          where: { branchId: customer.branchId, active: true },
          take: 5
        })
      : [];

    // Check if Google Wallet is enabled for this branch
    let googleWalletEnabled = false;
    if (customer.branchId) {
      const branchSettings = await db.branchSettings.findUnique({
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

