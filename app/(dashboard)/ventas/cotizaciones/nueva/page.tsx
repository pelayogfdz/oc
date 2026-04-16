import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import POSClient from "../../nueva/POSClient";

export default async function NuevaCotizacionPage() {
  const branch = await getActiveBranch();
  
  if (branch?.id === 'GLOBAL') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #f87171', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>VISTA GLOBAL ACTIVA</h2>
        <p>No se puede generar una cotización en modo "Todas las Sucursales".<br/>Por favor, selecciona una sucursal específica en el selector de arriba para poder registrarla.</p>
      </div>
    );
  }

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
