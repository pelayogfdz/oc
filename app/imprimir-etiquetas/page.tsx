import { prisma } from "@/lib/prisma";
import EtiquetaClient from "./EtiquetaClient";
import { notFound } from "next/navigation";

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

  return <EtiquetaClient products={products} />;
}
