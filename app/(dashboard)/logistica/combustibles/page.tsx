import { getActiveBranch } from "@/app/actions/auth";
import { 
  getFuelLogisticsConfig, 
  getFuelTransactions, 
  getUnassociatedSales, 
  getUnassociatedPurchases 
} from "@/app/actions/fuel-logistics";
import CombustiblesClient from "./CombustiblesClient";

export default async function FuelLogisticsPage() {
  const branch = await getActiveBranch();
  const config = await getFuelLogisticsConfig();
  const transactions = await getFuelTransactions();
  const unassociatedSales = await getUnassociatedSales();
  const unassociatedPurchases = await getUnassociatedPurchases();

  return (
    <CombustiblesClient 
      branch={branch}
      initialConfig={config}
      initialTransactions={transactions}
      unassociatedSales={unassociatedSales}
      unassociatedPurchases={unassociatedPurchases}
    />
  );
}
