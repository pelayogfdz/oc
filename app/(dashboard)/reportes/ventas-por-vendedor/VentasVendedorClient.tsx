'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, Users, ArrowDownToLine, Loader2, Search, DollarSign, Award, Printer } from 'lucide-react';
import { getSalesBySellerReport } from '@/app/actions/reportes';

export default function VentasVendedorClient({ initialData, initialBranchId, availableFilters }: { initialData: any[], initialBranchId: string, availableFilters: any }) {
  const [data, setData] = useState<any[]>(initialData);
  const [branchId, setBranchId] = useState(initialBranchId);
  const [brand, setBrand] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Default dates (last 30 days)
  const defaultEnd = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultEnd.getDate() - 30);

  const [startDateStr, setStartDateStr] = useState(defaultStart.toISOString().split('T')[0]);
  const [endDateStr, setEndDateStr] = useState(defaultEnd.toISOString().split('T')[0]);

  const handlePresetChange = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'TODAY':
        start.setHours(0,0,0,0);
        break;
      case 'THIS_MONTH':
        start.setDate(1);
        start.setHours(0,0,0,0);
        break;
      case 'LAST_MONTH':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        start.setHours(0,0,0,0);
        end.setDate(0);
        end.setHours(23,59,59,999);
        break;
      case 'LAST_30_DAYS':
        start.setDate(today.getDate() - 30);
        break;
      case 'LAST_90_DAYS':
        start.setDate(today.getDate() - 90);
        break;
      default:
        return;
    }

    setStartDateStr(start.toISOString().split('T')[0]);
    setEndDateStr(end.toISOString().split('T')[0]);
    triggerUpdate(start, end, branchId, brand);
  };

  const triggerUpdate = async (start: Date, end: Date, bId: string, brnd: string) => {
    setIsLoading(true);
    try {
      const res = await getSalesBySellerReport(start, end, bId, brnd);
      setData(res || []);
    } catch (error) {
      console.error("Error updating seller report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = () => {
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T23:59:59');
    triggerUpdate(start, end, branchId, brand);
  };

  const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

  // Filter local search inside the table
  const filteredData = useMemo(() => {
    return data.filter(s => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return s.name.toLowerCase().includes(term);
    });
  }, [data, searchTerm]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalSellers = data.length;
    const totalTransactions = data.reduce((acc, s) => acc + s.salesCount, 0);
    const totalSalesValue = data.reduce((acc, s) => acc + s.totalSales, 0);
    const totalCommissions = data.reduce((acc, s) => acc + s.earnedCommission, 0);
    const overallAvgTicket = totalTransactions > 0 ? (totalSalesValue / totalTransactions) : 0;

    return {
      totalSellers,
      totalTransactions,
      totalSalesValue,
      totalCommissions,
      overallAvgTicket
    };
  }, [data]);

  // Chart data: Sellers
  const chartData = useMemo(() => {
    return data.map(s => ({
      name: s.name.length > 18 ? s.name.substring(0, 15) + "..." : s.name,
      Ventas: s.totalSales,
      Comisiones: s.earnedCommission
    }));
  }, [data]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#d946ef', '#0ea5e9'];

  const downloadCSV = () => {
    const headers = ["Lugar", "Vendedor / Cajero", "Transacciones", "Ventas Totales", "Ticket Promedio", "Comisión %", "Comisión Generada"];
    const rows = filteredData.map((s, idx) => [
      idx + 1,
      s.name,
      s.salesCount,
      s.totalSales.toFixed(2),
      s.avgTicket.toFixed(2),
      s.commissionPct,
      s.earnedCommission.toFixed(2)
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Ventas_Vendedor_${startDateStr}_a_${endDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>👥 Rendimiento de Ventas por Vendedor</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Análisis de productividad comercial, número de transacciones cobradas y cálculo automático de comisiones de personal.</p>
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
            onClick={downloadCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#1e293b'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#0f172a'}
          >
            <ArrowDownToLine size={18} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="no-print" style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Filtros Rápidos</label>
            <select 
              onChange={e => handlePresetChange(e.target.value)} 
              defaultValue="LAST_30_DAYS"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="TODAY">Hoy</option>
              <option value="THIS_MONTH">Este Mes</option>
              <option value="LAST_MONTH">Mes Anterior</option>
              <option value="LAST_30_DAYS">Últimos 30 días</option>
              <option value="LAST_90_DAYS">Últimos 90 días</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Fecha Inicio</label>
            <input 
              type="date" 
              value={startDateStr} 
              onChange={e => setStartDateStr(e.target.value)} 
              style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Fecha Fin</label>
            <input 
              type="date" 
              value={endDateStr} 
              onChange={e => setEndDateStr(e.target.value)} 
              style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Sucursal</label>
            <select 
              value={branchId} 
              onChange={e => setBranchId(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="ALL">Todas las Sucursales</option>
              {availableFilters.branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>Marca</label>
            <select 
              value={brand} 
              onChange={e => setBrand(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="ALL">Todas las Marcas</option>
              {availableFilters.brands?.map((b: string) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleApplyFilters}
            disabled={isLoading}
            style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0.55rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.875rem', cursor: 'pointer', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#1d4ed8'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#2563eb'}
          >
            {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Aplicar'}
          </button>
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#2563eb', fontWeight: 'bold', fontSize: '0.9rem' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Calculando desempeño por vendedor...
        </div>
      )}

      <div style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        {/* KPI Panel Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '8px' }}><Users size={20} color="#3b82f6" /></div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Vendedores Activos</h3>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#1e293b' }}>{stats.totalSellers}</div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#fdf2f8', borderRadius: '8px' }}><TrendingUp size={20} color="#be185d" /></div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Ventas Totales</h3>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#be185d' }}>{stats.totalTransactions} cobros</div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#f0fdf4', borderRadius: '8px' }}><DollarSign size={20} color="#16a34a" /></div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Monto Consol.</h3>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#16a34a' }}>{formatter.format(stats.totalSalesValue)}</div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#fef3c7', borderRadius: '8px' }}><Award size={20} color="#d97706" /></div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Ticket Prom. Gral</h3>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#d97706' }}>{formatter.format(stats.overallAvgTicket)}</div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#f5f3ff', borderRadius: '8px' }}><DollarSign size={20} color="#7c3aed" /></div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Comisiones Gral</h3>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#7c3aed' }}>{formatter.format(stats.totalCommissions)}</div>
          </div>
        </div>

        {/* Chart View */}
        {chartData.length > 0 && (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '350px', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5rem' }}>Ventas Totales Cobradas por Colaborador</h2>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val.toLocaleString()}`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip 
                  formatter={(value: any) => [formatter.format(value), "Ventas"]}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: 'white' }}
                />
                <Bar dataKey="Ventas" radius={[6, 6, 0, 0]} maxBarSize={45}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Detailed Sellers Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Leaderboard de Ventas y Comisiones Acumuladas</h2>
            <div className="no-print" style={{ position: 'relative', width: '280px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Buscar por vendedor..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.75rem 0.45rem 2.2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  <th style={{ padding: '1rem 0.75rem' }}>Lugar</th>
                  <th style={{ padding: '1rem 0.75rem' }}>Vendedor / Cajero</th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>Transacciones Realizadas</th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>Monto Total Vendido</th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>Ticket Promedio</th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>% Comisión</th>
                  <th style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>Comisión Generada</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem', color: '#334155' }}>
                {filteredData.length > 0 ? (
                  filteredData.map((s, idx) => {
                    return (
                      <tr key={s.userId} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }} onMouseOver={e => e.currentTarget.style.backgroundColor='#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor='transparent'}>
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: 'bold', color: '#64748b' }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: 'bold', color: '#0f172a' }}>{s.name}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 'bold' }}>{s.salesCount}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>{formatter.format(s.totalSales)}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', color: '#64748b' }}>{formatter.format(s.avgTicket)}</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', color: '#64748b' }}>{s.commissionPct}%</td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: 'bold', color: '#7c3aed' }}>
                          {formatter.format(s.earnedCommission)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem 0', textAlign: 'center', color: '#94a3b8' }}>
                      No se encontraron vendedores en el rango de búsqueda o categorías seleccionadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
