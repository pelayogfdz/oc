import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['vendedores'] || {} : {};

  return (
    <SettingsFormClient 
      moduleKey="vendedores"
      title="Vendedores y Comisiones"
      description="Configura las comisiones base para tus vendedores."
      initialConfig={config}
      fields={[
        { name: 'tasaComision', label: 'Tasa de Comisión Base (%)', type: 'text', placeholder: '' },
        { name: 'metaMensual', label: 'Meta Mensual Global ($)', type: 'text', placeholder: '' }
      ]}
    />
  );
}
