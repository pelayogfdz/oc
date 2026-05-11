import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser } from "@/app/actions/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getActiveUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const messages = await prisma.whatsAppMessage.findMany({
      where: { prospectId: id },
      orderBy: { timestamp: 'asc' }
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
