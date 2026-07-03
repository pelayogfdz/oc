import PDFDocument from 'pdfkit';

export function generateQuotePdfBuffer(quote: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const chunks: any[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // Resolve branch/tenant settings
      let config: any = {};
      if (quote.branch?.settings?.configJson) {
        try {
          config = JSON.parse(quote.branch.settings.configJson);
        } catch (e) {}
      }

      const globalLogoUrl = config.global?.logoUrl || '';
      const invoiceConfig = config.formatos_factura || {};
      const logoUrl = invoiceConfig.logoUrl || globalLogoUrl;
      const primaryColor = invoiceConfig.primaryColor || '#1d4ed8'; // Default premium blue
      const daysValid = config.cotizaciones?.diasVigencia || 7;

      // 1. Header
      // Check if logo exists and if it's base64 or url
      let logoDrawn = false;
      if (logoUrl) {
        try {
          if (logoUrl.startsWith('data:image/')) {
            const base64Data = logoUrl.replace(/^data:image\/\w+;base64,/, '');
            const imgBuffer = Buffer.from(base64Data, 'base64');
            doc.image(imgBuffer, 50, 45, { height: 50 });
            logoDrawn = true;
          }
        } catch (e) {
          console.error("Failed to draw base64 logo in PDF:", e);
        }
      }

      if (!logoDrawn) {
        doc.font('Helvetica-Bold').fontSize(20).fillColor('#0f172a').text(quote.branch?.tenant?.name || 'CAANMA', 50, 45);
      }

      // Title Box (Top Right)
      const displayFolio = quote.folio || quote.id.slice(0, 8).toUpperCase();
      const dateStr = new Date(quote.createdAt).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.font('Helvetica-Bold').fontSize(14).fillColor(primaryColor).text('COTIZACIÓN', 400, 45, { align: 'right' });
      doc.font('Helvetica').fontSize(10).fillColor('#475569').text(`Folio: #${displayFolio}`, 400, 65, { align: 'right' });
      doc.text(`Fecha: ${dateStr}`, 400, 80, { align: 'right' });

      // Branch Details
      const branchName = quote.branch?.name || 'Matriz';
      const branchAddress = quote.branch?.location || '';
      doc.font('Helvetica').fontSize(8).fillColor('#64748b');
      doc.text(`Sucursal: ${branchName}`, 50, 105);
      if (branchAddress) {
        doc.text(branchAddress.replace(/\n/g, ', '), 50, 117, { width: 300 });
      }

      // Colored rule line
      doc.strokeColor(primaryColor).lineWidth(2).moveTo(50, 140).lineTo(562, 140).stroke();

      // 2. Info Cards (Customer and Operation details)
      doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor).text('DATOS DEL CLIENTE', 50, 160);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e293b').text(quote.customer?.name || 'Público en General', 50, 175);
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      if (quote.customer?.taxId) doc.text(`RFC: ${quote.customer.taxId}`, 50, 190);
      if (quote.customer?.phone) doc.text(`Teléfono: ${quote.customer.phone}`, 50, 203);
      if (quote.customer?.email) doc.text(`Email: ${quote.customer.email}`, 50, 216);

      doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor).text('DATOS DE LA COTIZACIÓN', 350, 160);
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      doc.text(`Vigencia: ${daysValid} días naturales`, 350, 175);
      doc.text(`Moneda: MXN (Pesos Mexicanos)`, 350, 188);
      doc.text(`Vendedor: ${quote.user?.name || 'Sistema'}`, 350, 201);

      // 3. Items Table Header
      const tableTop = 250;
      doc.fillColor('#f8fafc').rect(50, tableTop, 512, 20).fill();
      doc.strokeColor('#e2e8f0').lineWidth(1).rect(50, tableTop, 512, 20).stroke();

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569');
      doc.text('Cant', 55, tableTop + 6, { width: 30, align: 'center' });
      doc.text('Código/SKU', 90, tableTop + 6, { width: 90, align: 'left' });
      doc.text('Descripción del Artículo', 190, tableTop + 6, { width: 200, align: 'left' });
      doc.text('Precio Unit.', 400, tableTop + 6, { width: 70, align: 'right' });
      doc.text('Importe', 480, tableTop + 6, { width: 75, align: 'right' });

      // Table Rows
      let currentY = tableTop + 20;
      quote.items.forEach((item: any) => {
        // Draw row bottom line
        doc.strokeColor('#f1f5f9').lineWidth(1).moveTo(50, currentY + 20).lineTo(562, currentY + 20).stroke();

        doc.font('Helvetica').fontSize(9).fillColor('#1e293b');
        doc.text(String(item.quantity), 55, currentY + 6, { width: 30, align: 'center' });
        doc.text(item.product?.sku || '--', 90, currentY + 6, { width: 90, align: 'left' });
        doc.text(item.product?.name || 'Artículo sin nombre', 190, currentY + 6, { width: 200, align: 'left' });
        doc.text(`$${item.price.toFixed(2)}`, 400, currentY + 6, { width: 70, align: 'right' });
        doc.text(`$${(item.price * item.quantity).toFixed(2)}`, 480, currentY + 6, { width: 75, align: 'right' });

        currentY += 20;
      });

      // 4. Totals Box
      const subtotal = quote.total / 1.16;
      const iva = quote.total - subtotal;

      const totalsY = currentY + 20;
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(350, totalsY).lineTo(562, totalsY).stroke();

      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      doc.text('Subtotal:', 350, totalsY + 8, { width: 100, align: 'left' });
      doc.text(`$${subtotal.toFixed(2)} MXN`, 450, totalsY + 8, { width: 105, align: 'right' });

      doc.text('IVA (16%):', 350, totalsY + 22, { width: 100, align: 'left' });
      doc.text(`$${iva.toFixed(2)} MXN`, 450, totalsY + 22, { width: 105, align: 'right' });

      doc.font('Helvetica-Bold').fontSize(11).fillColor(primaryColor);
      doc.text('TOTAL:', 350, totalsY + 40, { width: 100, align: 'left' });
      doc.text(`$${quote.total.toFixed(2)} MXN`, 450, totalsY + 40, { width: 105, align: 'right' });

      // 5. Footer Notes
      const footerY = 700;
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, footerY - 10).lineTo(562, footerY - 10).stroke();

      doc.font('Helvetica-Oblique').fontSize(8).fillColor('#94a3b8');
      doc.text('Esta cotización es solo de carácter informativo. Los precios y existencias están sujetos a cambio sin previo aviso.', 50, footerY, { align: 'center', width: 512 });
      doc.text('Generado por CAANMA PRO', 50, footerY + 12, { align: 'center', width: 512 });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
