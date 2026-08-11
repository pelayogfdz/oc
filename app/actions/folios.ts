'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch } from './auth';
import { revalidatePath } from 'next/cache';

/**
 * Gets and atomically increments the consecutive folio number for a branch.
 * Supports running inside an existing Prisma transaction context to prevent deadlocks.
 */
export async function getNextFolio(
  branchId: string,
  moduleKey: 'sale' | 'quote' | 'transfer' | 'purchase' | 'consignment',
  tx?: any
) {
  const db = tx || prisma;

  // Use a transaction if not already inside one, otherwise use the existing context
  const executeLogic = async (dbCtx: any) => {
    const settings = await dbCtx.branchSettings.findUnique({
      where: { branchId }
    });

    const branch = await dbCtx.branch.findUnique({ where: { id: branchId } });
    const isPizca = branch?.tenantId === '0d246cea-0220-4328-92b0-8a1387ce6a6d';

    let config: any = {};
    if (settings?.configJson) {
      try {
        config = JSON.parse(settings.configJson);
      } catch (e) {}
    }

    if (!config.folios) {
      config.folios = {};
    }

    // Default configuration if not present
    if (!config.folios[moduleKey]) {
      const prefix = branch
        ? (isPizca 
            ? branch.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() 
            : branch.name.slice(0, 3).toUpperCase())
        : 'DOC';
      config.folios[moduleKey] = {
        prefix,
        nextNumber: isPizca ? 1 : 1001
      };
    }

    const { prefix, nextNumber } = config.folios[moduleKey];
    const folioNumber = nextNumber || (isPizca ? 1 : 1001);
    
    let formattedFolio = '';
    if (isPizca) {
      const pizcaPrefix = branch
        ? branch.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase()
        : (prefix || 'DOC');
      const folioStr = folioNumber.toString().padStart(2, '0');
      formattedFolio = `${pizcaPrefix}${folioStr}`;
    } else {
      formattedFolio = `${prefix}-${folioNumber}`;
    }

    // Increment next consecutive number
    config.folios[moduleKey].nextNumber = folioNumber + 1;

    await dbCtx.branchSettings.upsert({
      where: { branchId },
      update: { configJson: JSON.stringify(config) },
      create: { branchId, configJson: JSON.stringify(config) }
    });

    return formattedFolio;
  };

  if (tx) {
    return await executeLogic(tx);
  } else {
    return await prisma.$transaction(async (t) => {
      return await executeLogic(t);
    });
  }
}

/**
 * Retroactively seeds chronological folios starting at 1001 for all documents
 * that do not have a folio assigned yet across all branches.
 */
