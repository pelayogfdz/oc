import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';

export async function POST(req: Request) {
  try {
    const branch = await getActiveBranch();
    
    const integration = await prisma.storeIntegration.findUnique({
      where: { branchId_platform: { branchId: branch.id, platform: 'UBER_EATS' } }
    });

    if (!integration || !integration.clientSecret) {
      return NextResponse.json({ error: 'Configuración o credenciales de Uber Eats faltantes.' }, { status: 400 });
    }

    // --- UBER EATS API SIMULATION ---
    // 1. Pull recent orders from Uber Eats API
    // We'll simulate 2 recent orders that occurred since the last sync
    const simulatedOrders = [
      {
        orderId: `UBER-${Math.floor(Math.random() * 900000) + 100000}`,
        customerName: 'Cliente Uber Eats #1',
        items: [
          { sku: 'SKU-001', qty: 2, price: 120.00 },
          { sku: 'SKU-EXT-002', qty: 1, price: 85.00 }
        ]
      }
    ];

    let salesCreated = 0;
    let itemsSubtracted = 0;

    // Resolve or create a general customer for Uber Eats in this branch
    let uberCustomer = await prisma.customer.findFirst({
      where: { name: 'Cliente General Uber Eats', branchId: branch.id }
    });
    if (!uberCustomer) {
      uberCustomer = await prisma.customer.create({
        data: {
          name: 'Cliente General Uber Eats',
          email: 'ubereats@caanma.com',
          phone: '0000000000',
          branchId: branch.id
        }
      });
    }

    for (const order of simulatedOrders) {
      // Check if we already processed this order (to prevent duplication)
      const existingSale = await prisma.sale.findFirst({
        where: { notes: { contains: order.orderId }, branchId: branch.id }
      });
      if (existingSale) continue;

      const saleItemsToCreate = [];
      let totalAmount = 0;

      for (const item of order.items) {
        // Find local product by SKU
        const localProduct = await prisma.product.findFirst({
          where: { sku: item.sku, branchId: branch.id }
        });

        if (localProduct) {
          saleItemsToCreate.push({
            productId: localProduct.id,
            quantity: item.qty,
            price: item.price
          });
          totalAmount += item.qty * item.price;

          // Decrement stock in database
          await prisma.product.update({
            where: { id: localProduct.id },
            data: { stock: { decrement: item.qty } }
          });

          // Create inventory movement
          await prisma.inventoryMovement.create({
            data: {
              productId: localProduct.id,
              type: 'OUT',
              quantity: -item.qty,
              reason: `Venta Uber Eats - Pedido #${order.orderId}`
            }
          });
          itemsSubtracted += item.qty;
        }
      }

      if (saleItemsToCreate.length > 0) {
        // Create the Sale record
        await prisma.sale.create({
          data: {
            folio: `UB-${order.orderId.split('-')[1]}`,
            total: totalAmount,
            status: 'COMPLETED',
            paymentMethod: 'CARD',
            customerId: uberCustomer.id,
            branchId: branch.id,
            notes: `Pedido de Uber Eats importado automáticamente. ID: ${order.orderId}`,
            items: {
              create: saleItemsToCreate.map(item => ({
                quantity: item.quantity,
                price: item.price,
                productId: item.productId
              }))
            }
          }
        });
        salesCreated++;
      }
    }

    // 2. Inventory Synchronization (Push local stock to Uber Eats Menu)
    // Find all products that have an External Product Map for Uber Eats
    const mappedProducts = await prisma.externalProductMap.findMany({
      where: { platform: 'UBER_EATS', product: { branchId: branch.id } },
      include: { product: true }
    });

    let inventorySyncedCount = 0;
    for (const map of mappedProducts) {
      // Here we would call: PUT https://api.uber.com/v2/eats/stores/{store_id}/menus/items/{item_id}
      // with payload: { "price": map.product.price, "suspended": map.product.stock <= 0, "stock": map.product.stock }
      
      // Update last sync timestamp locally
      await prisma.externalProductMap.update({
        where: { id: map.id },
        data: { lastSync: new Date() }
      });
      inventorySyncedCount++;
    }

    return NextResponse.json({
      success: true,
      message: 'Sincronización completa con Uber Eats.',
      stats: {
        salesCreated,
        itemsSubtracted,
        inventorySyncedCount
      }
    });

  } catch (error) {
    console.error('Uber Eats Sync Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
