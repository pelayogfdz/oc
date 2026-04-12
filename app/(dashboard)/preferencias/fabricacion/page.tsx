import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['fabricacion'] || {} : {};

  return (
    <SettingsFormClient 
      moduleKey="fabricacion"
      title="Fabricación (Recetas)"
      description="Producción de sub-ensamblajes y paquetes."
      initialConfig={config}
      fields={[
        { name: 'autoDescontarInsumos', label: 'Descontar mermas auto', type: 'text', placeholder: '' }
      ]}
    />
  );
}
