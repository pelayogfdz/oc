'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { 
  PackageOpen, 
  Plus, 
  FileText, 
  Trash2, 
  ShieldAlert, 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  Building2, 
  DollarSign, 
  TrendingDown, 
  Receipt, 
  Layers,
  ArrowUpDown,
  CheckCircle2,
  X
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { createExpenseAction, deleteExpenseAction } from '@/app/actions/expense';
import { useToast } from '@/app/components/ui/CorporateToast';
import { CorporateConfirmModal } from '@/app/components/ui/CorporateConfirmModal';

interface ExpenseItem {
  id: string;
  category: string;
  reason: string;
  amount: number;
  branchId: string | null;
  userId: string;
  createdAt: string | Date;
  branch?: { id: string; name: string } | null;
  user?: { id: string; name: string } | null;
}

interface BranchItem {
  id: string;
  name: string;
}

const CATEGORIES = [
  'Renta / Arrendamiento',
  'Nómina / Sueldos',
  'Servicios (Luz, Agua, Internet)',
  'Insumos Internos (Papelería, Limpieza)',
  'Mantenimiento de Local/Equipo',
  'Impuestos (SAT)',
  'Fletes y Envíos',
  'Publicidad y Marketing',
  'Viáticos y Transporte',
  'Otros (Varios)'
];

