import { getGeneralAnalyticsData } from "@/app/actions/reportes";
import GeneralAnalyticsClient from "./GeneralAnalyticsClient";

export default async function GeneralAnalyticsPage() {
  const data = await getGeneralAnalyticsData(30);

  return <GeneralAnalyticsClient data={data} />;
}
