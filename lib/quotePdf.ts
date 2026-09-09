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

      // 1. Header (Compact)
      let logoDrawn = false;
      if (logoUrl) {
        try {
          if (logoUrl.startsWith('data:image/')) {
            const base64Data = logoUrl.replace(/^data:image\/\w+;base64,/, '');
            const imgBuffer = Buffer.from(base64Data, 'base64');
            doc.image(imgBuffer, 40, 35, { height: 45, width: 140, fit: [140, 45] });
            logoDrawn = true;
          }
        } catch (e) {
          console.error("Failed to draw base64 logo in PDF:", e);
        }
      }

      if (!logoDrawn) {
        doc.font(fontBold).fontSize(16).fillColor('#0f172a').text(quote.branch?.tenant?.name || 'CAANMA', 40, 35);
      }

      // Branch Details
      const branchName = quote.branch?.name || 'Matriz';
      const branchAddress = quote.branch?.location || '';
      doc.font(fontRegular).fontSize(7.5).fillColor('#64748b');
      doc.text(`Sucursal: ${branchName}`, 40, 58);
      if (branchAddress) {
        doc.text(branchAddress.replace(/\n/g, ', '), 40, 68, { width: 280 });
      }

      // Title Box (Top Right)
      const displayFolio = quote.folio || quote.id.slice(0, 8).toUpperCase();
      const dateStr = new Date(quote.createdAt).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.font(fontBold).fontSize(14).fillColor(primaryColor).text('COTIZACIÓN', 350, 35, { align: 'right', width: 222 });
      doc.font(fontBold).fontSize(9).fillColor('#0f172a').text(`Folio: #${displayFolio}`, 350, 52, { align: 'right', width: 222 });
      doc.font(fontRegular).fontSize(8).fillColor('#64748b').text(`Fecha: ${dateStr}`, 350, 65, { align: 'right', width: 222 });

      // Colored rule line
      doc.strokeColor(primaryColor).lineWidth(1.5).moveTo(40, 88).lineTo(572, 88).stroke();

      // 2. Info Cards (Compact: Left = Client, Right = Quote details)
      const infoTop = 96;
      // Client Box
      doc.fillColor('#f8fafc').rect(40, infoTop, 255, 60).fill();
      doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(40, infoTop, 255, 60).stroke();

      doc.font(fontBold).fontSize(7.5).fillColor(primaryColor).text('DATOS DEL CLIENTE', 48, infoTop + 6);
      doc.font(fontBold).fontSize(8.5).fillColor('#1e293b').text(quote.customer?.name || 'Público en General', 48, infoTop + 18, { width: 240, ellipsis: true });
      doc.font(fontRegular).fontSize(7.5).fillColor('#475569');
      let clientLineY = infoTop + 30;
      if (quote.customer?.taxId) {
        doc.text(`RFC: ${quote.customer.taxId}`, 48, clientLineY);
        clientLineY += 10;
      }
      const contactInfo = [quote.customer?.phone, quote.customer?.email].filter(Boolean).join(' | ');
      if (contactInfo) {
        doc.text(contactInfo, 48, clientLineY, { width: 240, ellipsis: true });
      }

      // Quote details Box
      doc.fillColor('#f8fafc').rect(310, infoTop, 262, 60).fill();
      doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(310, infoTop, 262, 60).stroke();

      doc.font(fontBold).fontSize(7.5).fillColor(primaryColor).text('DETALLES DEL DOCUMENTO', 318, infoTop + 6);
      doc.font(fontRegular).fontSize(7.5).fillColor('#475569');
      doc.text(`Vigencia: ${daysValid} días naturales`, 318, infoTop + 18);
      doc.text(`Moneda: MXN (Pesos Mexicanos)`, 318, infoTop + 29);
      doc.text(`Elaboró: ${quote.user?.name || 'Sistema'}`, 318, infoTop + 40);

      // 3. Items Table Header
      const tableTop = 166;
      const renderTableHeader = (y: number) => {
        doc.fillColor('#f8fafc').rect(40, y, 532, 18).fill();
        doc.strokeColor('#cbd5e1').lineWidth(0.75).rect(40, y, 532, 18).stroke();

        doc.font(fontBold).fontSize(7.5).fillColor('#475569');
        doc.text('Cant', 44, y + 5, { width: 32, align: 'center' });
        doc.text('Código / SKU', 80, y + 5, { width: 85, align: 'left' });
        doc.text('Descripción del Artículo', 170, y + 5, { width: 175, align: 'left' });
        doc.text('Precio Unit.', 350, y + 5, { width: 68, align: 'right' });
        doc.text('IVA', 422, y + 5, { width: 65, align: 'right' });
        doc.text('Importe', 492, y + 5, { width: 74, align: 'right' });
      };

      renderTableHeader(tableTop);

      // Table Rows
      let currentY = tableTop + 18;
      quote.items.forEach((item: any) => {
        doc.fontSize(8);
        const nameHeight = doc.heightOfString(item.product?.name || 'Artículo', { width: 175 });
        const rowHeight = Math.max(20, Math.min(32, nameHeight + 6));

        // Check if row overflows page (budget height ~620pt)
        if (currentY + rowHeight > 620) {
          doc.addPage();
          currentY = 40;
          renderTableHeader(currentY);
          currentY += 18;
        }

        // Draw light row separator
        doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(40, currentY + rowHeight).lineTo(572, currentY + rowHeight).stroke();

        const taxRate = item.product?.taxRate ?? 16.0;
        const taxType = item.product?.taxType || 'IVA';
        const isIva = taxType === 'IVA' || taxType === 'IVA_IEPS';
        const rate = isIva ? taxRate : 0;

        const finalPriceIncludingIva = item.price;
        const finalPriceExcludingIva = finalPriceIncludingIva / (1 + rate / 100);
        const rowImporteExcludingIva = finalPriceExcludingIva * item.quantity;
        const rowIva = (finalPriceIncludingIva - finalPriceExcludingIva) * item.quantity;

        doc.font(fontRegular).fontSize(8).fillColor('#1e293b');
        doc.text(String(item.quantity), 44, currentY + 4, { width: 32, align: 'center' });
        
        doc.font(fontRegular).fontSize(7).fillColor('#64748b');
        const codeText = item.product?.sku || item.product?.barcode || '-';
        doc.text(codeText, 80, currentY + 4, { width: 85, align: 'left', ellipsis: true });
        
        doc.font(fontRegular).fontSize(8).fillColor('#0f172a');
        doc.text(item.product?.name || 'Artículo', 170, currentY + 4, { width: 175, align: 'left', height: rowHeight - 4, ellipsis: true });

        doc.text(`$${finalPriceExcludingIva.toFixed(2)}`, 350, currentY + 4, { width: 68, align: 'right' });
        doc.font(fontRegular).fontSize(7).fillColor('#64748b').text(`${rate}% ($${rowIva.toFixed(2)})`, 422, currentY + 4, { width: 65, align: 'right' });
        doc.font(fontBold).fontSize(8).fillColor('#0f172a').text(`$${rowImporteExcludingIva.toFixed(2)}`, 492, currentY + 4, { width: 74, align: 'right' });

        currentY += rowHeight;
      });

      // 4. Bottom Section (Left: Notes/Terms/Images, Right: Totals)
      let bottomY = currentY + 10;
      if (bottomY + 100 > 710) {
        doc.addPage();
        bottomY = 40;
      }

      // Calculate totals
      const breakdownDiscounts = quote.breakdownDiscounts ?? false;
      let originalListTotalWithIva = 0;
      let finalTotalWithIva = quote.total;
      let subtotalExcludingIva = 0;
      let discountExcludingIva = 0;
      let totalIva = 0;

      const storedTotalIncludingIva = quote.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      const prorationRatio = (breakdownDiscounts && storedTotalIncludingIva > quote.total + 0.01) ? (quote.total / storedTotalIncludingIva) : 1.0;

      quote.items.forEach((item: any) => {
        const taxRate = item.product?.taxRate ?? 16.0;
        const taxType = item.product?.taxType || 'IVA';
        const isIva = taxType === 'IVA' || taxType === 'IVA_IEPS';
        const rate = isIva ? taxRate : 0;

        const originalPrice = breakdownDiscounts ? (item.product?.price || item.price) : item.price;
        const finalPrice = item.price * prorationRatio;

        originalListTotalWithIva += originalPrice * item.quantity;

        const itemSubtotalExcludingIva = (originalPrice / (1 + rate / 100)) * item.quantity;
        subtotalExcludingIva += itemSubtotalExcludingIva;

        const itemFinalPriceExcludingIva = (finalPrice / (1 + rate / 100)) * item.quantity;
        const itemDiscountExcludingIva = itemSubtotalExcludingIva - itemFinalPriceExcludingIva;
        discountExcludingIva += Math.max(0, itemDiscountExcludingIva);

        const itemIva = (finalPrice - (finalPrice / (1 + rate / 100))) * item.quantity;
        totalIva += itemIva;
      });

      // Right Column: Totals Box
      const totalsX = 350;
      doc.strokeColor('#cbd5e1').lineWidth(0.75).moveTo(totalsX, bottomY).lineTo(572, bottomY).stroke();
      let totY = bottomY + 6;

      doc.font(fontRegular).fontSize(8).fillColor('#475569');
      doc.text('Subtotal:', totalsX, totY, { width: 100, align: 'left' });
      doc.text(`$${subtotalExcludingIva.toFixed(2)}`, 450, totY, { width: 116, align: 'right' });
      totY += 13;

      if (breakdownDiscounts && discountExcludingIva > 0.01) {
        doc.fillColor('#ef4444');
        doc.text('Descuento:', totalsX, totY, { width: 100, align: 'left' });
        doc.text(`-$${discountExcludingIva.toFixed(2)}`, 450, totY, { width: 116, align: 'right' });
        totY += 13;

        doc.fillColor('#475569');
        doc.font(fontBold).text('Subtotal Neto:', totalsX, totY, { width: 100, align: 'left' });
        const netExcludingIva = subtotalExcludingIva - discountExcludingIva;
        doc.text(`$${netExcludingIva.toFixed(2)}`, 450, totY, { width: 116, align: 'right' });
        doc.font(fontRegular);
        totY += 13;
      }

      doc.font(fontRegular).fillColor('#475569').text('IVA:', totalsX, totY, { width: 100, align: 'left' });
      doc.text(`$${totalIva.toFixed(2)}`, 450, totY, { width: 116, align: 'right' });
      totY += 15;

      doc.strokeColor('#0f172a').lineWidth(1.2).moveTo(totalsX, totY).lineTo(572, totY).stroke();
      totY += 5;

      doc.font(fontBold).fontSize(10).fillColor('#0f172a');
      doc.text('Total:', totalsX, totY, { width: 100, align: 'left' });
      doc.text(`$${finalTotalWithIva.toFixed(2)}`, 450, totY, { width: 116, align: 'right' });
      totY += 18;

      // Left Column: Terms & Conditions + Observations + Reference Images
      let leftY = bottomY;
      const terminosCot = config.cotizaciones?.terminosCot || '';
      if (terminosCot && terminosCot.trim()) {
        doc.font(fontBold).fontSize(7.5).fillColor(primaryColor).text('TÉRMINOS Y CONDICIONES:', 40, leftY);
        doc.font(fontRegular).fontSize(7).fillColor('#64748b').text(terminosCot.trim(), 40, leftY + 10, { width: 290 });
        leftY += 12 + doc.heightOfString(terminosCot.trim(), { width: 290 }) + 4;
      }

      const observations = (quote.observations || (quote as any).notes || '').trim();
      if (observations) {
        doc.font(fontBold).fontSize(7.5).fillColor(primaryColor).text('OBSERVACIONES:', 40, leftY);
        doc.font(fontRegular).fontSize(7.5).fillColor('#475569').text(observations, 40, leftY + 10, { width: 290 });
        leftY += 12 + doc.heightOfString(observations, { width: 290 }) + 4;
      }

      // Reference Images thumbnails
      const rawObservationImageUrl = (quote.observationImageUrl || (quote as any).observationImages || '').trim();
      if (rawObservationImageUrl) {
        try {
          let imageUrlList: string[] = [];
          if (rawObservationImageUrl.startsWith('[') && rawObservationImageUrl.endsWith(']')) {
            try {
              const parsed = JSON.parse(rawObservationImageUrl);
              if (Array.isArray(parsed)) imageUrlList = parsed.filter(Boolean);
            } catch (e) {
              imageUrlList = [rawObservationImageUrl];
            }
          } else {
            imageUrlList = [rawObservationImageUrl];
          }

          const validBuffers: Buffer[] = [];
          for (const imgUrl of imageUrlList) {
            let imgBuffer: Buffer | null = null;
            if (imgUrl.startsWith('data:image/')) {
              const base64Data = imgUrl.replace(/^data:image\/\w+;base64,/, '');
              imgBuffer = Buffer.from(base64Data, 'base64');
            } else if (fs.existsSync(imgUrl)) {
              imgBuffer = fs.readFileSync(imgUrl);
            }
            if (imgBuffer) validBuffers.push(imgBuffer);
          }

          if (validBuffers.length > 0) {
            const thumbHeight = 42;
            const thumbWidth = 60;
            const gap = 8;
            const maxPerRow = 4;
            const numRows = Math.ceil(validBuffers.length / maxPerRow);
            const totalImgSectionHeight = 14 + (numRows * thumbHeight) + ((numRows - 1) * gap);

            if (leftY + totalImgSectionHeight > 700) {
              doc.addPage();
              leftY = 40;
            }

            const headerLabel = validBuffers.length > 1 ? 'IMÁGENES DE REFERENCIA:' : 'IMAGEN DE REFERENCIA:';
            doc.font(fontBold).fontSize(7.5).fillColor(primaryColor).text(headerLabel, 40, leftY);
            
            validBuffers.forEach((buf, idx) => {
              const colIdx = idx % maxPerRow;
              const rowIdx = Math.floor(idx / maxPerRow);
              const xPos = 40 + colIdx * (thumbWidth + gap);
              const yPos = leftY + 12 + rowIdx * (thumbHeight + gap);

              try {
                doc.image(buf, xPos, yPos, { fit: [thumbWidth, thumbHeight] });
              } catch (drawErr) {
                console.error("Error drawing thumbnail image in quote PDF:", drawErr);
              }
            });

            leftY += totalImgSectionHeight + 6;
          }
        } catch (imgErr) {
          console.error("Failed to process quote reference images for PDF:", imgErr);
        }
      }

      // 5. Footer (at bottom of page)
      const footerY = 740;
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, footerY - 6).lineTo(572, footerY - 6).stroke();
      doc.font(fontItalic).fontSize(7).fillColor('#94a3b8');
      doc.text('Esta cotización es de carácter informativo. Precios y existencias sujetos a cambio sin previo aviso. Generado por CAANMA PRO.', 40, footerY, { align: 'center', width: 532 });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
