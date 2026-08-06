'use client';

import React, { useState, useMemo } from 'react';
import { Search, Save, X, Download, Loader2 } from 'lucide-react';
import { exportToExcel } from '@/lib/exportExcel';
import { updateProductMinStocks } from '@/app/actions/minimos';

export default function MinimosMatrixClient({
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
    branchId: string;
  }[];
}) {
  const [search, setSearch] = useState('');
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Group products by SKU
  const matrixRows = useMemo(() => {
    const rowsMap: Record<string, {
      sku: string;
      name: string;
      description: string | null;
      branchData: Record<string, { productId: string; stock: number; minStock: number }>;
    }> = {};

    products.forEach((p) => {
      if (!rowsMap[p.sku]) {
        rowsMap[p.sku] = {
          sku: p.sku,
          name: p.name,
          description: p.description,
          branchData: {}
        };
      }
      rowsMap[p.sku].branchData[p.branchId] = {
        productId: p.id,
        stock: p.stock,
        minStock: p.minStock
      };
    });

    return Object.values(rowsMap);
  }, [products]);

  // Filter rows based on search input
  const filteredRows = useMemo(() => {
    if (!search.trim()) return matrixRows;
    const term = search.toLowerCase();
    return matrixRows.filter(
      (r) =>
        r.sku.toLowerCase().includes(term) ||
        r.name.toLowerCase().includes(term) ||
        (r.description && r.description.toLowerCase().includes(term))
    );
  }, [matrixRows, search]);

  const handleMinChange = (productId: string, val: string) => {
    const minStock = parseInt(val, 10);
    if (isNaN(minStock) || minStock < 0) return;
    setPendingUpdates((prev) => ({
      ...prev,
      [productId]: minStock
    }));
  };

  const handleCancel = () => {
    setPendingUpdates({});
  };

  const handleSave = async () => {
    const updatesArray = Object.entries(pendingUpdates).map(([productId, minStock]) => ({
      productId,
      minStock
    }));

    if (updatesArray.length === 0) return;

    setIsSaving(true);
    try {
      const res = await updateProductMinStocks(updatesArray);
      if (res.success) {
        alert('Mínimos guardados correctamente.');
        setPendingUpdates({});
      } else {
        alert('Error al guardar: ' + res.error);
      }
    } catch (e: any) {
      alert('Excepción: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const headers = ['Código (SKU)', 'Descripción'];
    branches.forEach((b) => {
      headers.push(`${b.name} - Stock`);
      headers.push(`${b.name} - Mínimo`);
    });

    const rows = filteredRows.map((r) => {
      const rowData = [r.sku, r.name];
      branches.forEach((b) => {
        const data = r.branchData[b.id];
        const stock = data ? data.stock : 0;
        const currentMin = data ? data.minStock : 0;
        const pendingMin = data && pendingUpdates[data.productId] !== undefined ? pendingUpdates[data.productId] : currentMin;
        rowData.push(stock.toString());
        rowData.push(pendingMin.toString());
      });
      return rowData;
    });

    exportToExcel(headers, rows, 'Matriz_Minimos_Stock');
  };

  const pendingCount = Object.keys(pendingUpdates).length;

  return (
    <div className="card" style={{ padding: '1.5rem', overflow: 'visible' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar por código (SKU), descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleExport}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid var(--caanma-border)', backgroundColor: 'white', color: '#334155' }}
          >
            <Download size={18} /> Exportar Excel
          </button>
        </div>
      </div>

      {pendingCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <span style={{ color: '#166534', fontWeight: '600' }}>
            Tienes {pendingCount} cambio(s) pendiente(s) de guardar.
          </span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: 'white', color: '#475569', cursor: 'pointer', fontWeight: '600' }}
            >
              <X size={16} /> Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', backgroundColor: '#16a34a', color: 'white', cursor: 'pointer', fontWeight: '600' }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save size={16} /> Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#475569', width: '150px' }}>Código (SKU)</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#475569', minWidth: '220px' }}>Descripción</th>
              {branches.map((b) => (
                <th key={b.id} colSpan={2} style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', color: '#475569', borderLeft: '1px solid #e2e8f0', textAlign: 'center' }}>
                  {b.name}
                </th>
              ))}
            </tr>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '0.4rem 1rem' }}></th>
              <th style={{ padding: '0.4rem 1rem' }}></th>
              {branches.map((b) => (
                <React.Fragment key={`sub-${b.id}`}>
                  <th style={{ padding: '0.4rem 0.5rem', fontWeight: '600', fontSize: '0.82rem', color: '#64748b', borderLeft: '1px solid #e2e8f0', textAlign: 'center', width: '80px' }}>
                    Stock
                  </th>
                  <th style={{ padding: '0.4rem 0.5rem', fontWeight: '600', fontSize: '0.82rem', color: '#64748b', textAlign: 'center', width: '100px' }}>
                    Mínimo
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={2 + branches.length * 2} style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontWeight: '500' }}>
                  No se encontraron productos en el catálogo.
                </td>
              </tr>
            ) : (
              filteredRows.map((r, idx) => (
                <tr key={r.sku} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', fontFamily: 'monospace', color: '#334155' }}>{r.sku}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#334155' }}>
                    <div style={{ fontWeight: '600' }}>{r.name}</div>
                    {r.description && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{r.description}</div>}
                  </td>
                  {branches.map((b) => {
                    const data = r.branchData[b.id];
                    if (!data) {
                      return (
                        <React.Fragment key={`no-cell-${b.id}`}>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#94a3b8', borderLeft: '1px solid #e2e8f0', backgroundColor: '#fafafa' }}>-</td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#fafafa' }}>-</td>
                        </React.Fragment>
                      );
                    }
                    const isDirty = pendingUpdates[data.productId] !== undefined;
                    const displayMin = isDirty ? pendingUpdates[data.productId] : data.minStock;

                    return (
                      <React.Fragment key={`cell-${b.id}`}>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: '500', color: data.stock <= displayMin ? '#dc2626' : '#334155', borderLeft: '1px solid #e2e8f0', backgroundColor: data.stock <= displayMin ? '#fef2f2' : 'transparent' }}>
                          {data.stock}
                        </td>
                        <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            value={displayMin}
                            onChange={(e) => handleMinChange(data.productId, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.35rem 0.5rem',
                              borderRadius: '4px',
                              border: isDirty ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                              textAlign: 'center',
                              fontSize: '0.88rem',
                              fontWeight: isDirty ? 'bold' : 'normal',
                              color: isDirty ? '#166534' : '#334155',
                              backgroundColor: isDirty ? '#f0fdf4' : 'white',
                              outline: 'none'
                            }}
                          />
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
