'use client';

import { useOfflineSync, isOfflineEnabled } from './OfflineSyncProvider';
import { WifiOff, DownloadCloud, RefreshCw, Check, AlertTriangle, Trash2, X, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

export default function HeaderNetworkStatus() {
  const { 
    isOnline, 
    pendingSales, 
    pendingTransfers,
    pendingPurchases,
    pendingProducts,
    pendingAttendance,
    syncMessage, 
    refreshCatalogs, 
    lastSyncTime,
    deletePendingSale,
    retryAllFailed
  } = useOfflineSync();

  const [isPwa, setIsPwa] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);

  useEffect(() => {
    setIsPwa(isOfflineEnabled());
  }, []);

  const totalPending = (pendingSales?.length || 0) + 
                       (pendingTransfers?.length || 0) + 
                       (pendingPurchases?.length || 0) + 
                       (pendingProducts?.length || 0) + 
                       (pendingAttendance?.length || 0);

  const hasFailedItems = (pendingSales || []).some(s => s.failed || (s.retryCount || 0) > 0) ||
                         (pendingTransfers || []).some(t => t.failed || (t.retryCount || 0) > 0) ||
                         (pendingPurchases || []).some(p => p.failed || (p.retryCount || 0) > 0);

  const handleSyncClick = async () => {
    if (isManualSyncing || !isOnline) return;
    try {
      setIsManualSyncing(true);
      await refreshCatalogs(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleRetryAll = async () => {
    if (isRetryingAll || !isOnline) return;
    try {
      setIsRetryingAll(true);
      await retryAllFailed();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRetryingAll(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('¿Estás seguro de descartar este registro de la cola local? Esta acción no se puede deshacer.')) return;
    await deletePendingSale(id);
  };

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Nunca';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isSyncActive = !!syncMessage || isManualSyncing;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginRight: '0.5rem' }}>
        {syncMessage && (
          <span className="sync-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold', color: '#b45309', backgroundColor: '#fcd34d', padding: '6px 12px', borderRadius: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
            <DownloadCloud size={16} /> <span className="sync-badge-text">{syncMessage}</span>
          </span>
        )}

        {/* Offline Badge */}
        {!isOnline && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#ef4444', backgroundColor: '#fef2f2', padding: '4px 8px', borderRadius: '12px' }}>
            <WifiOff size={14} /> Modo Offline
          </span>
        )}
        
        {/* Pending Offline sales/queues button (interactive) */}
        {totalPending > 0 && (
          <button
            onClick={() => setShowQueueModal(true)}
            title="Haz clic para ver y gestionar las reservas offline pendientes"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              color: hasFailedItems ? '#dc2626' : '#b45309',
              backgroundColor: hasFailedItems ? '#fef2f2' : '#fffbeb',
              border: `1px solid ${hasFailedItems ? '#fca5a5' : '#fde68a'}`,
              padding: '4px 10px',
              borderRadius: '12px',
              cursor: 'pointer',
              animation: 'pulse 2s infinite',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            {hasFailedItems ? <AlertCircle size={14} /> : <DownloadCloud size={14} />}
            <span>{hasFailedItems ? `Atención Reservas (${totalPending})` : `Subiendo Reservas... (${totalPending})`}</span>
          </button>
        )}

        {/* Manual catalog download button (PWA desktop) */}
        {isPwa && isOnline && (
          <button
            onClick={handleSyncClick}
            disabled={isSyncActive}
            title={lastSyncTime ? `Última Sincronización: ${new Date(lastSyncTime).toLocaleString()}` : 'Aún sin descargar'}
            className="sync-status-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              color: isSyncActive ? '#b45309' : (!lastSyncTime ? '#ef4444' : '#15803d'),
              backgroundColor: isSyncActive ? '#fcd34d' : (!lastSyncTime ? '#fef2f2' : '#f0fdf4'),
              border: `1px solid ${isSyncActive ? '#f59e0b' : (!lastSyncTime ? '#fca5a5' : '#86efac')}`,
              padding: '6px 12px',
              borderRadius: '16px',
              cursor: isSyncActive ? 'default' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            onMouseOver={(e) => {
              if (!isSyncActive) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }
            }}
            onMouseOut={(e) => {
              if (!isSyncActive) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
              }
            }}
          >
            {isSyncActive ? (
              <>
                <RefreshCw size={14} style={{ animation: 'spin-anim 2s linear infinite' }} />
                <span className="sync-status-text">{syncMessage || 'Descargando base de datos local...'}</span>
              </>
            ) : !lastSyncTime ? (
              <>
                <AlertTriangle size={14} />
                <span className="sync-status-text">Descargar Base de Datos Local</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span className="sync-status-text">Listo Offline ({formatLastSync(lastSyncTime)})</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* MODAL DE GESTIÓN DE COLA OFFLINE */}
      {showQueueModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
                  Cola de Sincronización Offline
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  {totalPending === 0 ? 'No hay operaciones pendientes.' : `${totalPending} operación(es) almacenada(s) localmente en este dispositivo.`}
                </p>
              </div>
              <button
                onClick={() => setShowQueueModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {totalPending === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                  <Check size={48} color="#16a34a" style={{ margin: '0 auto 1rem auto' }} />
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: '#1e293b' }}>¡Todo al día!</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>No hay ventas ni operaciones pendientes de sincronizar con el servidor.</div>
                </div>
              ) : (
                <>
                  {/* Pending Sales */}
                  {(pendingSales || []).map((sale) => {
                    const typeName = sale.type === 'QUOTE' ? 'Cotización' : sale.type === 'CONSIGNMENT' ? 'Consignación' : sale.type === 'CANCEL' ? 'Cancelación de Venta' : ((sale as any).isPedido ? 'Pedido / Envío' : 'Venta');
                    const isError = sale.failed || (sale.retryCount || 0) > 0;
                    return (
                      <div 
                        key={sale.id}
                        style={{
                          border: `1px solid ${isError ? '#fca5a5' : '#e2e8f0'}`,
                          backgroundColor: isError ? '#fffaf0' : '#f8fafc',
                          borderRadius: '8px',
                          padding: '0.9rem 1.1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: sale.type === 'QUOTE' ? '#e0e7ff' : sale.type === 'CONSIGNMENT' ? '#fef3c7' : '#dcfce7',
                              color: sale.type === 'QUOTE' ? '#3730a3' : sale.type === 'CONSIGNMENT' ? '#92400e' : '#166534'
                            }}>
                              {typeName}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                              {formatCurrency(sale.total || 0)}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              ({sale.items?.length || 0} productos)
                            </span>
                          </div>

                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Fecha: {new Date(sale.timestamp).toLocaleString()}
                          </div>

                          {isError && (
                            <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#dc2626', backgroundColor: '#fef2f2', padding: '4px 8px', borderRadius: '4px', border: '1px solid #fee2e2' }}>
                              <strong>Motivo:</strong> {sale.errorMessage || 'Error de conexión con el servidor'} (Reintentos: {sale.retryCount || 0}/5)
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleDeleteItem(sale.id)}
                            title="Descartar este registro de la cola"
                            style={{
                              backgroundColor: '#fee2e2',
                              border: '1px solid #fca5a5',
                              color: '#dc2626',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          >
                            <Trash2 size={14} /> Descartar
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Pending Transfers */}
                  {(pendingTransfers || []).map((t) => (
                    <div key={t.id} style={{ border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '8px', padding: '0.8rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1' }}>Traspaso</span>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Motivo: {t.reason} ({t.items?.length || 0} items)</div>
                        {t.errorMessage && <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>Error: {t.errorMessage}</div>}
                      </div>
                    </div>
                  ))}

                  {/* Pending Purchases */}
                  {(pendingPurchases || []).map((p) => (
                    <div key={p.id} style={{ border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '8px', padding: '0.8rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e' }}>Compra / Pedido</span>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Total: {formatCurrency(p.total || 0)} ({p.items?.length || 0} items)</div>
                        {p.errorMessage && <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>Error: {p.errorMessage}</div>}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {isOnline ? '🟢 Conexión a Internet activa' : '🔴 Sin conexión (se sincronizará al reconectar)'}
              </span>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowQueueModal(false)}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #cbd5e1',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cerrar
                </button>

                {totalPending > 0 && isOnline && (
                  <button
                    onClick={handleRetryAll}
                    disabled={isRetryingAll}
                    style={{
                      backgroundColor: '#2563eb',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#fff',
                      cursor: isRetryingAll ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <RefreshCw size={14} style={{ animation: isRetryingAll ? 'spin-anim 1s linear infinite' : 'none' }} />
                    {isRetryingAll ? 'Reintentando...' : 'Reintentar Todo Ahora'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin-anim {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .sync-status-text {
            display: none !important;
          }
          .sync-status-btn {
            padding: 6px !important;
            border-radius: 50% !important;
            width: 32px !important;
            height: 32px !important;
            justify-content: center !important;
            gap: 0 !important;
          }
        }
      `}} />
    </>
  );
}
