import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '../integrations/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    let tenantId = 'db5d3949-f8dd-41f6-9627-90374d55d044'; // Default to PETQRO tenant ID
    const authResult = await authenticateToken(request);
    
    if (authResult && authResult.tenantId) {
      tenantId = authResult.tenantId;
    }

    const searchParams = request.nextUrl.searchParams;
    const publicPriceField = searchParams.get('public_price') || 'price';
    const altPriceField = searchParams.get('alt_price') || 'subscription';

    const rawProducts = await prisma.product.findMany({
      where: {
        branch: {
          tenantId: tenantId
        },
        // @ts-ignore
        showInWeb: true
      }
    });

    // Sort rawProducts so that the main branch (La Pradera) is processed first
    const sortedRaw = [...rawProducts].sort((a, b) => {
      const aIsPradera = a.branchId === '2e215b8c-b9e3-444f-adc3-c4387a684e05' || a.branchId === 'Pradera_ID' || a.branchId === 'PRADERA_ID';
      const bIsPradera = b.branchId === '2e215b8c-b9e3-444f-adc3-c4387a684e05' || b.branchId === 'Pradera_ID' || b.branchId === 'PRADERA_ID';
      if (aIsPradera && !bIsPradera) return -1;
      if (!aIsPradera && bIsPradera) return 1;
      return 0;
    });

    const aggregated: Record<string, any> = {};

    const mapImageUrl = (imageUrl: string | null, categoryName: string | null) => {
      if (!imageUrl) {
        return categoryName === 'gatos' ? 'assets/cat_food.png' : 'assets/dog_food.png';
      }
      if (imageUrl.startsWith('data:') || imageUrl.startsWith('http')) {
        if (imageUrl.startsWith('http') && imageUrl.includes('netlify.app')) {
          return imageUrl.replace(/^https:\/\/[^/]+/, 'https://petqro.com');
        }
        return imageUrl;
      }
      const base = tenantId === 'db5d3949-f8dd-41f6-9627-90374d55d044' ? 'https://petqro.com' : request.nextUrl.origin;
      const cleanUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
      return `${base}${cleanUrl}`;
    };

    sortedRaw.forEach(item => {
      const sku = item.sku;
      if (!aggregated[sku]) {
        let category = item.category ? item.category.trim() : 'General';
        if (category === '') {
          category = 'General';
        }
        const nameLower = (item.name || '').toLowerCase();

        let brand = item.brand || 'PETQRO';
        if (brand === 'null' || !brand) {
          brand = 'PETQRO';
        }

        // Map public price dynamically
        let basePrice = item.price || 0;
        if (publicPriceField === 'wholesalePrice') {
          basePrice = item.wholesalePrice || item.price || 0;
        } else if (publicPriceField === 'specialPrice') {
          basePrice = item.specialPrice || item.price || 0;
        }

        // Map alternate price dynamically
        let altPrice = 0;
        if (altPriceField === 'subscription') {
          altPrice = basePrice * 0.9; // Calculated subscription (-10%)
        } else if (altPriceField === 'wholesalePrice') {
          altPrice = item.wholesalePrice || basePrice;
        } else if (altPriceField === 'specialPrice') {
          altPrice = item.specialPrice || basePrice;
        } else if (altPriceField === 'price') {
          altPrice = item.price || basePrice;
        }

        // Make sure basePrice is default if altPrice is 0
        if (!altPrice) altPrice = basePrice * 0.9;

        const discountPercent = basePrice > altPrice ? Math.round(((basePrice - altPrice) / basePrice) * 100) : 0;

        aggregated[sku] = {
          id: `db-${sku}`,
          sku: sku,
          name: item.name,
          brand: brand,
          category: category,
          base_price: basePrice,
          alt_price: altPrice,
          discount_percent: discountPercent,
          is_recurring_allowed: true,
          life_stage: nameLower.includes('cachorro') || nameLower.includes('puppy') || nameLower.includes('kitten') ? 'cachorro' : (nameLower.includes('senior') ? 'senior' : 'adulto'),
          image_url: mapImageUrl(item.imageUrl, category),
          description: item.description || `Producto de alta calidad: ${item.name}. Sincronizado desde el catálogo activo de CAANMA ERP.`,
          ingredients: "Ingredientes de calidad seleccionada según estándares de la marca.",
          nutritional_facts: { "Categoría ERP": item.category || "General", "SKU": sku },
          stocks: { "la-pradera": 0, "cerrito-colorado": 0 }
        };
      } else {
        // If it already exists, and the current item has a valid image path (not base64), while the existing one is empty/base64/placeholder, update it.
        const existingImg = aggregated[sku].image_url;
        const isPlaceholder = !existingImg || existingImg.includes('assets/') || existingImg.startsWith('data:');
        if (isPlaceholder && item.imageUrl && !item.imageUrl.startsWith('data:')) {
          aggregated[sku].image_url = mapImageUrl(item.imageUrl, item.category ? item.category.trim() : 'General');
        }
      }

      if (item.branchId === '2e215b8c-b9e3-444f-adc3-c4387a684e05' || item.branchId === 'Pradera_ID' || item.branchId === 'PRADERA_ID') {
        aggregated[sku].stocks['la-pradera'] = item.stock || 0;
      } else if (item.branchId === 'PETQROCERRITO_ID' || item.branchId === 'CerritoCol_ID' || item.branchId === 'CERRITOCOL_ID') {
        aggregated[sku].stocks['cerrito-colorado'] = item.stock || 0;
      }
    });

    let productsList = Object.values(aggregated);

    return NextResponse.json(productsList, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
