'use client';

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export type DateRange = {
  startDate: Date;
  endDate: Date;
  label: string;
};

interface DateRangeFilterProps {
  onFilterChange: (range: DateRange) => void;
  disabled?: boolean;
}

export default function DateRangeFilter({ onFilterChange, disabled }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  const [activeLabel, setActiveLabel] = useState('Últimos 30 días');

  const handleSelect = (label: string, start: Date, end: Date) => {
    setActiveLabel(label);
    setIsOpen(false);
    onFilterChange({ startDate: start, endDate: end, label });
  };

  const selectPreset = (preset: string) => {
    const today = new Date();
    switch (preset) {
      case 'Hoy':
        handleSelect(preset, startOfDay(today), endOfDay(today));
        break;
      case 'Ayer':
        const yesterday = subDays(today, 1);
        handleSelect(preset, startOfDay(yesterday), endOfDay(yesterday));
        break;
      case 'Últimos 7 días':
        handleSelect(preset, startOfDay(subDays(today, 6)), endOfDay(today));
        break;
      case 'Últimos 30 días':
        handleSelect(preset, startOfDay(subDays(today, 29)), endOfDay(today));
        break;
      case 'Este Mes':
        handleSelect(preset, startOfMonth(today), endOfDay(today));
        break;
      case 'Mes Pasado':
        const lastMonth = subMonths(today, 1);
        handleSelect(preset, startOfMonth(lastMonth), endOfMonth(lastMonth));
        break;
      case 'Histórico':
        handleSelect(preset, new Date(2000, 0, 1), endOfDay(today));
        break;
    }
  };

  const applyCustom = () => {
    if (!customStart || !customEnd) return;
    const start = startOfDay(new Date(customStart + 'T00:00:00'));
    const end = endOfDay(new Date(customEnd + 'T23:59:59'));
    handleSelect('Personalizado', start, end);
  };

  return (
    <div style={{ position: 'relative', fontFamily: 'var(--font-geist-sans)' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.6rem 1rem',
          backgroundColor: 'white',
          border: '1px solid var(--pulpos-border)',
          borderRadius: '8px',
          fontWeight: '500',
          color: 'var(--pulpos-text)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.7 : 1,
          minWidth: '220px',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} color="var(--pulpos-primary)" />
          {activeLabel}
        </div>
        <ChevronDown size={18} color="var(--pulpos-text-muted)" />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '0.5rem',
          backgroundColor: 'white',
          border: '1px solid var(--pulpos-border)',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          zIndex: 50,
          width: '320px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Presets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: 'var(--pulpos-border)' }}>
            {['Hoy', 'Ayer', 'Últimos 7 días', 'Últimos 30 días', 'Este Mes', 'Mes Pasado', 'Histórico'].map(preset => (
              <button
                key={preset}
                onClick={() => selectPreset(preset)}
                style={{
                  backgroundColor: 'white',
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontSize: '0.9rem',
                  color: 'var(--pulpos-text)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: activeLabel === preset ? 'bold' : 'normal'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Custom */}
          <div style={{ padding: '1rem', borderTop: '1px solid var(--pulpos-border)', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>Rango Personalizado</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input 
                type="date" 
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', fontSize: '0.85rem' }} 
              />
              <input 
                type="date" 
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', fontSize: '0.85rem' }} 
              />
            </div>
            <button 
              onClick={applyCustom}
              disabled={!customStart || !customEnd}
              style={{
                width: '100%',
                padding: '0.5rem',
                backgroundColor: (!customStart || !customEnd) ? '#cbd5e1' : 'var(--pulpos-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: (!customStart || !customEnd) ? 'not-allowed' : 'pointer'
              }}
            >
              Aplicar Rango
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
