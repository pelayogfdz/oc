import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import TransferClient from "./TransferClient";
import { getBranchSettings } from "@/app/actions/settings";

export const dynamic = 'force-dynamic';

export default async function NuevoTraspasoPage() {
  const branch = await getActiveBranch();
  
  // All branches except the current one (for destination selection)
  const branches = await prisma.branch.findMany({
    where: { NOT: { id: branch?.id || '' } }
  });

  // Load origin inventory (Active branch)
  const originProducts = await prisma.product.findMany({
    where: { branchId: branch?.id || '' },
    include: { variants: true }
  });

  const settings = await getBranchSettings();
  const ventasConfig = settings.configJson ? JSON.parse(settings.configJson)['ventas'] || {} : {};

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Nuevo Traspaso a Sucursal</h1>
      <TransferClient 
         originBranchId={branch?.id || ''} 
         originBranchName={branch?.name || ''} 
         otherBranches={branches} 
         inventory={originProducts} 
         ventasConfig={ventasConfig}
      />
    </div>
  );
}
