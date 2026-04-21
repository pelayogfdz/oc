import { getInventoryValuationData } from "@/app/actions/reportes";
import InventarioValorizadoClient from "./InventarioValorizadoClient";

export default async function InventarioValorizadoPage() {
  const data = await getInventoryValuationData();

  return <InventarioValorizadoClient data={data} />;
}
