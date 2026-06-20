'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';
import { sendTaskEmail } from '@/lib/mailer';
import { revalidatePath } from 'next/cache';
import { getActiveBranch, getActiveUser } from './auth';

export async function createCollaboratorTask(data: {
  title: string;
  instructions: string;
  assignedToId: string;
  recurrence: string;
  dueDate?: string;
}) {
  const activeUser = await getActiveUser();
  const activeBranch = await getActiveBranch();
  if (!activeUser) throw new Error('No autorizado');
  if (!activeBranch) {
    throw new Error('Debes seleccionar una sucursal para realizar esta acción.');
  }

  const assignee = await prisma.user.findUnique({
    where: { id: data.assignedToId },
    select: { id: true, name: true, email: true, branchId: true }
  });
  if (!assignee) throw new Error('Colaborador asignado no encontrado');

  let targetBranchId: string;
  if (activeBranch.id === 'GLOBAL') {
    if (!assignee.branchId) {
      throw new Error('El colaborador seleccionado no está asignado a ninguna sucursal.');
    }
    targetBranchId = assignee.branchId;
  } else {
    targetBranchId = activeBranch.id;
  }

  const parsedDueDate = data.dueDate ? new Date(data.dueDate) : null;

  const task = await prisma.collaboratorTask.create({
    data: {
      title: data.title,
      instructions: data.instructions,
      assignedToId: data.assignedToId,
      createdById: activeUser.id,
      branchId: targetBranchId,
      status: 'PENDING',
      recurrence: data.recurrence || 'ONCE',
      dueDate: parsedDueDate,
    }
  });

  // Enviar correo electrónico
  try {
    const creatorName = activeUser.name || activeUser.email || 'Administrador';
    if (assignee.email) {
      await sendTaskEmail(
        assignee.email,
        data.title,
        data.instructions,
        creatorName
      );
    }
  } catch (emailErr) {
    console.error('Error al enviar correo electrónico de la tarea:', emailErr);
  }

  revalidatePath('/procesos/tareas');
  return { success: true, task };
}

