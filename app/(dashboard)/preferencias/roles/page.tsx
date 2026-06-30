import { getSession } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import RoleClient from "./RoleClient";
import { createCustomRole, updateCustomRole, deleteCustomRole } from "@/app/actions/role-actions";

export default async function RolesPage() {
  // Explicitly reference actions to prevent bundler tree-shaking
  const _registerActions = { createCustomRole, updateCustomRole, deleteCustomRole };

  const session = await getSession();
  if (!session) return <div>No tienes una sesión activa o autorizada.</div>;

  const roles = await prisma.customRole.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { name: 'asc' }
  });

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--caanma-border)' }}>
      <RoleClient initialRoles={roles} />
    </div>
  );
}
