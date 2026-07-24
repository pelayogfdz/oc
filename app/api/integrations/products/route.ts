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
    // Fetch all active products in this branch including variants
    const products = await prisma.product.findMany({
      where: {
        branchId: branch.id,
        isActive: true,
        // @ts-ignore
        showInWeb: true
      },
      include: {
        variants: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Find all branches of this tenant to map their IDs
    const tenantBranches = await prisma.branch.findMany({
      where: { tenantId: branch.tenantId }
    });

    const reformaBranch = tenantBranches.find(b => b.name.toLowerCase().includes('matriz') || b.name.toLowerCase().includes('reforma'));
    const anteaBranch = tenantBranches.find(b => b.name.toLowerCase().includes('antea'));
    const zibataBranch = tenantBranches.find(b => b.name.toLowerCase().includes('zibatá') || b.name.toLowerCase().includes('zibata'));
    const juriquillaBranch = tenantBranches.find(b => b.name.toLowerCase().includes('juriquilla'));

    const reformaId = reformaBranch?.id;
    const anteaId = anteaBranch?.id;
    const zibataId = zibataBranch?.id;
    const juriquillaId = juriquillaBranch?.id;

    // Fetch all active products of the tenant to aggregate stocks across branches
    const tenantProducts = await prisma.product.findMany({
      where: {
        branch: {
          tenantId: branch.tenantId
        },
        isActive: true
      },
      include: {
        variants: true
      }
    });

    const productsWithStock = products.map((p: any) => {
      // Find matching products by SKU across the tenant
      const sameSkuProducts = tenantProducts.filter((tp: any) => tp.sku === p.sku);

      const stockReforma = sameSkuProducts.find((tp: any) => tp.branchId === reformaId)?.stock || 0;
      const stockAntea = sameSkuProducts.find((tp: any) => tp.branchId === anteaId)?.stock || 0;
      const stockZibata = sameSkuProducts.find((tp: any) => tp.branchId === zibataId)?.stock || 0;
      const stockJuriquilla = sameSkuProducts.find((tp: any) => tp.branchId === juriquillaId)?.stock || 0;

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
        // Find variants with the same attribute name in the other branches
        const sameAttrVariants = tenantProducts
          .filter((tp: any) => tp.sku === p.sku)
          .flatMap((tp: any) => (tp.variants || []).map((tv: any) => ({ ...tv, branchId: tp.branchId })))
          .filter((tv: any) => tv.attribute === v.attribute);

        const vStockReforma = sameAttrVariants.find((tv: any) => tv.branchId === reformaId)?.stock || 0;
        const vStockAntea = sameAttrVariants.find((tv: any) => tv.branchId === anteaId)?.stock || 0;
        const vStockZibata = sameAttrVariants.find((tv: any) => tv.branchId === zibataId)?.stock || 0;
        const vStockJuriquilla = sameAttrVariants.find((tv: any) => tv.branchId === juriquillaId)?.stock || 0;

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
          stock_reforma: vStockReforma,
          stock_antea: vStockAntea,
          stock_zibata: vStockZibata,
          stock_juriquilla: vStockJuriquilla,
          stock_total: vStockReforma + vStockAntea + vStockZibata + vStockJuriquilla
        };
      });

      return {
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
        imageUrl: p.imageUrl,
        allowProduction: p.allowProduction,
        isProductionInput: p.isProductionInput,
        isService: p.isService,
        satKey: p.satKey,
        satUnit: p.satUnit,
        updatedAt: p.updatedAt,
        showInWeb: p.showInWeb,
        stock_reforma: stockReforma,
        stock_antea: stockAntea,
        stock_zibata: stockZibata,
        stock_juriquilla: stockJuriquilla,
        stock_total: stockReforma + stockAntea + stockZibata + stockJuriquilla,
        variants: mappedVariants
      };
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
