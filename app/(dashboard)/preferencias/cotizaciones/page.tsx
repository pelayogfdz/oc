import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient, { FieldConfig } from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['cotizaciones'] || {} : {};

  const fields: FieldConfig[] = [
    { 
      name: 'diasVigencia', 
      label: 'Días Base para Expiración', 
      description: 'Tras este periodo la cotización expira y los precios/stocks ya no estarán congelados.',
      type: 'number',
      placeholder: 'Ej: 15' 
    },
    { 
      name: 'permitirAprobarAutomatico', 
      label: 'Portal Inversa (Link Privado)', 
      description: 'Habilita un portal web para que el interesado mande su aceptación online con 1 botonazo.',
      type: 'boolean' 
    },
    { 
      name: 'terminosCot', 
      label: 'Términos, Cláusulas y Condiciones', 
      description: 'Escribe las garantías y limitaciones aplicables al pie del documento PDF emitido.',
      type: 'text',
      placeholder: 'Precios sujetos a cambio sin previo aviso...' 
    }
  ];

  return (
    <SettingsFormClient 
      moduleKey="cotizaciones"
      title="Formato de Documentos Contables Estáticos"
      description="Validez corporativa en tus expedientes, firmas de PDF y términos de intercambio mercantil."
      initialConfig={config}
      fields={fields}
    />
  );
}
