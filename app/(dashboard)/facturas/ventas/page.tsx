import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import VentasInvoiceClient from "./VentasInvoiceClient";

export default async function FacturasVentasPage() {
  const branch = await getActiveBranch();
  
  // Completed sales
  const sales = await prisma.sale.findMany({ 
    where: { 
      branchId: branch.id, 
      status: "COMPLETED" 
    },
    include: { customer: true, user: true },
    orderBy: { createdAt: 'desc' },
    take: 100 // Fetch up to 100 recent sales
  });

  // Customers of this tenant
  const customers = await prisma.customer.findMany({
    where: {
      branch: {
        tenantId: branch.tenantId
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
