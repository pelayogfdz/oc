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

    const url = new URL(request.url);
    const branchIdParam = url.searchParams.get("branchId");

    let branchId: string;

    if (branchIdParam) {
      // Validate strictly that the branch belongs to the user's tenant
      const targetBranch = await prisma.branch.findFirst({
        where: { id: branchIdParam, tenantId: user.tenantId, isActive: true }
      });

      if (!targetBranch) {
        return NextResponse.json({ error: "Branch not found or access denied" }, { status: 403 });
      }
      branchId = targetBranch.id;
    } else {
      const branch = await getActiveBranch();
      if (!branch) {
        return NextResponse.json({ error: "No branch found" }, { status: 404 });
      }

      branchId = branch.id;
      if (branchId === 'GLOBAL') {
        const firstBranch = await prisma.branch.findFirst({
          where: { tenantId: branch.tenantId, isActive: true }
        });
        if (!firstBranch) {
          return NextResponse.json({ error: "No active branch found for tenant" }, { status: 404 });
        }
        branchId = firstBranch.id;
      }
    }

    const microserviceUrl = process.env.WHATSAPP_MICROSERVICE_URL || 'http://localhost:3001';
    
    const res = await fetch(`${microserviceUrl}/api/logout?branchId=${branchId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Microservice responded with ${res.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging out WhatsApp:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
