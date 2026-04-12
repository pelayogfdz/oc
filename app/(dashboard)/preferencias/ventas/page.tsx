import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['ventas'] || {} : {};

  return (
    <SettingsFormClient 
      moduleKey="ventas"
      title="Preferencias de Venta"
      description="Ajustes finos del comportamiento de la Pantalla de Caja."
      initialConfig={config}
      fields={[
        { name: 'redondeo', label: 'Redondear decimales', type: 'text', placeholder: 'Si/No' },
        { name: 'permitirMultiPago', label: 'Permitir Múltiples Métodos', type: 'text', placeholder: 'Si/No' }
      ]}
    />
  );
}
