'use client';

import { useEffect } from 'react';
import Barcode from 'react-barcode';

interface LabelConfig {
  width: number;
  height: number;
  margin: number;
  showName: boolean;
  showPrice: boolean;
  showBarcode: boolean;
  showLocation: boolean;
  showDescription: boolean;
  barcodeFormat: string;
}

export default function EtiquetaClient({ 
  products, 
  labelConfig 
}: { 
  products: any[];
  labelConfig: LabelConfig;
}) {
  useEffect(() => {
    // Auto-print after a small delay to allow barcode rendering
    const timer = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const width = labelConfig.width || 62;
  const height = labelConfig.height || 29;
  const margin = labelConfig.margin !== undefined ? labelConfig.margin : 2;
  const barcodeHeight = height <= 22 ? 16 : 24;

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: ${width}mm ${height}mm;
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
            width: ${width}mm !important;
            height: ${height}mm !important;
            overflow: hidden;
            page-break-after: always;
            box-shadow: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
        }
        
        .etiqueta-container {
            width: ${width}mm;
            height: ${height}mm;
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            padding: ${margin}mm;
            box-sizing: border-box;
            overflow: hidden;
        }
      `}} />

      <div className="no-print" style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>Vista Previa de Etiquetas</h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>El diálogo de impresión se abrirá automáticamente. Asegúrate de seleccionar tu impresora térmica (ej. Brother QL-800).</p>
        <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.25rem' }}>Tamaño configurado: {width}mm x {height}mm | Margen: {margin}mm</p>
        <button onClick={() => window.print()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Reintentar Impresión
        </button>
      </div>

      {products.map((prod, idx) => (
        <div key={`${prod.id}-${idx}`} className="etiqueta-container">
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
            {/* Product Name */}
            {labelConfig.showName && (
              <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'black', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.1' }}>
                {prod.name}
              </div>
            )}
            
            {/* Product Description */}
            {labelConfig.showDescription && prod.description && (
              <div style={{ fontSize: '6.5px', color: '#4b5563', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1' }}>
                {prod.description}
              </div>
            )}
          </div>

          {/* Barcode */}
          {labelConfig.showBarcode && (
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', transform: 'scale(0.9)', transformOrigin: 'top center', margin: '1px 0' }}>
              <Barcode 
                value={prod.sku || prod.id.slice(0, 8)} 
                width={1.3} 
                height={barcodeHeight} 
                fontSize={8} 
                margin={0} 
                displayValue={true}
                format={labelConfig.barcodeFormat === 'EAN13' ? 'EAN13' : 'CODE128'}
              />
            </div>
          )}

          {/* Footer: Location & Price */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 'auto', padding: '0 1px' }}>
            {/* Location (Badge) */}
            {labelConfig.showLocation && prod.location ? (
              <div style={{ fontSize: '7px', fontWeight: 'bold', color: 'white', backgroundColor: '#374151', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>
                📍 {prod.location}
              </div>
            ) : (
              <div />
            )}

            {/* Price */}
            {labelConfig.showPrice && (
              <div style={{ fontSize: '10px', fontWeight: '900', color: 'black' }}>
                ${(prod.price || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
