'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChefHat, Send, Plus, Minus, Trash2, ArrowLeft, 
  Receipt, Clock, Users, Search, Sparkles, Check, 
  AlertCircle, MessageSquarePlus, Tag, Utensils,
  Layers, ChevronRight, CheckCircle2
} from 'lucide-react';
import { 
  addItemsToOrder, sendPendingItemsToKitchen, cancelOrderItem, requestTableBill 
} from '@/app/actions/restaurantActions';

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  imageUrl?: string | null;
  stock: number;
  unit: string;
  kitchenStationId?: string | null;
  variants?: Array<{ id: string; attribute: string; price?: number | null }>;
  Recipe?: any;
}

interface ModifierOption {
  name: string;
  extraPrice: number;
  ingredientProductId?: string;
  ingredientQty?: number;
}

interface StagedItem {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  course: 'STARTER' | 'MAIN' | 'DESSERT' | 'DRINK' | 'SIDE' | string;
  dinerNumber: number;
  notes?: string;
  modifiers: ModifierOption[];
}

const MEAT_DONENESS_OPTIONS = [
  { id: 'Rojo', label: 'Término Rojo / Inglés', badge: '1/4' },
  { id: 'Medio', label: 'Término Medio', badge: '1/2' },
  { id: 'Tres Cuartos', label: 'Tres Cuartos (3/4)', badge: '3/4' },
  { id: 'Bien Cocido', label: 'Bien Cocido', badge: '100%' },
];

