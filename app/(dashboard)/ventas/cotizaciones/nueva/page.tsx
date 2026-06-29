import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { getBranchSettings } from "@/app/actions/settings";
import POSClient from "../../nueva/POSClient";

export default async function NuevaCotizacionPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ customerId?: string; quoteId?: string }> | { customerId?: string; quoteId?: string } 
}) {
  const resolvedParams = await searchParams;
  const customerId = resolvedParams?.customerId;
  const quoteId = resolvedParams?.quoteId;
  const branch = await getActiveBranch();
  
  if (!branch || branch.id === 'GLOBAL') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #f87171', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>SUCURSAL NO VÁLIDA</h2>
        <p>No se puede crear una cotización en modo "Vista Global".<br/>Por favor, selecciona una sucursal específica en el selector superior.</p>
      </div>
    );
  }

  const [products, customers, suppliers, promotions, settings] = await Promise.all([
    prisma.product.findMany({
      where: { branchId: branch.id, isActive: true },
      orderBy: { name: 'asc' },
      take: 50
    }),
    prisma.customer.findMany({ orderBy: { name: 'asc' } }),
    prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
    prisma.promotion.findMany({ where: { branchId: branch.id, active: true } }),
    getBranchSettings()
  ]);

  let ticketConfig: any = {};
  if (settings?.configJson) {
    try {
      const parsed = JSON.parse(settings.configJson);
      ticketConfig = parsed.tickets || {};
      ticketConfig.globalLogo = parsed.global?.logoUrl || '';
    } catch(e) {}
  }
  if (!ticketConfig.storeName && branch) {
    ticketConfig.storeName = branch.name;
  }
  if (!ticketConfig.address && branch?.location) {
    ticketConfig.address = branch.location;
  }

  const isEditing = !!quoteId;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: isEditing ? '#0284c7' : '#854d0e' }}>
        {isEditing ? 'Editar Cotización' : 'Crear Nueva Cotización'}
      </h1>
      <POSClient 
        products={products} 
        customers={customers} 
        suppliers={suppliers}
        promotions={promotions} 
        mode="QUOTE" 
        branchId={branch.id} 
        initialCustomerId={customerId}
        ticketConfig={ticketConfig}
      />
    </div>
  );
}
