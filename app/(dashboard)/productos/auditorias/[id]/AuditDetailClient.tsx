'use client';

import { useState, useRef, useEffect } from 'react';
import { submitAuditCount, updateAuditStatus, finalizeAudit } from '@/app/actions/audit';
import { Save, UploadCloud, Download, CheckCircle, AlertTriangle, ArrowRight, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AuditDetailClient({ audit, products }: { audit: any, products: any[] }) {
  const router = useRouter();

  // Phase logic
  const isPhase1 = audit.status === 'COUNT_1';
  const isPhase2 = audit.status === 'COUNT_2';
  const isPhase3 = audit.status === 'COUNT_3';
  const isCompleted = audit.status === 'COMPLETED';

  // The local array maps what the user is currently editing 
  // It handles the entire catalog for Phase 1.
  // For Phase 2, it filters to products that had discrepancies in count1.
  // For Phase 3, discrepancies between count 1 and count 2.
  const [editingCounts, setEditingCounts] = useState<{ [key: string]: string }>({});
  const [isPending, setIsPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize editing counts based on the current Phase
  useEffect(() => {
    const initialState: { [key: string]: string } = {};
    if (isPhase1) {
      // Show all possible products, default count to empty
      products.forEach(p => {
        const existing = audit.items.find((i: any) => i.productId === p.id);
        if (existing?.count1 !== null && existing?.count1 !== undefined) {
           initialState[p.id] = String(existing.count1);
        }
      });
    } else if (isPhase2) {
       audit.items.forEach((i: any) => {
         if (i.count1 !== i.systemStock) {
            initialState[i.productId] = i.count2 !== null ? String(i.count2) : "";
         }
       });
    } else if (isPhase3) {
       audit.items.forEach((i: any) => {
         if (i.count1 !== i.count2 && i.count2 !== null) {
            initialState[i.productId] = i.count3 !== null ? String(i.count3) : "";
         }
       });
    }
    setEditingCounts(initialState);
  }, [audit.status, audit.items, products]);

  const getCurrentFilterTarget = () => {
    if (isCompleted) return audit.items.map((i: any) => ({ ...i.product, finalCount: i.finalCount, systemStock: i.systemStock, expectedDiff: i.finalCount - i.systemStock }));
    if (isPhase1) return products;
    if (isPhase2) return audit.items.filter((i: any) => i.count1 !== i.systemStock).map((i: any) => i.product);
    if (isPhase3) return audit.items.filter((i: any) => i.count1 !== i.count2 && i.count2 !== null).map((i: any) => i.product);
    return [];
  };

  const currentProducts = getCurrentFilterTarget();

  const handleUpdateCount = (productId: string, val: string) => {
    setEditingCounts({ ...editingCounts, [productId]: val });
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
          
          if (prod && Object.prototype.hasOwnProperty.call(editingCounts, prod.id) || isPhase1) {
             newCounts[prod.id] = quantity;
             matchedCount++;
          }
        }
      });
      setEditingCounts(newCounts);
      alert(`Se encontraron e importaron ${matchedCount} productos del archivo CSV exitosamente.`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
    let content = "sku,cantidad\n";
    // Only put the valid target products
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

  const handleSaveAndNext = async (isFinalize: boolean = false) => {
    setIsPending(true);
    try {
      if (!isCompleted) {
        // Collect what was typed
        const payload: { productId: string, count: number }[] = [];
        Object.entries(editingCounts).forEach(([pid, val]) => {
          if (val !== "") {
            const parsed = parseInt(val, 10);
            if (!isNaN(parsed)) {
              payload.push({ productId: pid, count: parsed });
            }
          }
        });

        const phaseNum = isPhase1 ? 1 : isPhase2 ? 2 : 3;
        if (payload.length > 0) {
           await submitAuditCount(audit.id, phaseNum, payload);
        }
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
      
    } catch(err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsPending(false);
    }
  };


  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <Link href="/productos/auditorias" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'inline-block' }}>
            &larr; Volver a Auditorías
          </Link>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {audit.name}
            {isCompleted && <CheckCircle color="#10b981" size={24} />}
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', margin: 0 }}>
             Id de Auditoría: {audit.id}
          </p>
        </div>

        {/* Phase Timeline indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)' }}>
          <div style={{ fontWeight: isPhase1 ? 'bold' : 'normal', color: isPhase1 ? '#2563eb' : (isPhase2 || isPhase3 || isCompleted) ? '#10b981' : '#94a3b8' }}>1. Conteo Ciego</div>
          <ArrowRight size={16} color="#cbd5e1" />
          <div style={{ fontWeight: isPhase2 ? 'bold' : 'normal', color: isPhase2 ? '#2563eb' : (isPhase3 || isCompleted) ? '#10b981' : '#94a3b8' }}>2. Diferencias</div>
          <ArrowRight size={16} color="#cbd5e1" />
          <div style={{ fontWeight: isPhase3 ? 'bold' : 'normal', color: isPhase3 ? '#2563eb' : isCompleted ? '#10b981' : '#94a3b8' }}>3. Verificación Final</div>
        </div>
      </div>

      {!isCompleted && (
        <div style={{ padding: '1.5rem', backgroundColor: '#e0f2fe', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #bae6fd' }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', color: '#0369a1', fontSize: '1.1rem' }}>
              {isPhase1 && 'Fase 1: Haz un Conteo Ciego'}
              {isPhase2 && 'Fase 2: Validar Discrepancias'}
              {isPhase3 && 'Fase 3: Aclaración de Tercer Nivel'}
            </h3>
            <p style={{ margin: 0, color: '#0284c7', fontSize: '0.9rem' }}>
              {isPhase1 && 'Introduce la cuenta física total. Evitamos mostrarte el stock en sistema para no viciar la captura.'}
              {isPhase2 && `Mostrando sólo las diferencias encontradas (${currentProducts.length} productos afectados). Cuenta de nuevo.`}
              {isPhase3 && `Última revisión obligatoria. Lo que ingreses aquí será el veredicto final en la base de datos.`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
             {isPhase1 && (
               <input 
                 type="text" 
                 placeholder="Buscar por nombre o SKU..." 
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #bae6fd', outline: 'none' }}
               />
             )}
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

      {/* Main Table Layer */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--pulpos-border)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', zIndex: 10 }}>
            <tr>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--pulpos-border)' }}>Producto</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--pulpos-border)' }}>SKU</th>
              
              {!isPhase1 && !isCompleted && (
                 <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>
                   Stock Sistema
                 </th>
              )}

              {isPhase2 && (
                 <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>
                   Cuenta 1
                 </th>
              )}

              {(isPhase3) && (
                 <>
                   <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>Cuenta 1</th>
                   <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>Cuenta 2</th>
                 </>
              )}

              {isCompleted ? (
                 <>
                  <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>Ajuste Ejecutado</th>
                  <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center' }}>Impacto</th>
                 </>
              ) : (
                <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'center', width: '200px' }}>
                  Total Escaneado
                </th>
              )}

            </tr>
          </thead>
          <tbody>
            {(() => {
              let displayList = currentProducts;
              if (isPhase1 && searchQuery.trim() === '') {
                 const editedOrCounted = currentProducts.filter((p: any) => editingCounts[p.id] !== undefined || audit.items.some((i: any) => i.productId === p.id));
                 const others = currentProducts.filter((p: any) => editingCounts[p.id] === undefined && !audit.items.some((i: any) => i.productId === p.id));
                 displayList = [...editedOrCounted, ...others.slice(0, 50)];
              } else if (isPhase1 && searchQuery.trim() !== '') {
                 displayList = currentProducts.filter((p:any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 100);
              }
              return displayList.map((p: any) => {
              // Pre-fetch related audit item info for phase 2/3
              const auditRef = audit.items.find((i: any) => i.productId === p.id) || {};

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: '#0f172a' }}>{p.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--pulpos-text-muted)' }}>{p.sku}</td>
                  
                  {!isPhase1 && !isCompleted && (
                     <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#cbd5e1' }}>
                       {auditRef.systemStock ?? p.stock}
                     </td>
                  )}

                  {isPhase2 && (
                     <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#ef4444' }}>
                       {auditRef.count1}
                     </td>
                  )}

                  {isPhase3 && (
                     <>
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>{auditRef.count1}</td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#ef4444' }}>{auditRef.count2}</td>
                     </>
                  )}

                  {isCompleted ? (
                    <>
                       <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '900', color: p.expectedDiff !== 0 ? '#2563eb' : '#94a3b8' }}>
                         {p.finalCount}
                       </td>
                       <td style={{ padding: '1rem', textAlign: 'center' }}>
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
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <input 
                        type="number" 
                        value={editingCounts[p.id] || ''}
                        onChange={e => handleUpdateCount(p.id, e.target.value)}
                        placeholder="Ej. 100"
                        style={{ 
                          width: '100%', 
                          padding: '0.65rem', 
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
                    </td>
                  )}
                </tr>
              );
            });
            })()}
            {currentProducts.length === 0 && (
               <tr>
                 <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                    No hay productos requeridos en esta fase. Puedes proceder al siguiente paso o finalizar.
                 </td>
               </tr>
            )}

          </tbody>
        </table>

        {!isCompleted && (
          <div style={{ padding: '1.5rem', borderTop: '1px solid var(--pulpos-border)', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
             <button 
               onClick={() => handleSaveAndNext(isPhase3)}
               disabled={isPending}
               className="btn-primary" 
               style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', padding: '1rem 2rem' }}
             >
               <Save size={20} />
               {isPhase3 ? (isPending ? 'Inyectando BD...' : 'Finalizar e Inyectar Ajuste') : (isPending ? 'Guardando...' : 'Guardar y Ver Siguiente Fase')}
             </button>
          </div>
        )}

      </div>

    </div>
  );
}
