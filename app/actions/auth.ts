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
  try {
    const cookieStore = await cookies();
    cookieStore.delete('pulpos_active_branch');
  } catch (cookieErr) {
    console.warn('Failed to delete pulpos_active_branch cookie on login:', cookieErr);
  }
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

  if (user.currentSessionId && session.sessionId) {
    const activeSessions = user.currentSessionId.split(',').filter(Boolean);
    if (!activeSessions.includes(session.sessionId)) {
      throw new Error("Sesión iniciada en otro dispositivo");
    }
  }

  return user;
});

export const getActiveBranch = cache(async () => {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  
  // 1. Fetch user to check role, permissions and assigned branchId (cached across requests)
  const getCachedUserPerms = unstable_cache(
    async (uId: string) => {
      return prisma.user.findUnique({
        where: { id: uId },
        select: { id: true, email: true, role: true, permissions: true, branchId: true }
      });
    },
    [`user-perms-${session.userId}`],
    { tags: [`user-${session.userId}`] }
  );

  const user = await getCachedUserPerms(session.userId);
  
  let isGlobal = true;
  const allowedBranchIds: string[] = [];
  
  if (user) {
    isGlobal = user.role === 'ADMIN' || user.email?.toLowerCase() === 'pelayogfdz@gmail.com';
    
    if (user.permissions) {
      try {
        const parsed = JSON.parse(user.permissions);
        const permArr = Array.isArray(parsed) ? parsed : Object.keys(parsed).filter(k => parsed[k]);
        
        if (permArr.includes('GLOBAL_VIEW')) {
          isGlobal = true;
        }
        
        permArr.forEach((p: string) => {
          if (p.startsWith('__BRANCH_')) {
            allowedBranchIds.push(p.replace('__BRANCH_', ''));
          }
        });
      } catch (e) {
        console.error("Failed to parse user permissions in getActiveBranch:", e);
      }
    }
    
    // Add the explicitly assigned branch to the allowed list if not present
    if (user.branchId && !allowedBranchIds.includes(user.branchId)) {
      allowedBranchIds.push(user.branchId);
    }
  }

  const cookieStore = await cookies();
  let branchId = cookieStore.get('pulpos_active_branch')?.value;
  
  // 2. Enforce restrictions for non-global users
  if (user && !isGlobal && allowedBranchIds.length > 0) {
    if (!branchId || !allowedBranchIds.includes(branchId)) {
      // Fallback to assigned branchId first, then the first allowed branchId
      branchId = (user.branchId && allowedBranchIds.includes(user.branchId))
        ? user.branchId
        : allowedBranchIds[0];
    }
  }
  
  if (branchId) {
    if (branchId === 'GLOBAL') {
      return { id: 'GLOBAL', name: 'Todas las Sucursales', location: 'Corporativo', isActive: true, deletedAt: null, tenantId: session.tenantId };
    }
    
    const getCachedBranch = unstable_cache(
      async (bId: string, tId: string | null) => {
        return prisma.branch.findFirst({ 
          where: { id: bId, isActive: true, tenantId: tId } 
        });
      },
      [`branch-${branchId}`],
      { tags: [`branch-${branchId}`, `tenant-branches-${session.tenantId}`] }
    );
    const branch = await getCachedBranch(branchId, session.tenantId);
    if (branch) return branch;
  }
  
  // Fallback a la primera sucursal del Tenant si la cookie no coincide
  const getFallbackBranch = unstable_cache(
    async (tId: string | null) => {
      return prisma.branch.findFirst({
        where: { tenantId: tId, isActive: true }
      });
    },
    [`branch-fallback-${session.tenantId}`],
    { tags: [`tenant-branches-${session.tenantId}`] }
  );
  const firstBranch = await getFallbackBranch(session.tenantId);
  
  if (!firstBranch) {
    return null;
  }
  return firstBranch;
});

export const getTenantBranches = cache(async (tenantId: string) => {
  const getCachedTenantBranches = unstable_cache(
    async (tId: string) => {
      return prisma.branch.findMany({
        where: { isActive: true, tenantId: tId },
        orderBy: { name: 'asc' }
      });
    },
    [`tenant-branches-${tenantId}`],
    { tags: [`tenant-branches-${tenantId}`] }
  );
  return getCachedTenantBranches(tenantId);
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
