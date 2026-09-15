import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const branch = await getActiveBranch();
    if (!branch) {
      return NextResponse.json({ sales: [] });
    }

    // Obtener fecha del inicio del día de hoy
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Obtener ventas online registradas hoy en esta sucursal (Mercado Libre, B2C Web, Google Pay, etc.)
    const sales = await prisma.sale.findMany({
      where: {
        branchId: branch.id,
        createdAt: { gte: todayStart },
        OR: [
          { notes: { contains: 'Mercado Libre' } },
          { notes: { contains: 'Venta importada automáticamente vía API externa' } },
          { notes: { contains: 'Pago aprobado con Google Pay' } },
          { notes: { contains: 'Venta Online API' } },
          { notes: { contains: 'Código de Recolección' } },
          { notes: { contains: 'Catálogo B2C' } },
          { notes: { contains: 'Tienda Online' } },
          { notes: { contains: 'Pedido Web' } },
          { notes: { contains: 'B2C' } },
          { user: { name: { in: ['VENTAS ONLINE PAGINA', 'VENTAS ONLINE'] } } },
          { deliveryOrder: { isNot: null } }
        ]
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        deliveryOrder: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                imageUrl: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 25
    });

    // Formatear la respuesta para el popup del frontend
    const formattedSales = sales.map(sale => {
      const notes = sale.notes || '';
      
      // Clasificación de canal
      let channel: 'MERCADO_LIBRE' | 'B2C_WEB' | 'GOOGLE_PAY' | 'RAPPI' | 'UBER_EATS' | 'ONLINE_GENERIC' = 'B2C_WEB';
      let channelLabel = 'Página Web Vinculada (B2C)';

      if (notes.includes('Mercado Libre')) {
        channel = 'MERCADO_LIBRE';
        channelLabel = 'Mercado Libre';
      } else if (notes.includes('Google Pay')) {
        channel = 'GOOGLE_PAY';
        channelLabel = 'Venta Web (Google Pay)';
      } else if (notes.includes('Rappi')) {
        channel = 'RAPPI';
        channelLabel = 'Rappi';
      } else if (notes.includes('Uber')) {
        channel = 'UBER_EATS';
        channelLabel = 'Uber Eats';
      } else if (
        sale.user?.name === 'VENTAS ONLINE PAGINA' ||
        sale.user?.name === 'VENTAS ONLINE' ||
        notes.includes('API externa') ||
        notes.includes('Catálogo B2C') ||
        notes.includes('Tienda Online') ||
        notes.includes('Pedido Web') ||
        notes.includes('B2C') ||
        notes.includes('Venta Online') ||
        notes.includes('Código de Recolección') ||
        sale.deliveryOrder
      ) {
        channel = 'B2C_WEB';
        channelLabel = 'Página Web Vinculada (B2C)';
      } else {
        channel = 'ONLINE_GENERIC';
        channelLabel = 'Venta Online';
      }

      // Extracción de datos específicos
      const orderMatch = notes.match(/Mercado Libre Orden\s*(\d+)/i) || notes.match(/Orden #?([A-Za-z0-9-]+)/i);
      const orderId = orderMatch ? orderMatch[1] : null;

      const pickupMatch = notes.match(/Código de Recolección(?: en Tienda)?:\s*([A-Za-z0-9-]+)/i);
      const pickupCode = pickupMatch ? pickupMatch[1] : null;

      const guideMatch = notes.match(/Guía de Envío:\s*(\S+)/i);
      let guideUrl = guideMatch ? guideMatch[1] : null;
      if (guideUrl && guideUrl.endsWith('.')) {
        guideUrl = guideUrl.slice(0, -1);
      }
      if (guideUrl && guideUrl.includes('/shipments/')) {
        const shipmentMatch = guideUrl.match(/\/shipments\/(\d+)/);
        const shipmentId = shipmentMatch ? shipmentMatch[1] : null;
        if (shipmentId) {
          guideUrl = `/api/mercadolibre/labels?shipmentId=${shipmentId}&branchId=${sale.branchId}`;
        } else {
          guideUrl = null;
        }
      } else if (channel !== 'MERCADO_LIBRE') {
        guideUrl = null;
      }

      const buyerMatch = notes.match(/Comprador:\s*([^\n\r|]+)/i) || notes.match(/Cliente:\s*([^\n\r|]+)/i);
      const buyerName = (sale.customer?.name && sale.customer.name !== 'PUBLICO EN GENERAL' && sale.customer.name !== 'PÚBLICO EN GENERAL')
        ? sale.customer.name
        : (buyerMatch ? buyerMatch[1].trim() : (sale.customer?.name || 'Cliente Online'));

      const buyerEmail = sale.customer?.email || null;
      const buyerPhone = sale.customer?.phone || null;

      // Determinación de modo de entrega
      let deliveryMode: 'delivery' | 'pickup' | 'standard' = 'standard';
      let deliveryAddress: string | null = null;

      if (sale.deliveryOrder) {
        deliveryMode = 'delivery';
        const parts = [
          sale.deliveryOrder.street,
          sale.deliveryOrder.exteriorNumber ? `#${sale.deliveryOrder.exteriorNumber}` : null,
          sale.deliveryOrder.interiorNumber ? `Int. ${sale.deliveryOrder.interiorNumber}` : null,
          sale.deliveryOrder.neighborhood ? `Col. ${sale.deliveryOrder.neighborhood}` : null,
          sale.deliveryOrder.city,
          sale.deliveryOrder.zipCode ? `C.P. ${sale.deliveryOrder.zipCode}` : null
        ].filter(Boolean);
        deliveryAddress = parts.join(', ');
      } else if (pickupCode || notes.toLowerCase().includes('recoger') || notes.toLowerCase().includes('recolección')) {
        deliveryMode = 'pickup';
      } else if (notes.toLowerCase().includes('domicilio') || notes.toLowerCase().includes('envío')) {
        deliveryMode = 'delivery';
      }

      return {
        id: sale.id,
        folio: sale.folio || (orderId ? `WEB-${orderId}` : `VT-${sale.id.substring(0, 6).toUpperCase()}`),
        total: sale.total,
        createdAt: sale.createdAt,
        channel,
        channelLabel,
        buyerName,
        buyerEmail,
        buyerPhone,
        deliveryMode,
        deliveryAddress,
        pickupCode,
        orderId,
        guideUrl,
        notes: sale.notes,
        paymentMethod: sale.paymentMethod,
        items: sale.items.map(item => ({
          id: item.id,
          productName: item.product?.name || 'Producto',
          sku: item.product?.sku || '',
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
          imageUrl: item.product?.imageUrl || null
        }))
      };
    });

    return NextResponse.json({ sales: formattedSales });

  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error('[ONLINE SALES NOTIFICATIONS API] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