export async function initializeRetroactiveFolios() {
  const activeBranch = await getActiveBranch();
  if (!activeBranch) throw new Error("No hay sucursal activa.");

  const branches = await prisma.branch.findMany();

  for (const branch of branches) {
    const isPizca = branch.tenantId === '0d246cea-0220-4328-92b0-8a1387ce6a6d';
    const prefix = isPizca 
      ? branch.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase()
      : branch.name.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'B'); // Guarantee alphanumeric

    const settings = await prisma.branchSettings.findUnique({ where: { branchId: branch.id } });
    let config: any = {};
    if (settings?.configJson) {
      try {
        config = JSON.parse(settings.configJson);
      } catch (e) {}
    }

    if (!config.folios) {
      config.folios = {};
    }

    // Ensure configurations exist for all 5 modules
    const modules: ('sale' | 'quote' | 'transfer' | 'purchase' | 'consignment')[] = [
      'sale', 'quote', 'transfer', 'purchase', 'consignment'
    ];

    for (const mod of modules) {
      if (!config.folios[mod]) {
        config.folios[mod] = { prefix, nextNumber: isPizca ? 1 : 1001 };
      }
    }

    await prisma.branchSettings.upsert({
      where: { branchId: branch.id },
      update: { configJson: JSON.stringify(config) },
      create: { branchId: branch.id, configJson: JSON.stringify(config) }
    });

    // 1. Retroactively seed Sales (Ventas)
    const sales = await prisma.sale.findMany({
      where: { branchId: branch.id, folio: null },
      orderBy: { createdAt: 'asc' }
    });
    let currentSaleNum = isPizca ? 1 : 1001;
    for (const sale of sales) {
      const folioStr = isPizca ? currentSaleNum.toString().padStart(2, '0') : currentSaleNum;
      const formattedFolio = isPizca ? `${prefix}${folioStr}` : `${prefix}-${folioStr}`;
      await prisma.sale.update({
        where: { id: sale.id },
        data: { folio: formattedFolio }
      });
      currentSaleNum++;
    }
    config.folios.sale.nextNumber = Math.max(config.folios.sale.nextNumber, currentSaleNum);

    // 2. Retroactively seed Quotes (Cotizaciones)
    const quotes = await prisma.quote.findMany({
      where: { branchId: branch.id, folio: null },
      orderBy: { createdAt: 'asc' }
    });
    let currentQuoteNum = isPizca ? 1 : 1001;
    for (const quote of quotes) {
      const folioStr = isPizca ? currentQuoteNum.toString().padStart(2, '0') : currentQuoteNum;
      const formattedFolio = isPizca ? `${prefix}${folioStr}` : `${prefix}-${folioStr}`;
      await prisma.quote.update({
        where: { id: quote.id },
        data: { folio: formattedFolio }
      });
      currentQuoteNum++;
    }
    config.folios.quote.nextNumber = Math.max(config.folios.quote.nextNumber, currentQuoteNum);

    // 3. Retroactively seed Transfers (Traspasos)
    const transfers = await prisma.transfer.findMany({
      where: { branchId: branch.id, folio: null },
      orderBy: { createdAt: 'asc' }
    });
    let currentTransferNum = isPizca ? 1 : 1001;
    for (const transfer of transfers) {
      const folioStr = isPizca ? currentTransferNum.toString().padStart(2, '0') : currentTransferNum;
      const formattedFolio = isPizca ? `${prefix}${folioStr}` : `${prefix}-${folioStr}`;
      await prisma.transfer.update({
        where: { id: transfer.id },
        data: { folio: formattedFolio }
      });
      currentTransferNum++;
    }
    config.folios.transfer.nextNumber = Math.max(config.folios.transfer.nextNumber, currentTransferNum);

    // 4. Retroactively seed Purchases (Compras)
    const purchases = await prisma.purchase.findMany({
      where: { branchId: branch.id, folio: null },
      orderBy: { createdAt: 'asc' }
    });
    let currentPurchaseNum = isPizca ? 1 : 1001;
    for (const purchase of purchases) {
      const folioStr = isPizca ? currentPurchaseNum.toString().padStart(2, '0') : currentPurchaseNum;
      const formattedFolio = isPizca ? `${prefix}${folioStr}` : `${prefix}-${folioStr}`;
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { folio: formattedFolio }
      });
      currentPurchaseNum++;
    }
    config.folios.purchase.nextNumber = Math.max(config.folios.purchase.nextNumber, currentPurchaseNum);

    // 5. Retroactively seed Consignments (Consignaciones)
    const consignments = await prisma.consignment.findMany({
      where: { branchId: branch.id, folio: null },
      orderBy: { createdAt: 'asc' }
    });
    let currentConsignmentNum = isPizca ? 1 : 1001;
    for (const consignment of consignments) {
      const folioStr = isPizca ? currentConsignmentNum.toString().padStart(2, '0') : currentConsignmentNum;
      const formattedFolio = isPizca ? `${prefix}${folioStr}` : `${prefix}-${folioStr}`;
      await prisma.consignment.update({
        where: { id: consignment.id },
        data: { folio: formattedFolio }
      });
      currentConsignmentNum++;
    }
    config.folios.consignment.nextNumber = Math.max(config.folios.consignment.nextNumber, currentConsignmentNum);

    // Update branch settings with the final counters
    await prisma.branchSettings.update({
      where: { branchId: branch.id },
      data: { configJson: JSON.stringify(config) }
    });
  }

  revalidatePath('/preferencias/folios');
  revalidatePath('/ventas');
  revalidatePath('/ventas/cotizaciones');
  revalidatePath('/ventas/consignaciones');
  revalidatePath('/productos/compras');
  revalidatePath('/productos/traspasos');
}

/**
 * Updates the folios configuration settings for the active branch.
 */
export async function updateBranchFolioSettings(payload: {
  salePrefix: string;
  saleStart: number;
  quotePrefix: string;
  quoteStart: number;
  purchasePrefix: string;
  purchaseStart: number;
  transferPrefix: string;
  transferStart: number;
  consignmentPrefix: string;
  consignmentStart: number;
}) {
  const branch = await getActiveBranch();
  if (!branch || branch.id === 'GLOBAL') throw new Error("Acción no permitida en Vista Global.");

  const settings = await prisma.branchSettings.findUnique({
    where: { branchId: branch.id }
  });

  let config: any = {};
  if (settings?.configJson) {
    try {
      config = JSON.parse(settings.configJson);
    } catch (e) {}
  }

  config.folios = {
    sale: { prefix: payload.salePrefix.toUpperCase().trim(), nextNumber: Number(payload.saleStart) },
    quote: { prefix: payload.quotePrefix.toUpperCase().trim(), nextNumber: Number(payload.quoteStart) },
    purchase: { prefix: payload.purchasePrefix.toUpperCase().trim(), nextNumber: Number(payload.purchaseStart) },
    transfer: { prefix: payload.transferPrefix.toUpperCase().trim(), nextNumber: Number(payload.transferStart) },
    consignment: { prefix: payload.consignmentPrefix.toUpperCase().trim(), nextNumber: Number(payload.consignmentStart) }
  };

  await prisma.branchSettings.upsert({
    where: { branchId: branch.id },
    update: { configJson: JSON.stringify(config) },
    create: { branchId: branch.id, configJson: JSON.stringify(config) }
  });

  revalidatePath('/preferencias/folios');
}
