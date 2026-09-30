'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import RestaurantNavbar from '../components/RestaurantNavbar';
import { 
  ChefHat, Clock, CheckCircle2, AlertCircle, RefreshCw, 
  Flame, Utensils, Coffee, Wine, Sparkles, Volume2, VolumeX, 
  ArrowLeft, BellRing
} from 'lucide-react';
import { getKitchenOrders, updateOrderItemStatus, getKitchenStations } from '@/app/actions/restaurantActions';

interface OrderItem {
  id: string;
  quantity: number;
  course: string;
  status: string;
  notes?: string | null;
  dinerNumber: number;
  product: { id: string; name: string; unit: string };
  variant?: { attribute: string } | null;
  kitchenStation?: { id: string; name: string; color: string } | null;
  modifiers: Array<{ id: string; name: string; extraPrice: number }>;
}

interface KitchenOrder {
  id: string;
  folio?: string | null;
  openedAt: string | Date;
  table: { id: string; number: number; name: string };
  waiter: { id: string; name: string };
  items: OrderItem[];
}

// Generador de sonido Web Audio nativo para timbre de cocina
function playKitchenBellSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // Nota A5
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // AudioContext might be blocked until first user interaction
  }
}

export default function KDSClient({
  initialOrders,
  stations
}: {
  initialOrders: KitchenOrder[];
  stations: Array<{ id: string; name: string; color: string | null }>;
}) {
  const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders);
  const [activeStationId, setActiveStationId] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const prevOrdersCountRef = useRef(initialOrders.length);

  // Reloj en vivo cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Polling cada 6s para KDS
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await getKitchenOrders(activeStationId);
      if (res.success && res.orders) {
        const newOrders = res.orders as any;
        if (soundEnabled && newOrders.length > prevOrdersCountRef.current) {
          playKitchenBellSound();
        }
        prevOrdersCountRef.current = newOrders.length;
        setOrders(newOrders);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [activeStationId, soundEnabled]);

  const handleRefresh = async () => {
    setIsLoading(true);
    const res = await getKitchenOrders(activeStationId);
    if (res.success && res.orders) {
      setOrders(res.orders as any);
      prevOrdersCountRef.current = res.orders.length;
    }
    setIsLoading(false);
  };

  const handleStatusChange = async (itemId: string, newStatus: 'IN_PREP' | 'READY' | 'SERVED') => {
    // Optimistic update
    setOrders(prev => prev.map(order => ({
      ...order,
      items: order.items.map(item => item.id === itemId ? { ...item, status: newStatus } : item)
    })).filter(order => order.items.some(i => i.status !== 'SERVED' && i.status !== 'CANCELLED')));

    await updateOrderItemStatus(itemId, newStatus);
    handleRefresh();
  };

  const handleMarkAllReady = async (order: KitchenOrder) => {
    for (const item of order.items) {
      if (item.status !== 'READY' && item.status !== 'SERVED' && item.status !== 'CANCELLED') {
        await updateOrderItemStatus(item.id, 'READY');
      }
    }
    handleRefresh();
  };

  const getTimerInfo = (openedAt: string | Date) => {
    const diffMs = currentTime.getTime() - new Date(openedAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);

    let color = 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';
    let urgency = 'NORMAL';

    if (diffMins >= 20) {
      color = 'text-rose-400 bg-rose-950/80 border-rose-500/80 animate-pulse';
      urgency = 'CRITICAL';
    } else if (diffMins >= 10) {
      color = 'text-amber-400 bg-amber-950/60 border-amber-500/50';
      urgency = 'WARNING';
    }

    const formatted = `${String(diffMins).padStart(2, '0')}:${String(diffSecs).padStart(2, '0')}`;
    return { formatted, color, urgency, diffMins };
  };

  const getCourseBadge = (course: string) => {
    switch (course) {
      case 'STARTER': return { label: 'Entrada', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'MAIN': return { label: 'Plato Fuerte', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'DESSERT': return { label: 'Postre', bg: 'bg-pink-500/20 text-pink-300 border-pink-500/30' };
      case 'DRINK': return { label: 'Bebida', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      default: return { label: 'Servicio', bg: 'bg-slate-700 text-slate-300 border-slate-600' };
    }
  };

  // Ordenar platillos por tiempo de comida
  const sortItemsByCourse = (items: OrderItem[]) => {
    const courseWeight: Record<string, number> = {
      'STARTER': 1,
      'MAIN': 2,
      'SIDE': 3,
      'DESSERT': 4,
      'DRINK': 5
    };
    return [...items].sort((a, b) => (courseWeight[a.course] || 99) - (courseWeight[b.course] || 99));
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header KDS */}
      <RestaurantNavbar
        title="Cocina • Pantalla de Producción (KDS)"
        subtitle="Control de preparación de comandas, tiempos de cocción y ruteo a barra y cocina"
        actions={
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              En Vivo ({currentTime.toLocaleTimeString('es-MX')})
            </span>

            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playKitchenBellSound();
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                soundEnabled 
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
              title={soundEnabled ? 'Sonido de timbre activado' : 'Sonido silenciado'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-500" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'Timbre Activo' : 'Silencio'}</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        }
      />

      {/* Selector de Estación de Cocina */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveStationId('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
            activeStationId === 'ALL'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          Todas las Estaciones ({orders.length} comandas)
        </button>
        {stations.map(station => (
          <button
            key={station.id}
            onClick={() => setActiveStationId(station.id)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeStationId === station.id
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span 
              className="w-2.5 h-2.5 rounded-full shadow-sm" 
              style={{ backgroundColor: station.color || '#3B82F6' }} 
            />
            {station.name}
          </button>
        ))}
      </div>

      {/* Grid de Tarjetas de Comanda KDS */}
      {orders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-16 text-center text-slate-500 space-y-3 bg-slate-900/50 rounded-3xl border border-slate-800/80">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-300">¡Cocina al día!</h3>
          <p className="text-sm max-w-sm text-slate-400">
            No hay comandas pendientes de preparación en este momento. Las nuevas órdenes sonarán y aparecerán automáticamente aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map(order => {
            const timer = getTimerInfo(order.openedAt);
            const activeItems = sortItemsByCourse(order.items.filter(i => i.status !== 'CANCELLED'));

            return (
              <div
                key={order.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between shadow-2xl overflow-hidden hover:border-slate-700 transition-all"
              >
                {/* Cabecera de la Orden */}
                <div>
                  <div className="p-4 bg-slate-800/80 border-b border-slate-800 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-amber-400">
                          {order.table.name}
                        </span>
                        <span className="text-xs text-slate-400">
                          #{order.folio || 'S/F'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        Mesero: <strong className="text-slate-200">{order.waiter.name}</strong>
                      </span>
                    </div>

                    {/* Timer de Cocina */}
                    <div className={`px-3 py-1 rounded-xl border text-sm font-black flex items-center gap-1.5 ${timer.color}`}>
                      <Clock className="w-4 h-4" />
                      {timer.formatted}
                    </div>
                  </div>

                  {/* Lista de Platillos */}
                  <div className="p-4 space-y-3">
                    {activeItems.map(item => {
                      const courseBadge = getCourseBadge(item.course);
                      const isReady = item.status === 'READY';
                      const isPrepping = item.status === 'IN_PREP';

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isReady
                              ? 'bg-purple-950/40 border-purple-500/40'
                              : isPrepping
                              ? 'bg-amber-950/30 border-amber-500/40'
                              : 'bg-slate-950/60 border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded">
                                  C{item.dinerNumber}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${courseBadge.bg}`}>
                                  {courseBadge.label}
                                </span>
                                <span className={`text-sm font-black ${isReady ? 'text-purple-300' : 'text-white'}`}>
                                  {item.quantity}x {item.product.name}
                                </span>
                              </div>

                              {item.variant && (
                                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                                  {item.variant.attribute}
                                </p>
                              )}

                              {item.modifiers && item.modifiers.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {item.modifiers.map(m => (
                                    <span
                                      key={m.id}
                                      className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-lg"
                                    >
                                      ★ {m.name}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {item.notes && (
                                <div className="mt-1.5 p-1.5 bg-rose-950/40 border border-rose-500/30 rounded-lg text-xs font-bold text-rose-300">
                                  ⚠️ NOTA: {item.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Botonera táctil de acción de estado por platillo */}
                          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-end gap-1.5">
                            {item.status === 'SENT_TO_KITCHEN' && (
                              <button
                                onClick={() => handleStatusChange(item.id, 'IN_PREP')}
                                className="px-3 py-1.5 text-xs font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg transition-all"
                              >
                                ⏳ Iniciar Prep
                              </button>
                            )}

                            {item.status !== 'READY' && item.status !== 'SERVED' && (
                              <button
                                onClick={() => handleStatusChange(item.id, 'READY')}
                                className="px-3 py-1.5 text-xs font-bold text-purple-200 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all shadow-md shadow-purple-500/20"
                              >
                                ✓ Listo
                              </button>
                            )}

                            {item.status === 'READY' && (
                              <button
                                onClick={() => handleStatusChange(item.id, 'SERVED')}
                                className="px-3 py-1.5 text-xs font-bold text-emerald-200 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-md shadow-emerald-500/20"
                              >
                                🍽️ Servido
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer de la Orden */}
                <div className="p-3 bg-slate-950/80 border-t border-slate-800">
                  <button
                    onClick={() => handleMarkAllReady(order)}
                    className="w-full py-2.5 px-3 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl transition-all shadow-md shadow-amber-400/10 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Marcar Todo Listo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
