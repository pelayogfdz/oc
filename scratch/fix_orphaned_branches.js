const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const orphanedBranchIds = [
  '428a0c19-31c8-49f9-8391-8d7d1800c006',
  'a5475e62-2e1f-4b2d-82c6-4f00b8ee844d',
  '36142abe-25c3-4697-9997-86fd475ef0d7',
  'be26644c-fad8-4c2a-80d4-f400e2bf439b'
];

async function main() {
  console.log('Checking references for orphaned branches...');

  for (const bId of orphanedBranchIds) {
    console.log(`\n=== Checking Branch ID: ${bId} ===`);
    
    const usersCount = await prisma.user.count({ where: { branchId: bId } });
    const cashSessionsCount = await prisma.cashSession.count({ where: { branchId: bId } });
    const customersCount = await prisma.customer.count({ where: { branchId: bId } });
    const customerPaymentsCount = await prisma.customerPayment.count({ where: { branchId: bId } });
    const expensesCount = await prisma.expense.count({ where: { branchId: bId } });
    const hrLocationsCount = await prisma.hrLocation.count({ where: { branchId: bId } });
    const inventoryAdjustmentsCount = await prisma.inventoryAdjustmentDoc.count({ where: { branchId: bId } });
    const inventoryAuditsCount = await prisma.inventoryAudit.count({ where: { branchId: bId } });
    const priceListsCount = await prisma.priceList.count({ where: { branchId: bId } });
    const productsCount = await prisma.product.count({ where: { branchId: bId } });
    const productionOrdersCount = await prisma.productionOrder.count({ where: { branchId: bId } });
    const promotionsCount = await prisma.promotion.count({ where: { branchId: bId } });
    const prospectsCount = await prisma.prospect.count({ where: { branchId: bId } });
    const purchasesCount = await prisma.purchase.count({ where: { branchId: bId } });
    const purchaseOrdersCount = await prisma.purchaseOrder.count({ where: { branchId: bId } });
    const purchaseRequestsCount = await prisma.purchaseRequest.count({ where: { branchId: bId } });
    const quotesCount = await prisma.quote.count({ where: { branchId: bId } });
    const salesCount = await prisma.sale.count({ where: { branchId: bId } });
    const returnsCount = await prisma.saleReturn.count({ where: { branchId: bId } });
    const storeIntegrationsCount = await prisma.storeIntegration.count({ where: { branchId: bId } });
    const suppliersCount = await prisma.supplier.count({ where: { branchId: bId } });
    const supplierPaymentsCount = await prisma.supplierPayment.count({ where: { branchId: bId } });
    const whatsappSessionsCount = await prisma.whatsAppSession.count({ where: { branchId: bId } });

    console.log(`- Users: ${usersCount}`);
    console.log(`- Cash Sessions: ${cashSessionsCount}`);
    console.log(`- Customers: ${customersCount}`);
    console.log(`- Customer Payments: ${customerPaymentsCount}`);
    console.log(`- Expenses: ${expensesCount}`);
    console.log(`- HR Locations: ${hrLocationsCount}`);
    console.log(`- Inventory Adjustments: ${inventoryAdjustmentsCount}`);
    console.log(`- Inventory Audits: ${inventoryAuditsCount}`);
    console.log(`- Price Lists: ${priceListsCount}`);
    console.log(`- Products: ${productsCount}`);
    console.log(`- Production Orders: ${productionOrdersCount}`);
    console.log(`- Promotions: ${promotionsCount}`);
    console.log(`- Prospects: ${prospectsCount}`);
    console.log(`- Purchases: ${purchasesCount}`);
    console.log(`- Purchase Orders: ${purchaseOrdersCount}`);
    console.log(`- Purchase Requests: ${purchaseRequestsCount}`);
    console.log(`- Quotes: ${quotesCount}`);
    console.log(`- Sales: ${salesCount}`);
    console.log(`- Returns: ${returnsCount}`);
    console.log(`- Store Integrations: ${storeIntegrationsCount}`);
    console.log(`- Suppliers: ${suppliersCount}`);
    console.log(`- Supplier Payments: ${supplierPaymentsCount}`);
    console.log(`- WhatsApp Sessions: ${whatsappSessionsCount}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
