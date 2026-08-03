import { prisma } from "@/lib/prisma";
import CuentasPorCobrarReportClient from "./CuentasPorCobrarReportClient";

export default async function CuentasPorCobrarReportPage() {
  const pendingSales = await prisma.sale.findMany({
    where: { 
      paymentMethod: 'CREDIT',
      balanceDue: { gt: 0 },
      status: { not: 'CANCELLED' }
    },
    include: {
      customer: true,
      branch: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const branches = await prisma.branch.findMany({
    where: { isActive: true }
  });

  // Fix Next.js Date Serialization
  const safeSales = JSON.parse(JSON.stringify(pendingSales));
  const safeBranches = JSON.parse(JSON.stringify(branches));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <CuentasPorCobrarReportClient initialSales={safeSales} branches={safeBranches} />
    </div>
  );
}
