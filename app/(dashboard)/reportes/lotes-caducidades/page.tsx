import { getActiveBranch, getActiveUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { CalendarClock } from "lucide-react";
import ReporteCaducidadesClient from "./ReporteCaducidadesClient";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function ReporteLotesCaducidadesPage() {
  const branch = await getActiveBranch();
  const user = await getActiveUser();

  if (!user || !branch) {
    redirect('/login');
  }

  const tenantId = user.tenantId || branch.tenantId;

  // Obtener sucursales del tenant
  const tenantBranches = await prisma.branch.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true }
  });

  // Consultar todos los lotes del tenant o de la sucursal activa
  const branchFilter = branch.id === 'GLOBAL' 
    ? { product: { branch: { tenantId } } }
    : { product: { branchId: branch.id } };

  const batches = await prisma.productBatch.findMany({
    where: {
      ...branchFilter,
      expirationDate: { not: null }
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          imageUrl: true,
          cost: true,
          price: true,
          unit: true,
          category: true,
          brand: true,
          branchId: true,
          branch: {
            select: { id: true, name: true }
          },
          supplier: {
            select: { id: true, name: true }
          }
        }
      }
    },
    orderBy: { expirationDate: 'asc' }
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            <CalendarClock size={28} color="var(--caanma-primary)" />
            Reporte de Lotes y Caducidades
          </h1>
          <p style={{ color: 'var(--caanma-text-muted)', marginTop: '0.35rem', fontSize: '0.9rem' }}>
            Auditoría de artículos perecederos, lotes vencidos, alertas de prevención y control de caducidades futuras.
          </p>
        </div>
      </div>

      <ReporteCaducidadesClient 
        initialBatches={batches} 
        branches={tenantBranches} 
        activeBranchId={branch.id} 
      />
    </div>
  );
}
