'use client';

import { useState } from 'react';
import CommissionManagerClient from './CommissionManagerClient';
import CommissionReportClient from './CommissionReportClient';
import { Settings, FileText } from 'lucide-react';

export default function CommissionTabs({ initialUsers }: { initialUsers: any[] }) {
  const [activeTab, setActiveTab] = useState<'config' | 'report'>('config');

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--caanma-border)', marginBottom: '1.5rem', gap: '1rem' }}>
        <button
          onClick={() => setActiveTab('config')}
          style={{
            padding: '0.75rem 1rem',
            border: 'none',
            borderBottom: activeTab === 'config' ? '2px solid var(--caanma-primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'config' ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Settings size={18} /> Configuración Jerárquica
        </button>
        <button
          onClick={() => setActiveTab('report')}
          style={{
            padding: '0.75rem 1rem',
            border: 'none',
            borderBottom: activeTab === 'report' ? '2px solid var(--caanma-primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'report' ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FileText size={18} /> Cálculo y Liquidación
        </button>
      </div>

      {activeTab === 'config' ? (
        <CommissionManagerClient initialUsers={initialUsers} />
      ) : (
        <CommissionReportClient initialUsers={initialUsers} />
      )}
    </div>
  );
}
