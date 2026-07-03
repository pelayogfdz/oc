export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getActiveBranch } from "@/app/actions/auth";
import { generatePurchasePdfBuffer } from "@/lib/purchasePdf";

export async function GET(request: Request) {
  try {
    const user = await getActiveUser();
    const branch = await getActiveBranch();
    
    if (!user || !branch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const purchaseId = searchParams.get("purchaseId");

    if (!purchaseId) {
      return NextResponse.json({ error: "Missing purchaseId" }, { status: 400 });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        branch: {
          include: { settings: true, tenant: true }
        },
        supplier: true,
        user: true,
        items: {
          include: { 
            product: true,
            fuelTraceability: true
          }
        }
      }
    });

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    // Validate branch authorization
    if (branch.id !== 'GLOBAL' && branch.id !== purchase.branchId) {
      return NextResponse.json({ error: "Unauthorized for this branch" }, { status: 403 });
    }

    const pdfBuffer = await generatePurchasePdfBuffer(purchase);
    const filename = `orden_compra_${purchase.folio || purchase.id.slice(0, 8).toUpperCase()}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });

  } catch (error: any) {
    console.error("Error generating purchase order PDF download:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
