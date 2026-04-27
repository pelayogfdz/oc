'use client';

import { useState } from 'react';
import { updateAdvancedJSONConfig } from '@/app/actions/settings';
import { Tag, Save, CheckCircle } from 'lucide-react';

export default function EtiquetasClient({ initialConfig }: { initialConfig: any }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [config, setConfig] = useState({
    width: initialConfig?.width || 50, // mm
    height: initialConfig?.height || 25, // mm
    showName: initialConfig?.showName ?? true,
    showPrice: initialConfig?.showPrice ?? true,
    showBarcode: initialConfig?.showBarcode ?? true,
    barcodeFormat: initialConfig?.barcodeFormat || 'CODE128',
    margin: initialConfig?.margin || 2, // mm
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? Number(value) : value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      await updateAdvancedJSONConfig('labels', config);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error(error);
      alert("Error al guardar la configuración.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--pulpos-border)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <Tag size={24} /> Configuración de Etiquetas
      </h2>
      <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1rem' }}>
        Ajusta las medidas y datos a imprimir en tu etiquetadora térmica (ej. Xprinter, Zebra).
      </p>
      
      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '600px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
              Ancho de etiqueta (mm)
            </label>
            <input type="number" name="width" value={config.width} onChange={handleChange} min={10} max={200} style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none' }} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
              Alto de etiqueta (mm)
            </label>
            <input type="number" name="height" value={config.height} onChange={handleChange} min={10} max={200} style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none' }} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
              Margen interno (mm)
            </label>
            <input type="number" name="margin" value={config.margin} onChange={handleChange} min={0} max={10} style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none' }} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
              Formato de Código
            </label>
            <select name="barcodeFormat" value={config.barcodeFormat} onChange={handleChange} style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none' }}>
              <option value="CODE128">CODE128 (Alfanumérico común)</option>
              <option value="EAN13">EAN13 (Solo 13 dígitos)</option>
              <option value="EAN8">EAN8 (Solo 8 dígitos)</option>
              <option value="UPC">UPC</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>
            <input type="checkbox" name="showName" checked={config.showName} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
            Imprimir Nombre del Producto
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>
            <input type="checkbox" name="showPrice" checked={config.showPrice} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
            Imprimir Precio
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>
            <input type="checkbox" name="showBarcode" checked={config.showBarcode} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
            Imprimir Código de Barras (Gráfico)
          </label>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
          {success && <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}><CheckCircle size={18} /> Guardado</span>}
          <button className="btn-primary" type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: loading ? 0.7 : 1 }}>
            <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Preferencias'}
          </button>
        </div>
      </form>
    </div>
  );
}
