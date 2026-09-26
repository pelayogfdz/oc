'use client';

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  ArrowLeft, 
  Download, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  Filter, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Boxes,
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { StatCard, Card, Badge, Button, BackButton } from '@/app/components/ui';

import { 
  PurchasesRemainingStockResponse, 
  PurchaseRemainingItem, 
  PurchaseGroupedOrder,
  getPurchasesRemainingStockData 
} from '@/app/actions/comprasReportes';
import * as XLSX from 'xlsx';

interface Props {
  initialData: PurchasesRemainingStockResponse;
  initialBranchId?: string;
  initialStartDate?: string;
  initialEndDate?: string;
}

export type SortColumn = 
  | 'purchaseDate' 
  | 'supplierName' 
  | 'productName' 
  | 'unitCost' 
  | 'purchasedQty' 
  | 'currentStock' 
  | 'remainingQty' 
  | 'remainingValue' 
  | 'displacementPercent' 
  | 'status';

export default function ComprasRemanenteClient({
  initialData,
  initialBranchId = 'ALL',
  initialStartDate = '',
  initialEndDate = ''
}: Props) {
  const [data, setData] = useState<PurchasesRemainingStockResponse>(initialData);
  const [isPending, startTransition] = useTransition();

  // Filters State
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [selectedBranch, setSelectedBranch] = useState(initialBranchId);
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'REMAINING_ONLY' | 'UNSOLD_ONLY' | 'EXHAUSTED_ONLY'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Column Sorting State
  const [sortColumn, setSortColumn] = useState<SortColumn>('purchaseDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // UI View Mode: 'items' or 'orders'
  const [viewMode, setViewMode] = useState<'items' | 'orders'>('items');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      if (['supplierName', 'productName', 'status'].includes(column)) {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  const renderSortHeader = (col: SortColumn, label: string, align: 'left' | 'center' | 'right' = 'left', extraClass = '') => {
    const isActive = sortColumn === col;
    return (
      <th 
        onClick={() => handleSort(col)}
        className={`py-3.5 px-3 cursor-pointer select-none transition-colors hover:bg-slate-100/90 ${extraClass}`}
        style={{ textAlign: align }}
        title={`Ordenar por ${label} (${isActive && sortDirection === 'asc' ? 'Menor a Mayor / A-Z' : isActive ? 'Mayor a Menor / Z-A' : 'Clic para ordenar'})`}
      >
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '5px',
          justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
          width: '100%'
        }}>
          <span style={{ 
            color: isActive ? '#7c3aed' : '#64748b', 
            fontWeight: isActive ? '800' : '700',
            fontSize: '11px',
            letterSpacing: '0.05em'
          }}>
            {label}
          </span>
          {isActive ? (
            sortDirection === 'asc' ? (
              <ArrowUp size={13} color="#7c3aed" style={{ flexShrink: 0 }} />
            ) : (
              <ArrowDown size={13} color="#7c3aed" style={{ flexShrink: 0 }} />
            )
          ) : (
            <ArrowUpDown size={12} color="#94a3b8" style={{ opacity: 0.45, flexShrink: 0 }} />
          )}
        </div>
      </th>
    );
  };

  const applyFilters = () => {
    startTransition(async () => {
      try {
        const freshData = await getPurchasesRemainingStockData({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          branchId: selectedBranch,
          brand: selectedBrand,
          category: selectedCategory,
          supplierId: selectedSupplier,
          statusFilter
        });
        setData(freshData);
      } catch (err) {
        console.error('Error fetching purchases remaining stock data:', err);
      }
    });
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedBranch('ALL');
    setSelectedBrand('ALL');
    setSelectedCategory('ALL');
    setSelectedSupplier('ALL');
    setStatusFilter('ALL');
    setSearchTerm('');

    startTransition(async () => {
      try {
        const freshData = await getPurchasesRemainingStockData({
          branchId: 'ALL',
          brand: 'ALL',
          category: 'ALL',
          supplierId: 'ALL',
          statusFilter: 'ALL'
        });
        setData(freshData);
      } catch (err) {
        console.error('Error resetting filters:', err);
      }
    });
  };

  // Quick Date Presets
  const handleDatePreset = (preset: 'today' | '7days' | '30days' | 'thisMonth' | 'thisYear' | 'all') => {
    const today = new Date();
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let start = '';
    let end = formatDate(today);

    if (preset === 'today') {
      start = end;
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      start = formatDate(past);
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      start = formatDate(past);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = formatDate(firstDay);
    } else if (preset === 'thisYear') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      start = formatDate(firstDay);
    } else if (preset === 'all') {
      start = '';
      end = '';
    }

    setStartDate(start);
    setEndDate(end);

    startTransition(async () => {
      try {
        const freshData = await getPurchasesRemainingStockData({
          startDate: start || undefined,
          endDate: end || undefined,
          branchId: selectedBranch,
          brand: selectedBrand,
          category: selectedCategory,
          supplierId: selectedSupplier,
          statusFilter
        });
        setData(freshData);
      } catch (err) {
        console.error('Error applying preset:', err);
      }
    });
  };

  const toggleExpandOrder = (purchaseId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [purchaseId]: !prev[purchaseId]
    }));
  };

  // Client-side text search filtering
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return data.items;
    const term = searchTerm.toLowerCase().trim();
    return data.items.filter(item => 
      item.productName.toLowerCase().includes(term) ||
      item.productSku.toLowerCase().includes(term) ||
      (item.productBarcode && item.productBarcode.toLowerCase().includes(term)) ||
      item.purchaseFolio.toLowerCase().includes(term) ||
      (item.supplierFolio && item.supplierFolio.toLowerCase().includes(term)) ||
      item.supplierName.toLowerCase().includes(term) ||
      item.brand.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term)
    );
  }, [data.items, searchTerm]);

  // Sorted individual items
  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    return list.sort((a, b) => {
      let valA: any = a[sortColumn];
      let valB: any = b[sortColumn];

      if (sortColumn === 'purchaseDate') {
        valA = new Date(a.purchaseDate).getTime();
        valB = new Date(b.purchaseDate).getTime();
      } else if (sortColumn === 'status') {
        const order = { UNSOLD: 1, PARTIAL: 2, EXHAUSTED: 3 };
        valA = order[a.status] || 99;
        valB = order[b.status] || 99;
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortColumn, sortDirection]);

  const filteredGroupedOrders = useMemo(() => {
    if (!searchTerm.trim()) return data.groupedOrders;
    const term = searchTerm.toLowerCase().trim();
    return data.groupedOrders.map(order => {
      const matchingItems = order.items.filter(item =>
        item.productName.toLowerCase().includes(term) ||
        item.productSku.toLowerCase().includes(term) ||
        (item.productBarcode && item.productBarcode.toLowerCase().includes(term)) ||
        item.purchaseFolio.toLowerCase().includes(term) ||
        (item.supplierFolio && item.supplierFolio.toLowerCase().includes(term)) ||
        item.supplierName.toLowerCase().includes(term) ||
        item.brand.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
      );

      if (
        order.purchaseFolio.toLowerCase().includes(term) ||
        (order.supplierFolio && order.supplierFolio.toLowerCase().includes(term)) ||
        order.supplierName.toLowerCase().includes(term) ||
        order.branchName.toLowerCase().includes(term) ||
        matchingItems.length > 0
      ) {
        return {
          ...order,
          items: matchingItems.length > 0 ? matchingItems : order.items
        };
      }
      return null;
    }).filter(Boolean) as PurchaseGroupedOrder[];
  }, [data.groupedOrders, searchTerm]);

  // Sorted grouped orders
  const sortedGroupedOrders = useMemo(() => {
    const list = [...filteredGroupedOrders];
    return list.sort((a, b) => {
      if (sortColumn === 'purchaseDate') {
        const valA = new Date(a.purchaseDate).getTime();
        const valB = new Date(b.purchaseDate).getTime();
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      if (sortColumn === 'supplierName') {
        return sortDirection === 'asc' 
          ? a.supplierName.localeCompare(b.supplierName) 
          : b.supplierName.localeCompare(a.supplierName);
      }
      if (sortColumn === 'remainingValue') {
        return sortDirection === 'asc' 
          ? a.totalRemainingValue - b.totalRemainingValue 
          : b.totalRemainingValue - a.totalRemainingValue;
      }
      if (sortColumn === 'purchasedQty') {
        return sortDirection === 'asc' 
          ? a.totalPurchasedQty - b.totalPurchasedQty 
          : b.totalPurchasedQty - a.totalPurchasedQty;
      }
      if (sortColumn === 'remainingQty') {
        return sortDirection === 'asc' 
          ? a.totalRemainingQty - b.totalRemainingQty 
          : b.totalRemainingQty - a.totalRemainingQty;
      }
      const valA = new Date(a.purchaseDate).getTime();
      const valB = new Date(b.purchaseDate).getTime();
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredGroupedOrders, sortColumn, sortDirection]);

  // Dynamic calculated metrics for filtered view
  const currentMetrics = useMemo(() => {
    const items = filteredItems;
    const totalPurchasesCount = new Set(items.map(i => i.purchaseId)).size;
    const totalUnitsPurchased = items.reduce((acc, i) => acc + i.purchasedQty, 0);
    const totalAmountInvested = items.reduce((acc, i) => acc + i.totalPurchaseCost, 0);
    const totalRemainingUnits = items.reduce((acc, i) => acc + i.remainingQty, 0);
    const totalRemainingCapital = items.reduce((acc, i) => acc + i.remainingValue, 0);
    const totalDisplacedCapital = Math.max(0, totalAmountInvested - totalRemainingCapital);
    const overallDisplacementRate = totalUnitsPurchased > 0 
      ? Math.round(((totalUnitsPurchased - totalRemainingUnits) / totalUnitsPurchased) * 100) 
      : 0;

    return {
      totalPurchasesCount,
      totalUnitsPurchased,
      totalAmountInvested,
      totalRemainingUnits,
      totalRemainingCapital,
      totalDisplacedCapital,
      overallDisplacementRate,
      unsoldItemsCount: items.filter(i => i.status === 'UNSOLD').length,
      partialItemsCount: items.filter(i => i.status === 'PARTIAL').length,
      exhaustedItemsCount: items.filter(i => i.status === 'EXHAUSTED').length
    };
  }, [filteredItems]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const rows = sortedItems.map(item => ({
      'Fecha Compra': new Date(item.purchaseDate).toLocaleDateString('es-MX'),
      'Días Antigüedad': item.daysAgo,
      'Folio Compra': item.purchaseFolio,
      'Factura Proveedor': item.supplierFolio || 'N/A',
      'Sucursal': item.branchName,
      'Proveedor': item.supplierName,
      'SKU': item.productSku,
      'Código de Barras': item.productBarcode || 'N/A',
      'Producto': item.productName,
      'Marca': item.brand,
      'Categoría': item.category,
      'Unidad': item.unit,
      'Costo Unitario ($)': item.unitCost,
      'Cant. Comprada': item.purchasedQty,
      'Total Compra ($)': item.totalPurchaseCost,
      'Stock Actual Sucursal': item.currentStock,
      'Stock Remanente': item.remainingQty,
      'Valor Remanente ($)': item.remainingValue,
      'Cant. Vendida/Desplazada': item.displacedQty,
      'Valor Desplazado ($)': item.displacedValue,
      '% Vendido': `${item.displacementPercent}%`,
      'Estado': item.status === 'UNSOLD' ? 'Sin Vender (100% Stock)' : item.status === 'PARTIAL' ? 'Parcialmente Vendido' : 'Agotado'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Remanente Compras');
    XLSX.writeFile(wb, `Reporte_Compras_Remanente_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Fecha Compra',
      'Dias Antiguedad',
      'Folio Compra',
      'Factura Proveedor',
      'Sucursal',
      'Proveedor',
      'SKU',
      'Codigo Barras',
      'Producto',
      'Marca',
      'Categoria',
      'Unidad',
      'Costo Unitario',
      'Cant Comprada',
      'Total Compra',
      'Stock Actual',
      'Stock Remanente',
      'Valor Remanente',
      'Cant Vendida',
      'Valor Vendido',
      'Porcentaje Vendido',
      'Estado'
    ];

    const rows = sortedItems.map(item => [
      new Date(item.purchaseDate).toLocaleDateString('es-MX'),
      item.daysAgo,
      `"${item.purchaseFolio}"`,
      `"${item.supplierFolio || ''}"`,
      `"${item.branchName}"`,
      `"${item.supplierName}"`,
      `"${item.productSku}"`,
      `"${item.productBarcode || ''}"`,
      `"${item.productName.replace(/"/g, '""')}"`,
      `"${item.brand}"`,
      `"${item.category}"`,
      `"${item.unit}"`,
      item.unitCost.toFixed(2),
      item.purchasedQty,
      item.totalPurchaseCost.toFixed(2),
      item.currentStock,
      item.remainingQty,
      item.remainingValue.toFixed(2),
      item.displacedQty,
      item.displacedValue.toFixed(2),
      `${item.displacementPercent}%`,
      item.status === 'UNSOLD' ? 'Sin Vender' : item.status === 'PARTIAL' ? 'Parcial' : 'Agotado'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reporte_Compras_Remanente_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 print:p-0">
      
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 pb-5 print:hidden">
        <div className="flex items-center gap-3">
          <BackButton
            fallbackHref="/reportes"
            className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors shadow-xs"
            label=""
            iconSize={20}
          />
          <div>

            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight m-0">
                Compras vs Stock Remanente
              </h1>
              <Badge variant="purple" size="md">
                Inventario & Compras
              </Badge>
            </div>
            <p className="text-slate-500 text-xs md:text-sm mt-1 mb-0">
              Rastrea el inventario adquirido en compras, existencias vivas actuales, costo unitario y capital remanente inmovilizado.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportExcel}
            className="flex items-center gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-white"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV}
            className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 bg-white"
          >
            <Download size={16} />
            <span>CSV</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint}
            className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 bg-white"
          >
            <Printer size={16} />
            <span>Imprimir</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Comprado"
          value={`${currentMetrics.totalUnitsPurchased.toLocaleString('es-MX')} uds`}
          icon={<Package size={20} className="text-blue-600" />}
          badgeText={`${currentMetrics.totalPurchasesCount} órdenes`}
          badgeVariant="info"
        />

        <StatCard
          title="Monto Invertido"
          value={formatCurrency(currentMetrics.totalAmountInvested)}
          icon={<DollarSign size={20} className="text-purple-600" />}
          badgeText="Costo Total"
          badgeVariant="purple"
        />

        <StatCard
          title="Stock Remanente"
          value={`${currentMetrics.totalRemainingUnits.toLocaleString('es-MX')} uds`}
          icon={<Boxes size={20} className="text-amber-600" />}
          badgeText={`${currentMetrics.unsoldItemsCount} sin vender`}
          badgeVariant="warning"
        />

        <StatCard
          title="Capital en Inventario"
          value={formatCurrency(currentMetrics.totalRemainingCapital)}
          icon={<DollarSign size={20} className="text-rose-600" />}
          badgeText="Inmovilizado"
          badgeVariant="danger"
        />

        <StatCard
          title="% Desplazado"
          value={`${currentMetrics.overallDisplacementRate}%`}
          icon={<TrendingUp size={20} className="text-emerald-600" />}
          badgeText={formatCurrency(currentMetrics.totalDisplacedCapital)}
          badgeVariant="success"
        />
      </div>

      {/* Filter Control Box */}
      <Card className="p-5 sm:p-6 rounded-2xl border-slate-200/80 shadow-xs print:hidden space-y-4">
        
        {/* Date Presets Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Accesos Rápidos de Fecha:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'today', label: 'Hoy' },
              { id: '7days', label: 'Últimos 7 días' },
              { id: '30days', label: 'Últimos 30 días' },
              { id: 'thisMonth', label: 'Mes Actual' },
              { id: 'thisYear', label: 'Año Actual' },
              { id: 'all', label: 'Todo el Histórico' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleDatePreset(p.id as any)}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Sucursal */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">Sucursal:</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                height: '36px',
                padding: '0 10px',
                fontSize: '0.8125rem',
                fontWeight: '500',
                outline: 'none'
              }}
            >
              <option value="ALL">Todas las Sucursales</option>
              {data.filterOptions.branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Fecha Inicio */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">Desde:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                height: '36px',
                padding: '0 10px',
                fontSize: '0.8125rem',
                fontWeight: '500',
                outline: 'none'
              }}
            />
          </div>

          {/* Fecha Fin */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">Hasta:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                height: '36px',
                padding: '0 10px',
                fontSize: '0.8125rem',
                fontWeight: '500',
                outline: 'none'
              }}
            />
          </div>

          {/* Proveedor */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">Proveedor:</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                height: '36px',
                padding: '0 10px',
                fontSize: '0.8125rem',
                fontWeight: '500',
                outline: 'none'
              }}
            >
              <option value="ALL">Todos los Proveedores</option>
              {data.filterOptions.suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Marca */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">Marca:</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                height: '36px',
                padding: '0 10px',
                fontSize: '0.8125rem',
                fontWeight: '500',
                outline: 'none'
              }}
            >
              <option value="ALL">Todas las Marcas</option>
              {data.filterOptions.brands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Categoría */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">Categoría:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                height: '36px',
                padding: '0 10px',
                fontSize: '0.8125rem',
                fontWeight: '500',
                outline: 'none'
              }}
            >
              <option value="ALL">Todas las Categorías</option>
              {data.filterOptions.categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Filter Actions and Status Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-600 mr-1">Estado de Stock:</span>
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'REMAINING_ONLY', label: 'Con Stock Remanente' },
              { id: 'UNSOLD_ONLY', label: '100% Sin Vender' },
              { id: 'EXHAUSTED_ONLY', label: 'Agotados' },
            ].map(s => {
              const isSelected = statusFilter === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatusFilter(s.id as any)}
                  style={{
                    backgroundColor: isSelected ? '#7c3aed' : '#f1f5f9',
                    color: isSelected ? '#ffffff' : '#475569',
                    border: isSelected ? '1px solid #6d28d9' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 'bold' : '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#e2e8f0';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9';
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={applyFilters}
              disabled={isPending}
              style={{
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.5rem 1.25rem',
                fontSize: '0.8125rem',
                fontWeight: 'bold',
                cursor: isPending ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                height: '36px',
                boxShadow: '0 2px 4px rgba(124, 58, 237, 0.25)',
                opacity: isPending ? 0.7 : 1,
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={e => { if (!isPending) e.currentTarget.style.backgroundColor = '#6d28d9'; }}
              onMouseLeave={e => { if (!isPending) e.currentTarget.style.backgroundColor = '#7c3aed'; }}
            >
              <Filter size={15} color="#ffffff" />
              <span style={{ color: '#ffffff' }}>{isPending ? 'Filtrando...' : 'Aplicar Filtros'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              disabled={isPending}
              style={{
                backgroundColor: '#f8fafc',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '0.5rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 'bold',
                cursor: isPending ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                height: '36px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
            >
              <RotateCcw size={14} color="#475569" />
              <span style={{ color: '#475569' }}>Restablecer</span>
            </button>
          </div>

        </div>

      </Card>

      {/* Live Search & View Mode Switcher */}
      <div className="flex flex-wrap justify-between items-center gap-3 print:hidden">
        
        {/* Real-time search bar */}
        <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '480px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Buscar por producto, SKU, folio de compra, proveedor, marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '38px',
              paddingRight: '16px',
              paddingTop: '8px',
              paddingBottom: '8px',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              fontSize: '0.8125rem',
              fontWeight: '500',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.15)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'; }}
          />
        </div>

        {/* View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px', backgroundColor: '#f1f5f9', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => setViewMode('items')}
            style={{
              backgroundColor: viewMode === 'items' ? '#ffffff' : 'transparent',
              color: viewMode === 'items' ? '#0f172a' : '#64748b',
              fontWeight: 'bold',
              fontSize: '0.75rem',
              padding: '6px 14px',
              borderRadius: '8px',
              border: viewMode === 'items' ? '1px solid #cbd5e1' : '1px solid transparent',
              boxShadow: viewMode === 'items' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Vista por Artículos ({filteredItems.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('orders')}
            style={{
              backgroundColor: viewMode === 'orders' ? '#ffffff' : 'transparent',
              color: viewMode === 'orders' ? '#0f172a' : '#64748b',
              fontWeight: 'bold',
              fontSize: '0.75rem',
              padding: '6px 14px',
              borderRadius: '8px',
              border: viewMode === 'orders' ? '1px solid #cbd5e1' : '1px solid transparent',
              boxShadow: viewMode === 'orders' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Vista por Órdenes de Compra ({filteredGroupedOrders.length})
          </button>
        </div>

      </div>

      {/* Main Content Area */}
      {viewMode === 'items' ? (
        
        /* Table View: Individual Items */
        <Card className="p-0 border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="responsive-table w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-left text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  {renderSortHeader('purchaseDate', 'Compra / Fecha', 'left', 'px-4')}
                  {renderSortHeader('supplierName', 'Proveedor / Sucursal', 'left')}
                  {renderSortHeader('productName', 'Producto / SKU', 'left')}
                  {renderSortHeader('unitCost', 'Costo Unit.', 'right')}
                  {renderSortHeader('purchasedQty', 'Comprado', 'center')}
                  {renderSortHeader('currentStock', 'Stock Actual', 'center')}
                  {renderSortHeader('remainingQty', 'Remanente', 'center')}
                  {renderSortHeader('remainingValue', 'Valor Remanente', 'right')}
                  {renderSortHeader('displacementPercent', '% Vendido', 'center')}
                  {renderSortHeader('status', 'Estado', 'center', 'px-4')}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sortedItems.length > 0 ? (
                  sortedItems.map((item, idx) => (
                    <tr key={`${item.purchaseId}-${item.productId}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* Compra / Fecha */}
                      <td data-label="Compra / Fecha" className="py-3 px-4 font-medium">
                        <span className="font-bold text-purple-700 block">
                          {item.purchaseFolio}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock size={11} />
                          <span>{new Date(item.purchaseDate).toLocaleDateString('es-MX')} ({item.daysAgo}d)</span>
                        </div>
                        {item.supplierFolio && (
                          <div className="text-[10px] text-slate-400">
                            Fact: {item.supplierFolio}
                          </div>
                        )}
                      </td>

                      {/* Proveedor / Sucursal */}
                      <td data-label="Proveedor / Sucursal" className="py-3 px-3">
                        <span className="font-bold text-slate-800 block truncate max-w-[180px]" title={item.supplierName}>
                          {item.supplierName}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                          {item.branchName}
                        </span>
                      </td>

                      {/* Producto / SKU */}
                      <td data-label="Producto / SKU" className="py-3 px-3">
                        <span className="font-bold text-slate-900 block truncate max-w-[220px]" title={item.productName}>
                          {item.productName}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono">{item.productSku}</span>
                          {item.brand && <span className="bg-slate-100 text-slate-600 px-1 rounded text-[10px]">{item.brand}</span>}
                          {item.category && <span className="bg-slate-100 text-slate-600 px-1 rounded text-[10px]">{item.category}</span>}
                        </div>
                      </td>

                      {/* Costo Unitario */}
                      <td data-label="Costo Unit." className="py-3 px-3 text-right font-semibold text-slate-700">
                        {formatCurrency(item.unitCost)}
                      </td>

                      {/* Comprado */}
                      <td data-label="Comprado" className="py-3 px-3 text-center font-bold text-slate-800">
                        {item.purchasedQty} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                      </td>

                      {/* Stock Actual */}
                      <td data-label="Stock Actual" className="py-3 px-3 text-center font-black text-slate-900">
                        <span className={item.currentStock <= 0 ? 'text-rose-600' : 'text-slate-900'}>
                          {item.currentStock}
                        </span>
                      </td>

                      {/* Remanente Estimado */}
                      <td data-label="Remanente" className="py-3 px-3 text-center">
                        <span className={`font-black text-xs px-2 py-0.5 rounded-md inline-block ${
                          item.remainingQty === 0 
                            ? 'bg-slate-100 text-slate-500' 
                            : item.remainingQty >= item.purchasedQty 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.remainingQty} {item.unit}
                        </span>
                      </td>

                      {/* Valor Remanente */}
                      <td data-label="Valor Remanente" className="py-3 px-3 text-right font-black text-slate-900">
                        <span className={item.remainingValue > 0 ? 'text-rose-700' : 'text-slate-400'}>
                          {formatCurrency(item.remainingValue)}
                        </span>
                      </td>

                      {/* % Vendido */}
                      <td data-label="% Vendido" className="py-3 px-3 text-center min-w-[110px]">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.displacementPercent === 100 
                                  ? 'bg-emerald-500' 
                                  : item.displacementPercent > 0 
                                  ? 'bg-purple-500' 
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${item.displacementPercent}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-700">
                            {item.displacementPercent}%
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.displacedQty} de {item.purchasedQty} vendidas
                        </div>
                      </td>

                      {/* Estado */}
                      <td data-label="Estado" className="py-3 px-4 text-center">
                        {item.status === 'UNSOLD' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/70">
                            <AlertCircle size={12} />
                            Sin Vender
                          </span>
                        ) : item.status === 'PARTIAL' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70">
                            <Clock size={12} />
                            Parcial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                            <CheckCircle2 size={12} />
                            Agotado
                          </span>
                        )}
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                      No se encontraron productos de compras con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

      ) : (

        /* Grouped View: Accordion by Purchase Order */
        <div className="space-y-4">
          {sortedGroupedOrders.length > 0 ? (
            sortedGroupedOrders.map(order => {
              const isExpanded = Boolean(expandedOrders[order.purchaseId]);
              const displacementRate = order.totalPurchasedQty > 0
                ? Math.round(((order.totalPurchasedQty - order.totalRemainingQty) / order.totalPurchasedQty) * 100)
                : 0;

              return (
                <Card key={order.purchaseId} className="p-0 border-slate-200/80 shadow-xs overflow-hidden">
                  
                  {/* Order Header Summary */}
                  <div 
                    onClick={() => toggleExpandOrder(order.purchaseId)}
                    className="p-4 sm:p-5 bg-white hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-wrap justify-between items-center gap-4 select-none"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs">
                        <Package size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-slate-900">
                            {order.purchaseFolio}
                          </span>
                          {order.supplierFolio && (
                            <Badge variant="default" size="sm">
                              Fact: {order.supplierFolio}
                            </Badge>
                          )}
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(order.purchaseDate).toLocaleDateString('es-MX')} ({order.daysAgo} días)
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-700">{order.supplierName}</span> &bull; {order.branchName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Compra</span>
                        <span className="text-sm font-black text-slate-900">{formatCurrency(order.totalPurchaseAmount)}</span>
                        <span className="text-[10px] text-slate-400 block">{order.totalPurchasedQty} uds</span>
                      </div>

                      <div className="text-right border-l border-slate-200 pl-4">
                        <span className="text-[10px] uppercase font-bold text-rose-500 block">Remanente</span>
                        <span className="text-sm font-black text-rose-700">{formatCurrency(order.totalRemainingValue)}</span>
                        <span className="text-[10px] text-rose-600 block">{order.totalRemainingQty} uds en stock</span>
                      </div>

                      <div className="text-right border-l border-slate-200 pl-4 hidden md:block">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Desplazamiento</span>
                        <span className="text-sm font-black text-emerald-700">{displacementRate}%</span>
                        <span className="text-[10px] text-slate-400 block">{order.itemsCount} productos</span>
                      </div>

                      <div className="text-slate-400 hover:text-slate-600">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Items Table */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5">
                      <div className="overflow-x-auto w-full">
                        <table className="responsive-table w-full border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-left text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                              <th className="py-2.5 px-3">Producto / SKU</th>
                              <th className="py-2.5 px-3 text-right">Costo Unit.</th>
                              <th className="py-2.5 px-3 text-center">Comprado</th>
                              <th className="py-2.5 px-3 text-center">Stock Actual</th>
                              <th className="py-2.5 px-3 text-center">Remanente</th>
                              <th className="py-2.5 px-3 text-right">Valor Remanente</th>
                              <th className="py-2.5 px-3 text-center">% Vendido</th>
                              <th className="py-2.5 px-3 text-center">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60 text-xs">
                            {order.items.map((item, idx) => (
                              <tr key={`${item.purchaseId}-${item.productId}-${idx}`} className="hover:bg-white transition-colors">
                                <td data-label="Producto" className="py-2.5 px-3">
                                  <span className="font-bold text-slate-800 block truncate max-w-[200px]" title={item.productName}>
                                    {item.productName}
                                  </span>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                    <span className="font-mono">{item.productSku}</span>
                                    {item.brand && <span>&bull; {item.brand}</span>}
                                  </div>
                                </td>
                                <td data-label="Costo" className="py-2.5 px-3 text-right font-semibold text-slate-700">
                                  {formatCurrency(item.unitCost)}
                                </td>
                                <td data-label="Comprado" className="py-2.5 px-3 text-center font-bold text-slate-800">
                                  {item.purchasedQty} {item.unit}
                                </td>
                                <td data-label="Stock" className="py-2.5 px-3 text-center font-bold text-slate-900">
                                  {item.currentStock}
                                </td>
                                <td data-label="Remanente" className="py-2.5 px-3 text-center">
                                  <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                                    {item.remainingQty} {item.unit}
                                  </span>
                                </td>
                                <td data-label="Valor Remanente" className="py-2.5 px-3 text-right font-black text-rose-700">
                                  {formatCurrency(item.remainingValue)}
                                </td>
                                <td data-label="% Vendido" className="py-2.5 px-3 text-center">
                                  <span className="font-bold text-slate-700">{item.displacementPercent}%</span>
                                </td>
                                <td data-label="Estado" className="py-2.5 px-3 text-center">
                                  {item.status === 'UNSOLD' ? (
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                                      Sin Vender
                                    </span>
                                  ) : item.status === 'PARTIAL' ? (
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                      Parcial
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                      Agotado
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </Card>
              );
            })
          ) : (
            <Card className="p-12 text-center text-slate-400 text-xs">
              No se encontraron órdenes de compra con los filtros seleccionados.
            </Card>
          )}
        </div>

      )}

    </div>
  );
}
