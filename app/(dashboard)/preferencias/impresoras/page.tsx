import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['impresoras'] || {} : {};

  return (
    <SettingsFormClient 
      moduleKey="impresoras"
      title="Impresoras Térmicas"
      description="Conecta tu hardware ESC/POS de red o Bluetooth."
      initialConfig={config}
      fields={[
        { name: 'ipImpresora', label: 'Dirección IP de la Impresora', type: 'text', placeholder: '' },
        { name: 'tipoPapel', label: 'Ancho de Papel (Ej. 80mm o 58mm)', type: 'text', placeholder: '' }
      ]}
    />
  );
}
