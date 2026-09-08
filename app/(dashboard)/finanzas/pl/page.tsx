import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { getFinancialPLReport } from "@/app/actions/financialPl";
import FinancialPLClient from "./FinancialPLClient";

export const metadata = {
  title: "Estado de Resultados (P&L) | Finanzas",
  description: "Estado de Resultados integral, margen bruto, EBITDA, OPEX y situación financiera de la empresa."
};

export default async function FinancialPLPage() {
  const branch = await getActiveBranch();
  
  // Default to current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const startDateStr = startOfMonth.toISOString().split('T')[0];
  const endDateStr = endOfMonth.toISOString().split('T')[0];
  
  // Default to 'all' or active branch
  const initialBranchId = "all";

  // Fetch branches for selector
  const branches = await prisma.branch.findMany({
    where: { 
      tenantId: branch.tenantId,
      isActive: true 
    },
    select: {
      id: true,
      name: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  // Fetch initial report
  const initialData = await getFinancialPLReport(startDateStr, endDateStr, initialBranchId);

  return (
    <FinancialPLClient 
      initialData={initialData} 
      branches={branches} 
      initialBranchId={initialBranchId} 
    />
  );
}
