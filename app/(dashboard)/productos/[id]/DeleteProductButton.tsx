'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProduct } from '@/app/actions/product';

export default function DeleteProductButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = async () => {
    const confirmDelete = confirm('¿Estás seguro de que deseas eliminar este producto definitivamente?');
    if (!confirmDelete) return;

    startTransition(async () => {
      try {
        const res = await deleteProduct(productId);
        if (res && !res.success) {
          alert('Error al eliminar: ' + res.error);
        } else {
          router.push('/productos');
        }
      } catch (err: any) {
        alert('Error de conexión o permisos: ' + (err.message || 'Error desconocido'));
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      style={{
        padding: '0.5rem 1rem',
        backgroundColor: '#fee2e2',
        color: '#ef4444',
        border: 'none',
        borderRadius: '6px',
        fontWeight: 'bold',
        cursor: isPending ? 'not-allowed' : 'pointer',
        opacity: isPending ? 0.6 : 1
      }}
    >
      {isPending ? 'Eliminando...' : 'Eliminar'}
    </button>
  );
}
