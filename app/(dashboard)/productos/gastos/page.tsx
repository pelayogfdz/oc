import { getActiveBranch, getActiveUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { PackageOpen, Plus, FileText, Trash2, ShieldAlert } from 'lucide-react';
import { revalidatePath } from "next/cache";

async function createExpense(formData: FormData) {
  'use server';
  const category = formData.get('category') as string;
  const reason = formData.get('reason') as string;
  const amount = parseFloat(formData.get('amount') as string);
  
  const branch = await getActiveBranch();
  const user = await getActiveUser(branch.id);
  
  await prisma.expense.create({
    data: {
      category,
      reason,
      amount,
      branchId: branch.id,
      userId: user.id
    }
  });

  // Automatically register a cash session out if autoCloseCash etc?
  // We can just add it as a movement if we want, but for now we just record the expense.
  revalidatePath('/productos/gastos');
  revalidatePath('/reportes');
}

export default async function GastosPage() {
  const branch = await getActiveBranch();
  const expenses = await prisma.expense.findMany({
    where: { branchId: branch.id },
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });

  const totalGastos = expenses.reduce((acc, current) => acc + current.amount, 0);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <PackageOpen size={28} color="var(--pulpos-primary)" />
            Gastos Administrativos y Operación
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>
            Registra recibos de luz, nóminas, renta y otros pagos ajenos al inventario de mercancía.
          </p>
        </div>
        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#fee2e2', borderRadius: '8px', border: '1px solid #fecaca', textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 'bold' }}>Total Mensual Acumulado</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#b91c1c' }}>{formatCurrency(totalGastos)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Formulario */}
        <div className="card" style={{ padding: '1.5rem', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Nuevo Gasto</h2>
          <form action={createExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Categoría Contable</label>
              <select name="category" required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}>
                <option value="Renta">Renta / Arrendamiento</option>
                <option value="Nómina">Nómina / Sueldos</option>
                <option value="Servicios Básicos">Servicios (Luz, Agua, Internet)</option>
                <option value="Insumos">Insumos Internos (Papelería, Limpieza)</option>
                <option value="Mantenimiento">Mantenimiento de Local/Equipo</option>
                <option value="Impuestos">Impuestos (SAT)</option>
                <option value="Otros">Otros (Varios)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Concepto o Detalle</label>
              <input type="text" name="reason" placeholder="Ej. Pago recibo CFE Enero" required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Monto ($)</label>
              <input type="number" step="0.01" name="amount" placeholder="0.00" required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
            
            <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', padding: '1rem', borderRadius: '6px', fontSize: '0.85rem', color: '#9a3412', marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
              <ShieldAlert size={16} /> Este movimiento afectará tu utilidad bruta pero NO restará dinero automático de tu caja (haz un Retiro manual en la Caja si lo pagaste de ahí).
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}>
              <Plus size={18} /> Registrar Gasto
            </button>
          </form>
        </div>

        {/* Historial */}
        <div className="card" style={{ padding: '0' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', display: 'flex', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Historial del Periodo</h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)' }}>Fecha</th>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)' }}>Categoría</th>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)' }}>Concepto</th>
                <th style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>{e.createdAt.toLocaleDateString()}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ backgroundColor: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {e.category}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '500' }}>{e.reason}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--pulpos-text-muted)' }}>Registrado por: {e.user.name}</div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>
                    -{formatCurrency(e.amount)}
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                    <FileText size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    No hay gastos en esta sucursal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
