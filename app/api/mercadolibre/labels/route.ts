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
      
      let errorMessage = 'No se pudo obtener la guía de envío de Mercado Libre.';
      let isPickedUp = false;
      let isCancelled = false;

      try {
        const errorJson = JSON.parse(errorText);
        const cause = errorJson?.failed_shipments?.[0]?.cause || errorJson?.cause || '';
        const msg = errorJson?.failed_shipments?.[0]?.message || errorJson?.message || '';
        
        if (cause === 'NOT_PRINTABLE_STATUS' || msg.includes('picked_up') || msg.includes('shipped') || msg.includes('delivered')) {
          isPickedUp = true;
          errorMessage = 'El paquete ya fue recolectado por Mercado Libre y se encuentra en camino. La plataforma no permite reimprimir guías una vez que el envío fue entregado a la paquetería.';
        } else if (msg.includes('cancelled') || cause.includes('CANCELLED')) {
          isCancelled = true;
          errorMessage = 'La orden fue cancelada en Mercado Libre, por lo que la etiqueta de envío ya no se encuentra disponible.';
        } else if (msg) {
          errorMessage = msg;
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Guía de Envío - Mercado Libre</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      margin: 0;
      padding: 2rem 1rem;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 2rem;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
      text-align: center;
    }
    .icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.35rem;
      color: #0f172a;
    }
    p {
      color: #64748b;
      font-size: 0.95rem;
      line-height: 1.5;
      margin: 0 0 1.5rem 0;
    }
    .badge {
      display: inline-block;
      padding: 0.35rem 0.75rem;
      background: #f1f5f9;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      color: #475569;
      margin-bottom: 1.5rem;
    }
    .btn {
      display: inline-block;
      background-color: #6366f1;
      color: white;
      text-decoration: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      transition: background-color 0.2s;
      cursor: pointer;
      border: none;
    }
    .btn:hover {
      background-color: #4f46e5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${isPickedUp ? '🚚' : isCancelled ? '✕' : '⚠️'}</div>
    <h2>${isPickedUp ? 'Paquete en Camino' : isCancelled ? 'Venta Cancelada' : 'Guía No Disponible'}</h2>
    <div class="badge">Envío #${shipmentId}</div>
    <p>${errorMessage}</p>
    <button class="btn" onclick="window.close()">Cerrar Ventana</button>
  </div>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
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
