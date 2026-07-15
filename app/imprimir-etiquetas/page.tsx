import { prisma } from "@/lib/prisma";
import EtiquetaClient from "./EtiquetaClient";
import { notFound } from "next/navigation";
import { getBranchSettings } from "@/app/actions/settings";

export default async function ImprimirEtiquetasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const idsParam = params.ids as string;
  if (!idsParam) return <div style={{ padding: '2rem' }}>No se proporcionaron productos para imprimir.</div>;
  
  const ids = idsParam.split(',');
  const products = await prisma.product.findMany({
    where: { id: { in: ids } }
  });

  if (!products.length) return notFound();

  const settings = await getBranchSettings();
  let labelConfig: any = {
    width: 62,
    height: 29, // Brother QL-800 default preset (62x29mm DK-1201 or DK-2205 size)
    showName: true,
    showPrice: true,
    showBarcode: true,
    showLocation: true,
    showDescription: true,
    barcodeFormat: 'CODE128',
    margin: 2
  };
  
  if (settings?.configJson) {
    try {
      const parsed = JSON.parse(settings.configJson);
      if (parsed.labels) {
        labelConfig = { ...labelConfig, ...parsed.labels };
      }
    } catch (e) {}
  }

  return <EtiquetaClient products={products} labelConfig={labelConfig} />;
}
