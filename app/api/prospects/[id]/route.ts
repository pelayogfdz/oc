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

    if (data.createCustomer) {
      const prospect = await prisma.prospect.findUnique({ where: { id } });
      if (prospect && !prospect.customerId) {
        const newCustomer = await prisma.customer.create({
          data: {
            name: prospect.name,
            phone: prospect.phone || '',
            email: prospect.email || `prospect_${prospect.id.substring(0,8)}@temp.com`,
            branchId: prospect.branchId
          }
        });
        data.customerId = newCustomer.id;
      }
    }

    let branchIdUpdate: string | undefined = undefined;
    if (data.assignedUserId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: data.assignedUserId },
        select: { branchId: true }
      });
      if (assignedUser && assignedUser.branchId) {
        branchIdUpdate = assignedUser.branchId;
      }
    }

    const updatedProspect = await prisma.prospect.update({
      where: { id },
      data: {
        funnelStage: data.funnelStage !== undefined ? data.funnelStage : undefined,
        assignedUserId: data.assignedUserId !== undefined ? data.assignedUserId : undefined,
        branchId: branchIdUpdate !== undefined ? branchIdUpdate : undefined,
        name: data.name !== undefined ? data.name : undefined,
        customerId: data.customerId !== undefined ? data.customerId : undefined
      },
      include: {
        customer: true,
        assignedUser: true
      }
    });

    return NextResponse.json(updatedProspect);
  } catch (error) {
    console.error("Error updating prospect:", error);
    return NextResponse.json({ error: "Failed to update prospect" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getActiveUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.prospect.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting prospect:", error);
    return NextResponse.json({ error: "Failed to delete prospect" }, { status: 500 });
  }
}
