import { getGeneralAnalyticsData } from "@/app/actions/reportes";
import { getActiveBranch } from "@/app/actions/auth";
import GeneralAnalyticsClient from "./GeneralAnalyticsClient";

export default async function GeneralAnalyticsPage() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  
  const branch = await getActiveBranch();
  const initialBranchId = branch.id === 'GLOBAL' ? 'ALL' : branch.id;

  const data = await getGeneralAnalyticsData(startDate, endDate, initialBranchId, 'ALL');
  const safeData = JSON.parse(JSON.stringify(data));

  return <GeneralAnalyticsClient initialData={safeData} initialBranchId={initialBranchId} />;
}
