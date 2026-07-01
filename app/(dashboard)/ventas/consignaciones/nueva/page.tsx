import { getActiveBranch, getActiveUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { getBranchSettings } from "@/app/actions/settings";
import POSClient from "../../nueva/POSClient";
import { getTenantSuppliers } from "@/app/actions/supplier";

export default async function NuevaConsignacionPage({ searchParams }: { searchParams: { customerId?: string } }) {
  const branch = await getActiveBranch();
  const user = await getActiveUser();
  
  if (!branch || branch.id === 'GLOBAL') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #f87171', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>SUCURSAL NO VÁLIDA</h2>
        <p>No se puede crear una consignación en modo "Vista Global".<br/>Por favor, selecciona una sucursal específica en el selector superior.</p>
      </div>
    );
  }

  const [products, customers, promotions, settings, suppliers] = await Promise.all([
    prisma.product.findMany({
      where: { branchId: branch.id, isActive: true },
      orderBy: { name: 'asc' }
    }),
    prisma.customer.findMany({ orderBy: { name: 'asc' } }),
    prisma.promotion.findMany({ where: { branchId: branch.id, active: true } }),
    getBranchSettings(),
    getTenantSuppliers()
  ]);

  let ticketConfig: any = {};
  if (settings?.configJson) {
    try {
      const parsed = JSON.parse(settings.configJson);
      ticketConfig = parsed.tickets || {};
      ticketConfig.globalLogo = parsed.global?.logoUrl || '';
    } catch(e) {}
  }

  // Fallback: If no logo is configured on this branch, try to fetch the logo from any branch settings of the same tenant
  if (!ticketConfig.globalLogo && branch?.tenantId) {
    const siblingSettings = await prisma.branchSettings.findFirst({
      where: {
        branch: {
          tenantId: branch.tenantId
        },
        configJson: { contains: 'logoUrl' }
      }
    });
    if (siblingSettings?.configJson) {
      try {
        const parsed = JSON.parse(siblingSettings.configJson);
        ticketConfig.globalLogo = parsed.global?.logoUrl || '';
      } catch (e) {}
    }
  }
  if (!ticketConfig.storeName && branch) {
    ticketConfig.storeName = branch.name;
  }
  if (!ticketConfig.address && branch?.location) {
    ticketConfig.address = branch.location;
  }

  let userPermissions: Record<string, boolean> = {};
  let userRole = 'USER';
  let isSuperAdmin = false;
  if (user) {
    userRole = user.role;
    isSuperAdmin = user.email?.toLowerCase() === 'pelayogfdz@gmail.com';
    const rawPermissions = (user as any).customRole?.permissions || user.permissions;
    if (rawPermissions) {
      try {
        const parsed = JSON.parse(rawPermissions);
        if (Array.isArray(parsed)) {
          parsed.forEach((p: string) => userPermissions[p] = true);
        } else {
          userPermissions = parsed;
        }
      } catch (e) {}
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#4f46e5' }}>Registrar Nueva Consignación</h1>
      <POSClient 
        products={products} 
        customers={customers} 
        suppliers={suppliers}
        promotions={promotions} 
        mode="CONSIGNMENT" 
        branchId={branch.id} 
        initialCustomerId={searchParams.customerId}
        ticketConfig={ticketConfig}
        userPermissions={userPermissions}
        userRole={userRole}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}
