'use client';

import { Download, CalendarDays, Users } from 'lucide-react';

export default function ReportesClient() {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b' }}>Reportes de Recursos Humanos</h1>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>Generación y descarga de reportes de asistencia y nómina.</p>
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
          <button style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            <Download size={18} /> Descargar Excel
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
          <button style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            <Download size={18} /> Descargar Excel
          </button>
        </div>
      </div>
    </div>
  );
}
