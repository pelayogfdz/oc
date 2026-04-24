import { getSalesDetailData } from "@/app/actions/reportes";
import { getActiveBranch } from "@/app/actions/auth";
import VentasDesgloseClient from "./VentasDesgloseClient";

export default async function VentasDesglosePage() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  const branch = await getActiveBranch();
  const initialBranchId = branch.id === 'GLOBAL' ? 'ALL' : branch.id;

  const data = await getSalesDetailData(startDate, endDate, initialBranchId, 'ALL');
  const safeData = JSON.parse(JSON.stringify(data));

  return <VentasDesgloseClient initialData={safeData} initialBranchId={initialBranchId} />;
}
