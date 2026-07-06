import { getActiveBranch, getSession } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { Store } from 'lucide-react';
import { redirect } from "next/navigation";

import BranchClient from './BranchClient';

export default async function SucursalesPage() {
  const session = await getSession();
  if (!session || !session.tenantId) {
    return redirect('/login');
  }

  const currentBranch = await getActiveBranch();
  const branches = await prisma.branch.findMany({
    where: { 
      isActive: true,
      tenantId: session.tenantId
    },
    include: { 
      _count: { select: { users: true, products: true } },
      settings: true,
      hrLocation: true
    }
  });

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--caanma-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Store size={24} /> Sucursales y Almacenes
          </h2>
          <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Gestiona tus puntos de venta físicos o centros de distribución/almacén.
          </p>
        </div>
      </div>

      <BranchClient branches={branches} currentBranchId={currentBranch?.id || ''} />
    </div>
  );
}
