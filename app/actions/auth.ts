import { prisma, masterClient } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { decrypt } from '@/lib/session';

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

  const user = await masterClient.user.findUnique({
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

const getCachedUserPerms = (uId: string) => unstable_cache(
  async () => {
    return prisma.user.findUnique({
      where: { id: uId },
      select: { id: true, email: true, role: true, permissions: true, branchId: true }
    });
  },
  [`user-perms-${uId}`],
  { tags: [`user-${uId}`] }
)();

const getCachedBranch = (bId: string, tId: string | null) => unstable_cache(
  async () => {
    return prisma.branch.findFirst({ 
      where: { id: bId, isActive: true, tenantId: tId } 
    });
  },
  [`branch-${bId}`],
  { tags: [`branch-${bId}`, `tenant-branches-${tId}`] }
)();

const getFallbackBranch = (tId: string | null) => unstable_cache(
  async () => {
    return prisma.branch.findFirst({
      where: { tenantId: tId, isActive: true }
    });
  },
  [`branch-fallback-${tId}`],
  { tags: [`tenant-branches-${tId}`] }
)();

const getCachedTenantBranches = (tId: string) => unstable_cache(
  async () => {
    return prisma.branch.findMany({
      where: { isActive: true, tenantId: tId },
      orderBy: { name: 'asc' }
    });
  },
  [`tenant-branches-${tId}`],
  { tags: [`tenant-branches-${tId}`] }
)();

export const getActiveBranch = cache(async () => {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  
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
  let branchId = cookieStore.get('caanma_active_branch')?.value;
  
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
    
    const branch = await getCachedBranch(branchId, session.tenantId);
    if (branch) return branch;
  }
  
  // Fallback a la primera sucursal del Tenant si la cookie no coincide
  const firstBranch = await getFallbackBranch(session.tenantId);
  
  if (!firstBranch) {
    throw new Error('No se encontró ninguna sucursal activa para esta empresa.');
  }
  return firstBranch;
});

export const getTenantBranches = cache(async (tenantId: string) => {
  return getCachedTenantBranches(tenantId);
});

export async function verifyActiveTenantSession() {
  const user = await getActiveUser();
  if (!user || !user.tenantId) {
    throw new Error('Tenant context missing. Security violation.');
  }
  return { tenantId: user.tenantId, userId: user.id, role: user.role };
}
