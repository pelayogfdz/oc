import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['recargas'] || {} : {};

  return (
    <SettingsFormClient 
      moduleKey="recargas"
      title="Recargas y Servicios"
      description="Configura la pasarela de recargas de tiempo aire."
      initialConfig={config}
      fields={[
        { name: 'apiKeyRecargas', label: 'Token VIP Recargas', type: 'text', placeholder: '' },
        { name: 'sobreCargo', label: 'Sobrecargo a clientes ($)', type: 'text', placeholder: '' }
      ]}
    />
  );
}
