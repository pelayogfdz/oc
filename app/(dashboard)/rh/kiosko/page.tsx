import React from 'react';
import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import KioskoClient from './KioskoClient';

export const dynamic = 'force-dynamic';

export default async function KioskoPage() {
  const branch = await getActiveBranch();
  const tenantId = branch?.tenantId || '';

  let users: any[] = [];
  try {
    users = await prisma.user.findMany({
      where: { 
        tenantId,
        branchId: { not: null }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        faceDescriptor: true,
        webauthnCredentialId: true,
        webauthnPublicKey: true,
        branchId: true
      }
    });
  } catch (error) {
    console.error("Failed to load users for kiosk mode server side (offline or db error):", error);
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--caanma-primary)', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>
          Modo Kiosko de Asistencia
        </h1>
        <p style={{ color: 'var(--caanma-text-muted)', fontSize: '1.05rem', maxWidth: '800px', margin: 0 }}>
          Este panel permite a cualquier empleado registrar su Entrada (Check-In) o Salida (Check-Out) utilizando reconocimiento facial o lector de huellas dactilares.
        </p>
      </div>

      <KioskoClient initialUsers={users} />
    </div>
  );
}
