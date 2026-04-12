'use client';
import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Filter, Download } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function SalesReportClient({ sales }: { sales: any[] }) {
  const [datePreset, setDatePreset] = useState('ALL'); // ALL, TODAY, YESTERDAY, 7DAYS, 30DAYS
  const [groupBy, setGroupBy] = useState('DATE'); // DATE, PRODUCT, CATEGORY, PAYMENT_METHOD, USER, CUSTOMER

  // Filter by Date
  const filteredSales = useMemo(() => {
    if (datePreset === 'ALL') return sales;
    const now = new Date();
    return sales.filter(s => {
      const d = new Date(s.createdAt);
      if (datePreset === 'TODAY') {
        return d.toDateString() === now.toDateString();
      }
      if (datePreset === 'YESTERDAY') {
        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        return d.toDateString() === y.toDateString();
      }
      if (datePreset === '7DAYS') {
        const p = new Date(now);
        p.setDate(now.getDate() - 7);
        return d >= p;
      }
      if (datePreset === '30DAYS') {
        const p = new Date(now);
        p.setDate(now.getDate() - 30);
        return d >= p;
      }
      return true;
    });
  }, [sales, datePreset]);

  // Aggregate Data based on GroupBy
  const groupedData = useMemo(() => {
    const map = new Map<string, { key: string, salesCount: number, revenue: number, cost: number, returnAmount: number }>();

    filteredSales.forEach(sale => {
      if (sale.status === 'CANCELLED') return; // skip fully cancelled depending on logic, or handle return
      const isReturn = sale.status === 'RETURNED'; // example logic
      const dateKey = new Date(sale.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
      
      let itemsToProcess = [{ keyPart: '', itemTotal: sale.total, itemCost: sale.items.reduce((acc: number, i: any) => acc + ((i.product?.cost || 0) * i.quantity), 0) }];
      
      if (groupBy === 'DATE') {
        itemsToProcess[0].keyPart = dateKey;
      } else if (groupBy === 'PAYMENT_METHOD') {
        itemsToProcess[0].keyPart = sale.paymentMethod || 'Efectivo';
      } else if (groupBy === 'USER') {
        itemsToProcess[0].keyPart = sale.user?.name || 'Desconocido';
      } else if (groupBy === 'PRODUCT' || groupBy === 'CATEGORY') {
        // We must flatten by items
        itemsToProcess = sale.items.map((i: any) => ({
          keyPart: groupBy === 'PRODUCT' ? (i.product?.name || 'Sin Nombre') : (i.product?.category?.name || 'Sin Categoría'),
          itemTotal: i.price * i.quantity,
          itemCost: (i.product?.cost || 0) * i.quantity
        }));
      }

      itemsToProcess.forEach(block => {
        const k = block.keyPart;
        if (!map.has(k)) {
          map.set(k, { key: k, salesCount: 0, revenue: 0, cost: 0, returnAmount: 0 });
        }
        const state = map.get(k)!;
        if (isReturn) {
          state.returnAmount += block.itemTotal;
        } else {
          state.salesCount += 1;
          state.revenue += block.itemTotal;
          state.cost += block.itemCost;
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, groupBy]);

  const globalRevenue = groupedData.reduce((sum, item) => sum + item.revenue, 0);
  const globalCost = groupedData.reduce((sum, item) => sum + item.cost, 0);
  const globalReturns = groupedData.reduce((sum, item) => sum + item.returnAmount, 0);
  const netRevenue = globalRevenue - globalReturns;
  const grossProfit = netRevenue - globalCost;
  const marginStr = netRevenue > 0 ? ((grossProfit / netRevenue) * 100).toFixed(2) + '%' : '0%';

  return (
    <div>
      {/* Dynamic Filters Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Rango de Fechas</label>
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

        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Agrupado Por</label>
          <div style={{ position: 'relative' }}>
            <Filter size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <select className="input-field" value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ paddingLeft: '2.5rem', width: '100%' }}>
              <option value="DATE">Fecha de Emisión</option>
              <option value="PRODUCT">Producto</option>
              <option value="CATEGORY">Categoría</option>
              <option value="PAYMENT_METHOD">Método de Pago</option>
              <option value="USER">Cajero / Operador</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.5rem' }}>VENTAS BRUTAS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a' }}>${globalRevenue.toFixed(2)}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.5rem' }}>REEMBOLSOS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#ef4444' }}>${globalReturns.toFixed(2)}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.5rem' }}>VENTA NETA</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#10b981' }}>${netRevenue.toFixed(2)}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.5rem' }}>UTILIDAD (MARGEN)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>${grossProfit.toFixed(2)}</div>
          <div style={{ fontSize: '0.85rem', color: '#f59e0b', marginTop: '0.25rem', fontWeight: 'bold' }}>{marginStr}</div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', height: '400px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          {groupBy === 'DATE' ? 'Tendencia de Ventas' : `Distribución por ${
            groupBy === 'PRODUCT' ? 'Producto' : 
            groupBy === 'CATEGORY' ? 'Categoría' : 
            groupBy === 'PAYMENT_METHOD' ? 'Método' : 'Operador'
          }`}
        </h3>
        
        <ResponsiveContainer width="100%" height="100%">
          {groupBy === 'DATE' ? (
             <BarChart data={groupedData.slice().reverse()}>
               <XAxis dataKey="key" stroke="#94a3b8" fontSize={12} />
               <YAxis stroke="#94a3b8" fontSize={12} />
               <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
               <Bar dataKey="revenue" name="Ingresos" fill="var(--pulpos-primary)" radius={[4, 4, 0, 0]} />
             </BarChart>
          ) : (
             <PieChart>
               <Pie 
                 data={groupedData.slice(0, 15)} // Top 15 to keep pie readable
                 dataKey="revenue" 
                 nameKey="key" 
                 cx="50%" 
                 cy="50%" 
                 outerRadius={120} 
                 fill="#8884d8" 
                 label={(e) => `${e.key} (${((e.value / globalRevenue) * 100).toFixed(1)}%)`}
                 labelLine={true}
               >
                 {groupedData.slice(0,15).map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                 ))}
               </Pie>
               <Tooltip />
             </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Dynamic Data Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h3 style={{ fontWeight: 'bold' }}>Desglose Analítico</h3>
           <button className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
             <Download size={14} style={{ display: 'inline', marginRight: '0.5rem' }} /> Exportar CSV
           </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Agrupación ({groupBy})</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Transacciones</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Ingreso Neto</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Costo</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Utilidad Bruta</th>
              </tr>
            </thead>
            <tbody>
              {groupedData.map((d, i) => {
                const profit = d.revenue - d.cost;
                return (
                <tr key={i} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>{d.key}</td>
                  <td style={{ padding: '1rem', color: '#64748b' }}>{d.salesCount}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: '#10b981' }}>${d.revenue.toFixed(2)}</td>
                  <td style={{ padding: '1rem', color: '#ef4444' }}>${d.cost.toFixed(2)}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>${profit.toFixed(2)}</td>
                </tr>
              )})}
              {groupedData.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>Ningún dato coincide con los filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
