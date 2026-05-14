'use client';

import { useState, useRef, useEffect } from 'react';
import { Users, Plus, Shield, Edit2, Trash2, CheckCircle2, ChevronDown, ChevronRight, X } from 'lucide-react';
import { createUser, updateUser, deleteUser } from '@/app/actions/user';

const PERMISSION_MODULES = [
  {
    id: 'pos',
    name: 'Punto de Venta (POS)',
    submodules: [
      {
        id: 'pos_terminal',
        name: 'Terminal',
        permissions: [
          { id: 'pos_access', label: 'Acceder a Punto de Venta' },
          { id: 'pos_discount', label: 'Autorizar Descuentos' },
          { id: 'pos_price_change', label: 'Modificar Precio en Caja' },
        ]
      },
      {
        id: 'pos_tickets',
        name: 'Tickets',
        permissions: [
          { id: 'pos_cancel', label: 'Cancelar Tickets' },
          { id: 'pos_returns', label: 'Procesar Devoluciones' },
          { id: 'pos_view_history', label: 'Ver Historial de Ventas' }
        ]
      }
    ]
  },
  {
    id: 'inventory',
    name: 'Inventario',
    submodules: [
      {
        id: 'inv_catalog',
        name: 'Catálogo de Productos',
        permissions: [
          { id: 'inv_view', label: 'Ver Catálogo y Stock' },
          { id: 'inv_edit', label: 'Crear / Editar Productos' },
          { id: 'inv_delete', label: 'Eliminar Productos Permanentemente' },
          { id: 'inv_cost', label: 'Ver Costos de Compra (Margen)' },
          { id: 'inv_export', label: 'Exportar Inventario (CSV/Excel)' }
        ]
      },
      {
        id: 'inv_movements',
        name: 'Movimientos',
        permissions: [
          { id: 'inv_adjust', label: 'Realizar Ajustes de Stock' },
          { id: 'inv_transfer', label: 'Crear / Recibir Traspasos' }
        ]
      }
    ]
  },
  {
    id: 'cash',
    name: 'Caja y Efectivo',
    submodules: [
      {
        id: 'cash_ops',
        name: 'Operaciones',
        permissions: [
          { id: 'cash_open_close', label: 'Abrir y Cerrar Caja' },
          { id: 'cash_movements', label: 'Registrar Retiros / Depósitos' },
          { id: 'cash_audit', label: 'Visualizar Arqueos de Otros' }
        ]
      }
    ]
  },
  {
    id: 'admin',
    name: 'Administración Global',
    submodules: [
      {
        id: 'admin_customers',
        name: 'Clientes',
        permissions: [
          { id: 'admin_customers_view', label: 'Ver y Editar Clientes' }
        ]
      },
      {
        id: 'admin_purchases',
        name: 'Compras y Proveedores',
        permissions: [
          { id: 'admin_purchases_access', label: 'Modulo de Compras y Proveedores' }
        ]
      },
      {
        id: 'admin_reports',
        name: 'Reportes',
        permissions: [
          { id: 'admin_reports_access', label: 'Ver Reportes y Finanzas' }
        ]
      },
      {
        id: 'admin_quotes',
        name: 'Cotizaciones',
        permissions: [
          { id: 'admin_quotes_access', label: 'Crear / Imprimir Cotizaciones' }
        ]
      }
    ]
  },
  {
    id: 'logistica',
    name: 'Logística y Entregas',
    submodules: [
      {
        id: 'log_manage',
        name: 'Gestión',
        permissions: [
          { id: 'logistica_access', label: 'Ver y Gestionar Entregas (Choferes, Etiquetas)' }
        ]
      }
    ]
  },
  {
    id: 'panaderia',
    name: 'Panadería (Fabricación)',
    submodules: [
      {
        id: 'panaderia_ops',
        name: 'Operaciones',
        permissions: [
          { id: 'panaderia_access', label: 'Ver Ordenes de Producción y Avanzar Pasos' }
        ]
      }
    ]
  },
  {
    id: 'sysadmin',
    name: 'Preferencias (Sysadmin)',
    submodules: [
      {
        id: 'sys_settings',
        name: 'Ajustes',
        permissions: [
          { id: 'sys_settings_access', label: 'Modificar Configuraciones de Tienda' },
          { id: 'sys_users', label: 'Administrar Usuarios y Permisos' },
          { id: 'sys_branches', label: 'Administrar Múltiples Sucursales' },
          { id: 'sys_integrations', label: 'Integraciones (MercadoLibre, Shopify)' }
        ]
      }
    ]
  }
];

