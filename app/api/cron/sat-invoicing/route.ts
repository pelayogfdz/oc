// @ts-nocheck
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Secret key to authorize cron invocation externally (e.g. Vercel Cron)
const CRON_SECRET = process.env.CRON_SECRET || 'pulpos-cron-auth-token-123';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const { searchParams } = new URL(req.url); // Allow query param fallback for tests

    if (authHeader !== `Bearer ${CRON_SECRET}` && searchParams.get('key') !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized Cron Request' }, { status: 401 });
    }

    console.log('[SAT Background Job] Iniciando Auto-Timbrado Masivo...');

    // 1. Encontrar ventas con CFDI solicitado pero no timbrado
    const pendingSales = await prisma.sale.findMany({
      where: {
        cfdiStatus: 'REQUESTED'
      },
      include: {
        items: true,
        branch: { include: { tenant: true } }, 
      },
      take: 50 // Procesar por lotes de 50 para evitar Vercel timeout (10s)
    });

    if (pendingSales.length === 0) {
      return NextResponse.json({ message: 'Sin facturas pendientes', count: 0 });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const sale of pendingSales) {
      try {
        // En Producción Real: Aquí se invoca a facturapi.receipts.create() o invoicer.create()
        // Mock de retraso de red
        await new Promise(r => setTimeout(r, 500)); 

        // Actualizamos estado en DB como timbrado exitosamente
        await prisma.sale.update({
          where: { id: sale.id },
          data: {
            cfdiStatus: 'TIMBRADO',
            billingData: {
              ...(sale.billingData as object || {}),
              uuid: crypto.randomUUID().toUpperCase(),
              certifiedAt: new Date().toISOString(),
              pac: 'TIMBRE_FISCAL_SAT_MOCK'
            }
          }
        });
        successCount++;
        console.log(`[SAT] Timbrado Exitoso - Ticket: ${sale.id}`);
      } catch (e: any) {
        console.error(`[SAT] Error timbrando venta ${sale.id}:`, e);
        errorCount++;
        
        // Registrar el error pero dejar en REQUESTED para que el próximo cron intente
        await prisma.sale.update({
           where: { id: sale.id },
           data: {
              billingData: {
                 ...(sale.billingData as object || {}),
                 lastError: e.message || 'Error de Conexión PAC'
              }
           }
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: pendingSales.length,
      successCount,
      errorCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[SAT Background Job] Falla Gral:', error);
    return NextResponse.json({ error: 'Cron execution crashed' }, { status: 500 });
  }
}
