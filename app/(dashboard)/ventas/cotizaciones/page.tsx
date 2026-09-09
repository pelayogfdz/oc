import { getActiveBranch, getSession } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import CotizacionesTable from "./CotizacionesTable";

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
              averageCost: true
            }
          }
        }
      }
    }
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

      <CotizacionesTable initialQuotes={quotes} />
    </div>
  );
}


