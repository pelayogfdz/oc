import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import UserClient from "./UserClient";

export default async function UsuariosPage() {
  const branch = await getActiveBranch();
  if (!branch) return <div>No hay sucursal seleccionada.</div>;
  const users = await prisma.user.findMany({
    where: { branchId: branch.id }
  });

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--pulpos-border)' }}>
      <UserClient initialUsers={users} />
    </div>
  );
}
