'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, FileText, Percent, DollarSign } from 'lucide-react';

export default function GeneralAnalyticsClient({ data }: { data: any }) {
  const formatYAxis = (tickItem: any) => {
    if (tickItem >= 1000) {
      return `$${(tickItem / 1000).toFixed(1)}k`;
    }
    return `$${tickItem}`;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Analítica General</h1>
      <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '2rem' }}>Resumen de los últimos 30 días.</p>

      {/* KPI Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#dcfce7', borderRadius: '8px' }}><DollarSign size={20} color="#16a34a" /></div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Ingresos Brutos</h3>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#16a34a' }}>{formatCurrency(data.totalRevenue)}</div>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#e0f2fe', borderRadius: '8px' }}><TrendingUp size={20} color="#0284c7" /></div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Utilidad Neta (Ganancia)</h3>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#0284c7' }}>{formatCurrency(data.totalProfit)}</div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#fef3c7', borderRadius: '8px' }}><Percent size={20} color="#d97706" /></div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Margen Global</h3>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#d97706' }}>{data.margin.toFixed(2)}%</div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#f3e8ff', borderRadius: '8px' }}><FileText size={20} color="#9333ea" /></div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Tickets y Ticket Prom.</h3>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#9333ea' }}>{data.totalTickets}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', marginTop: '0.25rem' }}>Promedio: {formatCurrency(data.avgTicket)}</div>
        </div>
      </div>

      {/* Main Chart */}
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)', height: '400px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '2rem' }}>Tendencia de Ingresos vs Utilidad (30 Días)</h2>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={data.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} dy={10} />
            <YAxis tickFormatter={formatYAxis} tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} dx={-10} />
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <Area type="monotone" dataKey="Ventas" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
            <Area type="monotone" dataKey="Ganancia" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
