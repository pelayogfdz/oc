import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser } from "@/app/actions/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getActiveUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    const updatedProspect = await prisma.prospect.update({
      where: { id },
      data: {
        funnelStage: data.funnelStage,
        assignedUserId: data.assignedUserId, // In case we reassign
        name: data.name
      }
    });

    return NextResponse.json(updatedProspect);
  } catch (error) {
    console.error("Error updating prospect:", error);
    return NextResponse.json({ error: "Failed to update prospect" }, { status: 500 });
  }
}