export async function getPendingTasks(userId: string) {
  if (!userId) return [];
  return prisma.collaboratorTask.findMany({
    where: {
      assignedToId: userId,
      status: 'PENDING'
    },
    include: {
      createdBy: {
        select: { name: true, email: true }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

export async function completeCollaboratorTask(taskId: string, evidenceFileBase64: string) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  if (!session?.userId) throw new Error('No autorizado');

  const task = await prisma.collaboratorTask.findUnique({
    where: { id: taskId }
  });

  if (!task) throw new Error('Tarea no encontrada');

  await prisma.collaboratorTask.update({
    where: { id: taskId },
    data: {
      status: 'COMPLETED',
      evidenceFile: evidenceFileBase64,
      completedAt: new Date()
    }
  });

  revalidatePath('/procesos/tareas');
  return { success: true };
}

export async function deleteCollaboratorTask(taskId: string) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  if (!session?.userId) throw new Error('No autorizado');

  await prisma.collaboratorTask.delete({
    where: { id: taskId }
  });

  revalidatePath('/procesos/tareas');
  return { success: true };
}

export async function getTasks() {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  if (!session?.userId) throw new Error('No autorizado');

  const user = await prisma.user.findUnique({
    where: { id: session.userId as string },
    select: { branchId: true }
  });

  if (!user || !user.branchId) {
    return [];
  }

  return prisma.collaboratorTask.findMany({
    where: {
      branchId: user.branchId
    },
    include: {
      assignedTo: {
        select: { name: true, email: true }
      },
      createdBy: {
        select: { name: true, email: true }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

export async function updateCollaboratorTask(
  taskId: string,
  data: {
    title: string;
    instructions: string;
    assignedToId: string;
    recurrence: string;
    dueDate?: string;
  }
) {
  const activeUser = await getActiveUser();
  const activeBranch = await getActiveBranch();
  if (!activeUser) throw new Error('No autorizado');
  if (!activeBranch) {
    throw new Error('Debes seleccionar una sucursal para realizar esta acción.');
  }

  const assignee = await prisma.user.findUnique({
    where: { id: data.assignedToId },
    select: { id: true, name: true, email: true, branchId: true }
  });
  if (!assignee) throw new Error('Colaborador asignado no encontrado');

  let targetBranchId: string;
  if (activeBranch.id === 'GLOBAL') {
    if (!assignee.branchId) {
      throw new Error('El colaborador seleccionado no está asignado a ninguna sucursal.');
    }
    targetBranchId = assignee.branchId;
  } else {
    targetBranchId = activeBranch.id;
  }

  const parsedDueDate = data.dueDate ? new Date(data.dueDate) : null;

  const task = await prisma.collaboratorTask.update({
    where: { id: taskId },
    data: {
      title: data.title,
      instructions: data.instructions,
      assignedToId: data.assignedToId,
      branchId: targetBranchId,
      recurrence: data.recurrence || 'ONCE',
      dueDate: parsedDueDate,
    }
  });

  revalidatePath('/procesos/tareas');
  return { success: true, task };
}

export async function getTaskEvidence(taskId: string) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  if (!session?.userId) throw new Error('No autorizado');

  const task = await prisma.collaboratorTask.findUnique({
    where: { id: taskId },
    select: { evidenceFile: true }
  });

  if (!task) throw new Error('Tarea no encontrada');
  return { success: true, evidence: task.evidenceFile };
}

export async function getCollaboratorTaskReport(data?: {
  startDate?: string;
  endDate?: string;
}) {
  const activeUser = await getActiveUser();
  const activeBranch = await getActiveBranch();
  if (!activeUser) throw new Error('No autorizado');
  if (!activeBranch) throw new Error('Sucursal activa no encontrada');

  const isGlobal = activeBranch.id === 'GLOBAL';

  // Define date filters if provided
  const dateFilter: any = {};
  if (data?.startDate || data?.endDate) {
    dateFilter.createdAt = {};
    if (data.startDate) {
      dateFilter.createdAt.gte = new Date(data.startDate);
    }
    if (data.endDate) {
      const end = new Date(data.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.createdAt.lte = end;
    }
  }

  // Get tasks in active branch or all tenant tasks if global
  const tasks = await prisma.collaboratorTask.findMany({
    where: {
      ...(isGlobal
        ? { branch: { tenantId: activeUser.tenantId } }
        : { branchId: activeBranch.id }),
      ...dateFilter
    },
    select: {
      id: true,
      title: true,
      status: true,
      dueDate: true,
      completedAt: true,
      assignedToId: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  // Get all collaborators
  const collaborators = await prisma.user.findMany({
    where: isGlobal
      ? { tenantId: activeUser.tenantId }
      : { branchId: activeBranch.id },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  // Calculate statistics per collaborator
  const reportData = collaborators.map(collab => {
    const collabTasks = tasks.filter(t => t.assignedToId === collab.id);
    
    let completedOnTime = 0;
    let completedLate = 0;
    let uncompleted = 0;
    let pending = 0;

    const now = new Date();

    collabTasks.forEach(task => {
      if (task.status === 'COMPLETED') {
        if (!task.dueDate || (task.completedAt && new Date(task.completedAt) <= new Date(task.dueDate))) {
          completedOnTime++;
        } else {
          completedLate++;
        }
      } else {
        if (task.dueDate && now > new Date(task.dueDate)) {
          uncompleted++;
        } else {
          pending++;
        }
      }
    });

    const total = collabTasks.length;
    const completedTotal = completedOnTime + completedLate;
    const completionRate = total > 0 ? (completedTotal / total) * 100 : 0;
    const onTimeRate = completedTotal > 0 ? (completedOnTime / completedTotal) * 100 : 0;

    return {
      collaborator: {
        id: collab.id,
        name: collab.name || collab.email || 'Colaborador sin nombre',
        email: collab.email
      },
      stats: {
        total,
        completedOnTime,
        completedLate,
        uncompleted,
        pending,
        completionRate: parseFloat(completionRate.toFixed(1)),
        onTimeRate: parseFloat(onTimeRate.toFixed(1))
      },
      tasks: collabTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        dueDate: t.dueDate,
        completedAt: t.completedAt
      }))
    };
  });

  return { success: true, report: reportData };
}

