import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { ShoppingCart, Plus } from 'lucide-react';
import Link from 'next/link';
import ComprasClient from './ComprasClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams?: Promise<{
    search?: string;
  }>;
}

export default async function ComprasPage({ searchParams }: PageProps) {
  const branch = await getActiveBranch();
  const resolvedParams = searchParams ? await searchParams : {};
  const search = resolvedParams.search || '';
  const whereClause: any = branch.id === 'GLOBAL' ? {} : { branchId: branch.id };
  if (search) {
    whereClause.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { supplierFolio: { contains: search, mode: 'insensitive' } },
      { supplier: { name: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const purchases = await prisma.purchase.findMany({
    where: whereClause,
    include: {
      supplier: true,
      user: true,
      branch: true,
      items: {
        select: { id: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 150
   });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingCart size={28} color="var(--caanma-primary)" />
            Compras
          </h1>
          <p style={{ color: 'var(--caanma-text-muted)', marginTop: '0.25rem' }}>
            Historial de compras directas ingresadas al inventario.
          </p>
        </div>
        <Link href="/productos/compras/nuevo" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--caanma-primary)', borderColor: 'var(--caanma-primary)', color: 'white', textDecoration: 'none' }}>
          <Plus size={18} /> Nueva Compra Directa
        </Link>
      </div>

      <ComprasClient initialPurchases={purchases} initialSearch={search} />
    </div>
  );
}
