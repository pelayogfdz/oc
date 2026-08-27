import { getPriceChangeHistory } from "@/app/actions/reportes";
import { getActiveBranch } from "@/app/actions/auth";
import HistorialPreciosClient from "./HistorialPreciosClient";

export const dynamic = 'force-dynamic';

export default async function HistorialPreciosPage() {
  const branch = await getActiveBranch();
  if (!branch) {
    throw new Error('Unauthorized');
  }
  const initialBranchId = branch.id === 'GLOBAL' ? 'ALL' : branch.id;

  const data = await getPriceChangeHistory(initialBranchId, '', 1, 50);
  const safeData = JSON.parse(JSON.stringify(data));

  return <HistorialPreciosClient initialData={safeData} initialBranchId={initialBranchId} />;
}
