import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, PackageCheck } from "lucide-react";
import ConvertButton from "./ConvertButton";

export default async function ConsignacionesPage() {
  const branch = await getActiveBranch();
  
  if (!branch || branch.id === 'GLOBAL') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #f87171', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>SUCURSAL NO VÁLIDA</h2>
        <p>No se pueden ver las consignaciones en modo "Vista Global".<br/>Por favor, selecciona una sucursal específica en el selector superior.</p>
      </div>
    );
  }

  const consignments = await prisma.consignment.findMany({
    where: { branchId: branch.id },
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      customer: true,
      items: { include: { product: true } }
    }
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <PackageCheck size={28} color="#6366f1" /> Ventas a Consignación
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>Administra la mercancía entregada a clientes en consignación. El stock ya fue deducido.</p>
        </div>
        <Link href="/ventas/consignaciones/nueva" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.6rem 1.5rem', backgroundColor: '#6366f1', borderColor: '#4f46e5' }}>
          <Plus size={18} /> Nueva Consignación
        </Link>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--pulpos-border)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: '#f8fafc' }}>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>ID Consignación</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>Fecha</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>Cliente</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>Entregado por</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>Productos</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>Total Consignado</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>Estado</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', fontSize: '0.85rem', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {consignments.map(consignment => (
              <tr key={consignment.id} style={{ borderBottom: '1px solid var(--pulpos-border)', transition: 'background-color 0.15s' }}>
                <td data-label="ID Consignación" style={{ padding: '1.25rem 1rem', fontWeight: 'bold', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                  #{consignment.folio || consignment.id.slice(0, 8).toUpperCase()}
                </td>
                <td data-label="Fecha" style={{ padding: '1.25rem 1rem', color: 'var(--pulpos-text-muted)', fontSize: '0.9rem' }}>
                  {new Date(consignment.createdAt).toLocaleString('es-MX')}
                </td>
                <td data-label="Cliente" style={{ padding: '1.25rem 1rem', fontSize: '0.9rem', fontWeight: '500' }}>
                  {consignment.customer?.name || 'Público en General'}
                </td>
                <td data-label="Entregado por" style={{ padding: '1.25rem 1rem', fontSize: '0.9rem' }}>
                  {consignment.user.name}
                </td>
                <td data-label="Productos" style={{ padding: '1.25rem 1rem', fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {consignment.items.map((item, idx) => (
                      <span key={idx}>
                        • {item.product.name} ({item.quantity} pzas)
                      </span>
                    ))}
                  </div>
                </td>
                <td data-label="Total" style={{ padding: '1.25rem 1rem', fontWeight: 'bold', color: '#4f46e5', fontSize: '0.95rem' }}>
                  ${consignment.total.toFixed(2)}
                </td>
                <td data-label="Estado" style={{ padding: '1.25rem 1rem' }}>
                  {consignment.status === 'ACTIVE' ? (
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.3rem 0.6rem', backgroundColor: '#e0e7ff', color: '#3730a3', borderRadius: '12px', display: 'inline-block' }}>
                      CONSIGNADO
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.3rem 0.6rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '12px', display: 'inline-block' }}>
                      FACTURADO
                    </span>
                  )}
                </td>
                <td data-label="Acciones" style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                  {consignment.status === 'ACTIVE' ? (
                    <ConvertButton consignmentId={consignment.id} />
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontStyle: 'italic' }}>
                      Venta Cerrada
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {consignments.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '5rem 2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  <div style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '500' }}>No hay consignaciones registradas.</div>
                  Crea una nueva consignación utilizando el botón de arriba para registrar entregas de productos a tus clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
