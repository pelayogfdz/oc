'use client';

import { useState, useRef, useEffect } from 'react';
import { submitAuditCount, updateAuditStatus, finalizeAudit } from '@/app/actions/audit';
import { Save, Download, CheckCircle, ArrowRight, ArrowLeft, Upload, Search, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import BackButton from '@/app/components/ui/BackButton';

const ITEMS_PER_PAGE = 50;

export default function AuditDetailClient({ audit, products }: { audit: any, products: any[] }) {
  const router = useRouter();

  // Phase logic
  const isPhase1 = audit.status === 'COUNT_1';
  const isPhase2 = audit.status === 'COUNT_2';
  const isPhase3 = audit.status === 'COUNT_3';
  const isCompleted = audit.status === 'COMPLETED';

  // The local array maps what the user is currently editing
  const [editingCounts, setEditingCounts] = useState<{ [key: string]: string }>({});
  const [isPending, setIsPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'COUNTED' | 'PENDING'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Initialize editing counts based on the current Phase
  useEffect(() => {
    const initialState: { [key: string]: string } = {};
    if (isPhase1) {
      products.forEach(p => {
        const existing = audit.items.find((i: any) => i.productId === p.id);
        if (existing?.count1 !== null && existing?.count1 !== undefined) {
          initialState[p.id] = String(existing.count1);
        }
      });
    } else if (isPhase2) {
      audit.items.forEach((i: any) => {
        if (i.count1 !== i.systemStock) {
          initialState[i.productId] = i.count2 !== null && i.count2 !== undefined ? String(i.count2) : "";
        }
      });
    } else if (isPhase3) {
      audit.items.forEach((i: any) => {
        if (i.count1 !== i.systemStock && (i.count2 === null || i.count1 !== i.count2)) {
          initialState[i.productId] = i.count3 !== null && i.count3 !== undefined ? String(i.count3) : "";
        }
      });
    }

    // Load draft from localStorage if available
    try {
      const localStorageKey = `audit_draft_${audit.id}_${audit.status}`;
      const draft = localStorage.getItem(localStorageKey);
      if (draft) {
        const parsedDraft = JSON.parse(draft);
        Object.assign(initialState, parsedDraft);
      }
    } catch (e) {
      console.error("Error reading draft from localStorage:", e);
    }

    setEditingCounts(initialState);
    setCurrentPage(1);
  }, [audit.status, audit.items, products, audit.id]);

  const getCurrentFilterTarget = () => {
    if (isCompleted) {
      return audit.items.map((i: any) => ({
        ...i.product,
        finalCount: i.finalCount,
        systemStock: i.systemStock,
        expectedDiff: (i.finalCount ?? i.count3 ?? i.count2 ?? i.count1 ?? i.systemStock) - i.systemStock
      }));
    }
    if (isPhase1) return products;
    if (isPhase2) return audit.items.filter((i: any) => i.count1 !== i.systemStock).map((i: any) => i.product);
    if (isPhase3) {
      return audit.items
        .filter((i: any) => i.count1 !== i.systemStock && (i.count2 === null || i.count1 !== i.count2))
        .map((i: any) => i.product);
    }
    return [];
  };

  const currentProducts = getCurrentFilterTarget();

  // Filtered list (keeps stable order so rows NEVER jump when typing!)
  const filteredProducts = (() => {
    let list = currentProducts;

    // Only apply COUNTED/PENDING filter when not actively searching by code/name
    if (!isCompleted && filterMode !== 'ALL' && searchQuery.trim() === '') {
      list = list.filter((p: any) => {
        const val = editingCounts[p.id];
        const hasVal = val !== undefined && val !== '';
        return filterMode === 'COUNTED' ? hasVal : !hasVal;
      });
    }

    if (searchQuery.trim() !== '') {
      const normQuery = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const normQueryNoZero = normQuery.replace(/^0+/, '');
      const searchWords = normQuery.split(/\s+/).filter(w => w.length > 0);
      list = list.filter((p: any) => {
        const normName = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normSku = (p.sku || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normBarcode = (p.barcode || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normBarcodeNoZero = normBarcode.replace(/^0+/, '');
        return searchWords.every(w =>
          normName.includes(w) ||
          normSku.includes(w) ||
          normBarcode.includes(w) ||
          (normQueryNoZero.length >= 6 && normBarcodeNoZero === normQueryNoZero)
        );
      });
    }

    return list;
  })();

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const handleUpdateCount = (productId: string, val: string) => {
    setEditingCounts(prev => {
      const updated = { ...prev, [productId]: val };
      try {
        const localStorageKey = `audit_draft_${audit.id}_${audit.status}`;
        localStorage.setItem(localStorageKey, JSON.stringify(updated));
      } catch (e) {
        console.error("Error saving draft to localStorage:", e);
      }
      return updated;
    });
  };

  // Focus a specific product input, switching pages automatically if needed
  const focusProductAtIndex = (globalIndex: number) => {
    if (globalIndex < 0 || globalIndex >= filteredProducts.length) return;
    const targetProduct = filteredProducts[globalIndex];
    const targetPage = Math.floor(globalIndex / ITEMS_PER_PAGE) + 1;
    setActiveProductId(targetProduct.id);
    if (targetPage !== safePage) {
      setCurrentPage(targetPage);
      setTimeout(() => {
        const el = inputRefs.current[targetProduct.id];
        if (el) {
          el.focus();
          el.select();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 60);
    } else {
      setTimeout(() => {
        const el = inputRefs.current[targetProduct.id];
        if (el) {
          el.focus();
          el.select();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 20);
    }
  };

  const focusProductById = (productId: string) => {
    const idx = filteredProducts.findIndex((p: any) => p.id === productId);
    if (idx !== -1) {
      focusProductAtIndex(idx);
    }
  };

  const handleSearchScanSubmit = (queryText?: string) => {
    const q = (queryText ?? searchQuery).trim().toLowerCase();
    if (!q || filteredProducts.length === 0) return;
    const qNoZero = q.replace(/^0+/, '');

    // Prioritize exact barcode or SKU match
    const exactMatch =
      filteredProducts.find((p: any) => {
        const b = (p.barcode || '').trim().toLowerCase();
        const bNoZero = b.replace(/^0+/, '');
        const s = (p.sku || '').trim().toLowerCase();
        return (b && b === q) || (qNoZero.length >= 6 && bNoZero === qNoZero) || (s && s === q);
      }) || filteredProducts[0];

    if (exactMatch) {
      focusProductById(exactMatch.id);
    }
  };

  // Auto-focus quantity input when a barcode scanner finishes typing an exact barcode (even if scanner has no Enter suffix)
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 6 || isCompleted) return;
    const qNoZero = q.replace(/^0+/, '');

    const exactBarcodeMatches = filteredProducts.filter((p: any) => {
      const b = (p.barcode || '').trim().toLowerCase();
      const bNoZero = b.replace(/^0+/, '');
      return (b && b === q) || (qNoZero.length >= 6 && bNoZero === qNoZero);
    });

    if (exactBarcodeMatches.length === 1) {
      const timer = setTimeout(() => {
        if (document.activeElement === searchInputRef.current) {
          focusProductById(exactBarcodeMatches[0].id);
        }
      }, 140);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, isCompleted]);

  const returnToSearchAndClear = () => {
    setSearchQuery('');
    setCurrentPage(1);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    }, 20);
  };

  const handleStepRow = (direction: 'prev' | 'next', fromProductId?: string) => {
    if (filteredProducts.length === 0) return;
    const refId = fromProductId || activeProductId;
    const currentIndex = refId ? filteredProducts.findIndex((p: any) => p.id === refId) : -1;
    if (currentIndex === -1) {
      const firstIdxOnPage = (safePage - 1) * ITEMS_PER_PAGE;
      focusProductAtIndex(firstIdxOnPage);
      return;
    }
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < filteredProducts.length) {
      focusProductAtIndex(nextIndex);
    }
  };

  const processCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n');
      const newCounts = { ...editingCounts };
      
      let matchedCount = 0;
      rows.forEach((row, idx) => {
        if (idx === 0) return; // Skip header
        if (!row.trim()) return;

        const cols = row.split(',');
        if (cols.length >= 2) {
          const sku = cols[0].trim();
          const quantity = cols[1].trim();
          if (quantity === "") return;

          const prod = products.find(p => p.sku === sku);
          
          if (prod && (Object.prototype.hasOwnProperty.call(editingCounts, prod.id) || isPhase1)) {
            newCounts[prod.id] = quantity;
            matchedCount++;
          }
        }
      });
      setEditingCounts(newCounts);
      try {
        const localStorageKey = `audit_draft_${audit.id}_${audit.status}`;
        localStorage.setItem(localStorageKey, JSON.stringify(newCounts));
      } catch (err) {
        console.error("Error saving draft to localStorage:", err);
      }
      alert(`Se encontraron e importaron ${matchedCount} productos del archivo CSV exitosamente.`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
    let content = "sku,cantidad\n";
    currentProducts.forEach((p: any) => {
      if (p.sku) content += `${p.sku},\n`;
    });
    
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Plantilla_Auditoria_${audit.status}.csv`;
    a.click();
  };

  const buildPayloadForCurrentPhase = () => {
    const payload: { productId: string, count: number | null }[] = [];
    const phaseField = isPhase1 ? 'count1' : isPhase2 ? 'count2' : 'count3';

    Object.entries(editingCounts).forEach(([pid, val]) => {
      const trimmed = (val ?? '').trim();
      if (trimmed !== "") {
        const parsed = parseInt(trimmed, 10);
        if (!isNaN(parsed)) {
          payload.push({ productId: pid, count: parsed });
        }
      } else {
        // Check if this product previously had a saved value in this phase and was cleared by the user
        const existingItem = audit.items.find((i: any) => i.productId === pid);
        if (existingItem && existingItem[phaseField] !== null && existingItem[phaseField] !== undefined) {
          payload.push({ productId: pid, count: null });
        }
      }
    });

    return payload;
  };

  const saveCurrentPhaseProgress = async () => {
    if (isCompleted) return;
    const payload = buildPayloadForCurrentPhase();
    const phaseNum = isPhase1 ? 1 : isPhase2 ? 2 : 3;
    if (payload.length > 0) {
      await submitAuditCount(audit.id, phaseNum, payload);
    }
    try {
      const localStorageKey = `audit_draft_${audit.id}_${audit.status}`;
      localStorage.removeItem(localStorageKey);
    } catch (err) {
      console.error("Error removing draft from localStorage:", err);
    }
  };

  const handleSaveOnly = async () => {
    setIsPending(true);
    try {
      await saveCurrentPhaseProgress();
      router.refresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsPending(false);
    }
  };

  const handleGoToPhase = async (targetPhase: 'COUNT_1' | 'COUNT_2' | 'COUNT_3') => {
    if (audit.status === targetPhase) return;
    setIsPending(true);
    try {
      if (!isCompleted) {
        await saveCurrentPhaseProgress();
      }
      await updateAuditStatus(audit.id, targetPhase);
      router.refresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsPending(false);
    }
  };

  const handlePreviousPhase = async () => {
    if (isPhase2) {
      await handleGoToPhase('COUNT_1');
    } else if (isPhase3) {
      await handleGoToPhase('COUNT_2');
    } else if (isCompleted) {
      await handleGoToPhase('COUNT_3');
    }
  };

  const handleSaveAndNext = async (isFinalize: boolean = false) => {
    setIsPending(true);
    try {
      if (!isCompleted) {
        await saveCurrentPhaseProgress();
      }

      if (isFinalize) {
        if (!confirm('Esto inyectará los ajustes finales al sistema y alterará tu inventario real. ¿Estás seguro?')) {
          setIsPending(false);
          return;
        }
        await finalizeAudit(audit.id);
      } else {
        const nextPhase = isPhase1 ? 'COUNT_2' : 'COUNT_3';
        await updateAuditStatus(audit.id, nextPhase);
      }

      router.refresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsPending(false);
    }
  };

  const countedInCurrentPhase = currentProducts.filter((p: any) => {
    const val = editingCounts[p.id];
    return val !== undefined && val !== '';
  }).length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ marginBottom: '0.5rem' }}>
            <BackButton fallbackHref="/productos/auditorias" label="Volver a Auditorías" style={{ color: '#3b82f6', fontSize: '0.9rem' }} />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {audit.name}
            {isCompleted && <CheckCircle color="#10b981" size={24} />}
          </h1>
          <p style={{ color: 'var(--caanma-text-muted)', margin: 0 }}>
            Sucursal: <strong style={{ color: '#0f172a' }}>{audit.branch?.name || 'Sucursal Principal'}</strong> &bull; Id: {audit.id}
          </p>
        </div>

        {/* Interactive Phase Timeline & Quick Anterior / Siguiente Phase Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--caanma-border)' }}>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleGoToPhase('COUNT_1')}
              title="Ir a Fase 1: Conteo Ciego"
              style={{
                border: 'none',
                background: isPhase1 ? '#eff6ff' : 'transparent',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                cursor: isPending ? 'not-allowed' : 'pointer',
                fontWeight: isPhase1 ? 'bold' : 'normal',
                color: isPhase1 ? '#2563eb' : (isPhase2 || isPhase3 || isCompleted) ? '#10b981' : '#94a3b8'
              }}
            >
              1. Conteo Ciego
            </button>
            <ArrowRight size={16} color="#cbd5e1" />
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleGoToPhase('COUNT_2')}
              title="Ir a Fase 2: Diferencias"
              style={{
                border: 'none',
                background: isPhase2 ? '#eff6ff' : 'transparent',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                cursor: isPending ? 'not-allowed' : 'pointer',
                fontWeight: isPhase2 ? 'bold' : 'normal',
                color: isPhase2 ? '#2563eb' : (isPhase3 || isCompleted) ? '#10b981' : '#94a3b8'
              }}
            >
              2. Diferencias
            </button>
            <ArrowRight size={16} color="#cbd5e1" />
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleGoToPhase('COUNT_3')}
              title="Ir a Fase 3: Verificación Final"
              style={{
                border: 'none',
                background: isPhase3 ? '#eff6ff' : 'transparent',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                cursor: isPending ? 'not-allowed' : 'pointer',
                fontWeight: isPhase3 ? 'bold' : 'normal',
                color: isPhase3 ? '#2563eb' : isCompleted ? '#10b981' : '#94a3b8'
              }}
            >
              3. Verificación Final
            </button>
          </div>

          {/* Top Anterior / Siguiente Phase Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {!isPhase1 && (
              <button
                type="button"
                onClick={handlePreviousPhase}
                disabled={isPending}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.9rem',
                  backgroundColor: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  color: '#334155',
                  cursor: isPending ? 'not-allowed' : 'pointer'
                }}
              >
                <ArrowLeft size={16} />
                {isCompleted ? 'Regresar a Editar' : 'Fase Anterior'}
              </button>
            )}
            {!isCompleted && (
              <button
                type="button"
                onClick={() => handleSaveAndNext(isPhase3)}
                disabled={isPending}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: isPending ? 'not-allowed' : 'pointer'
                }}
              >
                {isPhase3 ? 'Finalizar Auditoría' : 'Siguiente Fase'}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {!isCompleted && (
        <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#e0f2fe', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #bae6fd', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', color: '#0369a1', fontSize: '1.1rem' }}>
              {isPhase1 && 'Fase 1: Haz un Conteo Ciego'}
              {isPhase2 && 'Fase 2: Validar Discrepancias'}
              {isPhase3 && 'Fase 3: Aclaración de Tercer Nivel'}
            </h3>
            <p style={{ margin: 0, color: '#0284c7', fontSize: '0.9rem' }}>
              {isPhase1 && `Introduce la cuenta física total (${countedInCurrentPhase} de ${currentProducts.length} productos capturados).`}
              {isPhase2 && `Mostrando sólo las diferencias encontradas (${currentProducts.length} productos afectados). Si te equivocaste en Cuenta 1, usa el botón "Anterior" para corregir.`}
              {isPhase3 && `Última revisión obligatoria. Si necesitas corregir la Cuenta 2, usa el botón "Anterior" para regresar.`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} color="#0284c7" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                ref={searchInputRef}
                autoFocus
                type="text" 
                placeholder="Escanea código, SKU o nombre..." 
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    handleSearchScanSubmit(e.currentTarget.value);
                  }
                }}
                style={{ padding: '0.65rem 1rem 0.65rem 2.5rem', borderRadius: '6px', border: '1px solid #7dd3fc', outline: 'none', width: '280px', backgroundColor: 'white', fontSize: '0.95rem' }}
              />
            </div>
            <button onClick={handleDownloadTemplate} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white' }}>
              <Download size={18} /> Descargar Plantilla .CSV
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={18} /> Cargar Datos (CSV)
            </button>
            <input type="file" accept=".csv" ref={fileInputRef} onChange={processCSV} style={{ display: 'none' }} />
          </div>
        </div>
      )}

      {/* Navigation & Filter Toolbar for Product Rows and Pages */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '0.75rem',
        padding: '0.75rem 1rem',
        backgroundColor: 'white',
        borderRadius: '10px',
        border: '1px solid var(--caanma-border)'
      }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {!isCompleted && (
            <>
              <button
                type="button"
                onClick={() => { setFilterMode('ALL'); setCurrentPage(1); }}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: filterMode === 'ALL' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: filterMode === 'ALL' ? '#eff6ff' : 'white',
                  color: filterMode === 'ALL' ? '#1d4ed8' : '#475569',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Todos ({currentProducts.length})
              </button>
              <button
                type="button"
                onClick={() => { setFilterMode('COUNTED'); setCurrentPage(1); }}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: filterMode === 'COUNTED' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: filterMode === 'COUNTED' ? '#eff6ff' : 'white',
                  color: filterMode === 'COUNTED' ? '#1d4ed8' : '#475569',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Capturados ({countedInCurrentPhase})
              </button>
              <button
                type="button"
                onClick={() => { setFilterMode('PENDING'); setCurrentPage(1); }}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: filterMode === 'PENDING' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: filterMode === 'PENDING' ? '#eff6ff' : 'white',
                  color: filterMode === 'PENDING' ? '#1d4ed8' : '#475569',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Pendientes ({currentProducts.length - countedInCurrentPhase})
              </button>
            </>
          )}
        </div>

        {/* Row-by-row Anterior / Siguiente & Page Anterior / Siguiente */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {!isCompleted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Renglón:</span>
              <button
                type="button"
                onClick={() => handleStepRow('prev')}
                disabled={filteredProducts.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: 'white',
                  color: '#1e293b',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: filteredProducts.length === 0 ? 'not-allowed' : 'pointer'
                }}
                title="Ir al producto anterior para editar"
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <button
                type="button"
                onClick={() => handleStepRow('next')}
                disabled={filteredProducts.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: 'white',
                  color: '#1e293b',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: filteredProducts.length === 0 ? 'not-allowed' : 'pointer'
                }}
                title="Ir al siguiente producto"
              >
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: safePage <= 1 ? '#f8fafc' : 'white',
                  color: safePage <= 1 ? '#94a3b8' : '#1e293b',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: safePage <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={16} /> Pág. Anterior
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', padding: '0 0.25rem' }}>
                Pág. {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: safePage >= totalPages ? '#f8fafc' : 'white',
                  color: safePage >= totalPages ? '#94a3b8' : '#1e293b',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: safePage >= totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Pág. Siguiente <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Table Layer */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--caanma-border)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', zIndex: 10 }}>
            <tr>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--caanma-border)' }}>Producto</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--caanma-border)' }}>SKU / Código</th>
              
              {!isPhase1 && !isCompleted && (
                <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--caanma-border)', textAlign: 'center' }}>
                  Stock Sistema
                </th>
              )}

              {isPhase2 && (
                <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--caanma-border)', textAlign: 'center' }}>
                  Cuenta 1
                </th>
              )}

              {isPhase3 && (
                <>
                  <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--caanma-border)', textAlign: 'center' }}>Cuenta 1</th>
                  <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--caanma-border)', textAlign: 'center' }}>Cuenta 2</th>
                </>
              )}

              {isCompleted ? (
                <>
                  <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--caanma-border)', textAlign: 'center' }}>Ajuste Ejecutado</th>
                  <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--caanma-border)', textAlign: 'center' }}>Impacto</th>
                </>
              ) : (
                <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--caanma-border)', textAlign: 'center', width: '280px' }}>
                  Total Escaneado
                </th>
              )}

            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((p: any) => {
              const auditRef = audit.items.find((i: any) => i.productId === p.id) || {};
              const isRowActive = activeProductId === p.id;

              return (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: '1px solid var(--caanma-border)',
                    backgroundColor: isRowActive ? '#f0f9ff' : 'transparent'
                  }}
                >
                  <td data-label="Producto" style={{ padding: '1rem', fontWeight: 'bold', color: '#0f172a' }}>{p.name}</td>
                  <td data-label="SKU / Código" style={{ padding: '1rem', color: 'var(--caanma-text-muted)' }}>{p.sku || '-'} | {p.barcode || '-'}</td>
                  
                  {!isPhase1 && !isCompleted && (
                    <td data-label="Stock Sistema" style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#64748b' }}>
                      {auditRef.systemStock ?? p.stock}
                    </td>
                  )}

                  {isPhase2 && (
                    <td data-label="Cuenta 1" style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#ef4444' }}>
                      {auditRef.count1}
                    </td>
                  )}

                  {isPhase3 && (
                    <>
                      <td data-label="Cuenta 1" style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>{auditRef.count1}</td>
                      <td data-label="Cuenta 2" style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#ef4444' }}>{auditRef.count2 ?? '-'}</td>
                    </>
                  )}

                  {isCompleted ? (
                    <>
                      <td data-label="Ajuste" style={{ padding: '1rem', textAlign: 'center', fontWeight: '900', color: p.expectedDiff !== 0 ? '#2563eb' : '#94a3b8' }}>
                        {p.finalCount}
                      </td>
                      <td data-label="Impacto" style={{ padding: '1rem', textAlign: 'center' }}>
                        {p.expectedDiff !== 0 ? (
                          <span style={{ 
                            display: 'inline-block', 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '12px', 
                            backgroundColor: p.expectedDiff > 0 ? '#dcfce7' : '#fee2e2', 
                            color: p.expectedDiff > 0 ? '#166534' : '#991b1b', 
                            fontWeight: 'bold', 
                            fontSize: '0.85rem' 
                          }}>
                            {p.expectedDiff > 0 ? '+' : ''}{p.expectedDiff}
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>Ok</span>
                        )}
                      </td>
                    </>
                  ) : (
                    <td data-label="Total Escaneado" style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleStepRow('prev', p.id)}
                          title="Producto anterior"
                          style={{
                            padding: '0.45rem 0.55rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#f8fafc',
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <input 
                          ref={el => { inputRefs.current[p.id] = el; }}
                          type="number" 
                          value={editingCounts[p.id] ?? ''}
                          onFocus={() => setActiveProductId(p.id)}
                          onChange={e => handleUpdateCount(p.id, e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              returnToSearchAndClear();
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              handleStepRow('next', p.id);
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              handleStepRow('prev', p.id);
                            }
                          }}
                          placeholder="Ej. 100"
                          title="Escribe la cantidad y presiona Enter para volver al buscador"
                          style={{ 
                            width: '130px', 
                            padding: '0.6rem', 
                            borderRadius: '6px', 
                            border: '2px solid #cbd5e1', 
                            textAlign: 'center', 
                            fontWeight: 'bold', 
                            fontSize: '1rem',
                            backgroundColor: editingCounts[p.id] !== undefined && editingCounts[p.id] !== "" ? '#e0f2fe' : 'white',
                            outline: 'none',
                            borderColor: editingCounts[p.id] !== undefined && editingCounts[p.id] !== "" ? '#3b82f6' : '#cbd5e1'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleStepRow('next', p.id)}
                          title="Siguiente producto"
                          style={{
                            padding: '0.45rem 0.55rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#f8fafc',
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                  No hay productos requeridos en esta vista. Puedes regresar a la fase anterior o avanzar al siguiente paso.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer Action Bar with Anterior and Siguiente */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderTop: '1px solid var(--caanma-border)',
          backgroundColor: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          {/* Left: Fase Anterior Button */}
          <div>
            {!isPhase1 && (
              <button
                type="button"
                onClick={handlePreviousPhase}
                disabled={isPending}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '1rem',
                  padding: '0.85rem 1.5rem',
                  backgroundColor: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  cursor: isPending ? 'not-allowed' : 'pointer'
                }}
              >
                <ArrowLeft size={20} />
                {isCompleted
                  ? 'Anterior (Regresar a Editar Auditoría)'
                  : isPhase2
                    ? 'Anterior (Volver a Fase 1: Conteo Ciego)'
                    : 'Anterior (Volver a Fase 2: Diferencias)'}
              </button>
            )}
          </div>

          {/* Center: Page Pagination if > 1 page */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: safePage <= 1 ? '#f1f5f9' : 'white',
                  color: safePage <= 1 ? '#94a3b8' : '#1e293b',
                  fontWeight: 'bold',
                  cursor: safePage <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={16} /> Pág. Anterior
              </button>
              <span style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: safePage >= totalPages ? '#f1f5f9' : 'white',
                  color: safePage >= totalPages ? '#94a3b8' : '#1e293b',
                  fontWeight: 'bold',
                  cursor: safePage >= totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Pág. Siguiente <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Right: Save Progress & Siguiente Fase Button */}
          {!isCompleted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSaveOnly}
                disabled={isPending}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.95rem',
                  padding: '0.85rem 1.25rem',
                  backgroundColor: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  color: '#334155',
                  cursor: isPending ? 'not-allowed' : 'pointer'
                }}
              >
                <Save size={18} />
                {isPending ? 'Guardando...' : 'Guardar Avance'}
              </button>

              <button 
                type="button"
                onClick={() => handleSaveAndNext(isPhase3)}
                disabled={isPending}
                className="btn-primary" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', padding: '0.85rem 1.75rem', borderRadius: '8px' }}
              >
                {isPhase3 ? (
                  <>
                    <Save size={20} />
                    {isPending ? 'Inyectando BD...' : 'Finalizar e Inyectar Ajuste'}
                  </>
                ) : (
                  <>
                    {isPending ? 'Guardando...' : 'Siguiente (Guardar y Avanzar)'}
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

