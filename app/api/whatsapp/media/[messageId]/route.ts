import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

function extractBase64FromMessageBody(body: string): { data: string; mimetype: string; filename: string } | null {
  if (!body) return null;

  // Extract filename if present in bracket tag [Documento: nombre.pdf]
  let tagFilename = '';
  const tagFnMatch = body.match(/\[(?:Documento|Archivo|Imagen|Video|Audio):\s*([^\]]+)\]/i);
  if (tagFnMatch) {
    tagFilename = tagFnMatch[1].trim();
  }

  // 1. Data URI format (data:image/jpeg;base64,... or data:application/pdf;base64,...)
  const dataUriMatch = body.match(/data:([a-zA-Z0-9/+-]+);base64,([A-Za-z0-9+/=]+)/);
  if (dataUriMatch) {
    const mimetype = dataUriMatch[1];
    const data = dataUriMatch[2];
    const ext = mimetype.includes('pdf') ? 'pdf' : (mimetype.includes('/') ? mimetype.split('/')[1] : 'dat');
    return { data, mimetype, filename: tagFilename || `archivo.${ext}` };
  }

  // 2. Base64 block inside bracket tags: [Imagen]: BASE64 or [Documento: file.pdf]: BASE64
  const prefixMatch = body.match(/(?:\[(?:Imagen|Archivo|Documento|Video|Audio)[^\]]*\]):?\s*([A-Za-z0-9+/=]{60,})/i);
  if (prefixMatch) {
    const raw = prefixMatch[1];
    const isJpeg = raw.startsWith('/9j/');
    const isPng = raw.startsWith('iVBORw');
    const isPdf = raw.startsWith('JVBERi0');
    const mimetype = isPdf ? 'application/pdf' : isPng ? 'image/png' : isJpeg ? 'image/jpeg' : (tagFilename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
    const defaultName = isPdf ? 'documento.pdf' : isPng ? 'imagen.png' : isJpeg ? 'imagen.jpg' : 'archivo';
    return { data: raw, mimetype, filename: tagFilename || defaultName };
  }

  // 3. PDF Base64 signature (JVBERi0...)
  const pdfMatch = body.match(/(JVBERi0[A-Za-z0-9+/=]{40,})/);
  if (pdfMatch) {
    return { data: pdfMatch[1], mimetype: 'application/pdf', filename: tagFilename || 'documento.pdf' };
  }

  // 4. JPEG Base64 signature (/9j/...)
  const jpegMatch = body.match(/(\/9j\/[A-Za-z0-9+/=]{40,})/);
  if (jpegMatch) {
    return { data: jpegMatch[1], mimetype: 'image/jpeg', filename: tagFilename || 'imagen.jpg' };
  }

  // 5. PNG Base64 signature (iVBORw0KGgo...)
  const pngMatch = body.match(/(iVBORw0KGgo[A-Za-z0-9+/=]{40,})/);
  if (pngMatch) {
    return { data: pngMatch[1], mimetype: 'image/png', filename: tagFilename || 'imagen.png' };
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

    const activeMessageId = message.messageId || messageId;

    // 1. Check if we already have the full-resolution file cached in WhatsAppMediaRequest
    let mediaRequest = await prisma.whatsAppMediaRequest.findUnique({
      where: { messageId: activeMessageId }
    });

    if (mediaRequest && mediaRequest.status === "COMPLETED" && mediaRequest.data) {
      const isPdf = (mediaRequest.filename && mediaRequest.filename.toLowerCase().endsWith('.pdf')) || mediaRequest.mimetype?.includes('pdf') || mediaRequest.data.startsWith('JVBERi0');
      const mimetype = mediaRequest.mimetype || (isPdf ? 'application/pdf' : 'image/jpeg');
      const filename = mediaRequest.filename || (isPdf ? 'documento.pdf' : 'archivo');
      const res = NextResponse.json({
        mimetype,
        data: mediaRequest.data,
        filename
      });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.headers.set('Pragma', 'no-cache');
      res.headers.set('Expires', '0');
      return res;
    }

    // 2. If not already completed, queue the request for whatsapp-service to download high-res from WhatsApp
    if (!mediaRequest) {
      try {
        mediaRequest = await prisma.whatsAppMediaRequest.create({
          data: {
            messageId: activeMessageId,
            status: "PENDING"
          }
        });
      } catch (err) {
        mediaRequest = await prisma.whatsAppMediaRequest.findUnique({
          where: { messageId: activeMessageId }
        });
      }
    } else if (mediaRequest.status === "FAILED" || !mediaRequest.data) {
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

    // Wait and poll database for high-res download (up to 12 seconds)
    let attempts = 0;
    const maxAttempts = 12;
    while (mediaRequest && mediaRequest.status === "PENDING" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      mediaRequest = await prisma.whatsAppMediaRequest.findUnique({
        where: { messageId: activeMessageId }
      });
      attempts++;
    }

    // 3. If successfully completed by whatsapp-service, return the FULL HIGH-RESOLUTION file!
    if (mediaRequest && mediaRequest.status === "COMPLETED" && mediaRequest.data) {
      const isPdf = (mediaRequest.filename && mediaRequest.filename.toLowerCase().endsWith('.pdf')) || mediaRequest.mimetype?.includes('pdf') || mediaRequest.data.startsWith('JVBERi0');
      const mimetype = mediaRequest.mimetype || (isPdf ? 'application/pdf' : 'image/jpeg');
      const filename = mediaRequest.filename || (isPdf ? 'documento.pdf' : 'archivo');
      const res = NextResponse.json({
        mimetype,
        data: mediaRequest.data,
        filename
      });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.headers.set('Pragma', 'no-cache');
      res.headers.set('Expires', '0');
      return res;
    }

    // 4. Fallback: If full-res download failed or timed out, fallback to embedded thumbnail in message body
    const directMedia = extractBase64FromMessageBody(message.body);
    if (directMedia) {
      const res = NextResponse.json(directMedia);
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.headers.set('Pragma', 'no-cache');
      res.headers.set('Expires', '0');
      return res;
    }

    const res = NextResponse.json({ error: "No se pudo obtener el archivo multimedia desde WhatsApp" }, { status: 500 });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res;
  } catch (error: any) {
    console.error("Error in Next.js WhatsApp media proxy:", error);
    const res = NextResponse.json({ error: error.message || "Failed to download media" }, { status: 500 });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res;
  }
}
