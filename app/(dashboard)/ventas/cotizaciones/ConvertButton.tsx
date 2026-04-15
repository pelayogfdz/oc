'use client';
import { useState } from 'react';
import { convertQuoteToSale } from '@/app/actions/quote';

export default function ConvertButton({ quoteId }: { quoteId: string }) {
  const [loading, setLoading] = useState(false);

  const handleConvert = async () => {
    // Instead of converting magically in background, redirect to POS.
    window.location.href = `/ventas/nueva?quoteId=${quoteId}`;
  };

  return (
    <button 
      onClick={handleConvert} 
      disabled={loading}
      style={{ 
        padding: '0.25rem 0.75rem', 
        backgroundColor: '#2563eb', 
        color: 'white',
        border: 'none', 
        borderRadius: '4px', 
        cursor: loading ? 'not-allowed' : 'pointer',
        fontWeight: 'bold',
        fontSize: '0.875rem'
      }}
    >
      Cargar en Caja (TPV)
    </button>
  );
}
