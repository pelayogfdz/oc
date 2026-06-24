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
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        Complementos de Pago (REP)
      </h1>
      <p style={{ color: 'var(--caanma-text-muted)', marginBottom: '2rem' }}>
        Emite Recibos Electrónicos de Pago para facturas que fueron emitidas como Pago en Parcialidades o Diferido (PPD).
      </p>

      <REPClient sales={sales} />
    </div>
  );
}
