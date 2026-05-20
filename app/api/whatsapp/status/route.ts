import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranch } from "@/app/actions/auth";

export async function GET(request: Request) {
  try {
    const branch = await getActiveBranch();
    if (!branch) {
      return NextResponse.json({ error: "No branch found" }, { status: 404 });
    }

    const branchId = branch.id;

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

    return NextResponse.json({ isAuthorized: true, session });
  } catch (error) {
    console.error("Error fetching WhatsApp status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
