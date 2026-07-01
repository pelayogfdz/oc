'use client';

import React, { useState, useMemo } from 'react';
import { 
  Clock, CheckCircle2, AlertCircle, Calendar, 
  Search, ArrowLeft, Printer, Download, ChevronDown, ChevronUp, UserCheck 
} from 'lucide-react';
import { getCollaboratorTaskReport } from '@/app/actions/task';
import Link from 'next/link';
import { exportToExcel } from '@/lib/exportExcel';

type CollaboratorReport = {
  collaborator: {
    id: string;
    name: string;
    email: string | null;
  };
  stats: {
    total: number;
    completedOnTime: number;
    completedLate: number;
    uncompleted: number;
    pending: number;
    completionRate: number;
    onTimeRate: number;
  };
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
    completedAt: string | null;
  }>;
};

export default function TareasReportClient({
  initialReport,
  initialStartDate,
  initialEndDate
}: {
  initialReport: CollaboratorReport[];
  initialStartDate: string;
  initialEndDate: string;
}) {
  const [reportData, setReportData] = useState<CollaboratorReport[]>(initialReport);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedCollabId, setExpandedCollabId] = useState<string | null>(null);

  const handleFilter = async () => {
    setLoading(true);
    try {
      const res = await getCollaboratorTaskReport({ startDate, endDate });
      if (res.success && res.report) {
        setReportData(res.report as any);
      }
    } catch (err: any) {
      alert(err.message || 'Error al filtrar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const filteredReport = useMemo(() => {
    return reportData.filter(row => 
      row.collaborator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.collaborator.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reportData, searchTerm]);

  // Global metrics
  const totals = useMemo(() => {
    let total = 0;
    let completedOnTime = 0;
    let completedLate = 0;
    let uncompleted = 0;
    let pending = 0;

    reportData.forEach(row => {
      total += row.stats.total;
      completedOnTime += row.stats.completedOnTime;
      completedLate += row.stats.completedLate;
      uncompleted += row.stats.uncompleted;
      pending += row.stats.pending;
    });

    const completedTotal = completedOnTime + completedLate;
    const completionRate = total > 0 ? (completedTotal / total) * 100 : 0;
    const onTimeRate = completedTotal > 0 ? (completedOnTime / completedTotal) * 100 : 0;

    return {
      total,
      completedOnTime,
      completedLate,
      uncompleted,
      pending,
      completionRate: parseFloat(completionRate.toFixed(1)),
      onTimeRate: parseFloat(onTimeRate.toFixed(1))
    };
  }, [reportData]);

  const toggleExpand = (collabId: string) => {
    setExpandedCollabId(expandedCollabId === collabId ? null : collabId);
  };

  const downloadExcel = () => {
    const headers = [
      "Colaborador",
      "Correo",
      "Total Asignadas",
      "Completadas a Tiempo",
      "Completadas Tarde",
      "No Realizadas (Vencidas)",
      "Pendientes",
      "Tasa de Cumplimiento %",
      "Tasa a Tiempo %"
    ];

    const rows = reportData.map(row => [
      row.collaborator.name,
      row.collaborator.email || 'N/A',
      row.stats.total,
      row.stats.completedOnTime,
      row.stats.completedLate,
      row.stats.uncompleted,
      row.stats.pending,
      row.stats.completionRate,
      row.stats.onTimeRate
    ]);

    exportToExcel(headers, rows, `Reporte_Tareas_Colaboradores_${startDate}_a_${endDate}`);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link 
            href="/reportes" 
            className="no-print"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              color: 'var(--caanma-primary)', 
              fontSize: '0.85rem', 
              fontWeight: 'bold', 
              textDecoration: 'none',
              marginBottom: '0.75rem' 
            }}
          >
            <ArrowLeft size={16} /> Volver a Reportes
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0, color: 'var(--caanma-text)' }}>
            📋 Reporte de Rendimiento de Tareas
          </h1>
          <p style={{ color: 'var(--caanma-text-muted)', margin: '0.25rem 0 0 0' }}>
            Estadísticas detalladas de tareas a tiempo, entregas tardías y tareas vencidas por colaborador.
          </p>
        </div>
        
        <div className="no-print" style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={downloadExcel}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              backgroundColor: 'white', 
              color: 'var(--caanma-text)', 
              border: '1px solid var(--caanma-border)', 
              padding: '0.6rem 1.2rem', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            <Download size={16} /> Exportar Excel
          </button>
          <button 
            onClick={() => window.print()}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              backgroundColor: 'var(--caanma-primary)', 
              color: 'white', 
              border: 'none', 
              padding: '0.6rem 1.2rem', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="no-print" style={{ 
        backgroundColor: 'white', 
        border: '1px solid var(--caanma-border)', 
        borderRadius: '12px', 
        padding: '1.25rem', 
        marginBottom: '2rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.25rem',
        alignItems: 'flex-end'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '150px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Desde</label>
          <input 
            type="date" 
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={{
              padding: '0.55rem',
              borderRadius: '8px',
              border: '1px solid var(--caanma-border)',
              outline: 'none',
              fontSize: '0.875rem',
              color: 'var(--caanma-text)'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '150px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Hasta</label>
          <input 
            type="date" 
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            style={{
              padding: '0.55rem',
              borderRadius: '8px',
              border: '1px solid var(--caanma-border)',
              outline: 'none',
              fontSize: '0.875rem',
              color: 'var(--caanma-text)'
            }}
          />
        </div>

        <button
          onClick={handleFilter}
          disabled={loading}
          style={{
            backgroundColor: 'var(--caanma-primary)',
            color: 'white',
            border: 'none',
            padding: '0.6rem 1.5rem',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.875rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Filtrando...' : 'Filtrar'}
        </button>

        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Buscar colaborador..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.2rem',
              borderRadius: '8px',
              border: '1px solid var(--caanma-border)',
              fontSize: '0.875rem',
              outline: 'none',
              color: 'var(--caanma-text)'
            }}
          />
        </div>
      </div>

      {/* Global Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.25rem', 
        marginBottom: '2rem' 
      }}>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--caanma-border)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Tareas Asignadas</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--caanma-text)', marginTop: '0.25rem' }}>{totals.total}</div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>En total</span>
        </div>
        
        <div style={{ backgroundColor: '#f0fdf4', padding: '1.25rem', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>A Tiempo</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#15803d', marginTop: '0.25rem' }}>{totals.completedOnTime}</div>
          <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>Completadas en tiempo</span>
        </div>

        <div style={{ backgroundColor: '#eff6ff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase' }}>Con Retraso</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#2563eb', marginTop: '0.25rem' }}>{totals.completedLate}</div>
          <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Completadas tarde</span>
        </div>

        <div style={{ backgroundColor: '#fef2f2', padding: '1.25rem', borderRadius: '12px', border: '1px solid #fca5a5' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#991b1b', textTransform: 'uppercase' }}>No Realizadas</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#dc2626', marginTop: '0.25rem' }}>{totals.uncompleted}</div>
          <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>Vencidas sin completar</span>
        </div>

        <div style={{ backgroundColor: '#fdf2f8', padding: '1.25rem', borderRadius: '12px', border: '1px solid #fbcfe8' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#9d174d', textTransform: 'uppercase' }}>Tasa de Éxito</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#db2777', marginTop: '0.25rem' }}>{totals.completionRate}%</div>
          <span style={{ fontSize: '0.75rem', color: '#ec4899' }}>{totals.onTimeRate}% a tiempo</span>
        </div>
      </div>

      {/* Main Report Table */}
      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid var(--caanma-border)', 
        borderRadius: '12px', 
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--caanma-border)' }}>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#475569' }}>Colaborador</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#475569', textAlign: 'center' }}>Asignadas</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#166534', textAlign: 'center' }}>A Tiempo</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#1e40af', textAlign: 'center' }}>Tarde</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#991b1b', textAlign: 'center' }}>No Realizadas</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#854d0e', textAlign: 'center' }}>Pendientes</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#475569', textAlign: 'center' }}>Cumplimiento %</th>
              <th style={{ padding: '1rem', fontWeight: 'bold', color: '#475569', textAlign: 'center' }}>A Tiempo %</th>
              <th className="no-print" style={{ padding: '1rem', width: '60px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredReport.map(row => {
              const isExpanded = expandedCollabId === row.collaborator.id;
              
              return (
                <React.Fragment key={row.collaborator.id}>
                  <tr 
                    onClick={() => toggleExpand(row.collaborator.id)}
                    style={{ 
                      borderBottom: '1px solid #f1f5f9', 
                      cursor: 'pointer',
                      transition: 'background-color 0.15s' 
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--caanma-text)' }}>{row.collaborator.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)' }}>{row.collaborator.email || 'N/A'}</div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '500' }}>{row.stats.total}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: '#15803d', fontWeight: 'bold' }}>{row.stats.completedOnTime}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: '#2563eb', fontWeight: 'bold' }}>{row.stats.completedLate}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: '#dc2626', fontWeight: 'bold' }}>{row.stats.uncompleted}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: '#ca8a04', fontWeight: 'bold' }}>{row.stats.pending}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: row.stats.completionRate >= 80 ? '#16a34a' : row.stats.completionRate >= 50 ? '#d97706' : '#dc2626' }}>
                          {row.stats.completionRate}%
                        </span>
                        {/* Progress Bar */}
                        <div style={{ width: '60px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginTop: '0.25rem' }}>
                          <div style={{ 
                            width: `${row.stats.completionRate}%`, 
                            height: '100%', 
                            backgroundColor: row.stats.completionRate >= 80 ? '#16a34a' : row.stats.completionRate >= 50 ? '#d97706' : '#dc2626' 
                          }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#64748b' }}>
                      {row.stats.onTimeRate}%
                    </td>
                    <td className="no-print" style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </td>
                  </tr>
                  
                  {/* Collapsible Details */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 1rem 0', fontWeight: 'bold', color: 'var(--caanma-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <UserCheck size={18} color="var(--caanma-primary)" /> Desglose de Tareas de {row.collaborator.name}
                        </h4>
                        
                        {row.tasks.length === 0 ? (
                          <div style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontSize: '0.85rem' }}>
                            Este colaborador no tiene tareas registradas en este período.
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                            {row.tasks.map(task => {
                              const isTaskCompleted = task.status === 'COMPLETED';
                              const isTaskOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isTaskCompleted;
                              const isCompletedOnTime = isTaskCompleted && (!task.dueDate || (task.completedAt && new Date(task.completedAt) <= new Date(task.dueDate)));
                              const isCompletedLate = isTaskCompleted && task.dueDate && task.completedAt && new Date(task.completedAt) > new Date(task.dueDate);
                              const isExpiredTask = !isTaskCompleted && task.dueDate && new Date() > new Date(task.dueDate);

                              let badgeText = 'Pendiente';
                              let badgeColor = '#fef3c7';
                              let badgeTextColor = '#b45309';

                              if (isCompletedOnTime) {
                                badgeText = 'A Tiempo';
                                badgeColor = '#dcfce7';
                                badgeTextColor = '#15803d';
                              } else if (isCompletedLate) {
                                badgeText = 'Completada Tarde';
                                badgeColor = '#eff6ff';
                                badgeTextColor = '#1e40af';
                              } else if (isExpiredTask) {
                                badgeText = 'No Realizada (Vencida)';
                                badgeColor = '#fef2f2';
                                badgeTextColor = '#dc2626';
                              } else if (isTaskOverdue) {
                                badgeText = 'Retrasada';
                                badgeColor = '#fff7ed';
                                badgeTextColor = '#c2410c';
                              }

                              return (
                                <div key={task.id} style={{ 
                                  backgroundColor: 'white', 
                                  border: '1px solid #e2e8f0', 
                                  padding: '1rem', 
                                  borderRadius: '8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.5rem',
                                  fontSize: '0.8rem'
                                }}>
                                  <div style={{ fontWeight: 'bold', color: 'var(--caanma-text)', fontSize: '0.85rem' }}>{task.title}</div>
                                  
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b' }}>Estado:</span>
                                    <span style={{ 
                                      padding: '0.15rem 0.45rem', 
                                      borderRadius: '4px', 
                                      fontWeight: 'bold', 
                                      backgroundColor: badgeColor, 
                                      color: badgeTextColor,
                                      fontSize: '0.75rem' 
                                    }}>
                                      {badgeText}
                                    </span>
                                  </div>

                                  {task.dueDate && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: '#64748b' }}>Límite:</span>
                                      <span style={{ fontWeight: '500' }}>
                                        {new Date(task.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                      </span>
                                    </div>
                                  )}

                                  {task.completedAt && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: '#64748b' }}>Completada:</span>
                                      <span style={{ fontWeight: '500' }}>
                                        {new Date(task.completedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {filteredReport.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                  No se encontraron resultados para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
