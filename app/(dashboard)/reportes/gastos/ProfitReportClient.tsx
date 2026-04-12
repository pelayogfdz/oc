'use client';
import { useState, useMemo } from 'react';
import { Calendar, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function ProfitReportClient({ sales, expenses }: { sales: any[], expenses: any[] }) {
  const [datePreset, setDatePreset] = useState('ALL');

  const filteredData = useMemo(() => {
    let s = sales;
    let e = expenses;
    if (datePreset !== 'ALL') {
      const now = new Date();
      s = s.filter(x => {
        const d = new Date(x.createdAt);
        if (datePreset === 'TODAY') return d.toDateString() === now.toDateString();
        if (datePreset === 'YESTERDAY') {
          const y = new Date(now); y.setDate(now.getDate() - 1);
          return d.toDateString() === y.toDateString();
        }
        if (datePreset === '7DAYS') return d >= new Date(now.setDate(now.getDate() - 7));
        if (datePreset === '30DAYS') return d >= new Date(now.setDate(now.getDate() - 30));
        return true;
      });
      e = e.filter(x => {
        const d = new Date(x.createdAt);
        if (datePreset === 'TODAY') return d.toDateString() === now.toDateString();
        if (datePreset === 'YESTERDAY') {
          const y = new Date(); y.setDate(y.getDate() - 1);
          return d.toDateString() === y.toDateString();
        }
        if (datePreset === '7DAYS') return d >= new Date(new Date().setDate(new Date().getDate() - 7));
        if (datePreset === '30DAYS') return d >= new Date(new Date().setDate(new Date().getDate() - 30));
        return true;
      });
    }
    return { sales: s, expenses: e };
  }, [sales, expenses, datePreset]);

  // Aggregation
  const totalSales = filteredData.sales.reduce((acc, sale) => acc + sale.total, 0);
  const totalCostOfGoods = filteredData.sales.reduce((acc, sale) => {
    return acc + sale.items.reduce((sum: number, i: any) => sum + ((i.product?.cost || 0) * i.quantity), 0);
  }, 0);
  const grossProfit = totalSales - totalCostOfGoods;

  const totalExpenses = filteredData.expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  
  const netMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(2) + '%' : '0%';

  // Daily Trend For Chart
  const trendData = useMemo(() => {
    const map = new Map<string, { key: string, ingresos: number, opEx: number, cogs: number, utilidad: number }>();
    
    filteredData.sales.forEach(sale => {
      const d = new Date(sale.createdAt).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
      if(!map.has(d)) map.set(d, { key: d, ingresos: 0, opEx: 0, cogs: 0, utilidad: 0 });
      const state = map.get(d)!;
      state.ingresos += sale.total;
      const cogs = sale.items.reduce((sum: number, i: any) => sum + ((i.product?.cost || 0) * i.quantity), 0);
      state.cogs += cogs;
    });

    filteredData.expenses.forEach(exp => {
      const d = new Date(exp.createdAt).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
      if(!map.has(d)) map.set(d, { key: d, ingresos: 0, opEx: 0, cogs: 0, utilidad: 0 });
      map.get(d)!.opEx += exp.amount;
    });

    const arr = Array.from(map.values()).sort((a,b) => new Date(a.key).getTime() - new Date(b.key).getTime());
    arr.forEach(a => {
      a.utilidad = a.ingresos - a.cogs - a.opEx;
    });
    return arr;
  }, [filteredData]);

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Rango de Fechas (P&L)</label>
          <div style={{ position: 'relative' }}>
            <Calendar size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <select className="input-field" value={datePreset} onChange={e => setDatePreset(e.target.value)} style={{ paddingLeft: '2.5rem', width: '100%' }}>
              <option value="ALL">Histórico Completo</option>
              <option value="TODAY">Hoy</option>
              <option value="YESTERDAY">Ayer</option>
              <option value="7DAYS">Últimos 7 días</option>
              <option value="30DAYS">Últimos 30 días</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem', borderTop: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.5rem' }}>INGRESOS (Ventas)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a' }}>${totalSales.toFixed(2)}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderTop: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.5rem' }}>COGS (Costo Venta)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#ef4444' }}>-${totalCostOfGoods.toFixed(2)}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderTop: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.5rem' }}>OPEX (Gastos)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#f59e0b' }}>-${totalExpenses.toFixed(2)}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderTop: '4px solid #10b981', backgroundColor: '#f0fdf4' }}>
          <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 'bold', marginBottom: '0.5rem' }}>UTILIDAD NETA</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#15803d' }}>${netProfit.toFixed(2)}</div>
          <div style={{ fontSize: '0.9rem', color: '#16a34a', marginTop: '0.25rem', fontWeight: 'bold' }}>Margen: {netMargin}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', height: '400px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Tendencia P&L Diaria</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="key" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
            <Legend />
            <Bar dataKey="ingresos" name="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="opEx" name="Gastos Operativos" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="egresos" />
            <Bar dataKey="cogs" name="Costo Mercancía" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="egresos" />
            <Bar dataKey="utilidad" name="Utilidad Neta P&L" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
