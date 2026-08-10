import { getSupplyUsageReportData, getAvailableFilters } from "@/app/actions/reportes";
import { getActiveBranch } from "@/app/actions/auth";
import UsoInsumosReportClient from "./UsoInsumosReportClient";

export const dynamic = "force-dynamic";

export default async function UsoInsumosReportPage() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30); // Default to last 30 days
  
  const branch = await getActiveBranch();
  if (!branch) return null;
  const initialBranchId = branch.id === 'GLOBAL' ? 'ALL' : branch.id;

  // Get initial supply usage data
  const data = await getSupplyUsageReportData(startDate, endDate, initialBranchId);
  
  // Get filter values (like branches list)
  const filters = await getAvailableFilters();

  const safeData = JSON.parse(JSON.stringify(data));
  const safeFilters = JSON.parse(JSON.stringify(filters));

  return (
    <UsoInsumosReportClient 
      initialData={safeData} 
      initialBranchId={initialBranchId} 
      availableFilters={safeFilters}
    />
  );
}
