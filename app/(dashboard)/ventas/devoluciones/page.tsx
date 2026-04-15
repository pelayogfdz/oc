import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getActiveBranch } from "@/app/actions/auth";
import { getBranchFilter } from "@/lib/utils";
import ReturnsClient from "./ReturnsClient";

export const dynamic = 'force-dynamic';

export default async function DevolucionesPage() {
  const branch = await getActiveBranch();
  
  if (!branch) return <div>No branch active.</div>;

  // Fetch sales that can be returned (completed logic might be needed, for now all)
  const sales = await prisma.sale.findMany({
    where: getBranchFilter(branch),
    include: {
      user: true,
      branch: true,
      customer: true,
      items: {
        include: {
          product: true,
          returns: true // fetch already returned components to prevent double return
        }
      }
    },
    take: 100, // Limit to recent 100 for perf, using search helps
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Devoluciones y Notas de Crédito</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Busca una venta para procesar una devolución o agregar saldo a favor.</p>
        </div>
      </div>

      <ReturnsClient initialSales={sales} />
    </div>
  );
}
