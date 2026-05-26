import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const user = await getActiveUser();
    if (!user) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return res;
    }

    const { messageId } = await params;
    if (!messageId) {
      const res = NextResponse.json({ error: "Missing message ID" }, { status: 400 });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return res;
    }

    // Verify message belongs to this branch/tenant
    const message = await prisma.whatsAppMessage.findUnique({
      where: { messageId },
      include: {
        prospect: {
          include: { branch: true }
        }
      }
    });

    if (!message) {
      const res = NextResponse.json({ error: "Access denied to this message media" }, { status: 403 });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return res;
    }

    // Strict safety isolation check at tenant level
    const hasAccess = message.prospect.branch.tenantId === user.tenantId;

    if (!hasAccess) {
      const res = NextResponse.json({ error: "Access denied to this message media" }, { status: 403 });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return res;
    }

    // Database-driven Media Request Queue
    let mediaRequest = await prisma.whatsAppMediaRequest.findUnique({
      where: { messageId }
    });

    if (!mediaRequest) {
      try {
        mediaRequest = await prisma.whatsAppMediaRequest.create({
          data: {
            messageId,
            status: "PENDING"
          }
        });
      } catch (err) {
        // Handle race conditions if another request created it simultaneously
        mediaRequest = await prisma.whatsAppMediaRequest.findUnique({
          where: { messageId }
        });
      }
    }

    // If already failed, reset it back to PENDING to retry
    if (mediaRequest && mediaRequest.status === "FAILED") {
      mediaRequest = await prisma.whatsAppMediaRequest.update({
        where: { messageId },
        data: {
          status: "PENDING",
          data: null,
          mimetype: null,
          filename: null
        }
      });
    }

    // Wait and poll Neon database for status changes (up to 15 seconds)
    let attempts = 0;
    const maxAttempts = 15;
    while (mediaRequest && mediaRequest.status === "PENDING" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      mediaRequest = await prisma.whatsAppMediaRequest.findUnique({
        where: { messageId }
      });
      attempts++;
    }

    if (!mediaRequest || mediaRequest.status === "PENDING") {
      const res = NextResponse.json({ error: "Media download request timed out on VPS" }, { status: 504 });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return res;
    }

    if (mediaRequest.status === "FAILED") {
      const res = NextResponse.json({ error: "VPS microservice failed to download media" }, { status: 500 });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return res;
    }

    // Successfully completed! Return the file payload
    const res = NextResponse.json({
      mimetype: mediaRequest.mimetype,
      data: mediaRequest.data,
      filename: mediaRequest.filename || "archivo"
    });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  } catch (error: any) {
    console.error("Error in Next.js WhatsApp media proxy:", error);
    const res = NextResponse.json({ error: error.message || "Failed to download media" }, { status: 500 });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res;
  }
}
