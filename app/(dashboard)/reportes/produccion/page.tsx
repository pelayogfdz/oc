import { getProductionReportData, getAvailableFilters } from "@/app/actions/reportes";
import { getActiveBranch } from "@/app/actions/auth";
import ProductionReportClient from "./ProductionReportClient";

export const dynamic = "force-dynamic";

export default async function ProductionReportPage() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30); // Default to last 30 days
  
  const branch = await getActiveBranch();
  if (!branch) return null;
  const initialBranchId = branch.id === 'GLOBAL' ? 'ALL' : branch.id;

  // Get initial production restock data (only products with recipes)
  const data = await getProductionReportData(startDate, endDate, initialBranchId, 'ALL');
  
  // Get filter values (categories, branches, etc.)
  const filters = await getAvailableFilters();

  const safeData = JSON.parse(JSON.stringify(data));
  const safeFilters = JSON.parse(JSON.stringify(filters));

  return (
    <ProductionReportClient 
      initialData={safeData} 
      initialBranchId={initialBranchId} 
      availableFilters={safeFilters}
    />
  );
}
