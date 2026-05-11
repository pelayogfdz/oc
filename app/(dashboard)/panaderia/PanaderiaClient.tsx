'use client';

import React, { useState } from 'react';
import { createProductionOrder, advanceProductionOrder } from '@/app/actions/manufacturing';
import { Plus, ChevronRight, CheckCircle2, Clock, ChefHat } from 'lucide-react';

export default function PanaderiaClient({ processes, recipes, initialOrders }: any) {
  const [orders, setOrders] = useState(initialOrders);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [recipeId, setRecipeId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);

  const handleCreateOrder = async () => {
    if (!recipeId || quantity <= 0) return;
    try {
      await createProductionOrder(recipeId, quantity);
      window.location.reload(); // Para simplificar actualización de datos y relaciones
    } catch (e) {
      alert('Error creando orden de producción');
    }
  };

  const handleAdvanceProcess = async (orderId: string) => {
    try {
      await advanceProductionOrder(orderId);
      window.location.reload();
    } catch (e) {
      alert('Error avanzando orden');
    }
  };

  // Agrupar órdenes por estado/proceso para la vista Kanban
  const pendingOrders = orders.filter((o: any) => o.status === 'PENDING');
  const inProgressOrders = orders.filter((o: any) => o.status === 'IN_PROGRESS');
  const completedOrders = orders.filter((o: any) => o.status === 'COMPLETED').slice(0, 10); // Solo las 10 más recientes

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--pulpos-primary)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
        >
          <Plus size={20} /> Nueva Orden de Producción
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, overflowX: 'auto', paddingBottom: '1rem' }}>
        
        {/* Kanban Column: PENDIENTES */}
        <div style={{ flex: '0 0 320px', backgroundColor: 'var(--pulpos-sidebar-bg)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, paddingBottom: '0.5rem', borderBottom: '2px solid var(--pulpos-border)', color: 'var(--pulpos-text)' }}>
            Pendientes ({pendingOrders.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            {pendingOrders.map((order: any) => (
              <OrderCard key={order.id} order={order} onAdvance={handleAdvanceProcess} />
            ))}
          </div>
        </div>

        {/* Kanban Columns: PROCESOS ACTIVOS */}
        {processes.map((proc: any) => {
          const currentOrders = inProgressOrders.filter((o: any) => o.currentProcessId === proc.id);
          return (
            <div key={proc.id} style={{ flex: '0 0 320px', backgroundColor: 'var(--pulpos-sidebar-bg)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, paddingBottom: '0.5rem', borderBottom: `2px solid var(--pulpos-primary)`, color: 'var(--pulpos-text)' }}>
                {proc.name} ({currentOrders.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                {currentOrders.map((order: any) => (
                  <OrderCard key={order.id} order={order} onAdvance={handleAdvanceProcess} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Kanban Column: COMPLETADOS */}
        <div style={{ flex: '0 0 320px', backgroundColor: 'var(--pulpos-sidebar-bg)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', opacity: 0.8 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, paddingBottom: '0.5rem', borderBottom: '2px solid #22c55e', color: 'var(--pulpos-text)' }}>
            Completados Recientes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            {completedOrders.map((order: any) => (
              <div key={order.id} style={{ backgroundColor: 'var(--pulpos-card-bg)', borderRadius: '8px', padding: '1rem', border: '1px solid #22c55e' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--pulpos-text)' }}>{order.recipe.name}</span>
                  <span style={{ color: '#22c55e', fontWeight: 'bold' }}>x{order.targetQuantity}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={14} color="#22c55e" /> Finalizado y descontado del inventario
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL NUEVA ORDEN */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--pulpos-card-bg)', padding: '2rem', borderRadius: '12px', width: '400px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>Nueva Orden de Producción</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Receta a Producir</label>
              <select 
                value={recipeId}
                onChange={e => setRecipeId(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'var(--pulpos-bg)', color: 'var(--pulpos-text)' }}
              >
                <option value="">Selecciona una receta...</option>
                {recipes.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name} (Produce: {r.product?.name})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Cantidad</label>
              <input 
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: 'var(--pulpos-bg)', color: 'var(--pulpos-text)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--pulpos-border)', backgroundColor: 'transparent', color: 'var(--pulpos-text)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Cancelar
              </button>
              <button onClick={handleCreateOrder} style={{ padding: '0.75rem 1.5rem', border: 'none', backgroundColor: 'var(--pulpos-primary)', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Crear Orden
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
    <div style={{ backgroundColor: 'var(--pulpos-card-bg)', borderRadius: '8px', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid var(--pulpos-border)', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <span style={{ fontWeight: 'bold', color: 'var(--pulpos-text)', fontSize: '1.1rem' }}>{order.recipe.name}</span>
        <span style={{ backgroundColor: 'var(--pulpos-primary)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>
          x{order.targetQuantity}
        </span>
      </div>
      
      <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ChefHat size={14} /> 
        Creado por: {order.user?.name || order.user?.email}
      </div>

      <button 
        onClick={() => onAdvance(order.id)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--pulpos-bg)', color: 'var(--pulpos-primary)', border: '1px solid var(--pulpos-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
      >
        Siguiente Paso <ChevronRight size={18} />
      </button>
    </div>
  );
}
