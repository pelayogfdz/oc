'use client';

import { useState } from 'react';
import { PieChart, Pie, Tooltip as RechartsTooltip, Cell, ResponsiveContainer, Legend, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { Search, Eye, Loader2, Printer, Download, Clock, Calendar, Zap, TrendingUp, Sparkles, Filter } from 'lucide-react';
import { getSalesDetailData } from '@/app/actions/reportes';
import ReportFilterBar, { ReportFilterState } from '@/components/ui/ReportFilterBar';
import { exportToExcel } from '@/lib/exportExcel';

const COLORS = ['#0ea5e9', '#16a34a', '#d946ef', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function VentasDesgloseClient({ initialData, initialBranchId }: { initialData: any, initialBranchId: string }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'day' | 'hour'>('day');
  const [onlyActiveHours, setOnlyActiveHours] = useState(true);

  const handleFilterChange = async (filters: ReportFilterState) => {
    setLoading(true);
    try {
      const newData = await getSalesDetailData(
        filters.dateRange.startDate, 
        filters.dateRange.endDate, 
        filters.branchId, 
        filters.userId,
        filters.brandId,
        filters.paymentMethod,
        filters.invoiced
      );
      setData(newData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const filteredSales = (data?.sales || []).filter((s: any) => 
    s.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.folio && s.folio.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatYAxis = (tickItem: any) => {
    if (tickItem >= 1000) {
      return `$${(tickItem / 1000).toFixed(1)}k`;
    }
    return `$${tickItem}`;
  };

  const hourlyData = data?.hourlyData || [];
  const displayHourlyData = onlyActiveHours 
    ? hourlyData.filter((h: any) => h.Ventas > 0 || h.Tickets > 0)
    : hourlyData;

  const peakHour = data?.peakHour || null;
  const peakTicketsHour = data?.peakTicketsHour || null;

  const downloadExcelTickets = () => {
    const headers = ["Fecha", "Hora", "Folio", "Cliente", "Cajero/Vendedor", "Método Pago", "Tipo Pago (PUE/PPD)", "Facturado", "Monto", "Ganancia"];
    const rows = filteredSales.map((s: any) => [
      formatDate(s.date),
      formatTime(s.date),
      s.folio,
      s.customer,
      s.user,
      s.method,
      s.pueOrPpd,
      s.invoiceId ? 'Sí' : 'No',
      s.total,
      s.profit
    ]);
    exportToExcel(headers, rows, 'Reporte_Desglose_Ventas_Tickets');
  };

  const downloadExcelHourly = () => {
    const headers = ["Horario", "Formato 12h", "Ventas Totales (MXN)", "Ganancia Estimada (MXN)", "No. Tickets", "Ticket Promedio (MXN)", "% del Total"];
    const rows = hourlyData.map((h: any) => [
      h.hourLabel,
      h.timeLabel,
      h.Ventas,
      h.Ganancia,
      h.Tickets,
      h.avgTicket,
      `${(h.percentage || 0).toFixed(2)}%`
    ]);
    exportToExcel(headers, rows, 'Reporte_Ventas_Por_Hora');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Reporte de Ventas Detalladas</h1>
          <p style={{ color: 'var(--caanma-text-muted)' }}>Analiza ingresos por día, horas de venta, contribuciones individuales y métodos de pago.</p>
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
            onClick={viewMode === 'hour' ? downloadExcelHourly : downloadExcelTickets}
            title={viewMode === 'hour' ? "Exportar tabla de ventas por hora" : "Exportar listado de tickets"}
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
          disabled={loading} 
          showUser={true}
          showPaymentMethod={true}
          showInvoiced={true}
          initialBranchId={initialBranchId}
        />
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--caanma-primary)', fontWeight: 'bold' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Cargando ventas...
        </div>
      )}

      <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Main Chart Section with Hourly & Daily Toggle */}
        <div style={{ backgroundColor: 'white', padding: '1.75rem 2rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {viewMode === 'day' ? (
                  <>
                    <Calendar size={20} color="#16a34a" />
                    Ventas Totales por Día
                  </>
                ) : (
                  <>
                    <Clock size={20} color="#0284c7" />
                    Distribución de Ventas por Hora del Día
                  </>
                )}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', marginTop: '0.2rem' }}>
                {viewMode === 'day' 
                  ? 'Visualiza la evolución temporal de ingresos a lo largo del período seleccionado.' 
                  : 'Analiza en qué horas del día se concentra la mayor facturación y flujo de clientes.'}
              </p>
            </div>

            {/* Mode Switcher */}
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

          {/* Hourly KPI summary cards when viewMode === 'hour' */}
          {viewMode === 'hour' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
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

              <div style={{ backgroundColor: '#faf5ff', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #e9d5ff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <TrendingUp size={16} color="#9333ea" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#7e22ce', textTransform: 'uppercase' }}>Ticket Promedio Hora Pico</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#6b21a8' }}>
                  {peakHour && peakHour.Tickets > 0 ? formatCurrency(peakHour.avgTicket) : '$0.00'}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#7e22ce', marginTop: '0.2rem' }}>
                  {peakHour && peakHour.Tickets > 0 ? `${peakHour.Tickets} ventas realizadas` : '0 ventas'}
                </div>
              </div>
            </div>
          )}

          {/* Chart Rendering */}
          <div style={{ height: '320px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'day' ? (
                <AreaChart data={data.chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVentasDay" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} dy={10} />
                  <YAxis tickFormatter={formatYAxis} tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} dx={-10} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <RechartsTooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Ventas']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Area type="monotone" dataKey="Ventas" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorVentasDay)" />
                </AreaChart>
              ) : (
                <BarChart data={hourlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="shortLabel" 
                    tick={{fontSize: 11, fill: '#64748b'}} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10} 
                  />
                  <YAxis tickFormatter={formatYAxis} tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} dx={-10} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(2, 132, 199, 0.08)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div style={{ backgroundColor: 'white', padding: '0.85rem 1rem', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.35rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.25rem' }}>
                              🕒 {item.hourLabel} ({item.timeLabel})
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#16a34a', fontWeight: 'bold' }}>
                              <span>Ventas:</span>
                              <span>{formatCurrency(item.Ventas)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#0284c7' }}>
                              <span>Ganancia:</span>
                              <span>{formatCurrency(item.Ganancia)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#64748b' }}>
                              <span>Tickets:</span>
                              <span>{item.Tickets} ventas</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#64748b' }}>
                              <span>Ticket Prom.:</span>
                              <span>{formatCurrency(item.avgTicket)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#9333ea', fontWeight: '500', marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px dashed #e2e8f0' }}>
                              <span>% del Total:</span>
                              <span>{(item.percentage || 0).toFixed(1)}%</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="Ventas" 
                    fill="#0284c7" 
                    radius={[4, 4, 0, 0]}
                  >
                    {hourlyData.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.hour === peakHour?.hour && entry.Ventas > 0 ? '#16a34a' : '#0284c7'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabla de Desglose por Hora (Cuando está en modo Por Hora) */}
        {viewMode === 'hour' && (
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Detalle Numérico de Ventas por Hora</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)' }}>Desglose hora por hora con participación porcentual y márgenes de ganancia.</p>
              </div>

              <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setOnlyActiveHours(!onlyActiveHours)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: onlyActiveHours ? '#eff6ff' : 'white',
                    color: onlyActiveHours ? '#1d4ed8' : '#64748b',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  <Filter size={14} /> {onlyActiveHours ? 'Mostrando horas con ventas' : 'Mostrando 24 horas'}
                </button>
                <button
                  type="button"
                  onClick={downloadExcelHourly}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: 'white',
                    color: '#0f172a',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={14} /> Exportar Horas Excel
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
              <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
                  <tr style={{ borderBottom: '2px solid var(--caanma-border)', color: 'var(--caanma-text-muted)', fontSize: '0.88rem' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Horario</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Participación (%)</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Total Vendido</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Ganancia Est.</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>No. Tickets</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Ticket Promedio</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>% Total</th>
                  </tr>
                </thead>
                <tbody>
                  {displayHourlyData.map((h: any) => {
                    const isPeak = h.hour === peakHour?.hour && h.Ventas > 0;
                    return (
                      <tr 
                        key={h.hour} 
                        style={{ 
                          borderBottom: '1px solid var(--caanma-border)',
                          backgroundColor: isPeak ? '#f0fdf4' : 'transparent'
                        }}
                      >
                        <td data-label="Horario" style={{ padding: '0.85rem 0.5rem', fontSize: '0.9rem', fontWeight: isPeak ? 'bold' : '500' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={15} color={isPeak ? '#16a34a' : '#64748b'} />
                            <span>{h.hourLabel}</span>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({h.timeLabel})</span>
                            {isPeak && (
                              <span style={{ 
                                backgroundColor: '#dcfce7', 
                                color: '#15803d', 
                                fontSize: '0.75rem', 
                                fontWeight: 'bold', 
                                padding: '0.15rem 0.45rem', 
                                borderRadius: '9999px',
                                border: '1px solid #bbf7d0'
                              }}>
                                ⭐ Pico
                              </span>
                            )}
                          </div>
                        </td>
                        <td data-label="Participación" style={{ padding: '0.85rem 0.5rem', minWidth: '130px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1, backgroundColor: '#e2e8f0', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
                              <div 
                                style={{ 
                                  width: `${Math.min(100, h.percentage || 0)}%`, 
                                  backgroundColor: isPeak ? '#16a34a' : '#0284c7', 
                                  height: '100%', 
                                  borderRadius: '9999px' 
                                }} 
                              />
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#64748b', width: '38px', textAlign: 'right' }}>
                              {(h.percentage || 0).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td data-label="Total Vendido" style={{ padding: '0.85rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: h.Ventas > 0 ? '#0f172a' : '#94a3b8' }}>
                          {formatCurrency(h.Ventas)}
                        </td>
                        <td data-label="Ganancia Est." style={{ padding: '0.85rem 0.5rem', textAlign: 'right', color: h.Ganancia > 0 ? '#16a34a' : '#94a3b8', fontWeight: '500' }}>
                          {formatCurrency(h.Ganancia)}
                        </td>
                        <td data-label="No. Tickets" style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 'bold' }}>
                          <span style={{ 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '6px', 
                            backgroundColor: h.Tickets > 0 ? '#f1f5f9' : 'transparent',
                            color: h.Tickets > 0 ? '#0f172a' : '#94a3b8',
                            fontSize: '0.85rem'
                          }}>
                            {h.Tickets}
                          </span>
                        </td>
                        <td data-label="Ticket Promedio" style={{ padding: '0.85rem 0.5rem', textAlign: 'right', color: '#64748b', fontSize: '0.9rem' }}>
                          {formatCurrency(h.avgTicket)}
                        </td>
                        <td data-label="% Total" style={{ padding: '0.85rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: isPeak ? '#16a34a' : '#0284c7' }}>
                          {(h.percentage || 0).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  {displayHourlyData.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                        No se registraron ventas en ningún horario durante este período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sección de Historial de Transacciones y Gráfica Circular de Vendedores */}
        <div className="report-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
          
          {/* Tabla Analítica de Transacciones */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Historial de Transacciones</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--caanma-text-muted)' }}>Cada ticket incluye la hora exacta en que se registró la venta.</p>
              </div>
              
              <div className="no-print" style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
                <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar ticket, cliente, cajero..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '0.65rem 1rem 0.65rem 2.5rem', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }} 
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
              <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
                  <tr style={{ borderBottom: '2px solid var(--caanma-border)', color: 'var(--caanma-text-muted)', fontSize: '0.9rem' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Fecha y Hora</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Folio</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Cliente</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Cajero</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Método</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Factura</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Ganancia</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((s: any) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                      <td data-label="Fecha y Hora" style={{ padding: '0.85rem 0.5rem', fontSize: '0.88rem' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{formatDate(s.date)}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                          <Clock size={12} color="#0284c7" />
                          <span>{formatTime(s.date)}</span>
                        </div>
                      </td>
                      <td data-label="Folio" style={{ padding: '0.85rem 0.5rem', fontSize: '0.88rem', color: 'var(--caanma-primary)', fontFamily: 'monospace', fontWeight: 'bold' }}>{s.folio}</td>
                      <td data-label="Cliente" style={{ padding: '0.85rem 0.5rem', fontSize: '0.9rem' }}>{s.customer}</td>
                      <td data-label="Cajero" style={{ padding: '0.85rem 0.5rem', color: 'var(--caanma-text-muted)', fontSize: '0.88rem' }}>{s.user}</td>
                      <td data-label="Método" style={{ padding: '0.85rem 0.5rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '9999px', 
                          fontSize: '0.78rem', 
                          fontWeight: 'bold',
                          backgroundColor: s.method === 'CASH' ? '#dcfce7' : '#e0f2fe',
                          color: s.method === 'CASH' ? '#16a34a' : '#0284c7'
                        }}>
                          {s.method}
                        </span>
                      </td>
                      <td data-label="Factura" style={{ padding: '0.85rem 0.5rem' }}>
                        {s.invoiceId ? (
                          <span 
                            title={`ID Factura: ${s.invoiceId}`}
                            style={{ 
                              padding: '0.25rem 0.5rem', 
                              borderRadius: '9999px', 
                              fontSize: '0.78rem', 
                              fontWeight: 'bold',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe'
                            }}
                          >
                            Facturado
                          </span>
                        ) : (
                          <span style={{ 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '9999px', 
                            fontSize: '0.78rem', 
                            fontWeight: 'bold',
                            backgroundColor: '#f1f5f9',
                            color: '#64748b'
                          }}>
                            No facturado
                          </span>
                        )}
                      </td>
                      <td data-label="Total" style={{ padding: '0.85rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(s.total)}</td>
                      <td data-label="Ganancia" style={{ padding: '0.85rem 0.5rem', textAlign: 'right', color: '#16a34a', fontWeight: '500' }}>{formatCurrency(s.profit)}</td>
                      <td data-label="Acciones" style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                        <button style={{ padding: '0.25rem', color: 'var(--caanma-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                        No se encontraron ventas para estos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gráficas Laterales */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Ventas por Vendedor</h2>
            
            <div style={{ height: '280px' }}>
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
              <h3 style={{ fontWeight: 'bold', color: 'var(--caanma-text-muted)', marginBottom: '1rem', fontSize: '0.85rem', textTransform: 'uppercase' }}>Resumen del Período</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--caanma-border)', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--caanma-text-muted)', fontSize: '0.9rem' }}>Tickets Filtrados</span>
                <span style={{ fontWeight: 'bold' }}>{filteredSales.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--caanma-border)', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--caanma-text-muted)', fontSize: '0.9rem' }}>Monto Seleccionado</span>
                <span style={{ fontWeight: 'bold', color: 'var(--caanma-primary)' }}>
                  {formatCurrency(filteredSales.reduce((acc: number, val: any) => acc + val.total, 0))}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--caanma-border)' }}>
                <span style={{ color: 'var(--caanma-text-muted)', fontSize: '0.9rem' }}>Ticket Promedio</span>
                <span style={{ fontWeight: 'bold', color: '#16a34a' }}>
                  {filteredSales.length > 0 ? formatCurrency(filteredSales.reduce((acc: number, val: any) => acc + val.total, 0) / filteredSales.length) : '$0.00'}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
