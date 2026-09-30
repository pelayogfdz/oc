'use client';

import React, { useState } from 'react';
import RestaurantNavbar from '../components/RestaurantNavbar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Settings, ArrowLeft, Plus, Trash2, Edit3, 
  Layers, Utensils, ChefHat, Printer, Save
} from 'lucide-react';
import { 
  saveRestaurantArea, deleteRestaurantArea, 
  saveRestaurantTable, deleteRestaurantTable,
  saveKitchenStation, deleteKitchenStation
} from '@/app/actions/restaurantActions';

export default function ConfiguracionClient({
  areas,
  stations
}: {
  areas: any[];
  stations: any[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'AREAS' | 'TABLES' | 'STATIONS'>('AREAS');

  // Modales y estados de formulario
  // 1. ÁREAS
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [areaName, setAreaName] = useState('');
  const [areaSortOrder, setAreaSortOrder] = useState(1);

  // 2. MESAS
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [tableAreaId, setTableAreaId] = useState(areas[0]?.id || '');
  const [tableNumber, setTableNumber] = useState(1);
  const [tableName, setTableName] = useState('');
  const [tableCapacity, setTableCapacity] = useState(4);
  const [tableShape, setTableShape] = useState('SQUARE');

  // 3. ESTACIONES DE COCINA
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [stationName, setStationName] = useState('');
  const [stationColor, setStationColor] = useState('#EF4444');
  const [stationPrinterIp, setStationPrinterIp] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  // Handlers para Áreas
  const handleOpenCreateArea = () => {
    setEditingAreaId(null);
    setAreaName('');
    setAreaSortOrder(areas.length + 1);
    setIsAreaModalOpen(true);
  };

  const handleOpenEditArea = (area: any) => {
    setEditingAreaId(area.id);
    setAreaName(area.name);
    setAreaSortOrder(area.sortOrder);
    setIsAreaModalOpen(true);
  };

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await saveRestaurantArea({
        id: editingAreaId || undefined,
        name: areaName,
        sortOrder: areaSortOrder
      });
      if (res.success) {
        setIsAreaModalOpen(false);
        router.refresh();
      } else {
        alert(res.error || 'Error al guardar área');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteArea = async (id: string) => {
    if (!confirm('¿Deseas desactivar esta área?')) return;
    const res = await deleteRestaurantArea(id);
    if (res.success) router.refresh();
    else alert(res.error || 'Error al eliminar área');
  };

  // Handlers para Mesas
  const handleOpenCreateTable = () => {
    setEditingTableId(null);
    setTableAreaId(areas[0]?.id || '');
    setTableNumber(allTables.length + 1);
    setTableName(`Mesa ${allTables.length + 1}`);
    setTableCapacity(4);
    setTableShape('SQUARE');
    setIsTableModalOpen(true);
  };

  const handleOpenEditTable = (table: any) => {
    setEditingTableId(table.id);
    setTableAreaId(table.areaId);
    setTableNumber(table.number);
    setTableName(table.name);
    setTableCapacity(table.capacity);
    setTableShape(table.shape);
    setIsTableModalOpen(true);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await saveRestaurantTable({
        id: editingTableId || undefined,
        areaId: tableAreaId,
        number: tableNumber,
        name: tableName,
        capacity: tableCapacity,
        shape: tableShape
      });
      if (res.success) {
        setIsTableModalOpen(false);
        router.refresh();
      } else {
        alert(res.error || 'Error al guardar mesa');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!confirm('¿Deseas eliminar esta mesa?')) return;
    const res = await deleteRestaurantTable(id);
    if (res.success) router.refresh();
    else alert(res.error || 'Error al eliminar mesa');
  };

  // Handlers para Estaciones
  const handleOpenCreateStation = () => {
    setEditingStationId(null);
    setStationName('');
    setStationColor('#3B82F6');
    setStationPrinterIp('');
    setIsStationModalOpen(true);
  };

  const handleOpenEditStation = (station: any) => {
    setEditingStationId(station.id);
    setStationName(station.name);
    setStationColor(station.color || '#3B82F6');
    setStationPrinterIp(station.printerIp || '');
    setIsStationModalOpen(true);
  };

  const handleSaveStation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await saveKitchenStation({
        id: editingStationId || undefined,
        name: stationName,
        color: stationColor,
        printerIp: stationPrinterIp
      });
      if (res.success) {
        setIsStationModalOpen(false);
        router.refresh();
      } else {
        alert(res.error || 'Error al guardar estación');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStation = async (id: string) => {
    if (!confirm('¿Deseas eliminar esta estación de cocina?')) return;
    const res = await deleteKitchenStation(id);
    if (res.success) router.refresh();
    else alert(res.error || 'Error al eliminar');
  };

  const allTables = areas.flatMap(a => (a.tables || []).map((t: any) => ({ ...t, areaName: a.name })));

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <RestaurantNavbar
        title="Configuración del Restaurante"
        subtitle="Administra áreas físicas del salón, catálogo de mesas y estaciones de cocina / comanderas"
        actions={
          <div>
            {activeTab === 'AREAS' && (
              <button
                onClick={handleOpenCreateArea}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Área</span>
              </button>
            )}
            {activeTab === 'TABLES' && (
              <button
                onClick={handleOpenCreateTable}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Mesa</span>
              </button>
            )}
            {activeTab === 'STATIONS' && (
              <button
                onClick={handleOpenCreateStation}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Estación</span>
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('AREAS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'AREAS'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Áreas del Salón ({areas.length})
        </button>

        <button
          onClick={() => setActiveTab('TABLES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'TABLES'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Utensils className="w-4 h-4" />
          Mesas ({allTables.length})
        </button>

        <button
          onClick={() => setActiveTab('STATIONS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'STATIONS'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          Estaciones de Cocina ({stations.length})
        </button>
      </div>

      {/* TAB 1: ÁREAS */}
      {activeTab === 'AREAS' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-700 dark:text-slate-300">
            Listado de Áreas Físicas
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {areas.map(area => (
              <div key={area.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {area.name}
                  </h4>
                  <span className="text-xs text-slate-400">
                    Orden: {area.sortOrder} • {area.tables?.length || 0} mesas asignadas
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditArea(area)}
                    className="p-2 text-slate-600 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteArea(area.id)}
                    className="p-2 text-slate-600 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MESAS */}
      {activeTab === 'TABLES' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-700 dark:text-slate-300">
            Catálogo de Mesas
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
            {allTables.map(table => (
              <div
                key={table.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {table.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Área: <strong className="text-purple-600">{table.areaName}</strong>
                  </p>
                  <p className="text-xs text-slate-400">
                    Capacidad: {table.capacity}p • Forma: {table.shape}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditTable(table)}
                    className="p-2 text-slate-600 hover:text-purple-600 hover:bg-slate-200 rounded-xl"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTable(table.id)}
                    className="p-2 text-slate-600 hover:text-rose-600 hover:bg-slate-200 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ESTACIONES */}
      {activeTab === 'STATIONS' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-700 dark:text-slate-300">
            Estaciones de Cocina e Impresoras Térmicas
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {stations.map(station => (
              <div key={station.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: station.color || '#3B82F6' }}
                  />
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {station.name}
                    </h4>
                    <span className="text-xs text-slate-400">
                      Impresora IP: {station.printerIp || 'No configurada (Usa pantalla KDS)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditStation(station)}
                    className="p-2 text-slate-600 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteStation(station.id)}
                    className="p-2 text-slate-600 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Área */}
      {isAreaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingAreaId ? 'Editar Área' : 'Nueva Área de Salón'}
            </h3>
            <form onSubmit={handleSaveArea} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre del Área
                </label>
                <input
                  type="text"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  required
                  placeholder="Ej. Terraza, Planta Alta, Barra..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Orden de Visualización
                </label>
                <input
                  type="number"
                  value={areaSortOrder}
                  onChange={(e) => setAreaSortOrder(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAreaModalOpen(false)}
                  className="flex-1 py-2.5 text-sm font-medium bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Mesa */}
      {isTableModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingTableId ? 'Editar Mesa' : 'Nueva Mesa'}
            </h3>
            <form onSubmit={handleSaveTable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Área asignada
                </label>
                <select
                  value={tableAreaId}
                  onChange={(e) => setTableAreaId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                >
                  {areas.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Número
                  </label>
                  <input
                    type="number"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(parseInt(e.target.value) || 1)}
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Capacidad (Personas)
                  </label>
                  <input
                    type="number"
                    value={tableCapacity}
                    onChange={(e) => setTableCapacity(parseInt(e.target.value) || 4)}
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre de Mesa
                </label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  required
                  placeholder="Ej. Mesa 1, Barra 2, VIP 1..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Forma
                </label>
                <select
                  value={tableShape}
                  onChange={(e) => setTableShape(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                >
                  <option value="SQUARE">Cuadrada</option>
                  <option value="ROUND">Redonda</option>
                  <option value="RECTANGLE">Rectangular</option>
                </select>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(false)}
                  className="flex-1 py-2.5 text-sm font-medium bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl"
                >
                  Guardar Mesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Estación */}
      {isStationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingStationId ? 'Editar Estación' : 'Nueva Estación de Cocina'}
            </h3>
            <form onSubmit={handleSaveStation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre de la Estación
                </label>
                <input
                  type="text"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  required
                  placeholder="Ej. Cocina Caliente, Barra..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Color Identificador
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={stationColor}
                    onChange={(e) => setStationColor(e.target.value)}
                    className="w-12 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={stationColor}
                    onChange={(e) => setStationColor(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  IP Impresora Térmica ESC/POS (Opcional)
                </label>
                <input
                  type="text"
                  value={stationPrinterIp}
                  onChange={(e) => setStationPrinterIp(e.target.value)}
                  placeholder="Ej. 192.168.1.200:9100"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsStationModalOpen(false)}
                  className="flex-1 py-2.5 text-sm font-medium bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl"
                >
                  Guardar Estación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
