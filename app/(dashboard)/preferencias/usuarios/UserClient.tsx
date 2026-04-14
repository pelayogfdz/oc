'use client';

import { useState } from 'react';
import { Users, Plus, Shield, Edit2, Trash2, CheckCircle2, ChevronDown, ChevronRight, X } from 'lucide-react';
import { createUser, updateUser, deleteUser } from '@/app/actions/user';

const PERMISSION_MODULES = [
  {
    id: 'pos',
    name: 'Punto de Venta (POS)',
    permissions: [
      { id: 'pos_access', label: 'Acceder a Punto de Venta' },
      { id: 'pos_discount', label: 'Autorizar Descuentos' },
      { id: 'pos_cancel', label: 'Cancelar Tickets' },
      { id: 'pos_returns', label: 'Procesar Devoluciones' },
      { id: 'pos_price_change', label: 'Modificar Precio en Caja' },
      { id: 'pos_view_history', label: 'Ver Historial de Ventas' }
    ]
  },
  {
    id: 'inventory',
    name: 'Inventario',
    permissions: [
      { id: 'inv_view', label: 'Ver Catálogo y Stock' },
      { id: 'inv_edit', label: 'Crear / Editar Productos' },
      { id: 'inv_delete', label: 'Eliminar Productos Permanentemente' },
      { id: 'inv_adjust', label: 'Realizar Ajustes de Stock' },
      { id: 'inv_transfer', label: 'Crear / Recibir Traspasos' },
      { id: 'inv_cost', label: 'Ver Costos de Compra (Margen)' },
      { id: 'inv_export', label: 'Exportar Inventario (CSV/Excel)' }
    ]
  },
  {
    id: 'cash',
    name: 'Caja y Efectivo',
    permissions: [
      { id: 'cash_open_close', label: 'Abrir y Cerrar Caja' },
      { id: 'cash_movements', label: 'Registrar Retiros / Depósitos' },
      { id: 'cash_audit', label: 'Visualizar Arqueos de Otros' }
    ]
  },
  {
    id: 'admin',
    name: 'Administración Global',
    permissions: [
      { id: 'admin_customers', label: 'Ver y Editar Clientes' },
      { id: 'admin_purchases', label: 'Modulo de Compras y Proveedores' },
      { id: 'admin_reports', label: 'Ver Reportes y Finanzas' },
      { id: 'admin_quotes', label: 'Crear / Imprimir Cotizaciones' }
    ]
  },
  {
    id: 'sysadmin',
    name: 'Preferencias (Sysadmin)',
    permissions: [
      { id: 'sys_settings', label: 'Modificar Configuraciones de Tienda' },
      { id: 'sys_users', label: 'Administrar Usuarios y Permisos' },
      { id: 'sys_branches', label: 'Administrar Múltiples Sucursales' },
      { id: 'sys_integrations', label: 'Integraciones (MercadoLibre, Shopify)' }
    ]
  }
];

