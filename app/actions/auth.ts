'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function getActiveBranch() {
  const cookieStore = await cookies();
  const branchId = cookieStore.get('pulpos_active_branch')?.value;
  
  if (branchId) {
    if (branchId === 'GLOBAL') {
      return { id: 'GLOBAL', name: 'Todas las Sucursales', location: 'Corporativo', isActive: true, deletedAt: null };
    }
    const branch = await prisma.branch.findFirst({ where: { id: branchId, isActive: true } });
    if (branch) return branch;
  }
  
  let branch = await prisma.branch.findFirst({
    where: { name: { not: 'OFFICE CITY' }, isActive: true }
  });
  if (!branch) {
    branch = await prisma.branch.findFirst({ where: { isActive: true } });
  }
  if (!branch) {
    throw new Error('No branch exists in the database. Please seed the database first.');
  }
  return branch;
}

export async function setActiveBranch(branchId: string) {
  const cookieStore = await cookies();
  cookieStore.set('pulpos_active_branch', branchId, { path: '/' });
  revalidatePath('/', 'layout');
}

export async function getActiveUser(branchId: string) {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { name: 'Pelayo Fernandez', email: 'pelayof@tdq.com.mx', password: 'hash', role: 'ADMIN', branchId }
    });
  }
  return user;
}
export function getBranchFilter(branch: any) {
  return branch.id === 'GLOBAL' ? {} : { branchId: branch.id };
}
