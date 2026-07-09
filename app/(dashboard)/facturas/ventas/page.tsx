import { getActiveBranch, getSession } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import VentasInvoiceClient from "./VentasInvoiceClient";

export default async function FacturasVentasPage() {
  const branch = await getActiveBranch();
  const session = await getSession();
  
  const baseWhere = branch.id === 'GLOBAL'
    ? { branch: { tenantId: session?.tenantId || undefined } }
    : { branchId: branch.id };

  // Completed sales
  const sales = await prisma.sale.findMany({ 
    where: { 
      ...baseWhere,
      status: "COMPLETED" 
    },
    include: { customer: true, user: true, branch: true },
    orderBy: { createdAt: 'desc' },
    take: 300 // Fetch up to 300 recent sales
  });

  // Customers of this tenant
  const customers = await prisma.customer.findMany({
    where: {
      branch: {
        tenantId: session?.tenantId || branch.tenantId
      }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <VentasInvoiceClient 
      initialSales={JSON.parse(JSON.stringify(sales))} 
      initialCustomers={JSON.parse(JSON.stringify(customers))} 
    />
  );
}
