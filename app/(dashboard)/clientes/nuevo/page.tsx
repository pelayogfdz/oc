import NuevoClienteForm from "./NuevoClienteForm";
import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";

export default async function NuevoCliente() {
  const branch = await getActiveBranch();
  const allPriceLists = await prisma.priceList.findMany({
    orderBy: { name: 'asc' }
  });

  const priceListsMap = new Map();
  const targetBranchId = branch?.id;
  if (targetBranchId && targetBranchId !== 'GLOBAL') {
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

  return (
    <NuevoClienteForm
      priceLists={JSON.parse(JSON.stringify(priceLists))}
    />
  );
}
