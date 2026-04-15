import { getActiveBranch } from "@/app/actions/auth";
import PromotionFormClient from "./PromotionFormClient";

export default async function NuevoPromocion() {
  const branch = await getActiveBranch();
  return <PromotionFormClient branchId={branch.id} />;
}
