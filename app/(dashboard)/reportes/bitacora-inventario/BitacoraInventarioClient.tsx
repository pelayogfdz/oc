'use client';

import { useState, useMemo } from 'react';
import { Clock, ArrowDownToLine, Loader2, Search, PlusCircle, MinusCircle, Info, Printer } from 'lucide-react';
import { getInventoryMovementReport } from '@/app/actions/reportes';

export default function BitacoraInventarioClient({ initialData, initialBranchId, availableFilters }: { initialData: any, initialBranchId: string, availableFilters: any }) {
  const [data, setData] = useState<any>(initialData);
  const [branchId, setBranchId] = useState(initialBranchId);
  const [movementType, setMovementType] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Default dates (last 30 days)
  const defaultEnd = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultEnd.getDate() - 30);

  const [startDateStr, setStartDateStr] = useState(defaultStart.toISOString().split('T')[0]);
  const [endDateStr, setEndDateStr] = useState(defaultEnd.toISOString().split('T')[0]);

  const handlePresetChange = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'TODAY':
        start.setHours(0,0,0,0);
        break;
      case 'THIS_MONTH':
        start.setDate(1);
        start.setHours(0,0,0,0);
        break;
      case 'LAST_MONTH':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        start.setHours(0,0,0,0);
        end.setDate(0);
        end.setHours(23,59,59,999);
        break;
      case 'LAST_30_DAYS':
        start.setDate(today.getDate() - 30);
        break;
      case 'LAST_90_DAYS':
        start.setDate(today.getDate() - 90);
        break;
      default:
        return;
    }

    setStartDateStr(start.toISOString().split('T')[0]);
    setEndDateStr(end.toISOString().split('T')[0]);
    triggerUpdate(start, end, branchId, movementType);
  };

  const triggerUpdate = async (start: Date, end: Date, bId: string, type: string) => {
    setIsLoading(true);
    try {
      const res = await getInventoryMovementReport(start, end, bId, type);
      setData(res || { movements: [], metrics: { totalCount: 0, itemsAdded: 0, itemsRemoved: 0 } });
    } catch (error) {
      console.error("Error updating inventory logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = () => {
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T23:59:59');
    triggerUpdate(start, end, branchId, movementType);
  };

  // Filter local search inside the table
  const filteredMovements = useMemo(() => {
    const list = data.movements || [];
    return list.filter((m: any) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (m.product?.name && m.product.name.toLowerCase().includes(term)) ||
        (m.product?.sku && m.product.sku.toLowerCase().includes(term)) ||
        (m.reason && m.reason.toLowerCase().includes(term))
      );
    });
  }, [data.movements, searchTerm]);

  // Translate type to readable badge
  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'IN':
        return { bg: '#e0f2fe', color: '#0369a1', text: 'Entrada' };
      case 'OUT':
        return { bg: '#fee2e2', color: '#b91c1c', text: 'Salida' };
      case 'ADJUSTMENT':
        return { bg: '#fef3c7', color: '#b45309', text: 'Ajuste' };
      case 'SALE':
        return { bg: '#dcfce7', color: '#15803d', text: 'Venta' };
      case 'PURCHASE':
        return { bg: '#f5f3ff', color: '#6d28d9', text: 'Compra' };
      case 'RETURN':
        return { bg: '#f1f5f9', color: '#475569', text: 'Devolución' };
      default:
        return { bg: '#f1f5f9', color: '#475569', text: type || 'Movimiento' };
    }
  };

  const downloadCSV = () => {
    const headers = ["Fecha", "SKU", "Producto", "Tipo Movimiento", "Cantidad", "Motivo", "Registrado por"];
    const rows = filteredMovements.map((m: any) => [
      new Date(m.createdAt).toLocaleString(),
      m.product?.sku || "N/A",
      m.product?.name || "Desconocido",
      getBadgeStyle(m.type).text,
      m.quantity,
      m.reason,
      m.user?.name || m.user?.email || "Sistema"
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e: any) => e.map((val: any) => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bitacora_Inventario_${startDateStr}_a_${endDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>⏱️ Bitácora de Movimientos de Inventario</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Historial Kardex completo de entradas, salidas, ajustes de almacén, ventas y compras.</p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#6d28d9', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#5b21b6'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#6d28d9'}
          >
            <Printer size={18} /> Imprimir / PDF
          </button>
          <button 
            onClick={downloadCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#1e293b'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#0f172a'}
          >
            <ArrowDownToLine size={18} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="no-print" style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Filtros Rápidos</label>
            <select 
              onChange={e => handlePresetChange(e.target.value)} 
              defaultValue="LAST_30_DAYS"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="TODAY">Hoy</option>
              <option value="THIS_MONTH">Este Mes</option>
              <option value="LAST_MONTH">Mes Anterior</option>
              <option value="LAST_30_DAYS">Últimos 30 días</option>
              <option value="LAST_90_DAYS">Últimos 90 días</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Fecha Inicio</label>
            <input 
              type="date" 
              value={startDateStr} 
              onChange={e => setStartDateStr(e.target.value)} 
              style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Fecha Fin</label>
            <input 
              type="date" 
              value={endDateStr} 
              onChange={e => setEndDateStr(e.target.value)} 
              style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Sucursal</label>
            <select 
              value={branchId} 
              onChange={e => setBranchId(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="ALL">Todas las Sucursales</option>
              {availableFilters.branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Tipo Movimiento</label>
            <select 
              value={movementType} 
              onChange={e => setMovementType(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="ALL">Todos los Movimientos</option>
              <option value="IN">Entradas</option>
              <option value="OUT">Salidas</option>
              <option value="ADJUSTMENT">Ajustes</option>
              <option value="SALE">Ventas</option>
              <option value="PURCHASE">Compras</option>
              <option value="RETURN">Devoluciones</option>
            </select>
          </div>

          <button 
            onClick={handleApplyFilters}
            disabled={isLoading}
            style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0.55rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.875rem', cursor: 'pointer', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#1d4ed8'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#2563eb'}
          >
            {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Aplicar'}
          </button>
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#2563eb', fontWeight: 'bold', fontSize: '0.9rem' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Buscando bitácora de movimientos...
        </div>
      )}

      <div style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        {/* KPI Panel Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '8px' }}><Clock size={20} color="#3b82f6" /></div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Movimientos Registrados</h3>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#1e293b' }}>{data.metrics?.totalCount || 0}</div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#f0fdf4', borderRadius: '8px' }}><PlusCircle size={20} color="#16a34a" /></div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Artículos Ingresados (+)</h3>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#16a34a' }}>+{data.metrics?.itemsAdded || 0} uds</div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '8px' }}><MinusCircle size={20} color="#ef4444" /></div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Artículos Egresados (-)</h3>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#ef4444' }}>-{data.metrics?.itemsRemoved || 0} uds</div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#f5f3ff', borderRadius: '8px' }}><Info size={20} color="#7c3aed" /></div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Flujo Neto Stock</h3>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: (data.metrics?.itemsAdded - data.metrics?.itemsRemoved) >= 0 ? '#16a34a' : '#ef4444' }}>
              {(data.metrics?.itemsAdded - data.metrics?.itemsRemoved) >= 0 ? '+' : ''}{data.metrics?.itemsAdded - data.metrics?.itemsRemoved} uds
            </div>
          </div>
        </div>

        {/* Detailed Kardex Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Registro de Auditoría de Inventario (Kardex)</h2>
            <div className="no-print" style={{ position: 'relative', width: '280px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Buscar por SKU, producto o motivo..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.75rem 0.45rem 2.2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  <th style={{ padding: '1rem 0.75rem' }}>Fecha y Hora</th>
                  <th style={{ padding: '1rem 0.75rem' }}>SKU</th>
                  <th style={{ padding: '1rem 0.75rem' }}>Producto</th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>Tipo</th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>Cantidad</th>
                  <th style={{ padding: '1rem 0.75rem' }}>Motivo o Comentario</th>
                  <th style={{ padding: '1rem 0.75rem' }}>Responsable</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem', color: '#334155' }}>
                {filteredMovements.length > 0 ? (
                  filteredMovements.map((m: any) => {
                    const badge = getBadgeStyle(m.type);
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }} onMouseOver={e => e.currentTarget.style.backgroundColor='#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor='transparent'}>
                        <td style={{ padding: '0.85rem 0.75rem', color: '#64748b' }}>{new Date(m.createdAt).toLocaleString()}</td>
                        <td style={{ padding: '0.85rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{m.product?.sku || "Sin SKU"}</td>
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: 'bold', color: '#0f172a' }}>{m.product?.name || "Desconocido"}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                          <span style={{ backgroundColor: badge.bg, color: badge.color, padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            {badge.text}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 'bold', color: m.quantity > 0 ? '#16a34a' : '#ef4444' }}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', color: '#475569', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.reason}>
                          {m.reason || "Sin comentarios"}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', color: '#64748b' }}>{m.user?.name || m.user?.email || "Sistema"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem 0', textAlign: 'center', color: '#94a3b8' }}>
                      No se encontraron movimientos de almacén en el rango de búsqueda seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
