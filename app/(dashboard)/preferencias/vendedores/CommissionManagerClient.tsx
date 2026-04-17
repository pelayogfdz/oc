'use client';

import { useState, useMemo } from 'react';
import { updateCommissionProfile } from '@/app/actions/commissions';
import { useRouter } from 'next/navigation';
import { User, Shield, Briefcase, Save, ChevronDown, ChevronRight, Users, LayoutDashboard, Target, Award } from 'lucide-react';

export default function CommissionManagerClient({ initialUsers }: { initialUsers: any[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [isSaving, setIsSaving] = useState(false);
  
  // Track modified users to only push necessary updates
  const [modifiedUserIds, setModifiedUserIds] = useState<Set<string>>(new Set());

  // Expanding/collapsing team lists
  const [expandedLeaders, setExpandedLeaders] = useState<string[]>(
    initialUsers.filter(u => u.commissionRole === 'LIDER').map(l => l.id) // all expanded by default
  );

  const toggleLeader = (id: string) => {
    if (expandedLeaders.includes(id)) {
      setExpandedLeaders(expandedLeaders.filter(l => l !== id));
    } else {
      setExpandedLeaders([...expandedLeaders, id]);
    }
  };

  const handleChange = (userId: string, field: string, value: string) => {
    setUsers(users.map(u => u.id === userId ? { ...u, [field]: value } : u));
    setModifiedUserIds(new Set(modifiedUserIds).add(userId));
  };

  const handleBulkSave = async () => {
    if (modifiedUserIds.size === 0) return;
    setIsSaving(true);
    
    try {
      const updates = Array.from(modifiedUserIds).map(id => {
        const u = users.find(user => user.id === id);
        if (!u) return Promise.resolve(null);
        return updateCommissionProfile(id, {
          managerId: u.managerId === 'NONE' || !u.managerId ? null : u.managerId,
          commissionRole: u.commissionRole || 'VENDEDOR',
          commissionPct: parseFloat(u.commissionPct || 0),
          monthlyGoal: parseFloat(u.monthlyGoal || 0),
          bonusAmount: parseFloat(u.bonusAmount || 0),
          teamBonusAmount: parseFloat(u.teamBonusAmount || 0)
        });
      });

      await Promise.all(updates);
      alert(`¡Información guardada exitosamente (${modifiedUserIds.size} cambios)!`);
      setModifiedUserIds(new Set());
      router.refresh();
    } catch (e: any) {
      alert('Error guardando la información: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const roles = [
    { label: 'Vendedor', value: 'VENDEDOR' },
    { label: 'Líder', value: 'LIDER' },
    { label: 'Coordinador', value: 'COORDINADOR' }
  ];

  const coordinators = useMemo(() => users.filter(u => u.commissionRole === 'COORDINADOR'), [users]);
  const leaders = useMemo(() => users.filter(u => u.commissionRole === 'LIDER'), [users]);
  const vendors = useMemo(() => users.filter(u => u.commissionRole === 'VENDEDOR'), [users]);

  // Vendedores sin líder (managerId === null o no apunta a un lider v'alido)
  const unassignedVendors = vendors.filter(v => !v.managerId || v.managerId === 'NONE' || !leaders.find(l => l.id === v.managerId));

  return (
    <div style={{ position: 'relative', paddingBottom: '80px' }}>
      
      {/* Floating Action Bar */}
      {modifiedUserIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100,
          backgroundColor: '#1e293b', padding: '1rem', borderRadius: '50px',
          display: 'flex', alignItems: 'center', gap: '1rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <span style={{ color: 'white', fontWeight: 'bold', marginLeft: '1rem' }}>
            Tienes {modifiedUserIds.size} cambio(s) sin guardar
          </span>
          <button 
            onClick={handleBulkSave}
            disabled={isSaving}
            className="btn-primary"
            style={{ borderRadius: '50px', padding: '0.75rem 2rem', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isSaving ? 0.7 : 1 }}
          >
            <Save size={18} />
            {isSaving ? 'Guardando...' : 'Aplicar Cambios'}
          </button>
        </div>
      )}

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, marginBottom: '0.5rem' }}>
          <LayoutDashboard color="var(--pulpos-primary)" /> Configuración de Fuerza de Ventas
        </h2>
        <p style={{ color: 'var(--pulpos-text-muted)', margin: 0 }}>
          Asigna roles y reestructura tus equipos. Los campos se mostrarán dinámicamente de acuerdo al cargo del empleado.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* ========================================================= */}
        {/* COORDINADORES                                               */}
        {/* ========================================================= */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Briefcase size={22} color="#6366f1" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Cuentas de Coordinador</h3>
            <span style={{ padding: '0.2rem 0.6rem', backgroundColor: '#e0e7ff', color: '#4338ca', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 'bold' }}>{coordinators.length} activo(s)</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>Los coordinadores no tienen cuota grupal fija, perciben su ingreso como un porcentaje "Override" sobre la venta generada por las líneas de sus líderes.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {coordinators.map(user => (
              <div key={user.id} style={{ border: '1px solid #c7d2fe', backgroundColor: 'white', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{user.name}</div>
                  <select value={user.commissionRole} onChange={e => handleChange(user.id, 'commissionRole', e.target.value)} style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #c7d2fe', fontSize: '0.85rem', outline: 'none', backgroundColor: '#f5f7ff', color: '#4338ca', fontWeight: 'bold' }}>
                    {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.25rem' }}>% Override / Regalias</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input type="number" min="0" step="0.01" value={user.commissionPct || 0} onChange={e => handleChange(user.id, 'commissionPct', e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px 0 0 4px', border: '1px solid var(--pulpos-border)', borderRight: 'none' }} />
                      <div style={{ padding: '0.5rem', backgroundColor: '#f8fafc', border: '1px solid var(--pulpos-border)', borderRadius: '0 4px 4px 0', color: '#94a3b8' }}>%</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {coordinators.length === 0 && (
              <div style={{ padding: '2rem', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No tienes Coordinadores configurados.
              </div>
            )}
          </div>
        </section>

        {/* ========================================================= */}
        {/* LÍDERES Y SUS EQUIPOS                                       */}
        {/* ========================================================= */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Shield size={22} color="#10b981" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Líderes y Estructura Organizacional</h3>
            <span style={{ padding: '0.2rem 0.6rem', backgroundColor: '#d1fae5', color: '#047857', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 'bold' }}>{leaders.length} Equipo(s)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {leaders.map(leader => {
              const teamMembers = vendors.filter(v => v.managerId === leader.id);
              const isExpanded = expandedLeaders.includes(leader.id);
              
              return (
                <div key={leader.id} style={{ border: '1px solid #10b981', borderRadius: '8px', backgroundColor: 'white', overflow: 'hidden' }}>
                  
                  {/* Lider Header Config */}
                  <div style={{ padding: '1.5rem', backgroundColor: '#f0fdf4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ flex: '1 1 250px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                          <h4 style={{ fontWeight: 'bold', fontSize: '1.25rem', margin: 0 }}>{leader.name}</h4>
                          <select value={leader.commissionRole} onChange={e => handleChange(leader.id, 'commissionRole', e.target.value)} style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #a7f3d0', fontSize: '0.85rem', outline: 'none', backgroundColor: 'white', color: '#047857', fontWeight: 'bold' }}>
                            {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           <label style={{ fontSize: '0.8rem', color: '#047857' }}>Reporta a:</label>
                           <select value={leader.managerId || 'NONE'} onChange={e => handleChange(leader.id, 'managerId', e.target.value)} style={{ padding: '0.2rem', borderRadius: '4px', border: 'none', borderBottom: '1px solid #86efac', background: 'transparent', fontSize: '0.8rem', color: '#065f46', outline: 'none' }}>
                             <option value="NONE">Sin coordinador principal</option>
                             {coordinators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                           </select>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 'bold', color: '#065f46', marginBottom: '0.25rem' }}><Target size={14}/> Cuota de Equipo</label>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ padding: '0.5rem', backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '4px 0 0 4px', color: '#0284c7' }}>$</div>
                            <input type="number" min="0" value={leader.monthlyGoal || 0} onChange={e => handleChange(leader.id, 'monthlyGoal', e.target.value)} style={{ width: '130px', padding: '0.5rem', borderRadius: '0 4px 4px 0', border: '1px solid #bae6fd', borderLeft: 'none', outline: '#0284c7' }} />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 'bold', color: '#065f46', marginBottom: '0.25rem' }}><Award size={14}/> Bono para Líder</label>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ padding: '0.5rem', backgroundColor: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '4px 0 0 4px', color: '#16a34a' }}>$</div>
                            <input type="number" min="0" value={leader.bonusAmount || 0} onChange={e => handleChange(leader.id, 'bonusAmount', e.target.value)} style={{ width: '110px', padding: '0.5rem', borderRadius: '0 4px 4px 0', border: '1px solid #bbf7d0', borderLeft: 'none', outline: '#16a34a' }} />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 'bold', color: '#065f46', marginBottom: '0.25rem' }}><Users size={14}/> Bono por Vendedor</label>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ padding: '0.5rem', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '4px 0 0 4px', color: '#d97706' }}>$</div>
                            <input type="number" min="0" value={leader.teamBonusAmount || 0} onChange={e => handleChange(leader.id, 'teamBonusAmount', e.target.value)} style={{ width: '110px', padding: '0.5rem', borderRadius: '0 4px 4px 0', border: '1px solid #fde68a', borderLeft: 'none', outline: '#d97706' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Accordion For Team Members */}
                  <div style={{ borderTop: '1px solid #10b981' }}>
                    <button 
                      onClick={() => toggleLeader(leader.id)} 
                      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', backgroundColor: '#f8fafc', border: 'none', cursor: 'pointer', outline: 'none' }}
                    >
                      <span style={{ fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={18} /> Vendedores Asignados ({teamMembers.length})
                      </span>
                      {isExpanded ? <ChevronDown size={20} color="#94a3b8" /> : <ChevronRight size={20} color="#94a3b8" />}
                    </button>

                    {isExpanded && (
                      <div style={{ padding: '0', borderTop: '1px solid var(--pulpos-border)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.8rem' }}>
                              <th style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--pulpos-border)' }}>Colaborador</th>
                              <th style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--pulpos-border)', width: '130px' }}>% de Comisión</th>
                              <th style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--pulpos-border)', width: '200px' }}>Equipo Asignado</th>
                              <th style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--pulpos-border)', width: '130px' }}>Rol Actual</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamMembers.map(vendor => (
                              <tr key={vendor.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                                <td style={{ padding: '0.75rem 1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                                  {vendor.name}
                                </td>
                                <td style={{ padding: '0.75rem 1.5rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <input type="number" min="0" step="0.01" value={vendor.commissionPct || 0} onChange={e => handleChange(vendor.id, 'commissionPct', e.target.value)} style={{ width: '60px', padding: '0.4rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px 0 0 4px', borderRight: 'none', textAlign: 'center', outline: 'none' }} />
                                    <div style={{ padding: '0.4rem', backgroundColor: '#f8fafc', border: '1px solid var(--pulpos-border)', borderRadius: '0 4px 4px 0', fontSize: '0.8rem' }}>%</div>
                                  </div>
                                </td>
                                <td style={{ padding: '0.75rem 1.5rem' }}>
                                  <select value={vendor.managerId || 'NONE'} onChange={e => handleChange(vendor.id, 'managerId', e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', fontSize: '0.85rem' }}>
                                    <option value="NONE">- Quitar de este equipo -</option>
                                    {leaders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                  </select>
                                </td>
                                <td style={{ padding: '0.75rem 1.5rem' }}>
                                  <select value={vendor.commissionRole} onChange={e => handleChange(vendor.id, 'commissionRole', e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', fontSize: '0.85rem' }}>
                                    {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                  </select>
                                </td>
                              </tr>
                            ))}
                            {teamMembers.length === 0 && (
                              <tr>
                                <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                  Este equipo no tiene vendedores asignados aún.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {leaders.length === 0 && (
              <div style={{ padding: '2rem', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No tienes Líderes configurados. Cambia el rol de un usuario a "Líder" para crear un nuevo equipo.
              </div>
            )}
          </div>
        </section>

        {/* ========================================================= */}
        {/* VENDEDORES INDEPENDIENTES                                   */}
        {/* ========================================================= */}
        {unassignedVendors.length > 0 && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <User size={22} color="#f59e0b" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#b45309' }}>Vendedores Independientes (Sin Equipo)</h3>
              <span style={{ padding: '0.2rem 0.6rem', backgroundColor: '#fef3c7', color: '#b45309', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 'bold' }}>{unassignedVendors.length} usuario(s)</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>Estos usuarios figuran debajo de nadie y operan exclusivamente para su bono/comisión personal.</p>

            <div style={{ backgroundColor: 'white', border: '1px solid #fcd34d', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                 <thead>
                   <tr style={{ backgroundColor: '#fffbeb', color: '#b45309', fontSize: '0.85rem' }}>
                     <th style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #fde68a' }}>Colaborador</th>
                     <th style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #fde68a', width: '150px' }}>% de Comisión</th>
                     <th style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #fde68a', width: '250px' }}>Jefe Inmediato (Opcional)</th>
                     <th style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #fde68a', width: '150px' }}>Rol Actual</th>
                   </tr>
                 </thead>
                 <tbody>
                   {unassignedVendors.map(vendor => (
                     <tr key={vendor.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                       <td style={{ padding: '0.75rem 1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}></div>
                         {vendor.name}
                       </td>
                       <td style={{ padding: '0.75rem 1.5rem' }}>
                         <div style={{ display: 'flex', alignItems: 'center' }}>
                           <input type="number" min="0" step="0.01" value={vendor.commissionPct || 0} onChange={e => handleChange(vendor.id, 'commissionPct', e.target.value)} style={{ width: '80px', padding: '0.4rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px 0 0 4px', borderRight: 'none', textAlign: 'center', outline: 'none' }} />
                           <div style={{ padding: '0.4rem', backgroundColor: '#f8fafc', border: '1px solid var(--pulpos-border)', borderRadius: '0 4px 4px 0', fontSize: '0.8rem' }}>%</div>
                         </div>
                       </td>
                       <td style={{ padding: '0.75rem 1.5rem' }}>
                         <select value={vendor.managerId || 'NONE'} onChange={e => handleChange(vendor.id, 'managerId', e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #fbbf24', fontSize: '0.85rem', outline: 'none' }}>
                           <option value="NONE">- Asignar a un equipo -</option>
                           {leaders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                         </select>
                       </td>
                       <td style={{ padding: '0.75rem 1.5rem' }}>
                         <select value={vendor.commissionRole} onChange={e => handleChange(vendor.id, 'commissionRole', e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', fontSize: '0.85rem' }}>
                           {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                         </select>
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
