'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Filter, Download } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function SalesReportClient({ sales }: { sales: any[] }) {
  const [datePreset, setDatePreset] = useState('ALL'); // ALL, TODAY, YESTERDAY, 7DAYS, 30DAYS
  const [groupBy, setGroupBy] = useState('DATE'); // DATE, PRODUCT, CATEGORY, PAYMENT_METHOD, USER

  // Filter by Date using proper boundary logic
  const filteredSales = useMemo(() => {
    if (datePreset === 'ALL') return sales;
    const nowLocal = new Date();
    
    // Construct boundary dates relative to LOCAL time
    const todayStart = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate(), 0, 0, 0);
    const todayEnd = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate(), 23, 59, 59);

    return sales.filter(s => {
      const d = new Date(s.createdAt); // assuming server stores as UTC, new Date() converts to local

      if (datePreset === 'TODAY') {
        return d >= todayStart && d <= todayEnd;
      }
      if (datePreset === 'YESTERDAY') {
        const yStart = new Date(todayStart);
        yStart.setDate(todayStart.getDate() - 1);
        const yEnd = new Date(todayEnd);
        yEnd.setDate(todayEnd.getDate() - 1);
        return d >= yStart && d <= yEnd;
      }
      if (datePreset === '7DAYS') {
        const pStart = new Date(todayStart);
        pStart.setDate(todayStart.getDate() - 7);
        return d >= pStart && d <= todayEnd;
      }
      if (datePreset === '30DAYS') {
        const pStart = new Date(todayStart);
        pStart.setDate(todayStart.getDate() - 30);
        return d >= pStart && d <= todayEnd;
      }
      return true;
    });
  }, [sales, datePreset]);

  // Aggregate Data based on GroupBy
  const groupedData = useMemo(() => {
    const map = new Map<string, { key: string, salesCount: number, revenue: number, cost: number, returnAmount: number }>();

    filteredSales.forEach(sale => {
      const isReturn = sale.status === 'RETURNED'; 
      
      const dateKey = new Date(sale.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
      
      let itemsToProcess = [{ keyPart: '', itemTotal: sale.total, itemCost: sale.items.reduce((acc: number, i: any) => acc + ((i.product?.cost || 0) * i.quantity), 0) }];
      
      if (groupBy === 'DATE') {
        itemsToProcess[0].keyPart = dateKey;
      } else if (groupBy === 'PAYMENT_METHOD') {
        itemsToProcess[0].keyPart = sale.paymentMethod || 'Efectivo';
      } else if (groupBy === 'USER') {
        itemsToProcess[0].keyPart = sale.user?.name || 'Desconocido';
      } else if (groupBy === 'PRODUCT' || groupBy === 'CATEGORY') {
        // Flatten by items
        itemsToProcess = sale.items.map((i: any) => ({
          keyPart: groupBy === 'PRODUCT' ? (i.product?.name || 'Sin Nombre') : (i.product?.category || 'Sin Categoría'),
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', backgroundColor: 'var(--pulpos-card-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Rango de Fechas</label>
          <div style={{ position: 'relative' }}>
            <Calendar size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <select className="input-field" value={datePreset} onChange={e => setDatePreset(e.target.value)} style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'var(--pulpos-bg)', fontSize: '0.9rem' }}>
              <option value="ALL">Histórico Completo</option>
              <option value="TODAY">Hoy</option>
              <option value="YESTERDAY">Ayer</option>
              <option value="7DAYS">Últimos 7 días</option>
              <option value="30DAYS">Últimos 30 días</option>
            </select>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Agrupado Por</label>
          <div style={{ position: 'relative' }}>
            <Filter size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <select className="input-field" value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'var(--pulpos-bg)', fontSize: '0.9rem' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.2rem', borderLeft: '4px solid #94a3b8' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.25rem' }}>VENTAS BRUTAS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>${globalRevenue.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
        <div className="card" style={{ padding: '1.2rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.25rem' }}>REEMBOLSOS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>${globalReturns.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
        <div className="card" style={{ padding: '1.2rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.25rem' }}>VENTA NETA</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>${netRevenue.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
        <div className="card" style={{ padding: '1.2rem', borderLeft: '4px solid var(--pulpos-primary)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginBottom: '0.25rem' }}>UTILIDAD BRUTA (MARGEN)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>${grossProfit.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
          <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.1rem', fontWeight: 'bold' }}>{marginStr}</div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', height: '400px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          {groupBy === 'DATE' ? 'Tendencia de Ventas' : `Distribución por ${
            groupBy === 'PRODUCT' ? 'Producto' : 
            groupBy === 'CATEGORY' ? 'Categoría' : 
            groupBy === 'PAYMENT_METHOD' ? 'Método' : 'Operador'
          }`}
        </h3>
        
        <ResponsiveContainer width="100%" height="100%">
          {groupBy === 'DATE' ? (
             <BarChart data={groupedData.slice().reverse()}>
               <XAxis dataKey="key" stroke="#94a3b8" fontSize={11} tickMargin={8} />
               <YAxis stroke="#94a3b8" fontSize={11} />
               <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
               <Bar dataKey="revenue" name="Ingresos" fill="var(--pulpos-primary)" radius={[4, 4, 0, 0]} />
             </BarChart>
          ) : (
             <PieChart>
               <Pie 
                 data={groupedData.slice(0, 15)} 
                 dataKey="revenue" 
                 nameKey="key" 
                 cx="50%" 
                 cy="50%" 
                 outerRadius={100} 
                 fill="#8884d8" 
                 label={(e: any) => `${String(e.name || e.key)}`}
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
           <h3 style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>Desglose Analítico</h3>
           <button className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px', background: 'var(--pulpos-bg)', cursor: 'pointer' }}>
             <Download size={14} style={{ display: 'inline', marginRight: '0.4rem' }} /> Exportar CSV
           </button>
        </div>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px', fontSize: '0.85rem' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Agrupación ({groupBy})</th>
                <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Transacciones</th>
                <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Ingreso Neto</th>
                <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Costo</th>
                <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Utilidad Bruta</th>
              </tr>
            </thead>
            <tbody>
              {groupedData.map((d, i) => {
                const profit = d.revenue - d.cost;
                const localMarginText = d.revenue > 0 ? ((profit / d.revenue) * 100).toFixed(1) + '%' : '0%';
                
                return (
                <tr key={i} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td style={{ padding: '0.8rem 1rem', fontWeight: '500' }}>{d.key}</td>
                  <td style={{ padding: '0.8rem 1rem', color: '#64748b' }}>{d.salesCount}</td>
                  <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: '#10b981' }}>${d.revenue.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td style={{ padding: '0.8rem 1rem', color: '#ef4444' }}>${d.cost.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>
                    ${profit.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    <small style={{ color: 'var(--pulpos-text-muted)', marginLeft: '6px', fontWeight: 'normal' }}>({localMarginText})</small>
                  </td>
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
