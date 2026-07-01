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
    },
    {
      name: 'smtpHost',
      label: 'Servidor de Correo Saliente (SMTP Host)',
      description: 'Dirección del servidor de correo de salida (ej. smtp.gmail.com, smtp.zoho.com).',
      type: 'text',
      placeholder: 'smtp.miempresa.com'
    },
    {
      name: 'smtpPort',
      label: 'Puerto SMTP',
      description: 'Puerto de comunicación saliente (ej. 465 para SSL/TLS, 587 para STARTTLS).',
      type: 'text',
      placeholder: '465'
    },
    {
      name: 'smtpSecure',
      label: 'Conexión Segura (SSL/TLS)',
      description: 'Activar si el puerto es 465 (SSL/TLS). Desactivar para puerto 587 (STARTTLS).',
      type: 'boolean'
    },
    {
      name: 'smtpUser',
      label: 'Usuario / Correo Emisor',
      description: 'Cuenta de correo desde la cual se enviarán los correos (cotizaciones, etc.).',
      type: 'text',
      placeholder: 'contacto@miempresa.com'
    },
    {
      name: 'smtpPass',
      label: 'Contraseña SMTP',
      description: 'Contraseña de la cuenta o contraseña de aplicación generada en tu proveedor de correo.',
      type: 'password',
      placeholder: '••••••••••••'
    },
    {
      name: 'emailFromName',
      label: 'Nombre del Remitente',
      description: 'Nombre descriptivo que verán tus clientes al recibir los correos.',
      type: 'text',
      placeholder: 'Mi Empresa - Cotizaciones'
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
