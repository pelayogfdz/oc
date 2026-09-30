'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, Plus, Clock, ChefHat, Receipt, ArrowRightLeft, 
  CheckCircle2, AlertCircle, RefreshCw, Eye, Sparkles, Utensils,
  Merge, XCircle, Search, LayoutGrid, Layers, MapPin, Move,
  Save, Edit3, Compass, Check, Circle, Square as SquareIcon, RectangleHorizontal,
  ChevronRight
} from 'lucide-react';
import RestaurantNavbar from '../components/RestaurantNavbar';
import { 
  getRestaurantAreas, openTableOrder, transferTable, 
  requestTableBill, cancelOrReleaseTable, joinTables,
  updateTableLayoutPositions
} from '@/app/actions/restaurantActions';

interface Table {
  id: string;
  areaId: string;
  number: number;
  name: string;
  capacity: number;
  posX: number;
  posY: number;
  shape: string; // SQUARE, ROUND, RECTANGLE
  status: 'FREE' | 'OCCUPIED' | 'ORDER_PLACED' | 'READY' | 'BILL_REQUESTED' | string;
  activeWaiter?: { id: string; name: string } | null;
  orders: Array<{
    id: string;
    folio: string | null;
    dinersCount: number;
    total: number;
    openedAt: string | Date;
    waiter: { id: string; name: string };
    items: Array<{
      id: string;
      quantity: number;
      product: { id: string; name: string; price: number };
      modifiers: Array<{ name: string; extraPrice: number }>;
    }>;
  }>;
}

interface Area {
  id: string;
  name: string;
  sortOrder: number;
  tables: Table[];
}

