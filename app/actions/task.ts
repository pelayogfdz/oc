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
  if (!activeBranch || activeBranch.id === 'GLOBAL') {
    throw new Error('Debes seleccionar una sucursal específica para realizar esta acción.');
  }

  const assignee = await prisma.user.findUnique({
    where: { id: data.assignedToId },
    select: { id: true, name: true, email: true }
  });
  if (!assignee) throw new Error('Colaborador asignado no encontrado');

  const parsedDueDate = data.dueDate ? new Date(data.dueDate) : null;

  const task = await prisma.collaboratorTask.create({
    data: {
      title: data.title,
      instructions: data.instructions,
      assignedToId: data.assignedToId,
      createdById: activeUser.id,
      branchId: activeBranch.id,
      status: 'PENDING',
      recurrence: data.recurrence || 'ONCE',
      dueDate: parsedDueDate,
    }
  });

  // Enviar correo electrónico
  try {
    const creatorName = creator.name || creator.email || 'Administrador';
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

  const updatedTask = await prisma.collaboratorTask.update({
    where: { id: taskId },
    data: {
      status: 'COMPLETED',
      evidenceFile: evidenceFileBase64,
      completedAt: new Date()
    }
  });

  revalidatePath('/procesos/tareas');
  return { success: true, task: updatedTask };
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
