'use client';

import { useState, useEffect } from 'react';
import DateRangeFilter, { DateRange } from './DateRangeFilter';
import { getAvailableFilters } from '@/app/actions/reportes';
import { Store, User, Filter, Tag } from 'lucide-react';
import { startOfDay, subDays, endOfDay } from 'date-fns';

export interface ReportFilterState {
  dateRange: DateRange;
  branchId: string;
  userId: string;
  brandId: string;
}

interface ReportFilterBarProps {
  onFilterChange: (filters: ReportFilterState) => void;
  disabled?: boolean;
  showDateRange?: boolean;
  showBranch?: boolean;
  showUser?: boolean;
  showBrand?: boolean;
  initialBranchId?: string;
}

export default function ReportFilterBar({
  onFilterChange,
  disabled = false,
  showDateRange = true,
  showBranch = true,
  showUser = true,
  showBrand = true,
  initialBranchId = 'ALL'
}: ReportFilterBarProps) {
  
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [users, setUsers] = useState<{id: string, name: string}[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  
  const [branchId, setBranchId] = useState(initialBranchId);
  const [userId, setUserId] = useState('ALL');
  const [brandId, setBrandId] = useState('ALL');
  
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
        const { branches, users, brands } = await getAvailableFilters();
        setBranches(branches);
        setUsers(users);
        setBrands(brands || []);
      } catch (e) {
        console.error("Error loading filters", e);
      } finally {
        setLoadingFilters(false);
      }
    }
    loadFilters();
  }, []);

  const handleApply = (newDateRange?: DateRange, newBranchId?: string, newUserId?: string, newBrandId?: string) => {
    const dr = newDateRange || dateRange;
    const bid = newBranchId !== undefined ? newBranchId : branchId;
    const uid = newUserId !== undefined ? newUserId : userId;
    const brid = newBrandId !== undefined ? newBrandId : brandId;

    onFilterChange({
      dateRange: dr,
      branchId: bid,
      userId: uid,
      brandId: brid
    });
  };

  const handleDateChange = (range: DateRange) => {
    setDateRange(range);
    handleApply(range, branchId, userId, brandId);
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setBranchId(val);
    handleApply(dateRange, val, userId, brandId);
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setUserId(val);
    handleApply(dateRange, branchId, val, brandId);
  };

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setBrandId(val);
    handleApply(dateRange, branchId, userId, val);
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
      border: '1px solid var(--pulpos-border)',
      marginBottom: '1.5rem',
      fontFamily: 'var(--font-geist-sans)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold', marginRight: '0.5rem' }}>
        <Filter size={18} /> Filtros:
      </div>

      {showDateRange && (
        <DateRangeFilter onFilterChange={handleDateChange} disabled={disabled || loadingFilters} />
      )}

      {showBranch && branches.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--pulpos-border)', borderRadius: '8px', padding: '0 0.5rem', backgroundColor: 'white' }}>
          <Store size={16} color="var(--pulpos-text-muted)" style={{ marginLeft: '0.5rem' }} />
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
              color: 'var(--pulpos-text)',
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
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--pulpos-border)', borderRadius: '8px', padding: '0 0.5rem', backgroundColor: 'white' }}>
          <User size={16} color="var(--pulpos-text-muted)" style={{ marginLeft: '0.5rem' }} />
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
              color: 'var(--pulpos-text)',
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
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--pulpos-border)', borderRadius: '8px', padding: '0 0.5rem', backgroundColor: 'white' }}>
          <Tag size={16} color="var(--pulpos-text-muted)" style={{ marginLeft: '0.5rem' }} />
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
              color: 'var(--pulpos-text)',
              cursor: 'pointer',
              minWidth: '150px'
            }}
          >
            <option value="ALL">Todas las Marcas</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
