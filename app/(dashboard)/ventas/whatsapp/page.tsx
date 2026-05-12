import { prisma } from "@/lib/prisma";
import { getActiveUser, getActiveBranch } from "@/app/actions/auth";
import BandejaClient from "./BandejaClient";
import { redirect } from "next/navigation";

export default async function WhatsappBandejaPage() {
  const branch = await getActiveBranch();
  const user = await getActiveUser();
  
  if (!user) return null;

  // Solo administradores o coordinadores deberían ver esta bandeja global
  // Si quieres que los vendedores la vean, puedes quitar esta restricción
  if (!user.isSuperAdmin && user.commissionRole !== 'COORDINADOR') {
    redirect('/ventas/prospeccion');
  }

  // Handle "GLOBAL" branch gracefully
  const branchFilter = branch.id === 'GLOBAL' ? {} : { branchId: branch.id };

  // Traer todos los prospectos de la sucursal, ordenados por la última actualización
  // Idealmente ordenaríamos por el último mensaje recibido
  const prospects = await prisma.prospect.findMany({
    where: branchFilter,
    include: {
      assignedUser: true,
      messages: {
        orderBy: { timestamp: 'desc' }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  // Lista de vendedores/usuarios disponibles para asignar
  const allUsers = await prisma.user.findMany({
    where: { ...branchFilter, commissionRole: { not: null } },
    select: { id: true, name: true, commissionRole: true }
  });

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Bandeja WhatsApp</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Buzón centralizado para asignar conversaciones a tu equipo de ventas</p>
        </div>
      </div>
      
      {/* Client component con la interfaz de dos paneles */}
      <div style={{ flex: 1, overflow: 'hidden', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <BandejaClient initialProspects={prospects} users={allUsers} currentUser={user} />
      </div>
    </div>
  );
}
