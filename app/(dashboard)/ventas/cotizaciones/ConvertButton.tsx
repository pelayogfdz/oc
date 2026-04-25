'use client';
import { useState } from 'react';
import { convertQuoteToSale } from '@/app/actions/quote';

export default function ConvertButton({ quoteId }: { quoteId: string }) {
  const [loading, setLoading] = useState(false);

  const handleConvert = async () => {
    if (!confirm("¿Convertir esta cotización en una venta oficial? Esto descontará los productos del inventario.")) return;
    
    setLoading(true);
    try {
      await convertQuoteToSale(quoteId);
      alert("Cotización convertida a Venta con éxito.");
    } catch (e) {
      alert("Error: " + String(e));
    }
    setLoading(false);
  };

  return (
    <button 
      onClick={handleConvert} 
      disabled={loading}
      style={{ 
        padding: '0.25rem 0.75rem', 
        backgroundColor: '#f1f5f9', 
        border: '1px solid var(--pulpos-border)', 
        borderRadius: '4px', 
        cursor: loading ? 'not-allowed' : 'pointer',
        fontWeight: 'bold',
        fontSize: '0.875rem'
      }}
    >
      {loading ? 'Convirtiendo...' : 'Convertir a Venta'}
    </button>
  );
}
