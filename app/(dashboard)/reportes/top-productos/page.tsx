import { getTopProductsReport, getAvailableFilters } from "@/app/actions/reportes";
import { getActiveBranch } from "@/app/actions/auth";
import TopProductosClient from "./TopProductosClient";

export const dynamic = "force-dynamic";

export default async function TopProductosPage() {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30); // Default to last 30 days
  startDate.setHours(0, 0, 0, 0);
  
  const branch = await getActiveBranch();
  if (!branch) return null;
  const initialBranchId = branch.id === 'GLOBAL' ? 'ALL' : branch.id;

  // Get report data
  const data = await getTopProductsReport(startDate, endDate, initialBranchId, 'ALL', 'ALL', 'ALL');
  
  // Get filter values
  const filters = await getAvailableFilters({
    startDate,
    endDate,
    branchId: initialBranchId !== 'ALL' ? initialBranchId : undefined
  });

  const safeData = JSON.parse(JSON.stringify(data));
  const safeFilters = JSON.parse(JSON.stringify(filters));

  return (
    <TopProductosClient 
      initialData={safeData} 
      initialBranchId={initialBranchId} 
      availableFilters={safeFilters}
    />
  );
}
