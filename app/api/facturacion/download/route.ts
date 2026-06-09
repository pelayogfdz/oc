import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = "force-dynamic";

function getFacturapiApiKey(config: any): string | null {
  if (!config || !config.facturacion) return null;
  const f = config.facturacion;
  const testKey = f.testKey || f.apiTokenTest;
  const liveKey = f.liveKey || f.apiTokenLive;
  const entorno = f.entornoFacturapi;
  
  if (entorno === 'live') {
    return liveKey || testKey || null;
  } else {
    return testKey || liveKey || null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');
    const receiptId = searchParams.get('receiptId');
    const format = searchParams.get('format') || 'pdf'; // pdf or xml

    if (!invoiceId && !receiptId) {
      return NextResponse.json({ error: 'Falta invoiceId o receiptId' }, { status: 400 });
    }

    if (format !== 'pdf' && format !== 'xml') {
      return NextResponse.json({ error: 'Formato inválido. Debe ser pdf o xml' }, { status: 400 });
    }

    // 1. Resolve branch settings to get API Key
    let branchId: string | null = null;

    if (invoiceId) {
      // Find sale with this invoiceId to get the branch
      const sale = await prisma.sale.findFirst({
        where: { invoiceId: invoiceId }
      });
      if (sale) {
        branchId = sale.branchId;
      }
    }

    let apiKey: string | null = null;

    if (branchId) {
      const settings = await prisma.branchSettings.findUnique({
        where: { branchId: branchId }
      });
      if (settings && settings.configJson) {
        apiKey = getFacturapiApiKey(JSON.parse(settings.configJson));
      }
    }

    // If still no apiKey, try to query any branchSettings in the system that has a valid API key
    if (!apiKey) {
      const allSettings = await prisma.branchSettings.findMany();
      for (const settings of allSettings) {
        if (settings.configJson) {
          const key = getFacturapiApiKey(JSON.parse(settings.configJson));
          if (key) {
            apiKey = key;
            break;
          }
        }
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'No se encontró configuración de Facturapi activa en el sistema.' }, { status: 404 });
    }

    // 2. Fetch the file from Facturapi
    const resource = invoiceId ? 'invoices' : 'receipts';
    const id = invoiceId || receiptId;
    const url = `https://api.facturapi.com/v1/${resource}/${id}/${format}`;
    const authHeader = 'Basic ' + Buffer.from(apiKey + ':').toString('base64');

    const res = await fetch(url, {
      headers: {
        'Authorization': authHeader
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Error de Facturapi al descargar ${format}:`, errText);
      return NextResponse.json({ error: `Facturapi devolvió error al descargar: ${res.statusText}` }, { status: res.status });
    }

    const fileBuffer = await res.arrayBuffer();

    // 3. Return response with correct headers
    const contentType = format === 'pdf' ? 'application/pdf' : 'application/xml';
    const filename = `${resource === 'invoices' ? 'factura' : 'complemento'}_${id}.${format}`;

    return new Response(Buffer.from(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });

  } catch (error: any) {
    console.error('Error en descarga de comprobante:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar descarga' }, { status: 500 });
  }
}
