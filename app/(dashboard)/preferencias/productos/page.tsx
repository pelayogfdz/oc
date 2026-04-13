import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient, { FieldConfig } from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['productos'] || {} : {};

  const fields: FieldConfig[] = [
    { 
      name: 'notificarStockBajo', 
      label: 'Alertar sobre Stock Bajo', 
      description: 'Activar sistema de monitoreo preventivo cuando un SKU alcance su cantidad de seguridad pre-establecida.',
      type: 'boolean' 
    },
    { 
      name: 'emailAlertas', 
      label: 'Email Administrativo', 
      description: 'Bandeja de entrada donde se enviarán las notificaciones automatizadas del inventario, vacio para no enviar correos.',
      type: 'text',
      placeholder: 'ejemplo@empresa.com'
    },
    { 
      name: 'permitirDecimales', 
      label: 'Permitir Cantidades Decimales', 
      description: 'Habilitar compras y ventas en proporciones de granel y peso, por ejemplo ingresar 1.5 en el stock de Productos.',
      type: 'boolean' 
    },
    { 
      name: 'costoAutomático', 
      label: 'Ajuste de Costo Automático',
      description: 'Al recibir compras a proveedores, recalcular dinámicamente el precio ponderado promedio en el inventario base.',
      type: 'boolean' 
    }
  ];

  return (
    <SettingsFormClient 
      moduleKey="productos"
      title="Inventario Dinámico"
      description="Configuraciones de protección, pesaje y notificaciones preventivas de artículos."
      initialConfig={config}
      fields={fields}
    />
  );
}
