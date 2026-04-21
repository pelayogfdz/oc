'use client';

import { useOfflineSync } from './OfflineSyncProvider';
import { WifiOff, DownloadCloud } from 'lucide-react';

export default function HeaderNetworkStatus() {
  const { isOnline, pendingSales, syncMessage } = useOfflineSync();

  if (isOnline && pendingSales.length === 0 && !syncMessage) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginRight: '0.5rem' }}>
      {syncMessage && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold', color: '#b45309', backgroundColor: '#fcd34d', padding: '6px 12px', borderRadius: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
          <DownloadCloud size={16} /> {syncMessage}
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
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}} />
    </div>
  );
}
