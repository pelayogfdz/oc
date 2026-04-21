'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Search, PackageOpen, TrendingDown, DollarSign } from 'lucide-react';

export default function InventarioValorizadoClient({ data }: { data: any }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInventory = data.inventory.filter((i: any) => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Reporte de Inventario Valorizado</h1>
        <p style={{ color: 'var(--pulpos-text-muted)' }}>Conoce qué productos amarran tu capital y cuál es tu ganancia potencial.</p>
      </div>

      {/* KPI Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#fee2e2', borderRadius: '8px' }}><PackageOpen size={20} color="#ef4444" /></div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Capital Detenido (Costo)</h3>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#ef4444' }}>{formatCurrency(data.totalValue)}</div>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#dcfce7', borderRadius: '8px' }}><DollarSign size={20} color="#16a34a" /></div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Valor de Venta Comercial</h3>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#16a34a' }}>{formatCurrency(data.totalSellValue)}</div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#e0f2fe', borderRadius: '8px' }}><TrendingDown size={20} color="#0284c7" /></div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}>Ganancia Potencial (Al liquidar)</h3>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#0284c7' }}>{formatCurrency(data.potentialProfit)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Tabla Analítica */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Listado de Stock y Márgenes</h2>
            
            <div style={{ position: 'relative', width: '250px' }}>
              <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--pulpos-text-muted)' }} size={16} />
              <input 
                type="text" 
                placeholder="Buscar por SKU o Nombre..." 
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
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white' }}>
                <tr style={{ borderBottom: '2px solid var(--pulpos-border)', color: 'var(--pulpos-text-muted)', fontSize: '0.9rem' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>SKU</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Producto</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Stock</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Costo U.</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Capital Det.</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Margen %</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((i: any) => (
                  <tr key={i.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                    <td style={{ padding: '1rem 0.5rem', fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', fontFamily: 'monospace' }}>{i.sku}</td>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>{i.name}</td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '9999px', 
                        fontSize: '0.8rem', 
                        fontWeight: 'bold',
                        backgroundColor: i.stock < 5 ? '#fee2e2' : '#f1f5f9',
                        color: i.stock < 5 ? '#ef4444' : 'inherit'
                      }}>
                        {i.stock}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: 'var(--pulpos-text-muted)' }}>{formatCurrency(i.cost)}</td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(i.costValue)}</td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                      <span style={{ color: i.margin < 15 ? '#ef4444' : i.margin > 40 ? '#16a34a' : '#f59e0b', fontWeight: 'bold' }}>
                        {i.margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráficas Laterales */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--pulpos-border)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Top 10 Capital Detenido</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', marginBottom: '1.5rem' }}>
            Los productos que tienen más dinero tuyo amarrado en el almacén.
          </p>
          
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data.capitalLocked} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{fontSize: 10}} />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="costValue" fill="#ef4444" radius={[0, 4, 4, 0]} name="Capital Amarrado" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
