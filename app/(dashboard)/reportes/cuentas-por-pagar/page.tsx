import { prisma } from "@/lib/prisma";
import CuentasPorPagarReportClient from "./CuentasPorPagarReportClient";

export default async function CuentasPorPagarReportPage() {
  const pendingPurchases = await prisma.purchase.findMany({
    where: { 
      paymentMethod: 'CREDIT',
      balanceDue: { gt: 0 },
      status: { not: 'CANCELLED' }
    },
    include: {
      supplier: true,
      branch: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const branches = await prisma.branch.findMany({
    where: { isActive: true }
  });

  // Fix Next.js Date Serialization
  const safePurchases = JSON.parse(JSON.stringify(pendingPurchases));
  const safeBranches = JSON.parse(JSON.stringify(branches));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <CuentasPorPagarReportClient initialPurchases={safePurchases} branches={safeBranches} />
    </div>
  );
}
