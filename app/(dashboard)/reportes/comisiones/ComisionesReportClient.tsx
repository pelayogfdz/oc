'use client';

import { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Award, 
  Users, 
  Printer, 
  ArrowDownToLine, 
  TrendingUp,
  X,
  FileText,
  UserCheck
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import ReportFilterBar, { ReportFilterState } from '@/components/ui/ReportFilterBar';
import { getCustomCommissionsReport } from '@/app/actions/commissions';
import Link from 'next/link';

export default function ComisionesReportClient({ 
  initialData, 
  initialBranchId,
  availableFilters
}: { 
  initialData: any[], 
  initialBranchId: string,
  availableFilters: any 
}) {
  const [data, setData] = useState<any[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Keep track of current filters
  const [currentFilters, setCurrentFilters] = useState<any>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Approx 30 days ago
    endDate: new Date(),
    branchId: initialBranchId,
    userId: 'ALL'
  });

  const handleFilterChange = async (filters: ReportFilterState) => {
    setLoading(true);
    try {
      setCurrentFilters({
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
        branchId: filters.branchId,
        userId: filters.userId
      });

      const newData = await getCustomCommissionsReport(
        filters.dateRange.startDate,
        filters.dateRange.endDate,
        filters.branchId,
        filters.userId
      );
      setData(newData);
      
      // Update selected user detail if still in results, otherwise clear
      if (selectedUser) {
        const updatedUser = newData.find(u => u.id === selectedUser.id);
        setSelectedUser(updatedUser || null);
      }
    } catch (e) {
      console.error("Error updating commissions report:", e);
    } finally {
      setLoading(false);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalSales = data.reduce((acc, u) => acc + u.personalSales, 0);
    const totalCommissions = data.reduce((acc, u) => acc + u.commissionsEarned, 0);
    const totalBonuses = data.reduce((acc, u) => acc + u.bonusEarned + u.teamBonusEarned, 0);
    const activeSellersCount = data.filter(u => u.personalSales > 0).length;

    return {
      totalSales,
      totalCommissions,
      totalBonuses,
      activeSellersCount
    };
  }, [data]);

  // Export CSV function
  const downloadCSV = () => {
    const headers = [
      "Vendedor", 
      "Puesto", 
      "Venta Personal", 
      "Venta Equipo", 
      "Comisión %", 
      "Comisión Generada", 
      "Bono Individual", 
      "Bono Equipo", 
      "Total a Liquidar"
    ];
    const rows = data.map(u => [
      u.name,
      u.role,
      u.personalSales.toFixed(2),
      u.teamSales.toFixed(2),
      u.commissionPct,
      u.commissionsEarned.toFixed(2),
      u.bonusEarned.toFixed(2),
      u.teamBonusEarned.toFixed(2),
      u.totalEarned.toFixed(2)
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Comisiones_Vendedores.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>💰 Reporte de Comisiones por Vendedor</h1>
          <p style={{ color: 'var(--caanma-text-muted)' }}>
            Visualiza y audita las ventas base, porcentajes de comisión y bonos asignados al personal.
          </p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => window.print()}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              backgroundColor: '#6d28d9', 
              color: 'white', 
              border: 'none', 
              padding: '0.65rem 1.25rem', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              transition: 'background-color 0.2s' 
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#5b21b6'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#6d28d9'}
          >
            <Printer size={18} /> Imprimir / PDF
          </button>
          <button 
            onClick={downloadCSV}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              backgroundColor: '#0f172a', 
              color: 'white', 
              border: 'none', 
              padding: '0.65rem 1.25rem', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              transition: 'background-color 0.2s' 
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#1e293b'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#0f172a'}
          >
            <ArrowDownToLine size={18} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="no-print">
        <ReportFilterBar 
          onFilterChange={handleFilterChange} 
          disabled={loading} 
          showUser={true}
          showBrand={false}
          initialBranchId={initialBranchId}
        />
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--caanma-primary)', fontWeight: 'bold' }}>
          <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid var(--caanma-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
          Calculando comisiones...
        </div>
      )}

      {/* Content Layout */}
      <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <TrendingUp size={16} color="#16a34a" /> Venta Personal Acumulada
            </span>
            <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#16a34a' }}>{formatCurrency(metrics.totalSales)}</span>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <DollarSign size={16} color="var(--caanma-primary)" /> Comisiones Generadas
            </span>
            <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--caanma-primary)' }}>{formatCurrency(metrics.totalCommissions)}</span>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Award size={16} color="#f59e0b" /> Bonos Asignados
            </span>
            <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#d97706' }}>{formatCurrency(metrics.totalBonuses)}</span>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Users size={16} color="#8b5cf6" /> Vendedores con Venta
            </span>
            <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#7c3aed' }}>
              {metrics.activeSellersCount} <span style={{ fontSize: '1rem', color: 'var(--caanma-text-muted)', fontWeight: 'normal' }}>de {data.length}</span>
            </span>
          </div>
        </div>

        {/* Sellers Grid / Detail Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedUser ? '1fr 400px' : '1fr', gap: '2rem', alignItems: 'start', transition: 'all 0.3s' }}>
          
          {/* Main Table */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Resumen de Liquidación</h2>
            
            <div style={{ overflowX: 'auto' }}>
              <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--caanma-border)', color: 'var(--caanma-text-muted)', fontSize: '0.9rem' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Vendedor</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Puesto</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Venta Personal</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Venta Equipo</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>% Comisión</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Comisiones</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Bonos</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>Total</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }} className="no-print">Auditar</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((u) => {
                    const isSelected = selectedUser?.id === u.id;
                    return (
                      <tr 
                        key={u.id} 
                        onClick={() => setSelectedUser(u)}
                        style={{ 
                          borderBottom: '1px solid var(--caanma-border)', 
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#f8fafc' : 'transparent',
                          transition: 'background-color 0.2s'
                        }}
                        className="hover-row"
                      >
                        <td data-label="Vendedor" style={{ padding: '1rem 0.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ 
                            width: '28px', 
                            height: '28px', 
                            borderRadius: '50%', 
                            backgroundColor: '#e2e8f0', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            color: '#475569',
                            fontWeight: 'bold'
                          }}>
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          {u.name}
                        </td>
                        <td data-label="Puesto" style={{ padding: '1rem 0.5rem' }}>
                          <span style={{ 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '6px', 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold',
                            backgroundColor: u.role === 'COORDINADOR' ? '#e0e7ff' : (u.role === 'LIDER' ? '#d1fae5' : '#fef3c7'),
                            color: u.role === 'COORDINADOR' ? '#4338ca' : (u.role === 'LIDER' ? '#065f46' : '#92400e')
                          }}>
                            {u.role}
                          </span>
                        </td>
                        <td data-label="Venta Personal" style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>{formatCurrency(u.personalSales)}</td>
                        <td data-label="Venta Equipo" style={{ padding: '1rem 0.5rem', textAlign: 'right', color: 'var(--caanma-text-muted)' }}>{u.teamSales > 0 ? formatCurrency(u.teamSales) : '-'}</td>
                        <td data-label="% Comisión" style={{ padding: '1rem 0.5rem', textAlign: 'center', fontWeight: '500' }}>{u.commissionPct}%</td>
                        <td data-label="Comisiones" style={{ padding: '1rem 0.5rem', textAlign: 'right', color: 'var(--caanma-primary)', fontWeight: '500' }}>{formatCurrency(u.commissionsEarned)}</td>
                        <td data-label="Bonos" style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#16a34a' }}>{formatCurrency(u.bonusEarned + u.teamBonusEarned)}</td>
                        <td data-label="Total" style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: u.totalEarned > 0 ? '#15803d' : '#64748b' }}>{formatCurrency(u.totalEarned)}</td>
                        <td data-label="Auditar" style={{ padding: '1rem 0.5rem', textAlign: 'center' }} className="no-print">
                          <button 
                            style={{ 
                              padding: '0.35rem 0.75rem', 
                              backgroundColor: isSelected ? 'var(--caanma-primary)' : '#f1f5f9',
                              color: isSelected ? 'white' : 'var(--caanma-primary)',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            Ventas
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {data.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                        No hay vendedores registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar Audit Detail */}
          {selectedUser && (
            <div style={{ 
              backgroundColor: 'white', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              border: '1px solid var(--caanma-border)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '700px',
              overflowY: 'auto'
            }} className="no-print">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontWeight: 'bold', fontSize: '1.05rem', margin: 0 }}>Ventas de {selectedUser.name}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--caanma-text-muted)' }}>Detalle de comisiones generadas</span>
                </div>
                <button 
                  onClick={() => setSelectedUser(null)}
                  style={{ border: 'none', backgroundColor: 'transparent', color: '#64748b', cursor: 'pointer', padding: '0.25rem' }}
                >
                  <X size={18} />
                </button>
              </div>

              {selectedUser.salesList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--caanma-text-muted)' }}>
                  <UserCheck size={32} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
                  Este vendedor no registró ventas en el rango de fechas seleccionado.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedUser.salesList.map((sale: any) => (
                    <div 
                      key={sale.id} 
                      style={{ 
                        border: '1px solid var(--caanma-border)', 
                        borderRadius: '8px', 
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        fontSize: '0.9rem',
                        transition: 'border-color 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--caanma-primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--caanma-border)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Link href={`/ventas/detalle/${sale.id}`} style={{ fontWeight: 'bold', color: 'var(--caanma-primary)', textDecoration: 'none', fontFamily: 'monospace' }}>
                          Ticket #{sale.id.split('-')[0].toUpperCase()}
                        </Link>
                        <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)' }}>
                          {formatDate(sale.date)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--caanma-text)' }}>
                        <span>Cliente: {sale.customer}</span>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.1rem 0.4rem', 
                          borderRadius: '9999px',
                          backgroundColor: sale.method === 'CASH' ? '#dcfce7' : '#e0f2fe',
                          color: sale.method === 'CASH' ? '#16a34a' : '#0284c7',
                          fontWeight: 'bold'
                        }}>
                          {sale.method}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--caanma-text-muted)', borderTop: '1px dashed var(--caanma-border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                        <span>Monto: <strong>{formatCurrency(sale.total)}</strong></span>
                        <span>Comisión ({sale.commissionPct}%): <strong style={{ color: '#16a34a' }}>{formatCurrency(sale.commissionEarned)}</strong></span>
                      </div>

                      {sale.invoiceId && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            padding: '0.1rem 0.4rem', 
                            borderRadius: '4px', 
                            backgroundColor: '#eff6ff', 
                            color: '#2563eb', 
                            border: '1px solid #bfdbfe',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}>
                            <FileText size={10} /> Facturado
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hover-row:hover {
          background-color: #f8fafc !important;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
          }
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
