'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { cancelPurchase } from '@/app/actions/purchase';

export default function PurchaseActionsClient({ purchaseId, status }: { purchaseId: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCancel = () => {
    if (!confirm('¿ESTÁS SEGURO DE CANCELAR ESTA COMPRA? Se deducirá el stock del inventario, se descontarán los lotes y se revertirá la deuda con el proveedor.')) return;

    startTransition(async () => {
      try {
        await cancelPurchase(purchaseId);
        alert('Compra cancelada exitosamente.');
        router.refresh();
      } catch (err: any) {
        alert(err.message || 'Error al cancelar la compra.');
      }
    });
  };

  if (status !== 'COMPLETED') return null;

  return (
    <button
      onClick={handleCancel}
      disabled={isPending}
      className="btn-danger"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1.5rem',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 'bold',
        opacity: isPending ? 0.7 : 1
      }}
    >
      <AlertTriangle size={18} />
      {isPending ? 'Cancelando...' : 'Cancelar Compra'}
    </button>
  );
}
