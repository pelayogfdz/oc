import { prisma } from "@/lib/prisma";
import CobranzaGlobalClient from "./CobranzaGlobalClient";

export default async function CobranzaGlobalPage() {
  const pendingSales = await prisma.sale.findMany({
    where: { 
      paymentMethod: 'CREDIT',
      balanceDue: { gt: 0 }
    },
    include: {
      customer: true,
      user: {
        select: { id: true, name: true }
      },
      branch: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const branches = await prisma.branch.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  // Fix Next.js Date Serialization
  const safeData = JSON.parse(JSON.stringify(pendingSales));
  const safeBranches = JSON.parse(JSON.stringify(branches));
  const safeUsers = JSON.parse(JSON.stringify(users));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Crédito y Cobranza (CxC)</h1>
        <p style={{ color: 'var(--caanma-text-muted)' }}>Módulo central de facturas pendientes y deudas de clientes.</p>
      </div>

      <CobranzaGlobalClient 
        initialData={safeData} 
        branches={safeBranches} 
        users={safeUsers} 
      />
    </div>
  );
}
