import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranch } from "@/app/actions/auth";

export async function GET(request: Request) {
  try {
    const branch = await getActiveBranch();
    if (!branch) {
      return NextResponse.json({ error: "No branch found" }, { status: 404 });
    }

    // Prioritize WHATSAPP_BRANCH_ID from environment if configured, otherwise use current branch
    const branchId = process.env.WHATSAPP_BRANCH_ID || branch.id;

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

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Error fetching WhatsApp status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
