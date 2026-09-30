'use client';

import React, { useState } from 'react';
import RestaurantNavbar from '../components/RestaurantNavbar';
import Link from 'next/link';
import { 
  Receipt, ArrowLeft, Search, Clock, Users, 
  CheckCircle2, Eye, Filter, Calendar
} from 'lucide-react';

interface Order {
  id: string;
  folio?: string | null;
  dinersCount: number;
  status: string;
  total: number;
  tip: number;
  openedAt: string | Date;
  closedAt?: string | Date | null;
  table: { id: string; name: string };
  waiter: { id: string; name: string };
  sale?: { id: string; folio: string | null } | null;
  items: Array<{
    id: string;
    quantity: number;
    product: { name: string };
  }>;
}

export default function ComandasClient({
  initialOrders
}: {
  initialOrders: Order[];
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filteredOrders = orders.filter(o => {
    const matchStatus = filterStatus === 'ALL' || o.status === filterStatus;
    const matchSearch = !searchQuery || 
      (o.folio && o.folio.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.waiter.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return { label: 'Abierta', bg: 'bg-blue-50 text-purple-600 dark:bg-blue-950/40 border-blue-200' };
      case 'IN_PREP': return { label: 'En Cocina', bg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 border-amber-200' };
      case 'READY': return { label: 'Lista', bg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 border-purple-200' };
      case 'BILLED': return { label: 'Cuenta Pedida', bg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 border-rose-200' };
      case 'CLOSED': return { label: 'Cobrada / Cerrada', bg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 border-emerald-200' };
      case 'CANCELLED': return { label: 'Cancelada', bg: 'bg-slate-100 text-slate-500 border-slate-200' };
      default: return { label: status, bg: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <RestaurantNavbar
        title="Historial de Comandas"
        subtitle="Registro completo de órdenes, cuentas cobradas y tiempos de atención"
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por folio, mesa o mesero..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'CLOSED', label: 'Cobradas' },
            { id: 'OPEN', label: 'Abiertas' },
            { id: 'IN_PREP', label: 'En Cocina' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl border whitespace-nowrap transition-all ${
                filterStatus === f.id
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Comandas */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4">Folio / Mesa</th>
                <th className="p-4">Mesero</th>
                <th className="p-4">Comensales</th>
                <th className="p-4">Fecha / Hora</th>
                <th className="p-4">Platillos</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    No se encontraron comandas registradas.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const badge = getStatusBadge(order.status);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        <div>{order.table.name}</div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {order.folio || 'S/F'}
                        </span>
                      </td>

                      <td className="p-4 font-medium text-slate-700 dark:text-slate-300">
                        {order.waiter.name}
                      </td>

                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1 font-semibold">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          {order.dinersCount}p
                        </span>
                      </td>

                      <td className="p-4 text-slate-500">
                        {new Date(order.openedAt).toLocaleString('es-MX', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>

                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {order.items.length} ítems
                      </td>

                      <td className="p-4 text-right font-extrabold text-slate-900 dark:text-white">
                        ${(order.total || 0).toFixed(2)}
                        {order.tip > 0 && (
                          <span className="block text-[10px] text-emerald-600 font-normal">
                            +${order.tip.toFixed(2)} propina
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-block ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <Link
                          href={`/restaurante/cuenta/${order.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-purple-600 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
