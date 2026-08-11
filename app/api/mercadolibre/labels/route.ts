import { NextResponse } from 'next/server';
import { getOrRefreshMeliToken } from '@/app/utils/meliToken';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shipmentId = searchParams.get('shipmentId');
    const branchId = searchParams.get('branchId');

    if (!shipmentId || !branchId) {
      return NextResponse.json({ error: 'Faltan parámetros shipmentId o branchId' }, { status: 400 });
    }

    // Obtener token fresco (se refresca automáticamente si expiró)
    const token = await getOrRefreshMeliToken(branchId);
    if (!token) {
      return NextResponse.json({ error: 'No se pudo obtener el token de Mercado Libre para la sucursal' }, { status: 401 });
    }

    // Consultar la etiqueta a Mercado Libre con el token fresco y pasarlo en el query parameter de la URL
    const meliUrl = `https://api.mercadolibre.com/shipment_labels?shipment_ids=${shipmentId}&response_type=pdf`;
    console.log(`[MELI LABELS PROXY] Consultando etiqueta a Mercado Libre para envío ${shipmentId}...`);

    const response = await fetch(meliUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MELI LABELS PROXY] Error de Mercado Libre al obtener etiqueta:`, errorText);
      try {
        const errorJson = JSON.parse(errorText);
        return NextResponse.json({ error: 'Error de Mercado Libre', meliError: errorJson }, { status: response.status });
      } catch {
        return NextResponse.json({ error: 'Error de Mercado Libre', details: errorText }, { status: response.status });
      }
    }

    // Si todo salió bien, retornar el stream del PDF
    const pdfBuffer = await response.arrayBuffer();
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="guia-${shipmentId}.pdf"`,
        'Cache-Control': 'no-store, max-age=0'
      }
    });

  } catch (error: any) {
    console.error('[MELI LABELS PROXY] Error general en proxy de etiquetas:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
