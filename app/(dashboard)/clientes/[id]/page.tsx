import { prisma } from "@/lib/prisma";
import Link from 'next/link';
import ClientProfile from "./ClientProfile";
import BackButton from "@/app/components/ui/BackButton";

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id }
  });

  if (!customer) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Cliente no encontrado</h2>
        <BackButton fallbackHref="/clientes" label="Volver al Directorio" style={{ marginTop: '1rem', display: 'inline-flex', padding: '0.5rem 1rem', backgroundColor: 'var(--caanma-primary)', color: 'white', borderRadius: '6px', textDecoration: 'none' }} />
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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 0.75rem 2rem 0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem' }}>
        <BackButton fallbackHref="/clientes" label="Volver al Directorio" style={{ fontSize: '1rem', fontWeight: '500' }} />
      </div>


      <ClientProfile customer={customer} sales={sales} payments={payments} />
    </div>
  );
}
