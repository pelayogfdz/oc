import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Webhook listener for Mercado Libre events
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Validamos el origen si es posible / Meli suele enviar POST con JSON
    // Ej: { "resource": "/orders/12345678", "user_id": 1234, "topic": "orders" }
    
    if (payload.topic === 'orders') {
       // Logic for processing an order
       console.log(`[MELI WEBHOOK] Nueva Orden Detectada: ${payload.resource}`);

       // SIMULATED: In a real app we would use the access token associated with payload.user_id 
       // to fetch the details of /orders/12345678 and figure out which externalId was sold.
       // For mock purposes, let's assume we fetch the order and it says: 'MLM12345678' qty 1

       const externalIdSold = 'MLM12345678';
       const qtySold = 1;

       // Find the product map
       const mappedItem = await prisma.externalProductMap.findFirst({
         where: { externalId: externalIdSold, platform: 'MERCADO_LIBRE' },
         include: { product: true }
       });

       if (mappedItem) {
          // Descontar inventario local
          await prisma.product.update({
            where: { id: mappedItem.product.id },
            data: { stock: { decrement: qtySold } }
          });

          // Registrar en Kardex de Pulpos
          await prisma.inventoryMovement.create({
            data: {
              productId: mappedItem.product.id,
              type: 'OUT',
              quantity: -qtySold,
              reason: `Venta Externa Mercado Libre API (Ref: ${payload.resource})`
            }
          });

          // Opcional: Registrar una "Sale" en Pulpos para reflejar en el balance contable
          // ... 
       }
    }

    // Always respond 200 to MELI immediately so they don't retry incessantly
    return new NextResponse('OK', { status: 200 });

  } catch (err) {
    console.error('Meli Webhook Error:', err);
    // Even on error, it's sometimes best to send 200 if we logged it, or 500 if we want MELI to retry.
    return new NextResponse('Error', { status: 500 });
  }
}
