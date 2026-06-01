import { getTopCategoriesReport, getAvailableFilters } from "@/app/actions/reportes";
import { getActiveBranch } from "@/app/actions/auth";
import TopCategoriasClient from "./TopCategoriasClient";

export const dynamic = "force-dynamic";

export default async function TopCategoriasPage() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30); // Default to last 30 days
  
  const branch = await getActiveBranch();
  if (!branch) return null;
  const initialBranchId = branch.id === 'GLOBAL' ? 'ALL' : branch.id;

  // Get report data
  const data = await getTopCategoriesReport(startDate, endDate, initialBranchId);
  
  // Get filter values
  const filters = await getAvailableFilters();

  const safeData = JSON.parse(JSON.stringify(data));
  const safeFilters = JSON.parse(JSON.stringify(filters));

  return (
    <TopCategoriasClient 
      initialData={safeData} 
      initialBranchId={initialBranchId} 
      availableFilters={safeFilters}
    />
  );
}
