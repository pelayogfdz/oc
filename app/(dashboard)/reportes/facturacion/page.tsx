import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';
import FacturacionReportClient from './FacturacionReportClient';
import { redirect } from 'next/navigation';
import { getAvailableFilters } from '@/app/actions/reportes';

export default async function FacturacionReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  if (!session?.userId) redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { id: session.userId as string },
    select: { tenantId: true }
  });

  if (!user?.tenantId) redirect('/');

  const resolvedSearchParams = await searchParams;
  const startDate = resolvedSearchParams.startDate as string || new Date(new Date().setHours(0,0,0,0)).toISOString();
  const endDate = resolvedSearchParams.endDate as string || new Date(new Date().setHours(23,59,59,999)).toISOString();

  const branches = await prisma.branch.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true }
  });
  const branchIds = branches.map(b => b.id);

  const sales = await prisma.sale.findMany({
    where: {
      branchId: { in: branchIds },
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    },
    include: {
      user: true,
      customer: true,
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch users for filtering
  const users = await prisma.user.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true, name: true, email: true }
  });

  // Fetch available filters (including brands)
  const filters = await getAvailableFilters();

  const safeSales = JSON.parse(JSON.stringify(sales));
  const safeUsers = JSON.parse(JSON.stringify(users));
  const safeBrands = JSON.parse(JSON.stringify(filters.brands || []));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--caanma-text)' }}>
        Reporte de Facturación (CFDI 4.0)
      </h1>
      <FacturacionReportClient 
        initialSales={safeSales} 
        users={safeUsers}
        brands={safeBrands}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
