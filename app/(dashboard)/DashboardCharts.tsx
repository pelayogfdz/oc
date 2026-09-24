'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Calendar, DollarSign, ShoppingCart } from 'lucide-react';

interface ChartDataPoint {
  date: string;
  dateStr: string;
  count: number;
  amount: number;
}

interface DashboardChartsProps {
  chartData: ChartDataPoint[];
  initialStartDate: string;
  initialEndDate: string;
}

export default function DashboardCharts({ chartData, initialStartDate, initialEndDate }: DashboardChartsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [isUpdating, setIsUpdating] = useState(false);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month' | 'year'>('day');

  const handleFilter = () => {
    setIsUpdating(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    router.push(`/?${params.toString()}`);
    setIsUpdating(false);
  };

  const handleResetToday = () => {
    setIsUpdating(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('startDate');
    params.delete('endDate');
    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : '/');
    setIsUpdating(false);
  };

  const hasActiveFilter = Boolean(searchParams.get('startDate') || searchParams.get('endDate'));

  const formatYAxisAmount = (tickItem: number) => {
    if (tickItem >= 1000) {
      return `$${(tickItem / 1000).toFixed(1)}k`;
    }
    return `$${tickItem}`;
  };

  // Dynamic client-side grouping based on selected period
  const groupedData: any[] = (() => {
    if (groupBy === 'day') {
      return chartData.map(d => ({ ...d, label: d.date }));
    }

    const groups: { [key: string]: { label: string; count: number; amount: number; sortKey: string } } = {};

    chartData.forEach(d => {
      if (!d.dateStr) return;
      const [year, month, day] = d.dateStr.split('-').map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return;
      const date = new Date(year, month - 1, day);

      let key = '';
      let label = '';
      let sortKey = '';

      if (groupBy === 'week') {
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        
        const y = monday.getFullYear();
        const m = String(monday.getMonth() + 1).padStart(2, '0');
        const dayStr = String(monday.getDate()).padStart(2, '0');
        
        // Find week number
        const dateCopy = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()));
        const dayNum = dateCopy.getUTCDay() || 7;
        dateCopy.setUTCDate(dateCopy.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(dateCopy.getUTCFullYear(),0,1));
        const weekNum = Math.ceil((((dateCopy.getTime() - yearStart.getTime()) / 86400000) + 1)/7);

        key = `${y}-W${weekNum}`;
        label = `Sem ${dayStr}/${m}`;
        sortKey = `${y}-${m}-${dayStr}`;
      } else if (groupBy === 'month') {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        key = `${y}-${m}`;
        label = date.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
        sortKey = `${y}-${m}`;
      } else if (groupBy === 'year') {
        const y = date.getFullYear();
        key = `${y}`;
        label = `${y}`;
        sortKey = `${y}`;
      }

      if (!groups[key]) {
        groups[key] = { label, count: 0, amount: 0, sortKey };
      }
      groups[key].count += d.count;
      groups[key].amount += d.amount;
    });

    return Object.values(groups).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
      {/* Filtros Bar */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
            <Calendar size={16} />
          </div>
          <h2 className="text-sm font-bold text-slate-900 m-0">Rendimiento de Ventas</h2>
        </div>
        
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Selector de Agrupamiento */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Agrupar:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="border border-slate-200 py-1 px-2.5 rounded-lg text-xs font-medium text-slate-700 bg-white hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
            >
              <option value="day">Por Día</option>
              <option value="week">Por Semana</option>
              <option value="month">Por Mes</option>
              <option value="year">Por Año</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Desde:</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-slate-200 py-1 px-2 rounded-lg text-xs font-medium text-slate-700 bg-white hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
            />
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Hasta:</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-slate-200 py-1 px-2 rounded-lg text-xs font-medium text-slate-700 bg-white hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={handleFilter}
              disabled={isUpdating}
              className="bg-slate-900 hover:bg-slate-800 text-white border-0 py-1 px-3.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isUpdating ? 'Filtrando...' : 'Filtrar'}
            </button>

            {hasActiveFilter && (
              <button 
                onClick={handleResetToday}
                disabled={isUpdating}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-1 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Ver Hoy
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gráficas Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.25rem', width: '100%', minWidth: 0 }}>
        
        {/* Gráfica 1: Número de Ventas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs h-[330px] flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 m-0">
              <ShoppingCart size={15} className="text-blue-600" /> Transacciones Realizadas
            </h3>
            <span className="text-xs font-black text-slate-900">
              {groupedData.reduce((acc, d) => acc + d.count, 0).toLocaleString('es-MX')} ventas
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} dy={5} />
                <YAxis tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip 
                  formatter={(value: any) => [`${value} ventas`, 'Transacciones']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 2: Monto de Ventas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs h-[330px] flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 m-0">
              <DollarSign size={15} className="text-emerald-600" /> Facturación / Ingresos
            </h3>
            <span className="text-xs font-black text-emerald-700">
              {formatCurrency(groupedData.reduce((acc, d) => acc + d.amount, 0))}
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={groupedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} dy={5} />
                <YAxis tickFormatter={formatYAxisAmount} tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Ingresos']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Resumen del Período Seleccionado (Visible solo cuando se filtra un rango específico de fechas) */}
      {hasActiveFilter && (() => {
        const periodTotalSales = chartData.reduce((sum, d) => sum + d.count, 0);
        const periodTotalAmount = chartData.reduce((sum, d) => sum + d.amount, 0);
        const periodAvgTicket = periodTotalSales > 0 ? periodTotalAmount / periodTotalSales : 0;

        const formatPeriodDate = (dateStr: string) => {
          if (!dateStr) return '';
          const parts = dateStr.split('-');
          if (parts.length !== 3) return dateStr;
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        };

        return (
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-xs font-semibold text-slate-500">
                {startDate === endDate 
                  ? `Resumen de Fecha: ${formatPeriodDate(startDate)}`
                  : `Resumen del Período: ${formatPeriodDate(startDate)} al ${formatPeriodDate(endDate)}`
                }
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              {/* Card 1: Ventas */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex justify-between items-center">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Ventas del Período
                  </span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {periodTotalSales.toLocaleString('es-MX')}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <ShoppingCart size={18} />
                </div>
              </div>

              {/* Card 2: Monto Total */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex justify-between items-center">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Monto del Período
                  </span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {formatCurrency(periodTotalAmount)}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <DollarSign size={18} />
                </div>
              </div>

              {/* Card 3: Ticket Promedio */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex justify-between items-center">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Ticket Promedio
                  </span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {formatCurrency(periodAvgTicket)}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <DollarSign size={18} />
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
