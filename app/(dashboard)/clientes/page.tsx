import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import * as Icons from 'lucide-react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import ClientesTable from './ClientesTable';

export default async function Page() {
  const data = await prisma.customer.findMany({
    orderBy: { name: 'asc' }
  });
  const SpecificIcon = (Icons as any)['Users'] || Icons.Box;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-header-title" style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <SpecificIcon size={28} color="#0ea5e9" />
            Directorio de Clientes B2B
          </h1>
        </div>
        <div className="page-header-actions">
          <Link href="/clientes/nuevo" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0ea5e9', borderColor: '#0ea5e9', textDecoration: 'none' }}>
            <Plus size={18} /> Nuevo Registro
          </Link>
        </div>
      </div>

      <ClientesTable initialCustomers={data} />
    </div>
  );
}
