import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser } from "@/app/actions/auth";

export async function POST(request: Request) {
  try {
    const user = await getActiveUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { phone, message, prospectId } = data;

    if (!phone || !message || !prospectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    // Verify that the prospect belongs to the current tenant to ensure isolation
    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId },
      include: { branch: true }
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Strict safety isolation check: Ensure the prospect belongs to the logged-in user's tenant
    if (prospect.branch.tenantId !== user.tenantId) {
      return NextResponse.json({ error: "Access denied to this prospect" }, { status: 403 });
    }

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
