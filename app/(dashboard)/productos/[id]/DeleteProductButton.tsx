'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProduct } from '@/app/actions/product';
import { useToast } from '@/app/components/ui/CorporateToast';
import { CorporateConfirmModal } from '@/app/components/ui/CorporateConfirmModal';
import { Trash2 } from 'lucide-react';

export default function DeleteProductButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();
  const { success, error } = useToast();

  const handleConfirmDelete = async () => {
    startTransition(async () => {
      try {
        const res = await deleteProduct(productId);
        if (res && !res.success) {
          error(res.error || 'No se pudo eliminar el producto', 'Error al eliminar');
        } else {
          success('El producto ha sido eliminado exitosamente', 'Producto eliminado');
          setShowConfirm(false);
          router.push('/productos');
        }
      } catch (err: any) {
        error(err.message || 'Error desconocido al procesar la solicitud', 'Error de red');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950/70 transition-colors disabled:opacity-50"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {isPending ? 'Eliminando...' : 'Eliminar'}
      </button>

      <CorporateConfirmModal
        isOpen={showConfirm}
        title="Eliminar producto"
        message="¿Estás seguro de que deseas eliminar este producto definitivamente? Esta acción es irreversible."
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
