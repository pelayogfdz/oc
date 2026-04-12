'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { receiveTransfer } from '@/app/actions/transfer';

export default function ReceiveButton({ transferId }: { transferId: string }) {
  const [loading, setLoading] = useState(false);

  const handleReceive = async () => {
    if (!confirm('¿Confirmas que has recibido y contado esta mercancía? Se añadirá al stock de tu sucursal.')) return;
    
    try {
      setLoading(true);
      await receiveTransfer(transferId);
      alert('Inventario recibido y sumado con éxito.');
    } catch (err) {
      console.error(err);
      alert('Error al recibir traspaso.');
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleReceive}
      disabled={loading}
      className="btn-primary" 
      style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
    >
      <Download size={16} />
      {loading ? 'Procesando...' : 'Recibir Stock'}
    </button>
  );
}
