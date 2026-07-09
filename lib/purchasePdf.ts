import PDFDocument from 'pdfkit';

export function generatePurchasePdfBuffer(purchase: any): Promise<Buffer> {
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
      if (purchase.branch?.settings?.configJson) {
        try {
          config = JSON.parse(purchase.branch.settings.configJson);
        } catch (e) {}
      }

      const globalLogoUrl = config.global?.logoUrl || '';
      const invoiceConfig = config.formatos_factura || {};
      const logoUrl = invoiceConfig.logoUrl || globalLogoUrl;
      const primaryColor = invoiceConfig.primaryColor || '#eab308'; // Default gold/amber for purchases
      const footerNotes = invoiceConfig.footerNotes || 'Documento exclusivo para control interno de inventario.';
      const showTaxBreakdown = invoiceConfig.showTaxBreakdown !== false;

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
        doc.font(fontBold).fontSize(20).fillColor('#0f172a').text(purchase.branch?.tenant?.name || 'EMPRESA PRINCIPAL', 50, 45);
      }

      // Title Box (Top Right)
      const displayFolio = purchase.folio || "OC-" + purchase.id.slice(0, 8).toUpperCase();
      const dateStr = new Date(purchase.createdAt).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.font(fontBold).fontSize(14).fillColor(primaryColor).text('ORDEN DE COMPRA', 400, 45, { align: 'right' });
      doc.font(fontRegular).fontSize(10).fillColor('#475569').text(`Folio: #${displayFolio}`, 400, 65, { align: 'right' });
      doc.text(`Fecha: ${dateStr}`, 400, 80, { align: 'right' });

      // Branch Details
      const branchName = purchase.branch?.name || 'Bodega Central';
      const branchAddress = purchase.branch?.location || '';
      doc.font(fontRegular).fontSize(8).fillColor('#64748b');
      doc.text(`Sucursal: ${branchName}`, 50, 105);
      if (branchAddress) {
        doc.text(branchAddress.replace(/\n/g, ', '), 50, 117, { width: 300 });
      }

      // Colored rule line
      doc.strokeColor(primaryColor).lineWidth(2).moveTo(50, 140).lineTo(562, 140).stroke();

      // 2. Info Cards (Supplier and Operation details)
      doc.font(fontBold).fontSize(9).fillColor(primaryColor).text('DATOS DEL PROVEEDOR', 50, 160);
      doc.font(fontBold).fontSize(10).fillColor('#1e293b').text(purchase.supplier?.name || 'Proveedor General', 50, 175);
      doc.font(fontRegular).fontSize(9).fillColor('#475569');
      if (purchase.supplier?.taxId) doc.text(`RFC: ${purchase.supplier.taxId}`, 50, 190);
      if (purchase.supplier?.phone) doc.text(`Teléfono: ${purchase.supplier.phone}`, 50, 203);
      if (purchase.supplier?.email) doc.text(`Email: ${purchase.supplier.email}`, 50, 216);

      doc.font(fontBold).fontSize(9).fillColor(primaryColor).text('DATOS DE LA COMPRA', 350, 160);
      doc.font(fontRegular).fontSize(9).fillColor('#475569');
      doc.text(`Moneda: MXN (Pesos Mexicanos)`, 350, 175);
      doc.text(`Comprador: ${purchase.user?.name || 'Sistema'}`, 350, 188);

      // 3. Items Table Header
      const tableTop = 250;
      doc.fillColor('#f8fafc').rect(50, tableTop, 512, 20).fill();
      doc.strokeColor('#e2e8f0').lineWidth(1).rect(50, tableTop, 512, 20).stroke();

      doc.font(fontBold).fontSize(8).fillColor('#475569');
      doc.text('Cant', 55, tableTop + 6, { width: 30, align: 'center' });
      doc.text('Código/SKU', 90, tableTop + 6, { width: 90, align: 'left' });
      doc.text('Descripción del Artículo', 190, tableTop + 6, { width: 200, align: 'left' });
      doc.text('Costo Unit.', 400, tableTop + 6, { width: 70, align: 'right' });
      doc.text('Importe', 480, tableTop + 6, { width: 75, align: 'right' });

      // Table Rows
      let currentY = tableTop + 20;
      purchase.items.forEach((item: any) => {
        const nameHeight = doc.heightOfString(item.product?.name || 'Artículo sin nombre', { width: 200 });
        const rowHeight = Math.max(28, nameHeight + 8);

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
          doc.text('Descripción del Artículo', 190, currentY + 6, { width: 200, align: 'left' });
          doc.text('Costo Unit.', 400, currentY + 6, { width: 70, align: 'right' });
          doc.text('Importe', 480, currentY + 6, { width: 75, align: 'right' });

          currentY += 20;
        }

        // Draw row bottom line
        doc.strokeColor('#f1f5f9').lineWidth(1).moveTo(50, currentY + rowHeight).lineTo(562, currentY + rowHeight).stroke();

        doc.font(fontRegular).fontSize(9).fillColor('#1e293b');
        doc.text(String(item.quantity), 55, currentY + 6, { width: 30, align: 'center' });
        
        // Código/SKU Column (SKU and UPC)
        doc.font(fontRegular).fontSize(8).fillColor('#1e293b');
        doc.text(`SKU: ${item.product?.sku || '-'}`, 90, currentY + 4, { width: 90, align: 'left' });
        doc.font(fontRegular).fontSize(7).fillColor('#64748b').text(`UPC: ${item.product?.barcode || '-'}`, 90, currentY + 14, { width: 90, align: 'left' });
        
        // Product Name (Description)
        doc.font(fontRegular).fontSize(9).fillColor('#1e293b');
        doc.text(item.product?.name || 'Artículo sin nombre', 190, currentY + 4, { width: 200, align: 'left' });

        doc.text(`$${item.cost.toFixed(2)}`, 400, currentY + 6, { width: 70, align: 'right' });
        doc.text(`$${(item.cost * item.quantity).toFixed(2)}`, 480, currentY + 6, { width: 75, align: 'right' });

        currentY += rowHeight;
      });

      // 4. Totals Box
      const finalTotalWithIva = purchase.total;

      let computedSubtotal = 0;
      let computedIva = 0;
      let computedIeps = 0;

      purchase.items.forEach((item: any) => {
        const itemTotal = item.cost * item.quantity;
        computedSubtotal += itemTotal;
      });

      const discount = purchase.discount || 0;
      const freight = purchase.freightCost || 0;
      const discountFactor = computedSubtotal > 0 ? Math.max(0, computedSubtotal - discount) / computedSubtotal : 1;

      purchase.items.forEach((item: any) => {
        const itemTotal = (item.cost * item.quantity) * discountFactor;
        const taxType = item.product?.taxType || 'IVA';
        const taxRate = item.product?.taxRate ?? 16.0;
        const iepsRate = item.product?.iepsRate ?? 0.0;

        if (taxType === 'IVA') {
          computedIva += itemTotal * (taxRate / 100);
        } else if (taxType === 'IEPS') {
          computedIeps += itemTotal * (iepsRate / 100);
        } else if (taxType === 'IVA_IEPS') {
          const iepsAmt = itemTotal * (iepsRate / 100);
          computedIeps += iepsAmt;
          computedIva += (itemTotal + iepsAmt) * (taxRate / 100);
        }
      });

      const freightIva = freight * 0.16;
      const expectedTotal = Math.max(0, computedSubtotal - discount) + freight + (computedIva + freightIva) + computedIeps;
      
      let subtotalExcludingIva = computedSubtotal;
      let iva = computedIva + freightIva;
      let ieps = computedIeps;

      if (Math.abs(expectedTotal - purchase.total) > 0.05) {
        subtotalExcludingIva = (purchase.total - freight) / 1.16;
        iva = (purchase.total - freight) - subtotalExcludingIva;
        ieps = 0;
      }

      let totalsY = currentY + 20;
      if (totalsY + 120 > 680) {
        doc.addPage();
        totalsY = 50;
      }
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(350, totalsY).lineTo(562, totalsY).stroke();

      doc.font(fontRegular).fontSize(9).fillColor('#475569');
      doc.text('Subtotal:', 350, totalsY + 8, { width: 100, align: 'left' });
      doc.text(`$${subtotalExcludingIva.toFixed(2)}`, 450, totalsY + 8, { width: 105, align: 'right' });

      let currentOffset = totalsY + 22;

      if (discount > 0) {
        doc.text('Descuento:', 350, currentOffset, { width: 100, align: 'left' });
        doc.text(`-$${discount.toFixed(2)}`, 450, currentOffset, { width: 105, align: 'right' });
        currentOffset += 14;
      }

      if (showTaxBreakdown && iva > 0) {
        doc.text('IVA:', 350, currentOffset, { width: 100, align: 'left' });
        doc.text(`$${iva.toFixed(2)}`, 450, currentOffset, { width: 105, align: 'right' });
        currentOffset += 14;
      }

      if (showTaxBreakdown && ieps > 0) {
        doc.text('IEPS:', 350, currentOffset, { width: 100, align: 'left' });
        doc.text(`$${ieps.toFixed(2)}`, 450, currentOffset, { width: 105, align: 'right' });
        currentOffset += 14;
      }

      if (freight > 0) {
        doc.text('Flete / Envío:', 350, currentOffset, { width: 100, align: 'left' });
        doc.text(`$${freight.toFixed(2)}`, 450, currentOffset, { width: 105, align: 'right' });
        currentOffset += 14;
      }

      // Border line before total
      doc.strokeColor('#0f172a').lineWidth(1.5).moveTo(350, currentOffset + 2).lineTo(562, currentOffset + 2).stroke();

      doc.font(fontBold).fontSize(11).fillColor('#0f172a');
      doc.text('Total:', 350, currentOffset + 10, { width: 100, align: 'left' });
      doc.text(`$${finalTotalWithIva.toFixed(2)}`, 450, currentOffset + 10, { width: 105, align: 'right' });

      // Signatures
      const sigsY = currentOffset + 50;
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(70, sigsY + 30).lineTo(230, sigsY + 30).stroke();
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(330, sigsY + 30).lineTo(490, sigsY + 30).stroke();

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b');
      doc.text('Firma de Revisión (Sistema)', 70, sigsY + 35, { width: 160, align: 'center' });
      doc.font('Helvetica').fontSize(8).fillColor('#64748b');
      doc.text(`(${purchase.user?.name || 'Bodega Central'})`, 70, sigsY + 45, { width: 160, align: 'center' });

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b');
      doc.text('Firma Proveedor / Repartidor', 330, sigsY + 35, { width: 160, align: 'center' });
      doc.font('Helvetica').fontSize(8).fillColor('#64748b');
      doc.text(`(${purchase.supplier?.name || 'Proveedor'})`, 330, sigsY + 45, { width: 160, align: 'center' });

      // 5. Footer Notes
      const footerY = 700;
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, footerY - 10).lineTo(562, footerY - 10).stroke();

      doc.font('Helvetica-Oblique').fontSize(8).fillColor('#94a3b8');
      doc.text(footerNotes, 50, footerY, { align: 'center', width: 512 });
      doc.text('Generado por CAANMA PRO', 50, footerY + 12, { align: 'center', width: 512 });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
