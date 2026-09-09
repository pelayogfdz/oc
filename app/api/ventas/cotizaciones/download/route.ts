export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { resolveClientForQuote } from "@/lib/prisma";
import { generateQuotePdfBuffer } from "@/lib/quotePdf";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const quoteId = searchParams.get("quoteId");

    if (!quoteId) {
      return NextResponse.json({ error: "Missing quoteId" }, { status: 400 });
    }

    const result = await resolveClientForQuote(quoteId);

    if (!result || !result.quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const quote = result.quote;

    const pdfBuffer = await generateQuotePdfBuffer(quote);
    const filename = `cotizacion_${quote.folio || quote.id.slice(0, 8).toUpperCase()}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });

  } catch (error: any) {
    console.error("Error generating quote PDF download:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
