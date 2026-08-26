'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

interface CategorySelectorProps {
  categories: string[];
  defaultValue?: string;
  name?: string;
}

export default function CategorySelector({ categories, defaultValue = '', name = 'category' }: CategorySelectorProps) {
  const [categoriesList, setCategoriesList] = useState<string[]>(categories);
  const [selectedCategory, setSelectedCategory] = useState(defaultValue);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed) {
      const exists = categoriesList.some(c => c.toLowerCase() === trimmed.toLowerCase());
      let updatedList = categoriesList;
      if (!exists) {
        // Encontrar si ya existe con mayúsculas/minúsculas diferentes para usar la existente
        const matched = categoriesList.find(c => c.toLowerCase() === trimmed.toLowerCase());
        const categoryToAdd = matched || trimmed;
        updatedList = [...categoriesList, categoryToAdd].sort();
        setCategoriesList(updatedList);
        setSelectedCategory(categoryToAdd);
      } else {
        const matched = categoriesList.find(c => c.toLowerCase() === trimmed.toLowerCase()) || trimmed;
        setSelectedCategory(matched);
      }
      setNewCategoryName('');
      setShowNewInput(false);
    }
  };

  return (
    <div style={{ width: '100%', minWidth: 0 }}>
      {!showNewInput ? (
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', width: '100%', minWidth: 0 }}>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ flex: 1, minWidth: 0, width: '100%', padding: '0.75rem 0.5rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: 'white', cursor: 'pointer', textOverflow: 'ellipsis' }}
          >
            <option value="">-- Seleccionar Categoría --</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button 
            type="button" 
            onClick={() => setShowNewInput(true)}
            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            title="Nueva Categoría"
          >
            <Plus size={18} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', width: '100%', minWidth: 0 }}>
          <input 
            type="text" 
            value={newCategoryName} 
            onChange={(e) => setNewCategoryName(e.target.value)} 
            placeholder="Nueva categoría..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCategory();
              }
            }}
            style={{ flex: 1, minWidth: 0, width: '100%', padding: '0.65rem 0.5rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}
          />
          <button 
            type="button" 
            onClick={handleAddCategory}
            style={{ flexShrink: 0, padding: '0.65rem 0.75rem', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
          >
            Agregar
          </button>
          <button 
            type="button" 
            onClick={() => {
              setNewCategoryName('');
              setShowNewInput(false);
            }}
            style={{ flexShrink: 0, padding: '0.65rem 0.75rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
          >
            Cancelar
          </button>
        </div>
      )}
      <input type="hidden" name={name} value={selectedCategory} />
    </div>
  );
}
