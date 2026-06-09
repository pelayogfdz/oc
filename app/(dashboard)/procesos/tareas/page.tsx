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

  if (activeBranch.id === 'GLOBAL') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #f87171', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>VISTA GLOBAL</h2>
        <p>Selecciona una sucursal específica en la barra superior para ver y gestionar tareas.</p>
      </div>
    );
  }

  // Fetch collaborators (users in the active branch)
  const collaborators = await prisma.user.findMany({
    where: { 
      branchId: activeBranch.id
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
      branchId: activeBranch.id
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
