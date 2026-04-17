import { getCommissionReport } from "@/app/actions/commissions";
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import CommissionReportClient from './CommissionReportClient';

export default async function Page({ searchParams }: { searchParams: { m?: string, y?: string } }) {
  const currentDate = new Date();
  const month = searchParams.m ? parseInt(searchParams.m) : currentDate.getMonth() + 1;
  const year = searchParams.y ? parseInt(searchParams.y) : currentDate.getFullYear();

  const reportData = await getCommissionReport(month, year);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      <Link href="/reportes" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pulpos-primary)', textDecoration: 'none', marginBottom: '1.5rem', fontWeight: 'bold' }}>
        <ArrowLeft size={18} /> Volver a Reportes
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <Users size={32} color="var(--pulpos-primary)" />
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Monitor de Comisiones y Desempeño</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Módulo de visualización jerárquica para bonos</p>
        </div>
      </div>

      <CommissionReportClient reportData={reportData} currentMonth={month} currentYear={year} />
    </div>
  );
}
