import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAccountStatementPdfBuffer } from '@/lib/accountStatementPdf';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        branch: {
          include: {
            tenant: true
          }
        }
      }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Get all sales for this customer
    const sales = await prisma.sale.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'asc' }
    });

    // Resolve branch settings config
    let config: any = {};
    const branchId = customer.branchId;
    if (branchId) {
      const settings = await prisma.branchSettings.findUnique({
        where: { branchId }
      });
      if (settings && settings.configJson) {
        try {
          config = JSON.parse(settings.configJson);
        } catch (e) {}
      }
    }

    // Fallback if no config loaded or config doesn't have basic global formatting
    if (!config || !config.formatos_factura) {
      const settings = await prisma.branchSettings.findFirst({
        where: { configJson: { not: null } }
      });
      if (settings && settings.configJson) {
        try {
          const fallbackConfig = JSON.parse(settings.configJson);
          config = { ...fallbackConfig, ...config };
        } catch (e) {}
      }
    }

    // Fallback search for bancos settings in any branch config if not present in current branch
    if (!config.bancos) {
      const allSettings = await prisma.branchSettings.findMany({
        where: { configJson: { not: null } }
      });
      for (const s of allSettings) {
        if (s.configJson) {
          try {
            const parsed = JSON.parse(s.configJson);
            if (parsed.bancos && (parsed.bancos.accounts?.length > 0 || parsed.bancos.bancoPrincipal)) {
              config.bancos = parsed.bancos;
              break;
            }
          } catch (e) {}
        }
      }
    }

    const pdfBuffer = await generateAccountStatementPdfBuffer(customer, sales, config);

    const safeName = (customer.legalName || customer.name)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 30);
    const filename = `estado_de_cuenta_${safeName}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (error: any) {
    console.error('Error generating account statement PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar el PDF' },
      { status: 500 }
    );
  }
}
