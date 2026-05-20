import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    if (!messageId) {
      return NextResponse.json({ error: "Missing message ID" }, { status: 400 });
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
