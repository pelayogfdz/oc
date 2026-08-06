import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';

export async function GET(req: Request) {
  try {
    const branch = await getActiveBranch();
    if (!branch) {
      return NextResponse.json({ sales: [] });
    }

    // Obtener fecha del inicio del día de hoy
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Obtener ventas de Mercado Libre registradas hoy en esta sucursal
    const sales = await prisma.sale.findMany({
      where: {
        branchId: branch.id,
        createdAt: { gte: todayStart },
        notes: { contains: 'Mercado Libre Orden' }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Formatear la respuesta para el popup del frontend
    const formattedSales = sales.map(sale => {
      // Extraer datos del comprador, ID de orden y guía de las notas
      const notes = sale.notes || '';
      
      const orderMatch = notes.match(/Mercado Libre Orden\s*(\d+)/);
      const orderId = orderMatch ? orderMatch[1] : null;

      const guideMatch = notes.match(/Guía de Envío:\s*(\S+)/);
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
      } else {
        guideUrl = null;
      }

      const buyerMatch = notes.match(/Comprador:\s*([^\n\r]+)/);
      const buyerName = buyerMatch ? buyerMatch[1].trim() : 'Cliente Mercado Libre';

      return {
        id: sale.id,
        folio: sale.folio || `ML-${orderId || sale.id.substring(0,6)}`,
        total: sale.total,
        createdAt: sale.createdAt,
        buyerName,
        orderId,
        guideUrl,
        items: sale.items.map(item => ({
          id: item.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price
        }))
      };
    });

    return NextResponse.json({ sales: formattedSales });

  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error('[MELI NOTIFICATIONS API] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
