import PDFDocument from 'pdfkit';

export function generateQuotePdfBuffer(quote: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Resolve custom Arial fonts path
      const fs = require('fs');
      const path = require('path');
      const regularPath = path.join(process.cwd(), 'lib/fonts/arial.ttf');
      const boldPath = path.join(process.cwd(), 'lib/fonts/arialbd.ttf');
      const italicPath = path.join(process.cwd(), 'lib/fonts/ariali.ttf');
      
      const hasCustomFonts = fs.existsSync(regularPath) && fs.existsSync(boldPath) && fs.existsSync(italicPath);
      // Use autoFirstPage: false if custom fonts exist to prevent PDFKit from loading Helvetica.afm during initialization
      const doc = new PDFDocument({ 
        margin: 50, 
        size: 'LETTER',
        autoFirstPage: !hasCustomFonts
      });
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

      // Load custom Arial fonts to avoid Helvetica.afm ENOENT errors in Next.js / serverless
      let useCustomFonts = false;
      if (hasCustomFonts) {
        try {
          doc.registerFont('Arial', fs.readFileSync(regularPath));
          doc.registerFont('Arial-Bold', fs.readFileSync(boldPath));
          doc.registerFont('Arial-Italic', fs.readFileSync(italicPath));
          useCustomFonts = true;
        } catch (e) {
          console.error("Failed to register custom Arial fonts:", e);
        }
      }

      if (useCustomFonts) {
        doc.addPage();
        doc.font('Arial');
      }

      const fontRegular = useCustomFonts ? 'Arial' : 'Helvetica';
      const fontBold = useCustomFonts ? 'Arial-Bold' : 'Helvetica-Bold';
      const fontItalic = useCustomFonts ? 'Arial-Italic' : 'Helvetica-Oblique';

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
        doc.font(fontBold).fontSize(20).fillColor('#0f172a').text(quote.branch?.tenant?.name || 'CAANMA', 50, 45);
      }

      // Title Box (Top Right)
      const displayFolio = quote.folio || quote.id.slice(0, 8).toUpperCase();
      const dateStr = new Date(quote.createdAt).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.font(fontBold).fontSize(14).fillColor(primaryColor).text('COTIZACIÓN', 400, 45, { align: 'right' });
      doc.font(fontRegular).fontSize(10).fillColor('#475569').text(`Folio: #${displayFolio}`, 400, 65, { align: 'right' });
      doc.text(`Fecha: ${dateStr}`, 400, 80, { align: 'right' });

      // Branch Details
      const branchName = quote.branch?.name || 'Matriz';
      const branchAddress = quote.branch?.location || '';
      doc.font(fontRegular).fontSize(8).fillColor('#64748b');
      doc.text(`Sucursal: ${branchName}`, 50, 105);
      if (branchAddress) {
        doc.text(branchAddress.replace(/\n/g, ', '), 50, 117, { width: 300 });
      }

      // Colored rule line
      doc.strokeColor(primaryColor).lineWidth(2).moveTo(50, 140).lineTo(562, 140).stroke();

      // 2. Info Cards (Customer and Operation details)
      doc.font(fontBold).fontSize(9).fillColor(primaryColor).text('DATOS DEL CLIENTE', 50, 160);
      doc.font(fontBold).fontSize(10).fillColor('#1e293b').text(quote.customer?.name || 'Público en General', 50, 175);
      doc.font(fontRegular).fontSize(9).fillColor('#475569');
      if (quote.customer?.taxId) doc.text(`RFC: ${quote.customer.taxId}`, 50, 190);
      if (quote.customer?.phone) doc.text(`Teléfono: ${quote.customer.phone}`, 50, 203);
      if (quote.customer?.email) doc.text(`Email: ${quote.customer.email}`, 50, 216);

      doc.font(fontBold).fontSize(9).fillColor(primaryColor).text('DATOS DE LA COTIZACIÓN', 350, 160);
      doc.font(fontRegular).fontSize(9).fillColor('#475569');
      doc.text(`Vigencia: ${daysValid} días naturales`, 350, 175);
      doc.text(`Moneda: MXN (Pesos Mexicanos)`, 350, 188);
      doc.text(`Vendedor: ${quote.user?.name || 'Sistema'}`, 350, 201);

      // 3. Items Table Header
      const tableTop = 250;
      doc.fillColor('#f8fafc').rect(50, tableTop, 512, 20).fill();
      doc.strokeColor('#e2e8f0').lineWidth(1).rect(50, tableTop, 512, 20).stroke();

      doc.font(fontBold).fontSize(8).fillColor('#475569');
      doc.text('Cant', 55, tableTop + 6, { width: 30, align: 'center' });
      doc.text('Código/SKU', 90, tableTop + 6, { width: 90, align: 'left' });
      doc.text('Descripción del Artículo', 185, tableTop + 6, { width: 145, align: 'left' });
      doc.text('Precio Unit.', 335, tableTop + 6, { width: 75, align: 'right' });
      doc.text('IVA', 415, tableTop + 6, { width: 65, align: 'right' });
      doc.text('Importe', 485, tableTop + 6, { width: 77, align: 'right' });

      // Table Rows
      let currentY = tableTop + 20;
      quote.items.forEach((item: any) => {
        const textHeight = doc.heightOfString(item.product?.name || 'Artículo sin nombre', { width: 145 });
        const rowHeight = Math.max(22, textHeight + 10); // 10 points padding

        // Check if we need to add a new page before drawing this row
        if (currentY + rowHeight > 650) {
          doc.addPage();
          currentY = 50; // top margin on new page

          // Redraw table header on the new page
          doc.fillColor('#f8fafc').rect(50, currentY, 512, 20).fill();
          doc.strokeColor('#e2e8f0').lineWidth(1).rect(50, currentY, 512, 20).stroke();

          doc.font(fontBold).fontSize(8).fillColor('#475569');
          doc.text('Cant', 55, currentY + 6, { width: 30, align: 'center' });
          doc.text('Código/SKU', 90, currentY + 6, { width: 90, align: 'left' });
          doc.text('Descripción del Artículo', 185, currentY + 6, { width: 145, align: 'left' });
          doc.text('Precio Unit.', 335, currentY + 6, { width: 75, align: 'right' });
          doc.text('IVA', 415, currentY + 6, { width: 65, align: 'right' });
          doc.text('Importe', 485, currentY + 6, { width: 77, align: 'right' });

          currentY += 20;
        }

        // Draw row bottom line
        doc.strokeColor('#f1f5f9').lineWidth(1).moveTo(50, currentY + rowHeight).lineTo(562, currentY + rowHeight).stroke();

        const taxRate = item.product?.taxRate ?? 16.0;
        const taxType = item.product?.taxType || 'IVA';
        const isIva = taxType === 'IVA' || taxType === 'IVA_IEPS';
        const rate = isIva ? taxRate : 0;

        const finalPriceIncludingIva = item.price;
        const finalPriceExcludingIva = finalPriceIncludingIva / (1 + rate / 100);
        const rowImporteExcludingIva = finalPriceExcludingIva * item.quantity;
        const rowIva = (finalPriceIncludingIva - finalPriceExcludingIva) * item.quantity;

        doc.font(fontRegular).fontSize(9).fillColor('#1e293b');
        doc.text(String(item.quantity), 55, currentY + 6, { width: 30, align: 'center' });
        doc.text(item.product?.sku || '--', 90, currentY + 6, { width: 90, align: 'left' });
        doc.text(item.product?.name || 'Artículo sin nombre', 185, currentY + 6, { width: 145, align: 'left' });
        doc.text(`$${finalPriceExcludingIva.toFixed(2)}`, 335, currentY + 6, { width: 75, align: 'right' });
        doc.text(`${rate}% ($${rowIva.toFixed(2)})`, 415, currentY + 6, { width: 65, align: 'right' });
        doc.text(`$${rowImporteExcludingIva.toFixed(2)}`, 485, currentY + 6, { width: 77, align: 'right' });

        currentY += rowHeight;
      });

      // 4. Totals Box
      const breakdownDiscounts = quote.breakdownDiscounts ?? false;
      let originalListTotalWithIva = 0;
      let finalTotalWithIva = quote.total;
      let subtotalExcludingIva = 0;
      let discountExcludingIva = 0;
      let totalIva = 0;

      quote.items.forEach((item: any) => {
        const taxRate = item.product?.taxRate ?? 16.0;
        const taxType = item.product?.taxType || 'IVA';
        const isIva = taxType === 'IVA' || taxType === 'IVA_IEPS';
        const rate = isIva ? taxRate : 0;

        const originalPrice = breakdownDiscounts ? (item.product?.price || item.price) : item.price;
        const finalPrice = item.price;

        originalListTotalWithIva += originalPrice * item.quantity;

        const itemSubtotalExcludingIva = (originalPrice / (1 + rate / 100)) * item.quantity;
        subtotalExcludingIva += itemSubtotalExcludingIva;

        const itemFinalPriceExcludingIva = (finalPrice / (1 + rate / 100)) * item.quantity;
        const itemDiscountExcludingIva = itemSubtotalExcludingIva - itemFinalPriceExcludingIva;
        discountExcludingIva += Math.max(0, itemDiscountExcludingIva);

        const itemIva = (finalPrice - (finalPrice / (1 + rate / 100))) * item.quantity;
        totalIva += itemIva;
      });

      let totalsY = currentY + 20;
      if (totalsY + 100 > 680) {
        doc.addPage();
        totalsY = 50;
      }

      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(350, totalsY).lineTo(562, totalsY).stroke();

      let currentOffset = totalsY + 8;

      doc.font(fontRegular).fontSize(9).fillColor('#475569');
      doc.text('Subtotal:', 350, currentOffset, { width: 100, align: 'left' });
      doc.text(`$${subtotalExcludingIva.toFixed(2)}`, 450, currentOffset, { width: 105, align: 'right' });
      currentOffset += 14;

      if (breakdownDiscounts && discountExcludingIva > 0.01) {
        doc.fillColor('#ef4444'); // Red color for discounts
        doc.text('Descuento:', 350, currentOffset, { width: 100, align: 'left' });
        doc.text(`-$${discountExcludingIva.toFixed(2)}`, 450, currentOffset, { width: 105, align: 'right' });
        currentOffset += 14;

        doc.fillColor('#475569');
        doc.font(fontBold).text('Subtotal:', 350, currentOffset, { width: 100, align: 'left' });
        const netExcludingIva = subtotalExcludingIva - discountExcludingIva;
        doc.text(`$${netExcludingIva.toFixed(2)}`, 450, currentOffset, { width: 105, align: 'right' });
        doc.font(fontRegular);
        currentOffset += 14;
      }

      doc.font(fontRegular).fillColor('#475569').text('IVA:', 350, currentOffset, { width: 100, align: 'left' });
      doc.text(`$${totalIva.toFixed(2)}`, 450, currentOffset, { width: 105, align: 'right' });
      currentOffset += 16;

      // Border line before total
      doc.strokeColor('#0f172a').lineWidth(1.5).moveTo(350, currentOffset).lineTo(562, currentOffset).stroke();
      currentOffset += 8;

      doc.font(fontBold).fontSize(11).fillColor('#0f172a');
      doc.text('Total:', 350, currentOffset, { width: 100, align: 'left' });
      doc.text(`$${finalTotalWithIva.toFixed(2)}`, 450, currentOffset, { width: 105, align: 'right' });

      // 5. Footer Notes
      const footerY = 700;
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, footerY - 10).lineTo(562, footerY - 10).stroke();

      doc.font(fontItalic).fontSize(8).fillColor('#94a3b8');
      doc.text('Esta cotización es solo de carácter informativo. Los precios y existencias están sujetos a cambio sin previo aviso.', 50, footerY, { align: 'center', width: 512 });
      doc.text('Generado por CAANMA PRO', 50, footerY + 12, { align: 'center', width: 512 });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
