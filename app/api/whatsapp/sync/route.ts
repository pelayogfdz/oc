import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getActiveBranch } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getActiveUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const branch = await getActiveBranch();
    if (!branch) {
      return NextResponse.json({ error: "No active branch found" }, { status: 404 });
    }

    let branchId = branch.id;
    if (branchId === 'GLOBAL') {
      const firstBranch = await prisma.branch.findFirst({
        where: { tenantId: branch.tenantId, isActive: true }
      });
      if (!firstBranch) {
        return NextResponse.json({ error: "No active branch found for tenant" }, { status: 404 });
      }
      branchId = firstBranch.id;
    }

    // Verify if there is an active session
    let session = await prisma.whatsAppSession.findUnique({
      where: { branchId }
    });

    // Check sibling connection fallback
    if ((!session || session.status !== 'CONNECTED') && user.tenantId) {
      const activeSiblingSession = await prisma.whatsAppSession.findFirst({
        where: {
          status: 'CONNECTED',
          branch: {
            tenantId: user.tenantId,
            isActive: true
          }
        }
      });
      if (activeSiblingSession) {
        session = activeSiblingSession;
        branchId = activeSiblingSession.branchId;
      }
    }

    if (!session || session.status !== 'CONNECTED') {
      return NextResponse.json({ error: "WhatsApp is not connected for this branch" }, { status: 400 });
    }

    // Call the microservice's /api/sync endpoint
    const microservicePort = process.env.WHATSAPP_PORT || 3001;
    const response = await fetch(`http://localhost:${microservicePort}/api/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ branchId })
    });

    if (!response.ok) {
      const errData = await response.json();
      return NextResponse.json({ error: errData.error || "Failed to trigger sync" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in Next.js WhatsApp sync proxy:", error);
    return NextResponse.json({ error: error.message || "Failed to trigger chat sync" }, { status: 500 });
  }
}
