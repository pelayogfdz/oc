"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';

interface SatUnitOption {
  code: string;
  name: string;
}

const SAT_UNITS: SatUnitOption[] = [
  { code: 'H87', name: 'Pieza (Pza) - Artículos individuales' },
  { code: 'E48', name: 'Unidad de servicio - Para servicios o mano de obra' },
  { code: 'KGM', name: 'Kilogramo (Kg) - Venta por peso' },
  { code: 'LTR', name: 'Litro (L) - Líquidos y fluidos' },
  { code: 'XBXS', name: 'Caja (Box) - Empaques secundarios' },
  { code: 'H13', name: 'Paquete (Pkt) - Conjunto de artículos' },
  { code: 'MIL', name: 'Millar (Mil) - Unidades de mil' },
  { code: 'MTR', name: 'Metro (M) - Medida lineal' },
  { code: 'MTK', name: 'Metro cuadrado (M2) - Medida de área' },
  { code: 'DPC', name: 'Docena (Doz) - Conjunto de doce piezas' }
];

interface Props {
  defaultValue?: string;
  name?: string;
}

export default function SatUnitAutocomplete({ defaultValue = '', name = 'satUnit' }: Props) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with defaultValue when it changes
  useEffect(() => {
    setInputValue(defaultValue);
  }, [defaultValue]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter options based on input value
  const filteredOptions = useMemo(() => {
    if (!inputValue) return SAT_UNITS;
    const query = inputValue.toLowerCase().trim();
    return SAT_UNITS.filter(
      opt => opt.code.includes(query) || opt.name.toLowerCase().includes(query)
    );
  }, [inputValue]);

  // Find matching description for selected or typed code
  const currentDescription = useMemo(() => {
    const match = SAT_UNITS.find(opt => opt.code.toUpperCase() === inputValue.trim().toUpperCase());
    return match ? match.name : null;
  }, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleOptionSelect = (option: SatUnitOption) => {
    setInputValue(option.code);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(prev => 
        prev < filteredOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        e.preventDefault();
        handleOptionSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        name={name}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Ej. H87 (escribe código o palabra)"
        autoComplete="off"
        style={{
          width: '100%',
          padding: '0.75rem',
          borderRadius: '4px',
          border: '1px solid #bbf7d0',
          outline: 'none',
          fontSize: '0.95rem'
        }}
      />
      
      {currentDescription && (
        <div style={{
          marginTop: '0.35rem',
          fontSize: '0.825rem',
          color: '#166534',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
          <span>📦 {currentDescription}</span>
        </div>
      )}

      {isOpen && filteredOptions.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 99,
          margin: '4px 0 0 0',
          padding: '0.25rem 0',
          listStyle: 'none',
          backgroundColor: 'white',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          maxHeight: '200px',
          overflowY: 'auto',
          color: 'black'
        }}>
          {filteredOptions.map((option, index) => {
            const isHighlighted = index === highlightedIndex;
            return (
              <li
                key={option.code}
                onClick={() => handleOptionSelect(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  padding: '0.6rem 0.75rem',
                  cursor: 'pointer',
                  backgroundColor: isHighlighted ? '#f0fdf4' : 'transparent',
                  color: isHighlighted ? '#166534' : '#334155',
                  fontSize: '0.875rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #f1f5f9'
                }}
              >
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{option.code}</span>
                <span style={{ 
                  marginLeft: '0.75rem', 
                  color: isHighlighted ? '#166534' : '#64748b',
                  fontSize: '0.8rem',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '240px'
                }}>
                  {option.name}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
