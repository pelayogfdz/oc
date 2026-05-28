import { NextResponse } from "next/server";
import { getActiveUser, getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getActiveUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const firstBranch = await prisma.branch.findFirst({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { createdAt: 'asc' }
    });

    if (!firstBranch) {
      return NextResponse.json({ error: "No active branch found for tenant" }, { status: 404 });
    }

    const branchId = firstBranch.id;

    // Instead of fetch, update the database directly to trigger the polling microservice
    await prisma.whatsAppSession.upsert({
      where: { branchId },
      update: {
        status: 'LOGGING_OUT',
        sessionData: null,
      },
      create: {
        branchId,
        status: 'LOGGING_OUT',
        sessionData: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging out WhatsApp:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
