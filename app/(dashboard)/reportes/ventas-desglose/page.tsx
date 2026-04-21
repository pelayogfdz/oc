import { getSalesDetailData } from "@/app/actions/reportes";
import VentasDesgloseClient from "./VentasDesgloseClient";

export default async function VentasDesglosePage() {
  const data = await getSalesDetailData(30);
  const safeData = JSON.parse(JSON.stringify(data));

  return <VentasDesgloseClient initialData={safeData} />;
}
