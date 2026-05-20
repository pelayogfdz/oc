import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranch } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const branch = await getActiveBranch();
    if (!branch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId } = await params;
    if (!messageId) {
      return NextResponse.json({ error: "Missing message ID" }, { status: 400 });
    }

    // Verify message belongs to this branch
    const message = await prisma.whatsAppMessage.findUnique({
      where: { messageId },
      include: { prospect: true }
    });

    if (!message || message.prospect.branchId !== branch.id) {
      return NextResponse.json({ error: "Access denied to this message media" }, { status: 403 });
    }

    const microservicePort = process.env.WHATSAPP_PORT || 3001;
    const response = await fetch(`http://localhost:${microservicePort}/api/media/${encodeURIComponent(messageId)}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[MEDIA PROXY] Microservice returned error status ${response.status}:`, errText);
      return NextResponse.json({ error: "Failed to download media from WhatsApp" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in Next.js WhatsApp media proxy:", error);
    return NextResponse.json({ error: error.message || "Failed to download media" }, { status: 500 });
  }
}
