'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Filter, FileText, Download, TrendingUp, Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function FacturacionReportClient({ initialSales, users, brands = [], startDate, endDate }: any) {
  const router = useRouter();
  
  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState(startDate.split('T')[0]);
  const [filterDateTo, setFilterDateTo] = useState(endDate.split('T')[0]);
  const [filterUserId, setFilterUserId] = useState('ALL');
  const [filterPayment, setFilterPayment] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, FACTURADO, PENDIENTE
  const [filterBrand, setFilterBrand] = useState('ALL');

  const handleApplyFilters = () => {
    const query = new URLSearchParams();
    if (filterDateFrom) query.set('startDate', new Date(filterDateFrom + 'T00:00:00').toISOString());
    if (filterDateTo) query.set('endDate', new Date(filterDateTo + 'T23:59:59').toISOString());
    router.push(`/reportes/facturacion?${query.toString()}`);
  };

  // Determine if a sale is "facturada". We check if notes contains "[REQUIERE FACTURA]"
  const salesData = useMemo(() => {
    return initialSales.map((sale: any) => {
      const isFacturado = sale.notes?.includes('[REQUIERE FACTURA]');
      return {
        ...sale,
        isFacturado
      };
    });
  }, [initialSales]);

  // Apply Client-Side Filters
  const filteredSales = useMemo(() => {
    let filtered = salesData;
    if (filterBrand !== 'ALL') {
      filtered = filtered.map((sale: any) => {
        const filteredItems = sale.items?.filter((item: any) => item.product?.brand === filterBrand) || [];
        if (filteredItems.length === 0) return null;
        return {
          ...sale,
          items: filteredItems,
          total: filteredItems.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0)
        };
      }).filter(Boolean);
    }

    return filtered.filter((sale: any) => {
      if (filterUserId !== 'ALL' && sale.userId !== filterUserId) return false;
      if (filterPayment !== 'ALL' && sale.paymentMethod !== filterPayment) return false;
      if (filterStatus === 'FACTURADO' && !sale.isFacturado) return false;
      if (filterStatus === 'PENDIENTE' && sale.isFacturado) return false;
      return true;
    });
  }, [salesData, filterUserId, filterPayment, filterStatus, filterBrand]);

  // KPIs
  const totalVentas = filteredSales.reduce((sum: number, sale: any) => sum + sale.total, 0);
  const totalFacturado = filteredSales.filter((s: any) => s.isFacturado).reduce((sum: number, sale: any) => sum + sale.total, 0);
  const percentageFacturado = totalVentas > 0 ? ((totalFacturado / totalVentas) * 100).toFixed(1) : '0.0';

  // Chart Data: Venta por Día
  const salesByDay = useMemo(() => {
    const grouped: any = {};
    filteredSales.forEach((s: any) => {
      const date = new Date(s.createdAt).toLocaleDateString();
      if (!grouped[date]) grouped[date] = { date, facturado: 0, noFacturado: 0 };
      if (s.isFacturado) {
        grouped[date].facturado += s.total;
      } else {
        grouped[date].noFacturado += s.total;
      }
    });
    return Object.values(grouped);
  }, [filteredSales]);

  // Chart Data: Forma de Pago
  const salesByPayment = useMemo(() => {
    const grouped: any = {};
    filteredSales.filter((s: any) => s.isFacturado).forEach((s: any) => {
      const pm = s.paymentMethod;
      if (!grouped[pm]) grouped[pm] = { name: pm, value: 0 };
      grouped[pm].value += s.total;
    });
    return Object.values(grouped);
  }, [filteredSales]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const exportToCSV = () => {
    const headers = ['Folio', 'Fecha', 'Cliente', 'Vendedor', 'Forma Pago', 'Total', 'Estado Factura'];
    const rows = filteredSales.map((s: any) => [
      s.id.slice(-6).toUpperCase(),
      new Date(s.createdAt).toLocaleString(),
      s.customer?.name || 'Público en General',
      s.user?.name || s.user?.email || 'Desconocido',
      s.paymentMethod,
      s.total.toFixed(2),
      s.isFacturado ? 'Facturado' : 'Sin Facturar'
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(',') + "\n" 
      + rows.map((r: any[]) => r.map(cell => `"${cell}"`).join(',')).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_facturacion_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Filters Bar */}
      <div className="no-print" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', backgroundColor: 'var(--pulpos-card-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} color="var(--pulpos-text-muted)" />
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
          <span> - </span>
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
        </div>
        
        <select value={filterUserId} onChange={e => setFilterUserId(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }}>
          <option value="ALL">Todos los Vendedores</option>
          {users.map((u: any) => (
            <option key={u.id} value={u.id}>{u.name || u.email}</option>
          ))}
        </select>
 
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }}>
          <option value="ALL">Todo (Facturado y No Facturado)</option>
          <option value="FACTURADO">Solo Facturado</option>
          <option value="PENDIENTE">Pendiente / No Facturado</option>
        </select>

        <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }}>
          <option value="ALL">Todas las Marcas</option>
          {brands.map((b: string) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
 
        <button onClick={handleApplyFilters} style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--pulpos-primary)', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          Aplicar Filtros
        </button>
 
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#6d28d9', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            <Printer size={18} /> Imprimir / PDF
          </button>
          <button onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'var(--pulpos-bg)', border: '1px solid var(--pulpos-border)', color: 'var(--pulpos-text)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            <Download size={18} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: 'var(--pulpos-card-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Total Ventas (Periodo)</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--pulpos-text)' }}>
            ${totalVentas.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--pulpos-card-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid #10b981' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#059669', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} /> Total Facturado (CFDI)
          </h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#059669' }}>
            ${totalFacturado.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--pulpos-card-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} /> Porcentaje Facturado
          </h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>
            {percentageFacturado}%
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div style={{ backgroundColor: 'var(--pulpos-card-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)' }}>
          <h3 style={{ margin: 0, marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 'bold' }}>Tendencia de Facturación</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <RechartsTooltip formatter={(value: any) => [`$${Number(value).toFixed(2)}`, '']} />
                <Bar dataKey="facturado" name="Facturado" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="noFacturado" name="No Facturado" stackId="a" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div style={{ backgroundColor: 'var(--pulpos-card-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)' }}>
          <h3 style={{ margin: 0, marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 'bold' }}>Facturado por Método de Pago</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesByPayment}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {salesByPayment.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Monto']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ backgroundColor: 'var(--pulpos-card-bg)', borderRadius: '8px', border: '1px solid var(--pulpos-border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--pulpos-bg)', borderBottom: '1px solid var(--pulpos-border)' }}>
            <tr>
              <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>Folio</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>Fecha</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>Cliente / RFC</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>Vendedor</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>Monto</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((s: any) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td style={{ padding: '1rem', fontWeight: '500' }}>{s.id.slice(-6).toUpperCase()}</td>
                <td style={{ padding: '1rem' }}>{new Date(s.createdAt).toLocaleString()}</td>
                <td style={{ padding: '1rem' }}>
                  <div>{s.customer?.name || 'Público en General'}</div>
                  {s.isFacturado && <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>{s.notes?.match(/RFC: ([A-Z0-9]+)/)?.[1] || 'RFC Generico'}</div>}
                </td>
                <td style={{ padding: '1rem' }}>{s.user?.name || s.user?.email || 'Caja'}</td>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>${s.total.toFixed(2)}</td>
                <td style={{ padding: '1rem' }}>
                  {s.isFacturado ? (
                    <span style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      Facturado
                    </span>
                  ) : (
                    <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      Pendiente
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                  No hay ventas que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
