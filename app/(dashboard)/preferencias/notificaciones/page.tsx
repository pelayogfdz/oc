import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['notificaciones'] || {} : {};

  return (
    <SettingsFormClient 
      moduleKey="notificaciones"
      title="Alertas y Correo"
      description="SMTP y notificaciones Push."
      initialConfig={config}
      fields={[
        { name: 'smtpServer', label: 'Servidor SMTP', type: 'text', placeholder: '' },
        { name: 'notificarCorte', label: 'Enviar corte Z a Dueño', type: 'text', placeholder: '' }
      ]}
    />
  );
}
