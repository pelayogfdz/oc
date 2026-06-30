'use client';

import { useState } from 'react';
import { Shield, Plus, Edit2, Trash2, CheckCircle2, ChevronRight, X, Info } from 'lucide-react';
import { createCustomRole, updateCustomRole, deleteCustomRole } from '@/app/actions/role-actions';
import { PERMISSION_MODULES } from '../usuarios/UserClient';

export default function RoleClient({ initialRoles }: { initialRoles: any[] }) {
  const [roles, setRoles] = useState(initialRoles);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(PERMISSION_MODULES[0]?.id || '');
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const openNewRole = () => {
    setIsEditing(true);
    setEditingRole(null);
    setPerms({});
    setActiveTab(PERMISSION_MODULES[0]?.id || '');
  };

  const openEditRole = (role: any) => {
    setIsEditing(true);
    setEditingRole(role);
    setActiveTab(PERMISSION_MODULES[0]?.id || '');
    
    try {
      const parsed = role.permissions ? JSON.parse(role.permissions) : {};
      const obj: Record<string, boolean> = {};
      if (Array.isArray(parsed)) {
        parsed.forEach((k: string) => { obj[k] = true; });
      } else {
        Object.keys(parsed).forEach(k => { if (parsed[k]) obj[k] = true; });
      }

      // Automatically check parents for visibility
      PERMISSION_MODULES.forEach(mod => {
        let modActive = obj[mod.id] || false;
        mod.submodules?.forEach((sm: any) => {
          let smActive = obj[sm.id] || false;
          sm.permissions?.forEach((p: any) => {
            if (obj[p.id]) {
              smActive = true;
              modActive = true;
            }
          });
          if (smActive) obj[sm.id] = true;
        });
        if (modActive) obj[mod.id] = true;
      });

      setPerms(obj);
    } catch {
      setPerms({});
    }
  };

  const closeForm = () => {
    setIsEditing(false);
    setEditingRole(null);
    setPerms({});
  };

  const handlePermissionChange = (id: string, value: boolean) => {
    setPerms(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectAll = (modId: string) => {
    const mod = PERMISSION_MODULES.find(m => m.id === modId);
    if (!mod) return;

    let allPermissions: any[] = [];
    if (mod.submodules) {
      mod.submodules.forEach((sm: any) => {
        allPermissions = [...allPermissions, ...sm.permissions];
      });
    }

    const allSelected = allPermissions.every(p => perms[p.id]);
    const newPerms = { ...perms };
    allPermissions.forEach(p => {
      newPerms[p.id] = !allSelected;
    });
    setPerms(newPerms);
  };

  const handleSelectSubmodule = (submod: any) => {
    const allSelected = submod.permissions.every((p: any) => perms[p.id]);
    const newPerms = { ...perms };
    submod.permissions.forEach((p: any) => {
      newPerms[p.id] = !allSelected;
    });
    setPerms(newPerms);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      
      // Filter permissions to save only active keys
      const activePermissions = Object.keys(perms).filter(key => perms[key]);
      formData.append('permissions', JSON.stringify(activePermissions));

      let res;
      if (editingRole) {
        formData.append('id', editingRole.id);
        res = await updateCustomRole(formData);
      } else {
        res = await createCustomRole(formData);
      }

      if (res && res.success) {
        alert(editingRole ? 'Rol actualizado correctamente.' : 'Rol creado correctamente.');
        window.location.reload();
      } else {
        alert(res?.error || 'Error al guardar el rol.');
      }
    } catch (err: any) {
      alert(err.message || 'Error de conexión.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (roleId: string, roleName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el rol "${roleName}"?\nLos empleados con este rol volverán a tener permisos manuales.`)) {
      return;
    }
    try {
      const res = await deleteCustomRole(roleId);
      if (res && res.success) {
        alert('Rol eliminado correctamente.');
        window.location.reload();
      } else {
        alert(res?.error || 'Error al eliminar el rol.');
      }
    } catch (err: any) {
      alert(err.message || 'Error de conexión.');
    }
  };

  return (
    <div>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--caanma-text)' }}>
            <Shield size={28} style={{ color: 'var(--caanma-primary)' }} />
            Roles y Permisos Centralizados
          </h2>
          <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Genera roles con permisos predefinidos para asignarlos fácilmente a múltiples empleados.
          </p>
        </div>
        {!isEditing && (
          <button 
            type="button" 
            onClick={openNewRole}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--caanma-primary)',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(var(--caanma-primary-rgb), 0.2)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(var(--caanma-primary-rgb), 0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(var(--caanma-primary-rgb), 0.2)'; }}
          >
            <Plus size={20} /> Nuevo Rol
          </button>
        )}
      </div>

      {/* LIST OF ROLES */}
      {!isEditing && (
        <div style={{ overflowX: 'auto', border: '1px solid var(--caanma-border)', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--caanma-border)' }}>
                <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Nombre del Rol</th>
                <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Descripción</th>
                <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Creado el</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--caanma-text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Shield size={16} style={{ color: 'var(--caanma-primary)' }} />
                      {role.name}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontSize: '0.9rem' }}>
                    {role.description || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Sin descripción</span>}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontSize: '0.9rem' }}>
                    {new Date(role.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        type="button" 
                        onClick={() => openEditRole(role)}
                        title="Editar Rol"
                        style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                      >
                        <Edit2 size={16} style={{ color: '#475569' }} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleDelete(role.id, role.name)}
                        title="Eliminar Rol"
                        style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #fee2e2', backgroundColor: '#fff5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff5f5'; }}
                      >
                        <Trash2 size={16} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {roles.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                    Aún no hay roles creados. Haz clic en "Nuevo Rol" para comenzar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT ROLE FORM */}
      {isEditing && (
        <form onSubmit={handleSubmit} id="role-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--caanma-primary)' }}>
              {editingRole ? `Editar Rol: ${editingRole.name}` : 'Crear Nuevo Rol'}
            </h3>
            <button 
              type="button" 
              onClick={closeForm}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%' }}
            >
              <X size={20} style={{ color: '#64748b' }} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Nombre del Rol</label>
              <input 
                type="text" 
                name="name" 
                defaultValue={editingRole?.name || ''} 
                required 
                placeholder="Ej: Cajero Principal, Supervisor" 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', backgroundColor: 'white' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Descripción Corta</label>
              <input 
                type="text" 
                name="description" 
                defaultValue={editingRole?.description || ''} 
                placeholder="Ej: Encargado de cobro y arqueos de caja" 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', backgroundColor: 'white' }} 
              />
            </div>
          </div>

          <div style={{ backgroundColor: '#fdfbfe', padding: '1rem', borderRadius: '8px', border: '1px solid #fae8ff', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <Info size={20} style={{ color: '#c084fc', flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <h5 style={{ fontWeight: 'bold', color: '#8b5cf6', fontSize: '0.9rem' }}>Configuración de Permisos por Rol</h5>
              <p style={{ fontSize: '0.825rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Define detalladamente qué secciones del sistema estarán visibles y qué operaciones podrán ejecutar los empleados asignados a este rol.
              </p>
            </div>
          </div>

          {/* PERMISSION MATRIX LAYOUT */}
          <div style={{ display: 'flex', border: '1px solid var(--caanma-border)', borderRadius: '8px', overflow: 'hidden', minHeight: '450px', flexWrap: 'wrap' }}>
            {/* Left sidebar tabs */}
            <div style={{ width: '240px', backgroundColor: '#f8fafc', borderRight: '1px solid var(--caanma-border)', display: 'flex', flexDirection: 'column' }}>
              {PERMISSION_MODULES.map(mod => {
                const isTabActive = activeTab === mod.id;
                const isModVisible = perms[mod.id] || false;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setActiveTab(mod.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.25rem',
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: isTabActive ? 'white' : 'transparent',
                      borderBottom: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      fontWeight: isTabActive ? 'bold' : 'normal',
                      color: isTabActive ? 'var(--caanma-primary)' : '#475569',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={16} style={{ color: isModVisible ? '#16a34a' : '#cbd5e1' }} />
                      {mod.name}
                    </span>
                    {isTabActive && <ChevronRight size={18} />}
                  </button>
                );
              })}
            </div>

            {/* Right content area */}
            <div style={{ flex: 1, padding: '1.5rem', backgroundColor: 'white' }}>
              {PERMISSION_MODULES.map(mod => {
                const isModActive = perms[mod.id] || false;
                return (
                  <div key={mod.id} style={{ display: activeTab === mod.id ? 'block' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.75rem' }}>
                      <h5 style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{mod.name}</h5>
                      <button 
                        type="button" 
                        onClick={() => handleSelectAll(mod.id)} 
                        disabled={!isModActive}
                        style={{ 
                          padding: '0.35rem 0.75rem', 
                          fontSize: '0.8rem', 
                          backgroundColor: '#f1f5f9', 
                          border: '1px solid #cbd5e1', 
                          borderRadius: '4px', 
                          cursor: !isModActive ? 'not-allowed' : 'pointer', 
                          fontWeight: 'bold',
                          opacity: !isModActive ? 0.5 : 1
                        }}
                      >
                        ✔️ Alternar Todos en Módulo
                      </button>
                    </div>

                    {/* Banner de Visibilidad del Módulo */}
                    <div style={{ 
                      padding: '1rem 1.25rem', 
                      backgroundColor: isModActive ? '#eff6ff' : '#f1f5f9', 
                      border: isModActive ? '1px solid #bfdbfe' : '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      marginBottom: '1.5rem',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease-in-out'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.95rem', fontWeight: 'bold', display: 'block', color: isModActive ? '#1e40af' : '#475569' }}>
                          👁️ Módulo Visible / Activo
                        </span>
                        <span style={{ fontSize: '0.8rem', color: isModActive ? '#2563eb' : '#64748b' }}>
                          {isModActive ? 'Los usuarios con este rol pueden ver y acceder a esta sección.' : 'El módulo está completamente oculto y desactivado.'}
                        </span>
                      </div>
                      <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input 
                          type="checkbox"
                          checked={isModActive}
                          onChange={(e) => handlePermissionChange(mod.id, e.target.checked)}
                          style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer', accentColor: '#2563eb' }}
                        />
                      </label>
                    </div>

                    {mod.submodules?.map((submod) => {
                      const isSubmodActive = perms[submod.id] || false;
                      return (
                        <div 
                          key={submod.id} 
                          style={{ 
                            marginBottom: '2rem',
                            opacity: isModActive ? 1 : 0.5,
                            pointerEvents: isModActive ? 'auto' : 'none',
                            transition: 'opacity 0.2s'
                          }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginBottom: '1rem', 
                            backgroundColor: (isModActive && isSubmodActive) ? '#f0fdf4' : '#f8fafc', 
                            padding: '0.5rem 1rem', 
                            borderRadius: '6px',
                            border: (isModActive && isSubmodActive) ? '1px solid #bbf7d0' : '1px solid #cbd5e1',
                            transition: 'all 0.2s'
                          }}>
                            <h6 style={{ fontWeight: 'bold', fontSize: '1rem', color: (isModActive && isSubmodActive) ? '#166534' : '#334155' }}>
                              {submod.name}
                            </h6>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                                <input 
                                  type="checkbox"
                                  checked={isSubmodActive}
                                  disabled={!isModActive}
                                  onChange={(e) => handlePermissionChange(submod.id, e.target.checked)}
                                  style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer', accentColor: '#16a34a' }}
                                />
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: (isModActive && isSubmodActive) ? '#166534' : '#64748b' }}>
                                  👁️ Submódulo Visible
                                </span>
                              </label>
                              <button 
                                type="button" 
                                onClick={() => handleSelectSubmodule(submod)} 
                                disabled={!isModActive || !isSubmodActive}
                                style={{ 
                                  padding: '0.25rem 0.5rem', 
                                  fontSize: '0.75rem', 
                                  backgroundColor: 'white', 
                                  border: '1px solid #cbd5e1', 
                                  borderRadius: '4px', 
                                  cursor: (!isModActive || !isSubmodActive) ? 'not-allowed' : 'pointer',
                                  opacity: (!isModActive || !isSubmodActive) ? 0.5 : 1
                                }}
                              >
                                Alternar Todo
                              </button>
                            </div>
                          </div>

                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', 
                            gap: '1rem', 
                            paddingLeft: '1rem',
                            opacity: (isModActive && isSubmodActive) ? 1 : 0.5,
                            pointerEvents: (isModActive && isSubmodActive) ? 'auto' : 'none',
                            transition: 'opacity 0.2s'
                          }}>
                            {submod.permissions.map((p) => (
                              <label 
                                key={p.id} 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '0.75rem', 
                                  cursor: 'pointer', 
                                  padding: '0.5rem', 
                                  borderRadius: '6px', 
                                  backgroundColor: (isModActive && isSubmodActive && perms[p.id]) ? '#f0fdf4' : 'transparent', 
                                  border: (isModActive && isSubmodActive && perms[p.id]) ? '1px solid #bbf7d0' : '1px transparent solid', 
                                  transition: 'all 0.2s' 
                                }}
                              >
                                <input 
                                  type="checkbox" 
                                  checked={perms[p.id] || false}
                                  disabled={!isModActive || !isSubmodActive}
                                  onChange={(e) => handlePermissionChange(p.id, e.target.checked)}
                                  style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer', accentColor: 'var(--caanma-primary)' }}
                                />
                                <span style={{ fontSize: '0.9rem', fontWeight: (isModActive && isSubmodActive && perms[p.id]) ? 'bold' : 'normal' }}>
                                  {p.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--caanma-border)', paddingTop: '1.5rem' }}>
            <button 
              type="button" 
              onClick={closeForm}
              style={{
                backgroundColor: 'white',
                border: '1px solid var(--caanma-border)',
                color: 'var(--caanma-text-muted)',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              style={{
                backgroundColor: 'var(--caanma-primary)',
                color: 'white',
                padding: '0.75rem 2rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 'bold',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                transition: 'all 0.2s'
              }}
            >
              {isSaving ? 'Guardando...' : (editingRole ? 'Guardar Cambios' : 'Crear Rol')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
