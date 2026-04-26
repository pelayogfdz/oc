'use client';

import { useEffect } from 'react';
import Barcode from 'react-barcode';

export default function EtiquetaClient({ products }: { products: any[] }) {
  useEffect(() => {
    // Auto-print after a small delay to allow barcode rendering
    const timer = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: 62mm 20mm; /* Dimensiones de etiqueta estándar Brother QL-800 */
          margin: 0;
        }
        @media print {
          body {
            background-color: white !important;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .etiqueta-container {
            width: 62mm !important;
            height: 20mm !important;
            overflow: hidden;
            page-break-after: always;
            box-shadow: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
        }
        
        .etiqueta-container {
            width: 62mm;
            height: 20mm;
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 2mm;
            box-sizing: border-box;
            overflow: hidden;
        }
      `}} />

      <div className="no-print" style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>Vista Previa de Etiquetas</h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>El diálogo de impresión se abrirá automáticamente. Asegúrate de seleccionar tu impresora Brother QL-800.</p>
        <button onClick={() => window.print()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Reintentar Impresión
        </button>
      </div>

      {products.map((prod, idx) => (
        <div key={`${prod.id}-${idx}`} className="etiqueta-container">
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'black', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '1px' }}>
            {prod.name}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', transform: 'scale(0.85)', transformOrigin: 'top center' }}>
            <Barcode 
              value={prod.sku || prod.id.slice(0, 8)} 
              width={1.5} 
              height={30} 
              fontSize={12} 
              margin={0} 
              displayValue={true} 
            />
          </div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'black', textAlign: 'center', marginTop: '-3px' }}>
            ${(prod.price || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}
          </div>
        </div>
      ))}
    </div>
  );
}
