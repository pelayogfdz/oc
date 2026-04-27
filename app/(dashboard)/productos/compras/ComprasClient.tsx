'use client';

import { useState } from 'react';
import { ShoppingCart, Calendar, Store, CreditCard, LayoutGrid, List, Search, MoreVertical } from 'lucide-react';
import Link from 'next/link';

export default function ComprasClient({ initialPurchases }: { initialPurchases: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const filteredPurchases = initialPurchases.filter(purchase => {
    const term = searchTerm.toLowerCase();
    const idMatch = purchase.id.toLowerCase().includes(term);
    const supplierMatch = (purchase.supplier?.name || '').toLowerCase().includes(term);
    return idMatch || supplierMatch;
  });

  return (
    <div style={{ fontFamily: 'var(--font-geist-sans)' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '600px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--pulpos-text-muted)' }} />
          <input 
            type="text" 
            placeholder="🔍 Buscar compra por folio o proveedor..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '0.8rem 1.5rem 0.8rem 2.5rem', width: '100%', borderRadius: '999px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white', fontSize: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
          <button 
            onClick={() => setViewMode('grid')}
            style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'grid' ? 'white' : 'transparent', color: viewMode === 'grid' ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)', boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            <LayoutGrid size={20} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'list' ? 'white' : 'transparent', color: viewMode === 'list' ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {filteredPurchases.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--pulpos-text-muted)', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed var(--pulpos-border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <ShoppingCart size={64} color="#e2e8f0" />
            <p style={{ fontSize: '1.2rem', fontWeight: '500' }}>No se encontraron órdenes de compra.</p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {filteredPurchases.map(purchase => (
            <div key={purchase.id} style={{ 
              backgroundColor: 'white', 
              borderRadius: '16px', 
              border: '1px solid var(--pulpos-border)', 
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}
            >
              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--pulpos-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                   <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                     <ShoppingCart size={14} /> #{purchase.id.substring(0,8).toUpperCase()}
                   </div>
                   <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.25rem', color: '#1e293b' }}>
                     {purchase.supplier?.name || 'Proveedor General'}
                   </h3>
                </div>
                <div style={{ position: 'relative' }}>
                  <button 
                    onClick={() => setOpenDropdownId(openDropdownId === purchase.id ? null : purchase.id)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--pulpos-text-muted)' }}
                  >
                    <MoreVertical size={20} />
                  </button>
                  {openDropdownId === purchase.id && (
                    <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem', backgroundColor: 'white', border: '1px solid var(--pulpos-border)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 20, width: '150px', overflow: 'hidden' }}>
                      <Link href={`/productos/compras/${purchase.id}`} style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--pulpos-text)', fontSize: '0.9rem' }}>Ver Detalle</Link>
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ padding: '1.25rem', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--pulpos-text-muted)' }}>
                  <Calendar size={16} /> {new Date(purchase.createdAt).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--pulpos-text-muted)' }}>
                  <Store size={16} /> {purchase.branch?.name || 'Central'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--pulpos-text-muted)' }}>
                  <CreditCard size={16} /> 
                  {
                    purchase.paymentMethod === 'CASH' ? 'Efectivo' :
                    purchase.paymentMethod === 'CARD' ? 'Tarjeta' :
                    purchase.paymentMethod === 'TRANSFER' ? 'Transferencia' :
                    purchase.paymentMethod === 'CREDIT' ? 'Crédito CxP' :
                    purchase.paymentMethod
                  }
                </div>
                {purchase.paymentMethod === 'CREDIT' && (
                  <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 'bold' }}>
                    Deuda: ${purchase.balanceDue?.toFixed(2)}
                  </div>
                )}
              </div>
              
              <div style={{ padding: '1rem 1.25rem', backgroundColor: '#f8fafc', borderTop: '1px solid var(--pulpos-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>{purchase.items?.length || 0} artículos</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--pulpos-primary)' }}>
                  ${purchase.total?.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
             <thead>
              <tr style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Folio / Fecha</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Proveedor</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Sucursal</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Forma de Pago</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Artículos</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map(purchase => (
                <tr key={purchase.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td data-label="Folio / Fecha" style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold', fontFamily: 'monospace', color: '#1e293b' }}>#{purchase.id.substring(0,8).toUpperCase()}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <Calendar size={12} /> {new Date(purchase.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td data-label="Proveedor" style={{ padding: '1rem', fontWeight: 'bold', color: '#1e293b' }}>
                    {purchase.supplier?.name || 'General / Varios'}
                  </td>
                  <td data-label="Sucursal" style={{ padding: '1rem', color: 'var(--pulpos-text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                       <Store size={14} /> {purchase.branch?.name || 'Central'}
                    </div>
                  </td>
                  <td data-label="Forma de Pago" style={{ padding: '1rem' }}>
                    <span style={{ 
                      backgroundColor: purchase.paymentMethod === 'CREDIT' ? '#fee2e2' : '#f1f5f9', 
                      color: purchase.paymentMethod === 'CREDIT' ? '#b91c1c' : '#475569',
                      padding: '0.35rem 0.75rem', 
                      borderRadius: '8px', 
                      fontSize: '0.85rem', 
                      fontWeight: 'bold',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CreditCard size={14}/> {
                        purchase.paymentMethod === 'CASH' ? 'Efectivo' :
                        purchase.paymentMethod === 'CARD' ? 'Tarjeta' :
                        purchase.paymentMethod === 'TRANSFER' ? 'Transferencia' :
                        purchase.paymentMethod === 'CREDIT' ? 'Crédito CxP' :
                        purchase.paymentMethod
                      }
                    </span>
                  </td>
                  <td data-label="Artículos" style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: '500' }}>
                    {purchase.items?.length || 0} líneas
                  </td>
                  <td data-label="Total" style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--pulpos-primary)' }}>
                    ${purchase.total?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
