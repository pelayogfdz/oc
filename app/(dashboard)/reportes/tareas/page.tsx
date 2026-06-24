import { getCollaboratorTaskReport } from "@/app/actions/task";
import TareasReportClient from "./TareasReportClient";

export const dynamic = "force-dynamic";

export default async function TareasReportPage() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29);

  const format = (d: Date) => d.toISOString().split('T')[0];

  const res = await getCollaboratorTaskReport({
    startDate: format(startDate),
    endDate: format(endDate)
  });

  const safeReport = res.success ? JSON.parse(JSON.stringify(res.report)) : [];

  return (
    <TareasReportClient 
      initialReport={safeReport}
      initialStartDate={format(startDate)}
      initialEndDate={format(endDate)}
    />
  );
}
