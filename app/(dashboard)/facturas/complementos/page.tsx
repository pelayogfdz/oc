import { prisma } from "@/lib/prisma";
import { getActiveBranch } from "@/app/actions/auth";
import REPClient from "./REPClient";

export default async function ComplementosPage() {
  const branch = await getActiveBranch();

  // Traer ventas facturadas
  const sales = await prisma.sale.findMany({
    where: {
      branchId: branch.id,
      invoiceId: { not: null },
      paymentMethod: 'CREDIT' // Idealmente solo facturas a crédito (PPD)
    },
    include: {
      customer: true
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
        Complementos de Pago (REP)
      </h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>
        Emite Recibos Electrónicos de Pago para facturas que fueron emitidas como Pago en Parcialidades o Diferido (PPD).
      </p>

      <REPClient sales={sales} />
    </div>
  );
}
