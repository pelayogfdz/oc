import { getSalesBySellerReport, getAvailableFilters } from "@/app/actions/reportes";
import { getActiveBranch } from "@/app/actions/auth";
import VentasVendedorClient from "./VentasVendedorClient";

export const dynamic = "force-dynamic";

export default async function VentasPorVendedorPage() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30); // Default to last 30 days
  
  const branch = await getActiveBranch();
  if (!branch) return null;
  const initialBranchId = branch.id === 'GLOBAL' ? 'ALL' : branch.id;

  // Get report data
  const data = await getSalesBySellerReport(startDate, endDate, initialBranchId);
  
  // Get filter values
  const filters = await getAvailableFilters();

  const safeData = JSON.parse(JSON.stringify(data));
  const safeFilters = JSON.parse(JSON.stringify(filters));

  return (
    <VentasVendedorClient 
      initialData={safeData} 
      initialBranchId={initialBranchId} 
      availableFilters={safeFilters}
    />
  );
}
