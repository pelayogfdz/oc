import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient, { FieldConfig } from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['notificaciones'] || {} : {};

  const fields: FieldConfig[] = [
    { 
      name: 'notificarCierreCaja', 
      label: 'Email Remoto de Corte "Z"', 
      description: 'Tras realizar cierre de turno, mandar desglose PDF ciego al Dueño/Administrador.',
      type: 'boolean' 
    },
    { 
      name: 'emailRecepcion', 
      label: 'Bandeja de Destino Administrativa', 
      description: 'Dirección a la cual llegarán los reportes Z, ventas en negativo y auditorías.',
      type: 'text',
      placeholder: 'socio@mitienda.com'
    },
    { 
      name: 'alertaWhatsapp', 
      label: 'Trazabilidad Integrada WhatsApp', 
      description: 'Habilitar el canal para envío de tickets vía Whatsapp en la terminal final de pago.',
      type: 'boolean' 
    }
  ];

  return (
    <SettingsFormClient 
      moduleKey="notificaciones"
      title="Alertas, Telecomunicaciones y SMTP"
      description="Canales de salida y mensajería directa tanto a directivos como al cliente (Whatsapp)."
      initialConfig={config}
      fields={fields}
    />
  );
}
