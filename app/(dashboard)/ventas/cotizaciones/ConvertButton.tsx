'use client';
import { useRouter } from 'next/navigation';

export default function ConvertButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();

  const handleConvert = () => {
    router.push(`/ventas/nueva?quoteId=${quoteId}`);
  };

  return (
    <button 
      onClick={handleConvert} 
      style={{ 
        padding: '0.25rem 0.75rem', 
        backgroundColor: '#f1f5f9', 
        border: '1px solid var(--pulpos-border)', 
        borderRadius: '4px', 
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '0.875rem'
      }}
    >
      Convertir a Venta
    </button>
  );
}
