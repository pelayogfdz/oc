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
    <div>
      {!showNewInput ? (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ flex: 1, padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: 'white', cursor: 'pointer' }}
          >
            <option value="">-- Seleccionar Categoría --</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button 
            type="button" 
            onClick={() => setShowNewInput(true)}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            title="Nueva Categoría"
          >
            <Plus size={20} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
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
            style={{ flex: 1, padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}
          />
          <button 
            type="button" 
            onClick={handleAddCategory}
            style={{ padding: '0.75rem 1rem', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Agregar
          </button>
          <button 
            type="button" 
            onClick={() => {
              setNewCategoryName('');
              setShowNewInput(false);
            }}
            style={{ padding: '0.75rem 1rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Cancelar
          </button>
        </div>
      )}
      <input type="hidden" name={name} value={selectedCategory} />
    </div>
  );
}
