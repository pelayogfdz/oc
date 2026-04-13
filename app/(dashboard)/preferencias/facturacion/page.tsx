import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient, { FieldConfig } from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['facturacion'] || {} : {};

  const fields: FieldConfig[] = [
    { 
      name: 'facturacionLocal', 
      label: 'Activar Autofacturación en Línea', 
      description: 'Habilitar portal para que los clientes finales escriban el folio de su ticket y obtengan su CFDI.',
      type: 'boolean' 
    },
    { 
      name: 'regimenFiscal', 
      label: 'Régimen Fiscal Emisor (SAT)', 
      description: 'Clave numérica requerida en CFDI 4.0 según la constancia de situación de este RFC emisor.',
      type: 'select',
      options: [
        { label: '601 - General de Ley Personas Morales', value: '601' },
        { label: '603 - Personas Morales con Fines no Lucrativos', value: '603' },
        { label: '606 - Arrendamiento', value: '606' },
        { label: '612 - Personas Físicas con Actividades Empresariales', value: '612' },
        { label: '621 - Incorporación Fiscal', value: '621' },
        { label: '626 - Régimen Simplificado de Confianza', value: '626' }
      ]
    },
    { 
      name: 'csdPassword', 
      label: 'Contraseña Privada CSD (.Key)', 
      description: 'Obligatoria para firmar y timbrar comprobantes legales.',
      type: 'password' 
    },
    { 
      name: 'entornoFacturapi', 
      label: 'Entorno de Integración Facturapi', 
      description: 'Modo Sandbox permite probar timbres sin valor SAT. Modo Live genera consumos reales.',
      type: 'select',
      options: [
        { label: 'Modo Pruebas (Test)', value: 'test' },
        { label: 'Modo Producción (Live)', value: 'live' }
      ]
    },
    { 
      name: 'apiTokenTest', 
      label: 'Token Facturapi (Pruebas)', 
      type: 'text', 
      placeholder: 'sk_test_...' 
    },
    { 
      name: 'apiTokenLive', 
      label: 'Token Facturapi (Producción)', 
      type: 'text', 
      placeholder: 'sk_live_...' 
    }
  ];

  return (
    <SettingsFormClient 
      moduleKey="facturacion"
      title="Integración Tributaria y PAC SAT"
      description="Credenciales criptográficas API para emisión remota o automática de tickets a CFDI."
      initialConfig={config}
      fields={fields}
    />
  );
}
