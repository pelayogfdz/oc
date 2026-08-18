'use client';

import React, { useState } from 'react';
import { Tag, Edit2, Trash2, Search, Plus, Box, Check, X, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { renameCategory, renameBrand, deleteCategory, deleteBrand } from '@/app/actions/categoryBrand';

interface ItemInfo {
  name: string;
  productCount: number;
}

interface Props {
  initialCategories: ItemInfo[];
  initialBrands: ItemInfo[];
}

export default function CategoriasMarcasClient({ initialCategories, initialBrands }: Props) {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');
  const [categories, setCategories] = useState<ItemInfo[]>(initialCategories);
  const [brands, setBrands] = useState<ItemInfo[]>(initialBrands);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal / Edit state
  const [editingItem, setEditingItem] = useState<{ type: 'category' | 'brand'; oldName: string } | null>(null);
  const [newNameInput, setNewNameInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Filtered lists
  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredBrands = brands.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleStartEdit = (type: 'category' | 'brand', oldName: string) => {
    setEditingItem({ type, oldName });
    setNewNameInput(oldName);
  };

  const handleSaveRename = async () => {
    if (!editingItem || !newNameInput || newNameInput.trim() === '') return;
    if (editingItem.oldName === newNameInput.trim()) {
      setEditingItem(null);
      return;
    }

    setLoading(true);
    try {
      if (editingItem.type === 'category') {
        await renameCategory(editingItem.oldName, newNameInput.trim());
        setCategories(prev => prev.map(c => c.name === editingItem.oldName ? { ...c, name: newNameInput.trim() } : c));
      } else {
        await renameBrand(editingItem.oldName, newNameInput.trim());
        setBrands(prev => prev.map(b => b.name === editingItem.oldName ? { ...b, name: newNameInput.trim() } : b));
      }
      setEditingItem(null);
    } catch (err: any) {
      alert("Error renombrando: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: 'category' | 'brand', name: string, count: number) => {
    const typeLabel = type === 'category' ? 'Categoría' : 'Marca';
    const msg = count > 0
      ? `¿Desasignar la ${typeLabel} "${name}" de ${count} productos?\n\nLos productos NO se eliminarán, solo se borrará su ${typeLabel.toLowerCase()}.`
      : `¿Eliminar la ${typeLabel} "${name}"?`;

    if (!confirm(msg)) return;

    setLoading(true);
    try {
      if (type === 'category') {
        await deleteCategory(name);
        setCategories(prev => prev.filter(c => c.name !== name));
      } else {
        await deleteBrand(name);
        setBrands(prev => prev.filter(b => b.name !== name));
      }
    } catch (err: any) {
      alert("Error eliminando: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Tag size={28} style={{ color: '#2563eb' }} />
          Gestión de Categorías y Marcas
        </h1>
        <p style={{ color: 'var(--caanma-text-muted)', margin: 0, fontSize: '0.95rem' }}>
          Edita el nombre de cualquier categoría o marca para actualizar automáticamente todos los productos vinculados en el catálogo.
        </p>
      </div>

      {/* Main Container */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        
        {/* Navigation Tabs Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => { setActiveTab('categories'); setSearchTerm(''); }}
              style={{
                padding: '1rem 0.5rem',
                border: 'none',
                background: 'none',
                fontWeight: activeTab === 'categories' ? '700' : '500',
                color: activeTab === 'categories' ? '#2563eb' : '#64748b',
                borderBottom: activeTab === 'categories' ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              🏷️ Categorías ({categories.length})
            </button>
            <button
              onClick={() => { setActiveTab('brands'); setSearchTerm(''); }}
              style={{
                padding: '1rem 0.5rem',
                border: 'none',
                background: 'none',
                fontWeight: activeTab === 'brands' ? '700' : '500',
                color: activeTab === 'brands' ? '#2563eb' : '#64748b',
                borderBottom: activeTab === 'brands' ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              ✨ Marcas ({brands.length})
            </button>
          </div>

          {/* Quick Search */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder={`Buscar ${activeTab === 'categories' ? 'categoría' : 'marca'}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Content Table */}
        <div style={{ overflowX: 'auto' }}>
          {activeTab === 'categories' ? (
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: '600' }}>Nombre de Categoría</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: '600', textAlign: 'center' }}>Productos Asignados</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: '600', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat) => (
                  <tr key={cat.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: '600', color: '#1e293b' }}>
                      {cat.name}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                      <Link 
                        href={`/productos?category=${encodeURIComponent(cat.name)}`}
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.35rem', 
                          padding: '0.2rem 0.6rem', 
                          backgroundColor: '#eff6ff', 
                          color: '#1d4ed8', 
                          borderRadius: '999px', 
                          fontWeight: '600',
                          fontSize: '0.8rem',
                          textDecoration: 'none'
                        }}
                      >
                        <Box size={13} /> {cat.productCount} {cat.productCount === 1 ? 'producto' : 'productos'}
                      </Link>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleStartEdit('category', cat.name)}
                          style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#334155', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Edit2 size={13} /> Editar
                        </button>
                        <button
                          onClick={() => handleDelete('category', cat.name, cat.productCount)}
                          style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Trash2 size={13} /> Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCategories.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                      {searchTerm ? 'No se encontraron categorías coincidentes.' : 'No hay categorías registradas.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: '600' }}>Nombre de Marca</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: '600', textAlign: 'center' }}>Productos Asignados</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: '600', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredBrands.map((brand) => (
                  <tr key={brand.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: '600', color: '#1e293b' }}>
                      {brand.name}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                      <span 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.35rem', 
                          padding: '0.2rem 0.6rem', 
                          backgroundColor: '#fefce8', 
                          color: '#a16207', 
                          borderRadius: '999px', 
                          fontWeight: '600',
                          fontSize: '0.8rem'
                        }}
                      >
                        <Box size={13} /> {brand.productCount} {brand.productCount === 1 ? 'producto' : 'productos'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleStartEdit('brand', brand.name)}
                          style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#334155', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Edit2 size={13} /> Editar
                        </button>
                        <button
                          onClick={() => handleDelete('brand', brand.name, brand.productCount)}
                          style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Trash2 size={13} /> Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredBrands.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                      {searchTerm ? 'No se encontraron marcas coincidentes.' : 'No hay marcas registradas.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Modal Overlay */}
      {editingItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a' }}>
              Editar {editingItem.type === 'category' ? 'Categoría' : 'Marca'}
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#64748b' }}>
              Al modificar este nombre, se actualizarán dinámicamente todos los productos asignados a "{editingItem.oldName}".
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                Nuevo Nombre:
              </label>
              <input
                type="text"
                value={newNameInput}
                onChange={e => setNewNameInput(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                disabled={loading}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveRename}
                disabled={loading}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: '600', cursor: loading ? 'wait' : 'pointer' }}
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
