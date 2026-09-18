'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  ShoppingCart, 
  Megaphone, 
  TrendingUp, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Copy, 
  MessageCircle, 
  DollarSign, 
  Search, 
  Filter, 
  RefreshCw,
  Store,
  ShieldCheck,
  Zap,
  ArrowRight,
  Package,
  Clock,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { applySuggestedProductPrice } from '@/app/actions/agents';
import { useToast } from '@/app/components/ui/CorporateToast';

interface AgentsHubClientProps {
  user: any;
  branch: any;
  initialSuppliersData: any;
  initialMarketingData: any;
  initialPricingData: any;
}

export default function AgentsHubClient({
  user,
  branch,
  initialSuppliersData,
  initialMarketingData,
  initialPricingData
}: AgentsHubClientProps) {
  const { success, error, info } = useToast();
  const [activeTab, setActiveTab] = useState<'compras' | 'marketing' | 'precios'>('compras');

  // Helper format currency
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  // State for Agent 1 (Suppliers)
  const [supplierTierFilter, setSupplierTierFilter] = useState<string>('ALL');
  const [supplierSearch, setSupplierSearch] = useState<string>('');

  // State for Agent 2 (Marketing)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('camp_reactivacion_b2b');
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);

  // State for Agent 3 (Pricing)
  const [pricingFilter, setPricingFilter] = useState<string>('OPORTUNIDADES');
  const [pricingSearch, setPricingSearch] = useState<string>('');
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [pricingList, setPricingList] = useState<any[]>(initialPricingData?.products || []);
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});

  const suppliers = initialSuppliersData?.suppliers || [];
  const suppliersSummary = initialSuppliersData?.summary || {};
  const criticalReorderItems = initialSuppliersData?.criticalReorderItems || [];

  const marketingSummary = initialMarketingData?.summary || {};
  const campaigns = initialMarketingData?.campaigns || [];
  const customers = initialMarketingData?.customers || [];

  const pricingSummary = initialPricingData?.summary || {};
  const opportunities = initialPricingData?.opportunities || [];

  // Filter suppliers
  const filteredSuppliers = suppliers.filter((sup: any) => {
    const matchesTier = supplierTierFilter === 'ALL' || sup.tier === supplierTierFilter;
    const matchesSearch = !supplierSearch || 
      sup.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      (sup.contactName && sup.contactName.toLowerCase().includes(supplierSearch.toLowerCase()));
    return matchesTier && matchesSearch;
  });

  // Filter pricing
  const filteredProducts = pricingList.filter((p: any) => {
    const matchesSearch = !pricingSearch || 
      p.name.toLowerCase().includes(pricingSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(pricingSearch.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(pricingSearch.toLowerCase()));

    if (!matchesSearch) return false;
    if (pricingFilter === 'OPORTUNIDADES') return p.marginOpportunity > 0;
    if (pricingFilter === 'CRITICO') return p.marginStatus === 'CRITICO';
    if (pricingFilter === 'ESTRELLA') return p.quadrant === 'ESTRELLA';
    if (pricingFilter === 'GANCHO_VOLUMEN') return p.quadrant === 'GANCHO_VOLUMEN';
    return true;
  });

  // Copy campaign template
  const handleCopyTemplate = (camp: any) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(camp.whatsappTemplate);
      setCopiedTemplateId(camp.id);
      success("Texto de campaña copiado al portapapeles.", "Plantilla Copiada");
      setTimeout(() => setCopiedTemplateId(null), 3000);
    }
  };

  // Build WhatsApp Link
  const buildWhatsAppLink = (phone: string, template: string, customerName: string) => {
    if (!phone) return '#';
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `52${cleanPhone}`;
    }
    const personalizedText = template.replace('{cliente}', customerName || 'Estimado cliente');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(personalizedText)}`;
  };

  // Apply suggested price
  const handleApplyPrice = async (productId: string, priceToApply: number) => {
    try {
      setUpdatingProductId(productId);
      const res = await applySuggestedProductPrice(productId, priceToApply);
      if (res.success) {
        setPricingList(prev => prev.map(p => {
          if (p.id === productId) {
            const newMarginAmt = Math.max(0, priceToApply - p.cost);
            const newMarginPct = priceToApply > 0 ? Math.round((newMarginAmt / priceToApply) * 100) : 0;
            return {
              ...p,
              price: priceToApply,
              marginAmount: newMarginAmt,
              marginPct: newMarginPct,
              marginOpportunity: 0,
              marginStatus: newMarginPct < 18 ? 'CRITICO' : newMarginPct < 30 ? 'REGULAR' : newMarginPct < 45 ? 'SALUDABLE' : 'PREMIUM'
            };
          }
          return p;
        }));
        success(`Precio actualizado con éxito a ${formatMoney(priceToApply)}.`, "Precio Actualizado");
      } else {
        error(res.error || "No se pudo actualizar el precio.", "Error");
      }
    } catch (err: any) {
      error(err.message || "Error al aplicar el precio.", "Error");
    } finally {
      setUpdatingProductId(null);
    }
  };

  const activeCampaign = campaigns.find((c: any) => c.id === selectedCampaignId) || campaigns[0];

  return (
    <div className="w-full min-h-screen bg-slate-50/60 pb-16">
      
      {/* Top Header Card */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Inteligencia de Negocio • Office City
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Panel de Agentes Estratégicos
              </h1>
              <p className="text-slate-500 text-sm max-w-2xl">
                Análisis automático para maximizar rentabilidad con proveedores, retener clientes B2B y optimizar márgenes de venta.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 self-start md:self-auto">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <Store className="w-4 h-4 text-indigo-600" />
                <span>Sucursal: <strong className="text-slate-900">{branch?.name || 'Matriz'}</strong></span>
              </div>
              <span className="text-slate-300">|</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                En Línea
              </span>
            </div>

          </div>

          {/* Clean Modern Tab Navigation */}
          <div className="mt-8 flex flex-wrap gap-2 sm:gap-3 border-t border-slate-100 pt-5">
            <button
              onClick={() => setActiveTab('compras')}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all shadow-sm ${
                activeTab === 'compras'
                  ? 'bg-indigo-600 text-white shadow-indigo-600/20 ring-2 ring-indigo-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              1. Compras & Proveedores
              {criticalReorderItems.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-black rounded-full bg-rose-500 text-white">
                  {criticalReorderItems.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('marketing')}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all shadow-sm ${
                activeTab === 'marketing'
                  ? 'bg-indigo-600 text-white shadow-indigo-600/20 ring-2 ring-indigo-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              2. Marketing & Fidelización Semanal
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                3 Campañas
              </span>
            </button>

            <button
              onClick={() => setActiveTab('precios')}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all shadow-sm ${
                activeTab === 'precios'
                  ? 'bg-indigo-600 text-white shadow-indigo-600/20 ring-2 ring-indigo-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              3. Precios, Márgenes & Competencia
              {opportunities.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-black rounded-full bg-amber-400 text-slate-950">
                  +{opportunities.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* ======================================================== */}
        {/* TAB 1: COMPRAS Y PROVEEDORES */}
        {/* ======================================================== */}
        {activeTab === 'compras' && (
          <div className="space-y-8">
            
            {/* Top 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proveedores en Catálogo</p>
                  <h3 className="text-3xl font-black text-slate-900">{suppliersSummary.totalSuppliers || 0}</h3>
                  <p className="text-xs text-indigo-600 font-semibold">
                    {suppliersSummary.strategicCount || 0} Clave • {suppliersSummary.volumeCount || 0} Volumen • {suppliersSummary.specializedCount || 0} Especializados
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ventas de su Catálogo</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                    {formatMoney(suppliersSummary.totalSalesAll)}
                  </h3>
                  <p className="text-xs text-emerald-600 font-bold">
                    Margen Promedio: {suppliersSummary.avgMarginAll || 0}%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inversión en Compras</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                    {formatMoney(suppliersSummary.totalPurchasesAll)}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Facturas de compra registradas</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alertas de Stock Mínimo</p>
                  <h3 className="text-3xl font-black text-rose-600">{criticalReorderItems.length}</h3>
                  <p className="text-xs text-rose-500 font-semibold">Artículos que requieren resurtido</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>

            </div>

            {/* Critical Reorder Panel */}
            {criticalReorderItems.length > 0 && (
              <div className="bg-white rounded-3xl border border-rose-200 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-rose-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Productos con Existencia Crítica</h2>
                      <p className="text-xs text-slate-500">
                        Artículos con stock igual o inferior al mínimo configurado en la sucursal.
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/productos/pedidos/nuevo"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all self-start sm:self-auto"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Generar Pedido de Compra Sugerido
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
                  {criticalReorderItems.slice(0, 6).map((item: any) => (
                    <div key={item.id} className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900 line-clamp-2">{item.name}</p>
                        <p className="text-xs text-slate-500 mt-1">Proveedor: <strong className="text-slate-700">{item.supplierName || 'General'}</strong></p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                        <div>
                          <span className="font-bold text-rose-600">Stock Actual: {item.stock}</span>
                          <span className="text-slate-400"> (Mín: {item.minStock})</span>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs">
                          Sugerido: +{item.suggestedQty} u
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suppliers Ranking & Classification Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              
              {/* Table Toolbar */}
              <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    Ranking y Dictamen de Proveedores
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Evaluación basada en <strong>ventas reales</strong>, <strong>margen bruto</strong> y <strong>rotación de catálogo</strong> para decidir con quién trabajar más.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o contacto..."
                      value={supplierSearch}
                      onChange={(e) => setSupplierSearch(e.target.value)}
                      className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56 sm:w-64"
                    />
                  </div>

                  <select
                    value={supplierTierFilter}
                    onChange={(e) => setSupplierTierFilter(e.target.value)}
                    className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">Todas las Categorías</option>
                    <option value="ESTRATEGICO">🌟 Clave Estratégicos (Alto Margen + Ventas)</option>
                    <option value="VOLUMEN">⚡ Alto Volumen / Tráfico</option>
                    <option value="ESPECIALIZADO">💎 Especializados (Buen Margen)</option>
                    <option value="EN_RIESGO">⚠️ Lenta Rotación</option>
                  </select>
                </div>
              </div>

              {/* Suppliers List Items */}
              <div className="divide-y divide-slate-100">
                {filteredSuppliers.length === 0 ? (
                  <div className="p-16 text-center">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-base font-bold text-slate-700">No se encontraron proveedores</p>
                    <p className="text-xs text-slate-400 mt-1">Verifica tus filtros o el término de búsqueda.</p>
                  </div>
                ) : (
                  filteredSuppliers.map((sup: any) => {
                    const isStrategic = sup.tier === 'ESTRATEGICO';
                    const isVolume = sup.tier === 'VOLUMEN';
                    const isSpecialized = sup.tier === 'ESPECIALIZADO';

                    return (
                      <div key={sup.id} className="p-6 sm:p-7 hover:bg-slate-50/70 transition-colors">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                          
                          {/* Left: Supplier Info & Verdict */}
                          <div className="flex items-start gap-4 flex-1">
                            
                            {/* Score Circle */}
                            <div className="flex flex-col items-center justify-center shrink-0">
                              <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black shadow-sm ${
                                isStrategic ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-300' :
                                isVolume ? 'bg-blue-50 text-blue-700 border-2 border-blue-300' :
                                isSpecialized ? 'bg-purple-50 text-purple-700 border-2 border-purple-300' :
                                'bg-slate-100 text-slate-600 border-2 border-slate-200'
                              }`}>
                                <span className="text-lg leading-none">{sup.overallScore}</span>
                                <span className="text-[9px] uppercase tracking-wider font-extrabold mt-0.5">Score</span>
                              </div>
                            </div>

                            <div className="space-y-1.5 flex-1">
                              <div className="flex flex-wrap items-center gap-2.5">
                                <h3 className="text-base font-black text-slate-900">{sup.name}</h3>
                                
                                <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase ${
                                  isStrategic ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                  isVolume ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                  isSpecialized ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                  'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}>
                                  {isStrategic && '🌟 Clave Estratégico'}
                                  {isVolume && '⚡ Alto Volumen'}
                                  {isSpecialized && '💎 Especializado'}
                                  {!isStrategic && !isVolume && !isSpecialized && '⚠️ Lenta Rotación'}
                                </span>
                              </div>

                              <p className="text-xs text-slate-500">
                                {sup.contactName ? `Contacto: ${sup.contactName}` : 'Sin contacto'}
                                {sup.phone ? ` • Tel: ${sup.phone}` : ''}
                                {` • ${sup.productsCount} productos en catálogo`}
                              </p>

                              {/* Actionable Verdict Box */}
                              <div className="mt-3 bg-slate-100/90 rounded-2xl p-3 text-xs text-slate-800 border border-slate-200/80 leading-relaxed max-w-3xl">
                                <strong className="text-indigo-950 font-bold">Recomendación del Agente: </strong>
                                {sup.recommendation}
                              </div>
                            </div>

                          </div>

                          {/* Right: Key Financial Indicators */}
                          <div className="flex flex-wrap xl:flex-nowrap items-center gap-6 xl:gap-8 pt-4 xl:pt-0 border-t xl:border-t-0 border-slate-100 shrink-0">
                            
                            <div className="text-left xl:text-right min-w-[110px]">
                              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Ventas Catálogo</p>
                              <p className="text-base font-black text-slate-900">
                                {formatMoney(sup.totalSalesGenerated)}
                              </p>
                            </div>

                            <div className="text-left xl:text-right min-w-[90px]">
                              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Margen Bruto</p>
                              <p className={`text-base font-black ${sup.grossMarginPct >= 30 ? 'text-emerald-600' : 'text-slate-800'}`}>
                                {sup.grossMarginPct}%
                              </p>
                            </div>

                            <div className="text-left xl:text-right min-w-[90px]">
                              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Rotación</p>
                              <p className="text-base font-black text-indigo-600">{sup.sellThroughRate}%</p>
                            </div>

                            <div>
                              <Link
                                href={`/productos/pedidos/nuevo?supplierId=${sup.id}`}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all whitespace-nowrap"
                              >
                                <ShoppingCart className="w-4 h-4" />
                                Crear Pedido
                              </Link>
                            </div>

                          </div>

                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: MARKETING Y FIDELIZACIÓN SEMANAL */}
        {/* ======================================================== */}
        {activeTab === 'marketing' && (
          <div className="space-y-8">
            
            {/* Top 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes B2B Analizados</p>
                  <h3 className="text-3xl font-black text-slate-900">{marketingSummary.totalCustomers || 0}</h3>
                  <p className="text-xs text-indigo-600 font-semibold">Segmentación por frecuencia y monto</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cuentas Clave VIP</p>
                  <h3 className="text-3xl font-black text-emerald-600">{marketingSummary.vipCount || 0}</h3>
                  <p className="text-xs text-emerald-600 font-medium">Mayor recurrencia y facturación</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Riesgo de Fuga</p>
                  <h3 className="text-3xl font-black text-amber-600">{marketingSummary.riskCount || 0}</h3>
                  <p className="text-xs text-amber-600 font-medium">&gt; 25 días sin compras de insumos</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alto Potencial</p>
                  <h3 className="text-3xl font-black text-purple-600">{marketingSummary.potentialCount || 0}</h3>
                  <p className="text-xs text-purple-600 font-medium">Clientes para venta cruzada</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
              </div>

            </div>

            {/* Campaign Selector Pills */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {campaigns.map((camp: any) => {
                const isSelected = selectedCampaignId === camp.id;
                return (
                  <button
                    key={camp.id}
                    onClick={() => setSelectedCampaignId(camp.id)}
                    className={`p-6 rounded-3xl text-left transition-all border shadow-sm ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 ring-4 ring-indigo-500/20 shadow-xl'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                        isSelected 
                          ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/30' 
                          : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {camp.badge || 'Campaña'}
                      </span>
                      <span className={`text-xs font-bold ${isSelected ? 'text-indigo-300' : 'text-slate-500'}`}>
                        {camp.audienceCount} clientes calificados
                      </span>
                    </div>
                    <h3 className="font-bold text-base leading-snug">{camp.title}</h3>
                    <p className={`text-xs mt-2 line-clamp-2 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {camp.objective}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Selected Campaign Interactive Box */}
            {activeCampaign && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-8">
                
                {/* Campaign Header Details */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Campaña Semanal Lista para Envío
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 mt-2">{activeCampaign.title}</h2>
                    <p className="text-xs text-slate-500">
                      <strong>Público Objetivo:</strong> {activeCampaign.targetSegment}
                    </p>
                    <p className="text-xs text-indigo-600 font-semibold">
                      <strong>Incentivo Comercial:</strong> {activeCampaign.discountSuggested}
                    </p>
                  </div>

                  <button
                    onClick={() => handleCopyTemplate(activeCampaign)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all self-start lg:self-auto"
                  >
                    <Copy className="w-4 h-4" />
                    {copiedTemplateId === activeCampaign.id ? "¡Texto Copiado!" : "Copiar Texto de Campaña"}
                  </button>
                </div>

                {/* WhatsApp Message Preview */}
                <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                    <span className="flex items-center gap-2 text-emerald-400 font-bold">
                      <MessageCircle className="w-4 h-4" />
                      Plantilla de Mensaje para WhatsApp
                    </span>
                    <span>La variable &#123;cliente&#125; se sustituye por el nombre del cliente</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-200 leading-relaxed bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
                    {activeCampaign.whatsappTemplate}
                  </pre>
                </div>

                {/* Recipients List with 1-Click WhatsApp buttons */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Destinatarios Calificados ({activeCampaign.recipients?.length || 0})
                      </h3>
                      <p className="text-xs text-slate-500">Haz clic en "Enviar WhatsApp" para abrir el chat personalizado con el mensaje precargado.</p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {activeCampaign.recipients?.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-xs">
                        No hay clientes registrados en este segmento en este momento.
                      </div>
                    ) : (
                      activeCampaign.recipients.map((c: any) => {
                        const waLink = buildWhatsAppLink(c.phone, activeCampaign.whatsappTemplate, c.name);
                        return (
                          <div key={c.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                            <div>
                              <p className="text-sm font-black text-slate-900">{c.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {c.phone ? `📱 ${c.phone}` : '⚠️ Sin teléfono registrado'} • Histórico: <strong>{formatMoney(c.totalSpent)}</strong> ({c.salesCount} compras)
                                {c.daysSinceLastSale < 999 && ` • Última compra: hace ${c.daysSinceLastSale} días`}
                              </p>
                            </div>

                            <div>
                              {c.phone ? (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  Enviar WhatsApp
                                </a>
                              ) : (
                                <span className="px-3.5 py-2 bg-slate-100 text-slate-400 font-semibold text-xs rounded-xl">
                                  Sin Teléfono
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PRECIOS, MÁRGENES & BENCHMARKING */}
        {/* ======================================================== */}
        {activeTab === 'precios' && (
          <div className="space-y-8">
            
            {/* Top 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Margen Promedio Catálogo</p>
                  <h3 className="text-3xl font-black text-slate-900">{pricingSummary.avgMargin || 0}%</h3>
                  <p className="text-xs text-indigo-600 font-semibold">{pricingSummary.totalProducts || 0} artículos activos</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Oportunidades de Margen</p>
                  <h3 className="text-3xl font-black text-amber-600">{pricingSummary.opportunitiesCount || 0}</h3>
                  <p className="text-xs text-amber-600 font-medium">Precios por debajo del óptimo</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ganancia Extra Mensual</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-emerald-600">
                    +{formatMoney(pricingSummary.projectedMonthlyExtraProfit)}
                  </h3>
                  <p className="text-xs text-emerald-600 font-medium">Proyección al ajustar precios sugeridos</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Margen Crítico (&lt;18%)</p>
                  <h3 className="text-3xl font-black text-rose-600">{pricingSummary.criticalMarginCount || 0}</h3>
                  <p className="text-xs text-rose-500 font-medium">Revisar costos con el fabricante</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>

            </div>

            {/* Pricing Matrix Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              
              {/* Table Toolbar */}
              <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    Matriz de Optimización de Precios
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Compara tus precios contra el margen objetivo del sector (30-35%) y actualiza el precio de venta en 1 clic.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar producto o SKU..."
                      value={pricingSearch}
                      onChange={(e) => setPricingSearch(e.target.value)}
                      className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56 sm:w-64"
                    />
                  </div>

                  <select
                    value={pricingFilter}
                    onChange={(e) => setPricingFilter(e.target.value)}
                    className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="OPORTUNIDADES">Oportunidades de Mayor Margen</option>
                    <option value="CRITICO">⚠️ Margen Crítico (&lt;18%)</option>
                    <option value="ESTRELLA">⭐ Productos Estrella</option>
                    <option value="GANCHO_VOLUMEN">⚡ Gancho de Tráfico</option>
                    <option value="ALL">Todo el Catálogo</option>
                  </select>
                </div>
              </div>

              {/* Products Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-4 px-6">Producto & Categoría</th>
                      <th className="py-4 px-4">Costo Base</th>
                      <th className="py-4 px-4">Precio Actual</th>
                      <th className="py-4 px-4">Margen Actual</th>
                      <th className="py-4 px-4">Rango Mercado Est.</th>
                      <th className="py-4 px-4">Precio Sugerido IA</th>
                      <th className="py-4 px-6 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-400">
                          No se encontraron productos con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p: any) => {
                        const isCritical = p.marginStatus === 'CRITICO';
                        const isHighProfit = p.marginStatus === 'PREMIUM';
                        const targetPrice = customPrices[p.id] ?? p.suggestedPrice;
                        const isUpdating = updatingProductId === p.id;

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 px-6">
                              <p className="font-black text-slate-900 text-sm">{p.name}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                SKU: {p.sku || '-'} • Categoría: {p.category}
                              </p>
                            </td>

                            <td className="py-4 px-4 font-bold text-slate-600">
                              {formatMoney(p.cost)}
                            </td>

                            <td className="py-4 px-4 font-black text-slate-900 text-sm">
                              {formatMoney(p.price)}
                            </td>

                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black ${
                                isCritical ? 'bg-rose-100 text-rose-800' :
                                isHighProfit ? 'bg-emerald-100 text-emerald-800' :
                                'bg-indigo-50 text-indigo-700'
                              }`}>
                                {p.marginPct}% ({formatMoney(p.marginAmount)})
                              </span>
                            </td>

                            <td className="py-4 px-4 text-slate-500 font-semibold text-[11px]">
                              {formatMoney(p.estimatedMarketMin)} - {formatMoney(p.estimatedMarketMax)}
                            </td>

                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 font-bold">$</span>
                                <input
                                  type="number"
                                  step="0.50"
                                  value={targetPrice}
                                  onChange={(e) => setCustomPrices(prev => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))}
                                  className="w-24 px-2.5 py-1.5 bg-amber-50 border border-amber-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                {p.marginOpportunity > 0 && (
                                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg whitespace-nowrap">
                                    +{formatMoney(p.marginOpportunity)}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-4 px-6 text-right">
                              <button
                                disabled={isUpdating}
                                onClick={() => handleApplyPrice(p.id, targetPrice)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow transition-all whitespace-nowrap"
                              >
                                {isUpdating ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                Aplicar
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
