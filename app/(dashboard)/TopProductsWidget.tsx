'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, Badge } from '@/app/components/ui';
import { Layers, DollarSign, TrendingUp } from 'lucide-react';

export interface ProductMetricItem {
  id: string;
  name: string;
  sku: string;
  quantitySold: number;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  marginPercent: number;
}

interface TopProductsWidgetProps {
  isFiltered: boolean;
  topByUnits: ProductMetricItem[];
  topByRevenue: ProductMetricItem[];
  topByMargin: ProductMetricItem[];
}

const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export default function TopProductsWidget({
  isFiltered,
  topByUnits,
  topByRevenue,
  topByMargin
}: TopProductsWidgetProps) {
  const [viewMode, setViewMode] = useState<'units' | 'revenue' | 'margin'>('units');

  const getActiveList = () => {
    switch (viewMode) {
      case 'revenue':
        return topByRevenue;
      case 'margin':
        return topByMargin;
      case 'units':
      default:
        return topByUnits;
    }
  };

  const getSubtitle = () => {
    const periodText = isFiltered ? 'en el período' : 'hoy';
    switch (viewMode) {
      case 'revenue':
        return `Artículos líderes por importe total de venta (${periodText})`;
      case 'margin':
        return `Artículos con mayor utilidad y ganancia neta (${periodText})`;
      case 'units':
      default:
        return `Artículos líderes por unidades desplazadas (${periodText})`;
    }
  };

  const currentList = getActiveList();

  return (
    <Card className="p-5 md:p-6 min-w-0 border-slate-200/80 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex justify-between items-start mb-4 gap-3 border-b border-slate-100 pb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-slate-900 tracking-tight">📦 Productos Más Vendidos</span>
              <Badge variant={isFiltered ? 'purple' : 'info'} size="sm">
                {isFiltered ? 'Período' : 'Hoy'}
              </Badge>
            </div>
            <p className="text-slate-400 text-xs mt-0.5 mb-0 font-normal">
              {getSubtitle()}
            </p>
          </div>
          <Link 
            href="/reportes/top-productos" 
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline flex-shrink-0 pt-0.5"
          >
            Ver detalle &rarr;
          </Link>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-lg mb-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setViewMode('units')}
            className={`flex-1 min-w-[85px] flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'units'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={13} className={viewMode === 'units' ? 'text-slate-900' : 'text-slate-400'} />
            <span>Por Unidades</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('revenue')}
            className={`flex-1 min-w-[85px] flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'revenue'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign size={13} className={viewMode === 'revenue' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>Monto de Venta</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('margin')}
            className={`flex-1 min-w-[85px] flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'margin'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp size={13} className={viewMode === 'margin' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>Margen Total</span>
          </button>
        </div>

        {/* List of Products */}
        <div className="flex flex-col gap-3.5">
          {currentList.length > 0 ? (
            currentList.map((prod, idx) => {
              return (
                <div key={`${viewMode}-${prod.id}-${idx}`} className="flex items-center gap-3 min-w-0 py-1 px-1.5 rounded-lg hover:bg-slate-50/70 transition-colors">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    idx === 0 
                      ? 'bg-amber-100 text-amber-800 font-extrabold' 
                      : idx === 1 
                      ? 'bg-slate-200 text-slate-700' 
                      : idx === 2 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-800 block truncate" title={prod.name}>
                          {prod.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-medium block truncate">
                          SKU: {prod.sku}
                        </span>
                      </div>
                      
                      <div className="text-right flex-shrink-0 pl-2">
                        {viewMode === 'units' && (
                          <>
                            <span className="text-xs font-black text-slate-900 block">
                              {prod.quantitySold.toLocaleString('es-MX')} uds
                            </span>
                            <span className="text-[11px] text-slate-400 block font-normal">
                              {formatter.format(prod.totalRevenue)}
                            </span>
                          </>
                        )}

                        {viewMode === 'revenue' && (
                          <>
                            <span className="text-xs font-black text-slate-900 block">
                              {formatter.format(prod.totalRevenue)}
                            </span>
                            <span className="text-[11px] text-slate-400 block font-normal">
                              {prod.quantitySold.toLocaleString('es-MX')} uds
                            </span>
                          </>
                        )}

                        {viewMode === 'margin' && (
                          <>
                            <span className="text-xs font-black text-emerald-700 block">
                              +{formatter.format(prod.totalMargin)}
                            </span>
                            <span className="text-[11px] text-slate-400 block font-normal">
                              {prod.quantitySold.toLocaleString('es-MX')} uds <span className="text-emerald-700 font-semibold">({prod.marginPercent}%)</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              {isFiltered ? 'No hay ventas registradas en el período seleccionado.' : 'No hay ventas registradas el día de hoy.'}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
