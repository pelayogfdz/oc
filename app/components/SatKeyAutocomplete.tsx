"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';

interface SatKeyOption {
  code: string;
  name: string;
}

const SAT_KEYS: SatKeyOption[] = [
  { code: '44120000', name: 'Suministros de oficina / Papelería general' },
  { code: '44121600', name: 'Bolígrafos, lápices, marcadores, correctores' },
  { code: '44122000', name: 'Carpetas, folders, archivadores, fundas' },
  { code: '44121500', name: 'Tijeras, engrapadoras, perforadoras, clips, gomas' },
  { code: '14111500', name: 'Papel para impresión, hojas bond, cuadernos, libretas' },
  { code: '43211500', name: 'Computadoras, laptops, tabletas, servidores' },
  { code: '43201400', name: 'Memorias USB, discos duros, almacenamiento, tarjetas' },
  { code: '43191500', name: 'Teléfonos celulares, cables USB, adaptadores, cargadores' },
  { code: '56112100', name: 'Sillas de oficina, sillones ejecutivos, bancos' },
  { code: '56101700', name: 'Escritorios, mesas de oficina, estantes, archiveros' },
  { code: '10121500', name: 'Alimento para perros (croquetas, sobres)' },
  { code: '10121600', name: 'Alimento para gatos (croquetas, sobres, latas)' },
  { code: '10121800', name: 'Alimento para peces, aves, reptiles u otras mascotas' },
  { code: '42121600', name: 'Medicamentos de uso veterinario y vacunas' },
  { code: '10191500', name: 'Accesorios para mascotas (collares, juguetes, correas)' },
  { code: '10190000', name: 'Higiene y cuidado de mascotas (shampoo, cepillos)' },
  { code: '47131800', name: 'Artículos de limpieza, detergentes, desinfectantes' },
  { code: '80141600', name: 'Servicios de ventas, mercadotecnia, publicidad, comisiones' },
  { code: '81111800', name: 'Servicios de soporte técnico, sistemas, licencias' },
  { code: '72101500', name: 'Servicios de mantenimiento, instalación o reparación' },
  { code: '01010101', name: 'No existe en el catálogo (Clave genérica SAT)' }
];

interface Props {
  defaultValue?: string;
  name?: string;
}

export default function SatKeyAutocomplete({ defaultValue = '', name = 'satKey' }: Props) {
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
    if (!inputValue) return SAT_KEYS;
    const query = inputValue.toLowerCase().trim();
    return SAT_KEYS.filter(
      opt => opt.code.includes(query) || opt.name.toLowerCase().includes(query)
    );
  }, [inputValue]);

  // Find matching description for selected or typed code
  const currentDescription = useMemo(() => {
    const match = SAT_KEYS.find(opt => opt.code === inputValue.trim());
    return match ? match.name : null;
  }, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleOptionSelect = (option: SatKeyOption) => {
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
        placeholder="Ej. 44121600 (escribe código o palabra)"
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
          <span>🏷️ {currentDescription}</span>
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
          maxHeight: '220px',
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
