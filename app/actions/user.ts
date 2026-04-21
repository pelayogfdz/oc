'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getActiveBranch } from "./auth";

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as string;
  const permissions = formData.get('permissions') as string;
  const commissionRole = formData.get('commissionRole') as string || 'VENDEDOR';
  
  const branch = await getActiveBranch();
  if (!branch) throw new Error("No branch active");
  
  await prisma.user.create({
    // We use any because the 'permissions' field might not be recognized by the stale Prisma Engine types due to EPERM Windows lock.
    // The SQLite DB has been synced so the query itself will work via standard execute or casting.
    data: {
      name,
      email,
      password,
      role,
      commissionRole,
      branchId: branch.id,
      permissions
    } as any
  });
  
  revalidatePath('/preferencias/usuarios');
  return { success: true };
}

export async function updateUser(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const role = formData.get('role') as string;
  const commissionRole = formData.get('commissionRole') as string;
  const permissions = formData.get('permissions') as string;
  const password = formData.get('password') as string;
  
  const updateData: any = { name, email, role, commissionRole, permissions };
  if (password) {
    updateData.password = password;
  }

  await prisma.user.update({
    where: { id },
    data: updateData
  });
  
  revalidatePath('/preferencias/usuarios');
  return { success: true };
}

export async function deleteUser(id: string) {
  await prisma.user.delete({ where: { id } });
  revalidatePath('/preferencias/usuarios');
}
