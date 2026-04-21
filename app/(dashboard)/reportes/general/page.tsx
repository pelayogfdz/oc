import { getGeneralAnalyticsData } from "@/app/actions/reportes";
import GeneralAnalyticsClient from "./GeneralAnalyticsClient";

export default async function GeneralAnalyticsPage() {
  const data = await getGeneralAnalyticsData(30);
  const safeData = JSON.parse(JSON.stringify(data));

  return <GeneralAnalyticsClient data={safeData} />;
}
