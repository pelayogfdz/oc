'use client';

import React from 'react';

interface PrintActionsProps {
  primaryColor: string;
  printLabel?: string;
  extraButton?: React.ReactNode;
}

export default function PrintActions({
  primaryColor,
  printLabel = 'Imprimir',
  extraButton,
}: PrintActionsProps) {
  return (
    <div className="no-print" style={{ textAlign: 'center', marginTop: '2rem', paddingBottom: '2rem' }}>
      <button
        onClick={() => window.print()}
        style={{
          padding: '0.75rem 2rem',
          cursor: 'pointer',
          background: primaryColor,
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 'bold',
          marginRight: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        }}
      >
        {printLabel}
      </button>
      {extraButton}
      <button
        onClick={() => window.close()}
        style={{
          padding: '0.75rem 2rem',
          cursor: 'pointer',
          background: 'white',
          color: '#475569',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 'bold',
        }}
      >
        Cerrar Ventana
      </button>
    </div>
  );
}