export default function ComandaClient({
  table,
  activeOrder,
  products,
  categories,
  currentUserId
}: {
  table: any;
  activeOrder: any;
  products: Product[];
  categories: string[];
  currentUserId?: string;
}) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || 'ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
  const [selectedDiner, setSelectedDiner] = useState<number>(1);
  const [selectedCourse, setSelectedCourse] = useState<string>('MAIN');

  // Modal para personalizar platillo (Término de carne + Anotaciones especiales)
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedMeatDoneness, setSelectedMeatDoneness] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [customQuantity, setCustomQuantity] = useState<number>(1);
  const [customVariantId, setCustomVariantId] = useState<string>('');

  const [isSending, setIsSending] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);

  // Filtrado de productos
  const filteredProducts = products.filter(p => {
    const matchCategory = selectedCategory === 'ALL' || (p.category || 'General') === selectedCategory;
    const matchSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleOpenCustomize = (product: Product) => {
    setCustomizingProduct(product);
    setCustomQuantity(1);
    setSelectedMeatDoneness('');
    setCustomNotes('');
    setCustomVariantId(product.variants?.[0]?.id || '');
  };

  const handleQuickAdd = (product: Product) => {
    const newItem: StagedItem = {
      id: `staged-${Date.now()}-${Math.random()}`,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.price,
      course: selectedCourse,
      dinerNumber: selectedDiner,
      modifiers: []
    };
    setStagedItems(prev => [...prev, newItem]);
  };

  const handleAddCustomizedItem = () => {
    if (!customizingProduct) return;

    let price = customizingProduct.price;
    let variantName: string | undefined;

    if (customVariantId) {
      const v = customizingProduct.variants?.find(varnt => varnt.id === customVariantId);
      if (v) {
        variantName = v.attribute;
        if (v.price && v.price > 0) price = v.price;
      }
    }

    const noteParts: string[] = [];
    if (selectedMeatDoneness) {
      noteParts.push(`Término: ${selectedMeatDoneness}`);
    }
    if (customNotes.trim()) {
      noteParts.push(customNotes.trim());
    }

    const combinedNotes = noteParts.join(' • ');

    const newItem: StagedItem = {
      id: `staged-${Date.now()}-${Math.random()}`,
      productId: customizingProduct.id,
      productName: customizingProduct.name,
      variantId: customVariantId || undefined,
      variantName,
      quantity: customQuantity,
      unitPrice: price,
      course: selectedCourse,
      dinerNumber: selectedDiner,
      notes: combinedNotes || undefined,
      modifiers: []
    };

    setStagedItems(prev => [...prev, newItem]);
    setCustomizingProduct(null);
  };

  const handleUpdateStagedQuantity = (itemId: string, delta: number) => {
    setStagedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as StagedItem[]);
  };

  const handleRemoveStagedItem = (itemId: string) => {
    setStagedItems(prev => prev.filter(i => i.id !== itemId));
  };

  // Enviar comanda a cocina
  const handleSendToKitchen = async () => {
    if (stagedItems.length === 0) return;
    setIsSending(true);

    try {
      const payloadItems = stagedItems.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        notes: i.notes,
        course: i.course,
        dinerNumber: i.dinerNumber,
        modifiers: i.modifiers
      }));

      const res = await addItemsToOrder({
        orderId: activeOrder.id,
        items: payloadItems,
        sendToKitchenImmediately: true
      });

      if (res.success) {
        setStagedItems([]);
        router.refresh();
      } else {
        alert(res.error || 'Error al enviar a cocina');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelSavedItem = async (itemId: string) => {
    const reason = prompt('Motivo de cancelación del platillo:');
    if (reason === null) return;
    const res = await cancelOrderItem(itemId, reason);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || 'Error al cancelar');
    }
  };

  const handleRequestBillClick = async () => {
    if (!confirm('¿Deseas solicitar la pre-cuenta para esta mesa?')) return;
    setIsRequestingBill(true);
    const res = await requestTableBill(activeOrder.id);
    if (res.success) {
      router.push(`/restaurante/cuenta/${activeOrder.id}`);
    } else {
      alert(res.error || 'Error al solicitar cuenta');
      setIsRequestingBill(false);
    }
  };

  const stagedSubtotal = stagedItems.reduce((acc, item) => {
    let itemPrice = item.unitPrice;
    item.modifiers.forEach(m => itemPrice += m.extraPrice);
    return acc + (itemPrice * item.quantity);
  }, 0);

  const grandTotal = (activeOrder?.total || 0) + stagedSubtotal;
  const existingItems = activeOrder?.items || [];

  const getCourseBadge = (course: string) => {
    switch (course) {
      case 'STARTER': return { label: 'Entrada', bg: 'bg-emerald-100 text-emerald-700  ' };
      case 'MAIN': return { label: 'Fuerte', bg: 'bg-blue-100 text-blue-700  ' };
      case 'DESSERT': return { label: 'Postre', bg: 'bg-pink-100 text-pink-700  ' };
      case 'DRINK': return { label: 'Bebida', bg: 'bg-amber-100 text-amber-700  ' };
      default: return { label: 'Servicio', bg: 'bg-slate-100 text-slate-700 ' };
    }
  };

  const getItemStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return { label: 'Pendiente', color: 'text-slate-500 bg-slate-100' };
      case 'SENT_TO_KITCHEN': return { label: 'En Cocina', color: 'text-amber-600 bg-amber-50 ' };
      case 'IN_PREP': return { label: 'Preparando', color: 'text-amber-600 bg-amber-50 ' };
      case 'READY': return { label: '¡Listo!', color: 'text-purple-600 bg-purple-50  font-bold' };
      case 'SERVED': return { label: 'Servido', color: 'text-emerald-600 bg-emerald-50 ' };
      case 'CANCELLED': return { label: 'Cancelado', color: 'text-rose-600 bg-rose-50 line-through' };
      default: return { label: status, color: 'text-slate-500 bg-slate-100' };
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-[1700px] mx-auto overflow-hidden">
      {/* Barra Superior */}
      <div className="bg-white  border-b border-slate-200  px-4 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/restaurante/mesas"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100   rounded-xl transition-all"
            title="Regresar a Mesas"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 ">
                {table.name}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700   font-semibold">
                {table.area?.name}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                #{activeOrder?.folio || 'S/F'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              <span>Mesero: <strong className="text-slate-700 ">{activeOrder?.waiter?.name}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {activeOrder?.dinersCount} comensales
              </span>
            </div>
          </div>
        </div>

        {/* Asignación Rápida de Comensal y Tiempo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100  p-1 rounded-xl">
            <span className="text-xs font-semibold px-2 text-slate-500">Asignar a:</span>
            {Array.from({ length: Math.max(4, activeOrder?.dinersCount || 1) }, (_, i) => i + 1).map(num => (
              <button
                key={num}
                onClick={() => setSelectedDiner(num)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedDiner === num
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600  hover:bg-slate-200 '
                }`}
              >
                C{num}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-100  p-1 rounded-xl">
            {[
              { id: 'STARTER', label: 'Entrada' },
              { id: 'MAIN', label: 'Fuerte' },
              { id: 'DESSERT', label: 'Postre' },
              { id: 'DRINK', label: 'Bebida' }
            ].map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCourse(c.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  selectedCourse === c.id
                    ? 'bg-slate-900 text-white   shadow-sm'
                    : 'text-slate-600  hover:bg-slate-200 '
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menú y Comanda */}
      <div className="flex-1 flex overflow-hidden">
        {/* LADO IZQUIERDO: Menú Táctil */}
        <div className="flex-1 flex flex-col bg-slate-50  overflow-hidden border-r border-slate-200 ">
          <div className="p-4 bg-white  border-b border-slate-200  space-y-3 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar platillo, bebida o código..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100  border-0 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-slate-900 "
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === 'ALL'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100  text-slate-600  hover:bg-slate-200'
                }`}
              >
                Todos ({products.length})
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-100  text-slate-600  hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map(product => {
                const hasRecipe = product.Recipe && product.Recipe.ingredients?.length > 0;
                return (
                  <div
                    key={product.id}
                    className="group relative bg-white  p-3.5 rounded-2xl border border-slate-200  hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h3 className="text-sm font-bold text-slate-900  line-clamp-2 leading-snug">
                          {product.name}
                        </h3>
                        {hasRecipe && (
                          <span className="shrink-0 p-1 rounded-md bg-amber-50 text-amber-600  text-[10px] font-bold" title="Tiene receta BOM">
                            REC
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mb-2">
                        {product.category || 'General'}
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100  flex items-center justify-between gap-2">
                      <span className="text-base font-extrabold text-purple-600 ">
                        ${product.price.toFixed(2)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenCustomize(product)}
                          className="p-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200   rounded-lg transition-all"
                          title="Personalizar / Modificadores"
                        >
                          <MessageSquarePlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleQuickAdd(product)}
                          className="p-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-all"
                          title="Agregar rápido"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* LADO DERECHO: Comanda Activa */}
        <div className="w-full max-w-md bg-white  flex flex-col shrink-0 shadow-lg">
          <div className="p-4 border-b border-slate-200  flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900  flex items-center gap-2">
                <Receipt className="w-4 h-4 text-purple-600" />
                Comanda de Mesa
              </h2>
              <span className="text-xs text-slate-500">
                {existingItems.length} enviados • {stagedItems.length} por enviar
              </span>
            </div>
            <span className="text-lg font-extrabold text-slate-900 ">
              ${grandTotal.toFixed(2)}
            </span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {/* ÍTEMS ENVIADOS */}
            {existingItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>Enviados a Cocina ({existingItems.length})</span>
                  <span>Estado</span>
                </div>

                <div className="space-y-2">
                  {existingItems.map((item: any) => {
                    const statusBadge = getItemStatusBadge(item.status);
                    const courseBadge = getCourseBadge(item.course);

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition-all ${
                          item.status === 'READY'
                            ? 'bg-purple-50/60  border-purple-200 '
                            : item.status === 'CANCELLED'
                            ? 'bg-slate-50  border-slate-200 opacity-60'
                            : 'bg-slate-50  border-slate-200 '
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-purple-600 bg-purple-50  px-1.5 py-0.5 rounded">
                                C{item.dinerNumber}
                              </span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${courseBadge.bg}`}>
                                {courseBadge.label}
                              </span>
                              <span className="text-sm font-bold text-slate-800 ">
                                {item.quantity}x {item.product.name}
                              </span>
                            </div>

                            {item.modifiers && item.modifiers.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.modifiers.map((m: any, idx: number) => (
                                  <span key={idx} className="text-[11px] text-amber-600  bg-amber-50  px-1.5 py-0.5 rounded">
                                    +{m.name} (${m.extraPrice})
                                  </span>
                                ))}
                              </div>
                            )}

                            {item.notes && (
                              <p className="text-xs text-slate-500 italic mt-1">
                                💬 {item.notes}
                              </p>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-slate-900  block">
                              ${(item.unitPrice * item.quantity).toFixed(2)}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block mt-1 font-semibold ${statusBadge.color}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                        </div>

                        {item.status !== 'CANCELLED' && item.status !== 'SERVED' && (
                          <div className="mt-2 pt-2 border-t border-slate-200/60  flex justify-end">
                            <button
                              onClick={() => handleCancelSavedItem(item.id)}
                              className="text-[11px] text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Cancelar platillo
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ÍTEMS POR ENVIAR */}
            {stagedItems.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-dashed border-slate-200 ">
                <div className="flex items-center justify-between text-xs font-bold text-amber-600  uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Nuevos por Enviar ({stagedItems.length})
                  </span>
                  <span>${stagedSubtotal.toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  {stagedItems.map(item => {
                    const courseBadge = getCourseBadge(item.course);

                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-amber-50/50  border border-amber-200  rounded-xl space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-purple-600 bg-blue-100  px-1.5 py-0.5 rounded">
                                C{item.dinerNumber}
                              </span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${courseBadge.bg}`}>
                                {courseBadge.label}
                              </span>
                              <span className="text-sm font-bold text-slate-900 ">
                                {item.productName}
                              </span>
                            </div>

                            {item.variantName && (
                              <p className="text-xs text-slate-500">Var: {item.variantName}</p>
                            )}

                            {item.modifiers.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.modifiers.map((m, idx) => (
                                  <span key={idx} className="text-[11px] text-amber-700  bg-amber-100  px-1.5 py-0.5 rounded">
                                    +{m.name} (${m.extraPrice})
                                  </span>
                                ))}
                              </div>
                            )}

                            {item.notes && (
                              <p className="text-xs text-slate-600  italic mt-0.5">
                                💬 {item.notes}
                              </p>
                            )}
                          </div>

                          <span className="text-xs font-bold text-slate-900 ">
                            ${(item.unitPrice * item.quantity).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-amber-100 ">
                          <button
                            onClick={() => handleRemoveStagedItem(item.id)}
                            className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Quitar
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateStagedQuantity(item.id, -1)}
                              className="w-6 h-6 rounded-lg bg-white  text-slate-700  border border-slate-200  flex items-center justify-center font-bold text-xs"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold px-1">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateStagedQuantity(item.id, 1)}
                              className="w-6 h-6 rounded-lg bg-white  text-slate-700  border border-slate-200  flex items-center justify-center font-bold text-xs"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {existingItems.length === 0 && stagedItems.length === 0 && (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Utensils className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-medium">La comanda está vacía</p>
                <p className="text-xs text-slate-400">Selecciona platillos del menú de la izquierda para comenzar</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50  border-t border-slate-200  space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 ">Total Acumulado:</span>
              <span className="text-xl font-black text-slate-900 ">
                ${grandTotal.toFixed(2)}
              </span>
            </div>

            {stagedItems.length > 0 ? (
              <button
                onClick={handleSendToKitchen}
                disabled={isSending}
                className="w-full py-3.5 px-4 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isSending ? 'Enviando a Cocina...' : `Enviar a Cocina (${stagedItems.length} platillos)`}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleRequestBillClick}
                  disabled={isRequestingBill || existingItems.length === 0}
                  className="py-3 px-3 text-xs font-bold text-slate-700  bg-slate-200  hover:bg-slate-300 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Receipt className="w-4 h-4" />
                  Pre-cuenta
                </button>

                <Link
                  href={`/restaurante/cuenta/${activeOrder.id}`}
                  className="py-3 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Receipt className="w-4 h-4" />
                  Cobrar Mesa
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Personalizar Platillo */}
      {customizingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white  rounded-3xl max-w-lg w-full p-6 border border-slate-200  shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 ">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50  px-2 py-0.5 rounded-md border border-purple-200 ">
                  Opciones de Platillo
                </span>
                <h3 className="text-lg font-black text-slate-900  mt-1">
                  {customizingProduct.name}
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Precio Base: <span className="text-purple-600 font-bold">${customizingProduct.price.toFixed(2)}</span>
                </p>
              </div>
              <button
                onClick={() => setCustomizingProduct(null)}
                className="text-slate-400 hover:text-slate-600  text-lg font-bold p-1 rounded-lg hover:bg-slate-100  transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Variante / Tamaño si existen */}
              {customizingProduct.variants && customizingProduct.variants.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700  uppercase tracking-wider mb-2">
                    Variante / Tamaño
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {customizingProduct.variants.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setCustomVariantId(v.id)}
                        className={`p-2.5 text-xs font-bold rounded-xl border text-left transition-all ${
                          customVariantId === v.id
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                            : 'bg-slate-50  text-slate-700  border-slate-200  hover:bg-slate-100'
                        }`}
                      >
                        {v.attribute} {v.price ? `(${v.price.toFixed(2)})` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 1. TÉRMINO DE LA CARNE */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700  uppercase tracking-wider flex items-center gap-1.5">
                    🥩 Término de la Carne
                  </label>
                  {selectedMeatDoneness && (
                    <button
                      type="button"
                      onClick={() => setSelectedMeatDoneness('')}
                      className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 hover:underline"
                    >
                      Quitar término
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {MEAT_DONENESS_OPTIONS.map(opt => {
                    const isSelected = selectedMeatDoneness === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedMeatDoneness(isSelected ? '' : opt.id)}
                        className={`p-2.5 text-xs font-bold rounded-xl border flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20 ring-2 ring-purple-400/40'
                            : 'bg-slate-50  text-slate-700  border-slate-200  hover:bg-slate-100 '
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200  text-slate-600 '}`}>
                          {opt.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. ANOTACIONES ESPECIALES */}
              <div>
                <label className="block text-xs font-bold text-slate-700  uppercase tracking-wider mb-1.5">
                  📝 Anotaciones Especiales para Cocina
                </label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Ej. Sin cebolla, salsa aparte, alérgico a mariscos, bien dorado..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50  border border-slate-200  rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-slate-900  placeholder:text-slate-400 resize-none"
                />
              </div>

              {/* 3. CANTIDAD */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 ">
                <span className="text-xs font-bold text-slate-700  uppercase tracking-wider">
                  Cantidad:
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCustomQuantity(q => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200   text-slate-700  flex items-center justify-center font-bold transition-all"
                  >
                    -
                  </button>
                  <span className="text-base font-bold px-2 text-slate-900 ">{customQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setCustomQuantity(q => q + 1)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200   text-slate-700  flex items-center justify-center font-bold transition-all"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center gap-3 border-t border-slate-100 ">
              <button
                type="button"
                onClick={() => setCustomizingProduct(null)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-600  bg-slate-100  hover:bg-slate-200  rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddCustomizedItem}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
              >
                Agregar a Comanda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
