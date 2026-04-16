'use client';
import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { importProducts } from '@/app/actions/import';

export default function ImportButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const text = await file.text();
      // Basic CSV Parser (assumes simple structure, handles basic quotes)
      const lines = text.split('\n').filter(l => l.trim() !== '');
      if (lines.length < 2) throw new Error("CSV muy pequeño o vacío.");
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const records = lines.slice(1).map(line => {
        // Regex to split by comma except inside quotes
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => {
          let clean = v.trim().replace(/^"|"$/g, '');
          if (clean.startsWith('="') && clean.endsWith('"')) {
            clean = clean.substring(2, clean.length - 1).replace(/""/g, '"');
          }
          return clean;
        });
        const obj: any = {};
        headers.forEach((h, i) => {
          obj[h] = values[i] || '';
        });
        return obj;
      });

      const result = await importProducts(records);
      alert(`CSV Procesado Exitosamente.\nNuevos: ${result.importedCount}\nActualizados: ${result.updatedCount}`);
    } catch (err: any) {
      alert("Error importando Excel/CSV: " + err.message);
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsProcessing(false);
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
      <button 
        onClick={() => fileInputRef.current?.click()} 
        disabled={isProcessing}
        className="btn-secondary" 
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
      >
        <Upload size={18} /> {isProcessing ? 'Procesando...' : 'Importar'}
      </button>
    </>
  );
}
