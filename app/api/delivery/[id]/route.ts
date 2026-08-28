import { NextResponse } from 'next/server';
import { resolveClientForDeliveryOrder } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, clientSignature, evidencePhoto } = body;

    if (!status || !clientSignature || !evidencePhoto) {
      return NextResponse.json({ error: "Faltan campos requeridos (firma o fotografía de evidencia)." }, { status: 400 });
    }

    const resolved = await resolveClientForDeliveryOrder(id);
    if (!resolved) {
      return NextResponse.json({ error: "No se encontró el pedido de entrega en el sistema." }, { status: 404 });
    }

    const { client: db } = resolved;

    const updatedOrder = await db.deliveryOrder.update({
      where: { id },
      data: {
        status,
        clientSignature,
        evidencePhoto
      },
      include: {
        sale: {
          include: { customer: true, items: { include: { product: true } } }
        }
      }
    });

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error("Delivery Update Error:", error);
    return NextResponse.json({ error: error.message || "Error al registrar la entrega" }, { status: 500 });
  }
}

