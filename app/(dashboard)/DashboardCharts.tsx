'use client';

import { useState, useEffect } from 'react';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFilter = () => {
    setIsUpdating(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    router.push(`/?${params.toString()}`);
    setIsUpdating(false);
  };

  const formatYAxisAmount = (tickItem: number) => {
    if (tickItem >= 1000) {
      return `$${(tickItem / 1000).toFixed(1)}k`;
    }
    return `$${tickItem}`;
  };

  // Dynamic client-side grouping based on selected period
  const groupedData = (() => {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
      {/* Filtros Bar */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.25rem 1.5rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={20} color="#64748b" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Rendimiento de Ventas</h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Selector de Agrupamiento */}
          {mounted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>Agrupar:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                style={{
                  border: '1px solid #cbd5e1',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  color: '#1e293b',
                  backgroundColor: 'white'
                }}
              >
                <option value="day">Por Día</option>
                <option value="week">Por Semana</option>
                <option value="month">Por Mes</option>
                <option value="year">Por Año</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>Desde:</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                border: '1px solid #cbd5e1',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                outline: 'none',
                color: '#1e293b'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>Hasta:</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                border: '1px solid #cbd5e1',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                outline: 'none',
                color: '#1e293b'
              }}
            />
          </div>

          <button 
            onClick={handleFilter}
            disabled={isUpdating}
            style={{
              backgroundColor: '#6d28d9',
              color: 'white',
              border: 'none',
              padding: '0.4rem 1.25rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              opacity: isUpdating ? 0.7 : 1
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#5b21b6'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#6d28d9'}
          >
            {isUpdating ? 'Filtrando...' : 'Filtrar'}
          </button>
        </div>
      </div>

      {/* Gráficas Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        
        {/* Gráfica 1: Número de Ventas */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          height: '350px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={18} color="#3b82f6" /> Transacciones Realizadas
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} dy={5} />
                <YAxis tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip 
                  formatter={(value: any) => [`${value} ventas`, 'Transacciones']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 2: Monto de Ventas */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          height: '350px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={18} color="#10b981" /> Total de Ventas (Ingresos)
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={groupedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} dy={5} />
                <YAxis tickFormatter={formatYAxisAmount} tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Ingresos']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
