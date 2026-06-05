'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch, getActiveUser } from './auth';
import { revalidatePath } from 'next/cache';

// Fetch appointments
export async function getAppointments(branchIdFilter?: string) {
  const branch = await getActiveBranch();
  if (!branch) throw new Error('Unauthorized');
  
  const tenantId = branch.tenantId;
  if (!tenantId) throw new Error('Unauthorized: Tenant context missing');
  
  // Find branches of this tenant
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true }
  });
  const tenantBranchIds = tenantBranches.map(b => b.id);
  
  let branchCondition: any = branch.id === 'GLOBAL' 
    ? { branchId: { in: tenantBranchIds } } 
    : { branchId: branch.id };
    
  if (branchIdFilter && branchIdFilter !== 'ALL') {
    if (tenantBranchIds.includes(branchIdFilter)) {
      branchCondition = { branchId: branchIdFilter };
    }
  }

  const appointments = await prisma.appointment.findMany({
    where: branchCondition,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true
        }
      },
      user: {
        select: {
          id: true,
          name: true
        }
      },
      branch: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      scheduledAt: 'asc'
    }
  });

  // Convert Date objects to ISO strings to avoid Next.js serialization warnings
  return appointments.map(app => ({
    ...app,
    scheduledAt: app.scheduledAt.toISOString(),
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  }));
}

// Fetch resources (Customers & Users/Specialists) for scheduling select inputs
export async function getAppointmentResources() {
  const branch = await getActiveBranch();
  if (!branch) throw new Error('Unauthorized');
  
  const tenantId = branch.tenantId;
  if (!tenantId) throw new Error('Unauthorized: Tenant context missing');
  
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true }
  });
  const tenantBranchIds = tenantBranches.map(b => b.id);

  const customers = await prisma.customer.findMany({
    where: {
      branchId: { in: tenantBranchIds }
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  const users = await prisma.user.findMany({
    where: {
      tenantId
    },
    select: {
      id: true,
      name: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  return { customers, users, branches: tenantBranches };
}

// Create an appointment
export async function createAppointment(data: {
  title: string;
  notes?: string;
  scheduledAt: string; // ISO string
  duration: number;
  customerId?: string;
  userId?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  branchId?: string;
}) {
  const activeBranch = await getActiveBranch();
  if (!activeBranch) throw new Error('Unauthorized');
  
  // Decide which branch this appointment belongs to (fallback to active branch if none specified or not superadmin/global)
  const targetBranchId = activeBranch.id === 'GLOBAL' 
    ? (data.branchId || activeBranch.id) // Global user can select branch
    : activeBranch.id;

  if (targetBranchId === 'GLOBAL') {
    throw new Error('Debe seleccionar una sucursal específica para crear una cita.');
  }

  const appointment = await prisma.appointment.create({
    data: {
      title: data.title,
      notes: data.notes || null,
      scheduledAt: new Date(data.scheduledAt),
      duration: data.duration || 30,
      customerId: data.customerId || null,
      userId: data.userId || null,
      clientName: data.clientName || null,
      clientPhone: data.clientPhone || null,
      clientEmail: data.clientEmail || null,
      branchId: targetBranchId,
      status: 'PENDING'
    }
  });

  revalidatePath('/ventas/citas');
  
  return {
    ...appointment,
    scheduledAt: appointment.scheduledAt.toISOString(),
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
  };
}

// Update appointment
export async function updateAppointment(
  id: string,
  data: {
    title?: string;
    notes?: string;
    scheduledAt?: string; // ISO string
    duration?: number;
    customerId?: string;
    userId?: string;
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    status?: string;
  }
) {
  const activeBranch = await getActiveBranch();
  if (!activeBranch) throw new Error('Unauthorized');

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.notes !== undefined) updateData.notes = data.notes || null;
  if (data.scheduledAt !== undefined) updateData.scheduledAt = new Date(data.scheduledAt);
  if (data.duration !== undefined) updateData.duration = data.duration;
  if (data.customerId !== undefined) updateData.customerId = data.customerId || null;
  if (data.userId !== undefined) updateData.userId = data.userId || null;
  if (data.clientName !== undefined) updateData.clientName = data.clientName || null;
  if (data.clientPhone !== undefined) updateData.clientPhone = data.clientPhone || null;
  if (data.clientEmail !== undefined) updateData.clientEmail = data.clientEmail || null;
  if (data.status !== undefined) updateData.status = data.status;

  const appointment = await prisma.appointment.update({
    where: { id },
    data: updateData
  });

  revalidatePath('/ventas/citas');
  
  return {
    ...appointment,
    scheduledAt: appointment.scheduledAt.toISOString(),
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
  };
}

// Delete appointment
export async function deleteAppointment(id: string) {
  const activeBranch = await getActiveBranch();
  if (!activeBranch) throw new Error('Unauthorized');

  await prisma.appointment.delete({
    where: { id }
  });

  revalidatePath('/ventas/citas');
  return { success: true };
}
