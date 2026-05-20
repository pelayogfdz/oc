import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { phone, message, prospectId } = data;

    if (!phone || !message || !prospectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Instead of calling the local microservice via HTTP (which fails in production),
    // we insert the message into the database with messageId = null.
    // The microservice will poll the database for these pending messages and send them.
    const newMessage = await prisma.whatsAppMessage.create({
      data: {
        prospectId,
        body: message,
        isFromMe: true,
        messageId: null, // Marks this as pending to be sent by the microservice
        timestamp: new Date(),
      }
    });

    // Actualizar updatedAt del prospecto para empujar la conversación arriba al instante
    await prisma.prospect.update({
      where: { id: prospectId },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({ success: true, messageId: newMessage.id });
  } catch (error) {
    console.error("Error in Next.js WhatsApp proxy:", error);
    return NextResponse.json({ error: "Failed to queue message for sending" }, { status: 500 });
  }
}
