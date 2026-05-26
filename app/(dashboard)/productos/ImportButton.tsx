'use client';
import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { importProducts } from '@/app/actions/import';
import Papa from 'papaparse';

export default function ImportButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const text = await file.text();
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            if (results.data.length === 0) {
              throw new Error("El archivo CSV está vacío o no contiene filas de datos.");
            }
            const result = await importProducts(results.data);
            alert(`CSV Procesado Exitosamente.\nNuevos: ${result.importedCount}\nActualizados: ${result.updatedCount}`);
          } catch (err: any) {
            alert("Error importando Excel/CSV: " + err.message);
          } finally {
            setIsProcessing(false);
          }
        },
        error: (error) => {
          alert("Error analizando el archivo CSV: " + error.message);
          setIsProcessing(false);
        }
      });

    } catch (err: any) {
      alert("Error leyendo el archivo: " + err.message);
      setIsProcessing(false);
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "sku", "barcode", "name", "description", "price", 
      "wholesalePrice", "specialPrice", "cost", "taxRate", 
      "category", "brand", "unit", "stock", "minStock", 
      "satKey", "satUnit", "isActive", "batchNumber", "expirationDate",
      "supplierName"
    ];

    const examples = [
      [
        "PROD-001", "7501234567890", "Refresco Cola 600ml", "Refresco de cola sabor original", "18.50",
        "16.00", "15.00", "12.00", "16.0",
        "Bebidas", "MarcaCola", "Pza", "50", "10",
        "50202306", "H87", "true", "LOTE105", "2027-12-31",
        "Distribuidora Bebidas SA"
      ],
      [
        "PROD-002", "", "Gaseosa Limon 1L", "Gaseosa sabor limon refrescante", "25.00",
        "", "", "18.00", "16.0",
        "Bebidas", "MarcaLimon", "Pza", "100", "20",
        "50202306", "H87", "true", "", "",
        ""
      ]
    ];

    const csvContent = Papa.unparse({
      fields: headers,
      data: examples
    });

    const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = "Plantilla_Importacion_Productos.csv";
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <input 
        type="file" 
        accept=".csv" 
        style={{ display: 'none' }} 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
        <button 
          onClick={handleDownloadTemplate}
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: '#1e293b', backgroundColor: '#f1f5f9' }}
          title="Descargar Plantilla CSV para Importación"
        >
          <FileSpreadsheet size={18} /> Plantilla
        </button>
        <button 
          onClick={() => fileInputRef.current?.click()} 
          disabled={isProcessing}
          className="btn-secondary" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          <Upload size={18} /> {isProcessing ? 'Procesando...' : 'Importar'}
        </button>
      </div>
    </>
  );
}
