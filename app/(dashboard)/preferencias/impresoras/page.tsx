import { getBranchSettings } from "@/app/actions/settings";
import SettingsFormClient from "../SettingsFormClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['impresoras'] || {} : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <SettingsFormClient 
        moduleKey="impresoras"
        title="Impresoras Térmicas y de Etiquetas"
        description="Configura tu hardware de red, habilita la impresión automática de tickets y el comportamiento de las etiquetas (ej. Brother QL-800)."
        initialConfig={config}
        fields={[
          { name: 'printAutomatically', label: 'Imprimir ticket automáticamente al cobrar (Sí/No)', type: 'text', placeholder: 'true o false' },
          { name: 'receiptWidth', label: 'Ancho de Papel de Tickets (Ej. 80mm o 58mm)', type: 'text', placeholder: '80mm' },
          { name: 'ipImpresora', label: 'Dirección IP de Impresora en Red (Opcional)', type: 'text', placeholder: '192.168.1.100' },
          { name: 'impresoraEtiquetas', label: 'Nombre de Impresora de Etiquetas (Opcional - Uso futuro)', type: 'text', placeholder: 'Brother QL-800' }
        ]}
      />

      <div className="card" style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#b45309', marginBottom: '0.5rem' }}>
          Configuración de Impresión (Tickets y Etiquetas)
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: '0.5rem' }}>
          Para omitir la ventana de impresión y que tus <strong>tickets</strong> salgan automático:
        </p>
        <ol style={{ fontSize: '0.85rem', color: '#92400e', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
          <li>Crea un Acceso Directo de Google Chrome.</li>
          <li>Haz clic derecho {'>'} <strong>Propiedades</strong>.</li>
          <li>En <strong>Destino</strong>, agrega un espacio y: <code>--kiosk-printing</code></li>
          <li>Los tickets se imprimirán directo a la <strong>impresora predeterminada</strong> de Windows/Mac.</li>
        </ol>

        <p style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: '0.5rem' }}>
          <strong>Nota sobre Etiquetas Brother QL-800:</strong> 
          Ya que el modo <code>--kiosk-printing</code> siempre usa la impresora predeterminada (usualmente la de tickets), las etiquetas te abrirán el cuadro de diálogo estándar de Chrome para que selecciones manualmente tu Brother QL-800, la cual ya viene formateada en 62mm x 20mm.
        </p>
      </div>
    </div>
  );
}
