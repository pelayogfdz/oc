'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Trash2, FileText, Search } from 'lucide-react';
import { deleteEntity } from '@/app/actions/crud';

import { useOfflineSync } from '@/app/components/OfflineSyncProvider';

interface ClientesTableProps {
  initialCustomers: any[];
}

export default function ClientesTable({ initialCustomers }: ClientesTableProps) {
  const router = useRouter();
  const { isOnline } = useOfflineSync();
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<any[]>(initialCustomers);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // Sync state if initialCustomers changes
  useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  // Reset pagination on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Load customers from IndexedDB if offline on mount
  useEffect(() => {
    const loadOfflineCustomers = async () => {
      if (typeof window !== 'undefined' && !isOnline) {
        try {
          const { db } = await import('@/lib/offlineDB');
          const localCustomers = await db.customers.toArray();
          setCustomers(localCustomers);
        } catch (err) {
          console.error('[Offline] Failed to load local customers:', err);
        }
      }
    };
    loadOfflineCustomers();
  }, [isOnline]);

  const handleDelete = async (id: string) => {
    if (!isOnline) {
      alert('No es posible eliminar registros en modo offline. Por favor, conéctate a internet para realizar esta acción.');
      return;
    }
    if (confirm('¿Estás seguro de eliminar este cliente?')) {
      await deleteEntity('customer', id);
      router.refresh();
    }
  };

  const filteredCustomers = customers.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      (item.taxId && item.taxId.toLowerCase().includes(term)) ||
      (item.email && item.email.toLowerCase().includes(term)) ||
      (item.phone && item.phone.includes(term))
    );
  });

  const totalPages = Math.ceil(filteredCustomers.length / pageSize);
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="card" style={{ padding: 0, width: '100%', maxWidth: '100%', height: 'auto', overflow: 'hidden' }}>
      {/* Search Input */}
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--caanma-border)', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
          <Search
             size={18}
             style={{
               position: 'absolute',
               left: '0.75rem',
               top: '50%',
               transform: 'translateY(-50%)',
               color: '#64748b',
               pointerEvents: 'none'
             }}
          />
          <input
            type="text"
            placeholder="Buscar por nombre, RFC, teléfono o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 1rem 0.625rem 2.25rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: 'white',
              transition: 'border-color 0.2s',
            }}
          />
        </div>
        {searchTerm && (
          <div style={{ marginLeft: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
            Encontrados: <strong>{filteredCustomers.length}</strong> de {customers.length}
          </div>
        )}
      </div>

      <div className="table-responsive">
        <table className="responsive-table" style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--caanma-border)' }}>Cliente</th>
              <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--caanma-border)' }}>Contacto</th>
              <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--caanma-border)' }}>Deuda Total</th>
              <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--caanma-border)' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCustomers.map((item: any) => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                <td data-label="Cliente" style={{ padding: '0.4rem 0.75rem' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#0f172a' }}>{item.name}</div>
                  {item.taxId && <div style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', marginTop: '0.25rem' }}>RFC: {item.taxId}</div>}
                </td>
                <td data-label="Contacto" style={{ padding: '0.4rem 0.75rem', color: '#475569', fontSize: '0.9rem' }}>
                  <div>{item.email || '- Sin Correo -'}</div>
                  <div style={{ marginTop: '0.25rem' }}>{item.phone || '- Sin Teléfono -'}</div>
                </td>
                <td data-label="Deuda Total" style={{ padding: '0.4rem 0.75rem', fontWeight: 'bold', color: item.creditBalance > 0 ? '#ef4444' : '#10b981' }}>
                  ${Math.max(0, item.creditBalance || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </td>
                <td data-label="Acciones" style={{ padding: '0.4rem 0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Link href={`/clientes/${item.id}`} style={{ backgroundColor: 'white', color: '#475569', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <User size={16} /> Ver Perfil
                    </Link>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem' }}
                    >
                      <Trash2 size={16}/> 
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '4rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                  <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  {customers.length === 0 ? 'No tienes clientes registrados aún.' : 'No se encontraron clientes que coincidan con tu búsqueda.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderTop: '1px solid var(--caanma-border)', backgroundColor: '#f8fafc', fontSize: '0.85rem', color: '#64748b' }}>
          <div>
            Mostrando <strong>{((currentPage - 1) * pageSize) + 1}</strong> a <strong>{Math.min(currentPage * pageSize, filteredCustomers.length)}</strong> de <strong>{filteredCustomers.length}</strong> registros
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: 'white',
                cursor: currentPage === 1 ? 'default' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1,
                fontWeight: 'bold',
                color: '#475569',
                outline: 'none'
              }}
            >
              Anterior
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontWeight: 500 }}>
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: 'white',
                cursor: currentPage === totalPages ? 'default' : 'pointer',
                opacity: currentPage === totalPages ? 0.5 : 1,
                fontWeight: 'bold',
                color: '#475569',
                outline: 'none'
              }}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
