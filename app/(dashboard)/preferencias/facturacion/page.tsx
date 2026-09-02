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
      name: 'permitirFacturarMesAnterior', 
      label: 'Permitir facturar ventas después de fin de mes', 
      description: 'Si está activo (por defecto), permite facturar tickets, notas y pedidos de meses anteriores. Si se desactiva, solo se podrán facturar ventas del mes calendario actual.',
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
    },
    { 
      name: 'apiTokenUser', 
      label: 'Token Facturapi (Usuario/Admin)', 
      type: 'text', 
      placeholder: 'sk_user_...' 
    },
    { 
      name: 'serieNotaCredito', 
      label: 'Serie de Notas de Crédito (Egreso)', 
      description: 'Prefijo de serie para las Notas de Crédito emitidas (por defecto: NCR).',
      type: 'text', 
      placeholder: 'NCR' 
    },
    { 
      name: 'formaPagoDefaultNCR', 
      label: 'Forma de Pago SAT Predeterminada (Nota de Crédito)', 
      description: 'Clave SAT preseleccionada al emitir Notas de Crédito y devoluciones.',
      type: 'select',
      options: [
        { label: '01 - Efectivo', value: '01' },
        { label: '03 - Transferencia electrónica de fondos', value: '03' },
        { label: '04 - Tarjeta de crédito', value: '04' },
        { label: '28 - Tarjeta de débito', value: '28' },
        { label: '17 - Compensación (Amortización de Saldo)', value: '17' },
        { label: '15 - Condonación', value: '15' },
        { label: '99 - Por definir', value: '99' }
      ]
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
