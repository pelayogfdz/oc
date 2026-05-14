'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath, unstable_cache } from 'next/cache';
import { cache } from 'react';
import { decrypt, createSession, deleteSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';

export async function loginAction(formData: FormData) {
  const email = formData.get('email')?.toString().trim().toLowerCase();
  const password = formData.get('password')?.toString();

  if (!email || !password) throw new Error('Credenciales incompletas');

  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: true }
  });

  if (!user) throw new Error('Credenciales inválidas');

  if (user.password !== password) {
    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) throw new Error('Credenciales inválidas');
  }

  if (!user.isSuperAdmin && (!user.tenantId || !user.tenant?.isActive)) {
    throw new Error('Tu empresa está inactiva o no configurada.');
  }

  if (user.forcePasswordChange) {
    return { forcePasswordChange: true, email: user.email };
  }

  await createSession(user.id, user.tenantId, user.role);
  return { success: true };
}

export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie) return null;
  const payload = await decrypt(sessionCookie.value);
  return payload;
});

export const getActiveUser = cache(async () => {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { tenant: true }
  });
  
  if (!user) throw new Error("User not found");

  if (user.currentSessionId && session.sessionId && user.currentSessionId !== session.sessionId) {
    throw new Error("Sesión iniciada en otro dispositivo");
  }

  return user;
});

export const getActiveBranch = cache(async () => {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  
  const cookieStore = await cookies();
  const branchId = cookieStore.get('pulpos_active_branch')?.value;
  
  if (branchId) {
    if (branchId === 'GLOBAL') {
      return { id: 'GLOBAL', name: 'Todas las Sucursales', location: 'Corporativo', isActive: true, deletedAt: null, tenantId: session.tenantId };
    }
    const branch = await prisma.branch.findFirst({ 
      where: { id: branchId, isActive: true, tenantId: session.tenantId } 
    });
    if (branch) return branch;
  }
  
  // Fallback a la primera sucursal del Tenant si la cookie no coincide
  const getCachedFirstBranch = unstable_cache(
    async () => prisma.branch.findFirst({
      where: { tenantId: session.tenantId, isActive: true }
    }),
    [`tenant-first-branch-${session.tenantId}`],
    { tags: [`tenant-branches-${session.tenantId}`] }
  );
  
  const firstBranch = await getCachedFirstBranch();
  
  if (!firstBranch) {
    return null;
  }
  return firstBranch;
});

export async function setActiveBranch(branchId: string) {
  const cookieStore = await cookies();
  cookieStore.set('pulpos_active_branch', branchId, { path: '/' });
  revalidatePath('/', 'layout');
}

export async function verifyActiveTenantSession() {
  const user = await getActiveUser();
  if (!user || !user.tenantId) {
    throw new Error('Tenant context missing. Security violation.');
  }
  return { tenantId: user.tenantId, userId: user.id, role: user.role };
}

export async function logout() {
  await deleteSession();
  revalidatePath('/', 'layout');
  redirect('https://caanma.com');
}
