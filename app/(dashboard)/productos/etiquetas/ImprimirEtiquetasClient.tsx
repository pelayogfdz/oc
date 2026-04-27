'use client';

import { useState, useRef } from 'react';
import Barcode from 'react-barcode';
import { Printer, X } from 'lucide-react';

export default function ImprimirEtiquetasClient({ 
  products, 
  config,
  currencySymbol,
  taxIVA,
  initialQtys
}: { 
  products: any[], 
  config: any,
  currencySymbol: string,
  taxIVA: number,
  initialQtys?: string[]
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    return products.reduce((acc, p, index) => {
      let qty = 1;
      if (initialQtys && initialQtys[index]) {
        qty = parseInt(initialQtys[index], 10) || 1;
      }
      return { ...acc, [p.id]: qty };
    }, {});
  });

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const calculateFinalPrice = (price: number) => {
    return price * (1 + taxIVA / 100);
  };

  // Convert mm to pixels roughly (1mm ≈ 3.78px)
  const mmToPx = (mm: number) => Math.round(mm * 3.78);

  const labelWidth = mmToPx(config.width);
  const labelHeight = mmToPx(config.height);
  const labelMargin = mmToPx(config.margin);

  const labelsToPrint = [];
  for (const product of products) {
    const qty = quantities[product.id] || 0;
    for (let i = 0; i < qty; i++) {
      labelsToPrint.push(product);
    }
  }

  return (
    <div style={{ fontFamily: 'var(--font-geist-sans)' }}>
      {/* Controles UI (Ocultos al imprimir) */}
      <div className="no-print" style={{ marginBottom: '2rem', backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Printer size={24} /> Imprimir Etiquetas
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Ajusta la cantidad de etiquetas que deseas imprimir por producto.
        </p>

        {products.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No se seleccionaron productos.</div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
            {products.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{p.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>SKU: {p.sku || 'N/A'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Cant:</label>
                  <input 
                    type="number" 
                    min="0"
                    value={quantities[p.id] || 0} 
                    onChange={e => setQuantities({ ...quantities, [p.id]: parseInt(e.target.value) || 0 })}
                    style={{ width: '60px', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button 
            className="btn-secondary" 
            onClick={() => window.close()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <X size={18} /> Cancelar
          </button>
          <button 
            className="btn-primary" 
            onClick={handlePrint}
            disabled={labelsToPrint.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: labelsToPrint.length === 0 ? 0.5 : 1 }}
          >
            <Printer size={18} /> Imprimir {labelsToPrint.length} Etiquetas
          </button>
        </div>
      </div>

      {/* Área de Impresión */}
      <div className="print-area" ref={printRef} style={{ display: 'flex', flexWrap: 'wrap', gap: '2mm', justifyContent: 'center' }}>
        {labelsToPrint.map((p, index) => (
          <div 
            key={`${p.id}-${index}`} 
            className="label-container"
            style={{ 
              width: `${config.width}mm`, 
              height: `${config.height}mm`, 
              padding: `${config.margin}mm`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'white',
              boxSizing: 'border-box',
              overflow: 'hidden',
              pageBreakInside: 'avoid',
              border: '1px dashed #e2e8f0' // Visible in preview, hide in print via css
            }}
          >
            {config.showName && (
              <div style={{ fontSize: '0.65rem', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', marginBottom: '2px' }}>
                {p.name.substring(0, 30)}
              </div>
            )}
            
            {config.showBarcode && (p.barcode || p.sku) && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', flexGrow: 1, overflow: 'hidden' }}>
                <Barcode 
                  value={p.barcode || p.sku || 'N/A'} 
                  format={config.barcodeFormat} 
                  width={1.2} 
                  height={mmToPx(config.height) * 0.4} 
                  displayValue={true} 
                  fontSize={10} 
                  margin={0}
                  background="transparent"
                />
              </div>
            )}

            {config.showPrice && (
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', textAlign: 'center', marginTop: '2px' }}>
                {currencySymbol} {calculateFinalPrice(p.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
          }
          .label-container {
            border: none !important;
            page-break-after: auto;
          }
          .no-print {
            display: none !important;
          }
          /* Custom size based on config */
          @page {
            size: ${config.width}mm ${config.height}mm;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
