'use client';

import { useEffect } from 'react';

export default function AutoPrint() {
  useEffect(() => {
    // Retrasar ligeramente para asegurar que la página y las imágenes (como el QR) estén cargadas
    const timeout = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timeout);
  }, []);

  return null;
}
