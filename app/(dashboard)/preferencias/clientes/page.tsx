import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['clientes'] || {} : {};

  return (
    <SettingsFormClient 
      moduleKey="clientes"
      title="Crédito y Carteras"
      description="Condiciones genéricas de cuentas corporativas."
      initialConfig={config}
      fields={[
        { name: 'diasCredito', label: 'Días de Crédito Defecto', type: 'text', placeholder: '' }
      ]}
    />
  );
}
