import { prisma } from "@/lib/prisma";
import { getActiveUser, getActiveBranch } from "@/app/actions/auth";
import KanbanBoard from "./KanbanBoard";

export default async function ProspeccionPage() {
  const branch = await getActiveBranch();
  const user = await getActiveUser();
  
  if (!user) return null;

  // Filtrado por roles
  let whereClause: any = branch.id === 'GLOBAL' ? {} : { branchId: branch.id };

  if (!user.isSuperAdmin && user.commissionRole !== 'COORDINADOR') {
    if (user.commissionRole === 'LIDER') {
      // Gerente/Líder ve los suyos y los de sus subordinados
      const subordinates = await prisma.user.findMany({
        where: { managerId: user.id },
        select: { id: true }
      });
      const validUserIds = [user.id, ...subordinates.map(s => s.id)];
      whereClause.assignedUserId = { in: validUserIds };
    } else {
      // Vendedor normal solo ve los suyos
      whereClause.assignedUserId = user.id;
    }
  }

  const prospects = await prisma.prospect.findMany({
    where: whereClause,
    include: {
      assignedUser: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  const allUsers = await prisma.user.findMany({
    where: { ...(branch.id === 'GLOBAL' ? {} : { branchId: branch.id }), commissionRole: { not: null } },
    select: { id: true, name: true, commissionRole: true }
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Prospección (CRM)</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Embudo de ventas y seguimiento de WhatsApp</p>
        </div>
      </div>
      
      {/* Tablero Kanban pasándole los prospectos iniciales */}
      <KanbanBoard initialProspects={prospects} users={allUsers} currentUser={user} />
    </div>
  );
}
