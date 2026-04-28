'use client';

import { useState } from 'react';
import { calculatePayroll } from '@/app/actions/hr';
import { Calendar, Calculator, Download } from 'lucide-react';

export default function NominaClient() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [discountLates, setDiscountLates] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payrollData, setPayrollData] = useState<any[] | null>(null);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const result = await calculatePayroll(startDate, endDate, discountLates);
      if (result.success) {
        setPayrollData(result.data);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!payrollData) return;

    const headers = ['Empleado', 'RFC', 'Salario Diario', 'Asistencias', 'Retardos', 'Permisos Pagados', 'Permisos Sin Goce', 'Faltas', 'Total a Pagar'];
    const rows = payrollData.map(p => [
      p.name,
      p.rfc || 'N/A',
      p.dailySalary.toFixed(2),
      p.workedDays,
      p.lates,
      p.paidLeaveDays,
      p.unpaidLeaveDays,
      p.absences,
      p.totalToPay.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nomina_${startDate}_${endDate}.csv`;
    link.click();
  };

  return (
    <div>
      <form onSubmit={handleCalculate} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Fecha de Inicio</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Fecha de Fin</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 'bold' }}>
            <input type="checkbox" checked={discountLates} onChange={(e) => setDiscountLates(e.target.checked)} style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--pulpos-primary)' }} />
            Descontar Faltas por Retardo (3 = 1)
          </label>
        </div>
        <button type="submit" disabled={isProcessing} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '42px', opacity: isProcessing ? 0.7 : 1 }}>
          <Calculator size={18} /> {isProcessing ? 'Calculando...' : 'Calcular Nómina'}
        </button>
      </form>

      {payrollData && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Resultados del Periodo</h3>
            <button onClick={handleDownloadCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: '1px solid var(--pulpos-border)', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', fontWeight: '500' }}>
              <Download size={16} /> Exportar CSV
            </button>
          </div>

          <div className="table-container">
            <table className="pulpos-table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Salario Diario</th>
                  <th>Asistencias</th>
                  <th>Retardos</th>
                  <th>Permisos Pagados</th>
                  <th>Faltas / Sin Goce</th>
                  <th style={{ textAlign: 'right' }}>Total a Pagar</th>
                </tr>
              </thead>
              <tbody>
                {payrollData.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No se encontraron empleados con datos en este periodo.</td>
                  </tr>
                )}
                {payrollData.map((row: any) => (
                  <tr key={row.id}>
                    <td data-label="Empleado" style={{ fontWeight: '500' }}>{row.name} <div style={{ fontSize: '0.75rem', color: '#64748b' }}>RFC: {row.rfc || 'S/N'}</div></td>
                    <td data-label="Salario Diario">${row.dailySalary.toFixed(2)}</td>
                    <td data-label="Asistencias">{row.workedDays}</td>
                    <td data-label="Retardos" style={{ color: row.lates > 0 ? '#ef4444' : 'inherit' }}>{row.lates}</td>
                    <td data-label="Permisos Pagados">{row.paidLeaveDays}</td>
                    <td data-label="Faltas / Sin Goce" style={{ color: row.absences > 0 ? '#ea580c' : 'inherit' }}>
                      {row.absences}
                    </td>
                    <td data-label="Total a Pagar" style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--pulpos-primary)', fontSize: '1.1rem' }}>
                      ${row.totalToPay.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
