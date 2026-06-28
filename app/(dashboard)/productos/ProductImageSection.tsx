'use client';

import { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, UploadCloud, Trash2, Camera, Sparkles } from 'lucide-react';

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

interface ProductImageSectionProps {
  initialImageUrl: string;
  initialYoutubeUrl?: string;
  showYoutubeEmbed?: boolean;
  nameForImageUrl?: string;
  nameForYoutubeUrl?: string;
  stateError?: string;
}

export default function ProductImageSection({
  initialImageUrl,
  initialYoutubeUrl = '',
  showYoutubeEmbed = true,
  nameForImageUrl = 'imageUrl',
  nameForYoutubeUrl = 'youtubeUrl',
  stateError
}: ProductImageSectionProps) {
  const [imageUrl, setImageUrl] = useState<string>(initialImageUrl);
  const [youtubeUrl, setYoutubeUrl] = useState<string>(initialYoutubeUrl);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCompresing, setIsCompressing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if initial values change (e.g. when cloning/editing changes)
  useEffect(() => {
    setImageUrl(initialImageUrl);
  }, [initialImageUrl]);

  useEffect(() => {
    setYoutubeUrl(initialYoutubeUrl);
  }, [initialYoutubeUrl]);

  // Synchronize state changes to hidden inputs in the Details form (if present in the DOM)
  useEffect(() => {
    const detailsInput = document.getElementById('details-imageUrl-input') as HTMLInputElement | null;
    if (detailsInput && detailsInput.value !== imageUrl) {
      detailsInput.value = imageUrl;
    }
  }, [imageUrl]);

  useEffect(() => {
    const detailsInput = document.getElementById('details-youtubeUrl-input') as HTMLInputElement | null;
    if (detailsInput && detailsInput.value !== youtubeUrl) {
      detailsInput.value = youtubeUrl;
    }
  }, [youtubeUrl]);

  const handleCompressFile = (file: File) => {
    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
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
        
        // Compress as JPEG with 0.7 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setImageUrl(dataUrl);
        setIsCompressing(false);
      };
      img.onerror = () => {
        setIsCompressing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setIsCompressing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCompressFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleCompressFile(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering file input click
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* Container display grid: left drop area, right URLs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        
        {/* Drag and Drop Zone Card */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          style={{
            minHeight: '220px',
            backgroundColor: isDragging ? 'rgba(79, 70, 229, 0.04)' : '#f8fafc',
            border: isDragging ? '2px dashed #4f46e5' : '2px dashed #cbd5e1',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            cursor: 'pointer',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: isDragging ? '0 0 20px rgba(79, 70, 229, 0.15)' : 'none',
            transform: isDragging ? 'scale(1.02)' : 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            userSelect: 'none'
          }}
        >
          {/* File Input hidden */}
          <input 
            type="file" 
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {isCompresing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTop: '3px solid #4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
              <span style={{ fontSize: '0.9rem', color: '#4f46e5', fontWeight: 'bold' }}>Optimizando imagen...</span>
            </div>
          ) : imageUrl ? (
            /* Preview mode inside dropzone */
            <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <img 
                src={imageUrl} 
                alt="Vista previa" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                opacity: 0,
                transition: 'opacity 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
              }}
              className="preview-overlay"
              >
                <button
                  type="button"
                  onClick={triggerFileInput}
                  style={{
                    backgroundColor: 'white',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  Cambiar Imagen
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '6px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  title="Eliminar Imagen"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <style>{`
                div:hover > .preview-overlay {
                  opacity: 1 !important;
                }
              `}</style>
            </div>
          ) : (
            /* Idle Drag Drop zone */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                backgroundColor: isDragging ? '#e0e7ff' : '#eff6ff', 
                color: isDragging ? '#4f46e5' : '#3b82f6', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '0.25rem',
                transition: 'all 0.2s'
              }}>
                <UploadCloud size={28} />
              </div>
              <div>
                <p style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e293b', margin: '0 0 0.25rem 0' }}>
                  {isDragging ? '¡Suelta la imagen ahora!' : 'Arrastra una imagen aquí'}
                </p>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  o haz clic para explorar tus archivos
                </p>
              </div>
              
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.4rem', 
                fontSize: '0.75rem', 
                color: '#10b981', 
                backgroundColor: '#ecfdf5', 
                padding: '0.25rem 0.6rem', 
                borderRadius: '999px',
                fontWeight: '600',
                marginTop: '0.25rem'
              }}>
                <Sparkles size={12} /> Compresión inteligente activa (max 800px)
              </div>
            </div>
          )}
        </div>

        {/* URLs Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: '1.4', margin: '0 0 1rem 0' }}>
              Sube una fotografía de tu artículo mediante arrastre (Drag & Drop), captúrala con la cámara, o introduce una URL externa de internet.
            </p>
            
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <label 
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.6rem 1.2rem', 
                  backgroundColor: 'white', 
                  border: '1px solid #3b82f6', 
                  color: '#3b82f6', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
              >
                <Camera size={16} /> Tomar foto / Examinar
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>

            {/* Input URL visible/hidden binded */}
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem', color: '#334155' }}>
              URL de la Imagen (Base64 automático)
            </label>
            <input 
              type="text" 
              name={nameForImageUrl} 
              value={imageUrl} 
              onChange={e => setImageUrl(e.target.value)} 
              placeholder="https://ejemplo.com/imagen.png o drop file..." 
              style={{ 
                width: '100%', 
                padding: '0.7rem', 
                borderRadius: '6px', 
                border: '1px solid #cbd5e1', 
                fontSize: '0.875rem',
                outline: 'none',
                backgroundColor: imageUrl.startsWith('data:image/') ? '#f8fafc' : 'white',
                color: imageUrl.startsWith('data:image/') ? '#64748b' : '#0f172a',
                fontFamily: imageUrl.startsWith('data:image/') ? 'monospace' : 'inherit'
              }} 
            />
            {imageUrl.startsWith('data:image/') && (
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                ⚡ Imagen cargada localmente y comprimida como Base64 ({Math.round(imageUrl.length / 1024)} KB)
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem', color: '#334155' }}>
              Enlace de Video YouTube (Opcional)
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '10px', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                <YoutubeIcon />
              </span>
              <input 
                type="url" 
                name={nameForYoutubeUrl} 
                value={youtubeUrl} 
                onChange={e => setYoutubeUrl(e.target.value)} 
                placeholder="https://www.youtube.com/watch?v=..." 
                style={{ 
                  width: '100%', 
                  padding: '0.7rem 0.7rem 0.7rem 2.2rem', 
                  borderRadius: '6px', 
                  border: '1px solid #cbd5e1', 
                  fontSize: '0.875rem',
                  outline: 'none'
                }} 
              />
            </div>
          </div>
        </div>

      </div>

      {/* State Error Message */}
      {stateError && (
        <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>
           {stateError}
        </div>
      )}

      {/* Live YouTube Embed preview inside edit mode */}
      {showYoutubeEmbed && youtubeUrl && (
        <div style={{ 
          marginTop: '0.5rem', 
          borderRadius: '8px', 
          overflow: 'hidden', 
          border: '1px solid #e2e8f0', 
          backgroundColor: '#000', 
          position: 'relative', 
          paddingTop: '56.25%' 
        }}>
          <iframe 
            src={youtubeUrl.includes('watch?v=') ? youtubeUrl.replace('watch?v=', 'embed/') : youtubeUrl} 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} 
            allowFullScreen 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          ></iframe>
        </div>
      )}

    </div>
  );
}
