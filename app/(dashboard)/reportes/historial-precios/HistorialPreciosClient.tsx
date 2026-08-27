'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, ArrowUpDown } from 'lucide-react';
import ReportFilterBar, { ReportFilterState } from '@/components/ui/ReportFilterBar';
import { getPriceChangeHistory } from '@/app/actions/reportes';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function HistorialPreciosClient({ 
  initialData, 
  initialBranchId 
}: { 
  initialData: any; 
  initialBranchId: string; 
}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  
  // Filters & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId);

  // Load new data on branch filter change
  const handleFilterChange = async (filters: ReportFilterState) => {
    setSelectedBranchId(filters.branchId);
  };

  // Pre-load / filter search on the server side with a debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const newData = await getPriceChangeHistory(selectedBranchId, searchTerm, 1, 100);
        setData(newData);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedBranchId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Historial de Cambios de Precio
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Visualiza los cambios de precio de venta por artículo, sucursal y usuario.
          </p>
        </div>
      </div>

      <ReportFilterBar 
        onFilterChange={handleFilterChange}
        showDateRange={false}
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o código..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-20 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Producto</th>
                  <th className="p-4">Lista / Tipo</th>
                  <th className="p-4 text-right">Precio Anterior</th>
                  <th className="p-4 text-right">Precio Nuevo</th>
                  <th className="p-4">Sucursal</th>
                  <th className="p-4">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {data.logs?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                      No se encontraron registros de cambios de precio.
                    </td>
                  </tr>
                ) : (
                  data.logs?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{log.product?.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          SKU: {log.product?.sku} {log.product?.barcode ? `| CB: ${log.product?.barcode}` : ''}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {log.priceListName || 'Precio Público'}
                        </span>
                      </td>
                      <td className="p-4 text-right text-slate-500 line-through">
                        {formatCurrency(log.oldPrice)}
                      </td>
                      <td className="p-4 text-right font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(log.newPrice)}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">
                        {log.branch?.name}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">
                        {log.user?.name || 'Sistema / N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
