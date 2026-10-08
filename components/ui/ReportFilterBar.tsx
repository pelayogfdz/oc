'use client';

import { useState, useEffect } from 'react';
import DateRangeFilter, { DateRange } from './DateRangeFilter';
import { getAvailableFilters } from '@/app/actions/reportes';
import { Store, User, Filter, Tag, DollarSign, FileText, Package } from 'lucide-react';
import { startOfDay, subDays, endOfDay } from 'date-fns';

export interface ReportFilterState {
  dateRange: DateRange;
  branchId: string;
  userId: string;
  brandId: string;
  paymentMethod?: string;
  invoiced?: string;
  restockable?: string;
}

interface ReportFilterBarProps {
  onFilterChange: (filters: ReportFilterState) => void;
  disabled?: boolean;
  showDateRange?: boolean;
  showBranch?: boolean;
  showUser?: boolean;
  showBrand?: boolean;
  showPaymentMethod?: boolean;
  showInvoiced?: boolean;
  showRestockable?: boolean;
  initialBranchId?: string;
}

export default function ReportFilterBar({
  onFilterChange,
  disabled = false,
  showDateRange = true,
  showBranch = true,
  showUser = true,
  showBrand = true,
  showPaymentMethod = false,
  showInvoiced = false,
  showRestockable = true,
  initialBranchId = 'ALL'
}: ReportFilterBarProps) {
  
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [users, setUsers] = useState<{id: string, name: string}[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  
  const [branchId, setBranchId] = useState(initialBranchId);
  const [userId, setUserId] = useState('ALL');
  const [brandId, setBrandId] = useState('ALL');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [invoiced, setInvoiced] = useState('ALL');
  const [restockable, setRestockable] = useState('ALL');
  
  // Default date range is last 30 days
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: startOfDay(subDays(new Date(), 29)),
    endDate: endOfDay(new Date()),
    label: 'Últimos 30 días'
  });

  const [loadingFilters, setLoadingFilters] = useState(true);

  useEffect(() => {
    async function loadFilters() {
      try {
        const { branches, users, brands, paymentMethods } = await getAvailableFilters({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          branchId: initialBranchId !== 'ALL' ? initialBranchId : undefined
        }) as any;
        setBranches(branches || []);
        setUsers(users || []);
        setBrands(brands || []);
        setPaymentMethods(paymentMethods || []);
      } catch (e) {
        console.error("Error loading filters", e);
      } finally {
        setLoadingFilters(false);
      }
    }
    loadFilters();
  }, []);

  // Dynamically update active sellers whenever date range or branch changes
  useEffect(() => {
    if (loadingFilters || !showUser) return;
    let isCancelled = false;

    async function updateActiveUsers() {
      try {
        const { users: activeUsers } = await getAvailableFilters({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          branchId: branchId !== 'ALL' ? branchId : undefined
        }) as any;

        if (!isCancelled && activeUsers) {
          setUsers(activeUsers);
          if (userId !== 'ALL' && !activeUsers.some((u: any) => u.id === userId)) {
            setUserId('ALL');
            handleApply(dateRange, branchId, 'ALL', brandId, paymentMethod, invoiced);
          }
        }
      } catch (err) {
        console.error("Error updating active users for filter:", err);
      }
    }

    updateActiveUsers();

    return () => {
      isCancelled = true;
    };
  }, [dateRange.startDate, dateRange.endDate, branchId]);

  const handleApply = (
    newDateRange?: DateRange, 
    newBranchId?: string, 
    newUserId?: string, 
    newBrandId?: string,
    newPaymentMethod?: string,
    newInvoiced?: string,
    newRestockable?: string
  ) => {
    const dr = newDateRange || dateRange;
    const bid = newBranchId !== undefined ? newBranchId : branchId;
    const uid = newUserId !== undefined ? newUserId : userId;
    const brid = newBrandId !== undefined ? newBrandId : brandId;
    const pmet = newPaymentMethod !== undefined ? newPaymentMethod : paymentMethod;
    const inv = newInvoiced !== undefined ? newInvoiced : invoiced;
    const restk = newRestockable !== undefined ? newRestockable : restockable;

    onFilterChange({
      dateRange: dr,
      branchId: bid,
      userId: uid,
      brandId: brid,
      paymentMethod: pmet,
      invoiced: inv,
      restockable: restk
    });
  };

  const handleDateChange = (range: DateRange) => {
    setDateRange(range);
    handleApply(range, branchId, userId, brandId, paymentMethod, invoiced);
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setBranchId(val);
    handleApply(dateRange, val, userId, brandId, paymentMethod, invoiced);
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setUserId(val);
    handleApply(dateRange, branchId, val, brandId, paymentMethod, invoiced);
  };

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setBrandId(val);
    handleApply(dateRange, branchId, userId, val, paymentMethod, invoiced);
  };

  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setPaymentMethod(val);
    handleApply(dateRange, branchId, userId, brandId, val, invoiced);
  };

  const handleInvoicedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setInvoiced(val);
    handleApply(dateRange, branchId, userId, brandId, paymentMethod, val, restockable);
  };

  const handleRestockableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setRestockable(val);
    handleApply(dateRange, branchId, userId, brandId, paymentMethod, invoiced, val);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs mb-6">
      <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs uppercase tracking-wider mr-1">
        <Filter size={15} className="text-slate-400" /> Filtros:
      </div>

      {showDateRange && (
        <DateRangeFilter onFilterChange={handleDateChange} disabled={disabled || loadingFilters} />
      )}

      {showBranch && branches.length > 1 && (
        <div className="flex items-center h-10 px-3 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl shadow-2xs transition-all">
          <Store size={16} className="text-slate-400 mr-2 flex-shrink-0" />
          <select 
            value={branchId}
            onChange={handleBranchChange}
            disabled={disabled || loadingFilters}
            className="bg-transparent border-none text-xs sm:text-sm font-semibold text-slate-700 outline-none cursor-pointer pr-2 min-w-[140px]"
          >
            <option value="ALL">Todas las Sucursales</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      {showUser && (
        <div className="flex items-center h-10 px-3 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl shadow-2xs transition-all">
          <User size={16} className="text-slate-400 mr-2 flex-shrink-0" />
          <select 
            value={userId}
            onChange={handleUserChange}
            disabled={disabled || loadingFilters}
            className="bg-transparent border-none text-xs sm:text-sm font-semibold text-slate-700 outline-none cursor-pointer pr-2 min-w-[140px]"
          >
            <option value="ALL">Todos los Vendedores</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      )}

      {showBrand && brands.length > 0 && (
        <div className="flex items-center h-10 px-3 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl shadow-2xs transition-all">
          <Tag size={16} className="text-slate-400 mr-2 flex-shrink-0" />
          <select 
            value={brandId}
            onChange={handleBrandChange}
            disabled={disabled || loadingFilters}
            className="bg-transparent border-none text-xs sm:text-sm font-semibold text-slate-700 outline-none cursor-pointer pr-2 min-w-[140px]"
          >
            <option value="ALL">Todas las Marcas</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      )}

      {showPaymentMethod && (
        <div className="flex items-center h-10 px-3 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl shadow-2xs transition-all">
          <DollarSign size={16} className="text-slate-400 mr-2 flex-shrink-0" />
          <select 
            value={paymentMethod}
            onChange={handlePaymentMethodChange}
            disabled={disabled || loadingFilters}
            className="bg-transparent border-none text-xs sm:text-sm font-semibold text-slate-700 outline-none cursor-pointer pr-2 min-w-[140px]"
          >
            <option value="ALL">Todos los Métodos</option>
            <option value="CASH">Efectivo</option>
            <option value="CARD">Tarjeta</option>
            <option value="TRANSFER">Transferencia</option>
            <option value="CREDIT">Crédito</option>
            <option value="MIXTO">Mixto</option>
            {paymentMethods
              .filter(pm => !['CASH', 'CARD', 'TRANSFER', 'CREDIT', 'MIXTO'].includes(pm))
              .map(pm => (
                <option key={pm} value={pm}>{pm}</option>
              ))
            }
          </select>
        </div>
      )}


      {showRestockable && (
        <div className="flex items-center h-10 px-3 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl shadow-2xs transition-all">
          <Package size={16} className="text-slate-400 mr-2 flex-shrink-0" />
          <select 
            value={restockable}
            onChange={handleRestockableChange}
            disabled={disabled || loadingFilters}
            className="bg-transparent border-none text-xs sm:text-sm font-semibold text-slate-700 outline-none cursor-pointer pr-2 min-w-[140px]"
          >
            <option value="ALL">Resurtido: Todos</option>
            <option value="RESTOCKABLE">✅ Resurtibles</option>
            <option value="NON_RESTOCKABLE">🚫 No resurtibles</option>
          </select>
        </div>
      )}

      {showInvoiced && (
        <div className="flex items-center h-10 px-3 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl shadow-2xs transition-all">
          <FileText size={16} className="text-slate-400 mr-2 flex-shrink-0" />
          <select 
            value={invoiced}
            onChange={handleInvoicedChange}
            disabled={disabled || loadingFilters}
            className="bg-transparent border-none text-xs sm:text-sm font-semibold text-slate-700 outline-none cursor-pointer pr-2 min-w-[140px]"
          >
            <option value="ALL">Facturación: Todos</option>
            <option value="INVOICED">Facturado</option>
            <option value="NOT_INVOICED">No facturado</option>
          </select>
        </div>
      )}
    </div>
  );
}
