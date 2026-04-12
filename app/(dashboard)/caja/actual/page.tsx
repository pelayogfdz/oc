import { getCurrentSession, openSession, addMovement, closeSession } from "@/app/actions/caja";
import { getActiveUser, getActiveBranch } from "@/app/actions/auth";
import { formatCurrency } from "@/lib/utils";
import { Banknote, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, AlertTriangle, ShieldCheck, EyeOff } from 'lucide-react';

export default async function CajaActualPage() {
  const branch = await getActiveBranch();
  if (!branch) { return <div>No hay sucursal activa</div>; }
  const user = await getActiveUser(branch.id);
  const session = await getCurrentSession();

  const isAdminOrManager = user.role === 'ADMIN' || user.role === 'MANAGER';

  if (!session) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: '#e0f2fe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#0284c7' }}>
            <Banknote size={32} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Apertura de Turno (Caja)</h1>
          <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '2rem' }}>
            Para poder comenzar a registrar ventas, necesitas declarar el fondo inicial que hay físicamente en caja.
          </p>

          <form action={openSession} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Fondo Inicial en Efectivo ($)</label>
              <input 
                type="number" 
                step="0.01" 
                name="initialAmount" 
                required 
                defaultValue="0.00"
                style={{ width: '100%', padding: '1rem', fontSize: '1.25rem', borderRadius: '6px', border: '2px solid var(--pulpos-border)' }} 
              />
            </div>
            <button className="btn-primary" type="submit" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} /> Abrir Caja Ahora
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Calculate current session stats
  const cashSales = session.sales.filter((s: any) => s.paymentMethod === 'CASH');
  const totalSalesCash = cashSales.reduce((acc: number, sale: any) => acc + sale.total, 0);
  const totalIn = session.movements.filter((m: any) => m.type === 'IN').reduce((acc: number, m: any) => acc + m.amount, 0);
  const totalOut = session.movements.filter((m: any) => m.type === 'OUT').reduce((acc: number, m: any) => acc + m.amount, 0);
  
  const expectedAmount = session.initialAmount + totalSalesCash + totalIn - totalOut;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Banknote size={28} color="var(--pulpos-primary)" />
            Caja Actual
            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '12px', verticalAlign: 'middle', fontWeight: 'bold' }}>ABIERTA</span>
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>
            Turno iniciado el {session.openedAt.toLocaleString()}
          </p>
        </div>
        
        {/* Modal-like logic via details/summary or a separate page. For simplicity, we use a basic form embedded */}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem' }}>
        {/* Left Col: Resumen y Cierre */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--pulpos-primary)', color: 'white' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.5rem' }}>Efectivo Calculado en Caja</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {isAdminOrManager ? formatCurrency(expectedAmount) : (
                <span style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <EyeOff size={24} /> Oculto (Corte Ciego)
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.8 }}>Fondo Inicial:</span>
                <span>{formatCurrency(session.initialAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.8 }}>Ventas (Efectivo):</span>
                <span>+ {formatCurrency(totalSalesCash)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.8 }}>Entradas Extra:</span>
                <span>+ {formatCurrency(totalIn)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.8 }}>Salidas/Retiros:</span>
                <span>- {formatCurrency(totalOut)}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', border: '2px dashed #fca5a5' }}>
            <h3 style={{ fontWeight: 'bold', color: '#ef4444', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} /> Cerrar Turno (Corte Z)
            </h3>
            <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Deberás realizar un conteo físico ciego de las denominaciones en caja o declarar el total.
            </p>
            <a href="/caja/cortes/nuevo" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', width: '100%', padding: '0.75rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
               Iniciar Corte Ciego
            </a>
          </div>
        </div>

        {/* Right Col: Movimientos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Botones de Movimiento Rápido */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}>
                <ArrowDownToLine size={20} /> Ingresar Dinero
              </h3>
              <form action={addMovement} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input type="hidden" name="sessionId" value={session.id} />
                <input type="hidden" name="type" value="IN" />
                <input type="number" step="0.01" name="amount" placeholder="Monto ($)" required style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
                <input type="text" name="reason" placeholder="Motivo (Ej. Cambio)" required style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
                <button type="submit" style={{ padding: '0.5rem', backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #34d399', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Registrar Entrada</button>
              </form>
            </div>
            
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
                <ArrowUpFromLine size={20} /> Retirar Dinero
              </h3>
              <form action={addMovement} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input type="hidden" name="sessionId" value={session.id} />
                <input type="hidden" name="type" value="OUT" />
                <input type="number" step="0.01" name="amount" placeholder="Monto ($)" required style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
                <input type="text" name="reason" placeholder="Motivo (Ej. Pago proveedor)" required style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
                <button type="submit" style={{ padding: '0.5rem', backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #f87171', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Registrar Salida</button>
              </form>
            </div>
          </div>

          {/* Historial de Movimientos de la sesion actual */}
          <div className="card" style={{ padding: '1.5rem', flex: 1 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Desglose de Movimientos</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--pulpos-border)', color: 'var(--pulpos-text-muted)' }}>
                    <th style={{ padding: '0.75rem 0' }}>Hora</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {cashSales.map((sale: any) => (
                    <tr key={`sale_${sale.id}`} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                      <td style={{ padding: '0.75rem 0', color: 'var(--pulpos-text-muted)', fontSize: '0.875rem' }}>{sale.createdAt.toLocaleTimeString()}</td>
                      <td><span style={{ padding: '0.2rem 0.5rem', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>VENTA (Ticket)</span></td>
                      <td>Venta EFECTIVO (ID: {sale.id.slice(-6).toUpperCase()})</td>
                      <td style={{ textAlign: 'right', fontWeight: '500', color: '#16a34a' }}>+ {formatCurrency(sale.total)}</td>
                    </tr>
                  ))}
                  {session.movements.map((m: any) => (
                    <tr key={`mov_${m.id}`} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                      <td style={{ padding: '0.75rem 0', color: 'var(--pulpos-text-muted)', fontSize: '0.875rem' }}>{m.createdAt.toLocaleTimeString()}</td>
                      <td>
                        <span style={{ padding: '0.2rem 0.5rem', backgroundColor: m.type === 'IN' ? '#dcfce7' : '#fee2e2', color: m.type === 'IN' ? '#166534' : '#991b1b', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {m.type === 'IN' ? 'ENTRADA' : 'SALIDA'}
                        </span>
                      </td>
                      <td>{m.reason}</td>
                      <td style={{ textAlign: 'right', fontWeight: '500', color: m.type === 'IN' ? '#16a34a' : '#dc2626' }}>
                        {m.type === 'IN' ? '+' : '-'} {formatCurrency(m.amount)}
                      </td>
                    </tr>
                  ))}
                  {cashSales.length === 0 && session.movements.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--pulpos-text-muted)' }}>
                        No hay movimientos registrados en este turno.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
