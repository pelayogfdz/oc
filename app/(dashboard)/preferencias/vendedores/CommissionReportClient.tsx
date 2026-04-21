'use client';

import { useState, useEffect } from 'react';
import { getCommissionReport } from '@/app/actions/commissions';
import { Calendar, Download, RefreshCw, DollarSign, Award, Target, Users } from 'lucide-react';

export default function CommissionReportClient({ initialUsers }: { initialUsers: any[] }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await getCommissionReport(month, year);
      setReportData(data);
    } catch (e: any) {
      alert("Error generating report: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [month, year]);

  const months = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const grandTotal = reportData.reduce((acc, r) => acc + r.totalEarned, 0);

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, marginBottom: '0.5rem', color: 'var(--pulpos-primary)' }}>
              <Calendar color="var(--pulpos-primary)" /> Liquidación Mensual de Comisiones
            </h2>
            <p style={{ color: 'var(--pulpos-text-muted)', margin: 0 }}>
              Calcula y visualiza el pago de comisiones y bonos del periodo seleccionado.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', border: '1px solid var(--pulpos-border)', borderRadius: '8px', overflow: 'hidden' }}>
              <select 
                value={month} 
                onChange={(e) => setMonth(parseInt(e.target.value))}
                style={{ padding: '0.5rem 1rem', border: 'none', borderRight: '1px solid var(--pulpos-border)', outline: 'none', backgroundColor: '#f8fafc', fontWeight: 'bold' }}
              >
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <input 
                type="number" 
                value={year} 
                onChange={(e) => setYear(parseInt(e.target.value))}
                style={{ width: '80px', padding: '0.5rem', border: 'none', outline: 'none', backgroundColor: '#f8fafc', fontWeight: 'bold', textAlign: 'center' }}
              />
            </div>
            
            <button onClick={fetchReport} disabled={loading} className="btn-secondary" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw size={18} className={loading ? "spin" : ""} />
            </button>
            
            {/* Opcional para el futuro: Print/Export */}
            <button className="btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Download size={18} /> Exportar
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
          <div style={{ color: '#166534', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><DollarSign size={16}/> Comisiones a Pagar</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#15803d' }}>{formatCurrency(grandTotal)}</div>
        </div>
        <div style={{ padding: '1.5rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
          <div style={{ color: '#1e40af', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Target size={16}/> Total Ventas Generadas (Base)</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1d4ed8' }}>
            {formatCurrency(reportData.reduce((acc, r) => r.role === 'VENDEDOR' || r.role === 'LIDER' ? acc + r.personalSales : acc, 0))}
          </div>
        </div>
        <div style={{ padding: '1.5rem', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px' }}>
          <div style={{ color: '#92400e', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Users size={16}/> Empleados en Plantilla</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#b45309' }}>{reportData.length}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.85rem' }}>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Empleado</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Puesto</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Venta Base Computable</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', color: '#0369a1' }}>Comisión %</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', color: '#16a34a' }}>Bonos (Ind / Eq)</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)', textAlign: 'right', fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>Total a Liquidar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    <RefreshCw className="spin" size={24} style={{ margin: '0 auto', marginBottom: '1rem' }} />
                    Calculando cifras...
                  </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    No hay empleados registrados en este periodo.
                  </td>
                </tr>
              ) : (
                reportData.sort((a,b) => b.totalEarned - a.totalEarned).map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ 
                        width: '10px', height: '10px', borderRadius: '50%', 
                        backgroundColor: row.role === 'COORDINADOR' ? '#4f46e5' : (row.role === 'LIDER' ? '#10b981' : '#f59e0b') 
                      }}></div>
                      {row.name}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b' }}>{row.role}</td>
                    
                    <td style={{ padding: '1rem' }}>
                      {/* Venta Base */}
                      <span style={{ fontWeight: 'bold' }}>{formatCurrency(row.totalSalesBase)}</span>
                      {row.monthlyGoal > 0 && (
                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: row.totalSalesBase >= row.monthlyGoal ? '#16a34a' : '#ef4444' }}>
                          Meta: {formatCurrency(row.monthlyGoal)} 
                          {row.totalSalesBase >= row.monthlyGoal ? ' (Alcanzada)' : ' (Falta)'}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '1rem', color: '#0369a1', fontWeight: 'bold' }}>
                      <div>{formatCurrency(row.commissionsEarned)}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>({row.commissionPct}%)</div>
                    </td>

                    <td style={{ padding: '1rem', color: '#16a34a', fontWeight: 'bold' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <span>{formatCurrency(row.bonusEarned + row.teamBonusEarned)}</span>
                         {row.unlockedBonus && <Award size={14} color="#eab308" />}
                      </div>
                      {(row.bonusEarned > 0 || row.teamBonusEarned > 0) && (
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'normal', marginTop: '0.2rem' }}>
                          {row.bonusEarned > 0 && `Ind: ${formatCurrency(row.bonusEarned)} `}
                          {row.teamBonusEarned > 0 && `Eq: ${formatCurrency(row.teamBonusEarned)}`}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', backgroundColor: '#f8fafc', color: row.totalEarned > 0 ? '#15803d' : '#64748b' }}>
                      {formatCurrency(row.totalEarned)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
