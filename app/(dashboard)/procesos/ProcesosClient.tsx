'use client';

import React, { useState } from 'react';
import { createProductionOrder, advanceProductionOrder } from '@/app/actions/manufacturing';
import { Plus, ChevronRight, CheckCircle2, Clock, ChefHat, LayoutGrid, List, ChevronDown, ChevronUp, Search } from 'lucide-react';

export default function ProcesosClient({ processes, recipes, initialOrders }: any) {
  const [orders, setOrders] = useState(initialOrders);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'kanban' | 'list'>('kanban');
  
  // Search / Filters for List View
  const [listSearch, setListSearch] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedIngredients, setExpandedIngredients] = useState<Record<string, boolean>>({});

  // Form State
  const [recipeId, setRecipeId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateOrder = async () => {
    if (!recipeId || quantity <= 0) return;
    setIsSubmitting(true);
    try {
      const res = await createProductionOrder(recipeId, quantity);
      window.location.reload();
    } catch (e) {
      alert('Error creando orden de producción');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvanceProcess = async (orderId: string) => {
    try {
      const res = await advanceProductionOrder(orderId);
      if (res && !res.success) {
        alert(res.error || 'Error al avanzar la orden');
      } else {
        window.location.reload();
      }
    } catch (e) {
      alert('Error avanzando orden');
    }
  };

  // Helper to calculate progress percentage
  const getProgressPercent = (order: any) => {
    if (order.status === 'COMPLETED') return 100;
    if (order.status === 'PENDING') return 0;
    if (processes.length === 0) return 0;
    const idx = processes.findIndex((p: any) => p.id === order.currentProcessId);
    if (idx === -1) return 0;
    return Math.round(((idx + 1) / (processes.length + 1)) * 100);
  };

  // Helper to get status string/label
  const getStatusLabel = (order: any) => {
    if (order.status === 'COMPLETED') return 'Completado';
    if (order.status === 'PENDING') return 'Pendiente';
    return order.currentProcess?.name || 'En Proceso';
  };

  const toggleIngredients = (orderId: string) => {
    setExpandedIngredients(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Filter orders for list view
  const filteredListOrders = orders.filter((order: any) => {
    const matchesSearch = order.recipe?.name?.toLowerCase().includes(listSearch.toLowerCase()) || 
                          order.recipe?.product?.sku?.toLowerCase().includes(listSearch.toLowerCase());
    const matchesCompleted = showCompleted ? true : order.status !== 'COMPLETED';
    return matchesSearch && matchesCompleted;
  });

  // Kanban groups
  const pendingOrders = orders.filter((o: any) => o.status === 'PENDING');
  const inProgressOrders = orders.filter((o: any) => o.status === 'IN_PROGRESS');
  const completedOrders = orders.filter((o: any) => o.status === 'COMPLETED').slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', fontFamily: 'var(--font-geist-sans)' }}>
      
      {/* Top action row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Tab Selector */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--pulpos-border)', gap: '1.5rem', flex: 1 }}>
          <button
            onClick={() => setActiveTab('kanban')}
            style={{
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'kanban' ? '3px solid var(--pulpos-primary)' : '3px solid transparent',
              color: activeTab === 'kanban' ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            <LayoutGrid size={18} /> Tablero Kanban (Procesos)
          </button>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'list' ? '3px solid var(--pulpos-primary)' : '3px solid transparent',
              color: activeTab === 'list' ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            <List size={18} /> Listado de Producción
          </button>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--pulpos-primary)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
        >
          <Plus size={18} /> Nueva Orden
        </button>
      </div>

      {/* RENDER VIEWS */}
      {activeTab === 'kanban' ? (
        
        /* KANBAN BOARD */
        <div style={{ display: 'flex', gap: '1.5rem', flex: 1, overflowX: 'auto', paddingBottom: '1rem', minHeight: '500px' }}>
          
          {/* Pendientes Column */}
          <div style={{ flex: '0 0 340px', backgroundColor: 'var(--pulpos-sidebar-bg)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: 0, paddingBottom: '0.5rem', borderBottom: '2px solid var(--pulpos-border)', color: 'var(--pulpos-text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Pendientes</span>
              <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--pulpos-border)', padding: '0.1rem 0.5rem', borderRadius: '10px' }}>{pendingOrders.length}</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
              {pendingOrders.map((order: any) => (
                <OrderCard key={order.id} order={order} onAdvance={handleAdvanceProcess} />
              ))}
            </div>
          </div>

          {/* Active Process Columns */}
          {processes.map((proc: any) => {
            const currentOrders = inProgressOrders.filter((o: any) => o.currentProcessId === proc.id);
            return (
              <div key={proc.id} style={{ flex: '0 0 340px', backgroundColor: 'var(--pulpos-sidebar-bg)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: 0, paddingBottom: '0.5rem', borderBottom: `2px solid var(--pulpos-primary)`, color: 'var(--pulpos-text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{proc.name}</span>
                  <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--pulpos-primary)', color: 'white', padding: '0.1rem 0.5rem', borderRadius: '10px' }}>{currentOrders.length}</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
                  {currentOrders.map((order: any) => (
                    <OrderCard key={order.id} order={order} onAdvance={handleAdvanceProcess} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Completed Column */}
          <div style={{ flex: '0 0 340px', backgroundColor: 'var(--pulpos-sidebar-bg)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', opacity: 0.9 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: 0, paddingBottom: '0.5rem', borderBottom: '2px solid #22c55e', color: 'var(--pulpos-text)' }}>
              Completados Recientes
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
              {completedOrders.map((order: any) => (
                <div key={order.id} style={{ backgroundColor: 'var(--pulpos-card-bg)', borderRadius: '8px', padding: '1rem', border: '1px solid #22c55e', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--pulpos-text)' }}>{order.recipe.name}</span>
                    <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '1rem' }}>x{order.targetQuantity}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle2 size={14} color="#22c55e" /> Finalizado e incrementado stock
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      ) : (

        /* LIST VIEW */
        <div style={{ backgroundColor: 'white', border: '1px solid var(--pulpos-border)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Buscar por receta o SKU..."
                value={listSearch}
                onChange={e => setListSearch(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)', fontSize: '0.875rem', outline: 'none', backgroundColor: 'var(--pulpos-bg)', color: 'var(--pulpos-text)' }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--pulpos-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
              <input 
                type="checkbox" 
                checked={showCompleted}
                onChange={e => setShowCompleted(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>Mostrar órdenes completadas</span>
            </label>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--pulpos-border)', color: 'var(--pulpos-text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Receta / Producto</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Cantidad</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Proceso Actual / Estado</th>
                  <th style={{ padding: '0.75rem 1rem', width: '200px' }}>Progreso</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Creado Por</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Fecha de Inicio</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.9rem', color: 'var(--pulpos-text)' }}>
                {filteredListOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--pulpos-text-muted)' }}>
                      No se encontraron órdenes de producción activas.
                    </td>
                  </tr>
                ) : (
                  filteredListOrders.map((order: any) => {
                    const isDone = order.status === 'COMPLETED';
                    const progress = getProgressPercent(order);
                    const isExpanded = !!expandedIngredients[order.id];
                    return (
                      <React.Fragment key={order.id}>
                        <tr style={{ borderBottom: '1px solid var(--pulpos-border)', backgroundColor: isDone ? 'rgba(34, 197, 94, 0.02)' : 'transparent' }}>
                          <td style={{ padding: '1rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <button 
                                onClick={() => toggleIngredients(order.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pulpos-text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                              <div>
                                <div style={{ fontWeight: 'bold' }}>{order.recipe?.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>SKU: {order.recipe?.product?.sku || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem 1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1rem' }}>x{order.targetQuantity}</td>
                          <td style={{ padding: '1rem 1rem' }}>
                            <span style={{ 
                              padding: '0.2rem 0.6rem', 
                              borderRadius: '4px', 
                              fontWeight: 'bold', 
                              fontSize: '0.8rem',
                              backgroundColor: isDone ? '#dcfce7' : order.status === 'PENDING' ? '#f1f5f9' : '#e0e7ff',
                              color: isDone ? '#16a34a' : order.status === 'PENDING' ? '#475569' : '#4f46e5'
                            }}>
                              {getStatusLabel(order)}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ flex: 1, backgroundColor: 'var(--pulpos-border)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${progress}%`, backgroundColor: isDone ? '#22c55e' : 'var(--pulpos-primary)', height: '100%', borderRadius: '4px' }} />
                              </div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', minWidth: '35px', textAlign: 'right' }}>{progress}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '1rem 1rem', color: 'var(--pulpos-text-muted)' }}>{order.user?.name || order.user?.email || 'N/A'}</td>
                          <td style={{ padding: '1rem 1rem', color: 'var(--pulpos-text-muted)', fontSize: '0.8rem' }}>{new Date(order.createdAt).toLocaleString()}</td>
                          <td style={{ padding: '1rem 1rem', textAlign: 'right' }}>
                            {!isDone && (
                              <button
                                onClick={() => handleAdvanceProcess(order.id)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem', backgroundColor: 'white', color: 'var(--pulpos-primary)', border: '1px solid var(--pulpos-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--pulpos-primary)'; e.currentTarget.style.color = 'white'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = 'var(--pulpos-primary)'; }}
                              >
                                {order.status === 'PENDING' ? 'Iniciar' : 'Siguiente'} <ChevronRight size={14} />
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Collapsible Ingredients Sub-Row */}
                        {isExpanded && (
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            <td colSpan={7} style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--pulpos-border)' }}>
                              <div style={{ maxWidth: '500px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Insumos Requeridos para {order.targetQuantity} unidades:</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem', backgroundColor: 'white' }}>
                                  {order.recipe?.ingredients && order.recipe.ingredients.length > 0 ? (
                                    order.recipe.ingredients.map((ing: any) => {
                                      const totalQty = ing.quantity * order.targetQuantity;
                                      return (
                                        <div key={ing.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                          <span style={{ color: '#334155' }}>• {ing.product?.name || 'Insumo'}</span>
                                          <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{totalQty} uds <span style={{ color: '#64748b', fontWeight: 'normal', fontSize: '0.75rem' }}>({ing.quantity} x {order.targetQuantity})</span></span>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Esta receta no tiene insumos especificados.</div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NUEVA ORDEN */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--pulpos-card-bg)', padding: '2rem', borderRadius: '12px', width: '420px', border: '1px solid var(--pulpos-border)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>Nueva Orden de Producción</h3>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>Receta a Producir</label>
              <select 
                value={recipeId}
                onChange={e => setRecipeId(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'var(--pulpos-bg)', color: 'var(--pulpos-text)', outline: 'none' }}
              >
                <option value="">Selecciona una receta...</option>
                {recipes.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name} (Produce: {r.product?.name})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>Cantidad</label>
              <input 
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'var(--pulpos-bg)', color: 'var(--pulpos-text)', outline: 'none' }}
              />
            </div>

            {/* Insumos preview in Modal when Recipe is selected */}
            {recipeId && (
              <div style={{ marginBottom: '1.5rem', backgroundColor: 'var(--pulpos-bg)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--pulpos-border)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--pulpos-text-muted)' }}>Insumos Estimados a Descontar:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '120px', overflowY: 'auto' }}>
                  {recipes.find((r: any) => r.id === recipeId)?.ingredients?.map((ing: any) => {
                    const totalQty = ing.quantity * (quantity || 0);
                    return (
                      <div key={ing.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--pulpos-text)' }}>
                        <span>• {ing.product?.name || 'Insumo'}</span>
                        <span style={{ fontWeight: 'bold' }}>{totalQty} uds</span>
                      </div>
                    );
                  }) || <div style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>Esta receta no requiere insumos.</div>}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '0.7rem 1.25rem', border: '1px solid var(--pulpos-border)', backgroundColor: 'transparent', color: 'var(--pulpos-text)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
                Cancelar
              </button>
              <button 
                onClick={handleCreateOrder} 
                disabled={isSubmitting || !recipeId || quantity <= 0}
                style={{ padding: '0.7rem 1.25rem', border: 'none', backgroundColor: 'var(--pulpos-primary)', color: 'white', borderRadius: '6px', cursor: (isSubmitting || !recipeId || quantity <= 0) ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.9rem', opacity: (isSubmitting || !recipeId || quantity <= 0) ? 0.6 : 1 }}
              >
                {isSubmitting ? 'Creando...' : 'Crear Orden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onAdvance }: { order: any, onAdvance: (id: string) => void }) {
  return (
    <div style={{ backgroundColor: 'var(--pulpos-card-bg)', borderRadius: '8px', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid var(--pulpos-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--pulpos-text)', fontSize: '1.05rem' }}>{order.recipe.name}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)' }}>SKU: {order.recipe.product?.sku || 'N/A'}</span>
        </div>
        <span style={{ backgroundColor: 'var(--pulpos-primary)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>
          x{order.targetQuantity}
        </span>
      </div>
      
      {/* Recipe Ingredients display */}
      {order.recipe.ingredients && order.recipe.ingredients.length > 0 && (
        <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--pulpos-bg)', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--pulpos-border)' }}>
          <div style={{ fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.3rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Insumos a Agregar:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {order.recipe.ingredients.map((ing: any) => {
              const totalQty = ing.quantity * order.targetQuantity;
              return (
                <div key={ing.id} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--pulpos-text)' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={ing.product?.name}>• {ing.product?.name}</span>
                  <span style={{ fontWeight: 'bold' }}>{totalQty} uds</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <ChefHat size={12} /> 
        Creado por: {order.user?.name || order.user?.email?.split('@')[0]}
      </div>

      <button 
        onClick={() => onAdvance(order.id)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.65rem', backgroundColor: 'var(--pulpos-bg)', color: 'var(--pulpos-primary)', border: '1px solid var(--pulpos-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--pulpos-primary)'; e.currentTarget.style.color = 'white'; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--pulpos-bg)'; e.currentTarget.style.color = 'var(--pulpos-primary)'; }}
      >
        {order.status === 'PENDING' ? 'Iniciar Producción' : 'Siguiente Paso'} <ChevronRight size={16} />
      </button>
    </div>
  );
}
