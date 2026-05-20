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

    const url = new URL(request.url);
    const branchIdParam = url.searchParams.get("branchId");

    let branchId: string;

    if (branchIdParam) {
      // Validate strictly that the branch belongs to the user's tenant
      const targetBranch = await prisma.branch.findFirst({
        where: { id: branchIdParam, tenantId: user.tenantId, isActive: true }
      });

      if (!targetBranch) {
        const response = NextResponse.json({ error: "Branch not found or access denied" }, { status: 403 });
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        return response;
      }
      branchId = targetBranch.id;
    } else {
      const branch = await getActiveBranch();
      if (!branch) {
        const response = NextResponse.json({ error: "No branch found" }, { status: 404 });
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        return response;
      }

      branchId = branch.id;
      if (branchId === 'GLOBAL') {
        const firstBranch = await prisma.branch.findFirst({
          where: { tenantId: branch.tenantId, isActive: true }
        });
        if (!firstBranch) {
          const response = NextResponse.json({ error: "No active branch found for tenant" }, { status: 404 });
          response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          response.headers.set('Pragma', 'no-cache');
          response.headers.set('Expires', '0');
          return response;
        }
        branchId = firstBranch.id;
      }
    }

    // Ping Express microservice to lazily initialize client for this branch if not already running
    const microservicePort = process.env.WHATSAPP_PORT || 3001;
    try {
      await fetch(`http://localhost:${microservicePort}/api/status?branchId=${branchId}`, {
        method: "GET",
        cache: "no-store",
      });
    } catch (err: any) {
      console.warn(`[STATUS ROUTE] Failed to ping microservice status for branch ${branchId}:`, err.message);
    }

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

    // Tenant connected fallback:
    // If the active session for the current branch is not connected, but another branch
    // in the same tenant is connected, we fallback to the connected one so the tenant 
    // is treated as connected.
    if (session.status !== 'CONNECTED' && user.tenantId) {
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
        console.log(`[STATUS Fallback] Using active sibling session from branch ${activeSiblingSession.branchId} for branch ${branchId}`);
        session = activeSiblingSession;
      }
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
