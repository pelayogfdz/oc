'use client';
import { Download } from 'lucide-react';

export default function ExportButton({ products }: { products: any[] }) {
  const handleExport = () => {
    if (products.length === 0) {
      alert("No hay productos para exportar.");
      return;
    }

    // Encabezados
    const headers = ["sku", "barcode", "name", "price", "wholesalePrice", "specialPrice", "cost", "stock"];
    
    // Filas
    const rows = products.map(p => {
      const safeSku = p.sku ? p.sku.replace(/"/g, '""') : '';
      const safeBarcode = p.barcode ? p.barcode.replace(/"/g, '""') : '';
      
      return [
        `="${safeSku}"`,
        safeBarcode ? `="${safeBarcode}"` : '',
        `"${p.name.replace(/"/g, '""')}"`,
        p.price,
        p.wholesalePrice || '',
        p.specialPrice || '',
        p.cost,
        p.stock
      ].join(',');
    });

    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `Inventario_${new Date().toISOString().slice(0,10)}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button onClick={handleExport} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
      <Download size={18} /> Exportar
    </button>
  );
}
