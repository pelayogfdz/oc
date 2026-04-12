import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['facturacion'] || {} : {};

  return (
    <SettingsFormClient 
      moduleKey="facturacion"
      title="Facturación Electrónica SAT"
      description="Tus credenciales y Sellos Digitales."
      initialConfig={config}
      fields={[
        { name: 'regimenFiscal', label: 'Régimen Fiscal (Número)', type: 'text', placeholder: 'Ej: 601' },
        { name: 'csdPassword', label: 'Contraseña CSD', type: 'password', placeholder: '' },
        { name: 'testKey', label: 'Facturapi Test Key', type: 'text', placeholder: 'sk_test_...' },
        { name: 'liveKey', label: 'Facturapi Live Key', type: 'text', placeholder: 'sk_live_...' }
      ]}
    />
  );
}
