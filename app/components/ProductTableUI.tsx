'use client';
import React, { useState, memo } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
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

const getFormattedImageUrl = (url: string | null) => {
  if (!url) return '';
  return url.replace(/#/g, '%23');
};

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
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const checkImages = () => {
      const imgs = document.querySelectorAll('img[data-table-img="true"]') as NodeListOf<HTMLImageElement>;
      setImageErrors(prev => {
        let hasChanges = false;
        const next = { ...prev };
        imgs.forEach(img => {
          const prodId = img.getAttribute('data-prod-id');
          if (prodId && !next[prodId]) {
            if (img.complete && img.naturalWidth === 0) {
              next[prodId] = true;
              hasChanges = true;
            }
          }
        });
        return hasChanges ? next : prev;
      });
    };

    checkImages();

    const handleError = (e: ErrorEvent) => {
      const target = e.target as HTMLImageElement;
      if (target && target.tagName === 'IMG' && target.getAttribute('data-table-img') === 'true') {
        const prodId = target.getAttribute('data-prod-id');
        if (prodId) {
          setImageErrors(prev => prev[prodId] ? prev : { ...prev, [prodId]: true });
        }
      }
    };

    window.addEventListener('error', handleError, true);

    const timer1 = setTimeout(checkImages, 500);
    const timer2 = setTimeout(checkImages, 1500);
    const timer3 = setTimeout(checkImages, 3000);

    return () => {
      window.removeEventListener('error', handleError, true);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [products]);

  React.useEffect(() => {
    if (!zoomImageUrl) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomImageUrl(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomImageUrl]);

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Premium Zoom Modal Overlay */}
      {zoomImageUrl && (
        <div 
          onClick={() => setZoomImageUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '1.5rem',
              maxWidth: '90vw',
              maxHeight: '90vh',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <button
              onClick={() => setZoomImageUrl(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                border: 'none',
                background: 'rgba(241, 245, 249, 0.8)',
                borderRadius: '999px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#ef4444';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'rgba(241, 245, 249, 0.8)';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <X size={18} />
            </button>
            <img 
              src={getFormattedImageUrl(zoomImageUrl)} 
              alt="Zoomed Product" 
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '8px',
                marginTop: '12px'
              }} 
            />
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
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
                    <td data-label="Seleccionar" style={{ padding: '1rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => onToggleSelect && onToggleSelect(prod.id)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--pulpos-primary)' }}
                      />
                    </td>
                  )}
                  <td data-label="Producto" style={{ padding: '1rem' }} className="full-width">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div 
                        style={{ 
                          width: '40px', 
                          height: '40px', 
                          flexShrink: 0, 
                          backgroundColor: '#f1f5f9', 
                          borderRadius: '8px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          overflow: 'hidden',
                          border: '1px solid #e2e8f0',
                          transition: 'all 0.2s ease',
                          cursor: prod.imageUrl && !imageErrors[prod.id] ? 'pointer' : 'default'
                        }}
                        onMouseEnter={e => {
                          if (prod.imageUrl && !imageErrors[prod.id]) {
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
                          }
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        onClick={(e) => {
                          if (prod.imageUrl && !imageErrors[prod.id]) {
                            e.stopPropagation();
                            setZoomImageUrl(prod.imageUrl);
                          }
                        }}
                      >
                         {prod.imageUrl && !imageErrors[prod.id] ? (
                            <img 
                              ref={img => {
                                if (img && img.complete && img.naturalWidth === 0) {
                                  setImageErrors(prev => prev[prod.id] ? prev : { ...prev, [prod.id]: true });
                                }
                              }}
                              src={getFormattedImageUrl(prod.imageUrl)} 
                              alt={prod.name} 
                              data-table-img="true"
                              data-prod-id={prod.id}
                              onError={() => setImageErrors(prev => ({ ...prev, [prod.id]: true }))}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                         ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff', color: '#3b82f6', fontWeight: 'bold', fontSize: '0.8rem' }}>
                              {prod.name.substring(0, 2).toUpperCase()}
                            </div>
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
                  <td data-label="Stock" style={{ padding: '1rem', textAlign: 'center' }}>
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
                  <td data-label="Categoría" style={{ padding: '1rem', color: '#64748b', textAlign: 'center' }}>
                    {prod.category?.toUpperCase() || 'GENERAL'}
                  </td>
                  <td data-label="Precio" style={{ padding: '1rem', color: '#64748b', textAlign: 'right', fontWeight: 'bold' }}>
                    ${parseFloat((priceExtractor ? priceExtractor(prod) : prod.price) || 0).toFixed(2)}
                  </td>
                  {renderCustomActions && (
                    <td className="no-label" style={{ padding: '1rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
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
