import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { BarChart3, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ProfitReportClient from "./ProfitReportClient";

export default async function Page() {
  const branch = await getActiveBranch();
  
  const expenses = await prisma.expense.findMany({ 
    where: { branchId: branch.id }, 
    include: { user: true } 
  });

  const sales = await prisma.sale.findMany({ 
    where: { branchId: branch.id, status: "COMPLETED" }, 
    include: { 
      items: { include: { product: true } },
    }
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto'}}>
      <Link href="/reportes" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pulpos-primary)', textDecoration: 'none', marginBottom: '1.5rem', fontWeight: 'bold' }}>
        <ArrowLeft size={18} /> Volver al Hub
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <BarChart3 size={32} color="var(--pulpos-primary)" />
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Estado de Resultados (P&L)</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Análisis global de rentabilidad: Ventas vs Costos vs Gastos Operativos</p>
        </div>
      </div>

      <ProfitReportClient sales={sales} expenses={expenses} />
    </div>
  );
}
