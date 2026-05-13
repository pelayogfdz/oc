import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getActiveBranch } from "@/app/actions/auth";

export async function POST(request: Request) {
  try {
    const user = await getActiveUser();
    const branch = await getActiveBranch();
    
    if (!user || !branch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    let { name, phone } = body;

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
      return NextResponse.json({ prospect, isNew: false });
    }

    // Crear nuevo prospecto
    prospect = await prisma.prospect.create({
      data: {
        name,
        phone,
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
