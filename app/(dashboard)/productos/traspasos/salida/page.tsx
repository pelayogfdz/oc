import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import TransferClient from "./TransferClient";
import { getBranchSettings } from "@/app/actions/settings";

export const dynamic = 'force-dynamic';

export default async function NuevoTraspasoPage() {
  const branch = await getActiveBranch();
  
  if (branch?.id === 'GLOBAL') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #f87171', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>VISTA GLOBAL ACTIVA</h2>
        <p>No se pueden crear traspasos en modo "Todas las Sucursales".<br/>Por favor, selecciona una sucursal específica en el selector de arriba para registrar un traspaso desde allí.</p>
      </div>
    );
  }
  
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
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Enviar Traspaso Directo</h1>
      <TransferClient 
         originBranchId={branch?.id || ''} 
         originBranchName={branch?.name || ''} 
         otherBranches={branches} 
         inventory={originProducts} 
         ventasConfig={ventasConfig}
         isDirectDispatch={true}
      />
    </div>
  );
}
