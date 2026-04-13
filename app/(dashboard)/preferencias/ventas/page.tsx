import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient, { FieldConfig } from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['ventas'] || {} : {};

  const fields: FieldConfig[] = [
    { 
      name: 'venderSinStock', 
      label: 'Vender en negativo', 
      description: 'Permitir crear tickets y descontar stock cuando un producto tiene inventario 0 o inferior.',
      type: 'boolean' 
    },
    { 
      name: 'bloquearDescuentos', 
      label: 'Bloquear Descuentos Manuales', 
      description: 'Requerir un PIN de Administrador/Supervisor para aplicar descuentos en la pantalla principal de caja.',
      type: 'boolean' 
    },
    { 
      name: 'solicitarPropinas', 
      label: 'Solicitar Propinas', 
      description: 'Tras finalizar el total de la compra, exhibir modal de montos presugeridos para propina (10%, 15%, 20%).',
      type: 'boolean' 
    },
    { 
      name: 'redondeo', 
      label: 'Configuración de Redondeo', 
      description: 'Determinar si el subtotal con centavos debe forzarse al valor entero o semi-entero más cercano.',
      type: 'select', 
      options: [
        { label: 'Sin redondeo (Cálculo exacto)', value: 'sin_redondeo' },
        { label: 'Redondear a .50 más cercano', value: 'redondeo_50' },
        { label: 'Redondear siempre a 1.00 entero', value: 'redondeo_100' }
      ]
    },
    { 
      name: 'permitirMultiPago', 
      label: 'Múltiples Métodos de Pago',
      description: 'Permitir al usuario dividir el total de la cuenta entre tarjeta, efectivo y transferencias de forma fraccionada.',
      type: 'boolean' 
    }
  ];

  return (
    <SettingsFormClient 
      moduleKey="ventas"
      title="Preferencias de Venta"
      description="Ajustes finos del comportamiento de transacciones en la Pantalla de Caja."
      initialConfig={config}
      fields={fields}
    />
  );
}
