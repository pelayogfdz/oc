'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check, Loader2 } from 'lucide-react';

interface SearchableFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  allOptionLabel: string;
  allOptionValue?: string;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  minWidth?: string;
  maxWidth?: string;
}

function normalize(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export default function SearchableFilterSelect({
  value,
  onChange,
  options,
  allOptionLabel,
  allOptionValue = 'ALL',
  placeholder = 'Buscar...',
  disabled = false,
  loading = false,
  minWidth = '160px',
  maxWidth = '260px'
}: SearchableFilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setHighlightedIndex(-1);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    const term = normalize(searchTerm);
    if (!term) return options;
    return options.filter(opt => normalize(opt).includes(term));
  }, [options, searchTerm]);

  // Should we show the "ALL" option in the list?
  const showAllOption = useMemo(() => {
    const term = normalize(searchTerm);
    if (!term) return true;
    return normalize(allOptionLabel).includes(term) || 'todas'.includes(term) || 'todos'.includes(term);
  }, [searchTerm, allOptionLabel]);

  // All displayed items including 'ALL'
  const displayList = useMemo(() => {
    const list: { label: string; value: string }[] = [];
    if (showAllOption) {
      list.push({ label: allOptionLabel, value: allOptionValue });
    }
    filteredOptions.forEach(opt => {
      list.push({ label: opt, value: opt });
    });
    return list;
  }, [showAllOption, allOptionLabel, allOptionValue, filteredOptions]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchTerm('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const next = prev < displayList.length - 1 ? prev + 1 : 0;
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const next = prev > 0 ? prev - 1 : displayList.length - 1;
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < displayList.length) {
        handleSelect(displayList[highlightedIndex].value);
      } else if (displayList.length > 0) {
        handleSelect(displayList[0].value);
      }
    }
  };

  const scrollIntoView = (index: number) => {
    if (!listRef.current) return;
    const item = listRef.current.children[index] as HTMLElement;
    if (item) {
      item.scrollIntoView({ block: 'nearest' });
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(allOptionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const isSelectedAll = value === allOptionValue || !value;
  const currentLabel = isSelectedAll ? allOptionLabel : value;

  return (
    <div 
      ref={containerRef} 
      style={{ position: 'relative', width: 'auto', minWidth, maxWidth }}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={disabled || loading ? -1 : 0}
        onClick={() => {
          if (!disabled && !loading) {
            setIsOpen(!isOpen);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.4rem',
          padding: '0.5rem 0.65rem',
          borderRadius: '6px',
          border: `1px solid ${isOpen ? 'var(--caanma-primary, #2563eb)' : '#e2e8f0'}`,
          backgroundColor: disabled || loading ? '#f8fafc' : '#ffffff',
          color: disabled ? '#94a3b8' : isSelectedAll ? '#475569' : '#0f172a',
          fontWeight: isSelectedAll ? '400' : '600',
          fontSize: '0.875rem',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 2px rgba(37, 99, 235, 0.15)' : 'none',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          height: '38px',
          boxSizing: 'border-box'
        }}
      >
        <span 
          title={currentLabel}
          style={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            flex: 1,
            textAlign: 'left'
          }}
        >
          {loading ? 'Cargando...' : currentLabel}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
          {loading ? (
            <Loader2 size={15} className="animate-spin" style={{ color: '#94a3b8' }} />
          ) : (
            <>
              {!isSelectedAll && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  title="Restablecer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: '#e2e8f0',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#cbd5e1';
                    e.currentTarget.style.color = '#1e293b';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#e2e8f0';
                    e.currentTarget.style.color = '#64748b';
                  }}
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              )}
              <ChevronDown 
                size={16} 
                style={{ 
                  color: '#94a3b8', 
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }} 
              />
            </>
          )}
        </div>
      </div>

      {/* Floating Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 999,
            minWidth: '220px',
            width: 'max-content',
            maxWidth: '320px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Search Input Box */}
          <div style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search 
                size={14} 
                style={{ position: 'absolute', left: '0.6rem', color: '#94a3b8', pointerEvents: 'none' }} 
              />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder={placeholder}
                style={{
                  width: '100%',
                  padding: '0.4rem 1.8rem 0.4rem 2rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--caanma-primary, #2563eb)')}
                onBlur={e => (e.target.style.borderColor = '#cbd5e1')}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    inputRef.current?.focus();
                  }}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div 
            ref={listRef}
            style={{ 
              maxHeight: '220px', 
              overflowY: 'auto', 
              padding: '0.25rem 0',
              overscrollBehavior: 'contain'
            }}
          >
            {displayList.length === 0 ? (
              <div style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                Sin resultados para &ldquo;{searchTerm}&rdquo;
              </div>
            ) : (
              displayList.map((item, idx) => {
                const isSelected = item.value === value || (item.value === allOptionValue && isSelectedAll);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={item.value}
                    onClick={() => handleSelect(item.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      backgroundColor: isSelected 
                        ? '#eff6ff' 
                        : isHighlighted 
                          ? '#f1f5f9' 
                          : 'transparent',
                      color: isSelected ? '#1d4ed8' : '#1e293b',
                      fontWeight: isSelected ? '600' : '400',
                      transition: 'background-color 0.1s ease'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                    {isSelected && (
                      <Check size={15} style={{ color: '#2563eb', flexShrink: 0 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
