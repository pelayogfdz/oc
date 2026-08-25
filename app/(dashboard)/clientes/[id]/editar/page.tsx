import EditarClienteForm from "./EditarClienteForm";
import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branch = await getActiveBranch();

  const customer = await prisma.customer.findUnique({
    where: { id }
  });

  if (!customer) {
    return <div>Cliente no encontrado.</div>;
  }

  const allPriceLists = await prisma.priceList.findMany({
    orderBy: { name: 'asc' }
  });

  const priceListsMap = new Map();
  const targetBranchId = customer.branchId || (branch?.id !== 'GLOBAL' ? branch?.id : undefined);

  if (targetBranchId) {
    for (const pl of allPriceLists) {
      if (pl.branchId === targetBranchId) {
        priceListsMap.set(pl.name, pl);
      }
    }
  }

  for (const pl of allPriceLists) {
    if (!priceListsMap.has(pl.name)) {
      priceListsMap.set(pl.name, pl);
    }
  }

  const priceLists = Array.from(priceListsMap.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));

  const isGenericPublic = 
    customer.name.toLowerCase().includes('publico') && 
    customer.name.toLowerCase().includes('general');

  return (
    <EditarClienteForm
      id={id}
      customer={JSON.parse(JSON.stringify(customer))}
      priceLists={JSON.parse(JSON.stringify(priceLists))}
      isGenericPublic={isGenericPublic}
    />
  );
}