export default function UserClient({ initialUsers, branches, hrLocations = [] }: { initialUsers: any[], branches: any[], hrLocations?: any[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('branches');
  
  // Biometrics State
  const [faceDescriptor, setFaceDescriptor] = useState<string>('');
  const [baselinePhoto, setBaselinePhoto] = useState<string>('');
  const [bioStatus, setBioStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  // State for permissions mapping
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  
  // State for selected HrLocations
  const [selectedHrLocations, setSelectedHrLocations] = useState<string[]>([]);

  // Schedule State
  const defaultSchedule = {
    "Lunes": ["09:00", "18:00"],
    "Martes": ["09:00", "18:00"],
    "Miercoles": ["09:00", "18:00"],
    "Jueves": ["09:00", "18:00"],
    "Viernes": ["09:00", "18:00"],
    "Sabado": ["09:00", "14:00"]
  };
  const [schedule, setSchedule] = useState<Record<string, string[]>>(defaultSchedule);

  const potentialManagers = users.filter(u => u.commissionRole === 'LIDER' || u.commissionRole === 'COORDINADOR');

  // Dynamically create a module for Branch Assignments
  const dynamicModules = [
    {
      id: 'branches',
      name: 'Acceso a Sucursales',
      submodules: [
        {
          id: 'branches_access',
          name: 'Sucursales Permitidas',
          permissions: [
            { id: 'GLOBAL_VIEW', label: '⭐ Visibilidad Global (Acceso Administrativo a TODAS las sucursales)' },
            ...branches.map(b => ({
              id: `__BRANCH_${b.id}`,
              label: `Acceso a Sucursal: ${b.name}`
            }))
          ]
        }
      ]
    },
    ...PERMISSION_MODULES
  ];

  const handlePermissionChange = (id: string, value: boolean) => {
    setPerms(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectAll = (modId: string) => {
    const mod = dynamicModules.find(m => m.id === modId);
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

  const openNewUser = () => {
    setIsEditing(true);
    setEditingUser(null);
    setPerms({});
    setActiveTab('branches');
    setFaceDescriptor('');
    setBaselinePhoto('');
    setBioStatus('');
    setSchedule(defaultSchedule);
    setSelectedHrLocations([]);
  };

  const openEditUser = (user: any) => {
    setIsEditing(true);
    setEditingUser(user);
    setActiveTab('branches');
    setFaceDescriptor(user.faceDescriptor || '');
    setBaselinePhoto(user.baselinePhoto || '');
    setBioStatus(user.faceDescriptor ? 'Molde Biométrico Registrado ✓' : '');
    setSelectedHrLocations(user.hrLocations?.map((l: any) => l.id) || []);
    
    try {
      const parsedSched = JSON.parse(user.workScheduleMatrix || '{}');
      setSchedule(Object.keys(parsedSched).length > 0 ? parsedSched : defaultSchedule);
    } catch {
      setSchedule(defaultSchedule);
    }
    
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

  const handleBioCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBioStatus('Iniciando lectura biométrica (Optimizando memoria)...');
    
    // Create object URL instead of reading full base64 to save RAM
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = async () => {
      try {
        setBioStatus('Cargando modelos de IA...');
        const faceapi = await import('@vladmandic/face-api');
        if (!modelsLoaded) {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('/models')
          ]);
          setModelsLoaded(true);
        }

        setBioStatus('Procesando rostro...');
        const tmpCanvas = document.createElement('canvas');
        const mx = Math.max(img.width, img.height);
        let ratio = mx > 600 ? 600 / mx : 1;
        tmpCanvas.width = img.width * ratio;
        tmpCanvas.height = img.height * ratio;
        tmpCanvas.getContext('2d')?.drawImage(img, 0, 0, tmpCanvas.width, tmpCanvas.height);

        const detection = await faceapi.detectSingleFace(tmpCanvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.1 })).withFaceLandmarks().withFaceDescriptor();

        if (!detection) {
           setBioStatus('Error: No se detectó rostro');
           URL.revokeObjectURL(objectUrl);
           return;
        }

        const descriptorString = JSON.stringify(Array.from(detection.descriptor));
        const finalCompressedImage = tmpCanvas.toDataURL('image/jpeg', 0.5);

        setFaceDescriptor(descriptorString);
        setBaselinePhoto(finalCompressedImage);
        setBioStatus('Rostro capturado y validado ✓');
      } catch (err: any) {
        setBioStatus('Error al procesar: ' + err.message);
      } finally {
        // Free memory immediately
        URL.revokeObjectURL(objectUrl);
      }
    };
    
    img.onerror = () => {
      setBioStatus('Error al leer la imagen.');
      URL.revokeObjectURL(objectUrl);
    };

    img.src = objectUrl;
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('hrLocations', JSON.stringify(selectedHrLocations));
    
    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData);
        window.location.reload();
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

  const getFlatPermissionsToSave = () => {
    const selected = Object.keys(perms).filter(k => perms[k]);
    const finalSet = new Set(selected);
    dynamicModules.forEach(mod => {
      let modActive = false;
      mod.submodules?.forEach((sm: any) => {
        let smActive = false;
        sm.permissions?.forEach((p: any) => {
          if (perms[p.id]) {
            smActive = true;
            modActive = true;
          }
        });
        if (smActive) finalSet.add(sm.id);
      });
      if (modActive) finalSet.add(mod.id);
    });
    return Array.from(finalSet);
  };

  const oldestUser = [...users].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())[0];

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

      <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '3rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
            <th style={{ padding: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Nombre Empleado</th>
            <th style={{ padding: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Correo (Login)</th>
            <th style={{ padding: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Nivel Base</th>
            <th style={{ padding: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Puesto Ventas</th>
            <th style={{ padding: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>Permisos ACL</th>
            <th style={{ padding: '0.75rem', textAlign: 'right' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => {
            const hasCustomPerms = u.permissions && u.permissions !== '[]';
            const isProtected = u.isSuperAdmin || u.id === oldestUser?.id;
            return (
            <tr key={u.id || i} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
              <td data-label="Nombre Empleado" style={{ padding: '1rem', fontWeight: 'bold' }}>{u.name}</td>
              <td data-label="Correo (Login)" style={{ padding: '1rem', color: 'var(--pulpos-text-muted)' }}>{u.email}</td>
              <td data-label="Nivel Base" style={{ padding: '1rem' }}>
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
              <td data-label="Puesto Ventas" style={{ padding: '1rem' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--pulpos-primary)', fontSize: '0.85rem' }}>
                  {u.commissionRole || 'VENDEDOR'}
                </span>
              </td>
              <td data-label="Permisos ACL" style={{ padding: '1rem' }}>
                <span style={{ fontSize: '0.75rem', backgroundColor: hasCustomPerms ? '#dcfce7' : '#f1f5f9', color: hasCustomPerms ? '#166534' : '#64748b', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
                  {hasCustomPerms ? 'Modificados ✔️' : 'Por Defecto'}
                </span>
              </td>
              <td data-label="Acciones" style={{ padding: '1rem', textAlign: 'right' }}>
                <button onClick={() => {
                    openEditUser(u);
                    // scroll to form
                    document.getElementById('user-form')?.scrollIntoView({ behavior: 'smooth' });
                }} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--pulpos-primary)', marginRight: '1rem' }}>
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(u.id)} 
                  disabled={isProtected} 
                  style={{ backgroundColor: 'transparent', border: 'none', cursor: isProtected ? 'not-allowed' : 'pointer', color: isProtected ? '#cbd5e1' : '#ef4444' }}
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
        
        {/* Top-level Tabs for the Form */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)' }}>
          {['basics', 'personal', 'payroll', 'schedule', 'biometrics'].map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab === 'basics' ? 'branches' : tab)} // Route 'basics' to 'branches' by default to avoid blank screen
              style={{
                padding: '0.75rem 1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab || (tab === 'basics' && dynamicModules.map(m=>m.id).includes(activeTab)) ? '2px solid var(--pulpos-primary)' : '2px solid transparent',
                color: activeTab === tab || (tab === 'basics' && dynamicModules.map(m=>m.id).includes(activeTab)) ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)',
                fontWeight: activeTab === tab || (tab === 'basics' && dynamicModules.map(m=>m.id).includes(activeTab)) ? 'bold' : 'normal',
                cursor: 'pointer'
              }}
            >
              {tab === 'basics' && 'Básicos y Permisos'}
              {tab === 'personal' && 'Personales y Fiscales'}
              {tab === 'payroll' && 'Nómina y Comisiones'}
              {tab === 'schedule' && 'Horarios'}
              {tab === 'biometrics' && 'Biometría y Seguridad'}
            </button>
          ))}
        </div>

        <form key={editingUser?.id || 'new_user'} onSubmit={handleSubmit}>
          
          {/* TAB 1: BÁSICOS Y PERMISOS */}
          <div style={{ display: (activeTab === 'basics' || activeTab.startsWith('branches') || dynamicModules.map(m=>m.id).includes(activeTab)) ? 'block' : 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
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
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Nivel Base (Acceso)</label>
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
                
                <div style={{ flex: 1, padding: '1.5rem' }}>
                  {dynamicModules.map(mod => (
                    <div key={mod.id} style={{ display: activeTab === mod.id ? 'block' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.75rem' }}>
                        <h5 style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{mod.name}</h5>
                        <button type="button" onClick={() => handleSelectAll(mod.id)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                          ✔️ Alternar Todos en Módulo
                        </button>
                      </div>
                      
                      {mod.submodules?.map((submod, index) => (
                        <div key={submod.id} style={{ marginBottom: '2rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', backgroundColor: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '6px' }}>
                            <h6 style={{ fontWeight: 'bold', fontSize: '1rem', color: '#334155' }}>{submod.name}</h6>
                            <button type="button" onClick={() => handleSelectSubmodule(submod)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', backgroundColor: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>
                              Alternar Submódulo
                            </button>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1rem', paddingLeft: '1rem' }}>
                            {submod.permissions.map((p: any) => (
                              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', backgroundColor: perms[p.id] ? '#f0fdf4' : 'transparent', border: perms[p.id] ? '1px solid #bbf7d0' : '1px transparent solid', transition: 'all 0.2s' }}>
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
                      
                      {mod.id === 'branches' && (
                        <>
                          <div style={{ padding: '1rem', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid var(--pulpos-border)', marginTop: '2rem' }}>
                            <h5 style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--pulpos-primary)' }}>Coordenadas Excepcionales (Home Office / Fuera de Oficina)</h5>
                            <p style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', marginBottom: '1rem' }}>
                              Si el empleado hace Home Office, define aquí sus coordenadas. Esto ignorará las coordenadas de la sucursal al validar el GPS.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Latitud</label>
                                <input type="number" step="any" name="homeLat" defaultValue={editingUser?.homeLat || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }} />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Longitud</label>
                                <input type="number" step="any" name="homeLng" defaultValue={editingUser?.homeLng || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }} />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Radio (mts)</label>
                                <input type="number" step="any" name="homeRadius" defaultValue={editingUser?.homeRadius || ''} placeholder="50" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }} />
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ padding: '1rem', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid var(--pulpos-border)', marginTop: '1rem' }}>
                            <h5 style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--pulpos-primary)' }}>Ubicaciones GPS Permitidas</h5>
                            <p style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', marginBottom: '1rem' }}>
                              Selecciona las ubicaciones adicionales donde este empleado tiene permitido registrar asistencia.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                              {hrLocations?.map((loc: any) => (
                                <label key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={selectedHrLocations.includes(loc.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedHrLocations([...selectedHrLocations, loc.id]);
                                      } else {
                                        setSelectedHrLocations(selectedHrLocations.filter(id => id !== loc.id));
                                      }
                                    }}
                                    style={{ width: '1rem', height: '1rem', accentColor: 'var(--pulpos-primary)' }}
                                  />
                                  <span style={{ fontSize: '0.875rem' }}>{loc.name}</span>
                                </label>
                              ))}
                              {hrLocations?.length === 0 && (
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No hay ubicaciones registradas.</p>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* TAB 2: PERSONALES Y FISCALES */}
          <div style={{ display: activeTab === 'personal' ? 'block' : 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>RFC</label>
                <input type="text" name="rfc" defaultValue={editingUser?.rfc || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>CURP</label>
                <input type="text" name="curp" defaultValue={editingUser?.curp || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>NSS (Seguro Social)</label>
                <input type="text" name="nss" defaultValue={editingUser?.nss || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Régimen Fiscal</label>
                <select name="taxRegime" defaultValue={editingUser?.taxRegime || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }}>
                  <option value="">No Asignado</option>
                  <option value="Sueldos y Salarios">Sueldos y Salarios</option>
                  <option value="Asimilados">Asimilados a Salarios</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Dirección Completa</label>
                <input type="text" name="address" defaultValue={editingUser?.address || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Teléfono Móvil</label>
                <input type="text" name="phone" defaultValue={editingUser?.phone || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Fecha de Nacimiento</label>
                <input type="date" name="birthDate" defaultValue={editingUser?.birthDate ? new Date(editingUser.birthDate).toISOString().split('T')[0] : ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Fecha de Contratación</label>
                <input type="date" name="hireDate" defaultValue={editingUser?.hireDate ? new Date(editingUser.hireDate).toISOString().split('T')[0] : ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }} />
              </div>
            </div>
          </div>

          {/* TAB 3: NÓMINA Y COMISIONES */}
          <div style={{ display: activeTab === 'payroll' ? 'block' : 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Tipo de Nómina</label>
                <select name="payrollType" defaultValue={editingUser?.payrollType || 'QUINCENAL'} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }}>
                  <option value="SEMANAL">Semanal</option>
                  <option value="CATORCENAL">Catorcenal</option>
                  <option value="QUINCENAL">Quincenal</option>
                  <option value="MENSUAL">Mensual</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Salario Diario ($)</label>
                <input type="number" step="0.01" name="dailySalary" defaultValue={editingUser?.dailySalary || 0} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Banco</label>
                <input type="text" name="bankName" defaultValue={editingUser?.bankName || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>CLABE / Cuenta</label>
                <input type="text" name="bankAccount" defaultValue={editingUser?.bankAccount || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }} />
              </div>

              {/* Comisiones Anteriores */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--pulpos-primary)' }}>Puesto Ventas (Comisiones)</label>
                <select name="commissionRole" defaultValue={editingUser?.commissionRole || 'VENDEDOR'} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-primary)', backgroundColor: 'white' }}>
                  <option value="VENDEDOR">Vendedor Base</option>
                  <option value="LIDER_SECUNDARIO">Líder Secundario</option>
                  <option value="LIDER">Líder de Equipo</option>
                  <option value="COORDINADOR">Coordinador General</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#16a34a' }}>% Comisión Ventas (Ej: 0.05)</label>
                <input type="number" step="0.01" min="0" max="1" name="commissionPct" defaultValue={editingUser?.commissionPct || 0} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #16a34a', backgroundColor: 'white' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#16a34a' }}>Meta Mensual Ventas ($)</label>
                <input type="number" step="100" min="0" name="monthlyGoal" defaultValue={editingUser?.monthlyGoal || 0} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #16a34a', backgroundColor: 'white' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#f59e0b' }}>Jefe Inmediato</label>
                <select name="managerId" defaultValue={editingUser?.managerId || 'NONE'} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #f59e0b', backgroundColor: 'white' }}>
                  <option value="NONE">Ninguno / Independiente</option>
                  {potentialManagers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.commissionRole})</option>
                  ))}
                </select>
              </div>

              {/* Bonos de RH */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#8b5cf6' }}>Bono Puntualidad ($)</label>
                <input type="number" step="10" name="bonusPunctuality" defaultValue={editingUser?.bonusPunctuality || 0} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #8b5cf6', backgroundColor: 'white' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.5rem' }}>
                <input type="checkbox" id="deductLunchHour" name="deductLunchHour" defaultChecked={editingUser?.deductLunchHour || false} style={{ marginRight: '0.5rem', width: '1.25rem', height: '1.25rem', accentColor: 'var(--pulpos-primary)' }} />
                <label htmlFor="deductLunchHour" style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--pulpos-text)' }}>Descontar hora de comida de las horas trabajadas</label>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#8b5cf6' }}>Bono Despensa ($)</label>
                <input type="number" step="10" name="groceryBonus" defaultValue={editingUser?.groceryBonus || 0} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #8b5cf6', backgroundColor: 'white' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#8b5cf6' }}>Bono Transporte ($)</label>
                <input type="number" step="10" name="transportBonus" defaultValue={editingUser?.transportBonus || 0} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #8b5cf6', backgroundColor: 'white' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#8b5cf6' }}>Bono Equipo ($)</label>
                <input type="number" step="10" name="teamBonusAmount" defaultValue={editingUser?.teamBonusAmount || 0} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #8b5cf6', backgroundColor: 'white' }} />
              </div>
            </div>
          </div>

          {/* TAB 4: HORARIOS */}
          <div style={{ display: activeTab === 'schedule' ? 'block' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h4 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Horario Laboral</h4>
                <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>Selecciona los días laborables y establece la hora de entrada y salida.</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)' }}>
              {['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'].map(day => {
                const isActive = schedule[day] && schedule[day].length === 2;
                const start = isActive ? schedule[day][0] : "09:00";
                const end = isActive ? schedule[day][1] : "18:00";

                return (
                  <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', backgroundColor: isActive ? 'white' : 'transparent', border: isActive ? '1px solid var(--pulpos-border)' : '1px dashed #cbd5e1', borderRadius: '6px', opacity: isActive ? 1 : 0.6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '120px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={isActive}
                        onChange={(e) => {
                          const newSched = { ...schedule };
                          if (e.target.checked) {
                            newSched[day] = ["09:00", "18:00"];
                          } else {
                            delete newSched[day];
                          }
                          setSchedule(newSched);
                        }}
                        style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--pulpos-primary)' }}
                      />
                      <span style={{ fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#0f172a' : '#64748b' }}>{day}</span>
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                      <input 
                        type="time" 
                        value={start}
                        disabled={!isActive}
                        onChange={(e) => {
                          const newSched = { ...schedule };
                          if (newSched[day]) newSched[day][0] = e.target.value;
                          setSchedule(newSched);
                        }}
                        style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: isActive ? 'white' : '#f1f5f9' }}
                      />
                      <span style={{ color: '#64748b' }}>a</span>
                      <input 
                        type="time" 
                        value={end}
                        disabled={!isActive}
                        onChange={(e) => {
                          const newSched = { ...schedule };
                          if (newSched[day]) newSched[day][1] = e.target.value;
                          setSchedule(newSched);
                        }}
                        style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: isActive ? 'white' : '#f1f5f9' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Campo oculto para enviar el JSON real a la base de datos */}
            <input type="hidden" name="workScheduleMatrix" value={JSON.stringify(schedule)} />
          </div>

          {/* TAB 5: BIOMETRÍA Y SEGURIDAD */}
          <div style={{ display: activeTab === 'biometrics' ? 'block' : 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '1rem', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid var(--pulpos-border)' }}>
                <input type="checkbox" name="reqGps" defaultChecked={editingUser?.reqGps} style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--pulpos-primary)' }} />
                <div>
                  <span style={{ fontSize: '1rem', fontWeight: 'bold', display: 'block' }}>Requerir GPS para Check-in</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>El empleado no podrá registrar asistencia si está fuera de la geocerca de su oficina.</span>
                </div>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '1rem', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid var(--pulpos-border)' }}>
                <input type="checkbox" name="reqPhoto" defaultChecked={editingUser?.reqPhoto} style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--pulpos-primary)' }} />
                <div>
                  <span style={{ fontSize: '1rem', fontWeight: 'bold', display: 'block' }}>Requerir Fotografía (Selfie Check-in)</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>El empleado debe tomarse una foto en tiempo real para verificar su identidad.</span>
                </div>
              </label>

              <div style={{ padding: '1rem', borderRadius: '6px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', marginTop: '1rem' }}>
                <h5 style={{ fontWeight: 'bold', color: '#1d4ed8', marginBottom: '0.5rem' }}>Registro Facial (Reconocimiento Biométrico)</h5>
                <p style={{ fontSize: '0.85rem', color: '#1e3a8a', marginBottom: '1rem' }}>Para que el sistema reconozca automáticamente a este empleado, debe registrar su rostro.</p>
                <label 
                  style={{ display: 'inline-block', padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="user" 
                    onChange={handleBioCapture} 
                    style={{ display: 'none' }} 
                  />
                  📸 {faceDescriptor ? 'Actualizar Registro Facial' : 'Iniciar Registro Facial'}
                </label>
                {bioStatus && (
                  <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', fontWeight: 'bold', color: bioStatus.includes('Error') ? 'var(--error-color)' : 'var(--pulpos-primary)' }}>
                    {bioStatus}
                  </p>
                )}
                {baselinePhoto && (
                  <div style={{ marginTop: '1rem' }}>
                    <img src={baselinePhoto} alt="Baseline" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #2563eb' }} />
                  </div>
                )}
                <input type="hidden" name="faceDescriptor" value={faceDescriptor} />
                <input type="hidden" name="baselinePhoto" value={baselinePhoto} />
                <input type="hidden" name="permissions" value={JSON.stringify(getFlatPermissionsToSave())} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--pulpos-border)' }}>
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
