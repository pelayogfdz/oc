'use client';

import { useState } from 'react';
import { MapPin, Edit, Trash2 } from 'lucide-react';
import { updateBranch, deleteBranch } from '@/app/actions/branch';

export default function BranchClient({ branches, currentBranchId }: { branches: any[], currentBranchId: string }) {
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessing(true);
    const formData = new FormData(e.currentTarget);
    try {
      await updateBranch(
        editingBranch.id, 
        formData.get('name') as string, 
        formData.get('location') as string,
        formData.get('facturapiLiveKey') as string,
        formData.get('facturapiTestKey') as string,
        formData.get('lat') ? parseFloat(formData.get('lat') as string) : undefined,
        formData.get('lng') ? parseFloat(formData.get('lng') as string) : undefined,
        formData.get('radius') ? parseFloat(formData.get('radius') as string) : undefined
      );
      setEditingBranch(null);
    } catch (err: any) {
      alert("Error al actualizar la sucursal.");
    }
    setIsProcessing(false);
  };

  const handleDelete = async (id: string) => {
    setIsProcessing(true);
    try {
      await deleteBranch(id);
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert(err.message || "Error al eliminar la sucursal.");
    }
    setIsProcessing(false);
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {branches.map(b => (
          <div key={b.id} style={{ border: b.id === currentBranchId ? '2px solid var(--pulpos-primary)' : '1px solid var(--pulpos-border)', borderRadius: '8px', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            {b.id === currentBranchId && (
              <div style={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'var(--pulpos-primary)', color: 'white', fontSize: '0.65rem', padding: '0.25rem 0.5rem', borderBottomLeftRadius: '8px', fontWeight: 'bold' }}>
                ACTIVA (TÚ)
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>{b.name}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setEditingBranch(b)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                  title="Editar"
                >
                  <Edit size={16} />
                </button>
                {b.id !== currentBranchId && (
                  <button 
                    onClick={() => setDeleteConfirmId(b.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pulpos-text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <MapPin size={14} /> {b.location || 'Sin ubicación específica'}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--pulpos-border)', paddingTop: '1rem', fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>
              <div><strong>{b._count.users}</strong> Empleados</div>
              <div><strong>{b._count.products}</strong> Productos</div>
            </div>
          </div>
        ))}
      </div>

      {editingBranch && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '400px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Editar Sucursal</h2>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Nombre</label>
                <input type="text" name="name" defaultValue={editingBranch.name} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Ubicación</label>
                <input type="text" name="location" defaultValue={editingBranch.location} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
              </div>

              <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--pulpos-border)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--pulpos-primary)' }}>Coordenadas GPS (Asistencia)</h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Latitud</label>
                    <input type="number" step="any" name="lat" defaultValue={editingBranch.hrLocation?.lat || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Longitud</label>
                    <input type="number" step="any" name="lng" defaultValue={editingBranch.hrLocation?.lng || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Radio (mts)</label>
                    <input type="number" step="any" name="radius" defaultValue={editingBranch.hrLocation?.radius || 50} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--pulpos-border)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--pulpos-primary)' }}>Configuración de Emisión SAT (Facturapi)</h3>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Llave Pública Dinámica (Test Key)</label>
                  <input type="text" name="facturapiTestKey" 
                    defaultValue={(() => {
                      try { return JSON.parse(editingBranch.settings?.configJson || '{}').facturacion?.testKey || '' } catch(e) { return '' }
                    })()} 
                    placeholder="sk_test_..." 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Llave Privada (Live Key)</label>
                  <input type="password" name="facturapiLiveKey" 
                    defaultValue={(() => {
                      try { return JSON.parse(editingBranch.settings?.configJson || '{}').facturacion?.liveKey || '' } catch(e) { return '' }
                    })()} 
                    placeholder="sk_live_..." 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setEditingBranch(null)} style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--pulpos-border)', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isProcessing} className="btn-primary" style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', opacity: isProcessing ? 0.5 : 1 }}>
                  {isProcessing ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '400px', padding: '2rem', textAlign: 'center' }}>
            <Trash2 size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>¿Archivar Sucursal?</h2>
            <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Esta acción archivará esta sucursal y la ocultará del panel principal. El inventario actual y el historial de ventas seguirán asociados de forma segura para no corromper la bitácora financiera.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--pulpos-border)', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button 
                onClick={() => handleDelete(deleteConfirmId)} 
                disabled={isProcessing}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', opacity: isProcessing ? 0.5 : 1 }}
              >
                {isProcessing ? 'Archivando...' : 'Sí, Archivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
