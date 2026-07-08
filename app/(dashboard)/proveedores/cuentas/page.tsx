import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { Banknote } from 'lucide-react';
import CuentasPorPagarClient from "./CuentasPorPagarClient";

export default async function CuentasPorPagarPage() {
  const branch = await getActiveBranch();
  
  const suppliersWithStatus = await prisma.supplier.findMany({
    where: { 
       branch: {
          tenantId: branch.tenantId
       },
       OR: [
          { creditBalance: { gte: 0.01 } },
          { purchases: { some: { paymentMethod: 'CREDIT', balanceDue: { gte: 0.01 } } } }
       ]
    },
    include: {
      purchases: {
        where: { paymentMethod: 'CREDIT', balanceDue: { gte: 0.01 } },
        orderBy: { dueDate: 'asc' }
      }
    }
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Banknote size={28} color="#ef4444" />
            Cuentas por Pagar (Proveedores)
          </h1>
          <p style={{ color: 'var(--caanma-text-muted)', marginTop: '0.25rem' }}>Gestiona los deudas pendientes con tus proveedores y programa cobros.</p>
        </div>
      </div>

      <CuentasPorPagarClient suppliers={suppliersWithStatus} />
    </div>
  );
}
