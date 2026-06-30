'use client';

import { useOfflineSync, isOfflineEnabled } from './OfflineSyncProvider';
import { WifiOff, DownloadCloud, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function HeaderNetworkStatus() {
  const { isOnline, pendingSales, syncMessage, refreshCatalogs, lastSyncTime } = useOfflineSync();
  const [isPwa, setIsPwa] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    setIsPwa(isOfflineEnabled());
  }, []);

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

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Nunca';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // If this is not a desktop PWA standalone app, render the simple network status
  if (!isPwa) {
    if (isOnline && pendingSales.length === 0 && !syncMessage) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginRight: '0.5rem' }}>
        {syncMessage && (
          <span className="sync-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold', color: '#b45309', backgroundColor: '#fcd34d', padding: '6px 12px', borderRadius: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
            <DownloadCloud size={16} /> <span className="sync-badge-text">{syncMessage}</span>
          </span>
        )}

        {!isOnline && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#ef4444', backgroundColor: '#fef2f2', padding: '4px 8px', borderRadius: '12px' }}>
            <WifiOff size={14} /> Modo Offline
          </span>
        )}
        
        {isOnline && pendingSales.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#f59e0b', backgroundColor: '#fffbeb', padding: '4px 8px', borderRadius: '12px', animation: 'pulse 2s infinite' }}>
            <DownloadCloud size={14} /> Sincronizando Reservas... ({pendingSales.length})
          </span>
        )}
      </div>
    );
  }

  // Render the advanced interactive PWA Desktop offline control widget
  const isSyncActive = !!syncMessage || isManualSyncing;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginRight: '0.5rem' }}>
      {/* Pending Offline sales to upload */}
      {isOnline && pendingSales.length > 0 && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#f59e0b', backgroundColor: '#fffbeb', padding: '4px 8px', borderRadius: '12px', animation: 'pulse 2s infinite' }}>
          <DownloadCloud size={14} /> Subiendo Reservas... ({pendingSales.length})
        </span>
      )}

      {/* Connection State Badge */}
      {!isOnline ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#ef4444', backgroundColor: '#fef2f2', padding: '4px 8px', borderRadius: '12px' }}>
          <WifiOff size={14} /> Sin Conexión (Offline DB activa)
        </span>
      ) : (
        /* Manual catalog download button */
        <button
          onClick={handleSyncClick}
          disabled={isSyncActive}
          title={lastSyncTime ? `Última sincronización: ${new Date(lastSyncTime).toLocaleString()}` : 'Aún sin descargar'}
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
              <span>{syncMessage || 'Descargando base de datos local...'}</span>
            </>
          ) : !lastSyncTime ? (
            <>
              <AlertTriangle size={14} />
              <span>Descargar Base de Datos Local</span>
            </>
          ) : (
            <>
              <Check size={14} />
              <span>Listo Offline ({formatLastSync(lastSyncTime)})</span>
            </>
          )}
        </button>
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
      `}} />
    </div>
  );
}
