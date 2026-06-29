import { NextResponse } from 'next/server';
import { getAllTenantClients } from '@/lib/prisma';
import Facturapi from 'facturapi';

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

    // 1. Resolve branch settings and API Key from tenant databases
    const clients = getAllTenantClients();
    let apiKey: string | null = null;

    if (invoiceId) {
      // Find sale with this invoiceId across all tenant databases to get the branch
      for (const client of clients) {
        try {
          const sale = await client.sale.findFirst({
            where: { invoiceId: invoiceId }
          });
          if (sale && sale.branchId) {
            const settings = await client.branchSettings.findUnique({
              where: { branchId: sale.branchId }
            });
            if (settings && settings.configJson) {
              apiKey = getFacturapiApiKey(JSON.parse(settings.configJson));
              if (apiKey) break;
            }
          }
        } catch (e) {
          // Keep searching
        }
      }
    }

    // If still no apiKey, query all tenant clients' branchSettings to find any valid key
    if (!apiKey) {
      for (const client of clients) {
        try {
          const allSettings = await client.branchSettings.findMany();
          for (const settings of allSettings) {
            if (settings.configJson) {
              const key = getFacturapiApiKey(JSON.parse(settings.configJson));
              if (key) {
                apiKey = key;
                break;
              }
            }
          }
          if (apiKey) break;
        } catch (e) {
          // Keep searching
        }
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'No se encontró configuración de Facturapi activa en el sistema.' }, { status: 404 });
    }

    // 2. Instantiate Facturapi SDK
    const facturapi = new Facturapi(apiKey);
    const id = (invoiceId || receiptId) as string;

    // 3. Fetch the file from Facturapi using SDK to prevent native fetch SSL SNI errors
    let blob: any;
    if (invoiceId) {
      if (format === 'pdf') {
        blob = await facturapi.invoices.downloadPdf(id);
      } else {
        blob = await facturapi.invoices.downloadXml(id);
      }
    } else {
      if (format === 'pdf') {
        blob = await facturapi.receipts.downloadPdf(id);
      } else {
        return NextResponse.json({ error: 'Formatos xml no están soportados para recibos simplificados' }, { status: 400 });
      }
    }

    if (!blob) {
      return NextResponse.json({ error: 'No se pudo descargar el archivo desde Facturapi.' }, { status: 500 });
    }

    const fileBuffer = await blob.arrayBuffer();

    // 4. Return response with correct headers
    const contentType = format === 'pdf' ? 'application/pdf' : 'application/xml';
    const filename = `${invoiceId ? 'factura' : 'complemento'}_${id}.${format}`;

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
