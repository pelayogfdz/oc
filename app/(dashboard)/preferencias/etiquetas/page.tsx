import { getBranchSettings } from "@/app/actions/settings";
import EtiquetasClient from "./EtiquetasClient";

export default async function PreferenciasEtiquetasPage() {
  const settings = await getBranchSettings();
  let labelConfig = {};
  
  if (settings.configJson) {
    try {
      const parsed = JSON.parse(settings.configJson);
      if (parsed.labels) {
        labelConfig = parsed.labels;
      }
    } catch (e) {
      console.error(e);
    }
  }

  return <EtiquetasClient initialConfig={labelConfig} />;
}
