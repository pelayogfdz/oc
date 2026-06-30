'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getActiveBranch, getSession } from "./auth";

export async function createCustomRole(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return { success: false, error: "No tienes una sesión activa o autorizada." };
    }

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const permissions = formData.get('permissions') as string;

    if (!name || !name.trim()) {
      return { success: false, error: "El nombre del rol es requerido." };
    }

    await prisma.customRole.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        permissions: permissions || '[]',
        tenantId: session.tenantId
      }
    });

    revalidatePath('/preferencias/roles');
    return { success: true };
  } catch (err: any) {
    console.error("Error creating custom role:", err);
    return { success: false, error: err.message || "Error al crear el rol." };
  }
}

export async function updateCustomRole(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return { success: false, error: "No tienes una sesión activa o autorizada." };
    }

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const permissions = formData.get('permissions') as string;

    if (!id) {
      return { success: false, error: "ID del rol faltante." };
    }
    if (!name || !name.trim()) {
      return { success: false, error: "El nombre del rol es requerido." };
    }

    await prisma.customRole.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        permissions: permissions || '[]',
        tenantId: session.tenantId // Keep for Multi-Tenant proxy routing
      }
    });

    revalidatePath('/preferencias/roles');
    revalidatePath('/preferencias/usuarios');
    return { success: true };
  } catch (err: any) {
    console.error("Error updating custom role:", err);
    return { success: false, error: err.message || "Error al actualizar el rol." };
  }
}

export async function deleteCustomRole(roleId: string) {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return { success: false, error: "No tienes una sesión activa o autorizada." };
    }

    // 1. Unlink users that have this role first
    await prisma.user.updateMany({
      where: { 
        customRoleId: roleId,
        tenantId: session.tenantId
      },
      data: { 
        customRoleId: null 
      }
    });

    // 2. Delete the role
    await prisma.customRole.delete({
      where: { id: roleId }
    });

    revalidatePath('/preferencias/roles');
    revalidatePath('/preferencias/usuarios');
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting custom role:", err);
    return { success: false, error: err.message || "Error al eliminar el rol." };
  }
}
