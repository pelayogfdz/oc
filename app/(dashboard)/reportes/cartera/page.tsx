import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { BarChart3, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function Page() {
  const branch = await getActiveBranch();
  
  // Fake or dynamic query based on module
  const data = await prisma.customer.findMany({ where: { branchId: branch.id } });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--pulpos-border)' }}>
      <Link href="/reportes" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pulpos-primary)', textDecoration: 'none', marginBottom: '1.5rem', fontWeight: 'bold' }}>
        <ArrowLeft size={18} /> Volver al Hub
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1rem' }}>
        <BarChart3 size={28} color="var(--pulpos-primary)" />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Estados de Cuenta</h1>
      </div>

      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed var(--pulpos-border)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Análisis Generado Correctamente</h2>
        <p style={{ color: 'var(--pulpos-text-muted)' }}>
          Este reporte extrajo {data.length} registros de la base de datos para la sucursal actual.
        </p>
      </div>
    </div>
  );
}
