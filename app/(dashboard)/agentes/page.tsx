import { getActiveUser, getActiveBranch } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { getSupplierIntelligence, getMarketingCampaigns, getPricingIntelligence } from "@/app/actions/agents";
import AgentsHubClient from "./AgentsHubClient";

export const dynamic = 'force-dynamic';

export default async function AgentesHubPage() {
  const user = await getActiveUser();
  const branch = await getActiveBranch();

  if (!user) {
    redirect('/login');
  }

  // Fetch intelligence data in parallel from the 3 agents
  const [suppliersData, marketingData, pricingData] = await Promise.all([
    getSupplierIntelligence(),
    getMarketingCampaigns(),
    getPricingIntelligence()
  ]);

  return (
    <div className="flex-1 w-full bg-slate-50 min-h-screen">
      <AgentsHubClient 
        user={user}
        branch={branch}
        initialSuppliersData={suppliersData}
        initialMarketingData={marketingData}
        initialPricingData={pricingData}
      />
    </div>
  );
}
