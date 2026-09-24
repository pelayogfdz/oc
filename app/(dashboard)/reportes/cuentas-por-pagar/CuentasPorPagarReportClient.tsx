'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Calculator, ArrowRight, X, ExternalLink, Printer, Download, ArrowUpDown, Trash2, Receipt, CreditCard, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel } from '@/lib/exportExcel';
import { deleteSupplierPayment } from '@/app/actions/supplierPayment';

interface Branch {
  id: string;
  name: string;
}

interface Purchase {
  id: string;
  folio: string | null;
  supplierFolio: string | null;
  createdAt: string;
  dueDate: string | null;
  balanceDue: number;
  paymentMethod: string;
  status: string;
  branchId: string;
  supplier: {
    id: string;
    name: string;
    code: string | null;
    phone: string | null;
  } | null;
  branch: Branch;
}

export default function CuentasPorPagarReportClient({
  initialPurchases,
  initialPayments = [],
  branches
}: {
  initialPurchases: Purchase[];
  initialPayments?: any[];
  branches: Branch[];
}) {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [payments, setPayments] = useState<any[]>(initialPayments);
  const [search, setSearch] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'ALL' | 'PAID' | 'CURRENT' | 'OVERDUE'>('PENDING');
  const [modalStatusFilter, setModalStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'CURRENT' | 'OVERDUE'>('ALL');
  const [modalMainTab, setModalMainTab] = useState<'purchases' | 'payments'>('purchases');
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NOT_OVERDUE' | '0_15' | '15_30' | '30_60' | '60_90' | '90_PLUS'>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState<'NAME' | 'AMOUNT' | 'OVERDUE' | 'CURRENT' | 'ANTIQUITY'>('AMOUNT');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setPurchases(initialPurchases);
  }, [initialPurchases]);

  useEffect(() => {
    setPayments(initialPayments || []);
  }, [initialPayments]);

  const getDaysOverdue = (dueDateStr: string | null | undefined): number => {
    if (!dueDateStr) return -1;
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - dueDate.getTime();
    if (diffTime <= 0) return 0;
    
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getOldestDueDateText = (dueDateStr: string | null): { text: string; isOverdue: boolean; days: number } => {
    if (!dueDateStr) return { text: 'N/A', isOverdue: false, days: -9999 };
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return { text: `Vencido hace ${diffDays} día(s) (${dueDate.toLocaleDateString()})`, isOverdue: true, days: diffDays };
    } else if (diffDays === 0) {
      return { text: `Vence hoy (${dueDate.toLocaleDateString()})`, isOverdue: true, days: 0 };
    } else {
      return { text: `Vence en ${Math.abs(diffDays)} día(s) (${dueDate.toLocaleDateString()})`, isOverdue: false, days: diffDays };
    }
  };

  // Step 1: Filter purchases by branch, status filter and search term first
  const branchFilteredPurchases = useMemo(() => {
    return purchases.filter(purchase => {
      if (selectedBranchId !== 'ALL' && purchase.branchId !== selectedBranchId) {
        return false;
      }
      const days = getDaysOverdue(purchase.dueDate);
      const isPaid = (purchase.balanceDue || 0) <= 0.001;
      const isOverdue = !isPaid && days > 0;
      const isCurrent = !isPaid && days <= 0;

      if (statusFilter === 'PENDING' && isPaid) return false;
      if (statusFilter === 'PAID' && !isPaid) return false;
      if (statusFilter === 'OVERDUE' && !isOverdue) return false;
      if (statusFilter === 'CURRENT' && !isCurrent) return false;

      if (search.trim() !== '') {
        const term = search.toLowerCase();
        const supplierName = purchase.supplier?.name?.toLowerCase() || '';
        const supplierCode = purchase.supplier?.code?.toLowerCase() || '';
        const folioStr = purchase.folio?.toLowerCase() || '';
        const supplierFolioStr = purchase.supplierFolio?.toLowerCase() || '';
        if (!supplierName.includes(term) && !supplierCode.includes(term) && !folioStr.includes(term) && !supplierFolioStr.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [purchases, selectedBranchId, statusFilter, search]);

  // Step 2: Categorize into buckets
  const buckets = useMemo(() => {
    const categories = {
      ALL: { label: 'Todos', purchases: [] as Purchase[], total: 0 },
      NOT_OVERDUE: { label: 'Sin Vencer', purchases: [] as Purchase[], total: 0 },
      '0_15': { label: '0 a 15 días', purchases: [] as Purchase[], total: 0 },
      '15_30': { label: '15 a 30 días', purchases: [] as Purchase[], total: 0 },
      '30_60': { label: '30 a 60 días', purchases: [] as Purchase[], total: 0 },
      '60_90': { label: '60 a 90 días', purchases: [] as Purchase[], total: 0 },
      '90_PLUS': { label: 'Más de 90 días', purchases: [] as Purchase[], total: 0 }
    };

    branchFilteredPurchases.forEach(purchase => {
      const days = getDaysOverdue(purchase.dueDate);
      categories.ALL.purchases.push(purchase);
      categories.ALL.total += purchase.balanceDue || 0;

      if (days === 0 || days === -1) {
        categories.NOT_OVERDUE.purchases.push(purchase);
        categories.NOT_OVERDUE.total += purchase.balanceDue || 0;
      } else if (days > 0 && days <= 15) {
        categories['0_15'].purchases.push(purchase);
        categories['0_15'].total += purchase.balanceDue || 0;
      } else if (days > 15 && days <= 30) {
        categories['15_30'].purchases.push(purchase);
        categories['15_30'].total += purchase.balanceDue || 0;
      } else if (days > 30 && days <= 60) {
        categories['30_60'].purchases.push(purchase);
        categories['30_60'].total += purchase.balanceDue || 0;
      } else if (days > 60 && days <= 90) {
        categories['60_90'].purchases.push(purchase);
        categories['60_90'].total += purchase.balanceDue || 0;
      } else if (days > 90) {
        categories['90_PLUS'].purchases.push(purchase);
        categories['90_PLUS'].total += purchase.balanceDue || 0;
      }
    });

    return categories;
  }, [branchFilteredPurchases]);

  // Step 3: Filter by Active Age Bucket
  const finalFilteredPurchases = useMemo(() => {
    return buckets[activeFilter].purchases;
  }, [buckets, activeFilter]);

  // Step 4: Group filtered purchases by Supplier
  const groupedSuppliers = useMemo(() => {
    const groups: { [key: string]: any } = {};

    finalFilteredPurchases.forEach(purchase => {
      const supplierId = purchase.supplier?.id || 'unknown';
      if (!groups[supplierId]) {
        groups[supplierId] = {
          supplier: purchase.supplier || { id: 'unknown', name: 'Proveedor Desconocido', code: '-', phone: '-' },
          branch: purchase.branch,
          purchases: [],
          totalBalanceDue: 0,
          currentBalance: 0,
          overdueBalance: 0,
          oldestDueDate: null as string | null
        };
      }

      groups[supplierId].purchases.push(purchase);
      groups[supplierId].totalBalanceDue += purchase.balanceDue || 0;

      const days = getDaysOverdue(purchase.dueDate);
      const isPaid = (purchase.balanceDue || 0) <= 0.001;
      if (!isPaid) {
        if (days > 0) {
          groups[supplierId].overdueBalance += purchase.balanceDue || 0;
        } else {
          groups[supplierId].currentBalance += purchase.balanceDue || 0;
        }
      }

      if (purchase.dueDate) {
        if (!groups[supplierId].oldestDueDate || new Date(purchase.dueDate) < new Date(groups[supplierId].oldestDueDate!)) {
          groups[supplierId].oldestDueDate = purchase.dueDate;
        }
      }
    });

    let list = Object.values(groups);

    // Sorting
    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortBy === 'NAME') {
        valA = a.supplier.name.toLowerCase();
        valB = b.supplier.name.toLowerCase();
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      } else if (sortBy === 'AMOUNT') {
        valA = a.totalBalanceDue;
        valB = b.totalBalanceDue;
      } else if (sortBy === 'OVERDUE') {
        valA = a.overdueBalance;
        valB = b.overdueBalance;
      } else if (sortBy === 'CURRENT') {
        valA = a.currentBalance;
        valB = b.currentBalance;
      } else if (sortBy === 'ANTIQUITY') {
        valA = a.oldestDueDate ? new Date(a.oldestDueDate).getTime() : 9999999999999;
        valB = b.oldestDueDate ? new Date(b.oldestDueDate).getTime() : 9999999999999;
        // For antiquity asc means oldest first
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [finalFilteredPurchases, sortBy, sortOrder]);

  const handleSort = (column: 'NAME' | 'AMOUNT' | 'OVERDUE' | 'CURRENT' | 'ANTIQUITY') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'NAME' ? 'asc' : 'desc');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportGlobalExcel = () => {
    const headers = [
      'Proveedor',
      'Código',
      'Teléfono',
      'Sucursal',
      'Facturas Pendientes',
      'Saldo al Corriente',
      'Saldo Vencido',
      'Deuda Total',
      'Vencimiento Más Antiguo'
    ];
    const rows = groupedSuppliers.map(group => {
      const oldestDueInfo = getOldestDueDateText(group.oldestDueDate);
      return [
        group.supplier.name,
        group.supplier.code || '-',
        group.supplier.phone || '-',
        selectedBranchId === 'ALL' ? 'Todas las Sucursales' : group.branch.name,
        group.purchases.length,
        group.currentBalance,
        group.overdueBalance,
        group.totalBalanceDue,
        oldestDueInfo.text
      ];
    });

    exportToExcel(headers, rows, `Reporte_Cuentas_Por_Pagar_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportSupplierPurchases = () => {
    if (!selectedGroup) return;
    const headers = [
      'Folio Compra',
      'Folio Proveedor',
      'Fecha Compra',
      'Fecha Vencimiento',
      'Estado',
      'Monto Total',
      'Monto Pagado',
      'Saldo Pendiente'
    ];
    const rows = selectedGroup.purchases.map((p: any) => {
      const days = getDaysOverdue(p.dueDate);
      const isPaid = (p.balanceDue || 0) <= 0.001;
      const isItemOverdue = !isPaid && days > 0;
      const totalAmount = p.total !== undefined ? Number(p.total) : Number(p.balanceDue || 0);
      const balanceDue = Number(p.balanceDue || 0);
      const paidAmount = Math.max(0, totalAmount - balanceDue);

      return [
        p.folio ? `#${p.folio}` : `#${p.id.slice(0, 8).toUpperCase()}`,
        p.supplierFolio || '-',
        new Date(p.createdAt).toLocaleDateString(),
        p.dueDate ? new Date(p.dueDate).toLocaleDateString() : 'N/A',
        isPaid ? 'Pagada' : isItemOverdue ? `Vencido (${days} días)` : 'Al Corriente',
        totalAmount,
        paidAmount,
        balanceDue
      ];
    });

    exportToExcel(headers, rows, `Facturas_${selectedGroup.supplier.name.replace(/\s+/g, '_')}`);
  };

  const handleExportSupplierPayments = () => {
    if (!selectedGroup || supplierPayments.length === 0) return;
    const headers = [
      'ID Abono',
      'Fecha',
      'Proveedor',
      'Concepto / Razón',
      'Factura Compra',
      'Folio Factura Proveedor',
      'Usuario',
      'Monto Abono'
    ];
    const rows = supplierPayments.map((p: any) => [
      p.id.slice(0, 8).toUpperCase(),
      new Date(p.createdAt).toLocaleDateString() + ' ' + new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      selectedGroup.supplier.name,
      p.reason || 'Abono a Proveedor',
      p.purchase?.folio ? `#${p.purchase.folio}` : (p.purchaseId ? `#${p.purchaseId.slice(0, 8).toUpperCase()}` : 'Anticipo / Saldo a favor'),
      p.purchase?.supplierFolio || '-',
      p.user?.name || '-',
      p.amount
    ]);

    exportToExcel(headers, rows, `Abonos_${selectedGroup.supplier.name.replace(/\s+/g, '_')}`);
  };

  // Supplier payments for selected group in modal
  const supplierPayments = useMemo(() => {
    if (!selectedGroup?.supplier?.id) return [];
    return payments.filter((p: any) => p.supplierId === selectedGroup.supplier.id);
  }, [payments, selectedGroup]);

  // Modal specific status counts
  const modalCounts = useMemo(() => {
    if (!selectedGroup) return { all: 0, pending: 0, current: 0, overdue: 0, paid: 0 };
    let all = 0, pending = 0, current = 0, overdue = 0, paid = 0;
    selectedGroup.purchases.forEach((p: Purchase) => {
      all++;
      const isPaid = (p.balanceDue || 0) <= 0.001;
      const days = getDaysOverdue(p.dueDate);
      if (isPaid) {
        paid++;
      } else {
        pending++;
        if (days > 0) overdue++;
        else current++;
      }
    });
    return { all, pending, current, overdue, paid };
  }, [selectedGroup]);

  // Modal filtered purchases based on modalStatusFilter
  const modalFilteredPurchases = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.purchases.filter((p: Purchase) => {
      const isPaid = (p.balanceDue || 0) <= 0.001;
      const days = getDaysOverdue(p.dueDate);
      const isOverdue = !isPaid && days > 0;
      const isCurrent = !isPaid && days <= 0;

      if (modalStatusFilter === 'ALL') return true;
      if (modalStatusFilter === 'PAID') return isPaid;
      if (modalStatusFilter === 'PENDING') return !isPaid;
      if (modalStatusFilter === 'OVERDUE') return isOverdue;
      if (modalStatusFilter === 'CURRENT') return isCurrent;
      return true;
    });
  }, [selectedGroup, modalStatusFilter]);

  // Delete payment handler
  const handleDeletePayment = async (payment: any) => {
    const confirmMsg = `¿Estás seguro de que deseas eliminar este abono de ${formatCurrency(payment.amount)}?\n\nEsta acción revertirá la deuda en la factura de compra correspondiente y en el saldo pendiente del proveedor.`;
    if (!confirm(confirmMsg)) return;

    setDeletingPaymentId(payment.id);
    try {
      const res = await deleteSupplierPayment(payment.id);
      if (res.success) {
        // Update local payments
        setPayments(prev => prev.filter(p => p.id !== payment.id));

        // Update local purchases if purchaseId exists
        if (payment.purchaseId) {
          setPurchases(prev => prev.map(p => {
            if (p.id === payment.purchaseId) {
              const newBalance = Math.min((p as any).total || (p.balanceDue + payment.amount), p.balanceDue + payment.amount);
              return { ...p, balanceDue: newBalance };
            }
            return p;
          }));
        }

        // Update selectedGroup balances
        setSelectedGroup((prev: any) => {
          if (!prev) return null;
          const updatedPurchases = prev.purchases.map((p: any) => {
            if (p.id === payment.purchaseId) {
              const newBalance = Math.min(p.total || (p.balanceDue + payment.amount), p.balanceDue + payment.amount);
              return { ...p, balanceDue: newBalance };
            }
            return p;
          });
          const totalBalanceDue = updatedPurchases.reduce((acc: number, p: any) => acc + (p.balanceDue || 0), 0);
          return {
            ...prev,
            purchases: updatedPurchases,
            totalBalanceDue
          };
        });

        alert("Abono eliminado y saldo revertido exitosamente.");
        router.refresh();
      } else {
        alert("Error al eliminar el abono: " + (res.error || "Ocurrió un error inesperado"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDeletingPaymentId(null);
    }
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
            Reporte de Cuentas por Pagar (CxP)
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem', margin: 0 }}>
            Monitoreo y control de pasivos, facturas a crédito y antigüedad de saldos por proveedor
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#4338ca'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#4f46e5'}
          >
            <Printer size={16} /> Imprimir / PDF
          </button>
          <button
            onClick={handleExportGlobalExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              backgroundColor: '#0f172a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(15, 23, 42, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1e293b'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0f172a'}
          >
            <Download size={16} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Cuentas por Pagar
          </span>
          <div style={{ fontSize: '1.875rem', fontWeight: '900', color: '#1e293b', marginTop: '0.5rem' }}>
            {formatCurrency(groupedSuppliers.reduce((sum, g) => sum + g.totalBalanceDue, 0))}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
            {finalFilteredPurchases.length} facturas pendientes de liquidar
          </span>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Saldo Vencido
          </span>
          <div style={{ fontSize: '1.875rem', fontWeight: '900', color: '#dc2626', marginTop: '0.5rem' }}>
            {formatCurrency(groupedSuppliers.reduce((sum, g) => sum + g.overdueBalance, 0))}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem', display: 'block', fontWeight: '500' }}>
            {((groupedSuppliers.reduce((sum, g) => sum + g.overdueBalance, 0) / (groupedSuppliers.reduce((sum, g) => sum + g.totalBalanceDue, 0) || 1)) * 100).toFixed(1)}% del total vencido
          </span>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Saldo al Corriente
          </span>
          <div style={{ fontSize: '1.875rem', fontWeight: '900', color: '#16a34a', marginTop: '0.5rem' }}>
            {formatCurrency(groupedSuppliers.reduce((sum, g) => sum + g.currentBalance, 0))}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem', display: 'block', fontWeight: '500' }}>
            {((groupedSuppliers.reduce((sum, g) => sum + g.currentBalance, 0) / (groupedSuppliers.reduce((sum, g) => sum + g.totalBalanceDue, 0) || 1)) * 100).toFixed(1)}% al corriente
          </span>
        </div>
      </div>

      {/* Main Filter Section */}
      <div className="no-print" style={{ backgroundColor: 'white', padding: '1.25rem 1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar proveedor o folio de factura..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 1rem 0.5rem 2.25rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Branch Select */}
          <div>
            <select
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
              style={{
                padding: '0.5rem 2rem 0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                backgroundColor: 'white',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Todas las Sucursales</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.825rem', fontWeight: 'bold', color: '#475569' }}>Estado:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            style={{
              padding: '0.5rem 1.5rem 0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="PENDING">Con Deuda (Pendientes)</option>
            <option value="ALL">Todas las Facturas</option>
            <option value="CURRENT">Solo al Corriente</option>
            <option value="OVERDUE">Solo Vencidas</option>
            <option value="PAID">Solo Pagadas</option>
          </select>
        </div>
      </div>

      {/* Age Buckets Filter Bar */}
      <div className="no-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {Object.entries(buckets).map(([key, bucket]) => {
          const isActive = activeFilter === key;
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key as any)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: isActive ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                backgroundColor: isActive ? '#eef2ff' : 'white',
                color: isActive ? '#4f46e5' : '#475569',
                fontSize: '0.825rem',
                fontWeight: isActive ? 'bold' : 'normal',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{bucket.label}</span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 'bold',
                backgroundColor: isActive ? '#4f46e5' : '#f1f5f9',
                color: isActive ? 'white' : '#64748b',
                padding: '0.1rem 0.4rem',
                borderRadius: '9999px'
              }}>
                {bucket.purchases.length}
              </span>
              <span style={{ fontSize: '0.75rem', color: isActive ? '#4338ca' : '#94a3b8' }}>
                ({formatCurrency(bucket.total)})
              </span>
            </button>
          );
        })}
      </div>

      {/* Table Section */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
              <th onClick={() => handleSort('NAME')} style={{ padding: '0.85rem 1rem', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>Proveedor</span>
                  <ArrowUpDown size={13} color={sortBy === 'NAME' ? '#4f46e5' : '#94a3b8'} />
                </div>
              </th>
              {selectedBranchId === 'ALL' && (
                <th style={{ padding: '0.85rem 1rem' }}>Sucursal</th>
              )}
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Facturas</th>
              <th onClick={() => handleSort('CURRENT')} style={{ padding: '0.85rem 1rem', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                  <span>Al Corriente</span>
                  <ArrowUpDown size={13} color={sortBy === 'CURRENT' ? '#4f46e5' : '#94a3b8'} />
                </div>
              </th>
              <th onClick={() => handleSort('OVERDUE')} style={{ padding: '0.85rem 1rem', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                  <span>Vencido</span>
                  <ArrowUpDown size={13} color={sortBy === 'OVERDUE' ? '#4f46e5' : '#94a3b8'} />
                </div>
              </th>
              <th onClick={() => handleSort('AMOUNT')} style={{ padding: '0.85rem 1rem', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                  <span>Deuda Total</span>
                  <ArrowUpDown size={13} color={sortBy === 'AMOUNT' ? '#4f46e5' : '#94a3b8'} />
                </div>
              </th>
              <th onClick={() => handleSort('ANTIQUITY')} style={{ padding: '0.85rem 1rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                  <span>Antigüedad / Vencimiento</span>
                  <ArrowUpDown size={13} color={sortBy === 'ANTIQUITY' ? '#4f46e5' : '#94a3b8'} />
                </div>
              </th>
              <th className="no-print" style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {groupedSuppliers.map(group => {
              const oldestDueInfo = getOldestDueDateText(group.oldestDueDate);
              return (
                <tr key={group.supplier.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{group.supplier.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                      {group.supplier.code && `Cod: ${group.supplier.code}`} {group.supplier.phone && `| Tel: ${group.supplier.phone}`}
                    </div>
                  </td>
                  {selectedBranchId === 'ALL' && (
                    <td style={{ padding: '1rem', color: '#64748b' }}>
                      {group.branch?.name || '-'}
                    </td>
                  )}
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ backgroundColor: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem', color: '#334155' }}>
                      {group.purchases.length}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: group.currentBalance > 0 ? '#16a34a' : '#94a3b8' }}>
                    {formatCurrency(group.currentBalance)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', color: group.overdueBalance > 0 ? '#dc2626' : '#94a3b8' }}>
                    {formatCurrency(group.overdueBalance)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '900', color: '#1e293b', fontSize: '0.95rem' }}>
                    {formatCurrency(group.totalBalanceDue)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      color: oldestDueInfo.isOverdue ? '#dc2626' : '#16a34a',
                      backgroundColor: oldestDueInfo.isOverdue ? '#fef2f2' : '#f0fdf4',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      border: `1px solid ${oldestDueInfo.isOverdue ? '#fecaca' : '#bbf7d0'}`
                    }}>
                      {oldestDueInfo.text}
                    </span>
                  </td>
                  <td className="no-print" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                      <button
                        onClick={() => {
                          setSelectedGroup(group);
                          setModalMainTab('purchases');
                        }}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: 'white',
                          color: '#475569',
                          fontWeight: 'bold',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        Ver Detalle
                      </button>
                      {group.supplier.id !== 'unknown' && (
                        <Link
                          href={`/proveedores/cuentas`}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            backgroundColor: '#eef2ff',
                            color: '#4f46e5',
                            fontWeight: 'bold',
                            fontSize: '0.8rem',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                        >
                          Abonar <ArrowRight size={12} />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {groupedSuppliers.length === 0 && (
              <tr>
                <td colSpan={selectedBranchId === 'ALL' ? 8 : 7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  No hay deudas con proveedores o coincidencia con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Detalle de Cuentas por Pagar (Facturas y Abonos) */}
      {selectedGroup && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '850px', maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Detalle de Cuentas por Pagar</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.15rem', margin: 0 }}>{selectedGroup.supplier.name}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <button 
                  onClick={modalMainTab === 'purchases' ? handleExportSupplierPurchases : handleExportSupplierPayments}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.85rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor='#059669'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor='#10b981'}
                  title={modalMainTab === 'purchases' ? 'Exportar facturas de compra a Excel' : 'Exportar abonos realizados a Excel'}
                >
                  <Download size={15} /> Exportar Excel
                </button>
                <button 
                  onClick={() => setSelectedGroup(null)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Actions & Balance Summary panel */}
            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Al Corriente:</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#16a34a' }}>
                    {formatCurrency(selectedGroup.currentBalance)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Vencido:</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#dc2626' }}>
                    {formatCurrency(selectedGroup.overdueBalance)}
                  </span>
                </div>
                <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Deuda Total:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#1e293b' }}>
                    {formatCurrency(selectedGroup.totalBalanceDue)}
                  </span>
                </div>
              </div>
              {selectedGroup.supplier?.id && selectedGroup.supplier.id !== 'unknown' && (
                <Link 
                  href={`/proveedores/cuentas`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 0.75rem', backgroundColor: '#dc2626', borderRadius: '6px', color: 'white', fontWeight: 'bold', fontSize: '0.8rem', textDecoration: 'none' }}
                >
                  Registrar Abono / Pago <ArrowRight size={14} />
                </Link>
              )}
            </div>

            {/* Main Navigation Tabs: Facturas vs Historial de Abonos */}
            <div style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setModalMainTab('purchases')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: modalMainTab === 'purchases' ? '#ffffff' : 'transparent',
                  color: modalMainTab === 'purchases' ? '#0f172a' : '#64748b',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: modalMainTab === 'purchases' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Receipt size={16} color={modalMainTab === 'purchases' ? '#4f46e5' : '#64748b'} />
                <span>Facturas de Compra ({modalCounts.all})</span>
              </button>

              <button
                type="button"
                onClick={() => setModalMainTab('payments')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: modalMainTab === 'payments' ? '#ffffff' : 'transparent',
                  color: modalMainTab === 'payments' ? '#0f172a' : '#64748b',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: modalMainTab === 'payments' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <CreditCard size={16} color={modalMainTab === 'payments' ? '#10b981' : '#64748b'} />
                <span>Historial de Abonos Realizados ({supplierPayments.length})</span>
              </button>
            </div>

            {/* TAB 1: Facturas de Compra */}
            {modalMainTab === 'purchases' && (
              <>
                {/* Modal Status Filter Tabs */}
                <div style={{ padding: '0.75rem 1.5rem', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { key: 'ALL', label: 'Todas', count: modalCounts.all },
                    { key: 'PENDING', label: 'Con Deuda', count: modalCounts.pending },
                    { key: 'CURRENT', label: 'Al Corriente', count: modalCounts.current },
                    { key: 'OVERDUE', label: 'Vencidas', count: modalCounts.overdue },
                    { key: 'PAID', label: 'Pagadas', count: modalCounts.paid }
                  ].map(tab => {
                    const isActive = modalStatusFilter === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setModalStatusFilter(tab.key as any)}
                        style={{
                          padding: '0.3rem 0.75rem',
                          borderRadius: '9999px',
                          border: isActive ? '1px solid #6d28d9' : '1px solid #cbd5e1',
                          backgroundColor: isActive ? '#f5f3ff' : '#f8fafc',
                          color: isActive ? '#6d28d9' : '#475569',
                          fontSize: '0.8rem',
                          fontWeight: isActive ? 'bold' : 'normal',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <span>{tab.label}</span>
                        <span style={{
                          fontSize: '0.7rem',
                          backgroundColor: isActive ? '#6d28d9' : '#e2e8f0',
                          color: isActive ? 'white' : '#475569',
                          padding: '0.05rem 0.35rem',
                          borderRadius: '9999px',
                          fontWeight: 'bold'
                        }}>
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* List of Purchases */}
                <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Folio Compra</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Folio Proveedor</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Fecha</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Vencimiento</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center' }}>Estado</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Pagado</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Deuda</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalFilteredPurchases.map((purchase: Purchase) => {
                        const days = getDaysOverdue(purchase.dueDate);
                        const isPaid = (purchase.balanceDue || 0) <= 0.001;
                        const isItemOverdue = !isPaid && days > 0;
                        const totalAmount = (purchase as any).total !== undefined ? Number((purchase as any).total) : Number(purchase.balanceDue || 0);
                        const balanceDue = Number(purchase.balanceDue || 0);
                        const paidAmount = Math.max(0, totalAmount - balanceDue);

                        return (
                          <tr key={purchase.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'monospace', fontWeight: '500' }}>
                              {purchase.folio ? `#${purchase.folio}` : `#${purchase.id.slice(0,8).toUpperCase()}`}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', color: '#64748b' }}>
                              {purchase.supplierFolio ? purchase.supplierFolio : '-'}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', color: '#64748b' }}>
                              {new Date(purchase.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', color: isPaid ? '#64748b' : isItemOverdue ? '#dc2626' : '#16a34a', fontWeight: '500' }}>
                              {purchase.dueDate ? new Date(purchase.dueDate).toLocaleDateString() : 'N/A'}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                              {isPaid ? (
                                <span style={{ 
                                  fontSize: '0.725rem', 
                                  fontWeight: 'bold', 
                                  padding: '0.15rem 0.45rem', 
                                  borderRadius: '4px',
                                  backgroundColor: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe'
                                }}>
                                  ✓ Pagada
                                </span>
                              ) : (
                                <span style={{ 
                                  fontSize: '0.725rem', 
                                  fontWeight: 'bold', 
                                  padding: '0.15rem 0.45rem', 
                                  borderRadius: '4px',
                                  backgroundColor: isItemOverdue ? '#fef2f2' : '#f0fdf4',
                                  color: isItemOverdue ? '#dc2626' : '#16a34a',
                                  border: `1px solid ${isItemOverdue ? '#fecaca' : '#bbf7d0'}`
                                }}>
                                  {isItemOverdue ? `Vencido (${days}d)` : 'Al Corriente'}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#64748b' }}>
                              {formatCurrency(totalAmount)}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#16a34a', fontWeight: '500' }}>
                              {formatCurrency(paidAmount)}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: isPaid ? '#10b981' : isItemOverdue ? '#dc2626' : '#16a34a' }}>
                              {formatCurrency(balanceDue)}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                              <Link 
                                href={`/productos/compras/${purchase.id}`} 
                                target="_blank"
                                style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.825rem', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}
                              >
                                Detalle <ExternalLink size={12} />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                      {modalFilteredPurchases.length === 0 && (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                            No hay facturas que coincidan con el filtro seleccionado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* TAB 2: Historial de Abonos Realizados */}
            {modalMainTab === 'payments' && (
              <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>ID Abono</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Fecha y Hora</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Concepto / Razón</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Factura Asociada</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Usuario</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Monto</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierPayments.map((pmt: any) => {
                      const isDeleting = deletingPaymentId === pmt.id;
                      return (
                        <tr key={pmt.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.15s ease' }}>
                          <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'monospace', fontWeight: '600', color: '#334155' }}>
                            #{pmt.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', color: '#64748b' }}>
                            <div>{new Date(pmt.createdAt).toLocaleDateString()}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              {new Date(pmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', color: '#334155' }}>
                            {pmt.reason || 'Abono a Proveedor'}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>
                            {pmt.purchase ? (
                              <Link
                                href={`/productos/compras/${pmt.purchase.id}`}
                                target="_blank"
                                style={{ color: '#4f46e5', fontWeight: 'bold', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}
                              >
                                {pmt.purchase.folio ? `#${pmt.purchase.folio}` : `#${pmt.purchase.id.slice(0,8).toUpperCase()}`}
                                {pmt.purchase.supplierFolio ? ` (${pmt.purchase.supplierFolio})` : ''}
                                <ExternalLink size={11} />
                              </Link>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>Anticipo / General</span>
                            )}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                            {pmt.user?.name || '-'}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#16a34a', fontSize: '0.95rem' }}>
                            +{formatCurrency(pmt.amount)}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(pmt)}
                              disabled={isDeleting}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.35rem 0.65rem',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                cursor: isDeleting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={e => {
                                if (!isDeleting) e.currentTarget.style.backgroundColor = '#fee2e2';
                              }}
                              onMouseLeave={e => {
                                if (!isDeleting) e.currentTarget.style.backgroundColor = '#fef2f2';
                              }}
                              title="Eliminar este abono y revertir la deuda"
                            >
                              {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                              <span>Eliminar</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {supplierPayments.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                          No hay abonos registrados para este proveedor.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <button 
                onClick={modalMainTab === 'purchases' ? handleExportSupplierPurchases : handleExportSupplierPayments}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.95rem',
                  backgroundColor: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <Download size={15} /> {modalMainTab === 'purchases' ? 'Exportar Facturas a Excel (.xlsx)' : 'Exportar Abonos a Excel (.xlsx)'}
              </button>
              <button 
                onClick={() => setSelectedGroup(null)}
                style={{ padding: '0.45rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#334155', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