export default function GastosClient({
  initialExpenses = [],
  branches = [],
  currentBranchId
}: {
  initialExpenses: ExpenseItem[];
  branches: BranchItem[];
  currentBranchId: string;
}) {
  const { success, error, warning } = useToast();
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formReason, setFormReason] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formBranchId, setFormBranchId] = useState(currentBranchId || (branches[0]?.id || ''));
  const [formDate, setFormDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'>('THIS_MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('NEWEST');

  // Modal State for Delete
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Filter Logic
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // 1. Branch filter
      if (selectedBranch !== 'ALL' && exp.branchId !== selectedBranch) {
        return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'ALL') {
        const cleanSelected = selectedCategory.toLowerCase();
        const cleanExp = exp.category.toLowerCase();
        if (!cleanExp.includes(cleanSelected) && !cleanSelected.includes(cleanExp)) {
          return false;
        }
      }

      // 3. Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const reasonMatch = exp.reason?.toLowerCase().includes(query);
        const categoryMatch = exp.category?.toLowerCase().includes(query);
        const userMatch = exp.user?.name?.toLowerCase().includes(query);
        const branchMatch = exp.branch?.name?.toLowerCase().includes(query);
        const amountMatch = exp.amount.toString().includes(query);
        if (!reasonMatch && !categoryMatch && !userMatch && !branchMatch && !amountMatch) {
          return false;
        }
      }

      // 4. Date filter
      const expDate = new Date(exp.createdAt);
      const now = new Date();

      if (dateFilter === 'TODAY') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        if (expDate < todayStart || expDate > todayEnd) return false;
      } else if (dateFilter === 'YESTERDAY') {
        const yestStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
        const yestEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        if (expDate < yestStart || expDate > yestEnd) return false;
      } else if (dateFilter === 'THIS_WEEK') {
        const firstDayOfWeek = new Date(now);
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        firstDayOfWeek.setDate(diff);
        firstDayOfWeek.setHours(0, 0, 0, 0);
        if (expDate < firstDayOfWeek) return false;
      } else if (dateFilter === 'THIS_MONTH') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        if (expDate < monthStart || expDate > monthEnd) return false;
      } else if (dateFilter === 'LAST_MONTH') {
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        if (expDate < lastMonthStart || expDate > lastMonthEnd) return false;
      } else if (dateFilter === 'CUSTOM') {
        if (startDate) {
          const s = new Date(startDate + 'T00:00:00');
          if (expDate < s) return false;
        }
        if (endDate) {
          const e = new Date(endDate + 'T23:59:59');
          if (expDate > e) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'NEWEST') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortOrder === 'OLDEST') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortOrder === 'AMOUNT_DESC') {
        return b.amount - a.amount;
      } else if (sortOrder === 'AMOUNT_ASC') {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [expenses, selectedBranch, selectedCategory, search, dateFilter, startDate, endDate, sortOrder]);

  // Statistics
  const totalFiltrado = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredExpenses]);

  const totalMesActual = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return expenses.reduce((acc, curr) => {
      const d = new Date(curr.createdAt);
      if (d >= monthStart && d <= monthEnd) {
        return acc + curr.amount;
      }
      return acc;
    }, 0);
  }, [expenses]);

  const gastoPromedio = useMemo(() => {
    if (filteredExpenses.length === 0) return 0;
    return totalFiltrado / filteredExpenses.length;
  }, [filteredExpenses, totalFiltrado]);

  // Handlers
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formAmount);
    if (!amountNum || amountNum <= 0) {
      warning('Ingresa un monto válido mayor a 0', 'Monto inválido');
      return;
    }
    if (!formReason.trim()) {
      warning('Ingresa el concepto o detalle del gasto', 'Campo requerido');
      return;
    }

    startTransition(async () => {
      const res = await createExpenseAction({
        category: formCategory,
        reason: formReason.trim(),
        amount: amountNum,
        branchId: formBranchId,
        createdAt: formDate ? formDate + 'T12:00:00' : undefined
      });

      if (res.success && res.expense) {
        success('Gasto registrado exitosamente', 'Gasto Guardado');
        setExpenses(prev => [res.expense, ...prev]);
        setFormReason('');
        setFormAmount('');
      } else {
        error(res.error || 'No se pudo registrar el gasto', 'Error al guardar');
      }
    });
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return;
    const targetId = deleteTargetId;
    
    startTransition(async () => {
      const res = await deleteExpenseAction(targetId);
      if (res.success) {
        success('El gasto ha sido eliminado correctamente', 'Gasto Eliminado');
        setExpenses(prev => prev.filter(e => e.id !== targetId));
        setDeleteTargetId(null);
      } else {
        error(res.error || 'No se pudo eliminar el gasto', 'Error al eliminar');
      }
    });
  };

  // Export to Excel / CSV
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      warning('No hay gastos para exportar en este filtro', 'Exportar');
      return;
    }

    const headers = ['Fecha', 'Hora', 'Sucursal', 'Categoría', 'Concepto', 'Registrado Por', 'Monto ($)'];
    const rows = filteredExpenses.map(exp => {
      const d = new Date(exp.createdAt);
      const fecha = d.toLocaleDateString('es-MX');
      const hora = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      const sucursal = exp.branch?.name || 'Matriz';
      const categoria = exp.category;
      const concepto = `"${exp.reason.replace(/"/g, '""')}"`;
      const usuario = exp.user?.name || 'N/A';
      const monto = exp.amount.toFixed(2);
      return [fecha, hora, `"${sucursal}"`, `"${categoria}"`, concepto, `"${usuario}"`, monto].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Gastos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Reporte exportado en formato CSV compatible con Excel', 'Exportación Exitosa');
  };

  const getCategoryBadgeColor = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('renta')) return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300';
    if (c.includes('nómina') || c.includes('sueldo')) return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300';
    if (c.includes('servicio') || c.includes('luz') || c.includes('agua')) return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300';
    if (c.includes('insumo') || c.includes('papelería')) return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';
    if (c.includes('mantenimiento')) return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300';
    if (c.includes('impuesto') || c.includes('sat')) return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300';
    if (c.includes('flete') || c.includes('envío')) return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300';
    return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 rounded-xl">
              <PackageOpen className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Gastos Administrativos y Operación
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Bitácora integral de desembolsos, servicios, nóminas y gastos operativos por sucursal.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Export Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exportar Excel (CSV)
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Filtrado */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Filtrado
            </span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              {formatCurrency(totalFiltrado, 2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Suma según los filtros aplicados
            </p>
          </div>
        </div>

        {/* Total Mes Actual */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Este Mes
            </span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(totalMesActual, 2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Gasto acumulado del mes calendario
            </p>
          </div>
        </div>

        {/* Total Registros */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Gastos Registrados
            </span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {filteredExpenses.length} <span className="text-sm font-normal text-slate-500">gastos</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              De {expenses.length} totales registrados
            </p>
          </div>
        </div>

        {/* Gasto Promedio */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Gasto Promedio
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(gastoPromedio, 2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Por registro individual
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Left, Filtered Table Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form Nuevo Gasto */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-6">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Nuevo Gasto
              </h2>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              {/* Sucursal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Sucursal
                </label>
                <select
                  value={formBranchId}
                  onChange={e => setFormBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoría Contable */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Categoría Contable
                </label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Concepto o Detalle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Concepto o Detalle
                </label>
                <input
                  type="text"
                  value={formReason}
                  onChange={e => setFormReason(e.target.value)}
                  placeholder="Ej. Pago recibo CFE Enero, Compra café y azúcar..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Monto ($) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Monto ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Fecha del Gasto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Fecha del Comprobante
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Nota Informativa */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5 leading-relaxed">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  Este movimiento se registra en la bitácora contable de gastos pero <strong>NO descuenta automáticamente</strong> de la sesión de caja en curso.
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/20"
              >
                <Plus className="w-4 h-4" />
                {isPending ? 'Registrando Gasto...' : 'Registrar Gasto'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Filter Toolbar & Expenses Table */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Filters Bar Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            
            {/* Top Row: Search & Branch & Sort */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Buscador */}
              <div className="relative sm:col-span-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar concepto o usuario..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filtro Sucursal */}
              <div>
                <select
                  value={selectedBranch}
                  onChange={e => setSelectedBranch(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="ALL">🏢 Todas las Sucursales</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ordenamiento */}
              <div>
                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="NEWEST">📅 Más recientes primero</option>
                  <option value="OLDEST">📅 Más antiguos primero</option>
                  <option value="AMOUNT_DESC">💰 Mayor monto</option>
                  <option value="AMOUNT_ASC">💰 Menor monto</option>
                </select>
              </div>
            </div>

            {/* Middle Row: Categoría Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Categoría:
              </span>
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex-shrink-0 ${
                  selectedCategory === 'ALL'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Todas
              </button>
              {CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat;
                const shortLabel = cat.split('/')[0].split('(')[0].trim();
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex-shrink-0 ${
                      isSelected
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>

            {/* Bottom Row: Date Filters */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Período:
              </span>
              {[
                { id: 'THIS_MONTH', label: 'Este Mes' },
                { id: 'TODAY', label: 'Hoy' },
                { id: 'YESTERDAY', label: 'Ayer' },
                { id: 'THIS_WEEK', label: 'Esta Semana' },
                { id: 'LAST_MONTH', label: 'Mes Anterior' },
                { id: 'ALL', label: 'Histórico Completo' },
                { id: 'CUSTOM', label: 'Personalizado' }
              ].map(period => (
                <button
                  key={period.id}
                  onClick={() => setDateFilter(period.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    dateFilter === period.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {period.label}
                </button>
              ))}

              {/* Custom Date Pickers */}
              {dateFilter === 'CUSTOM' && (
                <div className="flex items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-xs">Desde:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-xs">Hasta:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Table Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="responsive-table w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Fecha y Hora
                    </th>
                    <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Sucursal
                    </th>
                    <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Categoría
                    </th>
                    <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Concepto / Detalle
                    </th>
                    <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                      Monto
                    </th>
                    <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredExpenses.map(exp => {
                    const d = new Date(exp.createdAt);
                    const fechaStr = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
                    const horaStr = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <tr 
                        key={exp.id} 
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Fecha */}
                        <td data-label="Fecha y Hora" className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {fechaStr}
                          </div>
                          <div className="text-xs text-slate-400">
                            {horaStr}
                          </div>
                        </td>

                        {/* Sucursal */}
                        <td data-label="Sucursal" className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {exp.branch?.name || 'Matriz'}
                          </span>
                        </td>

                        {/* Categoría */}
                        <td data-label="Categoría" className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border ${getCategoryBadgeColor(exp.category)}`}>
                            {exp.category}
                          </span>
                        </td>

                        {/* Concepto y Registrador */}
                        <td data-label="Concepto" className="py-3.5 px-4">
                          <div className="font-medium text-slate-900 dark:text-white leading-snug">
                            {exp.reason}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Por: <span className="font-medium text-slate-600 dark:text-slate-300">{exp.user?.name || 'Sistema'}</span>
                          </div>
                        </td>

                        {/* Monto */}
                        <td data-label="Monto" className="py-3.5 px-4 whitespace-nowrap text-right">
                          <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                            -{formatCurrency(exp.amount, 2)}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td data-label="Acción" className="py-3.5 px-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => setDeleteTargetId(exp.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Eliminar gasto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Empty State */}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                          No se encontraron gastos
                        </h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                          No hay registros que coincidan con los filtros seleccionados o no se han registrado gastos en este período.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Summary in Table */}
            {filteredExpenses.length > 0 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Mostrando <strong className="text-slate-900 dark:text-white">{filteredExpenses.length}</strong> gastos
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Total Filtrado: <span className="text-rose-600 dark:text-rose-400 font-black">{formatCurrency(totalFiltrado, 2)}</span>
                </span>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Delete Confirmation Modal */}
      <CorporateConfirmModal
        isOpen={deleteTargetId !== null}
        title="Eliminar Gasto Registrado"
        message="¿Estás seguro de que deseas eliminar este gasto de la bitácora? Esta acción no se puede deshacer."
        confirmText="Sí, eliminar gasto"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isPending}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
