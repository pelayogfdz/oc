'use client';

import React, { useState } from 'react';
import RestaurantNavbar from '../components/RestaurantNavbar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChefHat, Plus, Trash2, Edit3, ArrowLeft, 
  Search, Calculator, Sparkles, Scale, AlertCircle, TrendingUp,
  Boxes, PackageCheck, DollarSign, Layers, BookOpen, CheckCircle2
} from 'lucide-react';
import { saveRestaurantRecipe, deleteRestaurantRecipe } from '@/app/actions/restaurantActions';

interface Recipe {
  id: string;
  name: string;
  instructions?: string | null;
  product: {
    id: string;
    name: string;
    price: number;
    cost: number;
    category?: string | null;
  };
  ingredients: Array<{
    id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      sku?: string | null;
      cost: number;
      stock: number;
      unit: string;
      isProductionInput?: boolean;
    };
  }>;
}

interface ProductOption {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
  cost: number;
  stock?: number;
  unit: string;
  category?: string | null;
  isProductionInput?: boolean;
}

export default function RecetasClient({
  initialRecipes,
  dishProducts,
  rawIngredients
}: {
  initialRecipes: Recipe[];
  dishProducts: ProductOption[];
  rawIngredients: ProductOption[];
}) {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal Crear / Editar Receta
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [recipeName, setRecipeName] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [stagedIngredients, setStagedIngredients] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Insumos filtrados (priorizando isProductionInput: true)
  const insumosOnly = rawIngredients.filter(p => p.isProductionInput === true);
  const availableInsumosList = insumosOnly.length > 0 ? insumosOnly : rawIngredients;

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.product.category && r.product.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenCreate = () => {
    setEditingRecipeId(null);
    setSelectedProductId(dishProducts[0]?.id || '');
    setRecipeName(dishProducts[0]?.name ? `Receta ${dishProducts[0].name}` : '');
    setInstructions('');
    setStagedIngredients([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setSelectedProductId(recipe.product.id);
    setRecipeName(recipe.name);
    setInstructions(recipe.instructions || '');
    setStagedIngredients(recipe.ingredients.map(ing => ({
      productId: ing.product.id,
      quantity: ing.quantity
    })));
    setIsModalOpen(true);
  };

  const handleAddIngredientRow = () => {
    if (rawIngredients.length === 0) return;
    const defaultIng = insumosOnly[0] || rawIngredients[0];
    setStagedIngredients(prev => [...prev, { productId: defaultIng.id, quantity: 1 }]);
  };

  const handleUpdateIngredient = (index: number, field: 'productId' | 'quantity', value: any) => {
    setStagedIngredients(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveIngredientRow = (index: number) => {
    setStagedIngredients(prev => prev.filter((_, idx) => idx !== index));
  };

  // Calcular costo teórico de la receta
  const targetProduct = dishProducts.find(p => p.id === selectedProductId);
  const calculatedTheoreticalCost = stagedIngredients.reduce((acc, item) => {
    const ing = rawIngredients.find(r => r.id === item.productId);
    const unitCost = ing?.cost || 0;
    return acc + (unitCost * (item.quantity || 0));
  }, 0);

  const price = targetProduct?.price || 0;
  const grossProfit = price - calculatedTheoreticalCost;
  const profitMarginPct = price > 0 ? (grossProfit / price) * 100 : 0;

  const handleSaveRecipeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      alert('Debes seleccionar el platillo o bebida final');
      return;
    }
    if (stagedIngredients.length === 0) {
      alert('Debes agregar al menos un insumo a la receta');
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveRestaurantRecipe({
        id: editingRecipeId || undefined,
        productId: selectedProductId,
        name: recipeName || targetProduct?.name || 'Receta de Platillo',
        instructions,
        ingredients: stagedIngredients.map(item => ({
          productId: item.productId,
          quantity: Number(item.quantity) || 0
        }))
      });

      if (res.success) {
        setIsModalOpen(false);
        router.refresh();
      } else {
        alert(res.error || 'Error al guardar la receta');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecipe = async (id: string, name: string) => {
    if (!confirm(`¿Seguro que deseas eliminar la receta "${name}"?`)) return;
    const res = await deleteRestaurantRecipe(id);
    if (res.success) {
      setRecipes(prev => prev.filter(r => r.id !== id));
    } else {
      alert(res.error || 'Error al eliminar receta');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <RestaurantNavbar
        title="Recetas de Platillos y Bebidas"
        subtitle="Fichas técnicas vinculadas a insumos de preparación para costeo automático y descuento de stock"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/procesos/formulas"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700  bg-slate-100  hover:bg-slate-200  rounded-xl transition-all"
            >
              <Boxes className="w-4 h-4 text-purple-600" />
              <span>Fórmulas en Procesos</span>
            </Link>

            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Receta</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white  rounded-2xl border border-slate-200  shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50  text-purple-600  rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 ">Recetas Configuradas</p>
            <p className="text-2xl font-bold text-slate-900  mt-0.5">{recipes.length}</p>
          </div>
        </div>

        <div className="p-4 bg-white  rounded-2xl border border-slate-200  shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50  text-emerald-600  rounded-xl">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 ">Insumos Disponibles</p>
            <p className="text-2xl font-bold text-slate-900  mt-0.5">{rawIngredients.length}</p>
          </div>
        </div>

        <div className="p-4 bg-white  rounded-2xl border border-slate-200  shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50  text-blue-600  rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 ">Platillos / Menú</p>
            <p className="text-2xl font-bold text-slate-900  mt-0.5">{dishProducts.length}</p>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar receta por nombre, platillo o categoría..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white  border border-slate-200  rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500  shadow-sm"
        />
      </div>

      {/* Lista / Grid de Recetas */}
      {filteredRecipes.length === 0 ? (
        <div className="p-12 text-center bg-white  rounded-2xl border border-slate-200 ">
          <ChefHat className="w-12 h-12 text-slate-300  mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 ">No hay recetas registradas</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Crea fichas técnicas para tus platillos y bebidas para controlar el costo de insumos y descargar stock automáticamente.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm"
          >
            Crear Primera Receta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRecipes.map(recipe => {
            const recipeCost = recipe.ingredients.reduce((acc, ing) => {
              return acc + (ing.product.cost * ing.quantity);
            }, 0);

            const sellPrice = recipe.product.price || 0;
            const marginAmount = sellPrice - recipeCost;
            const marginPct = sellPrice > 0 ? (marginAmount / sellPrice) * 100 : 0;

            return (
              <div
                key={recipe.id}
                className="bg-white  rounded-2xl border border-slate-200  p-5 shadow-sm flex flex-col justify-between hover:border-purple-300  transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600   border border-purple-200 ">
                        {recipe.product.category || 'Platillo'}
                      </span>
                      <h3 className="text-base font-bold text-slate-900  mt-1.5">{recipe.name}</h3>
                      <p className="text-xs text-slate-500 ">Producto: {recipe.product.name}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(recipe)}
                        className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50  rounded-lg transition-all"
                        title="Editar Receta"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRecipe(recipe.id, recipe.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50  rounded-lg transition-all"
                        title="Eliminar Receta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Resumen Financiero de la Receta */}
                  <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-slate-50  rounded-xl text-center text-xs">
                    <div>
                      <span className="text-slate-500  block text-[10px]">Costo Insumos</span>
                      <strong className="text-slate-800  text-sm">${recipeCost.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500  block text-[10px]">Precio Venta</span>
                      <strong className="text-blue-600  text-sm">${sellPrice.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500  block text-[10px]">Margen</span>
                      <strong className={`text-sm ${marginPct >= 60 ? 'text-emerald-600 ' : marginPct >= 30 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {marginPct.toFixed(1)}%
                      </strong>
                    </div>
                  </div>

                  {/* Insumos */}
                  <div className="mt-4 space-y-1.5">
                    <span className="text-xs font-semibold text-slate-700  block">
                      Insumos ({recipe.ingredients.length}):
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {recipe.ingredients.map(ing => (
                        <div 
                          key={ing.id}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50  border border-slate-100 "
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                            <span className="text-slate-700  truncate">{ing.product.name}</span>
                          </div>
                          <span className="font-semibold text-slate-900  shrink-0 ml-2">
                            {ing.quantity} {ing.product.unit || 'pza'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {recipe.instructions && (
                  <div className="mt-4 pt-3 border-t border-slate-100  text-xs text-slate-500  line-clamp-2">
                    <strong className="text-slate-700 ">Preparación:</strong> {recipe.instructions}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Receta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white  rounded-2xl border border-slate-200  p-6 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 ">
              {editingRecipeId ? 'Editar Receta' : 'Nueva Receta de Platillo / Bebida'}
            </h3>
            <p className="text-xs text-slate-500  mt-0.5">
              Define los insumos e ingredientes exactos que componen este platillo
            </p>

            <form onSubmit={handleSaveRecipeSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700  mb-1">
                    Platillo / Bebida del Menú
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      const prod = dishProducts.find(p => p.id === e.target.value);
                      if (prod && !recipeName) setRecipeName(`Receta ${prod.name}`);
                    }}
                    required
                    className="w-full px-3.5 py-2 text-sm bg-slate-50  border border-slate-200  rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 "
                  >
                    <option value="">Selecciona un platillo...</option>
                    {dishProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Precio: ${p.price.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700  mb-1">
                    Nombre de la Receta / Ficha
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Hamburguesa Clásica con Queso"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50  border border-slate-200  rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 "
                  />
                </div>
              </div>

              {/* Insumos de la Receta */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800  flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-purple-500" />
                    Insumos e Ingredientes
                  </label>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    className="flex items-center gap-1 text-xs font-semibold text-purple-600  hover:text-purple-700 bg-purple-50  px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar Insumo
                  </button>
                </div>

                {stagedIngredients.length === 0 ? (
                  <div className="p-4 text-center bg-slate-50  rounded-xl border border-dashed border-slate-200  text-xs text-slate-500">
                    Haz clic en "+ Agregar Insumo" para añadir los ingredientes necesarios.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {stagedIngredients.map((item, idx) => {
                      const selectedIng = rawIngredients.find(r => r.id === item.productId);
                      const costPerUnit = selectedIng?.cost || 0;
                      const subtotalIng = costPerUnit * (item.quantity || 0);

                      return (
                        <div 
                          key={idx}
                          className="flex items-center gap-2 p-2 bg-slate-50  rounded-xl border border-slate-200 "
                        >
                          <div className="flex-1">
                            <select
                              value={item.productId}
                              onChange={(e) => handleUpdateIngredient(idx, 'productId', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-white  border border-slate-200  rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 "
                            >
                              {rawIngredients.map(ing => (
                                <option key={ing.id} value={ing.id}>
                                  {ing.name} ({ing.unit || 'pza'} - Costo: ${ing.cost.toFixed(2)})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-24">
                            <input
                              type="number"
                              step="any"
                              min="0.001"
                              placeholder="Cant."
                              value={item.quantity}
                              onChange={(e) => handleUpdateIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white  border border-slate-200  rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500  text-right"
                            />
                          </div>

                          <span className="text-[11px] text-slate-500 w-12 text-center">
                            {selectedIng?.unit || 'pza'}
                          </span>

                          <span className="text-xs font-bold text-slate-800  w-20 text-right">
                            ${subtotalIng.toFixed(2)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveIngredientRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Resumen en Vivo del Costo */}
              <div className="p-4 bg-purple-50/50  rounded-xl border border-purple-100  space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700 ">
                  <span>Costo Teórico de la Receta:</span>
                  <strong className="text-purple-600 ">${calculatedTheoreticalCost.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 ">
                  <span>Precio de Venta al Público:</span>
                  <strong className="text-blue-600 ">${price.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-700  pt-1 border-t border-purple-200 ">
                  <span>Margen Bruto de Ganancia:</span>
                  <strong className={`${profitMarginPct >= 60 ? 'text-emerald-600 ' : 'text-amber-600'}`}>
                    ${grossProfit.toFixed(2)} ({profitMarginPct.toFixed(1)}%)
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700  mb-1">
                  Instrucciones de Preparación (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Pasos, temperatura, tiempo de cocción, emplatado..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50  border border-slate-200  rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 "
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 ">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600  hover:bg-slate-100  rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-500/20 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSaving ? 'Guardando...' : 'Guardar Receta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
