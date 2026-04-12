import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['cotizaciones'] || {} : {};

  return (
    <SettingsFormClient 
      moduleKey="cotizaciones"
      title="Cotizaciones"
      description="Configura la validez legal de tus cotizaciones."
      initialConfig={config}
      fields={[
        { name: 'diasVigencia', label: 'Días de Vigencia', type: 'text', placeholder: '' },
        { name: 'terminosCot', label: 'Términos y Condiciones al Pie', type: 'text', placeholder: '' }
      ]}
    />
  );
}
