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
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} dy={5} />
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
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} dy={5} />
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
