export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderPdfBuffer } from "@/lib/orderPdf";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        supplier: true,
        branch: {
          include: { settings: true, tenant: true }
        },
        items: {
          include: { product: true }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    const pdfBuffer = await generateOrderPdfBuffer(order);
    const filename = `pedido_${order.id.slice(0, 8).toUpperCase()}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });

  } catch (error: any) {
    console.error("Error generating order PDF download:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
