'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch } from './auth';
import { revalidatePath } from 'next/cache';

// Helper for clean currency rounding (2 decimals)
function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

// ==========================================
// 1. AGENTE DE COMPRAS E INTELIGENCIA DE PROVEEDORES
// ==========================================

export async function getSupplierIntelligence() {
  try {
    const branch = await getActiveBranch();
    const branchWhere = branch?.id === 'GLOBAL' ? {} : { OR: [{ branchId: branch.id }, { branchId: null }] };

    // Fetch suppliers
    const suppliers = await prisma.supplier.findMany({
      where: branchWhere,
      include: {
        products: {
          select: {
            id: true,
            name: true,
            sku: true,
            cost: true,
            price: true,
            stock: true,
            minStock: true,
            category: true,
            brand: true,
            saleItems: {
              select: {
                quantity: true,
                price: true,
                cost: true
              }
            }
          }
        },
        purchases: {
          select: {
            id: true,
            total: true,
            status: true,
            createdAt: true,
            items: {
              select: {
                quantity: true,
                cost: true,
                productId: true
              }
            }
          }
        }
      }
    });

    const evaluatedSuppliers = suppliers.map((sup: any) => {
      let totalPurchased = 0;
      let totalUnitsPurchased = 0;
      let totalSalesGenerated = 0;
      let totalUnitsSold = 0;
      let totalCostOfGoodsSold = 0;
      const lowStockProducts: any[] = [];

      // Calculate purchases metrics
      (sup.purchases || []).forEach((p: any) => {
        if (p.status !== 'CANCELLED') {
          totalPurchased += (p.total || 0);
          (p.items || []).forEach((it: any) => {
            totalUnitsPurchased += (it.quantity || 0);
          });
        }
      });

      // Calculate sales & margin from supplier products
      (sup.products || []).forEach((prod: any) => {
        // Check low stock / reorder need
        if (prod.minStock && prod.stock <= prod.minStock) {
          lowStockProducts.push({
            id: prod.id,
            name: prod.name,
            sku: prod.sku,
            stock: prod.stock,
            minStock: prod.minStock,
            cost: round2(prod.cost || 0),
            price: round2(prod.price || 0),
            suggestedQty: Math.max(5, (prod.minStock * 2) - prod.stock)
          });
        }

        (prod.saleItems || []).forEach((si: any) => {
          const qty = si.quantity || 0;
          const revenue = (si.price || 0) * qty;
          const cost = (si.cost || prod.cost || 0) * qty;

          totalUnitsSold += qty;
          totalSalesGenerated += revenue;
          totalCostOfGoodsSold += cost;
        });
      });

      const grossProfit = Math.max(0, totalSalesGenerated - totalCostOfGoodsSold);
      
      // Calculate realistic catalog average margin
      let catalogAvgMargin = 0;
      if (sup.products && sup.products.length > 0) {
        const validProds = sup.products.filter((p: any) => p.price > 0 && p.cost > 0);
        if (validProds.length > 0) {
          catalogAvgMargin = validProds.reduce((sum: number, p: any) => sum + (((p.price - p.cost) / p.price) * 100), 0) / validProds.length;
        }
      }

      const grossMarginPct = totalSalesGenerated > 0 
        ? Math.round((grossProfit / totalSalesGenerated) * 100) 
        : Math.round(catalogAvgMargin);

      const sellThroughRate = totalUnitsPurchased > 0 
        ? Math.min(100, Math.round((totalUnitsSold / totalUnitsPurchased) * 100))
        : (totalUnitsSold > 0 ? Math.min(100, Math.round((totalUnitsSold / (totalUnitsSold + 10)) * 100)) : 0);

      // Scoring formula (0 - 100)
      // Margin weight 35%, Sales Volume weight 40%, Catalog activity 25%
      const marginPoints = Math.min(35, (grossMarginPct / 50) * 35);
      const salesPoints = Math.min(40, (totalSalesGenerated > 20000 ? 40 : (totalSalesGenerated / 20000) * 40));
      const catalogPoints = Math.min(25, (sup.products.length / 5) * 25);
      const overallScore = Math.max(10, Math.min(100, Math.round(marginPoints + salesPoints + catalogPoints)));

      // Realistic tier classification for retail & B2B stationery
      let tier: 'ESTRATEGICO' | 'VOLUMEN' | 'ESPECIALIZADO' | 'EN_RIESGO' = 'VOLUMEN';
      let tierLabel = 'Alto Volumen';
      let recommendation = '';

      if (totalSalesGenerated >= 10000 && grossMarginPct >= 30) {
        tier = 'ESTRATEGICO';
        tierLabel = 'Proveedor Clave Estratégico';
        recommendation = 'Genera alto flujo y excelente utilidad. Conviene priorizar compras, pedir descuentos por pronto pago o negociar exclusividad.';
      } else if (totalSalesGenerated >= 5000) {
        tier = 'VOLUMEN';
        tierLabel = 'Generador de Volumen y Tráfico';
        recommendation = 'Alta rotación y ventas constantes. Mantener stock siempre disponible para no perder clientes recurrentes.';
      } else if (grossMarginPct >= 35 && sup.products.length > 0) {
        tier = 'ESPECIALIZADO';
        tierLabel = 'Especializado de Alto Margen';
        recommendation = 'Deja excelente margen por pieza vendida. Mantener stock sobre pedido o mínimos controlados.';
      } else {
        tier = 'EN_RIESGO';
        tierLabel = 'Baja Rotación / Revisar';
        recommendation = 'Pocas ventas registradas en el período. Evaluar si conviene liquidar inventario lento o renegociar costos.';
      }

      return {
        id: sup.id,
        name: sup.name,
        contactName: sup.legalName || sup.name,
        phone: sup.phone || '',
        email: sup.email || '',
        productsCount: (sup.products || []).length,
        totalPurchased: round2(totalPurchased),
        totalSalesGenerated: round2(totalSalesGenerated),
        grossProfit: round2(grossProfit),
        grossMarginPct,
        sellThroughRate,
        overallScore,
        tier,
        tierLabel,
        recommendation,
        lowStockProducts
      };
    });

    // Sort by overall score descending
    evaluatedSuppliers.sort((a: any, b: any) => b.overallScore - a.overallScore);

    // Summary metrics
    const totalPurchasesAll = evaluatedSuppliers.reduce((sum: number, s: any) => sum + s.totalPurchased, 0);
    const totalSalesAll = evaluatedSuppliers.reduce((sum: number, s: any) => sum + s.totalSalesGenerated, 0);
    
    // Average margin weighted or among active suppliers
    const activeSuppliersWithSales = evaluatedSuppliers.filter((s: any) => s.totalSalesGenerated > 0);
    const avgMarginAll = activeSuppliersWithSales.length > 0 
      ? Math.round(activeSuppliersWithSales.reduce((sum: number, s: any) => sum + s.grossMarginPct, 0) / activeSuppliersWithSales.length) 
      : (evaluatedSuppliers.length > 0 
          ? Math.round(evaluatedSuppliers.reduce((sum: number, s: any) => sum + s.grossMarginPct, 0) / evaluatedSuppliers.length) 
          : 0);

    const criticalReorderItems = evaluatedSuppliers.flatMap((s: any) => s.lowStockProducts.map((p: any) => ({ ...p, supplierName: s.name, supplierId: s.id })));

    return {
      success: true,
      suppliers: evaluatedSuppliers,
      summary: {
        totalSuppliers: evaluatedSuppliers.length,
        totalPurchasesAll: round2(totalPurchasesAll),
        totalSalesAll: round2(totalSalesAll),
        avgMarginAll,
        criticalReorderCount: criticalReorderItems.length,
        strategicCount: evaluatedSuppliers.filter((s: any) => s.tier === 'ESTRATEGICO').length,
        volumeCount: evaluatedSuppliers.filter((s: any) => s.tier === 'VOLUMEN').length,
        specializedCount: evaluatedSuppliers.filter((s: any) => s.tier === 'ESPECIALIZADO').length,
        riskCount: evaluatedSuppliers.filter((s: any) => s.tier === 'EN_RIESGO').length
      },
      criticalReorderItems
    };
  } catch (error: any) {
    console.error("Supplier Intelligence Error:", error);
    return { 
      success: false, 
      error: error.message,
      suppliers: [],
      summary: { totalSuppliers: 0, totalPurchasesAll: 0, totalSalesAll: 0, avgMarginAll: 0, criticalReorderCount: 0, strategicCount: 0, volumeCount: 0, specializedCount: 0, riskCount: 0 },
      criticalReorderItems: []
    };
  }
}

