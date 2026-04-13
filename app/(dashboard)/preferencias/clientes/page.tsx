import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient, { FieldConfig } from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['clientes'] || {} : {};

  const fields: FieldConfig[] = [
    { 
      name: 'habilitaCreditoDefecto', 
      label: 'Crédito Abierto por Defecto', 
      description: 'Al dar de alta un prospecto nuevo se le creará cuenta por cobrar inmediatamente.',
      type: 'boolean' 
    },
    { 
      name: 'diasCredito', 
      label: 'Días Base de Vigencia Pagaré', 
      description: 'Si un cliente asume deuda, se le darán estos días para vencimiento antes de incurrir mora.',
      type: 'number',
      placeholder: '15, 30, 90...' 
    },
    { 
      name: 'montoMaximoRiesgo', 
      label: 'Tope de Riesgo Genérico ($)', 
      description: 'Suma máxima en pesos sobre la deuda acumulada, pasando ésto no podrá cobrar sin liquidar antes.',
      type: 'number',
      placeholder: '5000'
    },
    {
      name: 'solicitarRfc',
      label: 'Exigir RFC y Razón Social Obligatoria',
      description: 'Almacenar cuentas impone validar RFC estricto de forma mandatoria.',
      type: 'boolean'
    }
  ];

  return (
    <SettingsFormClient 
      moduleKey="clientes"
      title="Créditos y Pagarés"
      description="Parámetros contables de tolerancia al fiar e integraciones prospectadas de clientes asiduos."
      initialConfig={config}
      fields={fields}
    />
  );
}
