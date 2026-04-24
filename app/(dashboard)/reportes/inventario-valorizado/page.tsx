import { getInventoryValuationData } from "@/app/actions/reportes";
import { getActiveBranch } from "@/app/actions/auth";
import InventarioValorizadoClient from "./InventarioValorizadoClient";

export default async function InventarioValorizadoPage() {
  const branch = await getActiveBranch();
  const initialBranchId = branch.id === 'GLOBAL' ? 'ALL' : branch.id;

  const data = await getInventoryValuationData(initialBranchId);
  const safeData = JSON.parse(JSON.stringify(data));

  return <InventarioValorizadoClient initialData={safeData} initialBranchId={initialBranchId} />;
}
