'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface ReportData {
  id: string;
  name: string;
  role: string;
  monthlyGoal: number;
  commissionPct: number;
  bonusAmount: number;
  teamBonusAmount: number;
  managerId: string | null;
  personalSales: number;
  teamSales: number;
  totalSalesBase: number;
  commissionsEarned: number;
  bonusEarned: number;
  teamBonusEarned: number;
  totalEarned: number;
  unlockedBonus: boolean;
}

export default function CommissionReportClient({ reportData, currentMonth, currentYear }: { reportData: ReportData[], currentMonth: number, currentYear: number }) {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [searchTerm, setSearchTerm] = useState('');

  const runReport = () => {
    router.push(`/reportes/comisiones?m=${selectedMonth}&y=${selectedYear}`);
  };

  const formatCurrency = (val: number) => '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatPct = (val: number) => val.toFixed(2) + '%';

  // Build hierarchy tree
  const coordinators = reportData.filter(u => u.role === 'COORDINADOR');
  const leaders = reportData.filter(u => u.role === 'LIDER');
  const vendors = reportData.filter(u => u.role === 'VENDEDOR');

  // Helper for progress bar
  const renderProgress = (current: number, goal: number) => {
    if (goal <= 0) return null;
    const rawPct = (current / goal) * 100;
    const isMet = rawPct >= 100;
    const progressPct = Math.min(rawPct, 100);
    const color = isMet ? '#10b981' : '#f59e0b';
    return (
      <div style={{ marginTop: '0.5rem', width: '100%', maxWidth: '250px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
          <span>{rawPct.toFixed(1)}% ({formatCurrency(current)})</span>
          <span>Meta: {formatCurrency(goal)}</span>
        </div>
        <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${progressPct}%`, height: '100%', backgroundColor: color, transition: 'width 0.3s' }}></div>
        </div>
      </div>
    );
  };

  const filterUsers = (usersList: ReportData[]) => {
     if (!searchTerm) return usersList;
     return usersList.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--pulpos-border)]">
      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--pulpos-border)', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Mes</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
              <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('es-MX', { month: 'long' }).toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Año</label>
          <input type="number" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', width: '100px' }} />
        </div>
        <button onClick={runReport} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Generar Reporte</button>

        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Buscar asesor..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            style={{ padding: '0.5rem 0.5rem 0.5rem 2.2rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} 
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        
        {/* Coordinadores Section */}
        {filterUsers(coordinators).length > 0 && (
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#6366f1', marginBottom: '1rem', borderBottom: '2px solid #e0e7ff', paddingBottom: '0.25rem' }}>Organización de Coordinadores</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {filterUsers(coordinators).map(coord => (
                <div key={coord.id} style={{ border: '1px solid #c7d2fe', borderRadius: '8px', padding: '1rem', backgroundColor: '#f5f7ff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{coord.name}</h3>
                      <div style={{ fontSize: '0.9rem', color: '#4f46e5', fontWeight: 'bold' }}>Coordinador</div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                        % Comisión Override: <b>{formatPct(coord.commissionPct)}</b>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Venta Total Organización</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{formatCurrency(coord.totalSalesBase)}</div>
                      {renderProgress(coord.totalSalesBase, coord.monthlyGoal)}
                    </div>
                    <div style={{ textAlign: 'right', paddingLeft: '1rem', borderLeft: '1px solid #cbd5e1' }}>
                       <div style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 'bold' }}>Total Ganancias</div>
                       <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a' }}>{formatCurrency(coord.totalEarned)}</div>
                       <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Comisiones: {formatCurrency(coord.commissionsEarned)} {coord.unlockedBonus ? ` + Bono ${formatCurrency(coord.bonusAmount)}` : ''}
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Líderes Section */}
        {filterUsers(leaders).length > 0 && (
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981', marginBottom: '1rem', borderBottom: '2px solid #d1fae5', paddingBottom: '0.25rem' }}>Equipos (Líderes)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {filterUsers(leaders).map(leader => (
                <div key={leader.id} style={{ border: '1px solid #a7f3d0', borderRadius: '8px', padding: '1.5rem', backgroundColor: '#f0fdf4' }}>
                  {/* Leader Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{leader.name}</h3>
                      <div style={{ fontSize: '0.9rem', color: '#059669', fontWeight: 'bold' }}>Líder de Equipo</div>
                      {leader.managerId && (
                         <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Reporta a: {reportData.find(u => u.id === leader.managerId)?.name}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Vendido (Eq. + Personal)</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{formatCurrency(leader.totalSalesBase)}</div>
                      {renderProgress(leader.totalSalesBase, leader.monthlyGoal)}
                    </div>
                    <div style={{ textAlign: 'right', paddingLeft: '1rem', borderLeft: '1px solid #cbd5e1' }}>
                       <div style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 'bold' }}>Total Ganado (Líder)</div>
                       <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a' }}>{formatCurrency(leader.totalEarned)}</div>
                    </div>
                  </div>

                  {/* Subordinates Table */}
                  <div style={{ backgroundColor: 'white', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--pulpos-border)' }}>
                     <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                       <thead>
                         <tr style={{ backgroundColor: '#f8fafc', fontSize: '0.85rem', color: '#64748b' }}>
                           <th style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Vendedor Asignado</th>
                           <th style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Venta Personal</th>
                           <th style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Comisión Directa</th>
                           <th style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>Bono Equipo (Desbloqueado)</th>
                           <th style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Ingreso Estimado</th>
                         </tr>
                       </thead>
                       <tbody>
                         {vendors.filter(v => v.managerId === leader.id).map(vendor => (
                           <tr key={vendor.id} style={{ fontSize: '0.9rem' }}>
                             <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)', fontWeight: 'bold' }}>{vendor.name}</td>
                             <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>{formatCurrency(vendor.personalSales)}</td>
                             <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right', color: '#0ea5e9' }}>
                               {formatCurrency(vendor.commissionsEarned)} <span style={{fontSize: '0.75rem', color: '#94a3b8'}}>({formatPct(vendor.commissionPct)})</span>
                             </td>
                             <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>
                               {leader.unlockedBonus ? (
                                  <span style={{ backgroundColor: '#ccfbf1', color: '#0f766e', padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                    + {formatCurrency(vendor.teamBonusEarned)}
                                  </span>
                               ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>$0.00</span>
                               )}
                             </td>
                             <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                               {formatCurrency(vendor.totalEarned)}
                             </td>
                           </tr>
                         ))}
                         {vendors.filter(v => v.managerId === leader.id).length === 0 && (
                            <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>No hay vendedores asignados a este equipo.</td></tr>
                         )}
                       </tbody>
                     </table>
                  </div>

                </div>
              ))}
            </div>
          </section>
        )}

        {/* Vendedores Independientes */}
        {filterUsers(vendors.filter(v => !v.managerId)).length > 0 && (
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b', marginBottom: '1rem', borderBottom: '2px solid #fef3c7', paddingBottom: '0.25rem' }}>Vendedores (Sin Equipo)</h2>
            <div style={{ backgroundColor: 'white', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--pulpos-border)' }}>
                     <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                       <thead>
                         <tr style={{ backgroundColor: '#f8fafc', fontSize: '0.85rem', color: '#64748b' }}>
                           <th style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Vendedor</th>
                           <th style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Venta Personal</th>
                           <th style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Progreso Bono Individual</th>
                           <th style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Comisión Directa</th>
                           <th style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>Ingreso Estimado</th>
                         </tr>
                       </thead>
                       <tbody>
                         {filterUsers(vendors.filter(v => !v.managerId)).map(vendor => (
                           <tr key={vendor.id} style={{ fontSize: '0.9rem' }}>
                             <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)', fontWeight: 'bold' }}>{vendor.name}</td>
                             <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right' }}>{formatCurrency(vendor.personalSales)}</td>
                             <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>
                               {renderProgress(vendor.personalSales, vendor.monthlyGoal)}
                             </td>
                             <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right', color: '#0ea5e9' }}>
                               {formatCurrency(vendor.commissionsEarned)} <span style={{fontSize: '0.75rem', color: '#94a3b8'}}>({formatPct(vendor.commissionPct)})</span>
                             </td>
                             <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                               {formatCurrency(vendor.totalEarned)}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                  </div>
          </section>
        )}

      </div>
    </div>
  );
}
