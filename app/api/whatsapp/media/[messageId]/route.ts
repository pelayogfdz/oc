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

    const microservicePort = process.env.WHATSAPP_PORT || 3001;
    const response = await fetch(`http://localhost:${microservicePort}/api/media/${encodeURIComponent(messageId)}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[MEDIA PROXY] Microservice returned error status ${response.status}:`, errText);
      const res = NextResponse.json({ error: "Failed to download media from WhatsApp" }, { status: response.status });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return res;
    }

    const data = await response.json();
    const res = NextResponse.json(data);
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
