'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

interface BrandSelectorProps {
  brands: string[];
  defaultValue?: string;
  name?: string;
}

export default function BrandSelector({ brands, defaultValue = '', name = 'brand' }: BrandSelectorProps) {
  const [brandsList, setBrandsList] = useState<string[]>(brands);
  const [selectedBrand, setSelectedBrand] = useState(defaultValue);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  const handleAddBrand = () => {
    const trimmed = newBrandName.trim();
    if (trimmed) {
      const exists = brandsList.some(b => b.toLowerCase() === trimmed.toLowerCase());
      let updatedList = brandsList;
      if (!exists) {
        const matched = brandsList.find(b => b.toLowerCase() === trimmed.toLowerCase());
        const brandToAdd = matched || trimmed;
        updatedList = [...brandsList, brandToAdd].sort();
        setBrandsList(updatedList);
        setSelectedBrand(brandToAdd);
      } else {
        const matched = brandsList.find(b => b.toLowerCase() === trimmed.toLowerCase()) || trimmed;
        setSelectedBrand(matched);
      }
      setNewBrandName('');
      setShowNewInput(false);
    }
  };

  return (
    <div>
      {!showNewInput ? (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select 
            value={selectedBrand} 
            onChange={(e) => setSelectedBrand(e.target.value)}
            style={{ flex: 1, padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: 'white', cursor: 'pointer' }}
          >
            <option value="">-- Seleccionar Marca --</option>
            {brandsList.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
          <button 
            type="button" 
            onClick={() => setShowNewInput(true)}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            title="Nueva Marca"
          >
            <Plus size={20} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            value={newBrandName} 
            onChange={(e) => setNewBrandName(e.target.value)} 
            placeholder="Nueva marca..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddBrand();
              }
            }}
            style={{ flex: 1, padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}
          />
          <button 
            type="button" 
            onClick={handleAddBrand}
            style={{ padding: '0.75rem 1rem', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Agregar
          </button>
          <button 
            type="button" 
            onClick={() => {
              setNewBrandName('');
              setShowNewInput(false);
            }}
            style={{ padding: '0.75rem 1rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Cancelar
          </button>
        </div>
      )}
      <input type="hidden" name={name} value={selectedBrand} />
    </div>
  );
}
