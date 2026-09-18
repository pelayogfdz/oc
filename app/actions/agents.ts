'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch } from './auth';
import { revalidatePath } from 'next/cache';

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
            cost: prod.cost || 0,
            price: prod.price || 0,
            suggestedQty: Math.max(10, (prod.minStock * 2) - prod.stock)
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
      const grossMarginPct = totalSalesGenerated > 0 
        ? Math.round((grossProfit / totalSalesGenerated) * 100) 
        : ((sup.products || []).length > 0 
            ? Math.round((sup.products || []).reduce((acc: number, p: any) => acc + (p.price > 0 ? ((p.price - (p.cost || 0)) / p.price) * 100 : 0), 0) / (sup.products || []).length)
            : 0);

      const sellThroughRate = totalUnitsPurchased > 0 
        ? Math.min(100, Math.round((totalUnitsSold / totalUnitsPurchased) * 100))
        : (totalUnitsSold > 0 ? 85 : 0);

      // Scoring formula (0 - 100)
      const marginScore = Math.min(40, (grossMarginPct / 50) * 40);
      const salesScore = Math.min(35, (sellThroughRate / 100) * 35);
      const catalogScore = Math.min(25, ((sup.products || []).length / 10) * 25);
      const overallScore = Math.min(100, Math.round(marginScore + salesScore + catalogScore));

      // Category classification
      let tier: 'ESTRATEGICO' | 'VOLUMEN' | 'ESPECIALIZADO' | 'EN_RIESGO' = 'VOLUMEN';
      let recommendation = '';

      if (grossMarginPct >= 35 && sellThroughRate >= 60) {
        tier = 'ESTRATEGICO';
        recommendation = 'Proveedor de Máxima Rentabilidad. Priorizar en compras y solicitar convenios de descuento por pronto pago o volumen.';
      } else if (sellThroughRate >= 60 && grossMarginPct < 35) {
        tier = 'VOLUMEN';
        recommendation = 'Alta rotación pero margen moderado. Clave para flujo y tráfico; negociar mejores costos base con el fabricante.';
      } else if (grossMarginPct >= 35 && sellThroughRate < 60) {
        tier = 'ESPECIALIZADO';
        recommendation = 'Alto margen pero rotación pausada. Mantener stock justo y reordenar solo bajo mínimos estrictos o pedidos confirmados.';
      } else {
        tier = 'EN_RIESGO';
        recommendation = 'Bajo margen y baja rotación. Evaluar descontinuar artículos de lento movimiento o exigir mejores plazos de crédito.';
      }

      return {
        id: sup.id,
        name: sup.name,
        contactName: sup.legalName || sup.name,
        phone: sup.phone,
        email: sup.email,
        productsCount: (sup.products || []).length,
        totalPurchased,
        totalSalesGenerated,
        grossProfit,
        grossMarginPct,
        sellThroughRate,
        overallScore,
        tier,
        recommendation,
        lowStockProducts
      };
    });

    // Sort by overall score descending
    evaluatedSuppliers.sort((a: any, b: any) => b.overallScore - a.overallScore);

    // Summary metrics
    const totalPurchasesAll = evaluatedSuppliers.reduce((sum: number, s: any) => sum + s.totalPurchased, 0);
    const totalSalesAll = evaluatedSuppliers.reduce((sum: number, s: any) => sum + s.totalSalesGenerated, 0);
    const avgMarginAll = evaluatedSuppliers.length > 0 
      ? Math.round(evaluatedSuppliers.reduce((sum: number, s: any) => sum + s.grossMarginPct, 0) / evaluatedSuppliers.length) 
      : 0;

    const criticalReorderItems = evaluatedSuppliers.flatMap((s: any) => s.lowStockProducts.map((p: any) => ({ ...p, supplierName: s.name, supplierId: s.id })));

    return {
      success: true,
      suppliers: evaluatedSuppliers,
      summary: {
        totalSuppliers: evaluatedSuppliers.length,
        totalPurchasesAll,
        totalSalesAll,
        avgMarginAll,
        criticalReorderCount: criticalReorderItems.length,
        strategicCount: evaluatedSuppliers.filter((s: any) => s.tier === 'ESTRATEGICO').length,
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
      summary: { totalSuppliers: 0, totalPurchasesAll: 0, totalSalesAll: 0, avgMarginAll: 0, criticalReorderCount: 0, strategicCount: 0, riskCount: 0 },
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
      const totalSpent = c.sales.reduce((acc, s) => acc + s.total, 0);
      const lastSaleDate = c.sales[0]?.createdAt ? new Date(c.sales[0].createdAt) : null;
      const daysSinceLastSale = lastSaleDate 
        ? Math.floor((now.getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24)) 
        : 999;

      let segment: 'VIP_CORP' | 'EN_RIESGO' | 'ALTO_POTENCIAL' | 'INACTIVO' | 'NUEVO' = 'NUEVO';

      if (salesCount >= 3 && totalSpent >= 5000 && daysSinceLastSale <= 35) {
        segment = 'VIP_CORP';
      } else if (salesCount >= 2 && daysSinceLastSale > 30 && daysSinceLastSale <= 90) {
        segment = 'EN_RIESGO';
      } else if (salesCount >= 1 && totalSpent >= 2000 && daysSinceLastSale <= 20) {
        segment = 'ALTO_POTENCIAL';
      } else if (daysSinceLastSale > 90 && salesCount > 0) {
        segment = 'INACTIVO';
      }

      return {
        id: c.id,
        name: c.name,
        legalName: c.legalName,
        phone: c.phone,
        email: c.email,
        salesCount,
        totalSpent,
        pointsBalance: c.pointsBalance || 0,
        storeCredit: c.storeCredit || 0,
        daysSinceLastSale,
        lastSaleDate,
        segment
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
        title: 'Reactivación de Clientes Corporativos & Oficinas',
        targetSegment: 'Clientes en Riesgo de Fuga (>30 días sin comprar)',
        audienceCount: riskCustomers.length,
        objective: 'Resurtido mensual de Papelería, Tóner, Papel Bond y Consumibles con atención prioritaria.',
        discountSuggested: '5% en pedidos mayores a $2,500 o Envío Gratis',
        whatsappTemplate: `¡Hola {cliente}! 👋 En Office City queremos asegurarnos de que tu equipo no se quede sin insumos esta semana. 📄✏️\n\nTenemos resurtido express en *Papel Bond, Tóner y Artículos de Oficina* con entrega inmediata a domicilio.\n\n🎁 Además, cuentas con saldo/puntos acumulados disponibles para canjear en tu próximo pedido.\n\n¿Te gustaría que te enviemos la cotización de resurtido de este mes? Solo respóndenos a este mensaje. 🚀`,
        recipients: riskCustomers.slice(0, 20)
      },
      {
        id: 'camp_vip_fidelizacion',
        title: 'Campaña VIP: Beneficios Exclusivos y Preventa',
        targetSegment: 'Clientes VIP & Cuentas Clave',
        audienceCount: vipCustomers.length,
        objective: 'Fidelizar a las cuentas de mayor volumen ofreciendo precios de lista especial y crédito preferencial.',
        discountSuggested: 'Precios de Mayoreo Directo + Facturación Inmediata',
        whatsappTemplate: `Estimado(a) {cliente}, en Office City valoramos mucho tu confianza como cliente preferencial. 🌟\n\nTe recordamos que tu cuenta cuenta con atención corporativa prioritaria y condiciones especiales de facturación y crédito.\n\n📦 ¿Necesitan reabastecer algún insumo especializado o mobiliario para esta semana? Con gusto te atendemos de forma directa y personalizada.`,
        recipients: vipCustomers.slice(0, 20)
      },
      {
        id: 'camp_promocion_semanal',
        title: 'Especial de la Semana: Paquete Productividad & Tecnología',
        targetSegment: 'Alto Potencial y Nuevos Clientes',
        audienceCount: potentialCustomers.length,
        objective: 'Aumentar el ticket promedio con venta cruzada en accesorios, cables, archivo y ergonomía.',
        discountSuggested: '10% de descuento en la segunda unidad en consumibles seleccionados',
        whatsappTemplate: `¡Hola {cliente}! 📦 Esta semana en Office City tenemos precios especiales en *Artículos de Organización, Archivo y Accesorios de Oficina*.\n\nEquipa tu espacio de trabajo con la mejor calidad y aprovecha promociones exclusivas para clientes registrados.\n\nConsulta el catálogo completo o solicita tu cotización rápida respondiendo a este mensaje. ¡Excelente semana! ✨`,
        recipients: potentialCustomers.slice(0, 20)
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
      const cost = p.cost || 0;
      const price = p.price || 0;
      const unitsSold = (p.saleItems || []).reduce((acc: number, it: any) => acc + (it.quantity || 0), 0);
      const totalRevenue = (p.saleItems || []).reduce((acc: number, it: any) => acc + ((it.price || 0) * (it.quantity || 0)), 0);

      const marginAmount = Math.max(0, price - cost);
      const marginPct = price > 0 ? Math.round((marginAmount / price) * 100) : 0;

      // Classify margin health
      let marginStatus: 'CRITICO' | 'REGULAR' | 'SALUDABLE' | 'PREMIUM' = 'REGULAR';
      if (marginPct < 18) marginStatus = 'CRITICO';
      else if (marginPct < 30) marginStatus = 'REGULAR';
      else if (marginPct < 45) marginStatus = 'SALUDABLE';
      else marginStatus = 'PREMIUM';

      // Market benchmark estimation
      let estimatedMarketMin = Number((cost * 1.25).toFixed(2));
      let estimatedMarketMax = Number((cost * 1.55).toFixed(2));
      if (marginPct < 20) {
        estimatedMarketMin = Number((cost * 1.28).toFixed(2));
        estimatedMarketMax = Number((cost * 1.60).toFixed(2));
      }

      // Suggested optimal price
      let suggestedPrice = price;
      let marginOpportunity = 0;

      if (marginPct < 25 && cost > 0) {
        suggestedPrice = Number((cost / (1 - 0.32)).toFixed(2)); // Target 32% margin
        marginOpportunity = Number((suggestedPrice - price).toFixed(2));
      } else if (unitsSold >= 15 && marginPct < 35) {
        suggestedPrice = Number((price * 1.05).toFixed(2)); // 5% slight increase on high demand
        marginOpportunity = Number((suggestedPrice - price).toFixed(2));
      }

      // Matrix Quadrant
      let quadrant: 'ESTRELLA' | 'GANCHO_VOLUMEN' | 'OPORTUNIDAD' | 'REVISAR' = 'OPORTUNIDAD';
      if (unitsSold >= 10 && marginPct >= 30) quadrant = 'ESTRELLA';
      else if (unitsSold >= 10 && marginPct < 30) quadrant = 'GANCHO_VOLUMEN';
      else if (unitsSold < 10 && marginPct >= 30) quadrant = 'OPORTUNIDAD';
      else quadrant = 'REVISAR';

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        category: p.category || 'General',
        brand: p.brand || '-',
        stock: p.stock,
        cost,
        price,
        wholesalePrice: p.wholesalePrice,
        specialPrice: p.specialPrice,
        marginAmount,
        marginPct,
        marginStatus,
        unitsSold,
        totalRevenue,
        estimatedMarketMin,
        estimatedMarketMax,
        suggestedPrice,
        marginOpportunity,
        quadrant
      };
    });

    // Opportunities: products where price adjustment generates higher profit
    const opportunities = evaluatedProducts
      .filter((p: any) => p.marginOpportunity > 0 && p.cost > 0)
      .sort((a: any, b: any) => (b.marginOpportunity * Math.max(1, b.unitsSold)) - (a.marginOpportunity * Math.max(1, a.unitsSold)));

    const projectedMonthlyExtraProfit = opportunities.reduce((sum: number, p: any) => sum + (p.marginOpportunity * Math.max(2, p.unitsSold)), 0);

    const summary = {
      totalProducts: evaluatedProducts.length,
      avgMargin: evaluatedProducts.length > 0 
        ? Math.round(evaluatedProducts.reduce((acc: number, p: any) => acc + p.marginPct, 0) / evaluatedProducts.length) 
        : 0,
      criticalMarginCount: evaluatedProducts.filter((p: any) => p.marginStatus === 'CRITICO').length,
      premiumMarginCount: evaluatedProducts.filter((p: any) => p.marginStatus === 'PREMIUM').length,
      opportunitiesCount: opportunities.length,
      projectedMonthlyExtraProfit: Math.round(projectedMonthlyExtraProfit)
    };

    return {
      success: true,
      summary,
      products: evaluatedProducts,
      opportunities: opportunities.slice(0, 25)
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
      data: { price: newPrice }
    });

    revalidatePath('/agentes');
    revalidatePath('/productos');
    return { success: true, newPrice };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
