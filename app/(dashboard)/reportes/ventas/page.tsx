import { getActiveBranch } from "@/app/actions/auth";
import { getBranchFilter } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { BarChart3, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import SalesReportClient from './SalesReportClient';

export default async function Page() {
  const branch = await getActiveBranch();
  
  // We fetch ALL sales for this branch to let the Client group and filter them dynamically.
  const sales = await prisma.sale.findMany({ 
    where: { 
      ...getBranchFilter(branch), 
      status: { in: ["COMPLETED", "RETURNED"] } 
    }, 
    include: { 
      branch: true,
      items: { 
        include: { 
          product: true 
        } 
      },
      user: true 
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <Link href="/reportes" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pulpos-primary)', textDecoration: 'none', marginBottom: '1.5rem', fontWeight: 'bold' }}>
        <ArrowLeft size={18} /> Volver al Hub
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <BarChart3 size={32} color="var(--pulpos-primary)" />
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Sales Analytics</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Módulo avanzado de reportes y cruce de datos</p>
        </div>
      </div>

      {/* Dynamic Group-By Engine */}
      <SalesReportClient sales={sales} />
    </div>
  );
}
