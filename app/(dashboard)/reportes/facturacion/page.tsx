import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';
import FacturacionReportClient from './FacturacionReportClient';
import { redirect } from 'next/navigation';

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

  // Fetch sales that have a billing record or where documentType is FACTURA
  // Given we stored this in notes previously or similar, let's fetch sales within date range
  // We can fetch all sales for the tenant and then the client can filter or we can filter in DB.
  // Since we don't have a strict 'isFacturado' column yet, we rely on the notes or metadata if we added it,
  // or we just fetch all sales and filter client-side for flexibility, but let's fetch sales for the tenant in the date range.

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
      customer: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch users for filtering
  const users = await prisma.user.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true, name: true, email: true }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--pulpos-text)' }}>
        Reporte de Facturación (CFDI 4.0)
      </h1>
      <FacturacionReportClient 
        initialSales={sales} 
        users={users}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
