'use client';

import { useState } from 'react';
import { updateCommissionProfile } from '@/app/actions/commissions';
import { useRouter } from 'next/navigation';

export default function CommissionManagerClient({ initialUsers }: { initialUsers: any[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleUpdate = async (userId: string) => {
    setSavingId(userId);
    try {
      const userToUpdate = users.find(u => u.id === userId);
      if (!userToUpdate) return;
      
      const res = await updateCommissionProfile(userId, {
        managerId: userToUpdate.managerId === 'NONE' ? null : userToUpdate.managerId,
        commissionRole: userToUpdate.commissionRole,
        commissionPct: parseFloat(userToUpdate.commissionPct),
        monthlyGoal: parseFloat(userToUpdate.monthlyGoal),
        bonusAmount: parseFloat(userToUpdate.bonusAmount),
        teamBonusAmount: parseFloat(userToUpdate.teamBonusAmount)
      });
      
      if (res.success) {
        alert('Configuración guardada exitosamente.');
        router.refresh();
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleChange = (userId: string, field: string, value: string) => {
    setUsers(users.map(u => u.id === userId ? { ...u, [field]: value } : u));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--pulpos-border)]">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Configuración de Comisiones y Jerarquías</h2>
        <p className="text-[var(--pulpos-text-muted)]">
          Asigna un rol a cada usuario. Los <strong className="text-blue-600">Vendedores</strong> pueden ganar bonos individuales. 
          Los <strong className="text-green-600">Líderes</strong> ganan su bono si la suma de su equipo llega a la cuota, y pueden otorgar un bono extra a sus vendedores subordinados.
          Los <strong className="text-purple-600">Coordinadores</strong> ganan un porcentaje override sobre toda la venta de sus líderes agrupados.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-[var(--pulpos-border)]">
              <th className="p-3 text-sm font-semibold">Usuario</th>
              <th className="p-3 text-sm font-semibold">Rol Comercial</th>
              <th className="p-3 text-sm font-semibold">Reporta a (Manager)</th>
              <th className="p-3 text-sm font-semibold">% Comisión</th>
              <th className="p-3 text-sm font-semibold">Cuota Mensual ($)</th>
              <th className="p-3 text-sm font-semibold">Bono Jefe ($)</th>
              <th className="p-3 text-sm font-semibold">Bono Equipo ($)</th>
              <th className="p-3 text-sm font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="p-3 font-medium text-gray-800">{u.name}</td>
                <td className="p-3">
                  <select 
                    value={u.commissionRole || 'VENDEDOR'}
                    onChange={(e) => handleChange(u.id, 'commissionRole', e.target.value)}
                    className="p-2 border rounded text-sm w-full bg-white"
                  >
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="LIDER">Líder</option>
                    <option value="COORDINADOR">Coordinador</option>
                  </select>
                </td>
                <td className="p-3">
                  <select 
                    value={u.managerId || 'NONE'}
                    onChange={(e) => handleChange(u.id, 'managerId', e.target.value)}
                    className="p-2 border rounded text-sm w-full bg-white"
                  >
                    <option value="NONE">- Ninguno -</option>
                    {users.filter(other => other.id !== u.id && ['LIDER', 'COORDINADOR'].includes(other.commissionRole)).map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.commissionRole})</option>
                    ))}
                  </select>
                </td>
                <td className="p-3">
                  <input 
                    type="number" 
                    value={u.commissionPct || 0}
                    onChange={(e) => handleChange(u.id, 'commissionPct', e.target.value)}
                    className="p-2 border rounded text-sm w-20"
                  />
                </td>
                <td className="p-3">
                  <input 
                    type="number" 
                    value={u.monthlyGoal || 0}
                    onChange={(e) => handleChange(u.id, 'monthlyGoal', e.target.value)}
                    className="p-2 border rounded text-sm w-28"
                  />
                </td>
                <td className="p-3">
                  <input 
                    type="number" 
                    value={u.bonusAmount || 0}
                    onChange={(e) => handleChange(u.id, 'bonusAmount', e.target.value)}
                    className="p-2 border rounded text-sm w-24"
                  />
                </td>
                <td className="p-3">
                  <input 
                    type="number" 
                    value={u.teamBonusAmount || 0}
                    onChange={(e) => handleChange(u.id, 'teamBonusAmount', e.target.value)}
                    disabled={u.commissionRole !== 'LIDER'}
                    className={`p-2 border rounded text-sm w-24 ${u.commissionRole !== 'LIDER' ? 'bg-gray-100 opacity-50' : 'bg-white'}`}
                  />
                </td>
                <td className="p-3">
                  <button 
                    onClick={() => handleUpdate(u.id)}
                    disabled={savingId === u.id}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'var(--pulpos-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: savingId === u.id ? 'wait' : 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.85rem'
                    }}
                  >
                    {savingId === u.id ? 'Guardando...' : 'Guardar'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">
                  No hay usuarios asignados a esta sucursal.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
