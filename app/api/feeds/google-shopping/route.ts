import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = 'db5d3949-f8dd-41f6-9627-90374d55d044'; // Default to PETQRO tenant ID

    const rawProducts = await prisma.product.findMany({
      where: {
        branch: {
          tenantId: tenantId,
        },
        // @ts-ignore
        showInWeb: true,
      },
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

    sortedRaw.forEach((item) => {
      const sku = item.sku;
      if (!aggregated[sku]) {
        let category = item.category ? item.category.trim() : 'General';
        if (category === '') {
          category = 'General';
        }

        let brand = item.brand || 'PETQRO';
        if (brand === 'null' || !brand) {
          brand = 'PETQRO';
        }

        const basePrice = item.price || 0;
        const description = item.description || `Producto de alta calidad: ${item.name}. Sincronizado desde el catálogo activo de CAANMA ERP.`;

        aggregated[sku] = {
          id: `db-${sku}`,
          sku: sku,
          name: item.name,
          brand: brand,
          category: category,
          price: basePrice,
          description: description,
          imageUrl: item.imageUrl,
          stock: 0,
        };
      } else {
        // If it already exists, and the current item has a valid image path (not base64), while the existing one is empty/base64, update it.
        const existingImg = aggregated[sku].imageUrl;
        const isPlaceholder = !existingImg || existingImg.startsWith('data:');
        if (isPlaceholder && item.imageUrl && !item.imageUrl.startsWith('data:')) {
          aggregated[sku].imageUrl = item.imageUrl;
        }
      }

      // Sum stock across branches
      aggregated[sku].stock += item.stock || 0;
    });

    const products = Object.values(aggregated);
    const baseUrl = 'https://petqro.com';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n`;
    xml += `  <channel>\n`;
    xml += `    <title>PETQRO Showroom</title>\n`;
    xml += `    <link>${baseUrl}</link>\n`;
    xml += `    <description>Alimentos premium, farmacia veterinaria especializada y accesorios para mascotas en Querétaro.</description>\n`;

    products.forEach((p) => {
      const escapedTitle = p.name ? p.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;') : '';
      const escapedBrand = p.brand ? p.brand.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;') : 'PETQRO';
      const escapedCategory = p.category ? p.category.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;') : 'General';

      // Map google product category
      let googleCategory = 'Mascotas y animales &gt; Artículos para mascotas';
      const catLower = escapedCategory.toLowerCase();
      if (catLower.includes('gato')) {
        googleCategory = 'Mascotas y animales &gt; Artículos para mascotas &gt; Artículos para gatos &gt; Comida para gatos';
      } else if (catLower.includes('perro')) {
        googleCategory = 'Mascotas y animales &gt; Artículos para mascotas &gt; Artículos para perros &gt; Comida para perros';
      } else if (catLower.includes('farmacia') || catLower.includes('medicina')) {
        googleCategory = 'Mascotas y animales &gt; Artículos para mascotas &gt; Artículos veterinarios &gt; Medicamentos veterinarios';
      }

      // Map image URL
      let imgUrl = p.imageUrl || '';
      if (!imgUrl) {
        imgUrl = catLower.includes('gato') ? `${baseUrl}/assets/cat_food.png` : `${baseUrl}/assets/dog_food.png`;
      } else if (imgUrl.startsWith('data:')) {
        imgUrl = catLower.includes('gato') ? `${baseUrl}/assets/cat_food.png` : `${baseUrl}/assets/dog_food.png`;
      } else if (!imgUrl.startsWith('http')) {
        imgUrl = imgUrl.startsWith('/') ? `${baseUrl}${imgUrl}` : `${baseUrl}/${imgUrl}`;
      }

      const productLink = `${baseUrl}/?product=${p.id}`;
      const availability = p.stock > 0 ? 'in_stock' : 'out_of_stock';

      xml += `    <item>\n`;
      xml += `      <g:id>${p.id}</g:id>\n`;
      xml += `      <title>${escapedTitle}</title>\n`;
      xml += `      <description><![CDATA[${p.description}]]></description>\n`;
      xml += `      <link>${productLink}</link>\n`;
      xml += `      <g:image_link>${imgUrl}</g:image_link>\n`;
      xml += `      <g:price>${p.price.toFixed(2)} MXN</g:price>\n`;
      xml += `      <g:availability>${availability}</g:availability>\n`;
      xml += `      <g:brand>${escapedBrand}</g:brand>\n`;
      xml += `      <g:condition>new</g:condition>\n`;
      xml += `      <g:google_product_category>${googleCategory}</g:google_product_category>\n`;
      xml += `    </item>\n`;
    });

    xml += `  </channel>\n`;
    xml += `</rss>\n`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error generating Google Shopping feed:', error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><error><message>Internal Server Error: ${error.message}</message></error>`,
      {
        status: 500,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          ...corsHeaders,
        },
      }
    );
  }
}
