import { prisma } from "@/lib/prisma";
import Link from 'next/link';
import ClientProfile from "./ClientProfile";

export const dynamic = 'force-dynamic';

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id }
  });

  if (!customer) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Cliente no encontrado</h2>
        <Link href="/clientes" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-block', textDecoration: 'none' }}>Volver al Directorio</Link>
      </div>
    );
  }

  // Get all sales for this customer
  const sales = await prisma.sale.findMany({
    where: { customerId: id },
    orderBy: { createdAt: 'desc' }
  });

  // Get all payments made by this customer
  const payments = await prisma.customerPayment.findMany({
    where: { customerId: id },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Link href="/clientes" style={{ textDecoration: 'none', color: 'var(--pulpos-text-muted)', fontSize: '1.25rem' }}>← Volver al Directorio</Link>
      </div>

      <ClientProfile customer={customer} sales={sales} payments={payments} />
    </div>
  );
}
