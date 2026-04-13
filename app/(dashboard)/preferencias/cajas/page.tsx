import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient, { FieldConfig } from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['cajas'] || {} : {};

  const fields: FieldConfig[] = [
    { 
      name: 'solicitarFondoFijo', 
      label: 'Forzar Reglas de Fondo al Iniciar', 
      description: 'Requerirle al cajero en turno que especifique cuánto efectivo tiene en morralla antes de arrancar.',
      type: 'boolean' 
    },
    { 
      name: 'limiteEfectivo', 
      label: 'Alarma de Límite de Efectivo en Caja ($)', 
      description: 'Punto crítico sugerido al cual el software exige hacer "Retiro" a la caja fuerte por seguridad.',
      type: 'number',
      placeholder: 'Ej: 10000'
    },
    { 
      name: 'corteCiego', 
      label: 'Modalidad de "Corte Ciego"', 
      description: 'Para evitar desfalcos, el sistema NO le dirá al empleado cuánto efectivo "Sobra o Falta" sino hasta después de cerrar.',
      type: 'boolean' 
    },
    { 
      name: 'permitirAjustesInventario', 
      label: 'Permitir Mermas desde la Caja', 
      description: 'Cajeros registrados pueden hacer devoluciones/mermas en caliente en el POS sin permiso total de catálogos.',
      type: 'boolean' 
    }
  ];

  return (
    <SettingsFormClient 
      moduleKey="cajas"
      title="Prevención y Seguridad de Caja Principal"
      description="Políticas de cortes, fondos y salvaguarda de efectivo de la sucursal."
      initialConfig={config}
      fields={fields}
    />
  );
}
