'use client';

import { useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, FileText, Percent, DollarSign, Loader2, Printer, Download, Clock, Calendar, Sparkles, Zap } from 'lucide-react';
import ReportFilterBar, { ReportFilterState } from '@/components/ui/ReportFilterBar';
import { exportToExcel } from '@/lib/exportExcel';
import { getGeneralAnalyticsData } from '@/app/actions/reportes';

export default function GeneralAnalyticsClient({ initialData, initialBranchId }: { initialData: any, initialBranchId: string }) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'hour'>('day');

  const formatYAxis = (tickItem: any) => {
    if (tickItem >= 1000) {
      return `$${(tickItem / 1000).toFixed(1)}k`;
    }
    return `$${tickItem}`;
  };

  const hourlyData = data?.hourlyData || [];
  const peakHour = data?.peakHour || null;
  const peakTicketsHour = data?.peakTicketsHour || null;

  const downloadExcel = () => {
    if (viewMode === 'hour') {
      const headers = ["Horario", "Formato 12h", "Ventas (MXN)", "Ganancia (MXN)", "Tickets", "Ticket Promedio (MXN)", "% del Total"];
      const rows = hourlyData.map((h: any) => [
        h.hourLabel,
        h.timeLabel,
        h.Ventas,
        h.Ganancia,
        h.Tickets,
        h.avgTicket,
        `${(h.percentage || 0).toFixed(2)}%`
      ]);
      exportToExcel(headers, rows, 'Reporte_Analitica_General_Por_Hora');
    } else {
      const headers = ["Fecha", "Ventas (MXN)", "Ganancia (MXN)", "Tickets"];
      const rows = data.chartData.map((c: any) => [
        c.date,
        c.Ventas,
        c.Ganancia,
        c.Tickets
      ]);
      exportToExcel(headers, rows, 'Reporte_Analitica_General');
    }
  };

  const handleFilterChange = async (filters: ReportFilterState) => {
    setIsLoading(true);
    try {
      const newData = await getGeneralAnalyticsData(
        filters.dateRange.startDate, 
        filters.dateRange.endDate, 
        filters.branchId, 
        filters.userId,
        filters.brandId,
        filters.paymentMethod,
        filters.restockable
      );
      setData(newData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Analítica General</h1>
          <p style={{ color: 'var(--caanma-text-muted)' }}>Desempeño global de tus ventas, horarios pico y márgenes.</p>
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
            onClick={downloadExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#1e293b'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#0f172a'}
          >
            <Download size={18} /> {viewMode === 'hour' ? 'Exportar Excel (Horas)' : 'Exportar Excel'}
          </button>
        </div>
      </div>
      
      <div className="no-print">
        <ReportFilterBar 
          onFilterChange={handleFilterChange} 
          disabled={isLoading} 
          showUser={true}
          showPaymentMethod={true}
          initialBranchId={initialBranchId}
        />
      </div>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--caanma-primary)', fontWeight: 'bold' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Actualizando métricas...
        </div>
      )}

      <div style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        {/* KPI Widgets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.25rem 1rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <div style={{ padding: '0.45rem', backgroundColor: '#dcfce7', borderRadius: '8px', flexShrink: 0 }}><DollarSign size={18} color="#16a34a" /></div>
              <h3 style={{ fontSize: '0.825rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>Ingresos Brutos</h3>
            </div>
            <div style={{ fontSize: 'clamp(1.1rem, 1.3vw, 1.45rem)', fontWeight: '900', color: '#16a34a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.02em', lineHeight: 1.2 }} title={formatCurrency(data.totalRevenue)}>
              {formatCurrency(data.totalRevenue)}
            </div>
          </div>
          
          <div style={{ backgroundColor: 'white', padding: '1.25rem 1rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <div style={{ padding: '0.45rem', backgroundColor: '#e0f2fe', borderRadius: '8px', flexShrink: 0 }}><TrendingUp size={18} color="#0284c7" /></div>
              <h3 style={{ fontSize: '0.825rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>Utilidad (basada en margen)</h3>
            </div>
            <div style={{ fontSize: 'clamp(1.1rem, 1.3vw, 1.45rem)', fontWeight: '900', color: '#0284c7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.02em', lineHeight: 1.2 }} title={formatCurrency(data.totalProfit)}>
              {formatCurrency(data.totalProfit)}
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.25rem 1rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <div style={{ padding: '0.45rem', backgroundColor: '#fef3c7', borderRadius: '8px', flexShrink: 0 }}><Percent size={18} color="#d97706" /></div>
              <h3 style={{ fontSize: '0.825rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>Margen Global</h3>
            </div>
            <div style={{ fontSize: 'clamp(1.15rem, 1.4vw, 1.55rem)', fontWeight: '900', color: '#d97706', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {data.margin.toFixed(2)}%
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.25rem 1rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <div style={{ padding: '0.45rem', backgroundColor: '#f3e8ff', borderRadius: '8px', flexShrink: 0 }}><FileText size={18} color="#9333ea" /></div>
              <h3 style={{ fontSize: '0.825rem', fontWeight: 'bold', color: 'var(--caanma-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>Tickets y Ticket Prom.</h3>
            </div>
            <div style={{ fontSize: 'clamp(1.15rem, 1.4vw, 1.55rem)', fontWeight: '900', color: '#9333ea', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {data.totalTickets.toLocaleString('es-MX')}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--caanma-text-muted)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Promedio: {formatCurrency(data.avgTicket)}
            </div>
          </div>
        </div>

        {/* View Mode Switcher Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Visualización Temporal</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)' }}>Elige entre desglose diario histórico o distribución horaria del día.</p>
          </div>

          <div className="no-print" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '0.3rem', borderRadius: '8px', gap: '0.25rem' }}>
            <button
              type="button"
              onClick={() => setViewMode('day')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.88rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: viewMode === 'day' ? 'white' : 'transparent',
                color: viewMode === 'day' ? 'var(--caanma-primary)' : '#64748b',
                boxShadow: viewMode === 'day' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Calendar size={15} /> Por Día
            </button>
            <button
              type="button"
              onClick={() => setViewMode('hour')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.88rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: viewMode === 'hour' ? 'white' : 'transparent',
                color: viewMode === 'hour' ? '#0284c7' : '#64748b',
                boxShadow: viewMode === 'hour' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Clock size={15} /> Por Hora
            </button>
          </div>
        </div>

        {/* Hourly Peak Highlights */}
        {viewMode === 'hour' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: '#f0fdf4', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <Sparkles size={16} color="#16a34a" />
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#15803d', textTransform: 'uppercase' }}>Hora Pico en Ventas</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#166534' }}>
                {peakHour && peakHour.Ventas > 0 ? `${peakHour.timeLabel} (${peakHour.shortLabel})` : 'Sin ventas'}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#15803d', marginTop: '0.2rem' }}>
                {peakHour && peakHour.Ventas > 0 
                  ? `${formatCurrency(peakHour.Ventas)} (${(peakHour.percentage || 0).toFixed(1)}% del total)` 
                  : '$0.00'}
              </div>
            </div>

            <div style={{ backgroundColor: '#f0f9ff', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #bae6fd' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <Zap size={16} color="#0284c7" />
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#0369a1', textTransform: 'uppercase' }}>Mayor Afluencia (Tickets)</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#075985' }}>
                {peakTicketsHour && peakTicketsHour.Tickets > 0 ? `${peakTicketsHour.timeLabel} (${peakTicketsHour.shortLabel})` : 'Sin ventas'}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#0369a1', marginTop: '0.2rem' }}>
                {peakTicketsHour && peakTicketsHour.Tickets > 0 ? `${peakTicketsHour.Tickets} tickets emitidos` : '0 tickets'}
              </div>
            </div>
          </div>
        )}

        {/* Charts Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Main Chart */}
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', height: '400px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '2rem' }}>
              {viewMode === 'day' ? 'Tendencia de Ingresos vs Utilidad por Día' : 'Ingresos y Utilidad por Hora del Día (00:00 - 23:00 hrs)'}
            </h2>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={viewMode === 'day' ? data.chartData : hourlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                <XAxis dataKey={viewMode === 'day' ? 'date' : 'shortLabel'} tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} dy={10} />
                <YAxis tickFormatter={formatYAxis} tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} dx={-10} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Area type="monotone" dataKey="Ventas" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                <Area type="monotone" dataKey="Ganancia" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Tickets Chart */}
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', height: '350px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '2rem' }}>
              {viewMode === 'day' ? 'Tickets Emitidos por Día' : 'Tickets y Clientes por Hora del Día'}
            </h2>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={viewMode === 'day' ? data.chartData : hourlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey={viewMode === 'day' ? 'date' : 'shortLabel'} tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} dy={10} />
                <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} dx={-10} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="Tickets" fill="#9333ea" radius={[4, 4, 0, 0]}>
                  {viewMode === 'hour' && hourlyData.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.hour === peakTicketsHour?.hour && entry.Tickets > 0 ? '#16a34a' : '#9333ea'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
