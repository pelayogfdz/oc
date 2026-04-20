import { getDashboardMetrics } from "@/app/actions/reports";
import ReportesModuleClient from "./ReportesModuleClient";

export default async function Page() {
  const metrics = await getDashboardMetrics();
  return <ReportesModuleClient initialMetrics={metrics} />;
}
