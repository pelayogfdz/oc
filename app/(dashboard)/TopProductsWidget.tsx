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
    <Card className="p-6 md:p-8 min-w-0 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold text-slate-900 m-0 flex items-center gap-2 flex-wrap">
              📦 Productos Más Vendidos <Badge variant={isFiltered ? 'purple' : 'danger'}>{isFiltered ? 'Período' : 'Hoy'}</Badge>
            </h2>
            <p className="text-slate-500 text-xs mt-1 mb-0">
              {getSubtitle()}
            </p>
          </div>
          <Link href="/reportes/top-productos" className="text-xs font-bold text-blue-600 hover:underline flex-shrink-0">
            Ver detalle
          </Link>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl mb-5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setViewMode('units')}
            className={`flex-1 min-w-[95px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'units'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={13} className={viewMode === 'units' ? 'text-blue-600' : ''} />
            <span>Por Unidades</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('revenue')}
            className={`flex-1 min-w-[95px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'revenue'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign size={13} className={viewMode === 'revenue' ? 'text-emerald-600' : ''} />
            <span>Monto de Venta</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('margin')}
            className={`flex-1 min-w-[95px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'margin'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp size={13} className={viewMode === 'margin' ? 'text-emerald-600' : ''} />
            <span>Margen Total</span>
          </button>
        </div>

        {/* List of Products */}
        <div className="flex flex-col gap-4">
          {currentList.length > 0 ? (
            currentList.map((prod, idx) => {
              return (
                <div key={`${viewMode}-${prod.id}-${idx}`} className="flex items-center gap-3 sm:gap-4 min-w-0 hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    idx === 0 
                      ? 'bg-amber-50 border-amber-200 text-amber-700 font-extrabold' 
                      : idx === 1 
                      ? 'bg-slate-100 border-slate-300 text-slate-700' 
                      : idx === 2 
                      ? 'bg-orange-50 border-orange-200 text-orange-700' 
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-bold text-slate-800 block truncate" title={prod.name}>
                          {prod.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono font-semibold block truncate">
                          SKU: {prod.sku}
                        </span>
                      </div>
                      
                      <div className="text-right flex-shrink-0 pl-2">
                        {viewMode === 'units' && (
                          <>
                            <span className="text-sm font-black text-slate-900 block">
                              {prod.quantitySold.toLocaleString('es-MX')} uds
                            </span>
                            <span className="text-xs text-slate-500 block">
                              {formatter.format(prod.totalRevenue)}
                            </span>
                          </>
                        )}

                        {viewMode === 'revenue' && (
                          <>
                            <span className="text-sm font-black text-emerald-700 block">
                              {formatter.format(prod.totalRevenue)}
                            </span>
                            <span className="text-xs text-slate-500 block">
                              {prod.quantitySold.toLocaleString('es-MX')} uds vendidas
                            </span>
                          </>
                        )}

                        {viewMode === 'margin' && (
                          <>
                            <span className="text-sm font-black text-emerald-600 block">
                              +{formatter.format(prod.totalMargin)}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {prod.quantitySold.toLocaleString('es-MX')} uds <span className="text-emerald-700 font-bold">({prod.marginPercent}%)</span>
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
            <div className="py-8 text-center text-slate-400 text-sm">
              {isFiltered ? 'No hay ventas registradas en el período seleccionado.' : 'No hay ventas registradas el día de hoy.'}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
