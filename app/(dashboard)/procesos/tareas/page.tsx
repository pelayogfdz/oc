import React from 'react';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';
import { redirect } from 'next/navigation';
import TareasClient from './TareasClient';

export default async function TareasPage() {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  if (!session?.userId) redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { id: session.userId as string },
    select: { tenantId: true, branchId: true }
  });

  if (!user?.tenantId || !user?.branchId) redirect('/');

  // Fetch collaborators (users in the active branch)
  const collaborators = await prisma.user.findMany({
    where: { 
      branchId: user.branchId,
      isActive: true 
    },
    select: { 
      id: true, 
      name: true, 
      email: true 
    },
    orderBy: { 
      name: 'asc' 
    }
  });

  // Fetch tasks in the active branch
  const tasks = await prisma.collaboratorTask.findMany({
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--pulpos-text)' }}>
        Gestión de Tareas de Colaboradores
      </h1>
      <TareasClient collaborators={collaborators} initialTasks={tasks} />
    </div>
  );
}