export default function MesasClient({ 
  initialAreas,
  currentUserId,
  currentUserName
}: { 
  initialAreas: Area[];
  currentUserId?: string;
  currentUserName?: string;
}) {
  const router = useRouter();
  const [areas, setAreas] = useState<Area[]>(initialAreas);
  const [activeAreaId, setActiveAreaId] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'FLOOR_PLAN' | 'GRID' | 'DESIGNER'>('FLOOR_PLAN');
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');

  // Estados del Diseñador 2D
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null);
  const [designerPositions, setDesignerPositions] = useState<Record<string, { posX: number; posY: number; shape: string; capacity: number }>>({});
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Popover de mesa seleccionada en vista plano
  const [activePopoverTable, setActivePopoverTable] = useState<Table | null>(null);

  // Modales
  const [selectedTableForOpen, setSelectedTableForOpen] = useState<Table | null>(null);
  const [dinersCount, setDinersCount] = useState<number>(2);
  const [openNotes, setOpenNotes] = useState<string>('');
  const [isOpening, setIsOpening] = useState(false);

  const [selectedTableForTransfer, setSelectedTableForTransfer] = useState<Table | null>(null);
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);

  const [selectedTableForJoin, setSelectedTableForJoin] = useState<Table | null>(null);
  const [joinTargetTableId, setJoinTargetTableId] = useState<string>('');
  const [isJoining, setIsJoining] = useState(false);

  // Inicializar posiciones locales para el diseñador
  useEffect(() => {
    const posMap: Record<string, { posX: number; posY: number; shape: string; capacity: number }> = {};
    areas.forEach(a => {
      a.tables.forEach(t => {
        posMap[t.id] = {
          posX: t.posX || 50,
          posY: t.posY || 50,
          shape: t.shape || 'SQUARE',
          capacity: t.capacity || 4
        };
      });
    });
    setDesignerPositions(posMap);
  }, [areas]);

  // Auto-refresh cada 8s para mantener el salón en tiempo real (solo en modo no-designer)
  useEffect(() => {
    if (viewMode === 'DESIGNER') return;
    const interval = setInterval(async () => {
      const res = await getRestaurantAreas();
      if (res.success && res.areas) {
        setAreas(res.areas as any);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [viewMode]);

  const handleRefresh = async () => {
    setIsLoading(true);
    const res = await getRestaurantAreas();
    if (res.success && res.areas) {
      setAreas(res.areas as any);
    }
    setIsLoading(false);
  };

  const handleOpenTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTableForOpen) return;
    setIsOpening(true);
    try {
      const res = await openTableOrder({
        tableId: selectedTableForOpen.id,
        dinersCount,
        notes: openNotes,
        waiterId: currentUserId
      });
      if (res.success && res.orderId) {
        setSelectedTableForOpen(null);
        router.push(`/restaurante/comanda/${selectedTableForOpen.id}`);
      } else {
        alert(res.error || 'Error al abrir mesa');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsOpening(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTableForTransfer || !targetTableId) return;
    setIsTransferring(true);
    try {
      const res = await transferTable({
        fromTableId: selectedTableForTransfer.id,
        toTableId: targetTableId,
        reason: transferReason
      });
      if (res.success) {
        setSelectedTableForTransfer(null);
        setTargetTableId('');
        handleRefresh();
      } else {
        alert(res.error || 'Error al transferir mesa');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTableForJoin || !joinTargetTableId) return;
    setIsJoining(true);
    try {
      const res = await joinTables(selectedTableForJoin.id, joinTargetTableId);
      if (res.success) {
        setSelectedTableForJoin(null);
        setJoinTargetTableId('');
        handleRefresh();
      } else {
        alert(res.error || 'Error al unir mesas');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleReleaseTable = async (table: Table) => {
    const reason = prompt(`¿Deseas cancelar y liberar ${table.name}? Ingresa motivo:`);
    if (reason === null) return;
    const res = await cancelOrReleaseTable(table.id, reason);
    if (res.success) {
      setActivePopoverTable(null);
      handleRefresh();
    } else {
      alert(res.error || 'Error al liberar mesa');
    }
  };

  const handleRequestBill = async (orderId: string) => {
    if (!confirm('¿Deseas solicitar la pre-cuenta para esta mesa?')) return;
    const res = await requestTableBill(orderId);
    if (res.success) {
      setActivePopoverTable(null);
      handleRefresh();
    } else {
      alert(res.error || 'Error al solicitar cuenta');
    }
  };

  // Guardar distribución del salón 2D
  const handleSaveLayout = async () => {
    setIsSavingLayout(true);
    try {
      const payload = Object.entries(designerPositions).map(([id, pos]) => ({
        id,
        posX: Math.round(pos.posX),
        posY: Math.round(pos.posY),
        shape: pos.shape,
        capacity: pos.capacity
      }));

      const res = await updateTableLayoutPositions(payload);
      if (res.success) {
        setSaveSuccessMsg(true);
        setTimeout(() => setSaveSuccessMsg(false), 3000);
        await handleRefresh();
      } else {
        alert(res.error || 'Error al guardar distribución');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingLayout(false);
    }
  };

  // Auto-organización inteligente de mesas
  const handleAutoDistribute = () => {
    const containerWidth = canvasRef.current?.getBoundingClientRect().width || 900;
    const colWidth = 160;
    const rowHeight = 150;
    const cols = Math.max(2, Math.floor((containerWidth - 60) / colWidth));
    const startX = 40;
    const startY = 40;

    const newPositions: typeof designerPositions = { ...designerPositions };

    currentAreaTables.forEach((table, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * colWidth;
      const y = startY + row * rowHeight;

      newPositions[table.id] = {
        ...(newPositions[table.id] || { shape: table.shape || 'SQUARE', capacity: table.capacity || 4 }),
        posX: x,
        posY: y
      };
    });

    setDesignerPositions(newPositions);
  };

  // Drag handlers en canvas
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggedTableId || !canvasRef.current || viewMode !== 'DESIGNER') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(10, Math.min(rect.width - 130, e.clientX - rect.left - 60));
    const y = Math.max(10, Math.min(rect.height - 130, e.clientY - rect.top - 60));

    setDesignerPositions(prev => ({
      ...prev,
      [draggedTableId]: {
        ...prev[draggedTableId],
        posX: Math.round(x),
        posY: Math.round(y)
      }
    }));
  };

  const handleCanvasMouseUp = () => {
    setDraggedTableId(null);
  };

  // Filtrado de mesas
  const filteredAreas = activeAreaId === 'ALL' 
    ? areas 
    : areas.filter(a => a.id === activeAreaId);

  const allTables = areas.flatMap(a => a.tables);
  const currentAreaTables = filteredAreas.flatMap(a => a.tables);

  const filteredTables = currentAreaTables.filter(t => {
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchSearch = !searchTableQuery || 
      t.name.toLowerCase().includes(searchTableQuery.toLowerCase()) ||
      t.number.toString().includes(searchTableQuery);
    return matchStatus && matchSearch;
  });

  // Cálculo adaptable de altura del lienzo según número y posición de mesas activas
  const maxTableY = filteredTables.reduce((max, t) => {
    const pos = designerPositions[t.id] || { posY: t.posY || 50 };
    return Math.max(max, pos.posY || 0);
  }, 0);

  const calculatedCanvasHeight = Math.max(
    320,
    filteredTables.length <= 4 ? 320 : filteredTables.length <= 8 ? 400 : 520,
    maxTableY + 160
  );

  const freeTablesForTransfer = allTables.filter(t => t.status === 'FREE');
  const occupiedTablesForJoin = (currentTableId: string) => allTables.filter(t => t.id !== currentTableId && t.status !== 'FREE');

  // Contadores de estado
  const countFree = allTables.filter(t => t.status === 'FREE').length;
  const countOccupied = allTables.filter(t => t.status === 'OCCUPIED').length;
  const countKitchen = allTables.filter(t => t.status === 'ORDER_PLACED').length;
  const countReady = allTables.filter(t => t.status === 'READY').length;
  const countBill = allTables.filter(t => t.status === 'BILL_REQUESTED').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FREE':
        return { 
          label: 'Libre', 
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800', 
          dot: 'bg-emerald-500', 
          cardBorder: 'border-emerald-300 dark:border-emerald-700 hover:border-emerald-500',
          glow: 'hover:shadow-emerald-100 dark:hover:shadow-emerald-950/30'
        };
      case 'OCCUPIED':
        return { 
          label: 'Ocupada', 
          badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800', 
          dot: 'bg-purple-600', 
          cardBorder: 'border-purple-300 dark:border-purple-700 hover:border-purple-500',
          glow: 'hover:shadow-purple-100 dark:hover:shadow-purple-950/30'
        };
      case 'ORDER_PLACED':
        return { 
          label: 'En Cocina', 
          badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800', 
          dot: 'bg-amber-500 animate-pulse', 
          cardBorder: 'border-amber-300 dark:border-amber-700 hover:border-amber-500 ring-2 ring-amber-400/20',
          glow: 'hover:shadow-amber-100 dark:hover:shadow-amber-950/30'
        };
      case 'READY':
        return { 
          label: 'Lista para Servir', 
          badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800', 
          dot: 'bg-blue-500 animate-bounce', 
          cardBorder: 'border-blue-300 dark:border-blue-700 hover:border-blue-500 ring-2 ring-blue-400/30',
          glow: 'hover:shadow-blue-100 dark:hover:shadow-blue-950/30'
        };
      case 'BILL_REQUESTED':
        return { 
          label: 'Cuenta Pedida', 
          badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800', 
          dot: 'bg-rose-500', 
          cardBorder: 'border-rose-300 dark:border-rose-700 hover:border-rose-500 ring-2 ring-rose-400/30',
          glow: 'hover:shadow-rose-100 dark:hover:shadow-rose-950/30'
        };
      default:
        return { 
          label: status, 
          badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300', 
          dot: 'bg-slate-400', 
          cardBorder: 'border-slate-200 dark:border-slate-800',
          glow: ''
        };
    }
  };

  const getElapsedTime = (openedAt?: string | Date) => {
    if (!openedAt) return null;
    const diffMs = new Date().getTime() - new Date(openedAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const navbarActions = (
    <>
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setViewMode('FLOOR_PLAN')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            viewMode === 'FLOOR_PLAN'
              ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Plano 2D
        </button>
        <button
          onClick={() => setViewMode('GRID')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            viewMode === 'GRID'
              ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Tarjetas
        </button>
        <button
          onClick={() => setViewMode('DESIGNER')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            viewMode === 'DESIGNER'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Move className="w-3.5 h-3.5" />
          Editar Salón
        </button>
      </div>

      <button
        onClick={handleRefresh}
        disabled={isLoading}
        className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        Actualizar
      </button>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Shared Restaurant Navbar Header */}
      <RestaurantNavbar
        title="Salón y Mesas"
        subtitle="Control visual en tiempo real de mesas, comensales, tiempos de servicio y pre-cuentas"
        actions={navbarActions}
      />

      {/* KPI Bar de Estados (Clean White Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div 
          onClick={() => setFilterStatus(filterStatus === 'FREE' ? 'ALL' : 'FREE')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all bg-white dark:bg-slate-900 shadow-sm ${
            filterStatus === 'FREE' 
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30' 
              : 'border-slate-200/90 dark:border-slate-800 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span>Libres</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{countFree}</p>
        </div>

        <div 
          onClick={() => setFilterStatus(filterStatus === 'OCCUPIED' ? 'ALL' : 'OCCUPIED')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all bg-white dark:bg-slate-900 shadow-sm ${
            filterStatus === 'OCCUPIED' 
              ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/30' 
              : 'border-slate-200/90 dark:border-slate-800 hover:border-purple-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-400">
            <span>Ocupadas</span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{countOccupied}</p>
        </div>

        <div 
          onClick={() => setFilterStatus(filterStatus === 'ORDER_PLACED' ? 'ALL' : 'ORDER_PLACED')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all bg-white dark:bg-slate-900 shadow-sm ${
            filterStatus === 'ORDER_PLACED' 
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30' 
              : 'border-slate-200/90 dark:border-slate-800 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
            <span>En Cocina</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{countKitchen}</p>
        </div>

        <div 
          onClick={() => setFilterStatus(filterStatus === 'READY' ? 'ALL' : 'READY')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all bg-white dark:bg-slate-900 shadow-sm ${
            filterStatus === 'READY' 
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30' 
              : 'border-slate-200/90 dark:border-slate-800 hover:border-blue-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-400">
            <span>Listas para Servir</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{countReady}</p>
        </div>

        <div 
          onClick={() => setFilterStatus(filterStatus === 'BILL_REQUESTED' ? 'ALL' : 'BILL_REQUESTED')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all bg-white dark:bg-slate-900 shadow-sm ${
            filterStatus === 'BILL_REQUESTED' 
              ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30' 
              : 'border-slate-200/90 dark:border-slate-800 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400">
            <span>Cuenta Pedida</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{countBill}</p>
        </div>
      </div>

      {/* Selector de Áreas y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          <button
            onClick={() => setActiveAreaId('ALL')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition-all ${
              activeAreaId === 'ALL'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            Todas las Áreas ({allTables.length})
          </button>
          {areas.map(area => (
            <button
              key={area.id}
              onClick={() => setActiveAreaId(area.id)}
              className={`px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition-all ${
                activeAreaId === area.id
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {area.name} ({area.tables.length})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar mesa..."
            value={searchTableQuery}
            onChange={(e) => setSearchTableQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white shadow-sm"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: PLANO VISUAL 2D INTERACTIVO */}
      {/* ========================================================================= */}
      {viewMode === 'FLOOR_PLAN' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-purple-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Plano del Salón ({activeAreaId === 'ALL' ? 'Vista General' : areas.find(a => a.id === activeAreaId)?.name})
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Haz clic en cualquier mesa para abrir o gestionar comanda</span>
          </div>

          {/* Canvas Plano 2D */}
          <div 
            className="relative w-full bg-slate-50/80 dark:bg-slate-950/80 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 overflow-hidden select-none transition-[height] duration-300 ease-in-out"
            style={{
              height: `${calculatedCanvasHeight}px`,
              minHeight: '320px',
              backgroundImage: 'radial-gradient(circle, rgba(148, 163, 184, 0.3) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          >
            {filteredTables.map(table => {
              const activeOrder = table.orders[0];
              const badge = getStatusBadge(table.status);
              const elapsed = getElapsedTime(activeOrder?.openedAt);
              const isSelected = activePopoverTable?.id === table.id;

              const pos = designerPositions[table.id] || { posX: table.posX || 50, posY: table.posY || 50, shape: table.shape || 'SQUARE' };
              const shape = pos.shape || table.shape || 'SQUARE';

              return (
                <div
                  key={table.id}
                  onClick={() => {
                    if (table.status === 'FREE') {
                      setSelectedTableForOpen(table);
                    } else {
                      setActivePopoverTable(isSelected ? null : table);
                    }
                  }}
                  style={{
                    left: `${pos.posX}px`,
                    top: `${pos.posY}px`,
                    position: 'absolute'
                  }}
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    shape === 'ROUND' ? 'rounded-full w-28 h-28' : shape === 'RECTANGLE' ? 'rounded-2xl w-40 h-28' : 'rounded-2xl w-28 h-28'
                  } bg-white dark:bg-slate-900 border-2 ${
                    isSelected ? 'border-purple-600 ring-4 ring-purple-500/20 z-20 shadow-xl' : badge.cardBorder
                  } ${badge.glow} flex flex-col items-center justify-center p-2 text-center shadow-md`}
                >
                  {/* Chairs Decoration */}
                  <div className="absolute -top-1.5 w-6 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
                  <div className="absolute -bottom-1.5 w-6 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
                  <div className="absolute -left-1.5 h-6 w-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
                  <div className="absolute -right-1.5 h-6 w-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />

                  {/* Mesa Header */}
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-[90%]">
                    {table.name}
                  </span>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-1 my-0.5">
                    <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {badge.label}
                    </span>
                  </div>

                  {/* Order Details (if occupied) */}
                  {activeOrder ? (
                    <div className="text-[10px] font-extrabold text-purple-700 dark:text-purple-400 leading-tight">
                      ${activeOrder.total.toFixed(2)}
                      {elapsed && (
                        <div className="text-[9px] font-medium text-slate-400 flex items-center justify-center gap-0.5 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {elapsed}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] font-medium text-slate-400 flex items-center gap-0.5">
                      <Users className="w-2.5 h-2.5" />
                      {table.capacity} pers.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Popover / Panel de Acción Rápida de Mesa */}
          {activePopoverTable && (
            <div className="mt-4 p-5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-600 text-white rounded-xl shadow-md shadow-purple-500/20">
                  <Utensils className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{activePopoverTable.name}</h3>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadge(activePopoverTable.status).badge}`}>
                      {getStatusBadge(activePopoverTable.status).label}
                    </span>
                  </div>
                  {activePopoverTable.orders[0] && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Comensales: {activePopoverTable.orders[0].dinersCount} | Mesero: {activePopoverTable.orders[0].waiter.name} | Total: <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">${activePopoverTable.orders[0].total.toFixed(2)}</strong>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                <Link
                  href={`/restaurante/comanda/${activePopoverTable.id}`}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-all"
                >
                  <Eye className="w-4 h-4" />
                  Ver / Agregar Comanda
                </Link>

                {activePopoverTable.orders[0] && (
                  <>
                    <Link
                      href={`/restaurante/cuenta/${activePopoverTable.orders[0].id}`}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all"
                    >
                      <Receipt className="w-4 h-4" />
                      Cobrar Cuenta
                    </Link>

                    <button
                      onClick={() => setSelectedTableForTransfer(activePopoverTable)}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 rounded-xl"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      Mover Mesa
                    </button>

                    <button
                      onClick={() => setSelectedTableForJoin(activePopoverTable)}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 rounded-xl"
                    >
                      <Merge className="w-4 h-4" />
                      Unir
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleReleaseTable(activePopoverTable)}
                  className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
                  title="Cancelar o liberar mesa"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: MODO DISEÑADOR DE SALÓN (DRAG & DROP 2D) */}
      {/* ========================================================================= */}
      {viewMode === 'DESIGNER' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Move className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Editor del Salón</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Arrastra las mesas con el cursor a su distribución física en el restaurante. Puedes cambiar su forma y guardar los cambios.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoDistribute}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                title="Auto-organizar mesas en cuadrícula adaptativa"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-purple-600" />
                <span>Auto-organizar</span>
              </button>

              {saveSuccessMsg && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <Check className="w-4 h-4" /> ¡Distribución guardada!
                </span>
              )}

              <button
                onClick={handleSaveLayout}
                disabled={isSavingLayout}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-500/20 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingLayout ? 'Guardando...' : 'Guardar Distribución'}</span>
              </button>
            </div>
          </div>

          {/* Lienzo del Diseñador */}
          <div
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className="relative w-full bg-slate-50/80 dark:bg-slate-950/80 rounded-2xl border-2 border-purple-300 dark:border-purple-800 overflow-hidden select-none cursor-crosshair transition-[height] duration-300 ease-in-out"
            style={{
              height: `${calculatedCanvasHeight}px`,
              minHeight: '320px',
              backgroundImage: 'radial-gradient(circle, rgba(147, 51, 234, 0.2) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          >
            {currentAreaTables.map(table => {
              const pos = designerPositions[table.id] || { posX: table.posX || 50, posY: table.posY || 50, shape: table.shape || 'SQUARE', capacity: table.capacity || 4 };
              const isDragging = draggedTableId === table.id;

              return (
                <div
                  key={table.id}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggedTableId(table.id);
                  }}
                  style={{
                    left: `${pos.posX}px`,
                    top: `${pos.posY}px`,
                    position: 'absolute'
                  }}
                  className={`cursor-grab active:cursor-grabbing ${
                    pos.shape === 'ROUND' ? 'rounded-full w-32 h-32' : pos.shape === 'RECTANGLE' ? 'rounded-2xl w-44 h-32' : 'rounded-2xl w-32 h-32'
                  } bg-white dark:bg-slate-900 border-2 ${
                    isDragging ? 'border-purple-600 ring-4 ring-purple-500/30 z-30 shadow-2xl scale-105' : 'border-slate-300 hover:border-purple-500'
                  } flex flex-col items-center justify-between p-2.5 text-center transition-all shadow-md`}
                >
                  <div className="flex items-center justify-between w-full text-[11px] text-purple-700 dark:text-purple-400 font-bold px-1">
                    <span>{table.name}</span>
                    <span className="text-[10px] text-slate-400">{pos.capacity}p</span>
                  </div>

                  {/* Controles rápidos de forma */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDesignerPositions(p => ({
                          ...p,
                          [table.id]: { ...p[table.id], shape: 'SQUARE' }
                        }));
                      }}
                      className={`p-1 rounded ${pos.shape === 'SQUARE' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                      title="Cuadrada"
                    >
                      <SquareIcon className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDesignerPositions(p => ({
                          ...p,
                          [table.id]: { ...p[table.id], shape: 'ROUND' }
                        }));
                      }}
                      className={`p-1 rounded ${pos.shape === 'ROUND' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                      title="Redonda"
                    >
                      <Circle className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDesignerPositions(p => ({
                          ...p,
                          [table.id]: { ...p[table.id], shape: 'RECTANGLE' }
                        }));
                      }}
                      className={`p-1 rounded ${pos.shape === 'RECTANGLE' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                      title="Rectangular"
                    >
                      <RectangleHorizontal className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="text-[9px] text-slate-400">
                    X: {pos.posX} | Y: {pos.posY}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: CUADRÍCULA DE TARJETAS CLÁSICA (Clean White) */}
      {/* ========================================================================= */}
      {viewMode === 'GRID' && (
        <div className="space-y-6">
          {filteredAreas.map(area => {
            const areaTables = area.tables.filter(t => {
              const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
              const matchSearch = !searchTableQuery || 
                t.name.toLowerCase().includes(searchTableQuery.toLowerCase()) ||
                t.number.toString().includes(searchTableQuery);
              return matchStatus && matchSearch;
            });

            if (areaTables.length === 0) return null;

            return (
              <div key={area.id} className="space-y-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>{area.name}</span>
                  <span className="text-xs font-normal text-slate-500">({areaTables.length} mesas)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {areaTables.map(table => {
                    const activeOrder = table.orders[0];
                    const badge = getStatusBadge(table.status);
                    const elapsed = getElapsedTime(activeOrder?.openedAt);

                    return (
                      <div
                        key={table.id}
                        className={`bg-white dark:bg-slate-900 rounded-2xl border-2 transition-all p-5 flex flex-col justify-between shadow-sm ${badge.cardBorder} ${badge.glow}`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-slate-900 dark:text-white">
                              {table.name}
                            </span>
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${badge.badge}`}>
                              {badge.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {table.capacity} personas
                            </span>
                            {elapsed && (
                              <span className="flex items-center gap-1 text-amber-600 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                {elapsed}
                              </span>
                            )}
                          </div>

                          {activeOrder && (
                            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1 border border-slate-100 dark:border-slate-800">
                              <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                                <span>Total Acumulado:</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">${activeOrder.total.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-slate-500">
                                <span>Mesero:</span>
                                <span>{activeOrder.waiter.name}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          {table.status === 'FREE' ? (
                            <button
                              onClick={() => setSelectedTableForOpen(table)}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 rounded-xl border border-purple-200/70 transition-all shadow-sm"
                            >
                              <Plus className="w-4 h-4" />
                              Abrir Mesa
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 w-full">
                              <Link
                                href={`/restaurante/comanda/${table.id}`}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-all"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Comanda
                              </Link>
                              {activeOrder && (
                                <Link
                                  href={`/restaurante/cuenta/${activeOrder.id}`}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  Cobrar
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALES DEL SISTEMA (Clean White CAANMA) */}
      {/* ========================================================================= */}

      {/* Modal Abrir Mesa */}
      {selectedTableForOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Abrir {selectedTableForOpen.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Registra los comensales e inicia la comanda</p>

            <form onSubmit={handleOpenTableSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Número de Comensales</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 4, 6, 8].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setDinersCount(num)}
                      className={`flex-1 py-2 text-sm font-bold rounded-xl border transition-all ${
                        dinersCount === num
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notas Iniciales (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Cumpleaños, terraza preferida, etc."
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTableForOpen(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isOpening}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-500/20 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isOpening ? 'Abriendo...' : 'Comenzar Orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Mover / Transferir Mesa */}
      {selectedTableForTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Mover {selectedTableForTransfer.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Selecciona la mesa libre de destino para transferir la cuenta</p>

            <form onSubmit={handleTransferSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mesa Libre de Destino</label>
                <select
                  value={targetTableId}
                  onChange={(e) => setTargetTableId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                >
                  <option value="">Selecciona una mesa libre...</option>
                  {freeTablesForTransfer.map(t => (
                    <option key={t.id} value={t.id}>{t.name} (Capacidad: {t.capacity}p)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Motivo del Cambio</label>
                <input
                  type="text"
                  placeholder="Ej. Solicitud del cliente, mesa más grande..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTableForTransfer(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isTransferring}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-all"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  {isTransferring ? 'Moviendo...' : 'Confirmar Cambio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Unir Mesas */}
      {selectedTableForJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Unir {selectedTableForJoin.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Fusiona los consumos de esta mesa con otra mesa activa</p>

            <form onSubmit={handleJoinSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mesa Activa de Destino</label>
                <select
                  value={joinTargetTableId}
                  onChange={(e) => setJoinTargetTableId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                >
                  <option value="">Selecciona mesa activa a unir...</option>
                  {occupiedTablesForJoin(selectedTableForJoin.id).map(t => (
                    <option key={t.id} value={t.id}>{t.name} (Total: ${t.orders[0]?.total.toFixed(2) || '0.00'})</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTableForJoin(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isJoining}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-all"
                >
                  <Merge className="w-4 h-4" />
                  {isJoining ? 'Uniendo...' : 'Fusionar Cuentas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
