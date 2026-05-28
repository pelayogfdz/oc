import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getActiveBranch } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getActiveUser();
    if (!user) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }

    const firstBranch = await prisma.branch.findFirst({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { createdAt: 'asc' }
    });

    if (!firstBranch) {
      const response = NextResponse.json({ error: "No active branch found for tenant" }, { status: 404 });
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }

    const branchId = firstBranch.id;

    // No need to ping Express microservice directly from serverless function.
    // The database-driven signaling and periodic polling on the VPS will handle client lifetime/memory.

    let session = await prisma.whatsAppSession.findUnique({
      where: { branchId }
    });

    if (!session) {
      session = await prisma.whatsAppSession.create({
        data: {
          branchId,
          status: 'DISCONNECTED'
        }
      });
    }

    const dbBranch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: { tenant: true }
    });

    const tenantName = dbBranch?.tenant?.name || "Mi Empresa";
    const branchName = dbBranch?.name || "";
    const branchLocation = dbBranch?.location || "";
    const userRole = user.role;

    const showWidget = session?.status === 'CONNECTED' || userRole === 'ADMIN' || userRole === 'MANAGER';

    const response = NextResponse.json({ 
      isAuthorized: true, 
      session,
      tenantName,
      branchName,
      branchLocation,
      userRole,
      showWidget
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error) {
    console.error("Error fetching WhatsApp status:", error);
    const response = NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }
}
