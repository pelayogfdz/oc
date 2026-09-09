'use client';

import React, { useState, useTransition, useRef, useEffect } from 'react';
import { Sparkles, X, Loader2, Search, Check, AlertCircle, ShoppingCart, User, Plus, Trash2, ArrowRight, RefreshCw, Upload, Image as ImageIcon, FileText, Paperclip, Camera, RotateCcw } from 'lucide-react';
import { parseAndMatchQuoteAssistantAction, AssistantItemResult, AssistantParseResult, SuggestionOption } from '@/app/actions/quoteAssistant';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface UploadedFile {
  name: string;
  size: number;
  mimeType: string;
  base64: string;
  previewUrl?: string;
}

interface QuoteAIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  customers: any[];
  allProducts?: any[];
  initialCustomerId?: string | null;
  onApplyToQuote: (data: {
    customer: any | null;
    items: Array<{
      product: any;
      quantity: number;
      price: number;
    }>;
  }) => void;
}

function ProductImageThumbnail({
  imageUrl,
  name,
  size = 54
}: {
  imageUrl?: string | null;
  name: string;
  size?: number;
}) {
  const [imageError, setImageError] = useState(false);
  const cleanUrl = (imageUrl || '').trim();
  const isValidUrl = cleanUrl && cleanUrl !== 'placeholder' && cleanUrl !== '/placeholder.svg' && !cleanUrl.endsWith('/placeholders/default.png');

  if (!isValidUrl || imageError) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '8px',
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          flexShrink: 0
        }}
        title="Sin imagen"
      >
        <ImageIcon size={Math.round(size * 0.42)} />
      </div>
    );
  }

  return (
    <img
      src={cleanUrl.replace(/#/g, '%23')}
      alt={name}
      onError={() => setImageError(true)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'cover',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        backgroundColor: '#ffffff',
        flexShrink: 0,
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
      }}
    />
  );
}

