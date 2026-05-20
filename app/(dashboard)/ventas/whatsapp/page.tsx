import { prisma } from "@/lib/prisma";
import { getActiveUser, getActiveBranch } from "@/app/actions/auth";
import BandejaClient from "./BandejaClient";
import { redirect } from "next/navigation";

export default async function WhatsappBandejaPage() {
  const branch = await getActiveBranch();
  const user = await getActiveUser();
  
  if (!user || !branch) return null;

  if (process.env.WHATSAPP_BRANCH_ID && branch.id !== process.env.WHATSAPP_BRANCH_ID) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1rem' }}>Bandeja WhatsApp</h1>
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 2rem' }}>
          <div style={{ color: '#b91c1c', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #fee2e2', fontWeight: 'bold' }}>
            Acceso Restringido
          </div>
          <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '1.5rem' }}>
            El módulo de WhatsApp no está habilitado para la sucursal <strong>{branch.name}</strong>.
          </p>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>
            Si requiere activar esta integración, por favor póngase en contacto con el administrador del sistema.
          </p>
        </div>
      </div>
    );
  }

  // Solo administradores o coordinadores deberían ver esta bandeja global
  // Si quieres que los vendedores la vean, puedes quitar esta restricción
  // if (!user.isSuperAdmin && user.commissionRole !== 'COORDINADOR') {
  //   redirect('/ventas/prospeccion');
  // }

  // Handle "GLOBAL" branch gracefully
  const branchFilter = branch.id === 'GLOBAL' ? {} : { branchId: branch.id };

  // Determinar si el usuario es administrador/gerente con acceso total
  const isManager = user.role === 'ADMIN' || user.role === 'MANAGER' || user.commissionRole === 'COORDINADOR' || user.commissionRole === 'LIDER';

  // Lógica de visibilidad:
  // - Managers ven todos los del tenant (o global si se desea)
  // - Usuarios normales solo ven los "sin asignar" o los "asignados a ellos mismos" en su sucursal
  
  // Asumiremos que si es manager y tiene GLOBAL, ve todo. Si no, al menos ve los de su tenant.
  // Para simplificar, si es manager, podemos traer los del tenant o los de branchFilter.
  // Pero Prospect no tiene tenantId, así que buscaremos por branch.tenantId si es posible.
  const prospectFilter = isManager 
    ? { branch: { tenantId: user.tenantId } }
    : {
        ...branchFilter,
        OR: [
          { assignedUserId: null },
          { assignedUserId: user.id }
        ]
      };

  // Traer prospectos según el filtro
  const prospects = await prisma.prospect.findMany({
    where: prospectFilter,
    include: {
      assignedUser: true,
      customer: true,
      messages: {
        orderBy: { timestamp: 'asc' }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  // Lista de vendedores/usuarios disponibles para asignar
  const allUsers = await prisma.user.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true, name: true, commissionRole: true }
  });

  // Lista de clientes para asignar a nuevos chats
  const customers = await prisma.customer.findMany({
    where: branchFilter,
    select: { id: true, name: true, phone: true }
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
        <BandejaClient initialProspects={prospects} users={allUsers} currentUser={user} customers={customers} />
      </div>
    </div>
  );
}
