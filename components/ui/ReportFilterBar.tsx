'use client';

import { useState, useEffect } from 'react';
import DateRangeFilter, { DateRange } from './DateRangeFilter';
import { getAvailableFilters } from '@/app/actions/reportes';
import { Store, User, Filter, Tag, DollarSign, FileText } from 'lucide-react';
import { startOfDay, subDays, endOfDay } from 'date-fns';

export interface ReportFilterState {
  dateRange: DateRange;
  branchId: string;
  userId: string;
  brandId: string;
  paymentMethod?: string;
  invoiced?: string;
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
        const { branches, users, brands, paymentMethods } = await getAvailableFilters() as any;
        setBranches(branches);
        setUsers(users);
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

  const handleApply = (
    newDateRange?: DateRange, 
    newBranchId?: string, 
    newUserId?: string, 
    newBrandId?: string,
    newPaymentMethod?: string,
    newInvoiced?: string
  ) => {
    const dr = newDateRange || dateRange;
    const bid = newBranchId !== undefined ? newBranchId : branchId;
    const uid = newUserId !== undefined ? newUserId : userId;
    const brid = newBrandId !== undefined ? newBrandId : brandId;
    const pmet = newPaymentMethod !== undefined ? newPaymentMethod : paymentMethod;
    const inv = newInvoiced !== undefined ? newInvoiced : invoiced;

    onFilterChange({
      dateRange: dr,
      branchId: bid,
      userId: uid,
      brandId: brid,
      paymentMethod: pmet,
      invoiced: inv
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
    handleApply(dateRange, branchId, userId, brandId, paymentMethod, val);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap',
      alignItems: 'center', 
      gap: '1rem', 
      backgroundColor: 'white', 
      padding: '1rem', 
      borderRadius: '12px', 
      border: '1px solid var(--caanma-border)',
      marginBottom: '1.5rem',
      fontFamily: 'var(--font-geist-sans)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--caanma-text-muted)', fontWeight: 'bold', marginRight: '0.5rem' }}>
        <Filter size={18} /> Filtros:
      </div>

      {showDateRange && (
        <DateRangeFilter onFilterChange={handleDateChange} disabled={disabled || loadingFilters} />
      )}

      {showBranch && branches.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--caanma-border)', borderRadius: '8px', padding: '0 0.5rem', backgroundColor: 'white' }}>
          <Store size={16} color="var(--caanma-text-muted)" style={{ marginLeft: '0.5rem' }} />
          <select 
            value={branchId}
            onChange={handleBranchChange}
            disabled={disabled || loadingFilters}
            style={{ 
              border: 'none', 
              padding: '0.6rem 0.5rem', 
              backgroundColor: 'transparent',
              outline: 'none',
              fontWeight: '500',
              color: 'var(--caanma-text)',
              cursor: 'pointer',
              minWidth: '150px'
            }}
          >
            <option value="ALL">Todas las Sucursales</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      {showUser && users.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--caanma-border)', borderRadius: '8px', padding: '0 0.5rem', backgroundColor: 'white' }}>
          <User size={16} color="var(--caanma-text-muted)" style={{ marginLeft: '0.5rem' }} />
          <select 
            value={userId}
            onChange={handleUserChange}
            disabled={disabled || loadingFilters}
            style={{ 
              border: 'none', 
              padding: '0.6rem 0.5rem', 
              backgroundColor: 'transparent',
              outline: 'none',
              fontWeight: '500',
              color: 'var(--caanma-text)',
              cursor: 'pointer',
              minWidth: '150px'
            }}
          >
            <option value="ALL">Todos los Vendedores</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      )}

      {showBrand && brands.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--caanma-border)', borderRadius: '8px', padding: '0 0.5rem', backgroundColor: 'white' }}>
          <Tag size={16} color="var(--caanma-text-muted)" style={{ marginLeft: '0.5rem' }} />
          <select 
            value={brandId}
            onChange={handleBrandChange}
            disabled={disabled || loadingFilters}
            style={{ 
              border: 'none', 
              padding: '0.6rem 0.5rem', 
              backgroundColor: 'transparent',
              outline: 'none',
              fontWeight: '500',
              color: 'var(--caanma-text)',
              cursor: 'pointer',
              minWidth: '150px'
            }}
          >
            <option value="ALL">Todas las Marcas</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      )}

      {showPaymentMethod && (
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--caanma-border)', borderRadius: '8px', padding: '0 0.5rem', backgroundColor: 'white' }}>
          <DollarSign size={16} color="var(--caanma-text-muted)" style={{ marginLeft: '0.5rem' }} />
          <select 
            value={paymentMethod}
            onChange={handlePaymentMethodChange}
            disabled={disabled || loadingFilters}
            style={{ 
              border: 'none', 
              padding: '0.6rem 0.5rem', 
              backgroundColor: 'transparent',
              outline: 'none',
              fontWeight: '500',
              color: 'var(--caanma-text)',
              cursor: 'pointer',
              minWidth: '150px'
            }}
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


      {showInvoiced && (
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--caanma-border)', borderRadius: '8px', padding: '0 0.5rem', backgroundColor: 'white' }}>
          <FileText size={16} color="var(--caanma-text-muted)" style={{ marginLeft: '0.5rem' }} />
          <select 
            value={invoiced}
            onChange={handleInvoicedChange}
            disabled={disabled || loadingFilters}
            style={{ 
              border: 'none', 
              padding: '0.6rem 0.5rem', 
              backgroundColor: 'transparent',
              outline: 'none',
              fontWeight: '500',
              color: 'var(--caanma-text)',
              cursor: 'pointer',
              minWidth: '150px'
            }}
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
