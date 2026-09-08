'use client';

import React, { useState, useTransition } from 'react';
import { 
  Landmark, TrendingUp, TrendingDown, DollarSign, Calendar, 
  Building2, Download, Printer, RefreshCw, PieChart, BarChart3, 
  Wallet, Receipt, Users, ShieldAlert, ArrowUpRight, ArrowDownRight,
  ChevronDown, ChevronRight, FileSpreadsheet, CheckCircle2, Layers
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getFinancialPLReport, FinancialPLData } from '@/app/actions/financialPl';
import * as XLSX from 'xlsx';

interface Props {
  initialData: FinancialPLData;
  branches: { id: string; name: string }[];
  initialBranchId: string;
}

export default function FinancialPLClient({ initialData, branches, initialBranchId }: Props) {
  const [data, setData] = useState<FinancialPLData>(initialData);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(initialBranchId);
  const [startDate, setStartDate] = useState<string>(initialData.period.startDate);
  const [endDate, setEndDate] = useState<string>(initialData.period.endDate);
  const [activeTab, setActiveTab] = useState<'pl' | 'balance' | 'branches' | 'charts'>('pl');
  const [expandedOpex, setExpandedOpex] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  // Quick Date Range helper
  const handleQuickDate = (type: 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'last_30') => {
    const now = new Date();
    let s = new Date();
    let e = new Date();

    if (type === 'this_month') {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (type === 'last_month') {
      s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      e = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (type === 'this_quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      s = new Date(now.getFullYear(), quarter * 3, 1);
      e = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
    } else if (type === 'this_year') {
      s = new Date(now.getFullYear(), 0, 1);
      e = new Date(now.getFullYear(), 11, 31);
    } else if (type === 'last_30') {
      s = new Date();
      s.setDate(now.getDate() - 30);
      e = new Date();
    }

    const sStr = s.toISOString().split('T')[0];
    const eStr = e.toISOString().split('T')[0];
    setStartDate(sStr);
    setEndDate(eStr);
    loadData(sStr, eStr, selectedBranchId);
  };

  const loadData = (s: string, e: string, bId: string) => {
    startTransition(async () => {
      try {
        const res = await getFinancialPLReport(s, e, bId);
        setData(res);
      } catch (err: any) {
        alert('Error al consultar datos financieros: ' + err.message);
      }
    });
  };

  const handleBranchChange = (newBranchId: string) => {
    setSelectedBranchId(newBranchId);
    loadData(startDate, endDate, newBranchId);
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(startDate, endDate, selectedBranchId);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: P&L Summary
    const plRows = [
      ['ESTADO DE RESULTADOS (P&L) - CAANMA'],
      [`Sucursal: ${data.filterBranchName}`],
      [`Período: ${data.period.startDate} al ${data.period.endDate} (${data.period.daysCount} días)`],
      [''],
      ['CONCEPTO', 'MONTO (MXN)', '% SOBRE VENTAS'],
      ['1. INGRESOS OPERACIONALES', '', ''],
      ['(+) Ventas Brutas', data.revenue.grossSales, ''],
      ['(-) Devoluciones y Reembolsos', data.revenue.returns, ''],
      ['(=) VENTAS NETAS', data.revenue.netSales, '100.00%'],
      [''],
      ['2. COSTO DE VENTAS (COGS)', '', ''],
      ['(-) Costo de Mercancía Vendida', data.cogs.totalCost, `${((data.cogs.totalCost / (data.revenue.netSales || 1)) * 100).toFixed(2)}%`],
      ['(=) UTILIDAD BRUTA', data.cogs.grossProfit, `${data.cogs.grossMargin.toFixed(2)}%`],
      [''],
      ['3. GASTOS OPERATIVOS (OPEX)', '', ''],
      ['(-) Gastos Directos Registrados', data.opex.directExpenses, `${((data.opex.directExpenses / (data.revenue.netSales || 1)) * 100).toFixed(2)}%`],
      ...data.opex.expensesByCategory.map(c => [`   • ${c.category}`, c.amount, `${((c.amount / (data.revenue.netSales || 1)) * 100).toFixed(2)}%`]),
      ['(-) Costo de Nómina y Sueldos', data.opex.payrollCost, `${((data.opex.payrollCost / (data.revenue.netSales || 1)) * 100).toFixed(2)}%`],
      ['(-) Comisiones de Venta', data.opex.commissions, `${((data.opex.commissions / (data.revenue.netSales || 1)) * 100).toFixed(2)}%`],
      ['(=) TOTAL GASTOS OPERATIVOS', data.opex.totalOpex, `${data.opex.opexPercentage.toFixed(2)}%`],
      [''],
      ['4. EBITDA', data.ebitda.amount, `${data.ebitda.margin.toFixed(2)}%`],
      [''],
      ['5. IMPUESTOS ESTIMADOS', '', ''],
      ['(-) IVA Trasladado (Cobrado)', data.taxesAndNet.ivaCollected, ''],
      ['(+) IVA Acreditable (Gastos)', data.taxesAndNet.ivaPaid, ''],
      ['(=) IVA Neto a Pagar', data.taxesAndNet.netIvaPayable, ''],
      ['(-) ISR Corporativo Estimado (30%)', data.taxesAndNet.estimatedIncomeTax, ''],
      [''],
      ['6. UTILIDAD NETA ESTIMADA', data.taxesAndNet.netIncome, `${data.taxesAndNet.netMargin.toFixed(2)}%`]
    ];

    const wsPL = XLSX.utils.aoa_to_sheet(plRows);
    XLSX.utils.book_append_sheet(wb, wsPL, 'Estado_de_Resultados');

    // Sheet 2: Balance Sintético
    const balanceRows = [
      ['SITUACIÓN FINANCIERA & BALANCE GENERAL SINTÉTICO'],
      [`Sucursal: ${data.filterBranchName}`],
      [''],
      ['ACTIVOS CIRCULANTES', 'MONTO (MXN)'],
      ['Efectivo en Cajas / Turnos Activos', data.balanceSheet.cashInRegisters],
      ['Cuentas por Cobrar (Clientes con Crédito)', data.balanceSheet.accountsReceivable],
      ['Inventario Valorizado a Costo', data.balanceSheet.valuedInventoryAtCost],
      ['TOTAL ACTIVO CIRCULANTE', data.balanceSheet.totalCurrentAssets],
      [''],
      ['PASIVOS CIRCULANTES', 'MONTO (MXN)'],
      ['Cuentas por Pagar a Proveedores', data.balanceSheet.accountsPayable],
      ['Impuestos por Pagar (IVA Neto)', data.balanceSheet.pendingTaxes],
      ['TOTAL PASIVO CIRCULANTE', data.balanceSheet.totalCurrentLiabilities],
      [''],
      ['CAPITAL DE TRABAJO & RATIOS', 'VALOR'],
      ['Capital de Trabajo Neto (Activo - Pasivo)', data.balanceSheet.netWorkingCapital],
      ['Razón Circulante (Liquidez)', data.balanceSheet.currentRatio.toFixed(2)],
      ['Prueba Ácida', data.balanceSheet.acidTestRatio.toFixed(2)]
    ];
    const wsBalance = XLSX.utils.aoa_to_sheet(balanceRows);
    XLSX.utils.book_append_sheet(wb, wsBalance, 'Balance_Sintetico');

    // Sheet 3: Branch Matrix
    if (data.branchBreakdown.length > 0) {
      const branchHeaders = [
        'Sucursal', 'Ventas Netas', 'Costo Mercancía', 'Utilidad Bruta', 'Margen Bruto %',
        'Gastos Directos', 'Nómina', 'Comisiones', 'Total OPEX', 'EBITDA', 'Margen EBITDA %', 'Órdenes'
      ];
      const branchRowsData = data.branchBreakdown.map(b => [
        b.branchName, b.netSales, b.cogs, b.grossProfit, `${b.grossMargin.toFixed(2)}%`,
        b.expenses, b.payroll, b.commissions, b.totalOpex, b.ebitda, `${b.ebitdaMargin.toFixed(2)}%`, b.orderCount
      ]);
      const wsBranches = XLSX.utils.aoa_to_sheet([branchHeaders, ...branchRowsData]);
      XLSX.utils.book_append_sheet(wb, wsBranches, 'Comparativa_Sucursales');
    }

    XLSX.writeFile(wb, `PL_Financiero_${data.filterBranchName.replace(/[^a-zA-Z0-9]/g, '_')}_${data.period.startDate}_${data.period.endDate}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }} className="print:p-0">
      
      {/* Header Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }} className="print:hidden">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex' }}>
              <Landmark size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Estado de Resultados (P&L) & Finanzas
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
                Auditoría financiera integral, márgenes, costos, nómina, EBITDA y balance general.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportExcel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              backgroundColor: '#10b981',
              color: 'white',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(16,185,129,0.2)'
            }}
          >
            <FileSpreadsheet size={16} />
            Exportar Excel (.xlsx)
          </button>
          
          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              backgroundColor: '#0f172a',
              color: 'white',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Printer size={16} />
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Sucursal */}
      <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} className="print:hidden">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Selector de Sucursal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Building2 size={20} color="#64748b" />
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Sucursal</span>
              <select
                value={selectedBranchId}
                onChange={e => handleBranchChange(e.target.value)}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  color: '#1e293b',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">🏢 Todas las Sucursales (Consolidado)</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>📍 {b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Botones de Rango Rápido */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleQuickDate('this_month')}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', cursor: 'pointer', color: '#334155' }}
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate('last_month')}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', cursor: 'pointer', color: '#334155' }}
            >
              Mes Anterior
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate('this_quarter')}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', cursor: 'pointer', color: '#334155' }}
            >
              Trimestre
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate('this_year')}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', cursor: 'pointer', color: '#334155' }}
            >
              Año en Curso
            </button>
          </div>

          {/* Formulario Rango Manual */}
          <form onSubmit={handleFilterSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
            <span style={{ color: '#94a3b8' }}>a</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
            <button
              type="submit"
              disabled={isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.9rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
              {isPending ? 'Calculando...' : 'Filtrar'}
            </button>
          </form>

        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>ESTADO DE RESULTADOS & SITUACIÓN FINANCIERA</h1>
            <p style={{ fontSize: '0.85rem', color: '#475569' }}>
              Sucursal: <strong>{data.filterBranchName}</strong> | Período: <strong>{data.period.startDate} al {data.period.endDate}</strong> ({data.period.daysCount} días)
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#64748b' }}>
            Generado: {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* 5 KPIs Principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        
        {/* Card 1: Ventas Netas */}
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Ventas Netas</span>
            <span style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold' }}>
              {data.revenue.ordersCount} compras
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0f172a' }}>
            {formatCurrency(data.revenue.netSales)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
            Bruto: {formatCurrency(data.revenue.grossSales)} | Dev: -{formatCurrency(data.revenue.returns)}
          </div>
        </div>

        {/* Card 2: Utilidad Bruta */}
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Utilidad Bruta</span>
            <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold' }}>
              {data.cogs.grossMargin.toFixed(1)}% Margen
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#2563eb' }}>
            {formatCurrency(data.cogs.grossProfit)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
            Costo Mercancía (COGS): {formatCurrency(data.cogs.totalCost)}
          </div>
        </div>

        {/* Card 3: Gastos Operativos (OPEX) */}
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Total OPEX</span>
            <span style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold' }}>
              {data.opex.opexPercentage.toFixed(1)}% de Ventas
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#dc2626' }}>
            {formatCurrency(data.opex.totalOpex)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
            Gastos: {formatCurrency(data.opex.directExpenses)} | Nómina: {formatCurrency(data.opex.payrollCost)}
          </div>
        </div>

        {/* Card 4: EBITDA */}
        <div style={{ backgroundColor: data.ebitda.amount >= 0 ? '#f0fdf4' : '#fef2f2', padding: '1.25rem', borderRadius: '12px', border: data.ebitda.amount >= 0 ? '1px solid #bbf7d0' : '1px solid #fecaca', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: data.ebitda.amount >= 0 ? '#166534' : '#991b1b', textTransform: 'uppercase' }}>EBITDA Operativo</span>
            <span style={{ backgroundColor: data.ebitda.amount >= 0 ? '#dcfce7' : '#fee2e2', color: data.ebitda.amount >= 0 ? '#15803d' : '#b91c1c', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold' }}>
              {data.ebitda.margin.toFixed(1)}% Margen
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: data.ebitda.amount >= 0 ? '#16a34a' : '#ef4444' }}>
            {formatCurrency(data.ebitda.amount)}
          </div>
          <div style={{ fontSize: '0.75rem', color: data.ebitda.amount >= 0 ? '#166534' : '#991b1b', marginTop: '0.4rem' }}>
            {data.ebitda.amount >= 0 ? 'Rentabilidad Operativa Positiva' : 'Pérdida Operativa en el Período'}
          </div>
        </div>

        {/* Card 5: Utilidad Neta Estimada */}
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Utilidad Neta</span>
            <span style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold' }}>
              {data.taxesAndNet.netMargin.toFixed(1)}% Neto
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: data.taxesAndNet.netIncome >= 0 ? '#7e22ce' : '#dc2626' }}>
            {formatCurrency(data.taxesAndNet.netIncome)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
            ISR Est.: -{formatCurrency(data.taxesAndNet.estimatedIncomeTax)} | IVA: {formatCurrency(data.taxesAndNet.netIvaPayable)}
          </div>
        </div>

      </div>

      {/* Tabs Selector */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', gap: '0.5rem' }} className="print:hidden">
        <button
          onClick={() => setActiveTab('pl')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            border: 'none',
            borderBottom: activeTab === 'pl' ? '3px solid #059669' : '3px solid transparent',
            color: activeTab === 'pl' ? '#059669' : '#64748b',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Receipt size={18} />
          Estado de Resultados (P&L Cascada)
        </button>

        <button
          onClick={() => setActiveTab('balance')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            border: 'none',
            borderBottom: activeTab === 'balance' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'balance' ? '#2563eb' : '#64748b',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Wallet size={18} />
          Situación Financiera & Balance
        </button>

        <button
          onClick={() => setActiveTab('branches')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            border: 'none',
            borderBottom: activeTab === 'branches' ? '3px solid #8b5cf6' : '3px solid transparent',
            color: activeTab === 'branches' ? '#8b5cf6' : '#64748b',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Building2 size={18} />
          Comparativa por Sucursal ({data.branchBreakdown.length})
        </button>

        <button
          onClick={() => setActiveTab('charts')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            border: 'none',
            borderBottom: activeTab === 'charts' ? '3px solid #f59e0b' : '3px solid transparent',
            color: activeTab === 'charts' ? '#f59e0b' : '#64748b',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <BarChart3 size={18} />
          Evolución & Gráficas
        </button>
      </div>

      {/* TAB 1: P&L EN CASCADA */}
      {(activeTab === 'pl' || typeof window === 'undefined') && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              📊 Estado de Pérdidas y Ganancias (P&L)
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Base devengada | Cifras en Moneda Nacional (MXN)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            
            {/* SECCION 1: INGRESOS */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '1.05rem', color: '#0f172a' }}>
                <span>1. INGRESOS OPERACIONALES</span>
                <span>{formatCurrency(data.revenue.netSales)}</span>
              </div>
              <div style={{ marginTop: '0.75rem', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', color: '#475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>(+) Ventas Brutas de Mostrador y Pedidos ({data.revenue.ordersCount} transacciones)</span>
                  <span>{formatCurrency(data.revenue.grossSales)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>(-) Devoluciones y Notas de Crédito Aplicadas</span>
                  <span>-{formatCurrency(data.revenue.returns)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#16a34a', borderTop: '1px dashed #cbd5e1', paddingTop: '0.4rem' }}>
                  <span>(=) VENTAS NETAS (Facturación Neta)</span>
                  <span>{formatCurrency(data.revenue.netSales)} (100.00%)</span>
                </div>
              </div>
            </div>

            {/* SECCION 2: COSTO DE VENTAS */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #2563eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '1.05rem', color: '#0f172a' }}>
                <span>2. COSTO DE VENTAS (COGS)</span>
                <span style={{ color: '#dc2626' }}>-{formatCurrency(data.cogs.totalCost)}</span>
              </div>
              <div style={{ marginTop: '0.75rem', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', color: '#475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>(-) Costo de Mercancía Vendida (Valuado a Costo Unitario de Compra)</span>
                  <span>{formatCurrency(data.cogs.totalCost)} ({((data.cogs.totalCost / (data.revenue.netSales || 1)) * 100).toFixed(2)}%)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1rem', color: '#2563eb', borderTop: '1px solid #cbd5e1', paddingTop: '0.5rem' }}>
                  <span>(=) UTILIDAD BRUTA (Gross Profit)</span>
                  <span>{formatCurrency(data.cogs.grossProfit)} ({data.cogs.grossMargin.toFixed(2)}% Margen)</span>
                </div>
              </div>
            </div>

            {/* SECCION 3: GASTOS OPERATIVOS */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '1.05rem', color: '#0f172a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => setExpandedOpex(!expandedOpex)}>
                  {expandedOpex ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <span>3. GASTOS OPERATIVOS (OPEX)</span>
                </div>
                <span style={{ color: '#dc2626' }}>-{formatCurrency(data.opex.totalOpex)}</span>
              </div>
              
              {expandedOpex && (
                <div style={{ marginTop: '0.75rem', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', color: '#475569' }}>
                  
                  {/* Desglose Gastos Directos */}
                  <div style={{ fontWeight: 'bold', color: '#1e293b', marginTop: '0.25rem' }}>
                    Gastos Directos Registrados ({formatCurrency(data.opex.directExpenses)})
                  </div>
                  {data.opex.expensesByCategory.length > 0 ? (
                    data.opex.expensesByCategory.map((cat, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '1rem', fontSize: '0.85rem' }}>
                        <span>• {cat.category} ({cat.count} registros)</span>
                        <span>{formatCurrency(cat.amount)} ({cat.percentage.toFixed(1)}%)</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ paddingLeft: '1rem', fontStyle: 'italic', fontSize: '0.85rem', color: '#94a3b8' }}>
                      No hay gastos directos registrados en este período.
                    </div>
                  )}

                  {/* Nómina */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', borderTop: '1px dashed #e2e8f0', paddingTop: '0.4rem' }}>
                    <span>(-) Costo de Nómina, Sueldos e IMSS ({data.opex.employeeCount} colaboradores activos en {data.period.daysCount} días)</span>
                    <span>{formatCurrency(data.opex.payrollCost)}</span>
                  </div>

                  {/* Comisiones */}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>(-) Comisiones Ganadas por Vendedores</span>
                    <span>{formatCurrency(data.opex.commissions)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#dc2626', borderTop: '1px solid #cbd5e1', paddingTop: '0.4rem' }}>
                    <span>(=) TOTAL DE GASTOS OPERATIVOS</span>
                    <span>-{formatCurrency(data.opex.totalOpex)} ({data.opex.opexPercentage.toFixed(2)}% de Ventas)</span>
                  </div>
                </div>
              )}
            </div>

            {/* SECCION 4: EBITDA */}
            <div style={{ backgroundColor: data.ebitda.amount >= 0 ? '#f0fdf4' : '#fef2f2', padding: '1.25rem', borderRadius: '8px', border: data.ebitda.amount >= 0 ? '2px solid #86efac' : '2px solid #fca5a5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '900', fontSize: '1.25rem', color: data.ebitda.amount >= 0 ? '#166534' : '#991b1b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={22} />
                  <span>4. EBITDA (UTILIDAD ANTES DE IMPUESTOS Y DEPRECIACIÓN)</span>
                </div>
                <span>{formatCurrency(data.ebitda.amount)} ({data.ebitda.margin.toFixed(2)}%)</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: data.ebitda.amount >= 0 ? '#15803d' : '#b91c1c', margin: '0.25rem 0 0 0' }}>
                Métrica de rentabilidad operativa pura generada por las operaciones comerciales.
              </p>
            </div>

            {/* SECCION 5: IMPUESTOS ESTIMADOS */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '1.05rem', color: '#0f172a' }}>
                <span>5. IMPUESTOS ESTIMADOS</span>
                <span style={{ color: '#d97706' }}>-{formatCurrency(data.taxesAndNet.estimatedIncomeTax)}</span>
              </div>
              <div style={{ marginTop: '0.75rem', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', color: '#475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>IVA Trasladado Cobrado (16% sobre ventas)</span>
                  <span>{formatCurrency(data.taxesAndNet.ivaCollected)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>(-) IVA Acreditable Pagado (16% en gastos y compras)</span>
                  <span>-{formatCurrency(data.taxesAndNet.ivaPaid)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#d97706' }}>
                  <span>Saldo Estimado de IVA a Enterar</span>
                  <span>{formatCurrency(data.taxesAndNet.netIvaPayable)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>(-) ISR Corporativo Estimado (Tasa 30% sobre EBITDA positivo)</span>
                  <span>-{formatCurrency(data.taxesAndNet.estimatedIncomeTax)}</span>
                </div>
              </div>
            </div>

            {/* SECCION 6: UTILIDAD NETA */}
            <div style={{ backgroundColor: '#faf5ff', padding: '1.25rem', borderRadius: '8px', border: '2px solid #d8b4fe' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '900', fontSize: '1.35rem', color: data.taxesAndNet.netIncome >= 0 ? '#6b21a8' : '#dc2626' }}>
                <span>6. UTILIDAD NETA DEL EJERCICIO</span>
                <span>{formatCurrency(data.taxesAndNet.netIncome)} ({data.taxesAndNet.netMargin.toFixed(2)}%)</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#7e22ce', margin: '0.25rem 0 0 0' }}>
                Beneficio económico final después de deducir todos los costos, nóminas, gastos operativos e impuestos calculados.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: SITUACION FINANCIERA & BALANCE */}
      {activeTab === 'balance' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          
          {/* Activos */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '2px solid #ecfdf5', paddingBottom: '0.75rem' }}>
              <ArrowUpRight size={24} color="#059669" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>ACTIVOS CIRCULANTES</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#1e293b' }}>Efectivo en Cajas y Turnos</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Fondo disponible en cajas abiertas</div>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#0f172a' }}>
                  {formatCurrency(data.balanceSheet.cashInRegisters)}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#1e293b' }}>Cuentas por Cobrar (CxC)</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Cartera activa con clientes a crédito</div>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#2563eb' }}>
                  {formatCurrency(data.balanceSheet.accountsReceivable)}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#1e293b' }}>Inventario Valorizado a Costo</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Existencias físicas en bodega/tienda a precio costo</div>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#059669' }}>
                  {formatCurrency(data.balanceSheet.valuedInventoryAtCost)}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', marginTop: '0.5rem' }}>
                <span style={{ fontWeight: '900', fontSize: '1.1rem', color: '#065f46' }}>TOTAL ACTIVO CIRCULANTE</span>
                <span style={{ fontWeight: '900', fontSize: '1.3rem', color: '#065f46' }}>{formatCurrency(data.balanceSheet.totalCurrentAssets)}</span>
              </div>
            </div>
          </div>

          {/* Pasivos */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '2px solid #fef2f2', paddingBottom: '0.75rem' }}>
              <ArrowDownRight size={24} color="#dc2626" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>PASIVOS CIRCULANTES</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#1e293b' }}>Cuentas por Pagar (CxP)</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Facturas pendientes de liquidar a proveedores</div>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#dc2626' }}>
                  {formatCurrency(data.balanceSheet.accountsPayable)}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#1e293b' }}>Impuestos por Pagar (IVA Neto)</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Saldo de IVA acumulado del período</div>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#d97706' }}>
                  {formatCurrency(data.balanceSheet.pendingTaxes)}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', marginTop: 'auto' }}>
                <span style={{ fontWeight: '900', fontSize: '1.1rem', color: '#991b1b' }}>TOTAL PASIVO CIRCULANTE</span>
                <span style={{ fontWeight: '900', fontSize: '1.3rem', color: '#991b1b' }}>{formatCurrency(data.balanceSheet.totalCurrentLiabilities)}</span>
              </div>
            </div>
          </div>

          {/* Ratios & Capital de Trabajo */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '1rem' }}>
              🛡️ Indicadores de Solvencia y Capital de Trabajo
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Capital de Trabajo Neto</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: data.balanceSheet.netWorkingCapital >= 0 ? '#16a34a' : '#dc2626', margin: '0.3rem 0' }}>
                  {formatCurrency(data.balanceSheet.netWorkingCapital)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {data.balanceSheet.netWorkingCapital >= 0 
                    ? 'Capacidad suficiente para operar y cubrir obligaciones inmediatas.' 
                    : 'Déficit de capital de trabajo; requiere inyección de liquidez o cobranza activa.'}
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Razón Circulante (Liquidez)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: data.balanceSheet.currentRatio >= 1.5 ? '#16a34a' : '#d97706', margin: '0.3rem 0' }}>
                  {data.balanceSheet.currentRatio.toFixed(2)}x
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Por cada \$1.00 de deuda a corto plazo, la empresa cuenta con \${data.balanceSheet.currentRatio.toFixed(2)} de activos.
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Prueba del Ácido (Sin Inventario)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: data.balanceSheet.acidTestRatio >= 1.0 ? '#16a34a' : '#d97706', margin: '0.3rem 0' }}>
                  {data.balanceSheet.acidTestRatio.toFixed(2)}x
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Capacidad de pago inmediata sin depender de la venta de inventarios.
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: MATRIZ COMPARATIVA POR SUCURSAL */}
      {activeTab === 'branches' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '2rem', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                🏪 Desempeño Financiero por Sucursal
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
                Comparativa de ingresos, costos, gastos y rentabilidad EBITDA tienda por tienda.
              </p>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Sucursal</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Ventas Netas</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Costo (COGS)</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Utilidad Bruta</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Margen Bruto</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total OPEX</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>EBITDA</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Margen EBITDA</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Órdenes</th>
              </tr>
            </thead>
            <tbody>
              {data.branchBreakdown.map((row, idx) => {
                const isProfitable = row.ebitda >= 0;
                return (
                  <tr key={row.branchId} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? 'white' : '#fcfcfd' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: '#0f172a' }}>
                      📍 {row.branchName}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(row.netSales)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#64748b' }}>
                      {formatCurrency(row.cogs)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#2563eb' }}>
                      {formatCurrency(row.grossProfit)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        {row.grossMargin.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#dc2626' }}>
                      {formatCurrency(row.totalOpex)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: '900', color: isProfitable ? '#16a34a' : '#ef4444' }}>
                      {formatCurrency(row.ebitda)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{ 
                        backgroundColor: isProfitable ? '#ecfdf5' : '#fef2f2', 
                        color: isProfitable ? '#059669' : '#dc2626', 
                        padding: '0.25rem 0.6rem', 
                        borderRadius: '9999px', 
                        fontWeight: 'bold', 
                        fontSize: '0.8rem' 
                      }}>
                        {row.ebitdaMargin.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#64748b' }}>
                      {row.orderCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: GRAFICAS & TENDENCIAS */}
      {activeTab === 'charts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          
          {/* Gráfico 1: Evolución Diaria */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '1rem' }}>
              📈 Evolución Diaria: Ventas vs Costos vs EBITDA
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
              {data.timeline.map((t, idx) => {
                const maxVal = Math.max(...data.timeline.map(x => Math.max(x.sales, x.cogs, x.ebitda)), 1);
                const salesPct = Math.min(100, Math.round((t.sales / maxVal) * 100));
                const cogsPct = Math.min(100, Math.round((t.cogs / maxVal) * 100));
                const ebitdaPct = Math.max(0, Math.min(100, Math.round((t.ebitda / maxVal) * 100)));

                return (
                  <div key={idx} style={{ padding: '0.6rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                      <span>{t.dateFormatted} ({t.date})</span>
                      <span>Ventas: <strong style={{ color: '#16a34a' }}>{formatCurrency(t.sales)}</strong> | EBITDA: <strong style={{ color: t.ebitda >= 0 ? '#059669' : '#dc2626' }}>{formatCurrency(t.ebitda)}</strong></span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${salesPct}%`, height: '100%', backgroundColor: '#10b981' }} title={`Ventas: ${formatCurrency(t.sales)}`} />
                      </div>
                      <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${cogsPct}%`, height: '100%', backgroundColor: '#3b82f6' }} title={`Costo: ${formatCurrency(t.cogs)}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gráfico 2: Desglose de Gastos Operativos por Categoría */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '1rem' }}>
              🥧 Distribución de Gastos Operativos
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#1e40af' }}>Nómina y Cargas Patronales</div>
                  <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>{data.opex.employeeCount} colaboradores activos</div>
                </div>
                <div style={{ fontWeight: '900', color: '#1e40af' }}>
                  {formatCurrency(data.opex.payrollCost)} ({((data.opex.payrollCost / (data.opex.totalOpex || 1)) * 100).toFixed(1)}%)
                </div>
              </div>

              {data.opex.expensesByCategory.map((cat, idx) => (
                <div key={idx} style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#334155' }}>{cat.category}</span>
                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#0f172a' }}>{formatCurrency(cat.amount)} ({cat.percentage.toFixed(1)}%)</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.round(cat.percentage))}%`, height: '100%', backgroundColor: '#ef4444' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
