import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['productos'] || {} : {};

  return (
    <SettingsFormClient 
      moduleKey="productos"
      title="Inventario Dinámico"
      description="Notificaciones preventivas de stock."
      initialConfig={config}
      fields={[
        { name: 'alertaStock', label: 'Notificar en Stock Mínimo', type: 'text', placeholder: 'Si/No' }
      ]}
    />
  );
}
