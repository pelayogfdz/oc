import { getCustomCommissionsReport } from "@/app/actions/commissions";
import { getAvailableFilters } from "@/app/actions/reportes";
import { getActiveBranch } from "@/app/actions/auth";
import ComisionesReportClient from "./ComisionesReportClient";
import { startOfDay, subDays, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export default async function Page() {
  const branch = await getActiveBranch();
  if (!branch) return null;
  const initialBranchId = branch.id === 'GLOBAL' ? 'ALL' : branch.id;

  // Defaults to last 30 days
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(new Date(), 29));

  const initialData = await getCustomCommissionsReport(startDate, endDate, initialBranchId);
  const availableFilters = await getAvailableFilters();

  const safeData = JSON.parse(JSON.stringify(initialData));
  const safeFilters = JSON.parse(JSON.stringify(availableFilters));

  return (
    <ComisionesReportClient 
      initialData={safeData}
      initialBranchId={initialBranchId}
      availableFilters={safeFilters}
    />
  );
}
