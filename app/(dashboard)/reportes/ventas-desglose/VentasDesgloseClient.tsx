'use client';

import { useState } from 'react';
import { PieChart, Pie, Tooltip as RechartsTooltip, Cell, ResponsiveContainer, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, Eye, Loader2 } from 'lucide-react';
import { getSalesDetailData } from '@/app/actions/reportes';
import ReportFilterBar, { ReportFilterState } from '@/components/ui/ReportFilterBar';

const COLORS = ['#0ea5e9', '#16a34a', '#d946ef', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function VentasDesgloseClient({ initialData, initialBranchId }: { initialData: any, initialBranchId: string }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleFilterChange = async (filters: ReportFilterState) => {
    setLoading(true);
    try {
      const newData = await getSalesDetailData(filters.dateRange.startDate, filters.dateRange.endDate, filters.branchId, filters.userId);
      setData(newData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const filteredSales = data.sales.filter((s: any) => 
    s.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatYAxis = (tickItem: any) => {
    if (tickItem >= 1000) {
      return `$${(tickItem / 1000).toFixed(1)}k`;
    }
    return `$${tickItem}`;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Reporte de Ventas Detalladas</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Analiza contribuciones, tickets individuales y métodos de pago.</p>
        </div>
      </div>
      
      <ReportFilterBar 
        onFilterChange={handleFilterChange} 
        disabled={loading} 
        showUser={true}
        initialBranchId={initialBranchId}
      />

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--pulpos-primary)', fontWeight: 'bold' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Cargando ventas...
        </div>
      )}

      <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Main Chart */}
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)', height: '350px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '2rem' }}>Ventas Totales por Día</h2>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={data.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} dy={10} />
              <YAxis tickFormatter={formatYAxis} tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} dx={-10} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <RechartsTooltip 
                formatter={(value: any) => formatCurrency(Number(value))}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Area type="monotone" dataKey="Ventas" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '2rem', alignItems: 'start' }}>
          
          {/* Tabla Analítica */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Historial de Transacciones</h2>
              
              <div style={{ position: 'relative', width: '250px' }}>
                <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--pulpos-text-muted)' }} size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar ticket, cliente, cajero..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '0.5rem 1rem 0.5rem 2.25rem', 
                    borderRadius: '6px', 
                    border: '1px solid var(--pulpos-border)' 
                  }} 
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
                  <tr style={{ borderBottom: '2px solid var(--pulpos-border)', color: 'var(--pulpos-text-muted)', fontSize: '0.9rem' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Fecha</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>ID Ticket</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Cliente</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Cajero</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Método</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Ganancia</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((s: any) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                      <td style={{ padding: '1rem 0.5rem', fontSize: '0.9rem' }}>{formatDate(s.date)}</td>
                      <td style={{ padding: '1rem 0.5rem', fontSize: '0.9rem', color: 'var(--pulpos-primary)', fontFamily: 'monospace' }}>{s.id.split('-')[0]}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{s.customer}</td>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--pulpos-text-muted)', fontSize: '0.9rem' }}>{s.user}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '9999px', 
                          fontSize: '0.8rem', 
                          fontWeight: 'bold',
                          backgroundColor: s.method === 'CASH' ? '#dcfce7' : '#e0f2fe',
                          color: s.method === 'CASH' ? '#16a34a' : '#0284c7'
                        }}>
                          {s.method}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(s.total)}</td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#16a34a' }}>{formatCurrency(s.profit)}</td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                        <button style={{ padding: '0.25rem', color: 'var(--pulpos-primary)' }}>
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                        No se encontraron ventas para estos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gráficas Laterales */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Ventas por Vendedor</h2>
            
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>Resumen Rápido</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--pulpos-border)', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--pulpos-text-muted)' }}>Tickets Filtrados</span>
                <span style={{ fontWeight: 'bold' }}>{filteredSales.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--pulpos-border)' }}>
                <span style={{ color: 'var(--pulpos-text-muted)' }}>Monto Seleccionado</span>
                <span style={{ fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>
                  {formatCurrency(filteredSales.reduce((acc: number, val: any) => acc + val.total, 0))}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
