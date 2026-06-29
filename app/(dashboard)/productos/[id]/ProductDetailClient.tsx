'use client';

import { useState, useTransition, useEffect } from 'react';
import { adjustInventory } from '@/app/actions/inventory';
import { createVariant, deleteVariant } from '@/app/actions/variant';
import { createBatch, deleteBatch } from '@/app/actions/batch';
import { Truck, Image as ImageIcon, X } from 'lucide-react';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';
import { useRouter } from 'next/navigation';

const getFormattedImageUrl = (url: string | null) => {
  if (!url) return '';
  return url.replace(/#/g, '%23');
};

// ProductDetailClient handles the tab navigation state
export function ProductDetailClient({ 
  product, 
  movements, 
  sales,
  variants,
  batches,
  siblingProducts,
  mediaContent,
  tenantId,
  children
}: { 
  product: any, 
  movements: any[], 
  sales: any[],
  variants?: any[],
  batches?: any[],
  siblingProducts?: any[],
  mediaContent?: React.ReactNode,
  tenantId?: string,
  children: React.ReactNode
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('details');
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [headerImageError, setHeaderImageError] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<any | null>(null);
  const { pushOfflineProduct } = useOfflineSync();

  const handleMovementClick = (mov: any) => {
    if (mov.detailUrl) {
      router.push(mov.detailUrl);
    } else {
      setSelectedMovement(mov);
    }
  };

  useEffect(() => {
    const handleFormSubmit = async (e: SubmitEvent) => {
      if (!navigator.onLine) {
        const form = e.target as HTMLFormElement;
        const skuInput = form.querySelector('input[name="sku"]');
        if (skuInput) {
          e.preventDefault();
          e.stopPropagation();
          
          const formData = new FormData(form);
          const productParams: any = {};
          formData.forEach((value, key) => {
            productParams[key] = value;
          });
          
          productParams.productId = product.id;
          
          productParams.allowProduction = formData.get('allowProduction') === 'true';
          productParams.isProductionInput = formData.get('isProductionInput') === 'true';
          productParams.isActive = formData.get('isActive') !== 'false';
          
          await pushOfflineProduct(productParams);
          window.location.href = '/productos';
        }
      }
    };

    window.addEventListener('submit', handleFormSubmit, true);
    return () => window.removeEventListener('submit', handleFormSubmit, true);
  }, [product.id, pushOfflineProduct]);

  useEffect(() => {
    const checkImage = () => {
      const img = document.querySelector('img[data-header-img="true"]') as HTMLImageElement | null;
      if (img && img.complete && img.naturalWidth === 0) {
        setHeaderImageError(true);
      }
    };

    checkImage();

    const handleError = (e: ErrorEvent) => {
      const target = e.target as HTMLImageElement;
      if (target && target.tagName === 'IMG' && target.getAttribute('data-header-img') === 'true') {
        setHeaderImageError(true);
      }
    };

    window.addEventListener('error', handleError, true);

    const timer1 = setTimeout(checkImage, 500);
    const timer2 = setTimeout(checkImage, 1500);
    const timer3 = setTimeout(checkImage, 3000);

    return () => {
      window.removeEventListener('error', handleError, true);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [product.imageUrl]);

  useEffect(() => {
    if (!zoomImageUrl) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomImageUrl(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomImageUrl]);

  useEffect(() => {
    const serviceCheckbox = document.getElementById('isService') as HTMLInputElement | null;
    const showInWebCheckbox = document.getElementById('showInWeb') as HTMLInputElement | null;
    const isTargetTenant = tenantId === '8b52cbcd-c956-4717-a1bd-02e57386aaa2' || tenantId === 'db5d3949-f8dd-41f6-9627-90374d55d044';

    const toggleFields = (isInitial = false) => {
      if (!serviceCheckbox) return;
      const isService = serviceCheckbox.checked;
      const minStockInput = document.querySelector('input[name="minStock"]') as HTMLInputElement | null;
      const expirationDateInput = document.querySelector('input[name="expirationDate"]') as HTMLInputElement | null;
      
      if (isService) {
        if (minStockInput) {
          minStockInput.value = '0';
          minStockInput.disabled = true;
        }
        if (expirationDateInput) {
          expirationDateInput.value = '';
          expirationDateInput.disabled = true;
        }
        if (!isInitial && isTargetTenant && showInWebCheckbox) {
          showInWebCheckbox.checked = false;
        }
      } else {
        if (minStockInput) minStockInput.disabled = false;
        if (expirationDateInput) expirationDateInput.disabled = false;
        if (!isInitial && isTargetTenant && showInWebCheckbox) {
          showInWebCheckbox.checked = true;
        }
      }
    };

    const handleServiceChange = () => toggleFields(false);

    if (serviceCheckbox) {
      serviceCheckbox.addEventListener('change', handleServiceChange);
      // Run initially without overriding the saved showInWeb database value
      toggleFields(true);
    }

    return () => {
      if (serviceCheckbox) {
        serviceCheckbox.removeEventListener('change', handleServiceChange);
      }
    };
  }, [activeTab, tenantId]);

  const handleAdjustmentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('productId', product.id);
    
    startTransition(async () => {
      try {
        await adjustInventory(formData);
        setShowAdjustForm(false);
      } catch(err) {
        alert(String(err));
      }
    });
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .kardex-row:hover {
          background-color: #f8fafc;
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

      {/* Premium Product Header Card with Image */}
      <div 
        className="card" 
        style={{ 
          display: 'flex', 
          gap: '2rem', 
          padding: '1.5rem', 
          marginBottom: '1.5rem', 
          alignItems: 'center', 
          background: 'linear-gradient(to right, #ffffff, #f8fafc)', 
          border: '1px solid var(--caanma-border)',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          flexWrap: 'wrap'
        }}
      >
        <div 
          onClick={() => {
            if (product.imageUrl && !headerImageError) {
              setZoomImageUrl(product.imageUrl);
            }
          }}
          style={{ 
            width: '120px', 
            height: '120px', 
            backgroundColor: '#f8fafc', 
            border: '1px solid var(--caanma-border)', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            overflow: 'hidden', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', 
            flexShrink: 0, 
            cursor: product.imageUrl && !headerImageError ? 'pointer' : 'default',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            if (product.imageUrl && !headerImageError) {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
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
              backgroundColor: '#eff6ff', 
              color: '#3b82f6', 
              fontWeight: 'bold', 
              fontSize: '2rem',
              zIndex: 1
            }}>
              {product.name.substring(0, 2).toUpperCase()}
            </div>
            
            {/* Product Image (Overlaid with higher z-index) */}
            {product.imageUrl && !headerImageError && (
              <img 
                src={getFormattedImageUrl(product.imageUrl)} 
                alt="" 
                data-header-img="true"
                data-initials={product.name.substring(0, 2).toUpperCase()}
                onLoad={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.visibility = 'visible';
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.style.visibility = 'hidden';
                  setHeaderImageError(true);
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--caanma-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {product.category || 'General'}
          </span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
            {product.name}
          </h2>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.9rem', color: '#64748b', marginTop: '0.25rem' }}>
            <span><strong>SKU:</strong> {product.sku}</span>
            {product.barcode && <span><strong>Código de Barras:</strong> {product.barcode}</span>}
            <span><strong>Existencia:</strong> {product.isService ? (
              <span style={{ color: '#2563eb', fontWeight: '600', backgroundColor: '#dbeafe', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Servicio</span>
            ) : (
              <span style={{ color: product.stock > 0 ? '#16a34a' : '#dc2626', fontWeight: '600' }}>{product.stock} {product.unit || 'pzas'}</span>
            )}</span>
            <span><strong>Precio Normal:</strong> <span style={{ color: '#0f172a', fontWeight: 'bold' }}>${parseFloat(product.price || 0).toFixed(2)}</span></span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem 2rem', flexWrap: 'wrap', borderBottom: '1px solid var(--caanma-border)', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setActiveTab('details')}
          style={{ 
            padding: '0.75rem 0', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'details' ? '2px solid var(--caanma-primary)' : '2px solid transparent',
            color: activeTab === 'details' ? 'var(--caanma-primary)' : 'var(--caanma-text)',
            fontWeight: activeTab === 'details' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Editar Detalles
        </button>
        {!product.isService && (
          <button 
            onClick={() => setActiveTab('kardex')}
            style={{ 
              padding: '0.75rem 0', 
              background: 'none', 
              border: 'none', 
              borderBottom: activeTab === 'kardex' ? '2px solid var(--caanma-primary)' : '2px solid transparent',
              color: activeTab === 'kardex' ? 'var(--caanma-primary)' : 'var(--caanma-text)',
              fontWeight: activeTab === 'kardex' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Movimientos (Kardex)
          </button>
        )}
        <button 
          onClick={() => setActiveTab('media')}
          style={{ 
            padding: '0.75rem 0', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'media' ? '2px solid var(--caanma-primary)' : '2px solid transparent',
            color: activeTab === 'media' ? 'var(--caanma-primary)' : 'var(--caanma-text)',
            fontWeight: activeTab === 'media' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Multimedia y Videos
        </button>
        <button 
          onClick={() => setActiveTab('sales')}
          style={{ 
            padding: '0.75rem 0', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'sales' ? '2px solid var(--caanma-primary)' : '2px solid transparent',
            color: activeTab === 'sales' ? 'var(--caanma-primary)' : 'var(--caanma-text)',
            fontWeight: activeTab === 'sales' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Historial de Ventas
        </button>
        {!product.isService && (
          <button 
            onClick={() => setActiveTab('variants')}
            style={{ 
              padding: '0.75rem 0', 
              background: 'none', 
              border: 'none', 
              borderBottom: activeTab === 'variants' ? '2px solid var(--caanma-primary)' : '2px solid transparent',
              color: activeTab === 'variants' ? 'var(--caanma-primary)' : 'var(--caanma-text)',
              fontWeight: activeTab === 'variants' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Variantes (Tallas)
          </button>
        )}
        {!product.isService && (
          <button 
            onClick={() => setActiveTab('omnichannel')}
            style={{ 
              padding: '0.75rem 0', 
              background: 'none', 
              border: 'none', 
              borderBottom: activeTab === 'omnichannel' ? '2px solid var(--caanma-primary)' : '2px solid transparent',
              color: activeTab === 'omnichannel' ? 'var(--caanma-primary)' : 'var(--caanma-text)',
              fontWeight: activeTab === 'omnichannel' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Existencias por Sucursal
          </button>
        )}
        {!product.isService && (
          <button 
            onClick={() => setActiveTab('batches')}
            style={{ 
              padding: '0.75rem 0', 
              background: 'none', 
              border: 'none', 
              borderBottom: activeTab === 'batches' ? '2px solid var(--caanma-primary)' : '2px solid transparent',
              color: activeTab === 'batches' ? 'var(--caanma-primary)' : 'var(--caanma-text)',
              fontWeight: activeTab === 'batches' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Lotes y Caducidades
          </button>
        )}
      </div>

      <div style={{ display: activeTab === 'details' ? 'block' : 'none' }}>
        {children}
      </div>

      {mediaContent && (
        <div style={{ display: activeTab === 'media' ? 'block' : 'none' }}>
          {mediaContent}
        </div>
      )}

      {activeTab === 'kardex' && (() => {
        // Pre-calculate running balance working backwards from current stock
        let currentBalance = product.stock;
        const movementsWithBalance = movements.map((mov) => {
          const balanceAfter = currentBalance;
          currentBalance = currentBalance - mov.quantity;
          return {
            ...mov,
            runningBalance: balanceAfter
          };
        });

        return (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Movimientos Recientes</h2>
              <button onClick={() => setShowAdjustForm(!showAdjustForm)} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                {showAdjustForm ? 'Cancelar Ajuste' : '+ Nuevo Ajuste'}
              </button>
            </div>
            
            {showAdjustForm && (
              <form onSubmit={handleAdjustmentSubmit} style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--caanma-border)', marginBottom: '1.5rem', display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,2fr)', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Tipo</label>
                    <select name="type" required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}>
                      <option value="IN">Entrada (+)</option>
                      <option value="OUT">Salida (-)</option>
                      <option value="ADJUSTMENT">Ajuste / Merma (-)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Cantidad</label>
                    <input type="number" name="quantity" required min="1" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Motivo</label>
                    <input type="text" name="reason" required placeholder="Ej. Inventario físico..." style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={isPending} className="btn-primary" style={{ padding: '0.75rem 2rem' }}>
                    {isPending ? 'Guardando...' : 'Aplicar Ajuste'}
                  </button>
                </div>
              </form>
            )}

            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--caanma-border)', backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500' }}>Fecha</th>
                  <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500' }}>Tipo</th>
                  <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500' }}>Motivo</th>
                  <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500', textAlign: 'right' }}>Cantidad</th>
                  <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500', textAlign: 'right' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {movementsWithBalance.map(mov => (
                  <tr 
                    key={mov.id} 
                    onClick={() => handleMovementClick(mov)}
                    className="kardex-row"
                    style={{ 
                      borderBottom: '1px solid var(--caanma-border)',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    title={mov.detailUrl ? "Click para ver detalle en una nueva página" : "Click para ver detalle en ventana emergente"}
                  >
                    <td data-label="Fecha" style={{ padding: '1rem' }}>{new Date(mov.createdAt).toLocaleString()}</td>
                    <td data-label="Tipo" style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        backgroundColor: mov.type === 'IN' ? '#dcfce7' : mov.type === 'OUT' ? '#fee2e2' : '#f1f5f9',
                        color: mov.type === 'IN' ? '#166534' : mov.type === 'OUT' ? '#991b1b' : '#334155'
                      }}>
                        {mov.type}
                      </span>
                    </td>
                    <td data-label="Motivo" style={{ padding: '1rem' }}>{mov.reason}</td>
                    <td data-label="Cantidad" style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: mov.quantity > 0 ? '#16a34a' : '#dc2626' }}>
                      {mov.quantity > 0 ? '+' : ''}{mov.quantity}
                    </td>
                    <td data-label="Saldo" style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                      {mov.runningBalance}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                      No hay movimientos registrados para este artículo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

      {activeTab === 'sales' && (
        <div className="card">
          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--caanma-border)', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500' }}>Venta N° (ID)</th>
                <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500', textAlign: 'center' }}>Unidades Vendidas</th>
                <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500', textAlign: 'right' }}>Subtotal Generado</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                  <td data-label="Venta N° (ID)" style={{ padding: '1rem', fontFamily: 'monospace' }}>{s.saleId.slice(0, 8)}...</td>
                  <td data-label="Unidades Vendidas" style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>{s.quantity}</td>
                  <td data-label="Subtotal Generado" style={{ padding: '1rem', textAlign: 'right' }}>${(s.quantity * s.price).toFixed(2)}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                    Este producto no tiene ventas históricas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'variants' && (
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 'bold' }}>Multi-Variantes del Producto</h2>
          <p style={{ color: 'var(--caanma-text-muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>Agrega tallas, colores o características especiales sin crear un producto nuevo.</p>
          
          <form action={createVariant} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
             <input type="hidden" name="productId" value={product.id} />
             <input type="text" name="attribute" placeholder="Ej. Talla M - Color Rojo" required style={{ flex: 1, padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
             <input type="text" name="sku" placeholder="SKU Variante (Opcional)" style={{ width: '200px', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
             <button type="submit" className="btn-primary" style={{ padding: '0 2rem' }}>+ Agregar</button>
          </form>

          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
             <thead>
               <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid var(--caanma-border)' }}>
                 <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)' }}>Atributo</th>
                 <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)' }}>SKU Propio</th>
                 <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', textAlign: 'center' }}>Acciones</th>
               </tr>
             </thead>
             <tbody>
               {variants?.map(v => (
                 <tr key={v.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                   <td data-label="Atributo" style={{ padding: '1rem', fontWeight: 'bold' }}>{v.attribute}</td>
                   <td data-label="SKU Propio" style={{ padding: '1rem' }}>{v.sku || '-'}</td>
                   <td data-label="Acciones" style={{ padding: '1rem', textAlign: 'center' }}>
                     <form action={deleteVariant} style={{ display: 'inline' }}>
                        <input type="hidden" name="variantId" value={v.id} />
                        <input type="hidden" name="productId" value={product.id} />
                        <button type="submit" style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Eliminar</button>
                     </form>
                   </td>
                 </tr>
               ))}
               {!variants || variants.length === 0 && (
                 <tr>
                   <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>No hay variantes registradas.</td>
                 </tr>
               )}
             </tbody>
          </table>
        </div>
      )}

      {activeTab === 'batches' && (
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 'bold' }}>Lotes y Caducidades</h2>
          <p style={{ color: 'var(--caanma-text-muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>Administra los lotes y sus fechas de caducidad para este producto.</p>
          
          <form action={createBatch} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
             <input type="hidden" name="productId" value={product.id} />
             <input type="text" name="batchNumber" placeholder="Ej. LOTE-001" required style={{ flex: 1, minWidth: '150px', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
             <input type="date" name="expirationDate" required style={{ width: '200px', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
             <input type="number" name="stock" placeholder="Stock Inicial" min="0" style={{ width: '120px', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
             <button type="submit" className="btn-primary" style={{ padding: '0 2rem' }}>+ Agregar Lote</button>
          </form>

          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
             <thead>
               <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid var(--caanma-border)' }}>
                 <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)' }}>Lote</th>
                 <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)' }}>Caducidad</th>
                 <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', textAlign: 'right' }}>Stock Actual</th>
                 <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', textAlign: 'center' }}>Acciones</th>
               </tr>
             </thead>
             <tbody>
               {batches?.map(b => (
                 <tr key={b.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                   <td data-label="Lote" style={{ padding: '1rem', fontWeight: 'bold' }}>{b.batchNumber}</td>
                   <td data-label="Caducidad" style={{ padding: '1rem' }}>{b.expirationDate ? new Date(b.expirationDate).toLocaleDateString() : '-'}</td>
                   <td data-label="Stock Actual" style={{ padding: '1rem', textAlign: 'right' }}>{b.stock}</td>
                   <td data-label="Acciones" style={{ padding: '1rem', textAlign: 'center' }}>
                     <form action={deleteBatch} style={{ display: 'inline' }}>
                        <input type="hidden" name="batchId" value={b.id} />
                        <input type="hidden" name="productId" value={product.id} />
                        <button type="submit" style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Eliminar</button>
                     </form>
                   </td>
                 </tr>
               ))}
               {!batches || batches.length === 0 && (
                 <tr>
                   <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>No hay lotes registrados.</td>
                 </tr>
               )}
             </tbody>
          </table>
        </div>
      )}

      {activeTab === 'omnichannel' && siblingProducts && (
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 'bold' }}>Inventario Transversal (Red de Sucursales)</h2>
          <p style={{ color: 'var(--caanma-text-muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>Visualiza la existencia de este mismo artículo (por SKU) a lo largo de toda tu empresa matriz para facilitar traspasos o redireccionar ventas.</p>
          
          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
             <thead>
               <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid var(--caanma-border)' }}>
                 <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', width: '60%' }}>Sucursal / Almacén</th>
                 <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', textAlign: 'right' }}>Estado del Producto</th>
                 <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', textAlign: 'center' }}>Stock Disponible</th>
               </tr>
             </thead>
             <tbody>
               {siblingProducts.map(sp => (
                 <tr key={sp.id} style={{ borderBottom: '1px solid var(--caanma-border)', backgroundColor: sp.id === product.id ? '#f0fdf4' : 'transparent' }}>
                   <td data-label="Sucursal / Almacén" style={{ padding: '1rem' }}>
                     <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       {sp.branch?.name || 'Desconocida'}
                       {sp.id === product.id && <span style={{ fontSize: '0.65rem', backgroundColor: '#22c55e', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>ACTUAL</span>}
                     </div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)' }}>{sp.branch?.location || '-'}</div>
                   </td>
                   <td data-label="Estado del Producto" style={{ padding: '1rem', textAlign: 'right' }}>
                     {sp.isActive ? (
                       <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '12px' }}>Activo</span>
                     ) : (
                       <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '12px' }}>Inactivo</span>
                     )}
                   </td>
                   <td data-label="Stock Disponible" style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: sp.stock > 0 ? '#1e293b' : '#ef4444' }}>
                     {sp.stock} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--caanma-text-muted)' }}>{sp.unit}</span>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', marginTop: '2rem' }}>
            <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={18} color="var(--caanma-primary)" />
              Sugerencia de Abastecimiento
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--caanma-text-muted)' }}>
              Para nivelar inventarios, visita el módulo de <a href={`/productos/traspasos`} style={{ color: 'var(--caanma-primary)', fontWeight: 'bold' }}>Traspasos</a> e ingresa el SKU {product.sku}.
            </p>
          </div>
        </div>
      )}

      {selectedMovement && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.25s ease-out'
        }} onClick={() => setSelectedMovement(null)}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
            animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            border: '1px solid #e2e8f0'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              background: 'linear-gradient(to right, #f8fafc, #ffffff)'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Detalle del Movimiento
              </h3>
              <button onClick={() => setSelectedMovement(null)} style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s'
              }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Producto</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>{product.name}</span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>SKU: {product.sku}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo de Movimiento</span>
                  <div>
                    <span style={{ 
                      padding: '0.25rem 0.6rem', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      backgroundColor: selectedMovement.type === 'IN' ? '#dcfce7' : selectedMovement.type === 'OUT' ? '#fee2e2' : '#f1f5f9',
                      color: selectedMovement.type === 'IN' ? '#166534' : selectedMovement.type === 'OUT' ? '#991b1b' : '#334155',
                      display: 'inline-block'
                    }}>
                      {selectedMovement.type === 'IN' ? 'Entrada (+)' : selectedMovement.type === 'OUT' ? 'Salida (-)' : 'Ajuste / Merma'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cantidad</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: selectedMovement.quantity > 0 ? '#16a34a' : '#dc2626' }}>
                    {selectedMovement.quantity > 0 ? '+' : ''}{selectedMovement.quantity} Pzas
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha y Hora</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    {new Date(selectedMovement.createdAt).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registrado Por</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                    {selectedMovement.userName}
                  </span>
                  {selectedMovement.userEmail && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {selectedMovement.userEmail}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Motivo / Detalles</span>
                <span style={{ fontSize: '0.9rem', color: '#334155', lineHeight: '1.4', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  {selectedMovement.reason}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '1rem 1.5rem',
              borderTop: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc'
            }}>
              <button onClick={() => setSelectedMovement(null)} className="btn-secondary" style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: 'white',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
