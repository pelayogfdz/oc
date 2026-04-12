import { getBranchSettings } from "@/app/actions/settings";
import PaymentMethodsConfigClient from "./PaymentMethodsConfigClient";

export default async function Page() {
  const settings = await getBranchSettings();
  let config = {};
  if (settings.configJson) {
     try {
       config = JSON.parse(settings.configJson)['metodos'] || {};
     } catch(e) {}
  }

  return <PaymentMethodsConfigClient initialConfig={config} />;
}
