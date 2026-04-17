import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient, { FieldConfig } from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['tickets'] || {} : {};

  const fields: FieldConfig[] = [
    { 
      name: 'impresionAutomatica', 
      label: 'Lanzar Impresión Automática', 
      description: 'Disparar cuadro de impresión apenas de clic en Terminar Venta.',
      type: 'boolean' 
    },
    { 
      name: 'imprimirCajero', 
      label: 'Mostrar Info del Cajero', 
      description: 'Imprimir el Nivel o Nombre del empleado que efectuó el corte en la parte superior.',
      type: 'boolean' 
    },
    { 
      name: 'imprimirDesglose', 
      label: 'Desglosar Impuestos Completos', 
      description: 'Descriptivo de Base Gravada, Tasa IVA 16% o Tasa Cero en totales finales.',
      type: 'boolean' 
    },
    { 
      name: 'logoRecibo', 
      label: 'URL Fija de Logo para Cabecera', 
      description: 'Si tienes un logotipo corporativo térmico blanco y negro, pega la URL de la imagen aquí.',
      type: 'text',
      placeholder: 'https://...'
    },
    { 
      name: 'autofacturacionUrl', 
      label: 'URL de Portal Externo de Autofacturación', 
      description: 'Si usas otro sistema (Facturapi, FacturaTech), pon la liga pública. El código QR integrará ?ticketId= al final para precargar datos.',
      type: 'text',
      placeholder: 'https://miportal.com/facturar'
    },
    { 
      name: 'anchoTicket', 
      label: 'Compatibilidad de Ancho Térmico', 
      description: 'Generalmente impresoras Epson/Xprinter usan 58mm o 80mm.',
      type: 'select',
      options: [
        { label: 'Rollo Ancho (80mm)', value: '80mm' },
        { label: 'Rollo Míni (58mm)', value: '58mm' }
      ]
    }
  ];

  return (
    <SettingsFormClient 
      moduleKey="tickets"
      title="Personalización del Ticket Físico"
      description="Construcción estructural y visual de los comprobantes térmicos para el cliente."
      initialConfig={config}
      fields={fields}
    />
  );
}
