import { prisma } from "@/lib/prisma";
import { getBranchSettings } from "@/app/actions/settings";
import ImprimirEtiquetasClient from "./ImprimirEtiquetasClient";

export default async function ImprimirEtiquetasPage({
  searchParams
}: {
  searchParams: { ids?: string; qtys?: string; ref?: string }
}) {
  const idsParam = searchParams.ids || '';
  const qtysParam = searchParams.qtys || '';
  const idsArray = idsParam.split(',').filter(Boolean);
  const qtysArray = qtysParam.split(',').filter(Boolean);

  let products: any[] = [];
  if (idsArray.length > 0) {
    products = await prisma.product.findMany({
      where: {
        id: { in: idsArray }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        price: true
      }
    });
  }

  const settings = await getBranchSettings();
  let labelConfig = {
    width: 50,
    height: 25,
    showName: true,
    showPrice: true,
    showBarcode: true,
    barcodeFormat: 'CODE128',
    margin: 2
  };
  
  if (settings.configJson) {
    try {
      const parsed = JSON.parse(settings.configJson);
      if (parsed.labels) {
        labelConfig = { ...labelConfig, ...parsed.labels };
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <ImprimirEtiquetasClient 
      products={products} 
      config={labelConfig} 
      currencySymbol={settings.currencySymbol}
      taxIVA={settings.taxIVA}
      initialQtys={qtysArray}
    />
  );
}
