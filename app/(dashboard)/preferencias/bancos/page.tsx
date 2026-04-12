import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['bancos'] || {} : {};

  return (
    <SettingsFormClient 
      moduleKey="bancos"
      title="Conciliación Bancaria"
      description="Asocia las cuentas bancarias corporativas."
      initialConfig={config}
      fields={[
        { name: 'clabePrincipal', label: 'CLABE Principal', type: 'text', placeholder: '' }
      ]}
    />
  );
}
