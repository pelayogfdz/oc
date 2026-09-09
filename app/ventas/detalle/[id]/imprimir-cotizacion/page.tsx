export const dynamic = 'force-dynamic';

import { resolveClientForQuote } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintActions from "@/app/components/PrintActions";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await resolveClientForQuote(id);
  const displayFolio = result?.quote?.folio || id.slice(0, 8).toUpperCase();
  return {
    title: `Cotizacion_${displayFolio}`,
  };
}

// Helper function to truncate product description
function getShortDescription(text: string | null): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= 20) return text;
  return words.slice(0, 20).join(' ') + '...';
}

function formatDateDisplay(date: Date | string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export default async function ImprimirCotizacionPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ template?: string }>;
}) {
  const { id } = await params;
  const { template: queryTemplate } = await searchParams;
  
  const result = await resolveClientForQuote(id);
  if (!result) return notFound();
  const { quote } = result;

  let config: any = {};
  if (quote.branch?.settings?.configJson) {
    try {
      config = JSON.parse(quote.branch.settings.configJson);
    } catch(e) {}
  }
  
  const globalLogoUrl = config.global?.logoUrl || '';
  const cotizacionConfig = config.formatos_cotizacion || {};
  const logoUrl = cotizacionConfig.logoUrl || globalLogoUrl;
  const primaryColor = cotizacionConfig.primaryColor || '#0ea5e9';

  const cotizacionesConfig = config.cotizaciones || {};
  const incluirImagenes = cotizacionesConfig.incluirImagenes === true || cotizacionesConfig.incluirImagenes === 'true';
  const diasVigencia = parseInt(cotizacionesConfig.diasVigencia || '30', 10);
  const isBreakdownDiscounts = quote.breakdownDiscounts === true;

  // Detect default template: if tenant is PIZCA DE AZÚCAR or config says boutique
  const tenantName = (quote.branch?.tenant?.name || '').toUpperCase();
  const isPizca = tenantName.includes('PIZCA') || tenantName.includes('AZUCAR') || tenantName.includes('PASTEL') || tenantName.includes('REPOSTERIA');
  const configuredTemplate = cotizacionesConfig.formatoPlantilla || (isPizca ? 'boutique' : 'standard');
  const activeTemplate = queryTemplate || configuredTemplate;

  // Auto-print script
  const printScript = `
    (function() {
      function doPrint() {
        window.print();
      }
      if (document.readyState === 'complete') {
        setTimeout(doPrint, 500);
      } else {
        window.addEventListener('load', function() {
          setTimeout(doPrint, 500);
        });
      }
    })();
  `;

  // Calculations for dynamic original prices, discounts and totals
  let grossSubtotalExcludingIva = 0;
  let totalDiscountExcludingIva = 0;
  let netSubtotalExcludingIva = 0;
  let totalIva = 0;

  const storedTotalIncludingIva = quote.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const quoteTotal = quote.total;
  const prorationRatio = storedTotalIncludingIva > quoteTotal + 0.01 ? (quoteTotal / storedTotalIncludingIva) : 1.0;

  const processedItems = quote.items.map((item: any) => {
    const originalPriceIncludingIva = item.product?.price || item.price;
    const finalPriceIncludingIva = item.price * prorationRatio;
    const discountPerUnitIncludingIva = Math.max(0, originalPriceIncludingIva - finalPriceIncludingIva);

    const taxRate = item.product?.taxRate ?? 16.0;
    const taxType = item.product?.taxType || 'IVA';
    const isIva = taxType === 'IVA' || taxType === 'IVA_IEPS';
    const rate = isIva ? taxRate : 0;

    const originalPriceExcludingIva = originalPriceIncludingIva / (1 + rate / 100);
    const finalPriceExcludingIva = finalPriceIncludingIva / (1 + rate / 100);
    const discountPerUnitExcludingIva = Math.max(0, originalPriceExcludingIva - finalPriceExcludingIva);

    grossSubtotalExcludingIva += originalPriceExcludingIva * item.quantity;
    totalDiscountExcludingIva += discountPerUnitExcludingIva * item.quantity;
    netSubtotalExcludingIva += finalPriceExcludingIva * item.quantity;

    const rowIva = (finalPriceIncludingIva - finalPriceExcludingIva) * item.quantity;
    totalIva += rowIva;

    return {
      ...item,
      originalPriceExcludingIva,
      finalPriceExcludingIva,
      discountPerUnitExcludingIva,
      discountPerUnitIncludingIva,
      taxRate: rate,
      rowIva,
      rowSubtotalExcludingIva: finalPriceExcludingIva * item.quantity
    };
  });

  const manualDiscount = Math.max(0, (netSubtotalExcludingIva + totalIva) - quote.total);
  const quoteIdUpper = quote.folio || quote.id.slice(0, 8).toUpperCase();

  const clientAddress = [
    quote.customer?.street,
    [quote.customer?.exteriorNumber, quote.customer?.interiorNumber].filter(Boolean).join(' '),
    quote.customer?.neighborhood,
    quote.customer?.city,
    quote.customer?.state,
    quote.customer?.zipCode
  ].filter(Boolean).join(', ');

  const obsText = (quote.observations || (quote as any).notes || '').trim();
  const rawImg = (quote.observationImageUrl || (quote as any).observationImages || '').trim();
  let refImages: string[] = [];
  if (rawImg) {
    if (rawImg.startsWith('[') && rawImg.endsWith(']')) {
      try {
        const parsed = JSON.parse(rawImg);
        if (Array.isArray(parsed)) refImages = parsed.filter(Boolean);
      } catch (e) {
        refImages = [rawImg];
      }
    } else {
      refImages = [rawImg];
    }
  }

  // If no reference images in quote, check if products have images
  if (refImages.length === 0) {
    quote.items.forEach((it: any) => {
      if (it.product?.imageUrl && !refImages.includes(it.product.imageUrl)) {
        refImages.push(it.product.imageUrl);
      }
    });
  }

  // Delivery details parsing from observations if present (e.g. "Entrega: 12/09/2026 12:00")
  let deliveryDateStr = formatDateDisplay(new Date(new Date(quote.createdAt).getTime() + 4 * 24 * 60 * 60 * 1000));
  let deliveryTimeStr = '12:00 HORAS';
  
  if (obsText) {
    const dateMatch = obsText.match(/entrega[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}\s+[a-zA-Z]{3,}\s+\d{2,4})/i);
    if (dateMatch) {
      deliveryDateStr = dateMatch[1].toUpperCase();
    }
    const timeMatch = obsText.match(/hora[:\s]+(\d{1,2}(?::\d{2})?\s*(?:am|pm|hrs|horas)?)/i);
    if (timeMatch) {
      deliveryTimeStr = timeMatch[1].toUpperCase();
    }
  }

  // Payment method label
  const paymentMethodLabel = (() => {
    switch (quote.paymentMethod) {
      case 'CASH': return 'EFECTIVO';
      case 'CARD':
      case 'CARD_CREDIT': return 'TARJETA DE CRÉDITO';
      case 'CARD_DEBIT': return 'TARJETA DE DÉBITO';
      case 'TRANSFER': return 'TRANSFERENCIA';
      case 'CREDIT': return 'CRÉDITO';
      default: return quote.paymentMethod || 'POR DEFINIR';
    }
  })();

  const formatButtons = (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <Link
        href={`/ventas/detalle/${id}/imprimir-cotizacion?template=boutique`}
        style={{
          padding: '0.45rem 0.9rem',
          borderRadius: '20px',
          backgroundColor: activeTemplate === 'boutique' ? '#dfc9a5' : '#f1f5f9',
          color: activeTemplate === 'boutique' ? '#1e293b' : '#64748b',
          fontWeight: 'bold',
          fontSize: '0.8rem',
          textDecoration: 'none',
          border: '1px solid #cbd5e1',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem'
        }}
      >
        🍰 Formato Repostería / Boutique
      </Link>
      <Link
        href={`/ventas/detalle/${id}/imprimir-cotizacion?template=standard`}
        style={{
          padding: '0.45rem 0.9rem',
          borderRadius: '20px',
          backgroundColor: activeTemplate === 'standard' ? primaryColor : '#f1f5f9',
          color: activeTemplate === 'standard' ? '#ffffff' : '#64748b',
          fontWeight: 'bold',
          fontSize: '0.8rem',
          textDecoration: 'none',
          border: '1px solid #cbd5e1',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem'
        }}
      >
        📄 Formato Corporativo
      </Link>
    </div>
  );

  if (activeTemplate === 'boutique') {
    return (
      <>
        <style dangerouslySetInnerHTML={{__html: `
          * { box-sizing: border-box; }
          
          @page {
            size: letter portrait;
            margin: 0.8cm 1cm;
          }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            margin: 0;
            padding: 1.5rem 0 3rem 0;
            color: #1e293b;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .pizca-container {
            width: 21.59cm;
            min-height: 27.94cm;
            margin: 0 auto;
            background: white;
            padding: 1.2cm 1.4cm;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
            border-radius: 12px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          /* Header */
          .pizca-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1.2rem;
          }
          .pizca-logo-box {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }
          .pizca-diamond-icon {
            width: 46px;
            height: 46px;
          }
          .pizca-title-group {
            text-align: right;
          }
          .pizca-main-title {
            font-size: 1.35rem;
            font-weight: 400;
            letter-spacing: 2.5px;
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
          }
          .pizca-sub-title {
            font-size: 1.55rem;
            font-weight: 900;
            letter-spacing: 5px;
            color: #0f172a;
            margin: 0.15rem 0 0.15rem 0;
            text-transform: uppercase;
          }
          .pizca-brand-name {
            font-size: 0.85rem;
            font-weight: 700;
            letter-spacing: 3.5px;
            color: #475569;
            text-transform: uppercase;
          }

          /* Metadata Grid */
          .pizca-meta-grid {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
            margin-bottom: 1rem;
          }
          .pizca-meta-row {
            display: flex;
            gap: 0.5rem;
          }
          .pizca-meta-cell {
            background-color: #f1f5f9;
            border-radius: 4px;
            padding: 0.45rem 0.75rem;
            display: flex;
            align-items: center;
            gap: 0.4rem;
            font-size: 0.75rem;
          }
          .pizca-meta-label {
            font-weight: 800;
            color: #334155;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .pizca-meta-val {
            font-weight: 500;
            color: #0f172a;
            text-transform: uppercase;
          }

          /* Specifications Table */
          .pizca-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0.75rem;
            border: 1px solid #cbd5e1;
          }
          .pizca-table th {
            background-color: #dfc9a5;
            color: #1e293b;
            font-weight: 800;
            font-size: 0.75rem;
            letter-spacing: 0.8px;
            padding: 0.5rem 0.4rem;
            text-align: center;
            border-right: 1px solid #ffffff;
            text-transform: uppercase;
          }
          .pizca-table th:last-child {
            border-right: none;
          }
          .pizca-table td {
            border: 1px solid #e2e8f0;
            padding: 0.6rem 0.5rem;
            font-size: 0.78rem;
            text-align: center;
            vertical-align: top;
            color: #1e293b;
          }
          .pizca-price-cell {
            font-weight: 600;
            color: #334155;
            padding: 0.4rem;
            background-color: #fafaf9;
            border-top: 1px solid #e2e8f0;
            margin-top: 0.4rem;
            border-radius: 3px;
          }
          .pizca-total-row {
            background-color: #f8fafc;
            border-top: 2px solid #cbd5e1;
            font-weight: 800;
            font-size: 0.85rem;
          }

          /* Two Columns Middle (Description & Observations vs Reference Design) */
          .pizca-mid-grid {
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            gap: 0.75rem;
            margin-bottom: 0.75rem;
          }
          .pizca-box {
            border: 1px solid #cbd5e1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border-radius: 2px;
          }
          .pizca-box-header {
            background-color: #dfc9a5;
            color: #1e293b;
            font-weight: 800;
            font-size: 0.75rem;
            letter-spacing: 1px;
            padding: 0.35rem 0.6rem;
            text-align: center;
            text-transform: uppercase;
          }
          .pizca-box-content {
            padding: 0.75rem;
            font-size: 0.8rem;
            line-height: 1.4;
            color: #334155;
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            min-height: 80px;
          }

          /* Bottom Grid */
          .pizca-bottom-grid {
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            gap: 0.75rem;
            align-items: stretch;
          }
          .pizca-summary-list {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
            margin-top: 0.5rem;
          }
          .pizca-summary-row {
            background-color: #f1f5f9;
            padding: 0.4rem 0.75rem;
            display: flex;
            justify-content: space-between;
            font-size: 0.8rem;
            border-radius: 2px;
          }
          .pizca-summary-label {
            font-weight: 800;
            letter-spacing: 0.5px;
            color: #334155;
            text-transform: uppercase;
          }
          .pizca-summary-val {
            font-weight: 700;
            color: #0f172a;
          }
          .pizca-notice-text {
            font-size: 0.72rem;
            font-weight: 800;
            text-align: center;
            color: #0f172a;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 0.2rem;
          }
          .pizca-underline-text {
            font-size: 0.68rem;
            font-weight: 800;
            text-decoration: underline;
            text-align: center;
            color: #475569;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }

          .pizca-footer-signature {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 0.5rem;
            margin-top: 1rem;
          }
          .pizca-script-font {
            font-family: 'Brush Script MT', 'Segoe Script', 'Dancing Script', cursive;
            font-size: 1.6rem;
            color: #1e293b;
          }
          .pizca-sub-pref {
            font-size: 0.7rem;
            letter-spacing: 3px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-left: 0.25rem;
          }

          @media print {
            body {
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .no-print { display: none !important; }
            .pizca-container {
              width: 100% !important;
              max-width: none !important;
              min-height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
          }
        `}} />
        <script dangerouslySetInnerHTML={{ __html: printScript }} />

        <div className="pizca-container">
          <div>
            {/* Header */}
            <div className="pizca-header">
              <div className="pizca-logo-box">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" style={{ maxHeight: '65px', maxWidth: '180px', objectFit: 'contain' }} />
                ) : (
                  <svg className="pizca-diamond-icon" viewBox="0 0 100 100" fill="none" stroke="#1e293b" strokeWidth="3">
                    <path d="M25 35 L75 35 L90 55 L50 90 L10 55 Z" fill="none" />
                    <path d="M25 35 L50 90 L75 35" />
                    <path d="M10 55 L90 55" />
                    <path d="M50 35 L50 90" />
                    <path d="M38 18 C38 14, 44 10, 50 10 C56 10, 62 14, 62 18 C62 25, 38 25, 38 35" strokeDasharray="2,2" />
                    <circle cx="50" cy="8" r="3" fill="#1e293b" />
                  </svg>
                )}
              </div>

              <div className="pizca-title-group">
                <h1 className="pizca-main-title">COTIZACIÓN PASTELES</h1>
                <h2 className="pizca-sub-title">PERSONALIZADOS</h2>
                <div className="pizca-brand-name">{quote.branch?.tenant?.name || 'PIZCA DE AZÚCAR'}</div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="pizca-meta-grid">
              {/* Row 1 */}
              <div className="pizca-meta-row">
                <div className="pizca-meta-cell" style={{ flex: 1.5 }}>
                  <span className="pizca-meta-label">CLIENTE:</span>
                  <span className="pizca-meta-val" style={{ fontWeight: 'bold' }}>
                    {quote.customer?.legalName || quote.customer?.name || 'PÚBLICO EN GENERAL'}
                  </span>
                </div>
                <div className="pizca-meta-cell" style={{ flex: 1 }}>
                  <span className="pizca-meta-label">TELÉFONO:</span>
                  <span className="pizca-meta-val">
                    {quote.customer?.phone || 'SIN REGISTRAR'}
                  </span>
                </div>
              </div>

              {/* Row 2 */}
              <div className="pizca-meta-row">
                <div className="pizca-meta-cell" style={{ flex: 1 }}>
                  <span className="pizca-meta-label">FECHA DE EXPEDIDO:</span>
                  <span className="pizca-meta-val">{formatDateDisplay(quote.createdAt)}</span>
                </div>
                <div className="pizca-meta-cell" style={{ flex: 1 }}>
                  <span className="pizca-meta-label">FECHA DE ENTREGA:</span>
                  <span className="pizca-meta-val">{deliveryDateStr}</span>
                </div>
                <div className="pizca-meta-cell" style={{ flex: 1 }}>
                  <span className="pizca-meta-label">HORA DE ENTREGA:</span>
                  <span className="pizca-meta-val">{deliveryTimeStr}</span>
                </div>
              </div>

              {/* Row 3 */}
              <div className="pizca-meta-row">
                <div className="pizca-meta-cell" style={{ flex: 1 }}>
                  <span className="pizca-meta-label">SUCURSAL:</span>
                  <span className="pizca-meta-val">{quote.branch?.name || 'MATRIZ'}</span>
                </div>
                <div className="pizca-meta-cell" style={{ flex: 1 }}>
                  <span className="pizca-meta-label">GENERÓ:</span>
                  <span className="pizca-meta-val">{quote.user?.name || 'SISTEMA'}</span>
                </div>
                <div className="pizca-meta-cell" style={{ flex: 1 }}>
                  <span className="pizca-meta-label">FOLIO:</span>
                  <span className="pizca-meta-val" style={{ fontWeight: 'bold', color: '#0f172a' }}>{quoteIdUpper}</span>
                </div>
              </div>
            </div>

            {/* Custom Pastry Specifications Table */}
            <table className="pizca-table">
              <thead>
                <tr>
                  <th style={{ width: '6%' }}>NO°</th>
                  <th style={{ width: '22%' }}>SABOR</th>
                  <th style={{ width: '15%' }}>TAMAÑO</th>
                  <th style={{ width: '11%' }}>PORS</th>
                  <th style={{ width: '16%' }}>DECORACIÓN</th>
                  <th style={{ width: '16%' }}>ELEMENTOS EXTRA</th>
                  <th style={{ width: '14%' }}>CAKETOPPER</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item: any, idx: number) => {
                  const variantName = item.variant?.name || item.product?.unit || '-';
                  const prodDesc = item.product?.description || '';
                  const itemPrice = item.price * item.quantity;
                  
                  return (
                    <tr key={item.id || idx}>
                      <td style={{ fontWeight: 'bold' }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: '700', textTransform: 'uppercase' }}>{item.product?.name || 'PASTEL'}</div>
                        {prodDesc && <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>{prodDesc}</div>}
                        <div className="pizca-price-cell">${Number(itemPrice).toFixed(2)}</div>
                      </td>
                      <td>
                        <div style={{ textTransform: 'uppercase', fontWeight: '600' }}>{variantName}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{item.quantity > 1 ? `${item.quantity} PX` : '10-15 PX'}</div>
                      </td>
                      <td>
                        <div style={{ textTransform: 'uppercase' }}>SENCILLO / PERSONALIZADO</div>
                      </td>
                      <td>
                        <div style={{ textTransform: 'uppercase', fontSize: '0.72rem' }}>
                          {isBreakdownDiscounts && item.discountPerUnit > 0 ? (
                            <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Descuento Incluido</span>
                          ) : (
                            'BASE ESPECIAL / DETALLES'
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ textTransform: 'uppercase', fontSize: '0.72rem' }}>INCLUIDO / ESTÁNDAR</div>
                      </td>
                    </tr>
                  );
                })}

                {/* Total General Bottom Row */}
                <tr className="pizca-total-row">
                  <td colSpan={5} style={{ borderRight: 'none' }}></td>
                  <td style={{ textAlign: 'right', paddingRight: '0.5rem', fontWeight: '800', borderRight: 'none' }}>
                    TOTAL GENERAL:
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: '900', color: '#0f172a' }}>
                    {formatCurrency(quote.total)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Middle Section: Description & Observations vs Reference Photo */}
            <div className="pizca-mid-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div className="pizca-box" style={{ minHeight: '90px' }}>
                  <div className="pizca-box-header">DESCRIPCIÓN</div>
                  <div className="pizca-box-content">
                    {obsText || (quote.items[0]?.product?.description ? quote.items[0].product.description : 'PASTEL COMO IMAGEN DE REFERENCIA SEGÚN ESPECIFICACIONES')}
                  </div>
                </div>

                <div className="pizca-box" style={{ minHeight: '90px' }}>
                  <div className="pizca-box-header">OBSERVACIONES</div>
                  <div className="pizca-box-content">
                    {cotizacionesConfig.terminosCot || 'SABOR Y DECORACIÓN PERSONALIZADOS. CONFIRMAR FECHA Y HORA DE RECOLECCIÓN.'}
                  </div>
                </div>
              </div>

              {/* Reference Image Box */}
              <div className="pizca-box" style={{ height: '100%' }}>
                <div className="pizca-box-header">
                  {refImages.length > 1 ? `DISEÑOS DE REFERENCIA (${refImages.length})` : 'DISEÑO DE REFERENCIA'}
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem', background: '#fafaf9', minHeight: '180px' }}>
                  {refImages.length === 1 ? (
                    <img 
                      src={refImages[0]} 
                      alt="Diseño de Referencia" 
                      style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#fff' }} 
                    />
                  ) : refImages.length > 1 ? (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: refImages.length === 2 ? '1fr 1fr' : refImages.length === 3 ? '1fr 1fr 1fr' : 'repeat(auto-fit, minmax(80px, 1fr))', 
                      gap: '0.35rem', 
                      width: '100%', 
                      height: '100%',
                      maxHeight: '185px'
                    }}>
                      {refImages.slice(0, 5).map((imgUrl, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0', padding: '0.2rem', overflow: 'hidden' }}>
                          <img 
                            src={imgUrl} 
                            alt={`Referencia ${idx + 1}`} 
                            style={{ 
                              maxHeight: refImages.length <= 2 ? '170px' : refImages.length <= 4 ? '85px' : '75px', 
                              maxWidth: '100%', 
                              objectFit: 'contain' 
                            }} 
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '2rem 1rem' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 0.5rem', opacity: 0.4 }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      Sin imagen de referencia adjunta
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Section: Terms, Financial Breakdown, Color Palette */}
            <div className="pizca-bottom-grid">
              <div>
                <div className="pizca-notice-text">ESTA COTIZACIÓN TIENE UNA VALIDEZ DE {diasVigencia} DÍAS</div>
                <div className="pizca-underline-text">RECUERDA CONFIRMAR TODOS LOS DATOS & ESPECIFICACIONES</div>

                <div className="pizca-summary-list">
                  <div className="pizca-summary-row">
                    <span className="pizca-summary-label">PRECIO TOTAL:</span>
                    <span className="pizca-summary-val">{formatCurrency(quote.total)}</span>
                  </div>
                  {manualDiscount > 0.01 && (
                    <div className="pizca-summary-row">
                      <span className="pizca-summary-label">DESCUENTO:</span>
                      <span className="pizca-summary-val" style={{ color: '#dc2626' }}>-{formatCurrency(manualDiscount)}</span>
                    </div>
                  )}
                  <div className="pizca-summary-row">
                    <span className="pizca-summary-label">ANTICIPO (50% REQUERIDO):</span>
                    <span className="pizca-summary-val">{formatCurrency(quote.total * 0.5)}</span>
                  </div>
                  <div className="pizca-summary-row">
                    <span className="pizca-summary-label">FORMA DE PAGO:</span>
                    <span className="pizca-summary-val">{paymentMethodLabel}</span>
                  </div>
                  <div className="pizca-summary-row" style={{ backgroundColor: '#e2e8f0' }}>
                    <span className="pizca-summary-label">RESTAN AL ENTREGAR:</span>
                    <span className="pizca-summary-val" style={{ color: '#0f172a' }}>{formatCurrency(quote.total * 0.5)}</span>
                  </div>
                </div>
              </div>

              {/* Color Palette & Signature */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div className="pizca-box" style={{ height: '80px' }}>
                  <div className="pizca-box-header">PALETA DE COLORES</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.4rem' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#f472b6', border: '1px solid #cbd5e1' }} title="Rosa Pastel"></div>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#fde047', border: '1px solid #cbd5e1' }} title="Amarillo Suave"></div>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#67e8f9', border: '1px solid #cbd5e1' }} title="Celeste"></div>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#dfc9a5', border: '1px solid #cbd5e1' }} title="Oro Champagne"></div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>Según imagen</span>
                  </div>
                </div>

                <div className="pizca-footer-signature">
                  <span className="pizca-script-font">Gracias por tu</span>
                  <span className="pizca-sub-pref">PREFERENCIA...</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#dfc9a5" stroke="#1e293b" strokeWidth="1.5">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Action Toolbar */}
        <PrintActions 
          primaryColor="#dfc9a5" 
          printLabel="Imprimir Cotización Boutique"
          extraButton={formatButtons}
        />
      </>
    );
  }

  // Standard Corporate Template
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        * { box-sizing: border-box; }
        
        @page {
          size: letter portrait;
          margin: 0.6cm 0.8cm;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f1f5f9;
          margin: 0;
          padding: 1.5rem 0 3rem 0;
          color: #0f172a;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .letter-container {
          width: 21.59cm;
          min-height: 27.94cm;
          margin: 0 auto;
          background: white;
          padding: 1.2cm 1.4cm;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          border-radius: 8px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .header-grid {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 1.5rem;
          align-items: center;
          border-bottom: 2px solid ${primaryColor};
          padding-bottom: 0.6rem;
          margin-bottom: 0.6rem;
        }
        .business-name {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
          display: block;
          text-transform: uppercase;
          line-height: 1.2;
        }
        .business-info {
          font-size: 0.75rem;
          line-height: 1.35;
          color: #475569;
          margin-top: 0.2rem;
        }
        .title-box {
          background-color: ${primaryColor};
          padding: 0.5rem 1.25rem;
          border-radius: 6px;
          text-align: center;
          color: white;
        }
        .title-text {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        /* Info Grid */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-bottom: 0.6rem;
        }
        .info-card {
          background: #f8fafc;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          font-size: 0.75rem;
          line-height: 1.35;
        }
        .data-label {
          font-size: 0.68rem;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 0.15rem;
        }
        .data-value {
          font-size: 0.88rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 0.15rem;
        }

        /* Items Table */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0.4rem;
          font-size: 0.78rem;
        }
        .items-table thead {
          display: table-header-group;
        }
        .items-table th {
          background-color: #f8fafc;
          border-top: 1px solid #cbd5e1;
          border-bottom: 2px solid #cbd5e1;
          padding: 0.35rem 0.4rem;
          text-align: left;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          font-size: 0.7rem;
          letter-spacing: 0.3px;
        }
        .items-table td {
          padding: 0.35rem 0.4rem;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: top;
        }
        .items-table tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        /* Product Cell */
        .prod-cell { display: flex; gap: 0.5rem; align-items: flex-start; }
        .prod-img { width: 32px; height: 32px; border-radius: 4px; object-fit: contain; border: 1px solid #e2e8f0; background-color: #f8fafc; flex-shrink: 0; }
        .prod-img-placeholder { width: 32px; height: 32px; border-radius: 4px; background-color: #f1f5f9; border: 1px solid #e2e8f0; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 0.7rem; font-weight: bold; }
        .prod-name { font-size: 0.78rem; font-weight: 700; color: #0f172a; margin: 0; text-transform: uppercase; line-height: 1.25; }
        .prod-meta { font-size: 0.68rem; color: #64748b; font-family: monospace; display: block; margin-top: 0.1rem; }
        
        .discount-badge {
          display: inline-flex;
          align-items: center;
          background-color: #dcfce7;
          color: #15803d;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.1rem 0.3rem;
          border-radius: 3px;
          margin-top: 0.15rem;
          width: fit-content;
          border: 1px solid #bbf7d0;
        }
        .original-price { text-decoration: line-through; color: #94a3b8; font-size: 0.75rem; margin-right: 0.3rem; }
        .final-price { font-weight: 700; color: #1e293b; font-size: 0.78rem; }

        /* Bottom Section (Two Columns: Left = Terms & Obs & Images, Right = Totals) */
        .bottom-section {
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 1.25rem;
          margin-top: 0.6rem;
          align-items: start;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .notes-column {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .notes-card {
          padding: 0.4rem 0.6rem;
          border-radius: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          font-size: 0.72rem;
          line-height: 1.35;
        }
        .notes-title {
          display: block;
          color: #0f172a;
          font-weight: 700;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 0.2rem;
        }
        
        /* Totals Box */
        .totals-box {
          border-top: 1px solid #cbd5e1;
          padding-top: 0.4rem;
          font-size: 0.8rem;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 0.15rem 0;
          color: #475569;
        }
        .total-row.discount-row { color: #dc2626; font-weight: 600; }
        .total-final {
          display: flex;
          justify-content: space-between;
          margin-top: 0.35rem;
          padding-top: 0.35rem;
          border-top: 2px solid #0f172a;
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
        }

        /* Images thumbnails */
        .ref-images-gallery {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-top: 0.25rem;
        }
        .ref-thumb {
          height: 60px;
          max-width: 90px;
          object-fit: contain;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          background-color: white;
        }

        /* Footer QR Box */
        .qr-box {
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          padding: 0.45rem 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.6rem;
          background-color: white;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .qr-img { width: 44px; height: 44px; flex-shrink: 0; }
        .qr-title { margin: 0 0 0.1rem 0; color: #0f172a; font-size: 0.78rem; font-weight: 800; }
        .qr-text { margin: 0; color: #475569; font-size: 0.7rem; line-height: 1.3; }

        @media print {
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print { display: none !important; }
          .letter-container {
            width: 100% !important;
            max-width: none !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .bottom-section, .qr-box, .info-grid, .info-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }

        @media (max-width: 768px) {
          body { padding: 0.5rem 0 !important; background: white !important; }
          .letter-container { width: 100% !important; max-width: 100% !important; padding: 1rem !important; box-shadow: none !important; border-radius: 0 !important; }
          .header-grid { grid-template-columns: 1fr !important; gap: 0.75rem !important; }
          .info-grid { grid-template-columns: 1fr !important; gap: 0.75rem !important; }
          .bottom-section { grid-template-columns: 1fr !important; gap: 1rem !important; }
          .totals-box { width: 100% !important; }
          .qr-box { flex-direction: column !important; text-align: center !important; }
        }
      `}} />
      <script dangerouslySetInnerHTML={{ __html: printScript }} />
      
      <div className="letter-container">
        {/* Header Grid */}
        <div className="header-grid">
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ maxHeight: '44px', maxWidth: '160px', objectFit: 'contain', marginBottom: '0.25rem' }} />
            ) : (
              <span className="business-name">{quote.branch?.tenant?.name || 'CAANMA'}</span>
            )}
            <div className="business-info">
              <strong className="business-name">{quote.branch?.tenant?.name || 'CAANMA'}</strong>
              Sucursal {quote.branch?.name || 'Principal'}<br/>
              {quote.branch?.location ? quote.branch.location.replace(/\\n/g, ', ') : 'Querétaro, México'}<br/>
              {quote.branch?.tenant?.name ? `contacto@${quote.branch.tenant.name.toLowerCase().replace(/\s+/g, '')}.com` : 'ventas@caanma.com'}
            </div>
          </div>
          <div>
            <div className="title-box">
              <h2 className="title-text">Cotización</h2>
            </div>
          </div>
        </div>

        {/* Info Grid with Client and Doc details */}
        <div className="info-grid">
          <div className="info-card">
            <div className="data-label">Cotizado a:</div>
            <div className="data-value">
              {quote.customer?.legalName || quote.customer?.name || 'Público en General'}
            </div>
            {quote.customer?.taxId && <div><strong style={{ color: '#64748b' }}>RFC:</strong> <span>{quote.customer.taxId}</span></div>}
            {quote.customer?.taxRegime && <div><strong style={{ color: '#64748b' }}>Régimen:</strong> <span>{quote.customer.taxRegime}</span></div>}
            {clientAddress && <div><strong style={{ color: '#64748b' }}>Dirección:</strong> <span>{clientAddress}</span></div>}
            {quote.customer?.email && <div><strong style={{ color: '#64748b' }}>Email:</strong> <span>{quote.customer.email}</span></div>}
            {quote.customer?.phone && <div><strong style={{ color: '#64748b' }}>Teléfono:</strong> <span>{quote.customer.phone}</span></div>}
          </div>
          <div className="info-card">
            <div className="data-label">Detalles del Documento:</div>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#64748b', padding: '0.15rem 0', fontWeight: '500' }}>Folio:</td>
                  <td style={{ fontWeight: '700', textAlign: 'right', color: '#0f172a' }}>#{quoteIdUpper}</td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '0.15rem 0', fontWeight: '500' }}>Fecha Emisión:</td>
                  <td style={{ fontWeight: '600', textAlign: 'right' }}>
                    {new Date(quote.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '0.15rem 0', fontWeight: '500' }}>Validez hasta:</td>
                  <td style={{ fontWeight: '600', textAlign: 'right', color: '#b91c1c' }}>
                    {new Date(new Date(quote.createdAt).getTime() + diasVigencia * 24 * 60 * 60 * 1000).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })} ({diasVigencia} días)
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '0.15rem 0', fontWeight: '500' }}>Elaboró:</td>
                  <td style={{ fontWeight: '600', textAlign: 'right' }}>{quote.user?.name || 'Sistema'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Items Table */}
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: '42%' }}>Producto</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Cantidad</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Precio Unit.</th>
              <th style={{ width: '15%', textAlign: 'right' }}>IVA</th>
              <th style={{ width: '16%', textAlign: 'right' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {processedItems.map((item: any) => (
              <tr key={item.id}>
                <td>
                  <div className="prod-cell">
                    {incluirImagenes && (
                      item.product?.imageUrl ? (
                        <img src={item.product.imageUrl} alt={item.product.name} className="prod-img" />
                      ) : (
                        <div className="prod-img-placeholder">
                          {item.product?.name ? item.product.name.slice(0, 2).toUpperCase() : 'PR'}
                        </div>
                      )
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <h3 className="prod-name">{item.product?.name || 'Artículo'}</h3>
                      <span className="prod-meta">
                        SKU: {item.product?.sku || '-'} | UPC: {item.product?.barcode || '-'}
                      </span>
                      
                      {/* Discount Badge */}
                      {isBreakdownDiscounts && item.discountPerUnit > 0 && (
                        <span className="discount-badge">
                          -{formatCurrency(item.discountPerUnit)} Descuento
                        </span>
                      )}
                      
                      {/* Short Description */}
                      {item.product?.description && (
                        <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic', lineHeight: '1.2' }}>
                          {getShortDescription(item.product.description)}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: '500', color: '#1e293b' }}>
                  {item.quantity} {item.product?.unit || 'pza'}
                </td>
                <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                  {(isBreakdownDiscounts && item.originalPriceExcludingIva > item.finalPriceExcludingIva) ? (
                    <>
                      <span className="original-price">{formatCurrency(item.originalPriceExcludingIva)}</span>
                      <span className="final-price">{formatCurrency(item.finalPriceExcludingIva)}</span>
                    </>
                  ) : (
                    <span className="final-price">{formatCurrency(item.finalPriceExcludingIva)}</span>
                  )}
                </td>
                <td style={{ textAlign: 'right', verticalAlign: 'top', color: '#64748b' }}>
                  {item.taxRate}% ({formatCurrency(item.rowIva)})
                </td>
                <td style={{ textAlign: 'right', fontWeight: '700', color: '#0f172a', verticalAlign: 'top' }}>
                  {formatCurrency(item.rowSubtotalExcludingIva)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Bottom Section (Two Columns: Left = Notes/Images, Right = Totals) */}
        <div className="bottom-section">
          <div className="notes-column">
            {/* Términos y Condiciones */}
            {cotizacionesConfig.terminosCot && (
              <div className="notes-card">
                <span className="notes-title">Términos y Condiciones:</span>
                <div style={{ whiteSpace: 'pre-wrap', fontStyle: 'italic', color: '#64748b' }}>
                  {cotizacionesConfig.terminosCot}
                </div>
              </div>
            )}

            {/* Observaciones e Imágenes */}
            {(obsText || refImages.length > 0) && (
              <div className="notes-card">
                {obsText && (
                  <>
                    <span className="notes-title">Observaciones de la Cotización:</span>
                    <div style={{ whiteSpace: 'pre-wrap', fontStyle: 'italic', color: '#475569', marginBottom: refImages.length > 0 ? '0.35rem' : '0' }}>
                      {obsText}
                    </div>
                  </>
                )}

                {refImages.length > 0 && (
                  <div>
                    <span className="notes-title" style={{ marginTop: obsText ? '0.25rem' : '0' }}>
                      {refImages.length > 1 ? 'Imágenes de Referencia:' : 'Imagen de Referencia:'}
                    </span>
                    <div className="ref-images-gallery">
                      {refImages.map((src, idx) => (
                        <img 
                          key={idx}
                          src={src} 
                          alt={`Referencia ${idx + 1}`} 
                          className="ref-thumb"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Totals Box */}
          <div className="totals-box">
            {isBreakdownDiscounts ? (
              <>
                <div className="total-row">
                  <span>Subtotal</span>
                  <span>{formatCurrency(grossSubtotalExcludingIva)}</span>
                </div>
                <div className="total-row discount-row">
                  <span>Descuento</span>
                  <span>-{formatCurrency(totalDiscountExcludingIva)}</span>
                </div>
                <div className="total-row" style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.2rem', marginTop: '0.2rem', fontWeight: '600' }}>
                  <span>Subtotal Neto</span>
                  <span>{formatCurrency(netSubtotalExcludingIva)}</span>
                </div>
              </>
            ) : (
              <div className="total-row">
                <span>Subtotal</span>
                <span>{formatCurrency(netSubtotalExcludingIva)}</span>
              </div>
            )}
            <div className="total-row">
              <span>IVA 16%</span>
              <span>{formatCurrency(totalIva)}</span>
            </div>
            {manualDiscount > 0.01 && (
              <div className="total-row discount-row">
                <span>Descuento Adicional</span>
                <span>-{formatCurrency(manualDiscount)}</span>
              </div>
            )}
            <div className="total-final">
              <span>Total</span>
              <span>{formatCurrency(quote.total)}</span>
            </div>
          </div>
        </div>

        {/* Footer QR Box */}
        <div className="qr-box">
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://caanma.com/clientes/portal?cotizacionId=${quote.id}`} alt="QR Code" className="qr-img" />
          <div>
            <h4 className="qr-title">Escanea para Ver tu Cotización, Solicitar Cambios o Aprobarla</h4>
            <p className="qr-text">
              o ingresa a: <strong style={{ color: primaryColor }}>caanma.com/clientes/portal</strong> | Folio: <strong>{quoteIdUpper}</strong>
            </p>
          </div>
        </div>

      </div>

      {/* Action Buttons (No print) */}
      <PrintActions 
        primaryColor={primaryColor} 
        printLabel="Imprimir Cotización"
        extraButton={formatButtons}
      />
    </>
  );
}