// ==========================================
// 2. AGENTE DE MARKETING Y FIDELIZACIÓN SEMANAL
// ==========================================

export async function getMarketingCampaigns() {
  try {
    const branch = await getActiveBranch();
    const branchWhere = branch?.id === 'GLOBAL' ? {} : { OR: [{ branchId: branch.id }, { branchId: null }] };

    // Fetch customers with sales
    const customers = await prisma.customer.findMany({
      where: branchWhere,
      include: {
        sales: {
          where: { status: 'COMPLETED' },
          select: {
            id: true,
            total: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const now = new Date();
    const evaluatedCustomers = customers.map(c => {
      const salesCount = c.sales.length;
      const totalSpent = round2(c.sales.reduce((acc, s) => acc + (s.total || 0), 0));
      const lastSaleDate = c.sales[0]?.createdAt ? new Date(c.sales[0].createdAt) : null;
      const daysSinceLastSale = lastSaleDate 
        ? Math.floor((now.getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24)) 
        : 999;

      let segment: 'VIP_CORP' | 'EN_RIESGO' | 'ALTO_POTENCIAL' | 'INACTIVO' | 'NUEVO' = 'NUEVO';
      let segmentLabel = 'Cliente Nuevo';

      if (salesCount >= 3 && totalSpent >= 3000 && daysSinceLastSale <= 45) {
        segment = 'VIP_CORP';
        segmentLabel = '👑 VIP Corporativo';
      } else if (salesCount >= 1 && daysSinceLastSale > 25 && daysSinceLastSale <= 120) {
        segment = 'EN_RIESGO';
        segmentLabel = '⚠️ Reactivación Urgente';
      } else if (salesCount >= 1 && totalSpent >= 1000) {
        segment = 'ALTO_POTENCIAL';
        segmentLabel = '⚡ Alto Potencial';
      } else if (daysSinceLastSale > 120 && salesCount > 0) {
        segment = 'INACTIVO';
        segmentLabel = '💤 Inactivo';
      }

      return {
        id: c.id,
        name: c.name,
        legalName: c.legalName || c.name,
        phone: c.phone || '',
        email: c.email || '',
        salesCount,
        totalSpent,
        pointsBalance: c.pointsBalance || 0,
        storeCredit: c.storeCredit || 0,
        daysSinceLastSale,
        lastSaleDate,
        segment,
        segmentLabel
      };
    });

    // Grouping
    const vipCustomers = evaluatedCustomers.filter(c => c.segment === 'VIP_CORP');
    const riskCustomers = evaluatedCustomers.filter(c => c.segment === 'EN_RIESGO');
    const potentialCustomers = evaluatedCustomers.filter(c => c.segment === 'ALTO_POTENCIAL');
    const inactiveCustomers = evaluatedCustomers.filter(c => c.segment === 'INACTIVO');

    // Pre-built Weekly Campaigns
    const campaigns = [
      {
        id: 'camp_reactivacion_b2b',
        title: 'Reactivación de Oficinas y Empresas',
        targetSegment: 'Clientes con más de 25 días sin resurtir',
        audienceCount: riskCustomers.length,
        objective: 'Resurtido mensual de Papel Bond, Tóner, Artículos de Escritorio y Limpieza.',
        discountSuggested: 'Envío prioritario sin costo en pedidos mayores a $1,500',
        badge: 'Reactivación',
        badgeColor: 'amber',
        whatsappTemplate: `¡Hola {cliente}! 👋 En Office City queremos asegurarnos de que tu equipo tenga todos los insumos necesarios para trabajar esta semana. 📄✏️\n\nTenemos resurtido express en *Papel Bond, Tóner y Consumibles de Oficina* con entrega directa a tus instalaciones.\n\n¿Te apoyamos con la cotización de resurtido de este mes? Solo respóndenos a este mensaje y te atendemos de inmediato. 🚀`,
        recipients: riskCustomers.slice(0, 30)
      },
      {
        id: 'camp_vip_fidelizacion',
        title: 'Campaña VIP: Cuentas Clave & Convenio Corporativo',
        targetSegment: 'Clientes VIP de Mayor Consumo',
        audienceCount: vipCustomers.length,
        objective: 'Fidelizar a las cuentas clave con condiciones preferenciales de mayoreo y facturación inmediata.',
        discountSuggested: 'Precios de Mayoreo Directo + Atención por Ejecutivo Dedicado',
        badge: 'Cuentas VIP',
        badgeColor: 'emerald',
        whatsappTemplate: `Estimado(a) {cliente}, en Office City agradecemos mucho la confianza que depositan en nosotros. 🌟\n\nTe recordamos que tu cuenta cuenta con atención corporativa prioritaria, facturación inmediata y precios preferenciales.\n\n📦 ¿Requieren reabastecer algún insumo especializado o mobiliario para esta semana? Con gusto te enviamos una propuesta express.`,
        recipients: vipCustomers.slice(0, 30)
      },
      {
        id: 'camp_promocion_semanal',
        title: 'Especial Semanal: Organización y Tecnología',
        targetSegment: 'Clientes Activos y Alto Potencial',
        audienceCount: potentialCustomers.length,
        objective: 'Aumentar el ticket promedio con venta cruzada en archivo, cables, ergonomía y accesorios.',
        discountSuggested: 'Descuentos por volumen en cajas de archivo y accesorios',
        badge: 'Crecimiento',
        badgeColor: 'indigo',
        whatsappTemplate: `¡Hola {cliente}! 📦 Esta semana en Office City tenemos precios especiales en *Artículos de Archivo, Organización y Accesorios de Oficina*.\n\nEquipa tu espacio de trabajo con la mejor calidad y aprovecha las promociones de esta semana.\n\nConsulta el catálogo completo o solicita tu cotización rápida respondiendo a este mensaje. ¡Excelente semana! ✨`,
        recipients: potentialCustomers.slice(0, 30)
      }
    ];

    return {
      success: true,
      summary: {
        totalCustomers: evaluatedCustomers.length,
        vipCount: vipCustomers.length,
        riskCount: riskCustomers.length,
        potentialCount: potentialCustomers.length,
        inactiveCount: inactiveCustomers.length
      },
      campaigns,
      customers: evaluatedCustomers
    };
  } catch (error: any) {
    console.error("Marketing Intelligence Error:", error);
    return { 
      success: false, 
      error: error.message,
      summary: { totalCustomers: 0, vipCount: 0, riskCount: 0, potentialCount: 0, inactiveCount: 0 },
      campaigns: [],
      customers: []
    };
  }
}

// ==========================================
// 3. AGENTE DE PRECIOS, MÁRGENES Y BENCHMARKING
// ==========================================

export async function getPricingIntelligence() {
  try {
    const branch = await getActiveBranch();
    const productWhere = branch?.id === 'GLOBAL' ? { isActive: true } : { isActive: true, branchId: branch.id };

    // Fetch products with sales
    const products = await prisma.product.findMany({
      where: productWhere,
      include: {
        saleItems: {
          select: {
            quantity: true,
            price: true,
            cost: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const evaluatedProducts = products.map((p: any) => {
      const cost = round2(p.cost || 0);
      const price = round2(p.price || 0);
      const unitsSold = (p.saleItems || []).reduce((acc: number, it: any) => acc + (it.quantity || 0), 0);
      const totalRevenue = round2((p.saleItems || []).reduce((acc: number, it: any) => acc + ((it.price || 0) * (it.quantity || 0)), 0));

      const marginAmount = round2(Math.max(0, price - cost));
      const marginPct = price > 0 ? Math.round((marginAmount / price) * 100) : 0;

      // Classify margin health
      let marginStatus: 'CRITICO' | 'REGULAR' | 'SALUDABLE' | 'PREMIUM' = 'REGULAR';
      let marginStatusLabel = 'Margen Regular (20-30%)';
      if (marginPct < 18) {
        marginStatus = 'CRITICO';
        marginStatusLabel = '⚠️ Margen Bajo (<18%)';
      } else if (marginPct < 30) {
        marginStatus = 'REGULAR';
        marginStatusLabel = 'Margen Moderado (18-30%)';
      } else if (marginPct < 45) {
        marginStatus = 'SALUDABLE';
        marginStatusLabel = '✅ Saludable (30-45%)';
      } else {
        marginStatus = 'PREMIUM';
        marginStatusLabel = '💎 Premium (>45%)';
      }

      // Market benchmark estimation
      let estimatedMarketMin = round2(cost * 1.25);
      let estimatedMarketMax = round2(cost * 1.55);
      if (marginPct < 20) {
        estimatedMarketMin = round2(cost * 1.28);
        estimatedMarketMax = round2(cost * 1.60);
      }

      // Suggested optimal price
      let suggestedPrice = price;
      let marginOpportunity = 0;

      if (marginPct < 25 && cost > 0) {
        suggestedPrice = round2(cost / (1 - 0.32)); // Target 32% margin
        marginOpportunity = round2(suggestedPrice - price);
      } else if (unitsSold >= 10 && marginPct < 35) {
        suggestedPrice = round2(price * 1.05); // 5% slight increase on high demand
        marginOpportunity = round2(suggestedPrice - price);
      }

      // Matrix Quadrant
      let quadrant: 'ESTRELLA' | 'GANCHO_VOLUMEN' | 'OPORTUNIDAD' | 'REVISAR' = 'OPORTUNIDAD';
      let quadrantLabel = '💡 Oportunidad de Margen';
      if (unitsSold >= 8 && marginPct >= 30) {
        quadrant = 'ESTRELLA';
        quadrantLabel = '⭐ Estrella (Ventas + Margen)';
      } else if (unitsSold >= 8 && marginPct < 30) {
        quadrant = 'GANCHO_VOLUMEN';
        quadrantLabel = '⚡ Gancho de Tráfico';
      } else if (unitsSold < 8 && marginPct >= 30) {
        quadrant = 'OPORTUNIDAD';
        quadrantLabel = '💡 Alto Margen';
      } else {
        quadrant = 'REVISAR';
        quadrantLabel = '🔍 Revisar Costos';
      }

      return {
        id: p.id,
        name: p.name,
        sku: p.sku || '',
        barcode: p.barcode || '',
        category: p.category || 'General',
        brand: p.brand || '-',
        stock: p.stock,
        cost,
        price,
        wholesalePrice: p.wholesalePrice ? round2(p.wholesalePrice) : null,
        specialPrice: p.specialPrice ? round2(p.specialPrice) : null,
        marginAmount,
        marginPct,
        marginStatus,
        marginStatusLabel,
        unitsSold,
        totalRevenue,
        estimatedMarketMin,
        estimatedMarketMax,
        suggestedPrice,
        marginOpportunity: Math.max(0, marginOpportunity),
        quadrant,
        quadrantLabel
      };
    });

    // Opportunities: products where price adjustment generates higher profit
    const opportunities = evaluatedProducts
      .filter((p: any) => p.marginOpportunity > 0 && p.cost > 0)
      .sort((a: any, b: any) => (b.marginOpportunity * Math.max(1, b.unitsSold)) - (a.marginOpportunity * Math.max(1, a.unitsSold)));

    const projectedMonthlyExtraProfit = opportunities.reduce((sum: number, p: any) => sum + (p.marginOpportunity * Math.max(2, p.unitsSold)), 0);

    const validMarginProds = evaluatedProducts.filter((p: any) => p.price > 0 && p.cost > 0);
    const avgMargin = validMarginProds.length > 0
      ? Math.round(validMarginProds.reduce((acc: number, p: any) => acc + p.marginPct, 0) / validMarginProds.length)
      : 0;

    const summary = {
      totalProducts: evaluatedProducts.length,
      avgMargin,
      criticalMarginCount: evaluatedProducts.filter((p: any) => p.marginStatus === 'CRITICO').length,
      premiumMarginCount: evaluatedProducts.filter((p: any) => p.marginStatus === 'PREMIUM').length,
      opportunitiesCount: opportunities.length,
      projectedMonthlyExtraProfit: round2(projectedMonthlyExtraProfit)
    };

    return {
      success: true,
      summary,
      products: evaluatedProducts,
      opportunities: opportunities.slice(0, 30)
    };
  } catch (error: any) {
    console.error("Pricing Intelligence Error:", error);
    return { 
      success: false, 
      error: error.message,
      summary: { totalProducts: 0, avgMargin: 0, criticalMarginCount: 0, premiumMarginCount: 0, opportunitiesCount: 0, projectedMonthlyExtraProfit: 0 },
      products: [],
      opportunities: []
    };
  }
}

// Action to apply suggested price to a product
export async function applySuggestedProductPrice(productId: string, newPrice: number) {
  try {
    if (!newPrice || newPrice <= 0) throw new Error("Precio inválido.");

    await prisma.product.update({
      where: { id: productId },
      data: { price: round2(newPrice) }
    });

    revalidatePath('/agentes');
    revalidatePath('/productos');
    return { success: true, newPrice: round2(newPrice) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
