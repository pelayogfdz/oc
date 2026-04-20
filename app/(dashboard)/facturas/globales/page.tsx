import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { FileText, PlusCircle } from 'lucide-react';
import { revalidatePath } from "next/cache";

import { stampGlobalInvoice } from "@/app/actions/facturacion";

export default async function FacturasGlobalesPage() {
  const branch = await getActiveBranch();
  
  // Calculate total unpaid (un-invoiced) sales from today
  const today = new Date();
  today.setHours(0,0,0,0);

  const salesToday = await prisma.sale.findMany({ 
    where: { 
      branchId: branch.id, 
      status: "COMPLETED",
      createdAt: { gte: today }
    }
  });

  const totalGlobal = salesToday.reduce((acc, current) => acc + current.total, 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={28} color="var(--pulpos-primary)" />
            Facturacion Global
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>Emite la factura al público en general con todas las ventas del día, semana o mes.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--pulpos-bg)', borderColor: 'var(--pulpos-border)' }}>
           <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--pulpos-foreground)', marginBottom: '1rem' }}>Total Ventas al Público Hoy</h2>
           <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--pulpos-primary)', marginBottom: '1.5rem' }}>
             ${totalGlobal.toFixed(2)}
           </div>
           <form action={async (formData: FormData) => { 'use server'; await stampGlobalInvoice(formData); }}>
             <button type="submit" className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--pulpos-primary)', fontSize: '1.1rem' }}>
                <PlusCircle size={20} /> Generar Global del Día
             </button>
           </form>
           <p style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)', marginTop: '1rem' }}>
             Solo incluye ventas que no han sido facturadas a RFC individuales.
           </p>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Periodo / UUID</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Tickets</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Subtotal</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Total con IVA</th>
              </tr>
            </thead>
            <tbody>
                <tr>
                  <td colSpan={4} style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                    <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    No hay facturas globales emitidas históricamente.
                  </td>
                </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
