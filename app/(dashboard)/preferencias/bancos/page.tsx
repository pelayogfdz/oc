import { getBranchSettings } from "@/app/actions/settings";
import BancosClient from "./BancosClient";

export default async function Page() {
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['bancos'] || {} : {};

  return (
    <BancosClient initialConfig={config} />
  );
}
