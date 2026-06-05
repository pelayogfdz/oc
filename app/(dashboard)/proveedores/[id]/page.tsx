import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import Link from 'next/link';
import EditarProveedorForm from "./EditarProveedorForm";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarProveedorPage({ params }: PageProps) {
  const { id } = await params;
  const branch = await getActiveBranch();
  if (!branch) return null;

  const supplier = await prisma.supplier.findUnique({
    where: { id }
  });

  if (!supplier) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#ef4444', fontWeight: 'bold' }}>Proveedor no encontrado</h2>
        <Link href="/proveedores" style={{ color: '#3b82f6', textDecoration: 'underline', marginTop: '1rem', display: 'inline-block' }}>
          Volver a la lista de proveedores
        </Link>
      </div>
    );
  }

  // Branch check
  if (branch.id !== 'GLOBAL' && supplier.branchId !== branch.id) {
    return (
      <div style={{ padding: '2rem', color: '#ef4444', fontWeight: 'bold', textAlign: 'center' }}>
        Acceso denegado: este proveedor no pertenece a tu sucursal.
      </div>
    );
  }

  // Parse safety
  const safeSupplier = JSON.parse(JSON.stringify(supplier));

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Link href="/proveedores" style={{ textDecoration: 'none', color: 'var(--pulpos-text-muted)', fontSize: '1.25rem' }}>← Volver a Proveedores</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Editar Proveedor: {safeSupplier.name}</h1>
      </div>

      <EditarProveedorForm supplier={safeSupplier} />
    </div>
  );
}
