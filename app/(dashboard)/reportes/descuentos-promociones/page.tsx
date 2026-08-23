import { getDiscountPromotionsReport } from "@/app/actions/reporte-descuentos";
import { getActiveBranch } from "@/app/actions/auth";
import DescuentosPromocionesClient from "./DescuentosPromocionesClient";

export const dynamic = "force-dynamic";

export default async function DescuentosPromocionesPage() {
  const now = new Date();
  const past30Days = new Date();
  past30Days.setDate(now.getDate() - 30);

  const startDateStr = past30Days.toISOString().split('T')[0];
  const endDateStr = now.toISOString().split('T')[0];

  const branch = await getActiveBranch();
  const initialBranchId = (!branch || branch.id === 'GLOBAL') ? 'ALL' : branch.id;

  const reportData = await getDiscountPromotionsReport(
    startDateStr,
    endDateStr,
    initialBranchId,
    'ALL',
    'ALL'
  );

  const safeData = JSON.parse(JSON.stringify(reportData));

  return (
    <DescuentosPromocionesClient
      initialData={safeData}
      initialStartDate={startDateStr}
      initialEndDate={endDateStr}
      initialBranchId={initialBranchId}
    />
  );
}
