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

    const rawProducts = await prisma.product.findMany({
      where: {
        branch: {
          tenantId: tenantId
        },
        // @ts-ignore
        showInWeb: true
      }
    });

    const filteredRaw = rawProducts.filter(item => {
      const nameUpper = (item.name || '').toUpperCase();
      const catUpper = (item.category || '').toUpperCase();
      return nameUpper.includes('PERRO') ||
             nameUpper.includes('GATO') ||
             nameUpper.includes('MASCOTA') ||
             nameUpper.includes('DOG') ||
             nameUpper.includes('CAT') ||
             nameUpper.includes('PET') ||
             catUpper.includes('FARMACIA') ||
             catUpper.includes('JUGUETE') ||
             catUpper.includes('MASCOTA');
    });

    const aggregated: Record<string, any> = {};

    filteredRaw.forEach(item => {
      const sku = item.sku;
      if (!aggregated[sku]) {
        let category = 'premios';
        const nameLower = (item.name || '').toLowerCase();
        const catLower = (item.category || '').toLowerCase();
        
        if (nameLower.includes('alimento') || nameLower.includes('croquetas') || nameLower.includes('receta')) {
          if (nameLower.includes('perro') || nameLower.includes('dog')) {
            category = 'perros';
          } else if (nameLower.includes('gato') || nameLower.includes('cat') || nameLower.includes('kitten')) {
            category = 'gatos';
          } else {
            category = 'perros';
          }
        } else if (nameLower.includes('premio') || nameLower.includes('snack') || nameLower.includes('stick') || nameLower.includes('galleta') || nameLower.includes('hueso') || nameLower.includes('premios')) {
          category = 'premios';
        } else if (nameLower.includes('juguete') || nameLower.includes('pelota') || nameLower.includes('mordedera') || nameLower.includes('kong')) {
          category = 'juguetes';
        } else if (nameLower.includes('shampoo') || nameLower.includes('jabon') || nameLower.includes('talco') || nameLower.includes('cepillo') || nameLower.includes('higiene') || nameLower.includes('jabón')) {
          category = 'higiene';
        } else if (catLower.includes('farmacia') || nameLower.includes('ampolleta') || nameLower.includes('pastilla') || nameLower.includes('tableta') || nameLower.includes('desparasitante') || nameLower.includes('vitamina') || nameLower.includes('medicamento')) {
          category = 'farmacia';
        } else {
          if (catLower.includes('juguetes') || catLower.includes('regalos')) {
            category = 'juguetes';
          } else if (catLower.includes('farmacia')) {
            category = 'farmacia';
          } else if (nameLower.includes('gato') || nameLower.includes('cat')) {
            category = 'gatos';
          } else {
            category = 'perros';
          }
        }

        let brand = item.brand || 'PETQRO';
        if (brand === 'null' || !brand) {
          brand = 'PETQRO';
        }

        aggregated[sku] = {
          id: `db-${sku}`,
          sku: sku,
          name: item.name,
          brand: brand,
          category: category,
          base_price: item.price || 100,
          discount_percent: Math.random() > 0.7 ? 15 : (Math.random() > 0.5 ? 10 : 0),
          is_recurring_allowed: true,
          life_stage: nameLower.includes('cachorro') || nameLower.includes('puppy') || nameLower.includes('kitten') ? 'cachorro' : (nameLower.includes('senior') ? 'senior' : 'adulto'),
          image_url: item.imageUrl
            ? (item.imageUrl.startsWith('http') ? item.imageUrl : `${request.nextUrl.origin}${item.imageUrl}`)
            : (category === 'gatos' ? 'assets/cat_food.png' : 'assets/dog_food.png'),
          description: item.description || `Producto de alta calidad: ${item.name}. Sincronizado desde el catálogo activo de CAANMA ERP.`,
          ingredients: "Ingredientes de calidad seleccionada según estándares de la marca.",
          nutritional_facts: { "Categoría ERP": item.category || "General", "SKU": sku },
          stocks: { "la-pradera": 0, "cerrito-colorado": 0 }
        };
      }

      if (item.branchId === '2e215b8c-b9e3-444f-adc3-c4387a684e05' || item.branchId === 'Pradera_ID' || item.branchId === 'PRADERA_ID') {
        aggregated[sku].stocks['la-pradera'] = item.stock || 0;
      } else if (item.branchId === 'PETQROCERRITO_ID' || item.branchId === 'CerritoCol_ID' || item.branchId === 'CERRITOCOL_ID') {
        aggregated[sku].stocks['cerrito-colorado'] = item.stock || 0;
      }
    });

    let productsList = Object.values(aggregated);

    // Ensure stock defaults if all are 0
    productsList.forEach(p => {
      if (p.stocks['la-pradera'] === 0 && p.stocks['cerrito-colorado'] === 0) {
        p.stocks['la-pradera'] = Math.floor(Math.random() * 15) + 3;
        p.stocks['cerrito-colorado'] = Math.floor(Math.random() * 10) + 2;
      }
    });

    if (productsList.length > 100) {
      const byCat: Record<string, any[]> = {};
      productsList.forEach(p => {
        if (!byCat[p.category]) byCat[p.category] = [];
        byCat[p.category].push(p);
      });
      
      const selected = [];
      const categories = Object.keys(byCat);
      let idx = 0;
      while (selected.length < 100 && selected.length < productsList.length) {
        const cat = categories[idx % categories.length];
        if (byCat[cat].length > 0) {
          selected.push(byCat[cat].shift());
        }
        idx++;
      }
      productsList = selected;
    }

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
