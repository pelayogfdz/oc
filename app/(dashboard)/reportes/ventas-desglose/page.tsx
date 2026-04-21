import { getSalesDetailData } from "@/app/actions/reportes";
import VentasDesgloseClient from "./VentasDesgloseClient";

export default async function VentasDesglosePage() {
  const data = await getSalesDetailData(30);

  return <VentasDesgloseClient initialData={data} />;
}
