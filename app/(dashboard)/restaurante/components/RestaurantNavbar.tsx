'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Utensils, ChefHat, Receipt, BookOpen, Settings,
  Compass, LayoutGrid, Clock, Plus
} from 'lucide-react';

export default function RestaurantNavbar({ 
  title, 
  subtitle, 
  actions 
}: { 
  title?: string; 
  subtitle?: string; 
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Salón y Mesas', path: '/restaurante/mesas', icon: Utensils, match: ['/restaurante/mesas', '/restaurante/comanda', '/restaurante/cuenta'] },
    { name: 'Cocina (KDS)', path: '/restaurante/kds', icon: ChefHat, match: ['/restaurante/kds'] },
    { name: 'Comandas', path: '/restaurante/comandas', icon: Receipt, match: ['/restaurante/comandas'] },
    { name: 'Recetas', path: '/restaurante/recetas', icon: BookOpen, match: ['/restaurante/recetas'] },
    { name: 'Configuración', path: '/restaurante/configuracion', icon: Settings, match: ['/restaurante/configuracion'] },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 md:p-5 mb-6 space-y-4">
      {/* Top row: Title + Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-md shadow-purple-500/20">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-200/60 dark:border-purple-800">
                Módulo Restaurante
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {title || 'Gestión de Restaurante'}
            </h1>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center flex-wrap gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Bottom row: Clean navigation tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = item.match.some(m => pathname?.startsWith(m));

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
