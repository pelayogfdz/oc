'use client';

import { useOfflineSync } from './OfflineSyncProvider';
import { WifiOff, DownloadCloud } from 'lucide-react';

export default function HeaderNetworkStatus() {
  const { isOnline, pendingSales } = useOfflineSync();

  if (isOnline && pendingSales.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
      {!isOnline && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#ef4444', backgroundColor: '#fef2f2', padding: '4px 8px', borderRadius: '12px' }}>
          <WifiOff size={14} /> Modo Offline
        </span>
      )}
      
      {isOnline && pendingSales.length > 0 && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#f59e0b', backgroundColor: '#fffbeb', padding: '4px 8px', borderRadius: '12px', animation: 'pulse 2s infinite' }}>
          <DownloadCloud size={14} /> Sincronizando... ({pendingSales.length})
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
