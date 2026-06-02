import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient, { FieldConfig } from "../SettingsFormClient";
import QZTrayConfig from "../general/QZTrayConfig";

export default async function Page() {
  const settings = await getBranchSettings();
  const ticketsConfig = settings.configJson ? JSON.parse(settings.configJson)['tickets'] || {} : {};
  const impresorasConfig = settings.configJson ? JSON.parse(settings.configJson)['impresoras'] || {} : {};

  let qzConfig = {};
  if (settings.configJson) {
    try {
      const parsed = JSON.parse(settings.configJson);
      const qz = parsed.qz || {};
      qzConfig = {
        certificate: qz.certificate || '',
        hasPrivateKey: !!qz.privateKey
      };
    } catch (e) {}
  }

  const ticketFields: FieldConfig[] = [
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
        { label: 'Rollo Mini (58mm)', value: '58mm' }
      ]
    }
  ];

  const impresorasFields: FieldConfig[] = [
    { 
      name: 'printAutomatically', 
      label: 'Imprimir ticket automáticamente al cobrar', 
      description: 'Envía directo la impresión a la impresora local (No/Sí).', 
      type: 'boolean' 
    },
    { 
      name: 'receiptWidth', 
      label: 'Ancho de Papel de Tickets (Impresoras)', 
      description: 'Define la compatibilidad del driver físico.',
      type: 'select',
      options: [
        { label: 'Rollo Ancho (80mm)', value: '80mm' },
        { label: 'Rollo Mini (58mm)', value: '58mm' }
      ]
    },
    { 
      name: 'ipImpresora', 
      label: 'Dirección IP de Impresora en Red (Opcional)', 
      description: 'Si imprimes vía Ethernet / Wifi sin cables.',
      type: 'text', 
      placeholder: '192.168.1.100' 
    },
    { 
      name: 'impresoraEtiquetas', 
      label: 'Nombre de Impresora de Etiquetas (Opcional)', 
      description: 'Nombre configurado en el sistema operativo.',
      type: 'text', 
      placeholder: 'Brother QL-800' 
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <SettingsFormClient 
        moduleKey="tickets"
        title="Personalización del Ticket Físico"
        description="Construcción estructural y visual de los comprobantes térmicos para el cliente."
        initialConfig={ticketsConfig}
        fields={ticketFields}
      />

      <SettingsFormClient 
        moduleKey="impresoras"
        title="Impresoras Térmicas y de Etiquetas"
        description="Configura tu hardware de red, habilita la impresión directa/automática de tickets y el comportamiento de las etiquetas (ej. Brother QL-800)."
        initialConfig={impresorasConfig}
        fields={impresorasFields}
      />

      <QZTrayConfig qzConfig={qzConfig} />

      <div className="card" style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', padding: '1.5rem', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#b45309', marginBottom: '0.5rem', margin: 0 }}>
          Configuración de Impresión (Kiosk Mode)
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#92400e', margin: '0.5rem 0' }}>
          Para omitir la ventana de impresión y que tus <strong>tickets</strong> salgan automático:
        </p>
        <ol style={{ fontSize: '0.85rem', color: '#92400e', paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
          <li>Crea un Acceso Directo de Google Chrome en tu escritorio.</li>
          <li>Haz clic derecho {'>'} <strong>Propiedades</strong>.</li>
          <li>En el campo <strong>Destino</strong>, agrega un espacio al final y escribe: <code>--kiosk-printing</code></li>
          <li>Los tickets se imprimirán directo a la <strong>impresora predeterminada</strong> de tu sistema operativo sin abrir diálogos.</li>
        </ol>
        <p style={{ fontSize: '0.85rem', color: '#92400e', margin: '0.5rem 0 0 0' }}>
          <strong>Nota sobre Etiquetas Brother QL-800:</strong> 
          El modo <code>--kiosk-printing</code> siempre usará la impresora predeterminada. Para etiquetas de productos, te abrirá el cuadro de diálogo estándar para que elijas tu Brother QL-800 preformateada en 62mm x 20mm.
        </p>
      </div>
    </div>
  );
}
