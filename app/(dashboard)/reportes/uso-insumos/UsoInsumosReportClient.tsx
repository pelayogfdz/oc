'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { ChefHat, Calendar, MapPin, Search, Download, FileSpreadsheet, User, ArrowLeft, Loader2, Package, ArrowRight, Printer } from 'lucide-react';
import { getSupplyUsageReportData } from '@/app/actions/reportes';
import { exportToExcel } from '@/lib/exportExcel';
import Link from 'next/link';

interface UsoInsumosReportClientProps {
  initialData: {
    items: Array<{
      id: string;
      date: string | Date;
      productName: string;
      variantAttribute: string | null;
      sku: string;
      quantity: number;
      cost: number;
      totalCost: number;
      reason: string;
      branchName: string;
      userName: string;
    }>;
    totalUnits: number;
    totalCost: number;
  };
  initialBranchId: string;
  availableFilters: {
    branches: Array<{ id: string; name: string }>;
  };
}

export default function UsoInsumosReportClient({
  initialData,
  initialBranchId,
  availableFilters
}: UsoInsumosReportClientProps) {
  const [data, setData] = useState(initialData);
  const [branchId, setBranchId] = useState(initialBranchId);
  const [startDateStr, setStartDateStr] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDateStr, setEndDateStr] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  const pageSize = 15;

  const handlePresetChange = (preset: string) => {
    const end = new Date();
    const start = new Date();
    switch (preset) {
      case 'TODAY':
        // Today
        break;
      case 'LAST_7_DAYS':
        start.setDate(end.getDate() - 7);
        break;
      case 'LAST_15_DAYS':
        start.setDate(end.getDate() - 15);
        break;
      case 'LAST_30_DAYS':
        start.setDate(end.getDate() - 30);
        break;
      case 'LAST_60_DAYS':
        start.setDate(end.getDate() - 60);
        break;
      case 'LAST_90_DAYS':
        start.setDate(end.getDate() - 90);
        break;
      case 'THIS_MONTH':
        start.setDate(1);
        break;
    }
    setStartDateStr(start.toISOString().split('T')[0]);
    setEndDateStr(end.toISOString().split('T')[0]);
  };

  const handleApplyFilters = () => {
    setIsLoading(true);
    startTransition(async () => {
      try {
        const start = new Date(startDateStr + 'T00:00:00');
        const end = new Date(endDateStr + 'T23:59:59');
        const res = await getSupplyUsageReportData(start, end, branchId);
        setData(res);
        setCurrentPage(1);
      } catch (error) {
        console.error('Error refreshing supply usage report:', error);
        alert('Ocurrió un error al cargar el reporte.');
      } finally {
        setIsLoading(false);
      }
    });
  };

  // Local filter based on search term
  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return data.items;
    return data.items.filter(item => 
      item.productName.toLowerCase().includes(term) ||
      (item.sku && item.sku.toLowerCase().includes(term)) ||
      (item.reason && item.reason.toLowerCase().includes(term)) ||
      item.userName.toLowerCase().includes(term) ||
      item.branchName.toLowerCase().includes(term)
    );
  }, [data.items, searchTerm]);

  // Totals calculated on filtered dataset
  const { currentTotalUnits, currentTotalCost } = useMemo(() => {
    let units = 0;
    let cost = 0;
    filteredItems.forEach(item => {
      units += item.quantity;
      cost += item.totalCost;
    });
    return { currentTotalUnits: units, currentTotalCost: cost };
  }, [filteredItems]);

  // Paginated dataset
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;

  const downloadExcel = () => {
    const headers = [
      "Fecha",
      "Sucursal",
      "Insumo / Producto",
      "SKU",
      "Razón / Proceso",
      "Registrado Por",
      "Cantidad Sacada",
      "Costo Unitario (MXN)",
      "Costo Total (MXN)"
    ];

    const rows = filteredItems.map(item => [
      new Date(item.date).toLocaleString('es-MX'),
      item.branchName,
      item.productName + (item.variantAttribute ? ` (${item.variantAttribute})` : ''),
      item.sku || 'N/A',
      item.reason || 'Consumo Interno',
      item.userName,
      item.quantity,
      item.cost,
      item.totalCost
    ]);

    exportToExcel(headers, rows, `Reporte_Uso_Insumos_${startDateStr}_a_${endDateStr}`);
  };

  const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      {/* Back link & Title header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        <Link href="/reportes" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 'bold', width: 'fit-content' }}>
          <ArrowLeft size={16} /> Volver a Reportes
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
              <ChefHat size={30} color="#0d9488" /> Reporte de Uso de Insumos / Consumo Interno
            </h1>
            <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.95rem' }}>
              Historial y costos de materias primas y consumos internos retirados del inventario.
            </p>
          </div>
          <div className="no-print" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button 
              onClick={() => window.print()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#64748b', color: 'white', border: 'none', padding: '0.6rem 1.1rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s', fontSize: '0.85rem' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor='#475569'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor='#64748b'}
            >
              <Printer size={16} /> Imprimir / PDF
            </button>
            <button 
              onClick={downloadExcel}
              disabled={filteredItems.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '0.6rem 1.1rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s', fontSize: '0.85rem', opacity: filteredItems.length === 0 ? 0.6 : 1 }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor='#1e293b'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor='#0f172a'}
            >
              <Download size={16} /> Exportar Excel
            </button>
          </div>
        </div>
      </div>

      {/* Filters row */}
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
              <option value="LAST_7_DAYS">Últimos 7 días</option>
              <option value="LAST_15_DAYS">Últimos 15 días</option>
              <option value="LAST_30_DAYS">Últimos 30 días</option>
              <option value="LAST_60_DAYS">Últimos 60 días</option>
              <option value="LAST_90_DAYS">Últimos 90 días</option>
              <option value="THIS_MONTH">Este Mes</option>
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

          <button 
            onClick={handleApplyFilters}
            disabled={isLoading || isPending}
            style={{ backgroundColor: '#0d9488', color: 'white', border: 'none', padding: '0.65rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.875rem', cursor: 'pointer', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#0f766e'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#0d9488'}
          >
            {(isLoading || isPending) ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Consultar'}
          </button>
        </div>
      </div>

      {/* KPI Cards Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#e6fffa', borderRadius: '8px' }}><ChefHat size={20} color="#0d9488" /></div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Total Unidades Sacadas</h3>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#0f766e' }}>{currentTotalUnits} uds</div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#fef3c7', borderRadius: '8px' }}><FileSpreadsheet size={20} color="#d97706" /></div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Costo Total del Consumo</h3>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#b45309' }}>{formatter.format(currentTotalCost)}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="no-print" style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input 
          type="text" 
          placeholder="Filtrar por insumo, SKU, razón/proceso o usuario..."
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
        />
      </div>

      {/* Table section */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 'bold' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Fecha</th>
                <th style={{ padding: '0.85rem 1rem' }}>Sucursal</th>
                <th style={{ padding: '0.85rem 1rem' }}>Insumo / Producto</th>
                <th style={{ padding: '0.85rem 1rem' }}>SKU</th>
                <th style={{ padding: '0.85rem 1rem' }}>Razón / Proceso</th>
                <th style={{ padding: '0.85rem 1rem' }}>Registrado Por</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Cantidad</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Costo Unitario</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Costo Total</th>
              </tr>
            </thead>
            <tbody>
              {isLoading || isPending ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', color: '#64748b', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Cargando datos...
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    No se encontraron registros de uso de insumos para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                    <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: '#334155' }}>
                      {new Date(item.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        <MapPin size={12} /> {item.branchName}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: '#1e293b' }}>
                      {item.productName}
                      {item.variantAttribute && (
                        <span style={{ fontSize: '0.75rem', color: '#8b5cf6', display: 'block', fontWeight: 'normal' }}>
                          Variante: {item.variantAttribute}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontFamily: 'monospace' }}>
                      {item.sku || 'N/A'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                      {item.reason || 'Consumo Interno'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <User size={14} color="#64748b" /> {item.userName}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 'bold', color: '#0d9488' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#475569' }}>
                      {formatter.format(item.cost)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                      {formatter.format(item.totalCost)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {filteredItems.length > 0 && (
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Mostrando {Math.min(filteredItems.length, (currentPage - 1) * pageSize + 1)} a {Math.min(filteredItems.length, currentPage * pageSize)} de {filteredItems.length} registros
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontSize: '0.8rem', cursor: 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                <ArrowLeft size={14} /> Anterior
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b' }}>
                Pág {currentPage} de {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || isLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontSize: '0.8rem', cursor: 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                Siguiente <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
