import { getActiveBranch, getSession } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import UserClient from "./UserClient";
import { createUser, updateUser, deleteUser } from "@/app/actions/user";
import { createBranch } from "@/app/actions/branch";

export default async function UsuariosPage() {
  // Explicitly reference the imported server actions to ensure they are registered by the compiler for this route and not tree-shaken
  const _registerActions = { createUser, updateUser, deleteUser, createBranch };

  const session = await getSession();
  const branch = await getActiveBranch();
  if (!branch) return <div>No hay sucursal seleccionada.</div>;
  
  // Get all active branches to assign to users
  const branches = await prisma.branch.findMany({ 
    where: { isActive: true, tenantId: session?.tenantId } 
  });
  
  // Show all users for the business (including their hrLocations)
  const users = await prisma.user.findMany({
    where: { 
      tenantId: session?.tenantId,
      NOT: {
        email: {
          startsWith: 'inactivo_'
        }
      }
    },
    include: {
      hrLocations: true,
    }
  });

  const hrLocations = await prisma.hrLocation.findMany({
    where: { tenantId: session?.tenantId },
    orderBy: { name: 'asc' }
  });

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--pulpos-border)' }}>
      <UserClient initialUsers={users} branches={branches} hrLocations={hrLocations} />
    </div>
  );
}
