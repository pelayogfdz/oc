import { getPurchasesRemainingStockData } from "@/app/actions/comprasReportes";
import { getActiveBranch } from "@/app/actions/auth";
import ComprasRemanenteClient from "./ComprasRemanenteClient";

export default async function ComprasRemanentePage() {
  const branch = await getActiveBranch();
  if (!branch) {
    throw new Error('Unauthorized');
  }

  // Load all purchases company-wide by default
  const data = await getPurchasesRemainingStockData({
    branchId: 'ALL'
  });
  const safeData = JSON.parse(JSON.stringify(data));

  return (
    <ComprasRemanenteClient 
      initialData={safeData} 
      initialBranchId="ALL" 
    />
  );
}
