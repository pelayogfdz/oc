import { prisma } from "@/lib/prisma";
import CuentasPorPagarReportClient from "./CuentasPorPagarReportClient";

export default async function CuentasPorPagarReportPage() {
  const [creditPurchases, allSupplierPayments, branches] = await Promise.all([
    prisma.purchase.findMany({
      where: { 
        paymentMethod: 'CREDIT',
        status: { not: 'CANCELLED' }
      },
      include: {
        supplier: true,
        branch: true
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.supplierPayment.findMany({
      include: {
        supplier: true,
        user: { select: { id: true, name: true } },
        purchase: { select: { id: true, folio: true, supplierFolio: true, total: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.branch.findMany({
      where: { isActive: true }
    })
  ]);

  // Fix Next.js Date Serialization
  const safePurchases = JSON.parse(JSON.stringify(creditPurchases));
  const safePayments = JSON.parse(JSON.stringify(allSupplierPayments));
  const safeBranches = JSON.parse(JSON.stringify(branches));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <CuentasPorPagarReportClient 
        initialPurchases={safePurchases} 
        initialPayments={safePayments}
        branches={safeBranches} 
      />
    </div>
  );
}
