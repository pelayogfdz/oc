import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { HandCoins } from 'lucide-react';
import CobranzaClient from "./CobranzaClient";

export default async function CarterayCobranzaPage() {
  const branch = await getActiveBranch();
  
  const customers = await prisma.customer.findMany({ 
    where: { branchId: branch.id, creditLimit: { gt: 0 } }, 
    include: { sales: true }
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <HandCoins size={28} color="#6366f1" />
            Cartera y Cobranza
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>Visualiza qué clientes tienen línea de crédito y administra sus saldos.</p>
        </div>
      </div>

      <CobranzaClient customers={customers} />
    </div>
  );
}
