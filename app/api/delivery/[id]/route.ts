import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, clientSignature, evidencePhoto } = body;

    if (!status || !clientSignature || !evidencePhoto) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updatedOrder = await prisma.deliveryOrder.update({
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
