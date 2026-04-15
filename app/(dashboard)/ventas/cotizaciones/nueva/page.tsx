import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import POSClient from "../../nueva/POSClient";

export default async function NuevaCotizacionPage() {
  const branch = await getActiveBranch();
  const products = await prisma.product.findMany({
    where: { branchId: branch.id, isActive: true },
    orderBy: { name: 'asc' }
  });

  const customers = await prisma.customer.findMany({
    where: { branchId: branch.id },
    orderBy: { name: 'asc' }
  });

  const promotions = await prisma.promotion.findMany({
    where: { branchId: branch.id, active: true }
  });

  const dynamicPriceLists = await prisma.priceList.findMany({
    where: { branchId: branch.id }
  });

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#854d0e' }}>Crear Nueva Cotización</h1>
      <POSClient products={products} customers={customers} promotions={promotions} mode="QUOTE" branchId={branch.id} dynamicPriceLists={dynamicPriceLists} />
    </div>
  );
}
