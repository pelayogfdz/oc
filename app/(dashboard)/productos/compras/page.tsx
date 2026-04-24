import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { ShoppingCart, Plus } from 'lucide-react';
import Link from 'next/link';
import ComprasClient from './ComprasClient';

export const dynamic = 'force-dynamic';

export default async function ComprasPage() {
  const branch = await getActiveBranch();
  
  const purchases = await prisma.purchase.findMany({
    where: branch.id === 'GLOBAL' ? {} : { branchId: branch.id },
    include: {
      supplier: true,
      user: true,
      branch: true,
      items: {
        include: { product: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingCart size={28} color="var(--pulpos-primary)" />
            Órdenes de Compra
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>
            Historial de compras directas ingresadas al inventario.
          </p>
        </div>
        <Link href="/productos/compras/nuevo" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--pulpos-primary)', borderColor: 'var(--pulpos-primary)', color: 'white', textDecoration: 'none' }}>
          <Plus size={18} /> Nueva Compra Directa
        </Link>
      </div>

      <ComprasClient initialPurchases={purchases} />
    </div>
  );
}
