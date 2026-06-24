import { prisma } from "@/lib/prisma";
import CobranzaGlobalClient from "./CobranzaGlobalClient";
export default async function CobranzaGlobalPage() {
  const pendingSales = await prisma.sale.findMany({
    where: { 
      paymentMethod: 'CREDIT',
      balanceDue: { gt: 0 }
    },
    include: {
      customer: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fix Next.js Date Serialization
  const safeData = JSON.parse(JSON.stringify(pendingSales));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Crédito y Cobranza (CxC)</h1>
        <p style={{ color: 'var(--caanma-text-muted)' }}>Módulo central de facturas pendientes y deudas de clientes.</p>
      </div>

      <CobranzaGlobalClient initialData={safeData} />
    </div>
  );
}
