import { getBranchSettings } from "@/app/actions/settings";
import FormatDesignerClient from "./FormatDesignerClient";
import { Palette } from 'lucide-react';

export default async function FormatosPreferencesPage() {
  const settings = await getBranchSettings();
  let configJson = {};
  if (settings.configJson) {
    try {
      configJson = JSON.parse(settings.configJson);
    } catch(e) {}
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Palette size={24} color="var(--pulpos-primary)" />
        Diseñador de Formatos
      </h1>
      <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Personaliza la apariencia visual de los diferentes documentos que genera CAANMA. Puedes añadir tu logo, cambiar colores y definir qué datos se muestran.
      </p>

      <FormatDesignerClient configJson={configJson} />
    </div>
  );
}
