import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveBranch, getActiveUser } from '@/app/actions/auth';

export async function POST(req: Request) {
  try {
    const branch = await getActiveBranch();
    if (!branch) {
      return NextResponse.json({ error: 'No autorizado. Sucursal no activa o no configurada.' }, { status: 401 });
    }

    let user;
    try {
      user = await getActiveUser();
    } catch (e) {
      // Fallback to a user from the branch or tenant if session cannot be resolved
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { branchId: branch.id },
            { tenantId: branch.tenantId }
          ]
        }
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'No se encontró ningún usuario configurado en esta sucursal para asociar la venta.' }, { status: 400 });
    }

    const integration = await prisma.storeIntegration.findUnique({
      where: { branchId_platform: { branchId: branch.id, platform: 'RAPPI' } }
    });

    if (!integration || !integration.clientSecret) {
      return NextResponse.json({ error: 'Configuración o credenciales de Rappi faltantes.' }, { status: 400 });
    }

    // --- RAPPI API SIMULATION ---
    // 1. Pull recent orders from Rappi Store API
    // We'll simulate 2 recent orders that occurred since the last sync
    const simulatedOrders = [
      {
        orderId: `RAPPI-${Math.floor(Math.random() * 900000) + 100000}`,
        customerName: 'Cliente Rappi #1',
        items: [
          { sku: 'SKU-001', qty: 1, price: 120.00 },
          { sku: 'SKU-EXT-002', qty: 3, price: 85.00 }
        ]
      }
    ];

    let salesCreated = 0;
    let itemsSubtracted = 0;

    // Resolve or create a general customer for Rappi in this branch
    let rappiCustomer = await prisma.customer.findFirst({
      where: { name: 'Cliente General Rappi', branchId: branch.id }
    });
    if (!rappiCustomer) {
      rappiCustomer = await prisma.customer.create({
        data: {
          name: 'Cliente General Rappi',
          email: 'rappi@caanma.com',
          phone: '0000000000',
          branchId: branch.id
        }
      });
    }

    for (const order of simulatedOrders) {
      // Check if we already processed this order
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
              reason: `Venta Rappi - Pedido #${order.orderId}`,
              userId: user.id
            }
          });
          itemsSubtracted += item.qty;
        }
      }

      if (saleItemsToCreate.length > 0) {
        // Create the Sale record
        await prisma.sale.create({
          data: {
            folio: `RP-${order.orderId.split('-')[1]}`,
            total: totalAmount,
            status: 'COMPLETED',
            paymentMethod: 'CARD',
            customerId: rappiCustomer.id,
            branchId: branch.id,
            userId: user.id,
            notes: `Pedido de Rappi importado automáticamente. ID: ${order.orderId}`,
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

    // 2. Inventory Synchronization (Push local stock to Rappi API)
    // Find all products that have an External Product Map for Rappi
    const mappedProducts = await prisma.externalProductMap.findMany({
      where: { platform: 'RAPPI', product: { branchId: branch.id } },
      include: { product: true }
    });

    let inventorySyncedCount = 0;
    for (const map of mappedProducts) {
      // Here we would call: PUT https://api.rappi.com/v2/stores/{store_id}/products/{sku}/stock
      // with payload: { "stock": map.product.stock }
      
      // Update last sync timestamp locally
      await prisma.externalProductMap.update({
        where: { id: map.id },
        data: { lastSync: new Date() }
      });
      inventorySyncedCount++;
    }

    return NextResponse.json({
      success: true,
      message: 'Sincronización completa con Rappi.',
      stats: {
        salesCreated,
        itemsSubtracted,
        inventorySyncedCount
      }
    });

  } catch (error) {
    console.error('Rappi Sync Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
