export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintActions from "@/app/components/PrintActions";
import { headers } from "next/headers";

export default async function PrintVentaTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const sale = await prisma.sale.findUnique({
    where: { id: id },
    include: {
      user: true,
      customer: true,
      branch: {
        include: { settings: true, tenant: true }
      },
      items: {
        include: { product: true, variant: true }
      }
    }
  });

  if (!sale) return notFound();

  let ticketConfig: any = {};
  let impresorasConfig: any = {};
  if (sale.branch?.settings?.configJson) {
    try {
      const parsed = JSON.parse(sale.branch.settings.configJson);
      if (parsed && typeof parsed === 'object') {
        ticketConfig = parsed.tickets || {};
        ticketConfig.globalLogo = parsed.global?.logoUrl || '';
        impresorasConfig = parsed.impresoras || {};
      }
    } catch (e) {}
  }

  const paperWidth = ticketConfig.anchoTicket === '58mm' || impresorasConfig.receiptWidth === '58mm' ? '58mm' : '80mm';
  const is58 = paperWidth === '58mm';
  const ticketLogo = ticketConfig.logoRecibo || ticketConfig.globalLogo;

  const style = is58 ? `
    body { font-family: 'Courier New', Courier, monospace; font-size: 11px; margin: 0; padding: 2px; color: #000; width: 190px; background: white; }
    .t-header { text-align: center; margin-bottom: 6px; }
    .t-title { font-size: 13px; font-weight: bold; margin-bottom: 2px; }
    .t-line { font-size: 10px; margin-bottom: 2px; }
    .t-divider { border-top: 1px dashed #000; margin: 6px 0; }
    .t-body { font-size: 10px; margin-bottom: 6px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .items-table { width: 100%; font-size: 10px; }
    .item-head { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px; }
    .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .col-cant { width: 25px; }
    .col-desc { flex: 1; margin: 0 5px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .col-price { width: 50px; text-align: right; }
    .totals { font-size: 11px; font-weight: bold; margin-top: 6px; }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .t-footer { text-align: center; font-size: 10px; margin-top: 10px; }
    .qr-container { text-align: center; margin-top: 10px; }
    .qr-text { font-size: 9px; margin-bottom: 3px; }
    .qr-folio { font-size: 11px; font-weight: bold; margin-top: 3px; }
  ` : `
    body { font-family: 'Courier New', Courier, monospace; font-size: 14px; margin: 0; padding: 10px; color: #000; width: 280px; background: white; }
    .t-header { text-align: center; margin-bottom: 10px; }
    .t-title { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
    .t-line { font-size: 12px; margin-bottom: 2px; }
    .t-divider { border-top: 1px dashed #000; margin: 10px 0; }
    .t-body { font-size: 12px; margin-bottom: 10px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .items-table { width: 100%; font-size: 12px; }
    .item-head { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; }
    .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .col-cant { width: 40px; }
    .col-desc { flex: 1; margin: 0 10px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .col-price { width: 60px; text-align: right; }
    .totals { font-size: 14px; font-weight: bold; margin-top: 10px; }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .t-footer { text-align: center; font-size: 12px; margin-top: 15px; }
    .qr-container { text-align: center; margin-top: 15px; }
    .qr-text { font-size: 10px; margin-bottom: 5px; }
    .qr-folio { font-size: 14px; font-weight: bold; margin-top: 5px; }
  `;

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

  const headersList = await headers();
  const host = headersList.get('host') || 'caanma.com';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const origin = `${protocol}://${host}`;

  const ticketIdParam = sale.folio || sale.id.slice(-6).toUpperCase();
  let billingBaseUrl = ticketConfig.autofacturacionUrl 
    ? ticketConfig.autofacturacionUrl.trim() 
    : `${origin}/clientes/portal`;

  const separator = billingBaseUrl.includes('?') ? '&' : '?';
  const finalUrl = `${billingBaseUrl}${separator}ticketId=${ticketIdParam}`;

  const showTax = ticketConfig.showTax !== false;
  const subtotal = (sale.total || 0) / 1.16;
  const iva = (sale.total || 0) - subtotal;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .no-print { display: none !important; }
        }
        body { background: #f1f5f9; display: flex; flex-direction: column; align-items: center; padding: 2rem 0; }
        .ticket-outer-container { background: white; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-radius: 8px; }
      `}} />
      <style dangerouslySetInnerHTML={{__html: style}} />
      <script dangerouslySetInnerHTML={{ __html: printScript }} />

      <div className="ticket-outer-container">
        <div className="t-header">
          {ticketLogo ? (
            <img src={ticketLogo} alt="Logo" style={{ maxHeight: '50px', maxWidth: '150px', objectFit: 'contain', marginBottom: '8px', filter: 'grayscale(100%)' }} />
          ) : null}
          <div className="t-title">{ticketConfig.storeName || sale.branch?.tenant?.name || 'MI NEGOCIO'}</div>
          {ticketConfig.rfc ? <div className="t-line">RFC: {ticketConfig.rfc}</div> : null}
          {ticketConfig.address ? <div className="t-line" dangerouslySetInnerHTML={{ __html: ticketConfig.address.replace(/\n/g, '<br/>') }} /> : null}
          {ticketConfig.phone ? <div className="t-line">Tel: {ticketConfig.phone}</div> : null}
          {ticketConfig.email ? <div className="t-line">Email: {ticketConfig.email}</div> : null}
        </div>

        {ticketConfig.headerMsg ? (
          <>
            <div className="t-divider" style={{ borderTop: '1px solid #000' }}></div>
            <div className="t-line" style={{ textAlign: 'center', fontWeight: 'bold' }}>{ticketConfig.headerMsg}</div>
          </>
        ) : null}

        <div className="t-divider"></div>

        <div className="t-body">
          <div className="info-row">
            <span>Fecha:</span>
            <span>{new Date(sale.createdAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</span>
          </div>
          <div className="info-row">
            <span>Atendió:</span>
            <span>{sale.user?.name || 'Cajero'}</span>
          </div>
          <div className="info-row">
            <span>Folio Web:</span>
            <span>{ticketIdParam}</span>
          </div>
          <div className="info-row">
            <span>Sucursal:</span>
            <span>{sale.branch?.name || 'Matriz'}</span>
          </div>
        </div>

        <div className="t-divider"></div>

        <div className="items-table">
          <div className="item-head">
            <span className="col-cant">CANT</span>
            <span className="col-desc">DESCRIPCIÓN</span>
            <span className="col-price">IMPORTE</span>
          </div>
          {sale.items.map(item => (
            <div className="item-row" key={item.id}>
              <span className="col-cant">{item.quantity}</span>
              <span className="col-desc">{item.product?.name || 'Desconocido'} {item.variant?.attribute ? `(${item.variant.attribute})` : ''}</span>
              <span className="col-price">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="t-divider"></div>

        <div className="totals">
          {showTax ? (
            <>
              <div className="total-row"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="total-row"><span>IVA (16%):</span><span>${iva.toFixed(2)}</span></div>
            </>
          ) : null}
          <div className="total-row" style={{ fontSize: is58 ? '13px' : '16px' }}>
            <span>TOTAL:</span>
            <span>${(sale.total || 0).toFixed(2)}</span>
          </div>
          {sale.paymentMethod === 'CASH' && sale.cashAmount ? (
            <div style={{ marginTop: '4px' }}>
              <div className="total-row" style={{ fontWeight: 'normal', fontSize: is58 ? '9px' : '12px' }}>
                <span>Recibido:</span>
                <span>${sale.cashAmount.toFixed(2)}</span>
              </div>
              {sale.cashAmount > sale.total ? (
                <div className="total-row" style={{ fontWeight: 'normal', fontSize: is58 ? '9px' : '12px' }}>
                  <span>Cambio:</span>
                  <span>${(sale.cashAmount - sale.total).toFixed(2)}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {ticketConfig.footerMsg ? (
          <>
            <div className="t-divider"></div>
            <div className="t-footer" dangerouslySetInnerHTML={{ __html: ticketConfig.footerMsg.replace(/\n/g, '<br/>') }} />
          </>
        ) : null}

        <div className="t-divider"></div>
        <div className="qr-container">
          <div className="qr-text">Para generar tu factura escanea este código:</div>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(finalUrl)}`} alt="QR" style={{ width: '120px', height: '120px' }} />
          <div className="qr-folio">FOLIO: {ticketIdParam}</div>
        </div>
      </div>

      <PrintActions primaryColor="#8b5cf6" printLabel="Imprimir Ticket" />
    </>
  );
}
