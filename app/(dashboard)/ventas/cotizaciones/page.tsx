import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import CotizacionesTable from "./CotizacionesTable";

export default async function CotizacionesPage() {
  const branch = await getActiveBranch();
  const quotes = await prisma.quote.findMany({
    where: { branchId: branch.id },
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      customer: true,
      items: { include: { product: true } }
    }
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Cotizaciones a Clientes</h1>
        <Link href="/ventas/cotizaciones/nueva" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.5rem 1.5rem' }}>
          <Plus size={18} /> Nueva Cotización
        </Link>
      </div>

      <CotizacionesTable initialQuotes={quotes} />
    </div>
  );
}


