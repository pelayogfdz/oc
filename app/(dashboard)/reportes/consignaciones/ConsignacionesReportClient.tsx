'use client';

import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, Loader2, PackageCheck, TrendingUp, DollarSign, Percent, ShieldCheck } from 'lucide-react';
import { getConsignmentReportData } from '@/app/actions/reportes';
import ReportFilterBar, { ReportFilterState } from '@/components/ui/ReportFilterBar';

export default function ConsignacionesReportClient({ initialData, initialBranchId }: { initialData: any, initialBranchId: string }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleFilterChange = async (filters: ReportFilterState) => {
    setLoading(true);
    try {
      const newData = await getConsignmentReportData(
        filters.dateRange.startDate, 
        filters.dateRange.endDate, 
        filters.branchId, 
        filters.userId
      );
      setData(newData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const filteredConsignments = data.consignments.filter((c: any) => 
    c.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatYAxis = (tickItem: any) => {
    if (tickItem >= 1000) {
      return `$${(tickItem / 1000).toFixed(1)}k`;
    }
    return `$${tickItem}`;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PackageCheck size={28} color="#6366f1" /> Reporte de Consignaciones
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Mide la rotación, cobros e inventario flotante en manos de tus clientes.</p>
        </div>
      </div>
      
      {/* Filter Bar */}
      <ReportFilterBar 
        onFilterChange={handleFilterChange} 
        disabled={loading} 
        showUser={true}
        initialBranchId={initialBranchId}
      />

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#6366f1', fontWeight: 'bold' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Actualizando reporte...
        </div>
      )}

      <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* KPI Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '1rem', top: '1rem', backgroundColor: '#e0e7ff', padding: '0.5rem', borderRadius: '8px', color: '#6366f1' }}>
              <DollarSign size={20} />
            </div>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monto Consignado</h3>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1e1b4b' }}>{formatCurrency(data.metrics.totalConsigned)}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)', marginTop: '0.5rem' }}>
              Total entregado en el periodo
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '1rem', top: '1rem', backgroundColor: '#fef3c7', padding: '0.5rem', borderRadius: '8px', color: '#d97706' }}>
              <TrendingUp size={20} />
            </div>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Consignación Activa</h3>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#d97706' }}>{formatCurrency(data.metrics.activeConsigned)}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)', marginTop: '0.5rem' }}>
              Mercancía flotante ({data.metrics.activeCount} folios)
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '1rem', top: '1rem', backgroundColor: '#dcfce7', padding: '0.5rem', borderRadius: '8px', color: '#16a34a' }}>
              <ShieldCheck size={20} />
            </div>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Venta Cerrada</h3>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#16a34a' }}>{formatCurrency(data.metrics.convertedConsigned)}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)', marginTop: '0.5rem' }}>
              Monto ya facturado ({data.metrics.convertedCount} folios)
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '1rem', top: '1rem', backgroundColor: '#ede9fe', padding: '0.5rem', borderRadius: '8px', color: '#8b5cf6' }}>
              <Percent size={20} />
            </div>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasa de Cierre</h3>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#8b5cf6' }}>{data.metrics.conversionRate.toFixed(1)}%</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)', marginTop: '0.5rem' }}>
              Consignaciones convertidas a ventas
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)', height: '380px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1e293b' }}>Consignaciones vs Conversiones Facturadas (Tendencia Diaria)</h2>
          <ResponsiveContainer width="100%" height="82%">
            <AreaChart data={data.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorConsignado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFacturado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} dy={10} />
              <YAxis tickFormatter={formatYAxis} tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} dx={-10} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <RechartsTooltip 
                formatter={(value: any) => formatCurrency(Number(value))}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontFamily: 'var(--font-geist-sans)' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Area type="monotone" name="Total Consignado" dataKey="Consignado" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorConsignado)" />
              <Area type="monotone" name="Monto Facturado/Vendido" dataKey="Facturado" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorFacturado)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Grid: Transactions Table & Sidebar tables */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          
          {/* Main Consignments Table */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b' }}>Consignaciones en el Periodo</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>Lista detallada de folios registrados y su estado actual.</p>
              </div>
              
              <div style={{ position: 'relative', width: '350px', maxWidth: '100%' }}>
                <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar por cliente, vendedor o folio..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '0.65rem 1rem 0.65rem 2.5rem', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }} 
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
              <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
                  <tr style={{ borderBottom: '2px solid var(--pulpos-border)', color: 'var(--pulpos-text-muted)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Fecha</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Folio</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Cliente</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Cajero/Vendedor</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Artículos</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Estado</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConsignments.map((c: any) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--pulpos-border)', transition: 'background-color 0.15s' }}>
                      <td data-label="Fecha" style={{ padding: '1rem 0.5rem', fontSize: '0.9rem' }}>{formatDate(c.date)}</td>
                      <td data-label="Folio" style={{ padding: '1rem 0.5rem', fontSize: '0.9rem', color: '#6366f1', fontWeight: 'bold', fontFamily: 'monospace' }}>
                        #{c.id.slice(0,8).toUpperCase()}
                      </td>
                      <td data-label="Cliente" style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>{c.customer}</td>
                      <td data-label="Cajero" style={{ padding: '1rem 0.5rem', color: 'var(--pulpos-text-muted)', fontSize: '0.9rem' }}>{c.user}</td>
                      <td data-label="Artículos" style={{ padding: '1rem 0.5rem', fontSize: '0.9rem', color: 'var(--pulpos-text-muted)' }}>{c.itemsCount} pzas</td>
                      <td data-label="Estado" style={{ padding: '1rem 0.5rem' }}>
                        {c.status === 'ACTIVE' ? (
                          <span style={{ 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '9999px', 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold',
                            backgroundColor: '#e0e7ff',
                            color: '#3730a3'
                          }}>
                            CONSIGNADO
                          </span>
                        ) : (
                          <span style={{ 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '9999px', 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold',
                            backgroundColor: '#dcfce7',
                            color: '#166534'
                          }}>
                            FACTURADO
                          </span>
                        )}
                      </td>
                      <td data-label="Monto" style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#4f46e5' }}>{formatCurrency(c.total)}</td>
                    </tr>
                  ))}
                  {filteredConsignments.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                        No se encontraron consignaciones bajo este rango de filtros o búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sub tables in 2-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            {/* Top Products Table */}
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1e293b' }}>Rendimiento por Producto</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--pulpos-border)', color: 'var(--pulpos-text-muted)' }}>
                      <th style={{ padding: '0.5rem' }}>Producto</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Total pzas</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>En Consig.</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Cobrados</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Monto Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((p: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>
                          <div>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', fontFamily: 'monospace' }}>SKU: {p.sku}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold' }}>{p.consignedQty}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#d97706' }}>{p.activeQty}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#16a34a' }}>{p.billedQty}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#4f46e5' }}>{formatCurrency(p.totalValue)}</td>
                      </tr>
                    ))}
                    {data.topProducts.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                          Sin datos de productos en este periodo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Customers Table */}
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1e293b' }}>Desempeño por Cliente</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--pulpos-border)', color: 'var(--pulpos-text-muted)' }}>
                      <th style={{ padding: '0.5rem' }}>Cliente</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Entregas</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Consig. Activa</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total Cobrado</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Monto Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCustomers.map((c: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>{c.name}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{c.count}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#d97706', fontWeight: 'bold' }}>{formatCurrency(c.activeAmt)}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#16a34a', fontWeight: 'bold' }}>{formatCurrency(c.billedAmt)}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#4f46e5' }}>{formatCurrency(c.consignedAmt)}</td>
                      </tr>
                    ))}
                    {data.topCustomers.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                          Sin datos de clientes en este periodo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