export default function QuoteAIAssistantModal({
  isOpen,
  onClose,
  branchId,
  customers,
  allProducts = [],
  initialCustomerId,
  onApplyToQuote
}: QuoteAIAssistantModalProps) {
  const [inputText, setInputText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();
  const [parsedData, setParsedData] = useState<AssistantParseResult | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || '');
  const [items, setItems] = useState<AssistantItemResult[]>([]);
  const [manualSearchRowIndex, setManualSearchRowIndex] = useState<number | null>(null);
  const [manualSearchQuery, setManualSearchQuery] = useState('');

  // Reset all states whenever the modal is opened
  useEffect(() => {
    if (isOpen) {
      setInputText('');
      setUploadedFile(null);
      setParsedData(null);
      setItems([]);
      setSelectedCustomerId(initialCustomerId || '');
      setManualSearchRowIndex(null);
      setManualSearchQuery('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, initialCustomerId]);

  const handleClearAll = () => {
    setInputText('');
    setUploadedFile(null);
    setParsedData(null);
    setItems([]);
    setManualSearchRowIndex(null);
    setManualSearchQuery('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Asistente reiniciado.');
  };

  const handleCloseModal = () => {
    setInputText('');
    setUploadedFile(null);
    setParsedData(null);
    setItems([]);
    setManualSearchRowIndex(null);
    setManualSearchQuery('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  const currentCustomer = customers.find(c => c.id === selectedCustomerId) || null;

  const handleFileChange = (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande (máximo 15 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const isImage = file.type.startsWith('image/');
      setUploadedFile({
        name: file.name,
        size: file.size,
        mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'text/plain'),
        base64,
        previewUrl: isImage ? base64 : undefined
      });
      toast.success(`Archivo "${file.name}" cargado.`);
    };
    reader.onerror = () => {
      toast.error('No se pudo leer el archivo.');
    };
    reader.readAsDataURL(file);
  };

  const handleProcessText = () => {
    if (!inputText.trim() && !uploadedFile) {
      toast.error('Por favor escribe texto o sube una imagen/archivo.');
      return;
    }

    startTransition(async () => {
      const res = await parseAndMatchQuoteAssistantAction({
        text: inputText,
        fileBase64: uploadedFile?.base64,
        fileMimeType: uploadedFile?.mimeType,
        fileName: uploadedFile?.name,
        branchId,
        customerId: selectedCustomerId || null
      });

      if (!res.success) {
        toast.error(res.error || 'No se pudo procesar la solicitud.');
        return;
      }

      setParsedData(res);
      setItems(res.items);
      if (res.detectedCustomer && !selectedCustomerId) {
        setSelectedCustomerId(res.detectedCustomer.id);
      }
      toast.success(`Se detectaron ${res.items.length} conceptos.`);
    });
  };

  const handleCustomerChange = (newCustId: string) => {
    setSelectedCustomerId(newCustId);
    const newCust = customers.find(c => c.id === newCustId);
    const priceList = newCust?.priceList || 'price';

    // Recalculate prices for all selected products based on the new customer's price list
    setItems(prevItems => prevItems.map(item => {
      if (!item.selectedProduct) return item;
      const prod = item.selectedProduct;
      let newPrice = prod.price || 0;
      if (priceList === 'specialPrice' && prod.specialPrice && prod.specialPrice > 0) {
        newPrice = prod.specialPrice;
      } else if (priceList === 'wholesalePrice' && prod.wholesalePrice && prod.wholesalePrice > 0) {
        newPrice = prod.wholesalePrice;
      }
      return {
        ...item,
        assignedPrice: newPrice
      };
    }));
  };

  const handleSelectSuggestion = (itemIndex: number, suggestion: SuggestionOption) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== itemIndex) return item;
      return {
        ...item,
        selectedProduct: suggestion.product,
        selectedSource: suggestion.source,
        selectedBadge: suggestion.badge,
        assignedPrice: suggestion.assignedPrice
      };
    }));
  };

  const handleQuantityChange = (itemIndex: number, newQty: number) => {
    const validQty = isNaN(newQty) || newQty <= 0 ? 1 : newQty;
    setItems(prev => prev.map((it, idx) => idx === itemIndex ? { ...it, quantity: validQty } : it));
  };

  const handlePriceChange = (itemIndex: number, newPrice: number) => {
    const validPrice = isNaN(newPrice) || newPrice < 0 ? 0 : newPrice;
    setItems(prev => prev.map((it, idx) => idx === itemIndex ? { ...it, assignedPrice: validPrice } : it));
  };

  const handleDeleteItem = (itemIndex: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== itemIndex));
  };

  const handleAddNewItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `manual_${Date.now()}`,
        lineIndex: prev.length,
        rawQuery: '',
        quantity: 1,
        selectedProduct: null,
        selectedSource: 'UNRESOLVED',
        selectedBadge: 'Sin coincidencia (Seleccionar)',
        assignedPrice: 0,
        suggestions: []
      }
    ]);
  };

  const handleSelectManualProduct = (itemIndex: number, product: any) => {
    const priceList = currentCustomer?.priceList || 'price';
    let assignedPrice = product.price || 0;
    if (priceList === 'specialPrice' && product.specialPrice && product.specialPrice > 0) {
      assignedPrice = product.specialPrice;
    } else if (priceList === 'wholesalePrice' && product.wholesalePrice && product.wholesalePrice > 0) {
      assignedPrice = product.wholesalePrice;
    }

    setItems(prev => prev.map((it, idx) => {
      if (idx !== itemIndex) return it;
      return {
        ...it,
        selectedProduct: {
          id: product.id,
          sku: product.sku,
          barcode: product.barcode,
          name: product.name,
          stock: product.stock,
          price: product.price,
          wholesalePrice: product.wholesalePrice,
          specialPrice: product.specialPrice,
          unit: product.unit,
          imageUrl: product.imageUrl
        },
        selectedSource: 'DIRECT',
        selectedBadge: 'Seleccionado Manualmente',
        assignedPrice
      };
    }));
    setManualSearchRowIndex(null);
    setManualSearchQuery('');
  };

  const handleApply = () => {
    const validItems = items.filter(it => it.selectedProduct !== null);
    if (validItems.length === 0) {
      toast.error('No hay productos válidos seleccionados para cargar a la cotización.');
      return;
    }

    const payload = validItems.map(it => ({
      product: it.selectedProduct,
      quantity: it.quantity,
      price: it.assignedPrice
    }));

    onApplyToQuote({
      customer: currentCustomer,
      items: payload
    });

    toast.success(`${payload.length} productos cargados a la cotización.`);
    handleCloseModal();
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, it) => sum + (it.selectedProduct ? it.quantity * it.assignedPrice : 0), 0);
  };

  const getSourceBadgeStyle = (source: string) => {
    switch (source) {
      case 'HISTORY':
        return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
      case 'DIRECT':
        return { backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' };
      case 'TOP_SELLER':
        return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
      case 'HIGH_STOCK':
        return { backgroundColor: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff' };
      default:
        return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
    }
  };

  // Filter products for manual search dropdown
  const filteredCatalogProducts = manualSearchQuery.trim().length >= 2
    ? allProducts.filter(p => {
        const q = manualSearchQuery.toLowerCase();
        return (p.name && p.name.toLowerCase().includes(q)) ||
               (p.sku && p.sku.toLowerCase().includes(q)) ||
               (p.barcode && p.barcode.includes(q));
      }).slice(0, 15)
    : [];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '98vw',
        maxWidth: '1750px',
        height: '96vh',
        maxHeight: '96vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1px solid #cbd5e1',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              backgroundColor: '#6366f1',
              color: '#ffffff',
              padding: '0.6rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)'
            }}>
              <Sparkles size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                Asistente Inteligente de Cotizaciones
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                Pega el texto, sube una imagen/archivo o combina ambos para extraer conceptos, consultar el catálogo y asignar precios automáticamente.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {(inputText || uploadedFile || items.length > 0) && (
              <button
                type="button"
                onClick={handleClearAll}
                title="Limpiar y reiniciar todo"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <RotateCcw size={14} />
                Limpiar Todo
              </button>
            )}
            <button
              onClick={handleCloseModal}
              title="Cerrar"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '0.5rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Step 1: Input Box (Text or File/Image) */}
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.25rem',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>1. Pega la solicitud en texto o sube una imagen / documento:</span>
              </label>
              <button
                type="button"
                onClick={() => setInputText("*Una caja de hojas blancas tamaño carta\n*Caja de 10 plumas (tinta negra y azul)\n*1 caja de 10 Lápices o lapiceros\n*Una engrapadora\n*Sacapuntas\n*4 libretas de bolsillo")}
                style={{
                  fontSize: '0.75rem',
                  color: '#6366f1',
                  background: '#eef2ff',
                  border: '1px solid #c7d2fe',
                  borderRadius: '6px',
                  padding: '0.3rem 0.6rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cargar Ejemplo Completo
              </button>
            </div>

            {/* Dual Input Area: Textarea + Drag & Drop Upload Zone */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '0.75rem' }}>
              {/* Text Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>
                  Texto / Mensaje de WhatsApp / Correo / Lista:
                </span>
                <textarea
                  rows={4}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Escribe o pega aquí la lista o mensaje del cliente (ej: *4 libretas de bolsillo, *10 plumas bic azul)..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: '100px'
                  }}
                />
              </div>

              {/* File / Image Upload Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>
                  Imagen / Foto de pedido / PDF / Documento adjunto:
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,.pdf,.txt,.csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileChange(f);
                  }}
                  style={{ display: 'none' }}
                />

                {!uploadedFile ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleFileChange(f);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragging ? '#6366f1' : '#cbd5e1'}`,
                      backgroundColor: isDragging ? '#eef2ff' : '#f8fafc',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      minHeight: '100px',
                      transition: 'all 0.15s ease',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6366f1', marginBottom: '0.25rem' }}>
                      <Upload size={20} />
                      <ImageIcon size={18} />
                      <FileText size={18} />
                    </div>
                    <span style={{ fontSize: '0.825rem', fontWeight: '600', color: '#334155' }}>
                      Arrastra una imagen, foto o PDF aquí
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      o haz clic para explorar tus archivos (JPG, PNG, PDF, TXT)
                    </span>
                  </div>
                ) : (
                  <div style={{
                    border: '1px solid #c7d2fe',
                    backgroundColor: '#f5f3ff',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '100px',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                      {uploadedFile.previewUrl ? (
                        <img
                          src={uploadedFile.previewUrl}
                          alt="Vista previa"
                          style={{
                            width: '56px',
                            height: '56px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            border: '1px solid #e0e7ff',
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '6px',
                          backgroundColor: '#e0e7ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#4f46e5',
                          flexShrink: 0
                        }}>
                          <FileText size={24} />
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span style={{
                          fontSize: '0.825rem',
                          fontWeight: '600',
                          color: '#1e293b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {uploadedFile.name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {(uploadedFile.size / 1024).toFixed(1)} KB • {uploadedFile.mimeType.split('/')[1]?.toUpperCase() || 'DOCUMENTO'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Check size={12} /> Listo para extraer datos con IA
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      title="Quitar archivo"
                      style={{
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        borderRadius: '6px',
                        padding: '0.4rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={handleProcessText}
                disabled={isPending || (!inputText.trim() && !uploadedFile)}
                style={{
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.65rem 1.5rem',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: isPending || (!inputText.trim() && !uploadedFile) ? 'not-allowed' : 'pointer',
                  opacity: isPending || (!inputText.trim() && !uploadedFile) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.3)'
                }}
              >
                {isPending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Analizando y Consultando Catálogo con IA...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Analizar y Sugerir Productos
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 2: Customer Selection & Results */}
          {items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              {/* Customer Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '300px' }}>
                  <User size={18} color="#6366f1" />
                  <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1e293b' }}>Cliente Asignado:</span>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    style={{
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      backgroundColor: '#ffffff',
                      flex: 1,
                      maxWidth: '450px'
                    }}
                  >
                    <option value="">-- Sin Cliente (Público en General) --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.taxId ? `(${c.taxId})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Lista de Precios:</span>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '12px',
                    backgroundColor: currentCustomer?.priceList === 'specialPrice' ? '#dbeafe' : currentCustomer?.priceList === 'wholesalePrice' ? '#fef3c7' : '#f1f5f9',
                    color: currentCustomer?.priceList === 'specialPrice' ? '#1d4ed8' : currentCustomer?.priceList === 'wholesalePrice' ? '#b45309' : '#475569',
                    textTransform: 'uppercase'
                  }}>
                    {currentCustomer?.priceList === 'specialPrice' ? 'Precio Especial' : currentCustomer?.priceList === 'wholesalePrice' ? 'Precio Mayoreo' : 'Precio Público'}
                  </span>
                </div>
              </div>

              {/* Items Table / List - Full space, expanded layout */}
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  padding: '0.85rem 1.25rem',
                  backgroundColor: '#f1f5f9',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#334155' }}>
                    Conceptos Detectados ({items.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #c7d2fe',
                      color: '#4f46e5',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <Plus size={14} />
                    Agregar Renglón
                  </button>
                </div>

                <div style={{ overflowY: 'auto' }}>
                  {items.map((item, index) => {
                    const rowTotal = (item.quantity || 0) * (item.assignedPrice || 0);
                    const badgeStyle = getSourceBadgeStyle(item.selectedSource);

                    return (
                      <div
                        key={item.id || index}
                        style={{
                          padding: '1rem 1.25rem',
                          borderBottom: index < items.length - 1 ? '1px solid #f1f5f9' : 'none',
                          display: 'grid',
                          gridTemplateColumns: '80px 1fr 120px 140px 40px',
                          alignItems: 'center',
                          gap: '1.25rem',
                          backgroundColor: item.selectedProduct ? '#ffffff' : '#fff7ed'
                        }}
                      >
                        {/* Cantidad */}
                        <div>
                          <label style={{ fontSize: '0.725rem', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Cant.</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value))}
                            style={{
                              width: '100%',
                              padding: '0.45rem 0.5rem',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.9rem',
                              fontWeight: 'bold',
                              textAlign: 'center'
                            }}
                          />
                        </div>

                        {/* Concepto & Producto Sugerido (Amplitud Total) */}
                        <div style={{ minWidth: 0 }}>
                          {item.rawQuery && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.35rem' }}>
                              Solicitado: <span style={{ fontWeight: '600', color: '#334155' }}>"{item.rawQuery}"</span>
                            </div>
                          )}

                          {item.selectedProduct ? (
                            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                              <ProductImageThumbnail
                                imageUrl={item.selectedProduct.imageUrl}
                                name={item.selectedProduct.name}
                                size={56}
                              />
                              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>
                                    {item.selectedProduct.name}
                                  </span>
                                  <span style={{
                                    fontSize: '0.725rem',
                                    fontWeight: '700',
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '6px',
                                    ...badgeStyle
                                  }}>
                                    {item.selectedBadge}
                                  </span>
                                </div>

                                <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <span>SKU: <strong style={{ color: '#334155' }}>{item.selectedProduct.sku}</strong></span>
                                  <span>Stock en Sucursal: <strong style={{ color: item.selectedProduct.stock > 0 ? '#166534' : '#dc2626' }}>{item.selectedProduct.stock} pzas</strong></span>
                                  {item.selectedProduct.unit && <span>Unidad: <strong style={{ color: '#334155' }}>{item.selectedProduct.unit}</strong></span>}
                                </div>

                                {/* Alternative Suggestions Selector (Expanded Width) */}
                                {item.suggestions.length > 1 && (
                                  <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569' }}>Otras opciones sugeridas:</span>
                                    <select
                                      onChange={(e) => {
                                        const found = item.suggestions.find(s => s.product.id === e.target.value);
                                        if (found) handleSelectSuggestion(index, found);
                                      }}
                                      value={item.selectedProduct.id}
                                      style={{
                                        fontSize: '0.8rem',
                                        padding: '0.3rem 0.6rem',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        backgroundColor: '#f8fafc',
                                        width: '100%',
                                        maxWidth: '550px'
                                      }}
                                    >
                                      {item.suggestions.map((sug, sIdx) => (
                                        <option key={sIdx} value={sug.product.id}>
                                          [{sug.badge}] {sug.product.name} — {formatCurrency(sug.assignedPrice)} (Stock: {sug.product.stock})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            /* Unresolved / Manual Search */
                            <div style={{ position: 'relative' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.8rem', color: '#c2410c', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <AlertCircle size={16} /> Sin coincidencia directa
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManualSearchRowIndex(index);
                                    setManualSearchQuery(item.rawQuery || '');
                                  }}
                                  style={{
                                    fontSize: '0.8rem',
                                    color: '#4f46e5',
                                    background: '#eef2ff',
                                    border: '1px solid #c7d2fe',
                                    borderRadius: '6px',
                                    padding: '0.3rem 0.75rem',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                  }}
                                >
                                  🔍 Buscar en Catálogo Manualmente
                                </button>
                              </div>

                              {manualSearchRowIndex === index && (
                                <div style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 0,
                                  width: '100%',
                                  maxWidth: '500px',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '8px',
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
                                  zIndex: 50,
                                  padding: '0.75rem',
                                  marginTop: '0.35rem'
                                }}>
                                  <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input
                                      type="text"
                                      value={manualSearchQuery}
                                      onChange={(e) => setManualSearchQuery(e.target.value)}
                                      placeholder="Buscar por nombre, SKU o código de barras..."
                                      autoFocus
                                      style={{
                                        width: '100%',
                                        padding: '0.45rem 0.5rem 0.45rem 2rem',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.825rem'
                                      }}
                                    />
                                  </div>
                                  <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    {filteredCatalogProducts.map(p => (
                                      <div
                                        key={p.id}
                                        onClick={() => handleSelectManualProduct(index, p)}
                                        style={{
                                          padding: '0.45rem 0.6rem',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          fontSize: '0.8rem',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          border: '1px solid #f1f5f9',
                                          gap: '0.6rem'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden', flex: 1 }}>
                                          <ProductImageThumbnail imageUrl={p.imageUrl} name={p.name} size={36} />
                                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <strong>{p.name}</strong> <span style={{ color: '#64748b' }}>({p.sku})</span>
                                          </div>
                                        </div>
                                        <span style={{ fontWeight: 'bold', color: '#4f46e5', flexShrink: 0 }}>{formatCurrency(p.price)}</span>
                                      </div>
                                    ))}
                                    {filteredCatalogProducts.length === 0 && (
                                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '0.75rem' }}>
                                        Escribe al menos 2 letras para buscar en el catálogo...
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Precio Unitario */}
                        <div>
                          <label style={{ fontSize: '0.725rem', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>P. Unitario</label>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8' }}>$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.assignedPrice}
                              onChange={(e) => handlePriceChange(index, parseFloat(e.target.value))}
                              disabled={!item.selectedProduct}
                              style={{
                                width: '100%',
                                padding: '0.45rem 0.5rem 0.45rem 1.25rem',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.875rem',
                                fontWeight: '700',
                                textAlign: 'right'
                              }}
                            />
                          </div>
                        </div>

                        {/* Total Renglón */}
                        <div style={{ textAlign: 'right' }}>
                          <label style={{ fontSize: '0.725rem', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Total</label>
                          <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>
                            {formatCurrency(rowTotal)}
                          </span>
                        </div>

                        {/* Eliminar */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(index)}
                            title="Eliminar renglón"
                            style={{
                              background: '#fee2e2',
                              border: '1px solid #fecaca',
                              cursor: 'pointer',
                              color: '#dc2626',
                              padding: '0.45rem',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {items.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Partidas Seleccionadas:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b' }}>
                  {items.filter(it => it.selectedProduct !== null).length} de {items.length}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Total Estimado:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#4f46e5' }}>
                  {formatCurrency(calculateSubtotal())}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Ingresa el texto y haz clic en "Analizar y Sugerir Productos".
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleCloseModal}
              style={{
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.6rem 1rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            {items.length > 0 && (
              <button
                type="button"
                onClick={handleApply}
                disabled={items.filter(it => it.selectedProduct !== null).length === 0}
                style={{
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.6rem 1.25rem',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <ShoppingCart size={16} />
                Cargar a Cotización
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
