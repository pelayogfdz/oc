import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['impresoras'] || {} : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <SettingsFormClient 
        moduleKey="impresoras"
        title="Impresoras Térmicas"
        description="Conecta tu hardware de red o habilita la impresión automática del navegador."
        initialConfig={config}
        fields={[
          { name: 'printAutomatically', label: 'Imprimir ticket automáticamente al cobrar (Sí/No)', type: 'text', placeholder: 'true o false' },
          { name: 'receiptWidth', label: 'Ancho de Papel por Defecto (Ej. 80mm o 58mm)', type: 'text', placeholder: '80mm' },
          { name: 'ipImpresora', label: 'Dirección IP de Impresora en Red (Opcional)', type: 'text', placeholder: '192.168.1.100' }
        ]}
      />

      <div className="card" style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#b45309', marginBottom: '0.5rem' }}>
          ¿Cómo lograr que se imprima 1 ticket en automático sin preguntar?
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: '0.5rem' }}>
          Por seguridad, los navegadores (como Chrome) siempre muestran la ventana de impresión. Para omitir esto y que tu impresora de tickets instalada dispare la impresión al instante:
        </p>
        <ol style={{ fontSize: '0.85rem', color: '#92400e', paddingLeft: '1.5rem' }}>
          <li>Crea un Acceso Directo de Google Chrome en tu Escritorio.</li>
          <li>Haz clic derecho en el acceso directo y selecciona <strong>Propiedades</strong>.</li>
          <li>En el campo <strong>Destino</strong>, al final del texto agrega un espacio y escribe: <code>--kiosk-printing</code></li>
          <li>Abre Caanma desde ese acceso directo. Ahora, al realizar una venta y tener activa la opción "Imprimir ticket automáticamente", saldrá directo a tu impresora predeterminada.</li>
        </ol>
      </div>
    </div>
  );
}
