import { prisma, masterClient } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { decrypt } from '@/lib/session';

import { redirect } from 'next/navigation';

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
  
  if (!user) {
    redirect('/login?error=user_not_found');
  }

  if (user.currentSessionId && session.sessionId) {
    const activeSessions = user.currentSessionId.split(',').filter(Boolean);
    if (!activeSessions.includes(session.sessionId)) {
      redirect('/login?error=session_expired');
    }
  }

  return user;
});

export const getActiveBranch = cache(async () => {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: true, permissions: true, branchId: true }
  });
  
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
    
    const branch = await prisma.branch.findFirst({ 
      where: { id: branchId, isActive: true, tenantId: session.tenantId } 
    });
    if (branch) return branch;
  }
  
  // Fallback a la primera sucursal del Tenant si la cookie no coincide
  const firstBranch = await prisma.branch.findFirst({
    where: { tenantId: session.tenantId, isActive: true }
  });
  
  if (!firstBranch) {
    throw new Error('No se encontró ninguna sucursal activa para esta empresa.');
  }
  return firstBranch;
});

export const getTenantBranches = cache(async (tenantId: string) => {
  return prisma.branch.findMany({
    where: { isActive: true, tenantId: tenantId },
    orderBy: { name: 'asc' }
  });
});

export async function verifyActiveTenantSession() {
  const user = await getActiveUser();
  if (!user || !user.tenantId) {
    throw new Error('Tenant context missing. Security violation.');
  }
  return { tenantId: user.tenantId, userId: user.id, role: user.role };
}
