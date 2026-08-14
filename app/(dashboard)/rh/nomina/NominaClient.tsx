'use client';

import { useState } from 'react';
import { calculatePayroll } from '@/app/actions/hr';
import { Calendar, Calculator, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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

    const headers = ['Empleado', 'RFC', 'Salario Diario / Hora', 'SD IMSS', 'Tipo Nómina', 'Asistencias', 'Horas Trab.', 'Horas Dobles', 'Retardos', 'Permisos Pagados', 'Permisos Sin Goce', 'Faltas', 'Fondo Ahorro ($)', 'Fondo Ahorro (%)', 'Total a Pagar'];
    const rows = payrollData.map(p => [
      p.name,
      p.rfc || 'N/A',
      p.dailySalary.toFixed(2),
      p.imssSalary ? p.imssSalary.toFixed(2) : '0.00',
      p.payrollType === 'POR_HORAS' ? 'Por Horas' : 'Fijo',
      p.workedDays,
      p.workedHours ? p.workedHours.toFixed(2) : '0.00',
      p.doubleHours ? p.doubleHours.toFixed(2) : '0.00',
      p.lates,
      p.paidLeaveDays,
      p.unpaidLeaveDays,
      p.absences,
      p.savingsFundAmount ? p.savingsFundAmount.toFixed(2) : '0.00',
      p.savingsFundPercent ? p.savingsFundPercent.toFixed(1) : '0.0',
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
      <form onSubmit={handleCalculate} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--caanma-border)' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Fecha de Inicio</label>
          <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', backgroundColor: 'white' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Fecha de Fin</label>
          <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', backgroundColor: 'white' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 'bold' }}>
            <input type="checkbox" checked={discountLates} onChange={(e) => setDiscountLates(e.target.checked)} style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--caanma-primary)' }} />
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
            <button onClick={handleDownloadCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: '1px solid var(--caanma-border)', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', fontWeight: '500' }}>
              <Download size={16} /> Exportar CSV
            </button>
          </div>

          <div className="table-container">
            <table className="caanma-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 'bold' }}>Empleado</th>
                  <th style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 'bold' }}>Salario Diario / Hora</th>
                  <th style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 'bold' }}>SD IMSS</th>
                  <th style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 'bold' }}>Asistencias</th>
                  <th style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 'bold' }}>Horas Trab.</th>
                  <th style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 'bold' }}>Horas Dobles</th>
                  <th style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 'bold' }}>Retardos</th>
                  <th style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 'bold' }}>Permisos Pagados</th>
                  <th style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 'bold' }}>Faltas / Sin Goce</th>
                  <th style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 'bold' }}>Fondo Ahorro</th>
                  <th style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold' }}>Total a Pagar</th>
                </tr>
              </thead>
              <tbody>
                {payrollData.length === 0 && (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: '#64748b', border: '1px solid #cbd5e1' }}>No se encontraron empleados con datos en este periodo.</td>
                  </tr>
                )}
                {payrollData.map((row: any) => (
                  <tr key={row.id}>
                    <td data-label="Empleado" style={{ fontWeight: '500', padding: '1rem 1.25rem', border: '1px solid #cbd5e1' }}>
                      {row.name} 
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>RFC: {row.rfc || 'S/N'}</div>
                    </td>
                    <td data-label="Salario Diario / Hora" style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1' }}>
                      {formatCurrency(row.dailySalary)}
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                        {row.payrollType === 'POR_HORAS' ? 'por Hora' : 'por Día'}
                      </div>
                    </td>
                    <td data-label="SD IMSS" style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1' }}>
                      {row.imssSalary > 0 ? formatCurrency(row.imssSalary) : '-'}
                    </td>
                    <td data-label="Asistencias" style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1' }}>{row.workedDays}</td>
                    <td data-label="Horas Trab." style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1' }}>{row.workedHours ? row.workedHours.toFixed(1) + ' hrs' : '-'}</td>
                    <td data-label="Horas Dobles" style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1', color: row.doubleHours > 0 ? '#16a34a' : 'inherit', fontWeight: row.doubleHours > 0 ? 'bold' : 'normal' }}>
                      {row.doubleHours ? row.doubleHours.toFixed(1) + ' hrs' : '-'}
                    </td>
                    <td data-label="Retardos" style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1', color: row.lates > 0 ? '#ef4444' : 'inherit' }}>{row.lates}</td>
                    <td data-label="Permisos Pagados" style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1' }}>{row.paidLeaveDays}</td>
                    <td data-label="Faltas / Sin Goce" style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1', color: row.absences > 0 ? '#ea580c' : 'inherit' }}>
                      {row.absences}
                    </td>
                    <td data-label="Fondo Ahorro" style={{ padding: '1rem 1.25rem', border: '1px solid #cbd5e1' }}>
                      {row.savingsFundPercent > 0 ? (
                        <div>
                          <div style={{ fontWeight: '500' }}>{formatCurrency(row.savingsFundAmount)}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>({row.savingsFundPercent}%)</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td data-label="Total a Pagar" style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--caanma-primary)', fontSize: '1.1rem', padding: '1rem 1.25rem', border: '1px solid #cbd5e1' }}>
                      {formatCurrency(row.totalToPay)}
                      {row.lunchDeduction > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 'normal', marginTop: '0.25rem' }}>
                          - {formatCurrency(row.lunchDeduction)} (Comida)
                        </div>
                      )}
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