export default function UserClient({ initialUsers, branches }: { initialUsers: any[], branches: any[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('branches');
  
  // State for permissions mapping
  const [perms, setPerms] = useState<Record<string, boolean>>({});

  // Dynamically create a module for Branch Assignments
  const dynamicModules = [
    {
      id: 'branches',
      name: 'Acceso a Sucursales',
      permissions: [
        { id: 'GLOBAL_VIEW', label: '⭐ Visibilidad Global (Acceso Administrativo a TODAS las sucursales)' },
        ...branches.map(b => ({
          id: `__BRANCH_${b.id}`,
          label: `Acceso a Sucursal: ${b.name}`
        }))
      ]
    },
    ...PERMISSION_MODULES
  ];

  const handlePermissionChange = (id: string, value: boolean) => {
    setPerms(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectAll = (moduleId: string) => {
    const module = dynamicModules.find(m => m.id === moduleId);
    if (!module) return;
    const newPerms = { ...perms };
    module.permissions.forEach(p => {
      newPerms[p.id] = true;
    });
    setPerms(newPerms);
  };

  const openNewUser = () => {
    setIsEditing(true);
    setEditingUser(null);
    setPerms({});
    setActiveTab('branches');
  };

  const openEditUser = (user: any) => {
    setIsEditing(true);
    setEditingUser(user);
    setActiveTab('branches');
    
    try {
      const parsed = user.permissions ? JSON.parse(user.permissions) : {};
      // Compatibility fallback: Convert array to Record<string, boolean> if it was saved as array.
      if (Array.isArray(parsed)) {
        const obj: any = {};
        parsed.forEach(k => obj[k] = true);
        setPerms(obj);
      } else {
        setPerms(parsed);
      }
    } catch {
      setPerms({});
    }
  };

  const closeForm = () => {
    setIsEditing(false);
    setEditingUser(null);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Filter out only active permissions
    const activePermKeys = Object.keys(perms).filter(k => perms[k] === true);
    // Overwrite the permissions field with JSON
    formData.set('permissions', JSON.stringify(activePermKeys));

    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData);
        
        // Optimistic update
        const updated = [...users];
        const idx = updated.findIndex(u => u.id === editingUser.id);
        const newData = Object.fromEntries(formData.entries());
        if(idx >= 0) {
           updated[idx] = { ...updated[idx], ...newData };
           setUsers(updated);
        }
      } else {
        await createUser(formData);
        window.location.reload(); // Quick refresh instead of complex optimistic insert
      }
      closeForm();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleDelete(id: string) {
    if(confirm('¿Eliminar usuario del sistema?')) {
      try {
        await deleteUser(id);
        setUsers(users.filter(u => u.id !== id));
      } catch (err: any) {
        alert("Error eliminando: " + err.message);
      }
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={24} /> Usuarios y Permisos
          </h2>
          <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Administra los empleados que tienen acceso al sistema, y define qué pueden ver o hacer.
          </p>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '3rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
            <th style={{ padding: '0.75rem 0', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Nombre Empleado</th>
            <th style={{ padding: '0.75rem 0', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Correo (Login)</th>
            <th style={{ padding: '0.75rem 0', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Nivel Base</th>
            <th style={{ padding: '0.75rem 0', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Permisos ACL</th>
            <th style={{ padding: '0.75rem 0', textAlign: 'right' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => {
            const hasCustomPerms = u.permissions && u.permissions !== '[]';
            return (
            <tr key={u.id || i} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
              <td style={{ padding: '1rem 0', fontWeight: 'bold' }}>{u.name}</td>
              <td style={{ padding: '1rem 0', color: 'var(--pulpos-text-muted)' }}>{u.email}</td>
              <td style={{ padding: '1rem 0' }}>
                <span style={{ 
                  backgroundColor: u.role === 'ADMIN' ? '#fee2e2' : (u.role === 'MANAGER' ? '#fef3c7' : '#e0f2fe'), 
                  color: u.role === 'ADMIN' ? '#991b1b' : (u.role === 'MANAGER' ? '#92400e' : '#075985'), 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem', 
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <Shield size={12} /> {u.role === 'ADMIN' ? 'Administrador' : (u.role === 'MANAGER' ? 'Encargado' : 'Empleado')}
                </span>
              </td>
              <td>
                <span style={{ fontSize: '0.75rem', backgroundColor: hasCustomPerms ? '#dcfce7' : '#f1f5f9', color: hasCustomPerms ? '#166534' : '#64748b', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
                  {hasCustomPerms ? 'Modificados ✔️' : 'Por Defecto'}
                </span>
              </td>
              <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                <button onClick={() => {
                    openEditUser(u);
                    // scroll to form
                    document.getElementById('user-form')?.scrollIntoView({ behavior: 'smooth' });
                }} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--pulpos-primary)', marginRight: '1rem' }}>
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(u.id)} 
                  disabled={u.role === 'ADMIN'} 
                  style={{ backgroundColor: 'transparent', border: 'none', cursor: u.role === 'ADMIN' ? 'not-allowed' : 'pointer', color: u.role === 'ADMIN' ? '#cbd5e1' : '#ef4444' }}
                >
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          )})}
        </tbody>
      </table>

      {/* Formulario Estático Abajo */}
      <div id="user-form" style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px dashed var(--pulpos-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            {editingUser ? `Editando Privilegios: ${editingUser.name}` : 'Dar de Alta Nuevo Usuario y Permisos'}
          </h3>
          {editingUser && (
            <button type="button" onClick={openNewUser} style={{ fontSize: '0.875rem', padding: '0.25rem 0.75rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'white' }}>
              + Crear Nuevo En Su Lugar
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Datos Básicos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Nombre Completo</label>
              <input type="text" name="name" defaultValue={editingUser?.name || ''} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Correo (Login)</label>
              <input type="email" name="email" defaultValue={editingUser?.email || ''} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Contraseña {editingUser ? '(Opcional)' : '*'}</label>
              <input type="password" name="password" required={!editingUser} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Nivel Base</label>
              <select name="role" defaultValue={editingUser?.role || 'USER'} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }}>
                <option value="USER">Cajero / Vendedor</option>
                <option value="MANAGER">Encargado</option>
                <option value="ADMIN">Administrador VIP</option>
              </select>
            </div>
          </div>

          {/* Matriz de Permisos */}
          <div style={{ border: '1px solid var(--pulpos-border)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white' }}>
            <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderBottom: '1px solid var(--pulpos-border)' }}>
              <h4 style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Permisos Específicos</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--pulpos-text-muted)' }}>Márcales el acceso explícito (palomitas) por cada módulo. Si desmarcas todo, no verá la sección.</p>
            </div>
            
            <div style={{ display: 'flex' }}>
              {/* Left Tabs */}
              <div style={{ width: '250px', borderRight: '1px solid var(--pulpos-border)', backgroundColor: '#f8fafc' }}>
                {dynamicModules.map(mod => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setActiveTab(mod.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '1rem',
                      border: 'none',
                      background: activeTab === mod.id ? '#e0f2fe' : 'transparent',
                      color: activeTab === mod.id ? '#0284c7' : 'inherit',
                      fontWeight: activeTab === mod.id ? 'bold' : 'normal',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--pulpos-border)'
                    }}
                  >
                    {mod.name}
                    {activeTab === mod.id && <ChevronRight size={18} />}
                  </button>
                ))}
              </div>
              
              {/* Right Content Panels */}
              <div style={{ flex: 1, padding: '1.5rem' }}>
                {dynamicModules.map(mod => (
                  <div key={mod.id} style={{ display: activeTab === mod.id ? 'block' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h5 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{mod.name}</h5>
                      <button type="button" onClick={() => handleSelectAll(mod.id)} style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>
                        ✔️ Seleccionar Todos
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1rem' }}>
                      {mod.permissions.map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', backgroundColor: perms[p.id] ? '#f0fdf4' : 'transparent', border: perms[p.id] ? '1px solid #bbf7d0' : '1px transparent solid' }}>
                          <input 
                            type="checkbox" 
                            checked={perms[p.id] || false}
                            onChange={(e) => handlePermissionChange(p.id, e.target.checked)}
                            style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer', accentColor: 'var(--pulpos-primary)' }}
                          />
                          <span style={{ fontSize: '0.9rem', fontWeight: perms[p.id] ? 'bold' : 'normal' }}>{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="submit" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem' }}>
              {editingUser ? <CheckCircle2 size={18} /> : <Plus size={18} />}
              {editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
