'use client';
import { useState } from 'react';
import { Download, CheckSquare, Layers, X, Loader2 } from 'lucide-react';
import { exportProductsAction } from '@/app/actions/export';
import Papa from 'papaparse';

export default function ExportButton({ selectedIds }: { selectedIds: string[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: 'selection' | 'all') => {
    setIsExporting(true);
    try {
      const ids = type === 'selection' ? selectedIds : undefined;
      const data = await exportProductsAction(ids);

      if (data.length === 0) {
        alert("No hay productos para exportar en esta sucursal.");
        setIsOpen(false);
        setIsExporting(false);
        return;
      }

      // Convert to CSV using PapaParse
      const csv = Papa.unparse(data);

      // Download file
      const blob = new Blob(["\ufeff", csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Inventario_${type === 'selection' ? 'Seleccion' : 'Completo'}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsOpen(false);
    } catch (err: any) {
      alert("Error al exportar productos: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="btn-secondary" 
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
      >
        <Download size={18} /> Exportar
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: 'white',
            width: '90%',
            maxWidth: '480px',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            padding: '2rem',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                Exportar Inventario
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                disabled={isExporting}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '4px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f8fafc',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Description */}
            <p style={{ margin: 0, fontSize: '0.925rem', color: '#64748b', lineHeight: 1.5 }}>
              Selecciona el alcance de la exportación. El archivo resultante incluirá todos los campos del producto (incluyendo lotes, caducidad, proveedor y precios especiales).
            </p>

            {/* Buttons area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Option 1: Current Selection */}
              <button
                onClick={() => handleExport('selection')}
                disabled={selectedIds.length === 0 || isExporting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: '2px solid',
                  borderColor: selectedIds.length > 0 ? '#e2e8f0' : '#f1f5f9',
                  backgroundColor: selectedIds.length > 0 ? 'white' : '#f8fafc',
                  cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  width: '100%',
                  opacity: selectedIds.length > 0 ? 1 : 0.6
                }}
                onMouseOver={(e) => {
                  if (selectedIds.length > 0 && !isExporting) {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedIds.length > 0 && !isExporting) {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                <div style={{
                  color: selectedIds.length > 0 ? '#2563eb' : '#94a3b8',
                  backgroundColor: selectedIds.length > 0 ? '#eff6ff' : '#f1f5f9',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckSquare size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.975rem' }}>
                    Exportar Selección Actual
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                    {selectedIds.length === 0 
                      ? "Ningún producto seleccionado en la tabla" 
                      : `Exportar los ${selectedIds.length} productos seleccionados`}
                  </div>
                </div>
              </button>

              {/* Option 2: All Products */}
              <button
                onClick={() => handleExport('all')}
                disabled={isExporting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  width: '100%'
                }}
                onMouseOver={(e) => {
                  if (!isExporting) {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.backgroundColor = '#f0fdf4';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isExporting) {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                <div style={{
                  color: '#10b981',
                  backgroundColor: '#f0fdf4',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Layers size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.975rem' }}>
                    Exportar Todo el Catálogo
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                    Exportar todos los productos registrados en esta sucursal
                  </div>
                </div>
              </button>

            </div>

            {/* Spinner Overlay */}
            {isExporting && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.75rem',
                borderRadius: '16px',
                zIndex: 10
              }}>
                <Loader2 size={36} className="animate-spin" style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                  Generando archivo de exportación...
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Keyframe animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
