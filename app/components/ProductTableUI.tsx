'use client';
import React, { useState, memo } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

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
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  const isRealUrl = lower.startsWith('data:image/') || lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('/');
  const isPlaceholder = lower === 'placeholder' || lower === '/placeholder.svg' || lower.endsWith('/placeholders/default.png') || lower.includes('.svg');
  if (!isRealUrl || isPlaceholder) return '';
  return trimmed.replace(/#/g, '%23');
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

  const allSelected = products.length > 0 && products.every(p => selectedIds.includes(p.id));
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null);

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
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
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

      <div style={{ overflowX: 'auto', minHeight: '280px' }}>
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              {showCheckboxes && (
                <th style={{ padding: '0.75rem 0.5rem', width: '36px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: 'var(--caanma-primary)' }}
                  />
                </th>
              )}
              <th style={{ padding: '0.75rem 0.75rem', fontWeight: '700' }}>Producto</th>
              <th style={{ padding: '0.75rem 0.75rem', fontWeight: '700', textAlign: 'center', width: '80px' }}>Stock</th>
              <th style={{ padding: '0.75rem 0.75rem', fontWeight: '700', textAlign: 'right', width: '100px' }}>Precio</th>
              {renderCustomActions && <th style={{ padding: '0.75rem 0.75rem', width: '50px' }}></th>}
            </tr>
          </thead>
          <tbody>
            {products.map(prod => {
              const isSelected = selectedIds.includes(prod.id);
              return (
                <tr 
                  key={prod.id} 
                  style={{ 
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background-color 0.15s ease',
                    backgroundColor: isSelected ? '#f5f3ff' : 'transparent',
                    cursor: onRowClick ? 'pointer' : 'default'
                  }}
                  onClick={() => onRowClick && onRowClick(prod)}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {showCheckboxes && (
                    <td data-label="Seleccionar" style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => onToggleSelect && onToggleSelect(prod.id)}
                        style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: 'var(--caanma-primary)' }}
                      />
                    </td>
                  )}
                  <td data-label="Producto" style={{ padding: '0.65rem 0.75rem' }} className="full-width">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div 
                        style={{ 
                          width: '38px',
                          height: '38px',
                          flexShrink: 0,
                          backgroundColor: '#f8fafc',
                          borderRadius: '10px', 
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
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                          {/* Initials Fallback (Always rendered behind/instead of image) */}
                          <div style={{ 
                            position: 'absolute', 
                            inset: 0, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            backgroundColor: '#f5f3ff',
                            color: '#7c3aed', 
                            fontWeight: 'bold', 
                            fontSize: '0.75rem',
                            zIndex: 1
                          }}>
                            {prod.name.substring(0, 2).toUpperCase()}
                          </div>
                          
                          {/* Product Image (Overlaid with higher z-index) */}
                          {prod.imageUrl && !imageErrors[prod.id] && (
                            <img 
                               src={getFormattedImageUrl(prod.imageUrl)} 
                               alt="" 
                               data-table-img="true"
                               data-prod-id={prod.id}
                               data-initials={prod.name.substring(0, 2).toUpperCase()}
                               onLoad={(e) => {
                                 e.currentTarget.style.opacity = '1';
                                 e.currentTarget.style.visibility = 'visible';
                               }}
                               onError={(e) => {
                                 e.currentTarget.style.display = 'none';
                                 e.currentTarget.style.visibility = 'hidden';
                                 setImageErrors(prev => ({ ...prev, [prod.id]: true }));
                               }}
                               style={{ 
                                 position: 'absolute', 
                                 inset: 0, 
                                 width: '100%', 
                                 height: '100%', 
                                 objectFit: 'cover', 
                                 zIndex: 2,
                                 opacity: 0, // Starts transparent to prevent broken icon flash
                                 visibility: 'hidden', // Hidden by default to suppress broken icon
                                 transition: 'opacity 0.2s ease-in-out'
                               }} 
                            />
                          )}
                        </div>
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.1rem' }}>
                          {onRowClick ? (
                             <div className="font-semibold text-slate-800 text-sm hover:text-purple-600 transition-colors" style={{ wordBreak: 'break-word', overflow: 'hidden' }}>{prod.name}</div>
                          ) : (
                             <Link href={`/productos/${prod.id}`} className="font-semibold text-slate-800 text-sm hover:text-purple-600 transition-colors" style={{ textDecoration: 'none', display: 'block', wordBreak: 'break-word', overflow: 'hidden' }}>
                               {prod.name}
                             </Link>
                          )}
                          {prod.isNonRestockable && (
                            <span 
                              title="Producto no resurtible (Descontinuado o liquidación)"
                              style={{
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                padding: '0.12rem 0.4rem',
                                borderRadius: '5px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                lineHeight: '1',
                                border: '1px solid #fecaca'
                              }}
                            >
                              🚫 No Resurtible
                            </span>
                          )}
                          {(() => {
                            const meliMap = prod.externalMaps?.find((m: any) => m.platform === 'MERCADO_LIBRE');
                            if (!meliMap) return null;
                            const cleanId = meliMap.externalId.replace(/^[A-Z]{3}/, (match: string) => `${match}-`);
                            const meliUrl = `https://articulo.mercadolibre.com.mx/${cleanId}`;
                            
                            return (
                              <a 
                                href={meliUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Ver publicación en Mercado Libre"
                                onClick={e => e.stopPropagation()} // Prevent row click navigation
                                style={{
                                  backgroundColor: '#ffe600',
                                  color: '#2d3277',
                                  fontSize: '0.65rem',
                                  fontWeight: 'bold',
                                  padding: '0.12rem 0.35rem',
                                  borderRadius: '5px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  lineHeight: '1',
                                  border: '1px solid #e6cf00',
                                  textDecoration: 'none',
                                  cursor: 'pointer',
                                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.transform = 'scale(1.08)';
                                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.transform = 'none';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
                                  <path d="M10 14 5 9" />
                                  <path d="m14 6-3-3a3.5 3.5 0 0 0-5 0l-.5.5" />
                                  <path d="m18 10-3 3a3.5 3.5 0 0 1-5 0l-.5-.5" />
                                  <path d="m12 18-5-5" />
                                  <path d="M19 14.5a2.5 2.5 0 0 0 0-5" />
                                  <path d="M14 19.5a2.5 2.5 0 0 0 0-5" />
                                  <path d="m2 17 5-5" />
                                  <path d="m22 7-5 5" />
                                </svg>
                                <span>ML</span>
                              </a>
                            );
                          })()}
                        </div>
                        <div className="text-slate-400 text-xs font-mono mt-0.5">
                          SKU: <span className="text-slate-600">{prod.sku || '-'}</span> | Código: <span className="text-slate-600">{prod.barcode || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td 
                    data-label="Stock" 
                    style={{ 
                      padding: '0.5rem 0.3rem', 
                      textAlign: 'center',
                      position: 'relative'
                    }}
                    onMouseEnter={() => setHoveredProductId(prod.id)}
                    onMouseLeave={() => setHoveredProductId(null)}
                  >
                    {prod.isService ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 whitespace-nowrap">
                        Servicio
                      </span>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${prod.stock > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' : 'bg-rose-50 text-rose-700 border border-rose-200/80'}`}>
                        {prod.stock}
                      </span>
                    )}

                    {/* Premium branch stock breakdown tooltip */}
                    {!prod.isService && hoveredProductId === prod.id && prod.branchStocks && prod.branchStocks.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%) translateY(-8px)',
                        backgroundColor: '#1e293b',
                        color: 'white',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15)',
                        zIndex: 1000,
                        minWidth: '200px',
                        fontSize: '0.75rem',
                        textAlign: 'left',
                        pointerEvents: 'none',
                        border: '1px solid #475569',
                        animation: 'fadeIn 0.15s ease-out'
                      }}>
                        <div style={{ fontWeight: 'bold', borderBottom: '1px solid #475569', paddingBottom: '0.25rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Sucursal</span>
                          <span>Existencia</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {prod.branchStocks.map((bs: any) => (
                            <div key={bs.branchId} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                              <span style={{ color: '#cbd5e1' }}>{bs.branchName}</span>
                              <span style={{ fontWeight: 'bold', color: '#34d399' }}>{bs.stock}</span>
                            </div>
                          ))}
                        </div>
                        {/* Little triangle arrow at the bottom */}
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 0,
                          height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '6px solid #1e293b'
                        }} />
                      </div>
                    )}
                  </td>
                  <td data-label="Precio" style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }} className="font-black text-slate-900 text-sm tabular-nums">
                    {formatCurrency(parseFloat((priceExtractor ? priceExtractor(prod) : prod.price) || 0))}
                  </td>
                  {renderCustomActions && (
                    <td className="no-label" style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      {renderCustomActions(prod)}
                    </td>
                  )}
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={showCheckboxes ? (renderCustomActions ? 5 : 4) : (renderCustomActions ? 4 : 3)} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
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
