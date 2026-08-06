import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '../auth';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function GET(request: NextRequest) {
  const auth = await authenticateToken(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado. Token API inválido o inactivo.' }, { status: 401, headers: corsHeaders });
  }

  const { branch } = auth;

  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    // Default to 15000 to fetch the full catalog now that the query is optimized (O(N+M))
    const limit = limitParam ? parseInt(limitParam, 10) : 15000;

    // Fetch active products in this branch including variants
    const products = await prisma.product.findMany({
      where: {
        branchId: branch.id,
        isActive: true,
        // @ts-ignore
        showInWeb: true
      },
      take: limit,
      include: {
        variants: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Find all branches of this tenant
    const tenantBranches = await prisma.branch.findMany({
      where: { tenantId: branch.tenantId }
    });

    // Determine the tenant type and prepare dynamic branch maps
    const isOfficeCity = branch.tenantId === '8b52cbcd-c956-4717-a1bd-02e57386aaa2';

    let branchesMap: Record<string, string | undefined> = {};
    if (isOfficeCity) {
      branchesMap = {
        centro: tenantBranches.find(b => b.name.toLowerCase().includes('centro'))?.id,
        piq: tenantBranches.find(b => b.name.toLowerCase().includes('piq') || b.name.toLowerCase().includes('industrial'))?.id,
        elmarques: tenantBranches.find(b => b.name.toLowerCase().includes('marques'))?.id,
        pradera: tenantBranches.find(b => b.name.toLowerCase().includes('pradera'))?.id,
        zakia: tenantBranches.find(b => b.name.toLowerCase().includes('zakia'))?.id,
        sonterra: tenantBranches.find(b => b.name.toLowerCase().includes('sonterra'))?.id,
        mirador: tenantBranches.find(b => b.name.toLowerCase().includes('mirador'))?.id,
        cerrito: tenantBranches.find(b => b.name.toLowerCase().includes('cerrito'))?.id,
        sanjuan: tenantBranches.find(b => b.name.toLowerCase().includes('juan'))?.id,
      };
    } else {
      // Default to Bakery/Petqro mapping
      branchesMap = {
        reforma: tenantBranches.find(b => b.name.toLowerCase().includes('matriz') || b.name.toLowerCase().includes('reforma'))?.id,
        antea: tenantBranches.find(b => b.name.toLowerCase().includes('antea'))?.id,
        zibata: tenantBranches.find(b => b.name.toLowerCase().includes('zibatá') || b.name.toLowerCase().includes('zibata'))?.id,
        juriquilla: tenantBranches.find(b => b.name.toLowerCase().includes('juriquilla'))?.id,
      };
    }

    // Fetch all active products of the tenant to aggregate stocks (selecting only required columns to speed up DB transport)
    const tenantProducts = await prisma.product.findMany({
      where: {
        branch: {
          tenantId: branch.tenantId
        },
        isActive: true
      },
      select: {
        id: true,
        sku: true,
        branchId: true,
        stock: true,
        variants: true
      }
    });

    // Index tenant products by SKU for O(1) lookups
    const skuMap = new Map<string, any[]>();
    for (const tp of tenantProducts) {
      if (!tp.sku) continue;
      let list = skuMap.get(tp.sku);
      if (!list) {
        list = [];
        skuMap.set(tp.sku, list);
      }
      list.push(tp);
    }

    const productsWithStock = products.map((p: any) => {
      // Find matching products by SKU across the tenant
      const sameSkuProducts = skuMap.get(p.sku) || [];

      // Resolve stock counts dynamically per branch
      const branchStocks: Record<string, number> = {};
      let totalStock = 0;

      for (const [key, bId] of Object.entries(branchesMap)) {
        if (bId) {
          const match = sameSkuProducts.find((tp: any) => tp.branchId === bId);
          const st = match?.stock || 0;
          branchStocks[`stock_${key}`] = st;
          totalStock += st;
        } else {
          branchStocks[`stock_${key}`] = 0;
        }
      }

      // Resolve variants: fallback to other branches of the same SKU if the active branch has none
      let activeVariants = p.variants || [];
      if (activeVariants.length === 0) {
        const productWithVariants = sameSkuProducts.find((tp: any) => tp.variants && tp.variants.length > 0);
        if (productWithVariants) {
          activeVariants = productWithVariants.variants;
        }
      }

      // Map variants to include stocks per branch
      const mappedVariants = activeVariants.map((v: any) => {
        // Collect same attribute variants from all branches of this SKU
        const sameAttrVariants = sameSkuProducts
          .flatMap((tp: any) => (tp.variants || []).map((tv: any) => ({ ...tv, branchId: tp.branchId })))
          .filter((tv: any) => tv.attribute === v.attribute);

        const vBranchStocks: Record<string, number> = {};
        let vTotalStock = 0;

        for (const [key, bId] of Object.entries(branchesMap)) {
          if (bId) {
            const st = sameAttrVariants.find((tv: any) => tv.branchId === bId)?.stock || 0;
            vBranchStocks[`stock_${key}`] = st;
            vTotalStock += st;
          } else {
            vBranchStocks[`stock_${key}`] = 0;
          }
        }

        return {
          id: v.id,
          attribute: v.attribute,
          sku: v.sku,
          barcode: v.barcode,
          price: v.price,
          wholesalePrice: v.wholesalePrice,
          specialPrice: v.specialPrice,
          cost: v.cost,
          stock: v.stock,
          ...vBranchStocks,
          stock_total: vTotalStock
        };
      });

      // Prefix relative image URLs with the CAANMA origin
      let finalImageUrl = p.imageUrl;
      if (finalImageUrl && !finalImageUrl.startsWith('http') && !finalImageUrl.startsWith('data:')) {
        finalImageUrl = `https://caanma.com${finalImageUrl.startsWith('/') ? '' : '/'}${finalImageUrl}`;
      }

      const baseProductObj: Record<string, any> = {
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        description: p.description,
        price: p.price,
        wholesalePrice: p.wholesalePrice,
        specialPrice: p.specialPrice,
        cost: p.cost,
        isActive: p.isActive,
        unit: p.unit,
        stock: p.stock,
        category: p.category,
        brand: p.brand,
        imageUrl: finalImageUrl,
        allowProduction: p.allowProduction,
        isProductionInput: p.isProductionInput,
        isService: p.isService,
        satKey: p.satKey,
        satUnit: p.satUnit,
        updatedAt: p.updatedAt,
        showInWeb: p.showInWeb,
        ...branchStocks,
        stock_total: totalStock,
        variants: mappedVariants
      };

      return baseProductObj;
    });

    return NextResponse.json({
      success: true,
      branch: {
        id: branch.id,
        name: branch.name
      },
      count: productsWithStock.length,
      products: productsWithStock
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error fetching products for integration API:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500, headers: corsHeaders });
  }
}
