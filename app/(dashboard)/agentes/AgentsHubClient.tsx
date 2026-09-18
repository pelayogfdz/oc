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
  ArrowUpRight, 
  Copy, 
  MessageCircle, 
  DollarSign, 
  Package, 
  Search, 
  Filter, 
  RefreshCw,
  Sliders,
  ExternalLink,
  ShieldCheck,
  Zap,
  Tag,
  Store
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
        success(`Precio actualizado con éxito a $${priceToApply.toLocaleString('es-MX', { minimumFractionDigits: 2 })}.`, "Precio Aplicado");
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
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              Inteligencia Comercial Office City
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Tríada de Agentes Estratégicos
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Toma decisiones automatizadas en compras a proveedores, ejecuta campañas de marketing de alta conversión y maximiza el margen de tus artículos frente al mercado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10 self-start md:self-auto">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Store className="w-4 h-4 text-emerald-400" />
              <span>Sucursal: <strong className="text-white">{branch?.name || 'Matriz'}</strong></span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Modo: <strong className="text-emerald-400">Activo (Local)</strong></span>
            </div>
          </div>
        </div>

        {/* Tab Selector Nav */}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-800/80 pt-6">
          <button
            onClick={() => setActiveTab('compras')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === 'compras'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/40'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            1. Agente de Compras & Proveedores
            {criticalReorderItems.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 text-xs font-black rounded-full bg-rose-500 text-white">
                {criticalReorderItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('marketing')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === 'marketing'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/40'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            2. Marketing & Fidelización Semanal
            <span className="ml-1.5 px-2 py-0.5 text-xs font-black rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              3 Listas
            </span>
          </button>

          <button
            onClick={() => setActiveTab('precios')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === 'precios'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/40'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            3. Precios, Márgenes & Competencia
            {opportunities.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 text-xs font-black rounded-full bg-amber-500 text-slate-950 font-extrabold">
                +{opportunities.length} Oportunidades
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: AGENTE DE COMPRAS Y PROVEEDORES */}
      {/* ======================================================== */}
      {activeTab === 'compras' && (
        <div className="space-y-6">
          
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Proveedores Evaluados</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{suppliersSummary.totalSuppliers || 0}</h3>
                <p className="text-xs text-indigo-600 font-medium mt-1">
                  {suppliersSummary.strategicCount || 0} Estratégicos | {suppliersSummary.riskCount || 0} En Riesgo
                </p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Building2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ventas de su Catálogo</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  ${(suppliersSummary.totalSalesAll || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-emerald-600 font-medium mt-1">Margen promedio {suppliersSummary.avgMarginAll || 0}%</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inversión en Compras</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  ${(suppliersSummary.totalPurchasesAll || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Histórico registrado</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <ShoppingCart className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Artículos en Mínimo Stock</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1">{criticalReorderItems.length}</h3>
                <p className="text-xs text-rose-500 font-medium mt-1">Requieren resurtido urgente</p>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Critical Reorder Panel if any */}
          {criticalReorderItems.length > 0 && (
            <div className="bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-200 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-md">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Alerta de Reabastecimiento Crítico</h2>
                    <p className="text-xs text-slate-600">
                      Productos con existencia igual o inferior al stock mínimo establecido.
                    </p>
                  </div>
                </div>
                <Link
                  href="/productos/pedidos/nuevo"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all self-start md:self-auto"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Generar Pedido de Compra Sugerido
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {criticalReorderItems.slice(0, 6).map((item: any) => (
                  <div key={item.id} className="bg-white p-3.5 rounded-xl border border-rose-100 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">{item.name}</p>
                      <p className="text-[11px] text-slate-500">Proveedor: {item.supplierName || 'General'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold text-rose-600">Stock: {item.stock}</span>
                        <span className="text-[11px] text-slate-400">/ Mín: {item.minStock}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-md">
                        Sugerido: +{item.suggestedQty} u
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suppliers Evaluation List */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Ranking y Recomendación de Proveedores
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  El agente analiza margen real, sell-through rate y volumen vendido para clasificar con quién conviene trabajar más.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar proveedor..."
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-56"
                  />
                </div>

                <select
                  value={supplierTierFilter}
                  onChange={(e) => setSupplierTierFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">Todas las Categorías</option>
                  <option value="ESTRATEGICO">Estratégicos (Máx. Rentabilidad)</option>
                  <option value="VOLUMEN">Volumen & Tráfico</option>
                  <option value="ESPECIALIZADO">Especializados (Alto Margen)</option>
                  <option value="EN_RIESGO">En Riesgo (Bajo Desempeño)</option>
                </select>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredSuppliers.length === 0 ? (
                <div className="p-12 text-center">
                  <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700">No se encontraron proveedores</p>
                  <p className="text-xs text-slate-400 mt-1">Asegúrate de registrar tus proveedores y asociar productos a sus catálogos.</p>
                </div>
              ) : (
                filteredSuppliers.map((sup: any) => {
                  const isStrategic = sup.tier === 'ESTRATEGICO';
                  const isVolume = sup.tier === 'VOLUMEN';
                  const isSpecialized = sup.tier === 'ESPECIALIZADO';
                  const isRisk = sup.tier === 'EN_RIESGO';

                  return (
                    <div key={sup.id} className="p-5 hover:bg-slate-50/80 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        
                        {/* Supplier Info */}
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm shrink-0 ${
                            isStrategic ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                            isVolume ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                            isSpecialized ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                            'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {sup.overallScore}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-bold text-slate-900">{sup.name}</h3>
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase ${
                                isStrategic ? 'bg-emerald-500 text-white' :
                                isVolume ? 'bg-blue-500 text-white' :
                                isSpecialized ? 'bg-purple-500 text-white' :
                                'bg-rose-500 text-white'
                              }`}>
                                {isStrategic && '🌟 Estratégico'}
                                {isVolume && '⚡ Alto Volumen'}
                                {isSpecialized && '💎 Especializado'}
                                {isRisk && '⚠️ En Riesgo'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500">
                              {sup.contactName ? `Contacto: ${sup.contactName}` : 'Sin contacto asignado'}
                              {sup.phone ? ` • Tel: ${sup.phone}` : ''}
                              {` • ${sup.productsCount} productos en catálogo`}
                            </p>

                            <div className="mt-2 bg-slate-100/90 rounded-xl p-2.5 text-xs text-slate-700 border border-slate-200/60 max-w-2xl">
                              <strong className="text-indigo-950 font-bold">Dictamen del Agente: </strong>
                              {sup.recommendation}
                            </div>
                          </div>
                        </div>

                        {/* Financial Metrics Badges */}
                        <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 lg:gap-6 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                          <div className="text-left lg:text-right">
                            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Ventas Totales</p>
                            <p className="text-sm font-black text-slate-900">
                              ${sup.totalSalesGenerated.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </p>
                          </div>

                          <div className="text-left lg:text-right">
                            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Margen Bruto</p>
                            <p className={`text-sm font-black ${sup.grossMarginPct >= 35 ? 'text-emerald-600' : 'text-slate-800'}`}>
                              {sup.grossMarginPct}%
                            </p>
                          </div>

                          <div className="text-left lg:text-right">
                            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Rotación (Sell-Through)</p>
                            <p className="text-sm font-black text-indigo-600">{sup.sellThroughRate}%</p>
                          </div>

                          <div>
                            <Link
                              href={`/productos/pedidos/nuevo?supplierId=${sup.id}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl shadow transition-colors"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              Pedir
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
      {/* TAB 2: MARKETING & FIDELIZACIÓN SEMANAL */}
      {/* ======================================================== */}
      {activeTab === 'marketing' && (
        <div className="space-y-6">
          
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clientes B2B Analizados</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{marketingSummary.totalCustomers || 0}</h3>
                <p className="text-xs text-indigo-600 font-medium mt-1">Segmentación RFM automatizada</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cuentas Clave VIP</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">{marketingSummary.vipCount || 0}</h3>
                <p className="text-xs text-emerald-600 font-medium mt-1">Alta recurrencia y volumen</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">En Riesgo de Fuga</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1">{marketingSummary.riskCount || 0}</h3>
                <p className="text-xs text-amber-600 font-medium mt-1">&gt; 30 días sin comprar</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alto Potencial</p>
                <h3 className="text-2xl font-black text-purple-600 mt-1">{marketingSummary.potentialCount || 0}</h3>
                <p className="text-xs text-purple-600 font-medium mt-1">Listos para venta cruzada</p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                <Zap className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Campaign Selector Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {campaigns.map((camp: any) => {
              const isSelected = selectedCampaignId === camp.id;
              return (
                <button
                  key={camp.id}
                  onClick={() => setSelectedCampaignId(camp.id)}
                  className={`p-5 rounded-2xl text-left border transition-all duration-200 relative ${
                    isSelected 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xl ring-2 ring-indigo-500' 
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isSelected ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/30' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {camp.targetSegment}
                    </span>
                    <span className={`text-xs font-bold ${isSelected ? 'text-indigo-300' : 'text-slate-500'}`}>
                      {camp.audienceCount} clientes
                    </span>
                  </div>
                  <h3 className="font-bold text-sm leading-snug line-clamp-2">{camp.title}</h3>
                </button>
              );
            })}
          </div>

          {/* Selected Campaign Details & Execution Workspace */}
          {activeCampaign && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Campaña Semanal Generada por IA
                  </div>
                  <h2 className="text-xl font-black text-slate-900">{activeCampaign.title}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    <strong className="text-slate-700">Objetivo: </strong>{activeCampaign.objective}
                  </p>
                  <p className="text-xs text-indigo-600 mt-0.5">
                    <strong className="text-slate-700">Incentivo Recomendado: </strong>{activeCampaign.discountSuggested}
                  </p>
                </div>

                <button
                  onClick={() => handleCopyTemplate(activeCampaign)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all self-start lg:self-auto"
                >
                  <Copy className="w-4 h-4" />
                  {copiedTemplateId === activeCampaign.id ? "¡Copiado!" : "Copiar Plantilla"}
                </button>
              </div>

              {/* WhatsApp Copy Preview Box */}
              <div className="bg-slate-900 rounded-2xl p-5 text-slate-100 border border-slate-800">
                <div className="flex items-center justify-between mb-3 text-xs text-slate-400 font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <MessageCircle className="w-4 h-4" /> Copy de Mensaje para WhatsApp
                  </span>
                  <span>Variable: &#123;cliente&#125; se sustituye automáticamente</span>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                  {activeCampaign.whatsappTemplate}
                </pre>
              </div>

              {/* Recipients Directory with 1-click WhatsApp trigger */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Destinatarios Calificados para esta Campaña ({activeCampaign.recipients?.length || 0})
                  </h3>
                  <span className="text-xs text-slate-500">Envío 1 a 1 personalizado</span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {activeCampaign.recipients?.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No hay clientes en este segmento actualmente.
                    </div>
                  ) : (
                    activeCampaign.recipients.map((c: any) => {
                      const waLink = buildWhatsAppLink(c.phone, activeCampaign.whatsappTemplate, c.name);
                      return (
                        <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{c.name}</p>
                            <p className="text-xs text-slate-500">
                              {c.phone || 'Sin teléfono'} • Histórico de compras: ${c.totalSpent.toLocaleString('es-MX')} ({c.salesCount} compras)
                              {c.daysSinceLastSale < 999 && ` • Última compra hace ${c.daysSinceLastSale} días`}
                            </p>
                          </div>

                          <div>
                            {c.phone ? (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors"
                              >
                                <MessageCircle className="w-4 h-4" />
                                Enviar WhatsApp
                              </a>
                            ) : (
                              <span className="px-3 py-1.5 bg-slate-100 text-slate-400 font-medium text-xs rounded-xl">
                                Falta Teléfono
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
        <div className="space-y-6">
          
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Margen Promedio Global</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{pricingSummary.avgMargin || 0}%</h3>
                <p className="text-xs text-indigo-600 font-medium mt-1">{pricingSummary.totalProducts || 0} artículos activos</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Tag className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Oportunidades de Margen</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1">{pricingSummary.opportunitiesCount || 0}</h3>
                <p className="text-xs text-amber-600 font-medium mt-1">Precios por debajo del óptimo</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ganancia Extra Estimada</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">
                  +${(pricingSummary.projectedMonthlyExtraProfit || 0).toLocaleString('es-MX')}
                </h3>
                <p className="text-xs text-emerald-600 font-medium mt-1">Proyección mensual al ajustar</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Margen Crítico (&lt;18%)</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1">{pricingSummary.criticalMarginCount || 0}</h3>
                <p className="text-xs text-rose-600 font-medium mt-1">Revisar costos de compra</p>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Pricing Opportunities & Matrix Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Matriz de Optimización de Precios y Competitividad
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Compara tus precios contra el margen saludable de la industria y ajusta en 1 clic para capturar mayor utilidad.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar producto o SKU..."
                    value={pricingSearch}
                    onChange={(e) => setPricingSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-56"
                  />
                </div>

                <select
                  value={pricingFilter}
                  onChange={(e) => setPricingFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="OPORTUNIDADES">Solo Oportunidades de Aumento</option>
                  <option value="CRITICO">Margen Crítico (&lt;18%)</option>
                  <option value="ESTRELLA">Productos Estrella (Alto Margen + Ventas)</option>
                  <option value="GANCHO_VOLUMEN">Gancho / Volumen</option>
                  <option value="ALL">Todo el Catálogo</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Producto / Categoría</th>
                    <th className="py-3 px-4">Costo Base</th>
                    <th className="py-3 px-4">Precio Actual</th>
                    <th className="py-3 px-4">Margen Actual</th>
                    <th className="py-3 px-4">Rango Mercado Est.</th>
                    <th className="py-3 px-4">Precio Sugerido IA</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
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
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900">{p.name}</p>
                            <p className="text-[11px] text-slate-400">
                              SKU: {p.sku || '-'} • Cat: {p.category}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 font-medium text-slate-600">
                            ${p.cost.toFixed(2)}
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            ${p.price.toFixed(2)}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isCritical ? 'bg-rose-100 text-rose-700' :
                              isHighProfit ? 'bg-emerald-100 text-emerald-700' :
                              'bg-indigo-50 text-indigo-700'
                            }`}>
                              {p.marginPct}% (${p.marginAmount.toFixed(2)})
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 font-medium text-[11px]">
                            ${p.estimatedMarketMin.toFixed(2)} - ${p.estimatedMarketMax.toFixed(2)}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 font-bold">$</span>
                              <input
                                type="number"
                                step="0.50"
                                value={targetPrice}
                                onChange={(e) => setCustomPrices(prev => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))}
                                className="w-20 px-2 py-1 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                              {p.marginOpportunity > 0 && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  +${p.marginOpportunity.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              disabled={isUpdating}
                              onClick={() => handleApplyPrice(p.id, targetPrice)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow transition-colors"
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
  );
}
