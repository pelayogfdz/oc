import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranch } from "@/app/actions/auth";

export async function GET(request: Request) {
  try {
    const branch = await getActiveBranch();
    if (!branch) {
      return NextResponse.json({ error: "No branch found" }, { status: 404 });
    }

    // If WHATSAPP_BRANCH_ID is set in env, restrict to that branch only
    if (process.env.WHATSAPP_BRANCH_ID && branch.id !== process.env.WHATSAPP_BRANCH_ID) {
      return NextResponse.json({ 
        isAuthorized: false, 
        session: { status: 'DISCONNECTED' } 
      });
    }

    const branchId = branch.id;

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
