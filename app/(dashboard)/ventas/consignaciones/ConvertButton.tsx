'use client';
import { useRouter } from 'next/navigation';

export default function ConvertButton({ consignmentId }: { consignmentId: string }) {
  const router = useRouter();

  const handleConvert = () => {
    router.push(`/ventas/nueva?consignmentId=${consignmentId}`);
  };

  return (
    <button 
      onClick={handleConvert} 
      style={{ 
        padding: '0.35rem 0.85rem', 
        backgroundColor: '#6366f1', 
        border: '1px solid #4f46e5', 
        borderRadius: '6px', 
        color: 'white',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '0.875rem',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        transition: 'background-color 0.2s'
      }}
      onMouseOver={e => e.currentTarget.style.backgroundColor = '#4f46e5'}
      onMouseOut={e => e.currentTarget.style.backgroundColor = '#6366f1'}
    >
      Facturar Consignación
    </button>
  );
}
