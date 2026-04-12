import { getBranchSettings } from "@/app/actions/settings";
import TicketConfiguratorClient from "./TicketConfiguratorClient";

export default async function Page() {
  const settings = await getBranchSettings();
  let config = {};
  
  if (settings.configJson) {
    try {
      const parsed = JSON.parse(settings.configJson);
      config = (parsed && typeof parsed === 'object') ? (parsed['tickets'] || {}) : {};
    } catch (e) {
      console.error("Error parsing configJson:", e);
    }
  }

  return (
    <TicketConfiguratorClient 
      moduleKey="tickets"
      initialConfig={config}
    />
  );
}
