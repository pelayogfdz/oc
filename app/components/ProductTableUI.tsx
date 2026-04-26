'use client';
import React, { useState, memo } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

interface ProductTableUIProps {
  products: any[];
  showCheckboxes?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onRowClick?: (product: any) => void;
  // Options for customization if needed by other modules
  renderCustomActions?: (product: any) => React.ReactNode;
  priceExtractor?: (product: any) => number;
}

const ProductTableUI = memo(function ProductTableUI({
  products,
  showCheckboxes = true,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  renderCustomActions,
  priceExtractor
}: ProductTableUIProps) {

  const allSelected = products.length > 0 && selectedIds.length === products.length;

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafafa', color: '#1e293b' }}>
              {showCheckboxes && (
                <th style={{ padding: '1rem', width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--pulpos-primary)' }}
                  />
                </th>
              )}
              <th style={{ padding: '1rem', fontWeight: 'bold' }}>Producto</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'center' }}>Stock</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'center' }}>Categoría</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'right' }}>Precio</th>
              {renderCustomActions && <th style={{ padding: '1rem' }}></th>}
            </tr>
          </thead>
          <tbody>
            {products.map(prod => {
              const isSelected = selectedIds.includes(prod.id);
              return (
                <tr 
                  key={prod.id} 
                  style={{ 
                    borderBottom: '1px solid #e2e8f0', 
                    transition: 'background-color 0.2s',
                    backgroundColor: isSelected ? '#f0fdf4' : 'transparent',
                    cursor: onRowClick ? 'pointer' : 'default'
                  }}
                  onClick={() => onRowClick && onRowClick(prod)}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {showCheckboxes && (
                    <td style={{ padding: '1rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => onToggleSelect && onToggleSelect(prod.id)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--pulpos-primary)' }}
                      />
                    </td>
                  )}
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', flexShrink: 0, backgroundColor: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {prod.imageUrl ? (
                           <img src={prod.imageUrl} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                           <ImageIcon size={20} color="#cbd5e1" />
                        )}
                      </div>
                      <div>
                        {onRowClick ? (
                           <div style={{ color: '#0ea5e9', fontWeight: '500', marginBottom: '0.2rem', fontSize: '0.95rem' }}>{prod.name}</div>
                        ) : (
                           <Link href={`/productos/${prod.id}`} style={{ color: '#0ea5e9', fontWeight: '500', textDecoration: 'none', marginBottom: '0.2rem', display: 'block', fontSize: '0.95rem' }}>
                             {prod.name}
                           </Link>
                        )}
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{prod.sku || prod.barcode || 'Sin SKU'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ 
                      backgroundColor: prod.stock > 0 ? '#dcfce7' : '#fee2e2', 
                      color: prod.stock > 0 ? '#16a34a' : '#dc2626',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '999px',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      whiteSpace: 'nowrap'
                    }}>
                      {prod.stock} {prod.unit || 'piezas'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#64748b', textAlign: 'center' }}>
                    {prod.category?.toUpperCase() || 'GENERAL'}
                  </td>
                  <td style={{ padding: '1rem', color: '#64748b', textAlign: 'right' }}>
                    ${parseFloat((priceExtractor ? priceExtractor(prod) : prod.price) || 0).toFixed(2)}
                  </td>
                  {renderCustomActions && (
                    <td style={{ padding: '1rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      {renderCustomActions(prod)}
                    </td>
                  )}
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={showCheckboxes ? (renderCustomActions ? 6 : 5) : (renderCustomActions ? 5 : 4)} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  No se encontraron productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default ProductTableUI;
