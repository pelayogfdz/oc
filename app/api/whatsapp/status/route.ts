import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const branch = await prisma.branch.findFirst();
    if (!branch) {
      return NextResponse.json({ error: "No branch found" }, { status: 404 });
    }

    const session = await prisma.whatsAppSession.findUnique({
      where: { branchId: branch.id }
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Error fetching WhatsApp status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
