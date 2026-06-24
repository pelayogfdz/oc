'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, GripVertical, CheckCircle2 } from 'lucide-react';
import { createProcess, updateProcess, deleteProcess, createRecipe, deleteRecipe } from '@/app/actions/manufacturing';

export default function FormulasClient({ initialProcesses, initialRecipes, products }: any) {
  const [processes, setProcesses] = useState(initialProcesses);
  const [recipes, setRecipes] = useState(initialRecipes);
  const productionProducts = products.filter((p: any) => p.allowProduction === true);
  const ingredientProducts = products.filter((p: any) => p.isProductionInput === true);
  
  // Procesos UI State
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [processName, setProcessName] = useState('');
  const [editingProcess, setEditingProcess] = useState<any>(null);

  // Recetas UI State
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [targetProductId, setTargetProductId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<{productId: string, quantity: number}[]>([]);

  // Guardar Proceso
  const handleSaveProcess = async () => {
    if (!processName) return;
    try {
      if (editingProcess) {
        await updateProcess(editingProcess.id, { name: processName });
        setProcesses(processes.map((p: any) => p.id === editingProcess.id ? { ...p, name: processName } : p));
      } else {
        const order = processes.length + 1;
        const newProc = await createProcess({ name: processName, order });
        setProcesses([...processes, newProc]);
      }
      setIsProcessModalOpen(false);
      setProcessName('');
      setEditingProcess(null);
    } catch (error) {
      alert('Error guardando proceso');
    }
  };

  const handleDeleteProcess = async (id: string) => {
    if (!confirm('¿Eliminar proceso?')) return;
    try {
      await deleteProcess(id);
      setProcesses(processes.filter((p: any) => p.id !== id));
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  // Agregar Ingrediente Temporal
  const addIngredient = () => {
    setIngredients([...ingredients, { productId: '', quantity: 1 }]);
  };

  // Guardar Receta
  const handleSaveRecipe = async () => {
    if (!targetProductId || !recipeName || ingredients.length === 0) {
      alert('Selecciona producto final, nombre y al menos un ingrediente');
      return;
    }
    
    try {
      const newRec = await createRecipe({
        name: recipeName,
        productId: targetProductId,
        instructions,
        ingredients: ingredients.filter(i => i.productId && i.quantity > 0)
      });
      // Recargar página o actualizar estado local. Para simplicidad, recargamos la página.
      window.location.reload();
    } catch (error) {
      alert('Error guardando receta');
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('¿Eliminar receta?')) return;
    try {
      await deleteRecipe(id);
      setRecipes(recipes.filter((r: any) => r.id !== id));
    } catch (e) {
      alert('Error al eliminar receta');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      
      {/* Columna Procesos */}
      <div style={{ backgroundColor: 'var(--caanma-card-bg)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Pasos de Producción</h2>
          <button 
            onClick={() => { setEditingProcess(null); setProcessName(''); setIsProcessModalOpen(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--caanma-primary)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <Plus size={18} /> Agregar
          </button>
        </div>
        <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Define la secuencia de pasos por las que pasa una orden de producción (ej. Amasado, Fermentación, Horneado).
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {processes.map((p: any, index: number) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--caanma-bg)', borderRadius: '8px', border: '1px solid var(--caanma-border)' }}>
              <GripVertical size={20} color="#cbd5e1" style={{ marginRight: '0.5rem', cursor: 'grab' }} />
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--caanma-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', marginRight: '1rem' }}>
                {index + 1}
              </div>
              <div style={{ flex: 1, fontWeight: '500' }}>{p.name}</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => { setEditingProcess(p); setProcessName(p.name); setIsProcessModalOpen(true); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDeleteProcess(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Columna Recetas */}
      <div style={{ backgroundColor: 'var(--caanma-card-bg)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Fórmulas y Productos</h2>
          <button 
            onClick={() => { 
              setRecipeName(''); 
              setTargetProductId('');
              setInstructions('');
              setIngredients([]);
              setIsRecipeModalOpen(true); 
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--caanma-primary)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <Plus size={18} /> Nueva Fórmula
          </button>
        </div>
        <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Configura qué insumos se requieren para fabricar un producto final.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {recipes.map((r: any) => (
            <div key={r.id} style={{ padding: '1.5rem', backgroundColor: 'var(--caanma-bg)', borderRadius: '8px', border: '1px solid var(--caanma-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>{r.name}</h3>
                  <div style={{ color: 'var(--caanma-text-muted)', fontSize: '0.9rem' }}>
                    Producto Resultante: <strong>{r.product?.name}</strong>
                  </div>
                </div>
                <button onClick={() => handleDeleteRecipe(r.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                  <Trash2 size={18} />
                </button>
              </div>
              <div style={{ fontSize: '0.9rem' }}>
                <strong>Ingredientes ({r.ingredients.length}):</strong>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', color: 'var(--caanma-text-muted)' }}>
                  {r.ingredients.map((ing: any) => (
                    <li key={ing.id}>{ing.quantity}x {ing.product?.name}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
          {recipes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--caanma-text-muted)' }}>
              No hay fórmulas configuradas.
            </div>
          )}
        </div>
      </div>

      {/* MODAL PROCESOS */}
      {isProcessModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--caanma-card-bg)', padding: '2rem', borderRadius: '12px', width: '400px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>
              {editingProcess ? 'Editar Paso' : 'Nuevo Paso de Fabricación'}
            </h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nombre del Paso</label>
              <input 
                type="text" 
                value={processName}
                onChange={e => setProcessName(e.target.value)}
                placeholder="Ej. Horneado"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', backgroundColor: 'var(--caanma-bg)', color: 'var(--caanma-text)' }}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setIsProcessModalOpen(false)} style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--caanma-border)', backgroundColor: 'transparent', color: 'var(--caanma-text)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Cancelar
              </button>
              <button onClick={handleSaveProcess} style={{ padding: '0.75rem 1.5rem', border: 'none', backgroundColor: 'var(--caanma-primary)', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RECETA */}
      {isRecipeModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--caanma-card-bg)', padding: '2rem', borderRadius: '12px', width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>
              Nueva Fórmula
            </h3>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nombre de la Fórmula</label>
                <input 
                  type="text" 
                  value={recipeName}
                  onChange={e => setRecipeName(e.target.value)}
                  placeholder="Ej. Fórmula Pan Francés"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', backgroundColor: 'var(--caanma-bg)', color: 'var(--caanma-text)' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Producto Final Resultante</label>
                <select 
                  value={targetProductId}
                  onChange={e => setTargetProductId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', backgroundColor: 'var(--caanma-bg)', color: 'var(--caanma-text)' }}
                >
                  <option value="">-- Seleccionar Producto --</option>
                  {productionProducts.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Instrucciones (Opcional)</label>
              <textarea 
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="Ej. Mezclar harina con agua y amasar 15 min..."
                rows={3}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', backgroundColor: 'var(--caanma-bg)', color: 'var(--caanma-text)', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontWeight: '500' }}>Insumos Requeridos</label>
                <button onClick={addIngredient} style={{ background: 'none', border: 'none', color: 'var(--caanma-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  + Agregar Insumo
                </button>
              </div>
              
              {ingredients.map((ing, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <select 
                    value={ing.productId}
                    onChange={e => {
                      const newIngs = [...ingredients];
                      newIngs[idx].productId = e.target.value;
                      setIngredients(newIngs);
                    }}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', backgroundColor: 'var(--caanma-bg)', color: 'var(--caanma-text)' }}
                  >
                    <option value="">Seleccionar Insumo...</option>
                    {ingredientProducts.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    step="0.001"
                    min="0"
                    placeholder="Cantidad"
                    value={ing.quantity}
                    onChange={e => {
                      const newIngs = [...ingredients];
                      newIngs[idx].quantity = parseFloat(e.target.value) || 0;
                      setIngredients(newIngs);
                    }}
                    style={{ width: '100px', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', backgroundColor: 'var(--caanma-bg)', color: 'var(--caanma-text)' }}
                  />
                  <button 
                    onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {ingredients.length === 0 && (
                <div style={{ padding: '1rem', textAlign: 'center', border: '1px dashed var(--caanma-border)', borderRadius: '6px', color: 'var(--caanma-text-muted)' }}>
                  Añade los ingredientes que componen esta fórmula.
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setIsRecipeModalOpen(false)} style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--caanma-border)', backgroundColor: 'transparent', color: 'var(--caanma-text)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Cancelar
              </button>
              <button onClick={handleSaveRecipe} style={{ padding: '0.75rem 1.5rem', border: 'none', backgroundColor: 'var(--caanma-primary)', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Guardar Fórmula
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
