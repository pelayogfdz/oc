import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import POSClient from "../../nueva/POSClient";

export default async function NuevaCotizacionPage({ searchParams }: { searchParams: { customerId?: string } }) {
  const branch = await getActiveBranch();
  
  if (!branch || branch.id === 'GLOBAL') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #f87171', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>SUCURSAL NO VÁLIDA</h2>
        <p>No se puede crear una cotización en modo "Vista Global".<br/>Por favor, selecciona una sucursal específica en el selector superior.</p>
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

  const suppliers = await prisma.supplier.findMany({
    where: { branchId: branch.id },
    orderBy: { name: 'asc' }
  });

  const promotions = await prisma.promotion.findMany({
    where: { branchId: branch.id, active: true }
  });

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#854d0e' }}>Crear Nueva Cotización</h1>
      <POSClient 
        products={products} 
        customers={customers} 
        suppliers={suppliers}
        promotions={promotions} 
        mode="QUOTE" 
        branchId={branch.id} 
        initialCustomerId={searchParams.customerId}
      />
    </div>
  );
}
