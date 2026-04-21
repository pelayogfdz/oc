import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintClient from "../../imprimir/PrintClient";

export default async function ImprimirCotizacionPage({ params }: { params: { id: string } }) {
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      user: true,
      branch: true,
      items: {
        include: { product: true }
      }
    }
  });

  if (!quote) return notFound();

  // Convert Quote data structure to match Sale structure so we can reuse the PrintClient UI
  const adaptedSale = {
    id: quote.id,
    folio: `COT-${quote.id.slice(0, 6).toUpperCase()}`,
    createdAt: quote.createdAt,
    customer: quote.customer,
    user: quote.user,
    branch: quote.branch,
    paymentMethod: quote.paymentMethod || 'N/A',
    status: quote.status,
    total: quote.total,
    items: quote.items.map(item => ({
      productName: item.product.name,
      sku: item.product.sku,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity,
      discount: 0
    }))
  };

  return (
    <div style={{ backgroundColor: '#e2e8f0', minHeight: '100vh', padding: '2rem 0' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'flex-end', paddingBottom: '1rem' }}>
        <a href="/ventas/cotizaciones" style={{ textDecoration: 'none', color: '#64748b', fontWeight: 'bold' }}>← Volver a Cotizaciones</a>
      </div>
      <PrintClient sale={adaptedSale as any} title="COTIZACIÓN COMERCIAL" />
    </div>
  );
}
