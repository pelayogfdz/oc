import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ArrowLeft, Edit } from "lucide-react";
import Link from "next/link";
import EditarCompraForm from "./EditarCompraForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarCompraPage({ params }: PageProps) {
  const { id } = await params;
  const branch = await getActiveBranch();

  if (!id) return notFound();

  const purchase = await prisma.purchase.findUnique({
    where: { id: id },
    include: {
      items: {
        include: {
          product: true,
          fuelTraceability: true,
          batch: true,
        },
      },
    },
  });

  if (!purchase) return notFound();

  // Validate authorization
  if (branch.id !== "GLOBAL" && branch.id !== purchase.branchId) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", backgroundColor: "#fee2e2", borderRadius: "12px", color: "#991b1b", border: "1px solid #f87171", margin: "2rem auto", maxWidth: "600px" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>NO AUTORIZADO</h2>
        <p>No tienes permisos para editar esta compra en esta sucursal.</p>
      </div>
    );
  }

  // Check if cancelled
  if (purchase.status === "CANCELLED") {
    return (
      <div style={{ padding: "3rem", textAlign: "center", backgroundColor: "#fee2e2", borderRadius: "12px", color: "#991b1b", border: "1px solid #f87171", margin: "2rem auto", maxWidth: "600px" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>COMPRA CANCELADA</h2>
        <p>No se puede editar una compra que ha sido cancelada.</p>
        <Link href={`/productos/compras/${purchase.id}`} style={{ marginTop: "1rem", display: "inline-block", color: "var(--caanma-primary)", fontWeight: "bold" }}>
          Volver al detalle de la compra
        </Link>
      </div>
    );
  }

  const query = branch.id === "GLOBAL" ? {} : { branchId: branch.id };
  const products = await prisma.product.findMany({
    where: query,
    select: { id: true, name: true, stock: true, cost: true, hasTraceability: true, sku: true, imageUrl: true },
  });

  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href={`/productos/compras/${purchase.id}`} style={{ color: "var(--caanma-text-muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <ArrowLeft size={18} /> Volver al Detalle de Compra
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Edit size={28} color="var(--caanma-primary)" />
            Editar Compra #{purchase.folio || purchase.id.slice(0, 8).toUpperCase()}
          </h1>
          <p style={{ color: "var(--caanma-text-muted)", marginTop: "0.25rem" }}>
            Modifica los detalles, fletes, o artículos de esta compra. El inventario y costos se recalcularán automáticamente.
          </p>
        </div>
      </div>

      <EditarCompraForm purchase={purchase} products={products} suppliers={suppliers} branchId={branch.id} />
    </div>
  );
}
