import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getActiveBranch } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const queryBranchId = url.searchParams.get("branchId");
    
    console.log(`[STATUS_API] Solicitud recibida. Query branchId: ${queryBranchId}`);

    const user = await getActiveUser();
    if (!user) {
      console.warn(`[STATUS_API] Usuario no autenticado`);
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }

    console.log(`[STATUS_API] Usuario autenticado: ${user.email} (TenantId: ${user.tenantId})`);

    const firstBranch = await prisma.branch.findFirst({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { createdAt: 'asc' }
    });

    if (!firstBranch) {
      console.warn(`[STATUS_API] No se encontró sucursal activa para el tenant ${user.tenantId}`);
      const response = NextResponse.json({ error: "No active branch found for tenant" }, { status: 404 });
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }

    const branchId = firstBranch.id;
    console.log(`[STATUS_API] Usando branchId resuelto: ${branchId} (${firstBranch.name})`);

    let session = await prisma.whatsAppSession.findUnique({
      where: { branchId }
    });

    if (!session) {
      console.log(`[STATUS_API] No se encontró sesión en base de datos. Creando una nueva desconectada...`);
      session = await prisma.whatsAppSession.create({
        data: {
          branchId,
          status: 'DISCONNECTED'
        }
      });
    }

    console.log(`[STATUS_API] Sesión encontrada en DB. Status: ${session.status}, tiene sessionData: ${!!session.sessionData}`);

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
  } catch (error: any) {
    console.error("[STATUS_API] Error fetching WhatsApp status:", error);
    const response = NextResponse.json({ error: "Internal Server Error", details: error?.message || String(error) }, { status: 500 });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }
}

