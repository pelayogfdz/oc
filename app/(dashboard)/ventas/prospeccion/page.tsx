import { prisma } from "@/lib/prisma";
import { getActiveUser, getActiveBranch } from "@/app/actions/auth";
import KanbanBoard from "./KanbanBoard";

import { hasPermission, hasNodeAccess } from "@/app/config/permissions";
import { redirect } from "next/navigation";

export default async function ProspeccionPage() {
  const branch = await getActiveBranch();
  const user = await getActiveUser();
  
  if (!user) return null;

  // Securing page access
  const isSuperAdmin = user.email?.toLowerCase() === 'pelayogfdz@gmail.com';
  let userPermissions: Record<string, boolean> = {};
  const rolePermissions = (user as any).customRole?.permissions;
  const userPermissionsRaw = user.permissions;
  const mergedList: string[] = [];

  if (rolePermissions) {
    try {
      const parsed = JSON.parse(rolePermissions);
      if (Array.isArray(parsed)) mergedList.push(...parsed);
      else Object.keys(parsed).forEach((k) => { if (parsed[k]) mergedList.push(k); });
    } catch (e) {}
  }

  if (userPermissionsRaw) {
    try {
      const parsed = JSON.parse(userPermissionsRaw);
      if (Array.isArray(parsed)) mergedList.push(...parsed);
      else Object.keys(parsed).forEach((k) => { if (parsed[k]) mergedList.push(k); });
    } catch (e) {}
  }

  if (mergedList.length > 0) {
    const tempPermissions: Record<string, boolean> = {};
    mergedList.forEach((p: string) => tempPermissions[p] = true);

    Object.keys(tempPermissions).forEach(p => {
      if (hasPermission(tempPermissions, p)) {
        userPermissions[p] = true;
      }
    });
  }

  const hasAccess = hasNodeAccess(userPermissions, 'whatsapp_kanban', isSuperAdmin, user.role);
  if (!hasAccess) {
    redirect('/');
  }

  // Filtrado por roles
  let whereClause: any = branch.id === 'GLOBAL' ? {} : { branchId: branch.id };

  if (!user.isSuperAdmin && user.commissionRole !== 'COORDINADOR') {
    if (user.commissionRole === 'LIDER') {
      // Gerente/Líder ve los suyos, los de sus subordinados y los no asignados
      const subordinates = await prisma.user.findMany({
        where: { managerId: user.id },
        select: { id: true }
      });
      const validUserIds = [user.id, ...subordinates.map(s => s.id)];
      whereClause.OR = [
        { assignedUserId: { in: validUserIds } },
        { assignedUserId: null }
      ];
    } else {
      // Vendedor normal ve los suyos y los no asignados (conversaciones nuevas de WhatsApp)
      whereClause.OR = [
        { assignedUserId: user.id },
        { assignedUserId: null }
      ];
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
    where: { 
      ...(branch.id === 'GLOBAL' ? {} : { branchId: branch.id }), 
      commissionRole: { not: null },
      NOT: {
        email: {
          startsWith: 'inactivo_'
        }
      }
    },
    select: { id: true, name: true, commissionRole: true }
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Prospección (CRM)</h1>
          <p style={{ color: 'var(--caanma-text-muted)' }}>Embudo de ventas y seguimiento de WhatsApp</p>
        </div>
      </div>
      
      {/* Tablero Kanban pasándole los prospectos iniciales */}
      <KanbanBoard initialProspects={prospects} users={allUsers} currentUser={user} />
    </div>
  );
}
