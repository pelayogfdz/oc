import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

function extractBase64FromMessageBody(body: string): { data: string; mimetype: string; filename: string } | null {
  if (!body) return null;

  // 1. Data URI format (data:image/jpeg;base64,...)
  const dataUriMatch = body.match(/data:([a-zA-Z0-9/+-]+);base64,([A-Za-z0-9+/=]+)/);
  if (dataUriMatch) {
    const mimetype = dataUriMatch[1];
    const data = dataUriMatch[2];
    const ext = mimetype.includes('/') ? mimetype.split('/')[1] : 'jpg';
    return { data, mimetype, filename: `imagen.${ext}` };
  }

  // 2. JPEG Base64 signature (/9j/...)
  const jpegMatch = body.match(/(\/9j\/[A-Za-z0-9+/=]{40,})/);
  if (jpegMatch) {
    return { data: jpegMatch[1], mimetype: 'image/jpeg', filename: 'imagen.jpg' };
  }

  // 3. PNG Base64 signature (iVBORw0KGgo...)
  const pngMatch = body.match(/(iVBORw0KGgo[A-Za-z0-9+/=]{40,})/);
  if (pngMatch) {
    return { data: pngMatch[1], mimetype: 'image/png', filename: 'imagen.png' };
  }

  // 4. Base64 block inside bracket tags: [Imagen]: BASE64 or [Documento]: BASE64
  const prefixMatch = body.match(/(?:\[(?:Imagen|Archivo|Documento)[^\]]*\]):\s*([A-Za-z0-9+/=]{60,})/);
  if (prefixMatch) {
    const raw = prefixMatch[1];
    const isJpeg = raw.startsWith('/9j/');
    const isPng = raw.startsWith('iVBORw');
    const isPdf = raw.startsWith('JVBERi0');
    const mimetype = isJpeg ? 'image/jpeg' : isPng ? 'image/png' : isPdf ? 'application/pdf' : 'image/jpeg';
    const filename = isPdf ? 'documento.pdf' : isPng ? 'imagen.png' : 'imagen.jpg';
    return { data: raw, mimetype, filename };
  }

  return null;
}

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

    // Verify message belongs to this branch/tenant by either messageId or internal database id
    const message = await prisma.whatsAppMessage.findFirst({
      where: {
        OR: [
          { messageId },
          { id: messageId }
        ]
      },
      include: {
        prospect: {
          include: { branch: true }
        }
      }
    });

    if (!message) {
      const res = NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
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

    // Immediate check: If the message body already contains embedded base64 image or file data, return it instantly!
    const directMedia = extractBase64FromMessageBody(message.body);
    if (directMedia) {
      const res = NextResponse.json(directMedia);
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.headers.set('Pragma', 'no-cache');
      res.headers.set('Expires', '0');
      return res;
    }

    const activeMessageId = message.messageId || messageId;

    // Database-driven Media Request Queue
    let mediaRequest = await prisma.whatsAppMediaRequest.findUnique({
      where: { messageId: activeMessageId }
    });

    if (!mediaRequest) {
      try {
        mediaRequest = await prisma.whatsAppMediaRequest.create({
          data: {
            messageId: activeMessageId,
            status: "PENDING"
          }
        });
      } catch (err) {
        // Handle race conditions if another request created it simultaneously
        mediaRequest = await prisma.whatsAppMediaRequest.findUnique({
          where: { messageId: activeMessageId }
        });
      }
    }

    // If already failed or completed without data, reset it back to PENDING to retry
    if (mediaRequest && (mediaRequest.status === "FAILED" || (!mediaRequest.data && mediaRequest.status === "COMPLETED"))) {
      mediaRequest = await prisma.whatsAppMediaRequest.update({
        where: { messageId: activeMessageId },
        data: {
          status: "PENDING",
          data: null,
          mimetype: null,
          filename: null
        }
      });
    }

    // Wait and poll database for status changes (up to 15 seconds)
    let attempts = 0;
    const maxAttempts = 15;
    while (mediaRequest && mediaRequest.status === "PENDING" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      mediaRequest = await prisma.whatsAppMediaRequest.findUnique({
        where: { messageId: activeMessageId }
      });
      attempts++;
    }

    if (!mediaRequest || mediaRequest.status === "PENDING") {
      const res = NextResponse.json({ error: "Media download request timed out on VPS" }, { status: 504 });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return res;
    }

    if (mediaRequest.status === "FAILED") {
      const res = NextResponse.json({ error: "No se pudo obtener el archivo multimedia desde WhatsApp" }, { status: 500 });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return res;
    }

    // Successfully completed! Return the file payload
    const res = NextResponse.json({
      mimetype: mediaRequest.mimetype || "application/octet-stream",
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
