import { getCostAndPricesData } from "@/app/actions/reportes";
import { getActiveBranch } from "@/app/actions/auth";
import CostosPreciosClient from "./CostosPreciosClient";

export const dynamic = 'force-dynamic';

export default async function CostosPreciosPage() {
  const branch = await getActiveBranch();
  if (!branch) {
    throw new Error('Unauthorized');
  }
  const initialBranchId = branch.id === 'GLOBAL' ? 'ALL' : branch.id;

  const data = await getCostAndPricesData(initialBranchId);
  const safeData = JSON.parse(JSON.stringify(data));

  return <CostosPreciosClient initialData={safeData} initialBranchId={initialBranchId} />;
}
