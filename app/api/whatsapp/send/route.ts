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
    const { phone, message, prospectId, media } = data;

    let effectiveMessage = (message || "").trim();
    if (!effectiveMessage && media) {
      if (media.mimetype?.startsWith('image/')) {
        effectiveMessage = "📎 [Imagen]";
      } else if (media.filename) {
        effectiveMessage = `📎 [Documento: ${media.filename}]`;
      } else {
        effectiveMessage = "📎 [Archivo]";
      }
    }

    if (!phone || !effectiveMessage || !prospectId) {
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

    // Deduplication check: only for plain text messages, not when media is being sent
    if (!media) {
      const recentDuplicate = await prisma.whatsAppMessage.findFirst({
        where: {
          prospectId,
          body: effectiveMessage,
          isFromMe: true,
          createdAt: {
            gte: new Date(Date.now() - 10000)
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (recentDuplicate) {
        console.log(`[WHATSAPP PROXY] Ignored duplicate message submission for prospect ${prospectId}`);
        return NextResponse.json({ success: true, messageId: recentDuplicate.id, duplicatePrevented: true });
      }
    }

    // we insert the message into the database with messageId = null.
    // The microservice will poll the database for these pending messages and send them.
    const newMessage = await prisma.whatsAppMessage.create({
      data: {
        prospectId,
        body: effectiveMessage,
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

    // Disparar envío inmediato al microservicio en segundo plano para entrega instantánea
    const whatsappUrl = process.env.WHATSAPP_SERVICE_URL || 'http://caanma-whatsapp:3001';
    fetch(`${whatsappUrl}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branchId: prospect.branchId,
        prospectId: prospect.id,
        phone: prospect.phone,
        message: message || '',
        pendingMessageId: newMessage.id,
        tenantId: user.tenantId,
        media: media || data.media
      })
    }).catch((err) => {
      console.error("[WHATSAPP PROXY] Immediate send error:", err);
    });

    return NextResponse.json({ success: true, messageId: newMessage.id });
  } catch (error) {
    console.error("Error in Next.js WhatsApp proxy:", error);
    return NextResponse.json({ error: "Failed to queue message for sending" }, { status: 500 });
  }
}
