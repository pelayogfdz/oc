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
    <div 
      className="no-print" 
      style={{ 
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999,
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '0.75rem 1.5rem',
        borderRadius: '50px',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        width: 'max-content'
      }}
    >
      <button
        onClick={() => window.print()}
        style={{
          padding: '0.6rem 1.5rem',
          cursor: 'pointer',
          background: primaryColor,
          color: 'white',
          border: 'none',
          borderRadius: '25px',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          transition: 'all 0.2s'
        }}
      >
        {printLabel}
      </button>
      {extraButton}
      <button
        onClick={() => window.close()}
        style={{
          padding: '0.6rem 1.5rem',
          cursor: 'pointer',
          background: 'white',
          color: '#475569',
          border: '1px solid #cbd5e1',
          borderRadius: '25px',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          transition: 'all 0.2s'
        }}
      >
        Cerrar Ventana
      </button>
    </div>
  );
}
