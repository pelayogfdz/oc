import { getActiveBranch, getSession } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import CotizacionesTable from "./CotizacionesTable";
import { calculateQuoteInstitutionalBreakdown } from "@/lib/financialCalculations";

export default async function CotizacionesPage() {
  const branch = await getActiveBranch();
  const session = await getSession();

  const baseWhere = branch.id === 'GLOBAL'
    ? { branch: { tenantId: session?.tenantId || undefined } }
    : { branchId: branch.id };

  const quotes = await prisma.quote.findMany({
    where: baseWhere,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      folio: true,
      total: true,
      status: true,
      paymentMethod: true,
      customerId: true,
      branchId: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
      observations: true,
      observationImageUrl: true,
      customer: {
        select: { id: true, name: true }
      },
      user: {
        select: { id: true, name: true }
      },
      items: {
        select: {
          id: true,
          quantity: true,
          price: true,
          productId: true,
          variantId: true,
          product: {
            select: {
              id: true,
              name: true,
              cost: true,
              averageCost: true,
              taxRate: true,
              taxType: true
            }
          }
        }
      }
    }
  });

  // Sanitizar y asegurar cuadratura matemática institucional para todas las cotizaciones
  const sanitizedQuotes = quotes.map(quote => {
    if (quote.items && quote.items.length > 0) {
      const breakdown = calculateQuoteInstitutionalBreakdown(quote.items.map((it: any) => ({
        price: it.price,
        quantity: it.quantity,
        taxRate: it.product?.taxRate,
        taxType: it.product?.taxType
      })));

      // Si la diferencia histórica es por centavos (menor a $10 pesos), usar y sincronizar el total exacto institucional
      if (Math.abs(quote.total - breakdown.total) > 0.009 && Math.abs(quote.total - breakdown.total) < 10) {
        prisma.quote.update({
          where: { id: quote.id },
          data: { total: breakdown.total }
        }).catch(() => {});

        return {
          ...quote,
          total: breakdown.total
        };
      }
    }
    return quote;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Cotizaciones a Clientes</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link 
            href="/ventas/cotizaciones/nueva?openAssistant=true" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              textDecoration: 'none', 
              padding: '0.5rem 1.25rem',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.875rem',
              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)'
            }}
          >
            <Sparkles size={18} /> Asistente IA
          </Link>
          <Link href="/ventas/cotizaciones/nueva" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.5rem 1.5rem' }}>
            <Plus size={18} /> Nueva Cotización
          </Link>
        </div>
      </div>

      <CotizacionesTable initialQuotes={sanitizedQuotes} />
    </div>
  );
}


