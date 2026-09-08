import { getActiveBranch, getActiveUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import GastosClient from "./GastosClient";

export default async function GastosPage() {
  const branch = await getActiveBranch();
  const user = await getActiveUser();

  const isSuperAdmin = user?.isSuperAdmin || user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';

  // Fetch branches
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  // Fetch expenses: if admin, get all or branch
  const expenses = await prisma.expense.findMany({
    where: isSuperAdmin ? {} : { branchId: branch.id },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, name: true }
      },
      branch: {
        select: { id: true, name: true }
      }
    }
  });

  const safeExpenses = JSON.parse(JSON.stringify(expenses));
  const safeBranches = JSON.parse(JSON.stringify(branches));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <GastosClient
        initialExpenses={safeExpenses}
        branches={safeBranches}
        currentBranchId={branch?.id || ''}
      />
    </div>
  );
}
