import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['cajas'] || {} : {};

  return (
    <SettingsFormClient 
      moduleKey="cajas"
      title="Arqueos y Caja"
      description="Protección y seguridad del flujo de efectivo."
      initialConfig={config}
      fields={[
        { name: 'limiteEfectivo', label: 'Alerta de Límite de Efectivo ($)', type: 'text', placeholder: '' },
        { name: 'corteCiego', label: 'Corte Ciego (Ocultar diferencias al cajero)', type: 'text', placeholder: 'Si/No' }
      ]}
    />
  );
}
