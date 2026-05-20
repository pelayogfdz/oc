export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getActiveBranch } from "@/app/actions/auth";

export async function GET(request: Request) {
  try {
    const user = await getActiveUser();
    const branch = await getActiveBranch();
    
    if (!user || !branch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const branchFilter = branch.id === 'GLOBAL' ? {} : { branchId: branch.id };
    const isManager = user.role === 'ADMIN' || user.role === 'MANAGER' || user.commissionRole === 'COORDINADOR' || user.commissionRole === 'LIDER';
    
    const prospectFilter = isManager 
      ? { branch: { tenantId: user.tenantId } }
      : {
          ...branchFilter,
          OR: [
            { assignedUserId: null },
            { assignedUserId: user.id }
          ]
        };

    const prospects = await prisma.prospect.findMany({
      where: prospectFilter,
      include: {
        assignedUser: {
          select: { id: true, name: true, commissionRole: true }
        },
        customer: {
          select: { id: true, name: true, phone: true }
        },
        messages: {
          orderBy: { timestamp: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ prospects });
  } catch (error) {
    console.error("Error fetching prospects:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getActiveUser();
    const branch = await getActiveBranch();
    
    if (!user || !branch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    let { name, phone, customerId } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    // Limpiar el teléfono para que solo tenga números
    phone = phone.replace(/\D/g, '');

    // Verificar si ya existe
    let prospect = await prisma.prospect.findUnique({
      where: { phone_branchId: { phone: phone, branchId: branch.id } }
    });

    if (prospect) {
      if (customerId && prospect.customerId !== customerId) {
        prospect = await prisma.prospect.update({
          where: { id: prospect.id },
          data: { customerId }
        });
      }
      return NextResponse.json({ prospect, isNew: false });
    }

    // Crear nuevo prospecto
    prospect = await prisma.prospect.create({
      data: {
        name,
        phone,
        customerId: customerId || null,
        branchId: branch.id,
        funnelStage: 'NEW',
        assignedUserId: user.id // Auto-asignar al usuario que lo crea
      }
    });

    return NextResponse.json({ prospect, isNew: true });
  } catch (error) {
    console.error("Error creating prospect:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
