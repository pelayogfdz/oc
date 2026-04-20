import { getBranchSettings } from "@/app/actions/settings";
import CatalogoClient from "./CatalogoClient";

export default async function Page() {
  const settings = await getBranchSettings();
  let config = {};
  if (settings.configJson) {
     try {
       config = JSON.parse(settings.configJson)['catalogo_b2c'] || {};
     } catch(e) {}
  }

  return <CatalogoClient initialConfig={config} />;
}
