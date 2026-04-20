import { prisma } from "@/lib/prisma";
import PublicStoreClient from "./PublicStoreClient";
import { notFound } from "next/navigation";

export default async function TiendaPage({ params }: { params: { branchId: string } }) {
  const branch = await prisma.branch.findUnique({
    where: { id: params.branchId },
    include: { settings: true }
  });

  if (!branch) {
    notFound();
  }

  // Parse config
  let storeConfig = { active: false, whatsapp: '', themeColor: '#8b5cf6', allowDelivery: true, allowPickup: true };
  if (branch.settings?.configJson) {
     try {
       const parsed = JSON.parse(branch.settings.configJson);
       if (parsed['catalogo_b2c']) {
         storeConfig = { ...storeConfig, ...parsed['catalogo_b2c'] };
       }
     } catch (e) {}
  }

  if (!storeConfig.active) {
    return (
      <div style={{ textAlign: 'center', marginTop: '5rem', fontFamily: 'sans-serif' }}>
         <h1>Tienda Cerrada Temporalmente</h1>
         <p>Esta sucursal no tiene habilitado su catálogo en línea en este momento.</p>
      </div>
    );
  }

  // Fetch products
  const products = await prisma.product.findMany({
    where: {
      branchId: branch.id,
      isActive: true,
      stock: { gt: 0 }
    },
    select: {
      id: true,
      sku: true,
      name: true,
      description: true,
      imageUrl: true,
      price: true,
      stock: true,
      category: true
    }
  });

  return <PublicStoreClient branchName={branch.name} config={storeConfig} products={products} />;
}
