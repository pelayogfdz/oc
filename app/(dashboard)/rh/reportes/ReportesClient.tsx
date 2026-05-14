'use client';

import { useState } from 'react';
import { Download, CalendarDays, Users } from 'lucide-react';
import { getGlobalAttendanceLogs, calculatePayroll } from '@/app/actions/hr';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

export default function ReportesClient() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const downloadAsistencia = async () => {
    if (!startDate || !endDate) return toast.error("Selecciona las fechas de inicio y fin.");
    if (new Date(startDate) > new Date(endDate)) return toast.error("Fecha de inicio no puede ser mayor a la fecha de fin.");
    
    setIsExporting(true);
    try {
      const res = await getGlobalAttendanceLogs(startDate, endDate);
      if (!res.success) throw new Error("Error obteniendo datos");
      
      const ws = XLSX.utils.json_to_sheet(res.data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
      XLSX.writeFile(wb, `Asistencia_${startDate}_${endDate}.xlsx`);
      toast.success("Reporte exportado correctamente.");
    } catch(e: any) {
      toast.error("Error al exportar");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadNomina = async () => {
    if (!startDate || !endDate) return toast.error("Selecciona las fechas de inicio y fin.");
    if (new Date(startDate) > new Date(endDate)) return toast.error("Fecha de inicio no puede ser mayor a la fecha de fin.");

    setIsExporting(true);
    try {
      const res = await calculatePayroll(startDate, endDate, true); // true for discount lates
      if (!res.success) throw new Error("Error calculando nómina");
      
      const reportData = res.data.map((r: any) => ({
        ID: r.id,
        Nombre: r.name,
        RFC: r.rfc || '',
        'Salario Diario': r.dailySalary,
        'Días Trabajados': r.workedDays,
        'Retardos': r.lates,
        'Días Permiso (Pagados)': r.paidLeaveDays,
        'Días Permiso (No Pagados)': r.unpaidLeaveDays,
        'Faltas Calculadas': r.absences,
        'Deducción Comidas': r.lunchDeduction,
        'Total a Pagar (Base)': r.totalToPay
      }));

      const ws = XLSX.utils.json_to_sheet(reportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Prenómina");
      XLSX.writeFile(wb, `Prenomina_${startDate}_${endDate}.xlsx`);
      toast.success("Prenómina exportada correctamente.");
    } catch(e: any) {
      toast.error("Error al exportar");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b' }}>Reportes de Recursos Humanos</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Generación y descarga de reportes de asistencia y nómina.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Fecha de Inicio</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="pulpos-input"
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Fecha de Fin</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="pulpos-input"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Reporte de Asistencia */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#e0f2fe', borderRadius: '8px' }}>
              <CalendarDays size={32} color="#0284c7" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>Asistencia Global</h2>
              <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Reporte detallado de entradas, salidas y retardos.</p>
            </div>
          </div>
          <button 
            onClick={downloadAsistencia}
            disabled={isExporting}
            style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: isExporting ? 0.7 : 1 }}
          >
            <Download size={18} /> {isExporting ? 'Exportando...' : 'Descargar Excel'}
          </button>
        </div>

        {/* Reporte de Nómina */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
              <Users size={32} color="#16a34a" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>Prenómina</h2>
              <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Cálculo preliminar basado en asistencia y comisiones.</p>
            </div>
          </div>
          <button 
            onClick={downloadNomina}
            disabled={isExporting}
            style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: isExporting ? 0.7 : 1 }}
          >
            <Download size={18} /> {isExporting ? 'Exportando...' : 'Descargar Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
