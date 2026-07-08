import { NextResponse } from 'next/server';
import { getClientForTenant } from '@/lib/prisma';

export async function GET() {
  try {
    const tenantId = '8b52cbcd-c956-4717-a1bd-02e57386aaa2';
    const prisma = getClientForTenant(tenantId);

    // Get all quotes
    const quotes = await prisma.quote.findMany({
      include: { customer: true }
    });

    const results = [];
    let fixedCount = 0;

    for (const q of quotes) {
      if (q.status.startsWith('CONVERTED:')) {
        const saleId = q.status.split(':')[1];
        const sale = await prisma.sale.findUnique({
          where: { id: saleId },
          include: { customer: true }
        });

        const quoteCust = q.customer ? q.customer.name : 'PUBLICO EN GENERAL';
        
        if (!sale) {
          results.push({
            folio: q.folio,
            status: q.status,
            error: 'Linked sale not found. Resetting to PENDIENTE.',
            action: 'RESET'
          });
          await prisma.quote.update({
            where: { id: q.id },
            data: { status: 'PENDIENTE' }
          });
          fixedCount++;
        } else {
          const saleCust = sale.customer ? sale.customer.name : 'PUBLICO EN GENERAL';
          // Check if customer ID or total is mismatched
          const customerMismatch = q.customerId !== sale.customerId;
          const totalMismatch = Math.abs(q.total - sale.total) > 0.05;

          if (customerMismatch || totalMismatch) {
            results.push({
              folio: q.folio,
              quoteCustomer: quoteCust,
              quoteTotal: q.total,
              saleFolio: sale.folio || sale.id,
              saleCustomer: saleCust,
              saleTotal: sale.total,
              status: q.status,
              reasons: { customerMismatch, totalMismatch },
              action: 'RESET_DUE_TO_MISMATCH'
            });
            // Reset to PENDIENTE
            await prisma.quote.update({
              where: { id: q.id },
              data: { status: 'PENDIENTE' }
            });
            fixedCount++;
          } else {
            results.push({
              folio: q.folio,
              quoteCustomer: quoteCust,
              quoteTotal: q.total,
              saleFolio: sale.folio || sale.id,
              saleCustomer: saleCust,
              saleTotal: sale.total,
              status: q.status,
              action: 'MATCH_KEEP'
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      fixedCount,
      details: results
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      stack: err.stack
    }, { status: 500 });
  }
}
