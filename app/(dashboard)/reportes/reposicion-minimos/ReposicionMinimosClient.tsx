'use client';

import React, { useState, useMemo } from 'react';
import { Search, MapPin, Download, Printer, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel } from '@/lib/exportExcel';

export default function ReposicionMinimosClient({
  branches,
  products
}: {
  branches: { id: string; name: string }[];
  products: {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    stock: number;
    minStock: number;
    cost: number;
    branch: { id: string; name: string };
    supplier: { id: string; name: string } | null;
  }[];
}) {
  const [search, setSearch] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('ALL');

  // Filter products based on search and branch selection
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Branch filter
      if (selectedBranchId !== 'ALL' && p.branch.id !== selectedBranchId) {
        return false;
      }

      // Search filter
      if (search.trim()) {
        const term = search.toLowerCase();
        const matchesSku = p.sku.toLowerCase().includes(term);
        const matchesName = p.name.toLowerCase().includes(term);
        const matchesDesc = p.description ? p.description.toLowerCase().includes(term) : false;
        const matchesSupplier = p.supplier ? p.supplier.name.toLowerCase().includes(term) : false;
        if (!matchesSku && !matchesName && !matchesDesc && !matchesSupplier) {
          return false;
        }
      }

      return true;
    });
  }, [products, search, selectedBranchId]);

  // Compute KPI metrics
  const kpis = useMemo(() => {
    let missingUnits = 0;
    let totalInvestment = 0;

    filteredProducts.forEach((p) => {
      const diff = Math.max(0, p.minStock - p.stock);
      missingUnits += diff;
      totalInvestment += diff * p.cost;
    });

    return {
      criticalCount: filteredProducts.length,
      missingUnits,
      totalInvestment
    };
  }, [filteredProducts]);

  const handleExport = () => {
    const headers = [
      'Código (SKU)',
      'Descripción',
      'Sucursal',
      'Stock Actual',
      'Stock Mínimo',
      'Cantidad a Reponer',
      'Costo Unitario',
      'Inversión Estimada',
      'Proveedor'
    ];

    const rows = filteredProducts.map((p) => {
      const diff = Math.max(0, p.minStock - p.stock);
      return [
        p.sku,
        p.name,
        p.branch.name,
        p.stock.toString(),
        p.minStock.toString(),
        diff.toString(),
        p.cost.toFixed(2),
        (diff * p.cost).toFixed(2),
        p.supplier ? p.supplier.name : '-'
      ];
    });

    exportToExcel(headers, rows, 'Reposicion_de_Minimos');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* KPI Section */}
      <div className="kpis-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#fee2e2', padding: '0.75rem', borderRadius: '10px', color: '#dc2626' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', marginBottom: '0.25rem', fontWeight: 'bold' }}>Artículos Críticos</h3>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#dc2626' }}>{kpis.criticalCount}</div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#eff6ff', padding: '0.75rem', borderRadius: '10px', color: '#2563eb' }}>
            <AlertTriangle size={24} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', marginBottom: '0.25rem', fontWeight: 'bold' }}>Unidades Faltantes</h3>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--caanma-text)' }}>{kpis.missingUnits}</div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '10px', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold' }}>$</span>
          </div>
          <div>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', marginBottom: '0.25rem', fontWeight: 'bold' }}>Inversión Requerida</h3>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#16a34a' }}>{formatCurrency(kpis.totalInvestment)}</div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="card no-print" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ position: 'relative', flex: 2, minWidth: '280px' }}>
          <Search size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar por SKU, descripción, proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
          />
        </div>

        <div style={{ flex: 1, minWidth: '180px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={16} style={{ color: '#64748b' }} />
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '0.9rem', cursor: 'pointer' }}
          >
            <option value="ALL">Todas las sucursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
          <button
            onClick={handlePrint}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.65rem 1rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', border: '1px solid var(--caanma-border)', backgroundColor: 'white', color: '#334155' }}
          >
            <Printer size={16} /> Imprimir
          </button>
          <button
            onClick={handleExport}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.65rem 1rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', border: '1px solid var(--caanma-border)', backgroundColor: 'white', color: '#334155' }}
          >
            <Download size={16} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#475569' }}>SKU</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#475569' }}>Descripción</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#475569' }}>Sucursal</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#475569', textAlign: 'center' }}>Stock</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#475569', textAlign: 'center' }}>Mínimo</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#475569', textAlign: 'center' }}>Faltante</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#475569', textAlign: 'right' }}>Costo U.</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#475569', textAlign: 'right' }}>Inversión</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#475569' }}>Proveedor</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontWeight: '500' }}>
                  Todos los artículos están al corriente con su stock mínimo.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p, idx) => {
                const diff = Math.max(0, p.minStock - p.stock);
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 'bold', color: '#334155' }}>{p.sku}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#334155' }}>
                      <div style={{ fontWeight: '600' }}>{p.name}</div>
                      {p.description && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.description}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#334155' }}>{p.branch.name}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold', color: '#dc2626', backgroundColor: '#fef2f2' }}>
                      {p.stock}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.9rem', color: '#475569' }}>{p.minStock}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold', color: '#b91c1c' }}>
                      {diff}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.9rem', color: '#475569' }}>{formatCurrency(p.cost)}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: 'bold', color: '#16a34a' }}>{formatCurrency(diff * p.cost)}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#475569' }}>{p.supplier ? p.supplier.name : '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredProducts.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1', fontWeight: 'bold' }}>
                <td colSpan={3} style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#334155' }}>
                  Total ({filteredProducts.length} artículos)
                </td>
                <td style={{ padding: '0.75rem 1rem' }}></td>
                <td style={{ padding: '0.75rem 1rem' }}></td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.95rem', color: '#b91c1c' }}>
                  {kpis.missingUnits}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}></td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.95rem', color: '#16a34a' }}>
                  {formatCurrency(kpis.totalInvestment)}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print {
            display: none !important;
          }
          .kpis-grid {
            display: none !important;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          table {
            border: 1px solid #cbd5e1 !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #e2e8f0 !important;
          }
        }
      `}} />
    </div>
  );
}
