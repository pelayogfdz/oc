import React from 'react';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { getActiveBranch, getActiveUser } from '@/app/actions/auth';
import TareasClient from './TareasClient';

export default async function TareasPage() {
  const activeUser = await getActiveUser();
  const activeBranch = await getActiveBranch();

  if (!activeUser) redirect('/login');
  if (!activeBranch) redirect('/');

  const isGlobal = activeBranch.id === 'GLOBAL';

  // Fetch collaborators (users in the active branch or all tenant users if global)
  const rawCollaborators = await prisma.user.findMany({
    where: isGlobal
      ? { tenantId: activeUser.tenantId }
      : { branchId: activeBranch.id },
    select: { 
      id: true, 
      name: true, 
      email: true,
      branch: {
        select: {
          name: true
        }
      }
    },
    orderBy: { 
      name: 'asc' 
    }
  });

  const collaborators = rawCollaborators.map(user => ({
    id: user.id,
    name: isGlobal && user.branch?.name
      ? `${user.name || user.email} (${user.branch.name})`
      : (user.name || user.email),
    email: user.email
  }));

  const tasks = await prisma.collaboratorTask.findMany({
    where: isGlobal
      ? { branch: { tenantId: activeUser.tenantId } }
      : { branchId: activeBranch.id },
    select: {
      id: true,
      title: true,
      instructions: true,
      assignedToId: true,
      createdById: true,
      branchId: true,
      status: true,
      recurrence: true,
      dueDate: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
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
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--caanma-text)' }}>
        Gestión de Tareas de Colaboradores
      </h1>
      <TareasClient collaborators={collaborators} initialTasks={tasks} />
    </div>
  );
}
