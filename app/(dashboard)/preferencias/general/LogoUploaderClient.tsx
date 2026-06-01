'use client';

import { useState } from 'react';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { updateBranchLogo } from '@/app/actions/settings';

export default function LogoUploaderClient({ initialLogoUrl }: { initialLogoUrl: string }) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl || '');
  const [status, setStatus] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatus('Error: El archivo debe ser una imagen.');
      return;
    }

    setStatus('Procesando y optimizando logotipo...');
    setIsPending(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress as JPEG at 0.75 quality for lightweight storage
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        saveLogo(compressedBase64);
      };
      img.onerror = () => {
        setStatus('Error al decodificar la imagen.');
        setIsPending(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setStatus('Error al leer el archivo.');
      setIsPending(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const saveLogo = async (base64Data: string) => {
    try {
      await updateBranchLogo(base64Data);
      setLogoUrl(base64Data);
      setStatus('✓ Logotipo guardado correctamente.');
      setTimeout(() => setStatus(''), 3000);
    } catch (err: any) {
      setStatus('Error al guardar: ' + err.message);
    } finally {
      setIsPending(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (confirm('¿Estás seguro de que deseas eliminar el logotipo de la empresa?')) {
      setIsPending(true);
      try {
        await updateBranchLogo('');
        setLogoUrl('');
        setStatus('✓ Logotipo eliminado.');
        setTimeout(() => setStatus(''), 3000);
      } catch (err: any) {
        setStatus('Error al eliminar: ' + err.message);
      } finally {
        setIsPending(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--pulpos-border)', marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <ImageIcon size={24} color="var(--pulpos-primary)" /> Logotipo de la Empresa
      </h2>
      <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1rem' }}>
        Sube el logotipo oficial de tu empresa. Aparecerá de forma automática en todas las notas de venta, cotizaciones, traspasos, compras y tickets térmicos.
      </p>

      {status && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: status.startsWith('Error') ? '#fef2f2' : '#dcfce7',
          color: status.startsWith('Error') ? '#ef4444' : '#166534',
          border: '1px solid',
          borderColor: status.startsWith('Error') ? '#fecaca' : '#bbf7d0',
          borderRadius: '6px',
          marginBottom: '1.5rem',
          fontWeight: '500',
          fontSize: '0.9rem'
        }}>
          {status}
        </div>
      )}

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Logo Preview Container */}
        <div style={{
          width: '140px',
          height: '140px',
          backgroundColor: '#f8fafc',
          border: logoUrl ? '1px solid var(--pulpos-border)' : '2px dashed #cbd5e1',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: logoUrl ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
          transition: 'all 0.3s ease'
        }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo de la empresa" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '0.5rem' }} />
          ) : (
            <div style={{ textAlign: 'center', padding: '0.5rem' }}>
              <ImageIcon size={32} style={{ marginBottom: '0.25rem', opacity: 0.7 }} />
              <div style={{ fontSize: '0.75rem' }}>Sin Logo</div>
            </div>
          )}
        </div>

        {/* Upload Control Area */}
        <div style={{ flex: 1, minWidth: '250px' }}>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: isDragging ? '2px dashed var(--pulpos-primary)' : '2px dashed #e2e8f0',
              backgroundColor: isDragging ? '#eff6ff' : '#f8fafc',
              borderRadius: '8px',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isPending}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: isPending ? 'not-allowed' : 'pointer'
              }}
            />
            <Upload size={28} color="var(--pulpos-primary)" style={{ margin: '0 auto 0.5rem auto', opacity: 0.8 }} />
            <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', fontSize: '0.9rem', color: '#334155' }}>
              {isPending ? 'Procesando archivo...' : 'Arrastra tu imagen aquí o haz clic para buscar'}
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
              Formatos recomendados: PNG, JPG (Se optimizará a JPEG de alta compresión)
            </p>
          </div>

          {logoUrl && (
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="button"
                onClick={handleDeleteLogo}
                disabled={isPending}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: '#fee2e2',
                  color: '#ef4444',
                  border: '1px solid #fca5a5',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.backgroundColor = '#fecaca'; }}
                onMouseLeave={(e) => { if (!isPending) e.currentTarget.style.backgroundColor = '#fee2e2'; }}
              >
                <Trash2 size={14} /> Eliminar Logotipo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
